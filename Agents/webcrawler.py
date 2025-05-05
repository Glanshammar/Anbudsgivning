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

class WebCrawler(Agent):
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
                        print("This is a web crawler test.")
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