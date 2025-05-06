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


STATUS_PORT = 5600
COMMAND_PORT = 5500

class AgentType(Enum):
    WEB_CRAWLER = "WebCrawler"


class Agent(Process):
    def __init__(self, agent_id):
        super().__init__()
        self.agent_id = agent_id
        self.running = False
        self.context = zmq.Context()
        self.logger = GetLogger()
        self.command_socket = None
        self.status_socket = None
    
    def __str__(self):
        return f"Agent ID: {self.agent_id} \nRunning: {self.running}"

    def Close(self):  
        if self.command_socket:  
            self.command_socket.close(linger=0)
        if self.status_socket:
            self.status_socket.close(linger=0)
        self.context.term()

    def run(self):
        self.running = True

        # Setup command socket (bind)
        self.command_socket = self.context.socket(zmq.REP) # Reply socket (to recieve commands)
        self.command_socket.bind(f"tcp://*:{self.agent_id + COMMAND_PORT}")

        # Setup status socket (connect to manager's PUB)
        self.status_socket = self.context.socket(zmq.PUB) # Publish socket (to give status updates, e.g. 'crawling url X')
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
                    else:
                        self.command_socket.send_string(f"Unknown command: {command}")
                except zmq.Again:
                    # No command received
                    pass

            # Send periodic status update
            self.status_socket.send_multipart([
                str(self.agent_id).encode(),
                f"Agent {self.agent_id} is running".encode()
            ])

            time.sleep(1)
        self.Close()

    def Stop(self):
        self.running = False
        self.close()


class AgentManager(Process):
    def __init__(self):
        super().__init__()
        self.agents = {}  # Stores agent configurations
        self.processes = {}  # Tracks running processes
        self.context = zmq.Context()
        self.status_socket = self.context.socket(zmq.SUB)
        self.status_socket.setsockopt(zmq.SUBSCRIBE, b'')
        self.status_socket.bind("tcp://*:5600")
    
    def is_running(self):
        return self.is_alive()
    
    def run(self):
        # Main manager loop handling status updates and cleanup
        poller = zmq.Poller()
        poller.register(self.status_socket, zmq.POLLIN)
        
        while True:
            # Process status messages
            socks = dict(poller.poll(500))  # 500ms timeout
            if self.status_socket in socks:
                agent_id, status = self.status_socket.recv_multipart()
                print(f"[{agent_id.decode()}] {status.decode()}")
            
            # Periodic cleanup
            self.CleanupProcesses()

    def Create(self, agent_type: AgentType):
        """Create new agent instance"""
        agent_id = max(self.agents.keys(), default=0) + 1
        if agent_type == AgentType.WEB_CRAWLER:
            from .webcrawler import WebCrawler
            agent = WebCrawler(agent_id)
        self.agents[agent_id] = agent
        return agent

    def Start(self, agent_id: int):
        """Start an agent process"""
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not found")
            
        if agent_id in self.processes:
            if self.processes[agent_id].is_alive():
                print(f"Agent {agent_id} already running")
                return
                
        agent = self.agents[agent_id]
        agent.start()  # Start the process
        self.processes[agent_id] = agent
        print(f"Agent {agent_id} started")

    def Stop(self, agent_id: int):
        """Gracefully stop an agent"""
        if agent_id not in self.processes:
            print(f"Agent {agent_id} not running")
            return
            
        # Send stop command via ZeroMQ
        ctx = zmq.Context()
        sock = ctx.socket(zmq.REQ)
        sock.connect(f"tcp://localhost:{COMMAND_PORT + agent_id}")
        sock.send_string("stop")
        sock.close()
        ctx.term()
        
        # Wait for process termination
        self.processes[agent_id].join(timeout=5)
        if self.processes[agent_id].is_alive():
            print(f"Force-terminating agent {agent_id}")
            self.processes[agent_id].terminate()

    def CleanupProcesses(self):
        """Remove terminated agents"""
        dead = [aid for aid, p in self.processes.items() if not p.is_alive()]
        for aid in dead:
            del self.processes[aid]
            del self.agents[aid]
        if dead:
            print(f"Cleaned {len(dead)} terminated agents")
