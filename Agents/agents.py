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

class AgentStatus(Enum):
    IDLE = "Idle"
    RUNNING = "Running"
    STOPPED = "Stopped"
    ERROR = "Error"
    CRAWLING = "Crawling"


class AgentType(Enum):
    WEB_CRAWLER = "WebCrawler"


class Agent(Process):
    def __init__(self, agent_id):
        super().__init__()
        self.agent_id = agent_id
        self.running = False
        self.status = AgentStatus.IDLE
        self.context = zmq.Context()
        self.logger = GetLogger(f'agent_{agent_id}', log_to_console=True)
        self.command_socket = None
        self.status_socket = None
    
    def __str__(self):
        return f"Agent ID: {self.agent_id} \nRunning: {self.running} \nStatus: {self.status}"

    def Close(self):  
        if self.command_socket:  
            self.command_socket.close(linger=0)
        if self.status_socket:
            self.status_socket.close(linger=0)
        self.context.term()
        self.logger.info("Agent closed", extra={'agent_id': self.agent_id})

    def send_status(self, message):
        """Send a status message to the manager"""
        if self.status_socket:
            self.status_socket.send_multipart([
                str(self.agent_id).encode(),
                message.encode()
            ])
            self.logger.debug("Status sent", extra={
                'agent_id': self.agent_id,
                'message': message
            })

    def run(self):
        self.running = True
        self.logger.info("Agent starting", extra={'agent_id': self.agent_id})

        # Setup command socket (bind)
        self.command_socket = self.context.socket(zmq.REP) # Reply socket (to recieve commands)
        self.command_socket.bind(f"tcp://*:{self.agent_id + COMMAND_PORT}")
        self.logger.debug("Command socket bound", extra={
            'agent_id': self.agent_id,
            'port': self.agent_id + COMMAND_PORT
        })

        # Setup status socket (connect to manager's PUB)
        self.status_socket = self.context.socket(zmq.PUB) # Publish socket (to give status updates)
        self.status_socket.connect(f"tcp://localhost:{STATUS_PORT}")
        self.logger.debug("Status socket connected", extra={
            'agent_id': self.agent_id,
            'port': STATUS_PORT
        })

        poller = zmq.Poller()
        poller.register(self.command_socket, zmq.POLLIN)

        # Send initial status
        self.send_status(f"Agent {self.agent_id} started")

        while self.running:
            # Poll for commands with timeout (500ms)
            socks = dict(poller.poll(500))

            if self.command_socket in socks:
                try:
                    command = self.command_socket.recv_string(zmq.NOBLOCK)
                    self.logger.debug("Command received", extra={
                        'agent_id': self.agent_id,
                        'command': command
                    })
                    
                    if command == "stop":
                        self.send_status(f"Agent {self.agent_id} stopping")
                        self.command_socket.send_string("Stopping")
                        self.Stop()
                    else:
                        self.send_status(f"Agent {self.agent_id} received unknown command: {command}")
                        self.command_socket.send_string(f"Unknown command: {command}")
                except zmq.Again:
                    # No command received
                    pass
                except Exception as e:
                    self.logger.error("Error processing command", extra={
                        'agent_id': self.agent_id,
                        'error': str(e)
                    })

            # Send periodic status update
            self.send_status(f"Agent {self.agent_id} is running")

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
        self.status_socket.setsockopt(zmq.SUBSCRIBE, b'')  # Subscribe to all messages
        self.status_socket.bind("tcp://*:5600")
        self.logger = GetLogger('agent_manager', log_to_console=True)
        self.logger.info("AgentManager initialized with status socket bound to port 5600")
    
    def is_running(self):
        return self.is_alive()
    
    def run(self):
        # Main manager loop handling status updates and cleanup
        poller = zmq.Poller()
        poller.register(self.status_socket, zmq.POLLIN)
        
        self.logger.info("AgentManager started and listening for messages...")
        
        while True:
            try:
                # Process status messages
                socks = dict(poller.poll(500))  # 500ms timeout
                if self.status_socket in socks:
                    try:
                        agent_id, status = self.status_socket.recv_multipart()
                        agent_id = agent_id.decode()
                        status = status.decode()
                        
                        # Format the message with timestamp and agent info
                        formatted_message = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Agent {agent_id}: {status}"
                        
                        # Log to file
                        self.logger.info(formatted_message)
                        
                        # Print to console with color (if supported)
                        print(f"\033[92m{formatted_message}\033[0m")  # Green color for visibility
                        
                    except Exception as e:
                        error_msg = f"Error processing message: {str(e)}"
                        self.logger.error(error_msg)
                        print(f"\033[91m{error_msg}\033[0m")  # Red color for errors
                
                # Periodic cleanup
                self.CleanupProcesses()
            except Exception as e:
                error_msg = f"Error in AgentManager main loop: {str(e)}"
                self.logger.error(error_msg)
                print(f"\033[91m{error_msg}\033[0m")  # Red color for errors
                time.sleep(1)  # Prevent tight loop in case of errors

    def Create(self, agent_type: AgentType):
        agent_id = len(self.agents) + 1
        if agent_type == AgentType.WEB_CRAWLER:
            from .webcrawler import WebCrawler
            agent = WebCrawler(agent_id)
            self.agents[agent_id] = agent
            return agent
        raise ValueError(f"Unsupported agent type: {agent_type}")

    def Start(self, agent_id: int):
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
        dead = [aid for aid, p in self.processes.items() if not p.is_alive()]
        for aid in dead:
            del self.processes[aid]
            del self.agents[aid]
        if dead:
            print(f"Cleaned {len(dead)} terminated agents")

    def SendCommand(self, agent_id: int, command: str) -> dict:
        """
        Send a command to a specific agent and get its response.
        
        Args:
            agent_id: The ID of the agent to send the command to
            command: The command string to send
            
        Returns:
            dict: Response containing status and message
        """
        if agent_id not in self.processes:
            return {
                'status': 'error',
                'message': f'Agent {agent_id} not running'
            }
            
        if not self.processes[agent_id].is_alive():
            return {
                'status': 'error',
                'message': f'Agent {agent_id} is not alive'
            }
            
        try:
            # Create a new context and socket for this command
            ctx = zmq.Context()
            sock = ctx.socket(zmq.REQ)
            sock.setsockopt(zmq.RCVTIMEO, 5000)  # 5 second timeout
            sock.connect(f"tcp://localhost:{COMMAND_PORT + agent_id}")
            
            # Send command
            sock.send_string(command)
            
            # Get response
            response = sock.recv_string()
            
            # Cleanup
            sock.close()
            ctx.term()
            
            return {
                'status': 'success',
                'message': response
            }
            
        except zmq.error.Again:
            return {
                'status': 'error',
                'message': f'Timeout waiting for response from agent {agent_id}'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Error sending command to agent {agent_id}: {str(e)}'
            }
