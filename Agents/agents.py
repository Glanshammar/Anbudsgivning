import os
import sys
import zmq
import time
import multiprocessing
from enum import Enum
from Logger import GetLogger
from multiprocessing import Process

STATUS_PORT = 5600
COMMAND_PORT = 5500

class AgentType(Enum):
    WEB_CRAWLER = "WebCrawler"
    OTHER = "Other"

class Agent(Process):
    def __init__(self, agent_id, role):
        super().__init__()
        self.agent_id = agent_id
        self.role = role
        self.running = False
        self.context = zmq.Context()
        self.logger = GetLogger()
    
    def __str__(self):
        return f"Agent ID: {self.agent_id} \nRole: {self.role} \nRunning: {self.running}"

    def Close(self):
        if hasattr(self, 'command_socket'):
            try:
                self.command_socket.close()
            except zmq.error.ZMQError as e:
                self.logger.error(f"Failed to close command socket: {e}")
        if hasattr(self, 'status_socket'):
            try:
                self.status_socket.close()
            except zmq.error.ZMQError as e:
                self.logger.error(f"Failed to close status socket: {e}")
        if hasattr(self, 'context'):
            try:
                self.context.term()
            except zmq.error.ZMQError as e:
                self.logger.error(f"Failed to terminate context: {e}")

    def Run(self):
        self.running = True

        # Create REP socket for commands
        try:
            command_socket = self.context.socket(zmq.REP)
            command_socket.bind(f"tcp://127.0.0.1:{self.agent_id + COMMAND_PORT}")
            self.command_socket = command_socket
        except zmq.error.ZMQError as e:
            print(f"Failed to create or bind REP socket: {e}")
            return

        # Create PUB socket for status updates
        try:
            status_socket = self.context.socket(zmq.PUB)
            status_socket.bind(f"tcp://127.0.0.1:{self.agent_id + STATUS_PORT}")
            self.status_socket = status_socket
        except zmq.error.ZMQError as e:
            print(f"Failed to create or bind PUB socket: {e}")
            return

        while self.running:
            try:
                command = command_socket.recv_string()
                if command == "stop":
                    self.Stop()
                else:
                    print(f"Agent {self.agent_id} received unknown command: {command}")
                command_socket.send(b"Command received.")
            except zmq.error.Again:
                print("No response received within the timeout period.")
                command_socket.send(b"Command failed.")
            except Exception as e:
                print(f"Error receiving message: {e}")
                command_socket.send(b"Command failed.")
                self.close()
                break
            finally:
                status_socket.send_string(f"Agent {self.agent_id} is running")

        self.close()

    def Stop(self):
        self.running = False
        self.close()


class WebCrawlerAgent(Agent):
    def __init__(self, agent_id, role, urls_to_crawl):
        super().__init__(agent_id, role)
        self.urls_to_crawl = urls_to_crawl


class OtherAgent(Agent):
    def __init__(self, agent_id, role):
        super().__init__(agent_id, role)


class AgentManager(Process):
    def __init__(self):
        super().__init__()
        self.agents = {}
        self.processes = {}
    
    def __str__(self):
        return f"Agents: {self.agents if self.agents else 'empty'}"
    
    def Create(self, agent_type, role, **kwargs):
        agent_id = len(self.agents) + 1
        if agent_type == AgentType.WEB_CRAWLER:
            agent = WebCrawlerAgent(agent_id, role, **kwargs)
        elif agent_type == AgentType.OTHER:
            agent = OtherAgent(agent_id, role)
        else:
            raise ValueError("Invalid agent type")
        self.agents[agent_id] = agent
        return agent

    def Start(self, agent_or_id):
        agent_id = agent_or_id.agent_id if isinstance(agent_or_id, Agent) else agent_or_id
        
        if agent_id not in self.agents:
            print(f"Agent {agent_id} not found")
            return
        
        agent = self.agents[agent_id]
        
        if agent_id in self.processes and self.processes[agent_id].is_alive():
            print(f"Agent {agent_id} is already running")
            return
        
        try:
            agent.Run()
            self.processes[agent_id] = agent
            print(f"Agent {agent_id} started successfully")
        except Exception as e:
            print(f"Failed to start Agent {agent_id}: {str(e)}")

    def Stop(self, agent_or_id):
        agent_id = agent_or_id.agent_id if isinstance(agent_or_id, Agent) else agent_or_id
        
        if agent_id in self.processes and self.processes[agent_id].is_alive():
            stop_socket = zmq.Context().socket(zmq.REQ)
            stop_socket.connect(f"tcp://127.0.0.1:{agent_id + COMMAND_PORT}")
            
            try:
                stop_socket.send_string("stop")
                stop_socket.recv_string()
                print(f"Agent {agent_id} stopped successfully")
            except zmq.error.Again:
                print(f"Failed to stop Agent {agent_id} due to timeout.")
            except Exception as e:
                print(f"Error stopping Agent {agent_id}: {str(e)}")
            finally:
                stop_socket.close()

    def CleanupProcesses(self):
        dead_agents = [
            agent_id 
            for agent_id, process in self.processes.items() 
            if not process.is_alive()
        ]
        
        for agent_id in dead_agents:
            del self.processes[agent_id]
        
        if dead_agents:
            print(f"Cleaned up {len(dead_agents)} dead agents")

    def ManagerLoop(self):
        while True:
            time.sleep(5)
            self.CleanupProcesses()
