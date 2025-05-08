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
import requests
import json
from datetime import datetime, timedelta

class WebCrawler(Agent):
    def __init__(self, agent_id):
        super().__init__(agent_id)
        self.logger.info("Initializing WebCrawler", extra={'agent_id': self.agent_id})
        self.portals_to_crawl = []
        self.results_dir = os.path.join(current_dir, 'crawl_results')
        self.cache_dir = os.path.join(current_dir, 'cache')
        os.makedirs(self.results_dir, exist_ok=True)
        os.makedirs(self.cache_dir, exist_ok=True)
        self.logger.debug(f"Results directory: {self.results_dir}", extra={'agent_id': self.agent_id})

    def Initialize(self):
        """Initialize the crawler after the agent is fully set up"""
        self.logger.info("Initializing crawler data", extra={'agent_id': self.agent_id})
        self.portals_to_crawl = self.UpdatePortals()
        self.logger.info(f"Initialized with {len(self.portals_to_crawl)} portals", extra={'agent_id': self.agent_id})
        return True

    def ReadURLsFromFile(self):
        try:
            file_path = os.path.join(current_dir, 'urls.json')
            self.logger.debug(f"Reading URLs from file: {file_path}", extra={'agent_id': self.agent_id})
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    urls = json.load(f)
                self.logger.info(f"Successfully read {len(urls)} URLs from file", extra={'agent_id': self.agent_id})
                return urls
            self.logger.warning("urls.json file not found", extra={'agent_id': self.agent_id})
            return []
        except Exception as e:
            error_msg = f"Error reading urls.json: {str(e)}"
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
                return self.ReadURLsFromFile()

            self.logger.info("Updating portals from API", extra={'agent_id': self.agent_id})
            tender_portals_response = requests.get('http://127.0.0.1:5000/api/tender_portals')
            if tender_portals_response.status_code != 200:
                error_msg = f"Failed to get tender portals. Status code: {tender_portals_response.status_code} {tender_portals_response.text}"
                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                self.send_status("Falling back to urls.json...")
                return self.ReadURLsFromFile()
            
            response_data = tender_portals_response.json()
            if not isinstance(response_data, dict):
                error_msg = "Invalid response format from tender portals API"
                self.logger.error(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                self.send_status("Falling back to urls.json...")
                return self.ReadURLsFromFile()
            
            # The API returns the data directly in the response
            portals = response_data.get('portals', [])
            if not portals:
                error_msg = "No portals found in the response"
                self.logger.warning(error_msg, extra={'agent_id': self.agent_id})
                self.send_status(error_msg)
                self.send_status("Falling back to urls.json...")
                return self.ReadURLsFromFile()
            
            # Save to URL file for future use
            file_path = os.path.join(current_dir, 'urls.json')
            with open(file_path, 'w') as f:
                json.dump(portals, f, indent=4)
            
            self.UpdateTimestamp()
            self.logger.info(f"Successfully updated {len(portals)} portals", extra={'agent_id': self.agent_id})
            return portals
        except Exception as e:
            error_msg = f"Error updating URLs: {str(e)}"
            self.logger.error(error_msg, extra={'agent_id': self.agent_id})
            self.send_status(error_msg)
            self.send_status("Falling back to urls.json...")
            return self.ReadURLsFromFile()

    def Crawl(self):
        try:
            self.logger.info("Starting crawl operation", extra={'agent_id': self.agent_id})
            self.send_status("Starting crawl operation")
            
            # Create a results file for this crawl session
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            results_file = os.path.join(self.results_dir, f'crawl_results_{timestamp}.json')
            self.logger.debug(f"Results will be saved to: {results_file}", extra={'agent_id': self.agent_id})
            
            all_links = []
            
            # Simulate crawling each portal
            for portal in self.portals_to_crawl:
                portal_url = portal['url']
                self.logger.info(f"Processing portal: {portal_url}", extra={'agent_id': self.agent_id})
                self.send_status(f"Crawling portal: {portal_url}")
                
                # Simulate finding links (mock data)
                mock_links = [
                    {
                        'url': f"{portal_url}/tender/1",
                        'title': "Software Development Tender",
                        'date': time.strftime("%Y-%m-%d"),
                        'size_kb': 150.5,
                        'cpv_code': "72000000"
                    },
                    {
                        'url': f"{portal_url}/tender/2",
                        'title': "IT Infrastructure Upgrade",
                        'date': time.strftime("%Y-%m-%d"),
                        'size_kb': 200.0,
                        'cpv_code': "72200000"
                    },
                    {
                        'url': f"{portal_url}/tender/3",
                        'title': "Cloud Services Procurement",
                        'date': time.strftime("%Y-%m-%d"),
                        'size_kb': 175.3,
                        'cpv_code': "72300000"
                    }
                ]
                
                all_links.extend(mock_links)
                self.logger.info(f"Found {len(mock_links)} tenders in {portal_url}", extra={'agent_id': self.agent_id})
                self.send_status(f"Found {len(mock_links)} tenders in {portal_url}")

            # Save results to file
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(all_links, f, ensure_ascii=False, indent=2)
            
            success_msg = f"Crawl completed. Found {len(all_links)} tenders total. Results saved to {results_file}"
            self.logger.info(success_msg, extra={'agent_id': self.agent_id})
            self.send_status(success_msg)
            
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
                            self.logger.info("Starting crawl operation", extra={'agent_id': self.agent_id})
                            self.Crawl()
                            time.sleep(100)
                            self.set_status(AgentStatus.IDLE)
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