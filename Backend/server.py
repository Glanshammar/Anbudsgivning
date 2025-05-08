import os
import sys
import time

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

import firebase_admin
from firebase_admin import credentials, firestore
from zmq.auth import create_certificates
from enum import IntEnum, Enum
from Agents import *
import shutil
import zmq
import json
import jwt
from dotenv import load_dotenv


load_dotenv()
cred_file = os.path.join(root_dir, 'credentials.json')
master_agent = None


class OpStatus(IntEnum):
    SUCCESS = 0
    INVALID_FIELD = 1
    DOCUMENT_NOT_FOUND = 2
    EMPTY_DOCUMENT = 3
    OPERATION_CANCELLED = 4
    INVALID_INPUT = 5


def MasterAgent():
    global master_agent
    if master_agent is None:
        master_agent = AgentManager()
        master_agent.start()
    return master_agent


def GetCollection(collection_name):
    collections = [collection.id for collection in db.collections()]
    if collection_name in collections:
        return OpStatus.SUCCESS
    return OpStatus.DOCUMENT_NOT_FOUND


def CreateDocument(params):
    collection_name = params.get('collection_name')
    document_data = params.get('document_data')
    document_name = params.get('document_id')
    if not isinstance(document_data, dict):
        return ('document_data must be a dictionary', 400)
    if not collection_name:
        return OpStatus.DOCUMENT_NOT_FOUND
    if not isinstance(document_data, dict):
        return "Error: Document data must be a dictionary."

    try:
        collection_ref = db.collection(collection_name)

        count_query = collection_ref
        count_snapshot = count_query.get()
        document_count = len(count_snapshot)

        if not document_name:
            document_name = str(document_count)

        new_doc_ref = collection_ref.document(document_name)
        new_doc_ref.set(document_data)

        return f"Success: Document added successfully with name: {document_name}"
    except Exception as e:
        return f"Error: Error adding document: {str(e)}"


def ReadDocument(params):
    collection_name = params.get('collection_name')
    document_id = params.get('document_id')
    if not document_id or document_id.strip() == "": # Multiple docs
        collection_ref = db.collection(collection_name)
        docs = collection_ref.stream()
        return {doc.id: doc.to_dict() for doc in docs}
    try:
        collection_ref = db.collection(collection_name.strip())
        doc_ref = collection_ref.document(document_id.strip())
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        else:
            return f"Error: Document '{document_id}' does not exist"
    except Exception as e:
        return f"Error: Error reading document: {str(e)}"


def GetDocuments(collection_name):
    try:
        collection_ref = db.collection(collection_name)
        docs = list(collection_ref.stream())
        if not docs:
            return 'Error: No documents found in the collection.'
        documents = [str(doc.to_dict()) for doc in docs]
        return "\n".join(documents)
    except Exception as e:
        return f'Error: Error getting documents: {str(e)}'


def UpdateDocument(params):
    collection_name = params.get('collection_name')
    document_id = params.get('document_id')
    document_data = params.get('document_data')
    merge = params.get('merge', True)
    add_section = params.get('add_section', False)
    section_key = params.get('section_key', None)
    section_data = params.get('section_data', None)
    
    if not collection_name or not document_id:
        return 'Error: Collection name and document ID cannot be empty.'

    if document_data is None and not add_section:
        return 'Error: No data provided for update.'

    try:
        # Fetch the collection and document reference
        collection_ref = db.collection(collection_name)
        doc_ref = collection_ref.document(document_id)

        # Check if the document exists
        if not doc_ref.get().exists:
            return f'Error: Document "{document_id}" does not exist'

        # If add_section is True, add or update the specified section
        if add_section and section_key and isinstance(section_data, dict):
            existing_data = doc_ref.get().to_dict() or {}
            nested_data = existing_data.get(section_key, {})
            if isinstance(nested_data, dict):
                nested_data.update(section_data)
            else:
                nested_data = section_data
            document_data = {section_key: nested_data}

        # Update the document with merged data
        doc_ref.set(document_data, merge=merge)
        return f'Success: Document "{document_id}" updated successfully'
    except Exception as e:
        return f'Error: Error updating document: {str(e)}'


