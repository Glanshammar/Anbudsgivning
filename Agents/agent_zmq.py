import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

import zmq
import time
import multiprocessing
from enum import Enum
from Logger import GetLogger

STATUS_PORT = 5600
COMMAND_PORT = 5500

class AgentType(Enum):
    WEB_CRAWLER = "WebCrawler"
    OTHER = "Other"

class Agent:
    def __init__(self, agent_id, role):
        self.agent_id = agent_id
        self.role = role
        self.running = False
        self.context = zmq.Context()
        self.logger = GetLogger()
    
    def __close__(self):
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
            command_socket.bind(f"tcp://127.0.0.1:{self.agent_id+COMMAND_PORT}")
        except zmq.error.ZMQError as e:
            print(f"Failed to create or bind REP socket: {e}")
            return

        # Create PUB socket for status updates
        try:
            status_socket = self.context.socket(zmq.PUB)
            status_socket.bind(f"tcp://127.0.0.1:{self.agent_id+STATUS_PORT}")
        except zmq.error.ZMQError as e:
            print(f"Failed to create or bind PUB socket: {e}")
            return

        while self.running:
            try:
                command_socket.recv()
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
                self.__close__()
                break
            finally:
                status_socket.send_string(f"Agent {self.agent_id} is running")

        self.__close__()

    def Stop(self):
        self.running = False
        self.__close__()

class WebCrawlerAgent(Agent):
    def __init__(self, agent_id, role, urls_to_crawl):
        super().__init__(agent_id, role)
        self.urls_to_crawl = urls_to_crawl

    def Run(self):
        super().Run()
        # You should integrate crawling logic within the loop in the Agent class
        # or use threading to handle it concurrently

class OtherAgent(Agent):
    def __init__(self, agent_id, role):
        super().__init__(agent_id, role)

class AgentManager:
    def __init__(self):
        self.agents = {}
        self.processes = {}
    
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
        if agent_id in self.agents:
            agent = self.agents[agent_id]
            process = multiprocessing.Process(target=agent.Run)
            self.processes[agent_id] = process
            process.start()
            print(f"Agent {agent_id} started as a process")
        else:
            print(f"Agent {agent_id} not found")

    def Stop(self, agent_or_id):
        agent_id = agent_or_id.agent_id if isinstance(agent_or_id, Agent) else agent_or_id
        if agent_id in self.processes:
            stop_socket = zmq.Context().socket(zmq.REQ)
            stop_socket.connect(f"tcp://127.0.0.1:{agent_id+COMMAND_PORT}")
            try:
                stop_socket.send(b"stop")
                stop_socket.recv()
            except zmq.error.Again:
                print(f"Failed to stop Agent {agent_id} due to timeout.")
            except Exception as e:
                print(f"Error stopping Agent {agent_id}: {e}")
            finally:
                stop_socket.close()
            print(f"Agent {agent_id} stopped")

    def GetStatus(self, agent_or_id):
        agent_id = agent_or_id.agent_id if isinstance(agent_or_id, Agent) else agent_or_id
        status_socket = zmq.Context().socket(zmq.SUB)
        status_socket.connect(f"tcp://127.0.0.1:{agent_id+STATUS_PORT}")
        status_socket.setsockopt(zmq.SUBSCRIBE, b"")
        status = status_socket.recv_string()
        print(f"Agent {agent_id} status: {status}")
        return status    

if __name__ == "__main__":
    manager = AgentManager()
    webcrawler = manager.Create(AgentType.WEB_CRAWLER, "Crawling", urls_to_crawl=["http://example.com"])
    other_agent = manager.Create(AgentType.OTHER, "Other Task")
    manager.Start(webcrawler)
    manager.Start(other_agent)
    time.sleep(5)
    print('Stopping agents...')
    manager.Stop(webcrawler)
    manager.Stop(other_agent)
    print('Stopped agents.')
