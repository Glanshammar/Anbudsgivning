import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

import zmq
import time
from enum import Enum
from Logger import GetLogger
from multiprocessing import Process
from .agents import Agent, COMMAND_PORT, STATUS_PORT, AgentStatus
from Backend.browser import Browser
import requests
import json
from datetime import datetime, timedelta


class WebCrawler(Agent):
    def __init__(self, agent_id):
        super().__init__(agent_id)
        self.portals_to_crawl = []
        self.results_dir = os.path.join(current_dir, 'crawl_results')
        self.cache_dir = os.path.join(current_dir, 'cache')
        self.documents_dir = os.path.join(current_dir, f'documents')
        os.makedirs(self.documents_dir, exist_ok=True)
        os.makedirs(self.results_dir, exist_ok=True)
        os.makedirs(self.cache_dir, exist_ok=True)
        self.logger.debug(f"Results directory: {self.results_dir}", extra={'agent_id': self.agent_id})
        
        # Test mode limits (configurable via command)
        self.test_mode = False
        self.max_portal_links = 2     # Max number of tender links to extract from each portal
        self.max_tender_pages = 3     # Max number of tender pages to process
        self.max_document_links = 2   # Max number of document links to extract per tender
        self.max_documents = 3        # Max number of documents to download and process

    def Initialize(self):
        self.logger.info("Initializing crawler data", extra={'agent_id': self.agent_id})
        self.portals_to_crawl = self.UpdatePortals()
        self.logger.info(f"Initialized with {len(self.portals_to_crawl)} portals", extra={'agent_id': self.agent_id})
        return True

    def ReadPortalsFromFile(self):
        try:
            file_path = os.path.join(current_dir, 'portals.json')
            self.logger.debug(f"Reading portals from file: {file_path}", extra={'agent_id': self.agent_id})
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    portals = json.load(f)
                self.logger.info(f"Successfully read {len(portals)} portals from file", extra={'agent_id': self.agent_id})
                return portals
            self.logger.warning("portals.json file not found", extra={'agent_id': self.agent_id})
            return []
        except Exception as e:
            error_msg = f"Error reading portals.json: {str(e)}"
            self.logger.error(error_msg, extra={'agent_id': self.agent_id})
            self.send_status(error_msg)
            return []

    def ShouldUpdatePortals(self):
        timestamp_file = os.path.join(self.cache_dir, 'last_update.txt')
        if not os.path.exists(timestamp_file):
            return True
        
        try:
            with open(timestamp_file, 'r') as f:
                last_update = datetime.fromisoformat(f.read().strip())
            return datetime.now() - last_update > timedelta(hours=24)
        except Exception as e:
            self.logger.error(f"Error reading timestamp file: {str(e)}", extra={'agent_id': self.agent_id})
            return True

    def UpdateTimestamp(self):
        timestamp_file = os.path.join(self.cache_dir, 'last_update.txt')
        try:
            with open(timestamp_file, 'w') as f:
                f.write(datetime.now().isoformat())
        except Exception as e:
            self.logger.error(f"Error updating timestamp file: {str(e)}", extra={'agent_id': self.agent_id})

    def UpdatePortals(self):
        try:
            # Check if we need to update the portals
            if not self.ShouldUpdatePortals():
                self.logger.info("Using cached portals data", extra={'agent_id': self.agent_id})
                return self.ReadPortalsFromFile()

            self.logger.info("Updating portals from API", extra={'agent_id': self.agent_id})
            tender_portals_response = requests.get('http://127.0.0.1:5000/api/tender_portals')
            if tender_portals_response.status_code != 200:
                error_msg = f"Failed to get tender portals. Status code: {tender_portals_response.status_code} {tender_portals_response.text}"
                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                self.send_status("Falling back to portals.json...")
                return self.ReadPortalsFromFile()
            
            response_data = tender_portals_response.json()
            if not isinstance(response_data, dict):
                error_msg = "Invalid response format from tender portals API"
                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                self.send_status("Falling back to portals.json...")
                return self.ReadPortalsFromFile()
            
            # The API returns the data directly in the response
            portals = response_data.get('portals', [])
            if not portals:
                error_msg = "No portals found in the response"
                self.logger.warning(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                self.send_status("Falling back to portals.json...")
                return self.ReadPortalsFromFile()
            
            # Save to URL file for future use
            file_path = os.path.join(current_dir, 'portals.json')
            with open(file_path, 'w') as f:
                json.dump(portals, f, indent=4)
            
            self.UpdateTimestamp()
            self.logger.info(f"Successfully updated {len(portals)} portals", extra={'agent_id': self.agent_id})
            return portals
        except Exception as e:
            error_msg = f"Error updating portals: {str(e)}"
            self.logger.error(error_msg, extra={'agent_id': self.agent_id})
            self.send_status(error_msg)
            self.send_status("Falling back to portals.json...")
            return self.ReadPortalsFromFile()

    def GetTenderLinks(self, browser):
        from Data.ai import GetTenderLinksFromPortal
        all_tender_links = []
        for portal in self.portals_to_crawl:
            portal_url = portal['url']
            self.logger.info(f"Processing portal: {portal_url}", extra={'agent_id': self.agent_id})
            self.send_status(f"Crawling portal: {portal_url}")
            try:
                tender_links = GetTenderLinksFromPortal(browser, portal_url)
                
                # Apply test mode limit if enabled
                if self.test_mode and len(tender_links) > self.max_portal_links:
                    self.logger.info(f"Test mode: Limiting to {self.max_portal_links} links from portal", 
                                   extra={'agent_id': self.agent_id})
                    tender_links = tender_links[:self.max_portal_links]
                
                all_tender_links.extend(tender_links)
                self.logger.info(f"Found {len(tender_links)} tenders in {portal_url}", extra={'agent_id': self.agent_id})
                self.send_status(f"Found {len(tender_links)} tenders in {portal_url}")
            except Exception as e:
                error_msg = f"Error processing portal {portal_url}: {str(e)}"
                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                continue
        return all_tender_links

    def FindDocumentLinksForTenders(self, browser, all_tender_links):
        from Data.ai import FindDocumentLinks
        all_document_links = []
        
        # Apply test mode limit if enabled
        links_to_process = all_tender_links
        if self.test_mode and len(all_tender_links) > self.max_tender_pages:
            self.logger.info(f"Test mode: Limiting document search to {self.max_tender_pages} tenders", 
                           extra={'agent_id': self.agent_id})
            links_to_process = all_tender_links[:self.max_tender_pages]
        
        for tender_url in links_to_process:
            try:
                self.logger.info(f"Finding documents for tender: {tender_url}", extra={'agent_id': self.agent_id})
                self.send_status(f"Finding documents for tender: {tender_url}")
                document_links = FindDocumentLinks(browser, tender_url)
                
                # Apply test mode limit if enabled
                if self.test_mode and len(document_links) > self.max_document_links:
                    self.logger.info(f"Test mode: Limiting to {self.max_document_links} document links per tender", 
                                   extra={'agent_id': self.agent_id})
                    document_links = document_links[:self.max_document_links]
                
                all_document_links.extend(document_links)
                self.logger.info(f"Found {len(document_links)} documents for tender {tender_url}", extra={'agent_id': self.agent_id})
                self.send_status(f"Found {len(document_links)} documents for tender {tender_url}")
            except Exception as e:
                error_msg = f"Error finding documents for tender {tender_url}: {str(e)}"
                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                continue
        return all_document_links

    def DownloadDocuments(self, browser, all_document_links: list[str]):
        from Data.ai import DownloadDocument
        downloaded_documents = []
        
        # Apply test mode limit if enabled
        links_to_process = all_document_links
        if self.test_mode and len(all_document_links) > self.max_documents:
            self.logger.info(f"Test mode: Limiting to {self.max_documents} documents to download", 
                           extra={'agent_id': self.agent_id})
            links_to_process = all_document_links[:self.max_documents]
        
        for doc_link in links_to_process:
            try:
                self.logger.info(f"Downloading document: {doc_link}", extra={'agent_id': self.agent_id})
                self.send_status(f"Downloading document: {doc_link}")
                doc_path = DownloadDocument(browser, doc_link, self.documents_dir)
                if doc_path:
                    downloaded_documents.append({
                        'url': doc_link,
                        'local_path': doc_path
                    })
                    self.logger.info(f"Successfully downloaded document to: {doc_path}", extra={'agent_id': self.agent_id})
                    self.send_status(f"Successfully downloaded document to: {doc_path}")
            except Exception as e:
                error_msg = f"Error downloading document {doc_link}: {str(e)}"
                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                continue
        return downloaded_documents

    def ProcessDownloadedDocuments(self, browser, downloaded_documents):
        from Data.ai import TenderInfo
        all_tender_info = []
        for doc in downloaded_documents:
            try:
                self.logger.info(f"Processing document: {doc['local_path']}", extra={'agent_id': self.agent_id})
                self.send_status(f"Processing document: {doc['local_path']}")
                tender_info = TenderInfo(browser, doc['local_path'], is_document=True)
                try:
                    parsed_info = json.loads(tender_info['info'])
                    tender_info['info'] = parsed_info
                except json.JSONDecodeError as e:
                    self.logger.error(f"Failed to parse tender info JSON: {str(e)}", extra={'agent_id': self.agent_id})
                    self.send_status(f"Warning: Could not parse tender info as JSON for {doc['local_path']}")
                all_tender_info.append(tender_info)
                self.logger.info(f"Successfully processed document: {doc['local_path']}", extra={'agent_id': self.agent_id})
                self.send_status(f"Successfully processed document: {doc['local_path']}")
            except Exception as e:
                error_msg = f"Error processing document {doc['local_path']}: {str(e)}"
                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                continue
        return all_tender_info

    def ProcessTenderPages(self, browser, tender_links):
        from Data.ai import TenderInfo
        """Process tender pages by visiting each page and extracting tender information."""
        processed_tenders = []
        
        # Apply test mode limit if enabled
        links_to_process = tender_links
        if self.test_mode and len(tender_links) > self.max_tender_pages:
            self.logger.info(f"Test mode: Limiting to {self.max_tender_pages} tender pages", 
                           extra={'agent_id': self.agent_id})
            links_to_process = tender_links[:self.max_tender_pages]
        
        for tender_url in links_to_process:
            try:
                self.logger.info(f"Processing tender page: {tender_url}", extra={'agent_id': self.agent_id})
                self.send_status(f"Processing tender page: {tender_url}")
                
                # Run TenderInfo on the webpage (is_document=False)
                tender_info = TenderInfo(browser, tender_url, is_document=False)
                
                # Try to parse the JSON response
                try:
                    parsed_info = json.loads(tender_info['info'])
                    tender_info['info'] = parsed_info
                except json.JSONDecodeError as e:
                    self.logger.error(f"Failed to parse tender info JSON: {str(e)}", extra={'agent_id': self.agent_id})
                    self.send_status(f"Warning: Could not parse tender info as JSON for {tender_url}")
                
                processed_tenders.append(tender_info)
                
                self.logger.info(f"Successfully processed tender page: {tender_url}", 
                               extra={'agent_id': self.agent_id})
                self.send_status(f"Successfully processed tender page: {tender_url}")
            except Exception as e:
                error_msg = f"Error processing tender page {tender_url}: {str(e)}"
                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                continue
        
        return processed_tenders

    def Crawl(self, max_tenders=None, max_documents=None):
        from Data.ai import TenderInfo, FindDocumentLinks, DownloadDocument
        """
        Crawl tender portals and process findings.
        
        Args:
            max_tenders: Maximum number of tender pages to process (None for unlimited)
            max_documents: Maximum number of documents to process (None for unlimited)
        """
        try:
            self.logger.info(f"Starting crawl operation (max_tenders={max_tenders}, max_documents={max_documents})", 
                           extra={'agent_id': self.agent_id})
            self.send_status(f"Starting crawl operation with limits: tenders={max_tenders}, documents={max_documents}")
            
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            results_file = os.path.join(self.results_dir, f'crawl_results_{timestamp}.json')
            tender_links_file = os.path.join(self.results_dir, f'tender_links_{timestamp}.txt')
            self.logger.debug(f"Results will be saved to: {results_file}", extra={'agent_id': self.agent_id})
            
            browser = Browser()
            try:
                # Get all tender links 
                all_tender_links = self.GetTenderLinks(browser)
                
                # Apply tender limit if specified
                if max_tenders is not None and len(all_tender_links) > max_tenders:
                    self.logger.info(f"Limiting to {max_tenders} tender links (from {len(all_tender_links)})", 
                                   extra={'agent_id': self.agent_id})
                    all_tender_links = all_tender_links[:max_tenders]
                
                # Save all links to file
                with open(tender_links_file, 'w', encoding='utf-8') as f:
                    for link in all_tender_links:
                        f.write(f"{link}\n")
                    
                # Process tender pages
                processed_tender_pages = []
                for tender_url in all_tender_links:
                    try:
                        self.logger.info(f"Processing tender page: {tender_url}", extra={'agent_id': self.agent_id})
                        self.send_status(f"Processing tender page: {tender_url}")
                        
                        # Run TenderInfo on the webpage
                        tender_info = TenderInfo(browser, tender_url, is_document=False)
                        
                        # Try to parse the JSON response
                        try:
                            parsed_info = json.loads(tender_info['info'])
                            tender_info['info'] = parsed_info
                        except json.JSONDecodeError as e:
                            self.logger.error(f"Failed to parse tender info JSON: {str(e)}", 
                                            extra={'agent_id': self.agent_id})
                            self.send_status(f"Warning: Could not parse tender info as JSON for {tender_url}")
                        
                        processed_tender_pages.append(tender_info)
                        self.logger.info(f"Processed tender page: {tender_url}", 
                                       extra={'agent_id': self.agent_id})
                    except Exception as e:
                        error_msg = f"Error processing tender page {tender_url}: {str(e)}"
                        self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                        self.send_status(error_msg)
                        continue
                
                # Determine which tenders need document processing
                tenders_needing_documents = []
                for tender_info in processed_tender_pages:
                    if isinstance(tender_info['info'], dict) and 'error' in tender_info['info']:
                        self.logger.info(f"Tender page {tender_info['url']} needs document processing", 
                                       extra={'agent_id': self.agent_id})
                        tenders_needing_documents.append(tender_info['url'])
                
                # Find document links only for tenders that need it
                all_document_links = []
                if tenders_needing_documents:
                    self.logger.info(f"Finding documents for {len(tenders_needing_documents)} tenders", 
                                   extra={'agent_id': self.agent_id})
                    
                    for tender_url in tenders_needing_documents:
                        try:
                            document_links = FindDocumentLinks(browser, tender_url)
                            all_document_links.extend(document_links)
                            self.logger.info(f"Found {len(document_links)} documents for {tender_url}", 
                                           extra={'agent_id': self.agent_id})
                        except Exception as e:
                            self.logger.error(f"Error finding documents for {tender_url}: {str(e)}", 
                                            extra={'agent_id': self.agent_id})
                            continue
                else:
                    self.logger.info("All tenders were successfully processed from pages", 
                                   extra={'agent_id': self.agent_id})
                    self.send_status("All tenders were successfully processed from pages")
                
                # Apply document limit if specified
                if max_documents is not None and len(all_document_links) > max_documents:
                    self.logger.info(f"Limiting to {max_documents} document links (from {len(all_document_links)})", 
                                   extra={'agent_id': self.agent_id})
                    all_document_links = all_document_links[:max_documents]
                
                # Download and process documents if any links were found
                downloaded_documents = []
                processed_documents = []
                if all_document_links:
                    # Download documents
                    for doc_link in all_document_links:
                        try:
                            self.logger.info(f"Downloading document: {doc_link}", extra={'agent_id': self.agent_id})
                            self.send_status(f"Downloading document: {doc_link}")
                            
                            doc_path = DownloadDocument(browser, doc_link, self.documents_dir)
                            if doc_path:
                                downloaded_documents.append({
                                    'url': doc_link,
                                    'local_path': doc_path
                                })
                                self.logger.info(f"Successfully downloaded document to: {doc_path}", 
                                               extra={'agent_id': self.agent_id})
                        except Exception as e:
                            self.logger.error(f"Error downloading document {doc_link}: {str(e)}", 
                                            extra={'agent_id': self.agent_id})
                            continue
                    
                    # Process downloaded documents
                    for doc in downloaded_documents:
                        try:
                            self.logger.info(f"Processing document: {doc['local_path']}", 
                                           extra={'agent_id': self.agent_id})
                            
                            tender_info = TenderInfo(browser, doc['local_path'], is_document=True)
                            try:
                                parsed_info = json.loads(tender_info['info'])
                                tender_info['info'] = parsed_info
                            except json.JSONDecodeError as e:
                                self.logger.error(f"Failed to parse document info JSON: {str(e)}", 
                                                extra={'agent_id': self.agent_id})
                            
                            processed_documents.append(tender_info)
                            self.logger.info(f"Successfully processed document: {doc['local_path']}", 
                                           extra={'agent_id': self.agent_id})
                        except Exception as e:
                            self.logger.error(f"Error processing document {doc['local_path']}: {str(e)}", 
                                            extra={'agent_id': self.agent_id})
                            continue
                
                # Prepare results
                results = {
                    'timestamp': timestamp,
                    'tender_links': all_tender_links,
                    'tender_page_info': processed_tender_pages,
                    'document_links': all_document_links,
                    'downloaded_documents': downloaded_documents,
                    'document_info': processed_documents
                }
                
                with open(results_file, 'w', encoding='utf-8') as f:
                    json.dump(results, f, ensure_ascii=False, indent=2)
                    
                # Count successfully processed tenders
                successful_page_tenders = sum(1 for t in processed_tender_pages 
                                            if isinstance(t['info'], dict) and 'error' not in t['info'])
                    
                success_msg = f"""Crawl completed successfully:
- Found {len(all_tender_links)} tender pages
- Successfully processed {successful_page_tenders} tender pages
- Found {len(all_document_links)} document links
- Downloaded {len(downloaded_documents)} documents
- Processed {len(processed_documents)} document details
- Results saved to {results_file}
- Documents saved to {self.documents_dir}"""
                self.logger.info(success_msg, extra={'agent_id': self.agent_id})
                self.send_status(success_msg)
            finally:
                browser.Quit()
        except Exception as e:
            error_msg = f"Error during crawl: {str(e)}"
            self.logger.error(error_msg, extra={'agent_id': self.agent_id})
            self.send_status(error_msg)

    def run(self):
        self.running = True
        self.logger.info(f"WebCrawler {self.agent_id} starting", extra={'agent_id': self.agent_id})
        self.send_status(f"WebCrawler {self.agent_id} started")

        # Initialize the crawler data
        if not self.Initialize():
            self.logger.error("Failed to initialize crawler data", extra={'agent_id': self.agent_id})
            self.send_status("Failed to initialize crawler data")
            return

        # Initialize ZMQ context and sockets in the child process
        self.context = zmq.Context()
        
        # Setup command socket (bind)
        self.command_socket = self.context.socket(zmq.REP)
        port = int(self.agent_id) + COMMAND_PORT
        self.command_socket.bind(f"tcp://*:{port}")
        self.logger.debug(f"Command socket bound to port {port}", extra={'agent_id': self.agent_id})
        self.send_status(f"WebCrawler {self.agent_id} command socket bound to port {port}")

        # Setup status socket (connect to manager's PUB)
        self.status_socket = self.context.socket(zmq.PUB)
        self.status_socket.connect(f"tcp://localhost:{STATUS_PORT}")
        self.logger.debug(f"Status socket connected to port {STATUS_PORT}", extra={'agent_id': self.agent_id})
        self.send_status(f"WebCrawler {self.agent_id} status socket connected to port {STATUS_PORT}")

        poller = zmq.Poller()
        poller.register(self.command_socket, zmq.POLLIN)

        # Send initial status
        try:
            self.status_socket.send_multipart([
                str(self.agent_id).encode(),
                f"WebCrawler initialized with {len(self.portals_to_crawl)} URLs to crawl".encode()
            ])
            self.logger.info(f"Initial status sent with {len(self.portals_to_crawl)} URLs", extra={'agent_id': self.agent_id})
            self.send_status(f"WebCrawler {self.agent_id} sent initial status")
        except Exception as e:
            error_msg = f"Error sending initial status: {str(e)}"
            self.logger.error(error_msg, extra={'agent_id': self.agent_id})
            self.send_status(error_msg)

        while self.running:
            try:
                # Poll for commands with timeout (500ms)
                socks = dict(poller.poll(500))

                if self.command_socket in socks:
                    try:
                        command = self.command_socket.recv_string(zmq.NOBLOCK)
                        self.logger.debug(f"Received command: {command}", extra={'agent_id': self.agent_id})
                        
                        if command == "stop":
                            self.logger.info("Received stop command", extra={'agent_id': self.agent_id})
                            self.command_socket.send_string("Stopping")
                            self.status_socket.send_multipart([
                                str(self.agent_id).encode(),
                                "Received stop command, shutting down".encode()
                            ])
                            self.Stop()
                            continue
                        elif command == "test":
                            self.logger.debug("Received test command", extra={'agent_id': self.agent_id})
                            self.command_socket.send_string("Test received")
                            self.status_socket.send_multipart([
                                str(self.agent_id).encode(),
                                "Test command received and acknowledged".encode()
                            ])
                        elif command == "crawl":
                            self.logger.info("Received crawl command", extra={'agent_id': self.agent_id})
                            self.command_socket.send_string("Crawling")
                            self.status_socket.send_multipart([
                                str(self.agent_id).encode(),
                                "Crawling command received and acknowledged".encode()
                            ])
                            self.set_status(AgentStatus.CRAWLING)
                            self.send_status(f'Agent {self.agent_id} status: {self.get_status().name}')
                            self.Crawl(max_tenders=2, max_documents=2)
                            self.set_status(AgentStatus.IDLE)
                            self.send_status(f'Agent {self.agent_id} status: {self.get_status().name}')
                        elif command.startswith("crawl:"):
                            try:
                                # Parse limits from command like "crawl:3,2" (3 tenders, 2 documents)
                                limits = command.split(":", 1)[1].strip()
                                parts = limits.split(",")
                                
                                max_tenders = int(parts[0]) if len(parts) > 0 and parts[0] else None
                                max_documents = int(parts[1]) if len(parts) > 1 and parts[1] else None
                                
                                self.logger.info(f"Received limited crawl command: max_tenders={max_tenders}, max_documents={max_documents}", 
                                               extra={'agent_id': self.agent_id})
                                self.command_socket.send_string(f"Crawling with limits: tenders={max_tenders}, documents={max_documents}")
                                
                                self.set_status(AgentStatus.CRAWLING)
                                self.send_status(f'Agent {self.agent_id} status: {self.get_status().name}')
                                self.Crawl(max_tenders=max_tenders, max_documents=max_documents)
                                self.set_status(AgentStatus.IDLE)
                                self.send_status(f'Agent {self.agent_id} status: {self.get_status().name}')
                            except Exception as e:
                                error_msg = f"Error parsing crawl limits: {str(e)}"
                                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                                self.command_socket.send_string(f"Error: {error_msg}")
                        else:
                            error_msg = f"Received unknown command: {command}"
                            self.logger.warning(error_msg, extra={'agent_id': self.agent_id})
                            self.command_socket.send_string(f"Unknown command: {command}")
                            self.status_socket.send_multipart([
                                str(self.agent_id).encode(),
                                error_msg.encode()
                            ])
                    except zmq.Again:
                        pass

            except Exception as e:
                error_msg = f"Error in WebCrawler main loop: {str(e)}"
                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                time.sleep(1)  # Prevent tight loop in case of errors

        try:
            self.status_socket.send_multipart([
                str(self.agent_id).encode(),
                "WebCrawler shutting down".encode()
            ])
            self.logger.info("Shutdown message sent", extra={'agent_id': self.agent_id})
        except Exception as e:
            error_msg = f"Error sending shutdown status: {str(e)}"
            self.logger.error(error_msg, extra={'agent_id': self.agent_id})
            self.send_status(error_msg)
        
        self.Close()