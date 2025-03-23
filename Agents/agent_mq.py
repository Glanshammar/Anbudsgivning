import threading
import multiprocessing
import time
import requests
from enum import Enum
import pika

class AgentType(Enum):
    WEB_CRAWLER = "WebCrawler"
    OTHER = "Other"


class Agent:
    def __init__(self, agent_id, role, queue_name):
        self.agent_id = agent_id
        self.role = role
        self.queue_name = queue_name

    def SendMessage(self, message):
        connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
        channel = connection.channel()
        channel.queue_declare(queue=self.queue_name)
        channel.basic_publish(exchange='',
                              routing_key=self.queue_name,
                              body=message)
        connection.close()

    def ReceiveMessages(self):
        connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
        channel = connection.channel()
        channel.queue_declare(queue=self.queue_name)

        def callback(ch, method, properties, body):
            print(f"Agent {self.agent_id} received: {body}")

        channel.basic_consume(queue=self.queue_name,
                              on_message_callback=callback,
                              no_ack=True)

        print(f"Agent {self.agent_id} waiting for messages. To exit press CTRL+C")
        channel.start_consuming()

    def StartMessenger(self):
        self.consumer_thread = threading.Thread(target=self.ReceiveMessages)
        self.consumer_thread.start()

    def Run(self):
        # Agent-specific logic goes here
        pass


class WebCrawlerAgent(Agent):
    def __init__(self, agent_id, role, urls_to_crawl, queue_name):
        super().__init__(agent_id, role, queue_name)
        self.urls_to_crawl = urls_to_crawl

    def Run(self):
        for url in self.urls_to_crawl:
            try:
                response = requests.get(url)
                print(f"Agent {self.agent_id} crawled {url}")
                self.SendMessage(f"Agent {self.agent_id} crawled {url}")
            except Exception as e:
                print(f"Agent {self.agent_id} error crawling {url}: {e}")
                self.SendMessage(f"Agent {self.agent_id} error crawling {url}: {e}")
            time.sleep(5)


class OtherAgent(Agent):
    def __init__(self, agent_id, role, queue_name):
        super().__init__(agent_id, role, queue_name)

    def Run(self):
        while True:
            print(f"Agent {self.agent_id} is running")
            self.SendMessage(f"Agent {self.agent_id} is running")
            time.sleep(5)


class AgentManager:
    def __init__(self):
        self.agents = {}
        self.processes = {}

    def Create(self, agent_type, role, **kwargs):
        agent_id = len(self.agents) + 1
        queue_name = f"agent_{agent_id}_queue"

        if agent_type == AgentType.WEB_CRAWLER:
            agent = WebCrawlerAgent(agent_id, role, **kwargs, queue_name=queue_name)
        elif agent_type == AgentType.OTHER:
            agent = OtherAgent(agent_id, role, queue_name=queue_name)

        self.agents[agent_id] = agent
        return agent

    def Start(self, agent):
        p = multiprocessing.Process(target=agent.Run)
        self.processes[agent.agent_id] = p
        p.start()
        print(f"Agent {agent.agent_id} started as a process")

    def Stop(self, agent):
        # Stopping agents isn't directly supported with RabbitMQ.
        # You would need to implement a mechanism to stop the agent's loop.
        pass

    def GetStatus(self, agent):
        # This would involve consuming messages from the agent's queue.
        pass


def AgentMain():
    webcrawler = manager.Create(AgentType.WEB_CRAWLER, "Crawling", urls_to_crawl=["http://example.com"])
    other_agent = manager.Create(AgentType.OTHER, "Other Task")

    manager.Start(webcrawler)
    manager.Start(other_agent)

    webcrawler.StartMessenger()
    other_agent.StartMessenger()


manager = AgentManager()
AgentMain()