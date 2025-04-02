from Data import DomainMain, Company, Consultant
from Agents import AgentManager, AgentType
import requests
import zmq
from zmq.auth import load_certificate

context = zmq.Context()
client = context.socket(zmq.REQ)
client.connect("tcp://server:5001")


if __name__ == "__main__":
    while True:
        command = input(">> ")
        if command.lower() == "consultant":
            consult = Consultant.Generate()
            print(consult.to_dict)
        if command.lower() == "consult":
            consultant_dummy_data = Consultant.Generate()

            command_data = {
                'command': 'create',
                'params': {
                    'collection_name': 'Consultants',
                    'document_data': consultant_dummy_data.to_dict()
                }
            }

            client.send_json(command_data)
            response = client.recv_json()
        elif command.lower() == "company":
            company_dummy_data = Company.Generate()

            command_data = {
                'command': 'create',
                'params': {
                    'collection_name': 'Company',
                    'document_data': company_dummy_data.to_dict()
                }
            }

            client.send_json(command_data)
            response = client.recv_json()
        elif command.lower() == "agent":
            manager = AgentManager()
        elif command.lower() == "domain":
            DomainMain('C:/Users/Mondus/Documents/Länkar.txt')
        elif command.lower() == "status":
            response = requests.get("http://127.0.0.1:5000/server-status")
            print(response.status_code)
            print(response.text)
        elif command.lower() == "exit":
            break
        else:
            print("Invalid command. Please try again.")