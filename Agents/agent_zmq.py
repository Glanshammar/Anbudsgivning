import zmq
import threading
import time
import multiprocessing
from enum import Enum

class AgentType(Enum):
    WEB_CRAWLER = "WebCrawler"
    OTHER = "Other"

class Agent:
    def __init__(self, agent_id, role):
        self.agent_id = agent_id
        self.role = role
        self.running = False

    def Run(self, context):
        self.running = True
        # Create REP socket for commands
        command_socket = context.socket(zmq.REP)
        command_socket.bind(f"tcp://127.0.0.1:{self.agent_id+5555}")

        # Create PUB socket for status updates
        status_socket = context.socket(zmq.PUB)
        status_socket.bind(f"tcp://127.0.0.1:{self.agent_id+5560}")

        while self.running:
            # Check for commands
            command_socket.recv()
            command = command_socket.recv_string()
            if command == "stop":
                self.Stop()
            else:
                print(f"Agent {self.agent_id} received unknown command: {command}")
            command_socket.send(b"Command received")

            # Send status updates
            status_socket.send_string(f"Agent {self.agent_id} is running")

    def Stop(self):
        self.running = False

class WebCrawlerAgent(Agent):
    def __init__(self, agent_id, role, urls_to_crawl):
        super().__init__(agent_id, role)
        self.urls_to_crawl = urls_to_crawl

    def Run(self, context):
        super().Run(context)
        while self.running:
            for url in self.urls_to_crawl:
                try:
                    # Simulate crawling
                    print(f"Agent {self.agent_id} crawled {url}")
                except Exception as e:
                    print(f"Agent {self.agent_id} error crawling {url}: {e}")
                time.sleep(5)

class OtherAgent(Agent):
    def __init__(self, agent_id, role):
        super().__init__(agent_id, role)

    def Run(self, context):
        super().Run(context)
        while self.running:
            print(f"Agent {self.agent_id} is running")
            time.sleep(1)

class AgentManager:
    def __init__(self):
        self.agents = {}
        self.processes = {}
        self.context = zmq.Context()

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
            process = multiprocessing.Process(target=agent.Run, args=(self.context,))
            self.processes[agent_id] = process
            process.start()
            print(f"Agent {agent_id} started as a process")
        else:
            print(f"Agent {agent_id} not found")

    def Stop(self, agent_or_id):
        agent_id = agent_or_id.agent_id if isinstance(agent_or_id, Agent) else agent_or_id
        if agent_id in self.processes:
            # Use a REQ socket to send stop command
            stop_socket = self.context.socket(zmq.REQ)
            stop_socket.connect(f"tcp://127.0.0.1:{agent_id+5555}")
            stop_socket.send(b"stop")
            stop_socket.recv()
            print(f"Agent {agent_id} stopped")
        else:
            print(f"Agent {agent_id} not found")

    def GetStatus(self, agent_or_id):
        agent_id = agent_or_id.agent_id if isinstance(agent_or_id, Agent) else agent_or_id
        # Subscribe to status updates
        status_socket = self.context.socket(zmq.SUB)
        status_socket.connect(f"tcp://127.0.0.1:{agent_id+5560}")
        status_socket.setsockopt(zmq.SUBSCRIBE, b"")
        status = status_socket.recv_string()
        print(f"Agent {agent_id} status: {status}")
        return status

def AgentMain():
    global manager
    manager = AgentManager()
    webcrawler = manager.Create(AgentType.WEB_CRAWLER, "Crawling", urls_to_crawl=["http://example.com"])
    other_agent = manager.Create(AgentType.OTHER, "Other Task")
    manager.Start(webcrawler)
    manager.Start(other_agent)
    time.sleep(5)
    manager.Stop(webcrawler)
    manager.Stop(other_agent)

if __name__ == "__main__":
    AgentMain()
