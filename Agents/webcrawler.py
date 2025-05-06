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
from .agents import Agent, COMMAND_PORT, STATUS_PORT
import requests
import json

class WebCrawler(Agent):
    def __init__(self, agent_id):
        super().__init__(agent_id)
        self.urls_to_crawl = self.UpdateURLs()

    def UpdateURLs(self):
        try:
            tender_portals_response = requests.get('http://127.0.0.1:5000/api/tender_portals')
            if tender_portals_response.status_code != 200:
                print(f"Failed to get tender portals. Status code: {tender_portals_response.status_code}")
                return []
            
            tender_portals = tender_portals_response.json()
            if not isinstance(tender_portals, dict) or 'data' not in tender_portals:
                print("Invalid response format from tender portals API")
                return []
            
            portals = tender_portals['data'].get('portals', [])
            if not portals:
                print("No portals found in the response")
                return []
            
            # Save to file for debugging
            with open(os.path.join(current_dir, 'urls.json'), 'w') as f:
                json.dump(portals, f, indent=4)
            
            return portals
        except Exception as e:
            print(f"Error updating URLs: {str(e)}")
            return []


    def run(self):
        self.running = True

        # Setup command socket (bind)
        self.command_socket = self.context.socket(zmq.REP)
        self.command_socket.bind(f"tcp://*:{self.agent_id + COMMAND_PORT}")

        # Setup status socket (connect to manager's PUB)
        self.status_socket = self.context.socket(zmq.PUB)
        self.status_socket.connect(f"tcp://localhost:{STATUS_PORT}")

        poller = zmq.Poller()
        poller.register(self.command_socket, zmq.POLLIN)

        while self.running:
            # Poll for commands with timeout (500ms)
            socks = dict(poller.poll(500))

            if self.command_socket in socks:
                try:
                    command = self.command_socket.recv_string(zmq.NOBLOCK)
                    if command == "stop":
                        self.command_socket.send_string("Stopping")
                        self.Stop()
                        continue
                    if command == "test":
                        self.command_socket.send_string("Test received")
                    else:
                        self.command_socket.send_string(f"Unknown command: {command}")
                except zmq.Again:
                    pass

            # Mock crawling: send status for each URL
            for url in self.urls_to_crawl:
                self.status_socket.send_multipart([
                    str(self.agent_id).encode(),
                    f"Crawling {url}".encode()
                ])
                time.sleep(1)
                if not self.running:
                    break
        self.Close()