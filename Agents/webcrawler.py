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

class WebCrawler(Agent):
    def __init__(self, agent_id):
        super().__init__(agent_id)
        self.urls_to_crawl = self.UpdateURLs()
        self.results_dir = os.path.join(current_dir, 'crawl_results')
        os.makedirs(self.results_dir, exist_ok=True)

    def ReadURLsFromFile(self):
        try:
            file_path = os.path.join(current_dir, 'urls.json')
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    return json.load(f)
            return []
        except Exception as e:
            print(f"Error reading urls.json: {str(e)}")
            return []

    def UpdateURLs(self):
        try:
            tender_portals_response = requests.get('http://127.0.0.1:5000/api/tender_portals')
            if tender_portals_response.status_code != 200:
                print(f"Failed to get tender portals. Status code: {tender_portals_response.status_code}")
                print("Falling back to urls.json...")
                return self.ReadURLsFromFile()
            
            tender_portals = tender_portals_response.json()
            if not isinstance(tender_portals, dict) or 'data' not in tender_portals:
                print("Invalid response format from tender portals API")
                print("Falling back to urls.json...")
                return self.ReadURLsFromFile()
            
            portals = tender_portals['data'].get('portals', [])
            if not portals:
                print("No portals found in the response")
                print("Falling back to urls.json...")
                return self.ReadURLsFromFile()
            
            # Save to file for future use
            with open(os.path.join(current_dir, 'urls.json'), 'w') as f:
                json.dump(portals, f, indent=4)
            
            return portals
        except Exception as e:
            print(f"Error updating URLs: {str(e)}")
            print("Falling back to urls.json...")
            return self.ReadURLsFromFile()

    def Crawl(self):
        try:
            self.send_status("Starting crawl operation")
            
            # Create a results file for this crawl session
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            results_file = os.path.join(self.results_dir, f'crawl_results_{timestamp}.json')
            
            all_links = []
            
            # Simulate crawling each portal
            for portal in self.urls_to_crawl:
                portal_url = portal['url']
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
                self.send_status(f"Found {len(mock_links)} tenders in {portal_url}")
                
                # Simulate processing time
                time.sleep(2)
            
            # Save results to file
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(all_links, f, ensure_ascii=False, indent=2)
            
            self.send_status(f"Crawl completed. Found {len(all_links)} tenders total. Results saved to {results_file}")
            
        except Exception as e:
            error_msg = f"Error during crawl: {str(e)}"
            self.send_status(error_msg)
            self.logger.error(error_msg)

    def run(self):
        self.running = True
        print(f"WebCrawler {self.agent_id} started")

        # Setup command socket (bind)
        self.command_socket = self.context.socket(zmq.REP)
        self.command_socket.bind(f"tcp://*:{self.agent_id + COMMAND_PORT}")
        print(f"WebCrawler {self.agent_id} command socket bound to port {self.agent_id + COMMAND_PORT}")

        # Setup status socket (connect to manager's PUB)
        self.status_socket = self.context.socket(zmq.PUB)
        self.status_socket.connect(f"tcp://localhost:{STATUS_PORT}")
        print(f"WebCrawler {self.agent_id} status socket connected to port {STATUS_PORT}")

        poller = zmq.Poller()
        poller.register(self.command_socket, zmq.POLLIN)

        # Send initial status
        try:
            self.status_socket.send_multipart([
                str(self.agent_id).encode(),
                f"WebCrawler initialized with {len(self.urls_to_crawl)} URLs to crawl".encode()
            ])
            print(f"WebCrawler {self.agent_id} sent initial status")
        except Exception as e:
            print(f"Error sending initial status: {str(e)}")

        while self.running:
            try:
                # Poll for commands with timeout (500ms)
                socks = dict(poller.poll(500))

                if self.command_socket in socks:
                    try:
                        command = self.command_socket.recv_string(zmq.NOBLOCK)
                        if command == "stop":
                            self.command_socket.send_string("Stopping")
                            self.status_socket.send_multipart([
                                str(self.agent_id).encode(),
                                "Received stop command, shutting down".encode()
                            ])
                            self.Stop()
                            continue
                        if command == "test":
                            self.command_socket.send_string("Test received")
                            self.status_socket.send_multipart([
                                str(self.agent_id).encode(),
                                "Test command received and acknowledged".encode()
                            ])
                        if command == "crawl":
                            self.command_socket.send_string("Crawling")
                            self.status_socket.send_multipart([
                                str(self.agent_id).encode(),
                                "Crawling command received and acknowledged".encode()
                            ])
                            self.status = AgentStatus.CRAWLING
                            self.Crawl()
                        else:
                            self.command_socket.send_string(f"Unknown command: {command}")
                            self.status_socket.send_multipart([
                                str(self.agent_id).encode(),
                                f"Received unknown command: {command}".encode()
                            ])
                    except zmq.Again:
                        pass

                # Mock crawling: send status for each URL
                for portal in self.urls_to_crawl:
                    try:
                        self.status_socket.send_multipart([
                            str(self.agent_id).encode(),
                            f"Processing portal: {portal['url']}".encode()
                        ])
                        time.sleep(1)
                        if not self.running:
                            break
                    except Exception as e:
                        print(f"Error sending portal status: {str(e)}")

            except Exception as e:
                print(f"Error in WebCrawler main loop: {str(e)}")
                time.sleep(1)  # Prevent tight loop in case of errors

        try:
            self.status_socket.send_multipart([
                str(self.agent_id).encode(),
                "WebCrawler shutting down".encode()
            ])
        except Exception as e:
            print(f"Error sending shutdown status: {str(e)}")
        
        self.Close()