def DeleteDocument(document):
    try:
        document.delete()
        return 'Success: Document deleted successfully.'
    except Exception as e:
        return f'Error: Error deleting document: {str(e)}'


def StartAgent(params):
    agent_type_str = params.get('agent_type')
    try:
        manager = MasterAgent()
        agent_type = None
        for member in AgentType:
            if member.value.lower() == agent_type_str.lower():
                agent_type = member
                break

        if agent_type is None:
            return f"Invalid agent type: {agent_type_str}", 400

        agent = manager.Create(agent_type=agent_type)
        manager.Start(agent.agent_id)
        
        # Wait a short moment for the process to start and get its PID
        time.sleep(0.1)
        
        process = manager.processes.get(agent.agent_id)
        return {
            'agent_id': agent.agent_id,
            'type': agent_type_str,
            'status': manager.agents[agent.agent_id]['status'],
            'port': COMMAND_PORT + agent.agent_id,
            'pid': process.pid if process else None,
            'alive': process.is_alive() if process else False
        }, 201
    except Exception as e:
        return f"Agent creation failed: {str(e)}", 500


def GetAgents(params):
    manager = MasterAgent()
    agents = []
    for agent_id, agent_info in manager.agents.items():
        try:
            process = manager.processes.get(agent_id)
            agents.append({
                'id': agent_id,
                'type': agent_info['type'],
                'alive': process.is_alive() if process else False,
                'status': agent_info['status'],
                'port': COMMAND_PORT + agent_id,
                'pid': process.pid if process else None
            })
        except Exception as e:
            # Skip agents that can't be accessed
            continue
    return agents, 200


def StopAgent(params):
    agent_id = params.get('agent_id')
    try:
        manager = MasterAgent()
        manager.Stop(agent_id)
        return f"Agent {agent_id} stopped", 200
    except Exception as e:
        return f"Failed to stop agent: {str(e)}", 500


def AgentCommand(params):
    if not params or 'agent_id' not in params or 'command' not in params:
            return {
                'status': 'error',
                'message': 'Missing required fields: agent_id and command'
            }, 400
    try:
        agent_id = params.get('agent_id')
        command = params.get('command')
        return master_agent.SendCommand(agent_id, command)
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Error sending command: {str(e)}'
        }, 500


def ProcessCommand(command, params):
    func = operations.get(command.lower())
    if func:
        return func(params)
    else:
        return f'Error: Unknown command "{command}".'


operations = {
    'create': CreateDocument,
    'read': ReadDocument,
    'update': UpdateDocument,
    'delete': DeleteDocument,
    'status': lambda params: 'Server is online!',
    'start_agent': StartAgent,
    'get_agents': GetAgents,
    'stop_agent': StopAgent,
    'agent_command': AgentCommand
}


if __name__ == '__main__':
    if not os.path.exists(cred_file):
        print(f'Please place the {cred_file} in the same directory as this script.')
        cred_path = input('Enter the full path to the credentials file: ').strip()

        if os.path.exists(cred_path):
            shutil.copy(cred_path, cred_file)
            print(f'✅ Credentials file copied to {cred_file}')
        else:
            print(f'⚠️ File not found at {cred_path}. Please check the path and try again.')
            exit(1)
    else:
        print('✅ Credentials found.')

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_file)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    context = zmq.Context()
    
    server = context.socket(zmq.REP)
    server.bind('tcp://0.0.0.0:5001')
    print('ZeroMQ server is running on port 5001...')

    while True:
        try:
            message = server.recv_json()
            command = message.get('command')
            params = message.get('params', {})

            if command == 'exit':
                break

            response = ProcessCommand(command, params)
            if isinstance(response, tuple) and len(response) == 2:
                response_data = {
                    'data': response[0],
                    'status_code': response[1]
                }
            else:
                response_data = {
                    'data': response,
                    'status_code': 200
                }
            server.send_json(response_data)
        except (json.JSONDecodeError, KeyError) as e:
            server.send_json({'error': f'Invalid request: {str(e)}'})