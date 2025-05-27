import os
import sys
import time
import asyncio
import zmq.asyncio
from contextlib import asynccontextmanager

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
from fido2.server import Fido2Server, PublicKeyCredentialRpEntity
from fido2.webauthn import PublicKeyCredentialUserEntity
from fido2.utils import websafe_encode, websafe_decode
from Data.models import Fido2Credential
import base64


load_dotenv()
cred_file = os.path.join(root_dir, 'credentials.json')
master_agent = None
db = None  # Initialize db as global variable


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
    global db
    collections = [collection.id for collection in db.collections()]
    if collection_name in collections:
        return OpStatus.SUCCESS
    return OpStatus.DOCUMENT_NOT_FOUND


def CreateDocument(params):
    global db
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
    global db
    collection_name = params.get('collection_name')
    document_id = params.get('document_id')
    if not document_id or document_id.strip() == "": # Multiple docs
        try:
            collection_ref = db.collection(collection_name)
            docs = collection_ref.stream()
            return {doc.id: doc.to_dict() for doc in docs}, 200
        except Exception as e:
            return {"error": f"Error reading documents: {str(e)}"}, 500
    try:
        collection_ref = db.collection(collection_name.strip())
        doc_ref = collection_ref.document(document_id.strip())
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict(), 200
        else:
            return {"error": f"Document '{document_id}' does not exist"}, 404
    except Exception as e:
        return {"error": f"Error reading document: {str(e)}"}, 500


def GetDocuments(collection_name):
    global db
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
    global db
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
        return master_agent.SendAgentCommand(agent_id, command)
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Error sending command: {str(e)}'
        }, 500


async def ProcessCommand(command, params):
    """Process commands asynchronously"""
    func = operations.get(command.lower())
    if func:
        # If the function is async, await it
        if asyncio.iscoroutinefunction(func):
            return await func(params)
        # Otherwise, run it in a thread pool to avoid blocking
        return await asyncio.to_thread(func, params)
    else:
        return f'Error: Unknown command "{command}".'


# --- Firestore FIDO2 Credential Helpers ---
def get_fido2_credentials(user_id: str) -> list[Fido2Credential]:
    creds_ref = db.collection(USERS).document(user_id).collection('FIDO2Credentials')
    docs = creds_ref.stream()
    return [Fido2Credential(**doc.to_dict()) for doc in docs]

def add_fido2_credential(user_id: str, credential: dict) -> None:
    creds_ref = db.collection(USERS).document(user_id).collection('FIDO2Credentials')
    cred_id = credential['credential_id']
    creds_ref.document(cred_id).set(credential)

def update_fido2_credential(user_id: str, credential_id: str, updates: dict) -> None:
    creds_ref = db.collection(USERS).document(user_id).collection('FIDO2Credentials')
    creds_ref.document(credential_id).update(updates)

# --- FIDO2 Command Handlers ---
def Fido2RegisterBegin(params: dict):
    username = params.get('username')
    display_name = params.get('displayName', username)
    if not username:
        return {'error': 'Username required'}, 400
    users_ref = db.collection(USERS)
    user_docs = list(users_ref.where('username', '==', username).limit(1).stream())
    if not user_docs:
        return {'error': 'User not found'}, 404
    user_doc = user_docs[0]
    user_id = user_doc.id
    user_entity = PublicKeyCredentialUserEntity(
        id=user_id.encode(),
        name=username,
        display_name=display_name
    )
    exclude_creds = [
        {'id': base64.urlsafe_b64decode(cred.credential_id), 'type': 'public-key'}
        for cred in get_fido2_credentials(user_id)
    ]
    registration_data, state = fido2_server.register_begin(
        user_entity,
        exclude_credentials=exclude_creds,
        user_verification='preferred',
        authenticator_attachment=None
    )
    # Return state to API for session storage
    return {'registration_data': registration_data, 'state': state, 'user_id': user_id}, 200

def Fido2RegisterComplete(params: dict):
    attestation = params.get('attestation')
    user_id = params.get('user_id')
    state = params.get('state')
    if not attestation or not user_id or not state:
        return {'error': 'Attestation, user_id, and state required'}, 400
    try:
        auth_data = fido2_server.register_complete(state, attestation)
        cred = Fido2Credential(
            credential_id=websafe_encode(auth_data.credential_data.credential_id).decode(),
            public_key=websafe_encode(auth_data.credential_data.public_key).decode(),
            sign_count=auth_data.sign_count,
            transports=attestation.get('transports'),
            user_handle=websafe_encode(auth_data.credential_data.user_handle).decode() if auth_data.credential_data.user_handle else None,
            rp_id=RP_ID
        )
        add_fido2_credential(user_id, cred.to_dict())
        return {'status': 'ok'}, 200
    except Exception as e:
        return {'error': f'FIDO2 registration failed: {e}'}, 400

def Fido2AuthenticateBegin(params: dict):
    username = params.get('username')
    if not username:
        return {'error': 'Username required'}, 400
    users_ref = db.collection(USERS)
    user_docs = list(users_ref.where('username', '==', username).limit(1).stream())
    if not user_docs:
        return {'error': 'User not found'}, 404
    user_doc = user_docs[0]
    user_id = user_doc.id
    creds = get_fido2_credentials(user_id)
    if not creds:
        return {'error': 'No FIDO2 credentials registered'}, 404
    allow_credentials = [
        {'id': base64.urlsafe_b64decode(cred.credential_id), 'type': 'public-key'}
        for cred in creds
    ]
    auth_data, state = fido2_server.authenticate_begin(
        credentials=[{
            'id': base64.urlsafe_b64decode(cred.credential_id),
            'public_key': base64.urlsafe_b64decode(cred.public_key),
            'sign_count': cred.sign_count
        } for cred in creds],
        user_verification='preferred',
        allow_credentials=allow_credentials
    )
    return {'auth_data': auth_data, 'state': state, 'user_id': user_id}, 200

def Fido2AuthenticateComplete(params: dict):
    assertion = params.get('assertion')
    user_id = params.get('user_id')
    state = params.get('state')
    if not assertion or not user_id or not state:
        return {'error': 'Assertion, user_id, and state required'}, 400
    creds = get_fido2_credentials(user_id)
    cred_map = {base64.urlsafe_b64decode(cred.credential_id): cred for cred in creds}
    try:
        auth_data = fido2_server.authenticate_complete(
            state,
            cred_map,
            assertion
        )
        update_fido2_credential(user_id, websafe_encode(auth_data.credential_id).decode(), {'sign_count': auth_data.new_sign_count})
        return {'status': 'ok'}, 200
    except Exception as e:
        return {'error': f'FIDO2 authentication failed: {e}'}, 401


operations = {
    'create': CreateDocument,
    'read': ReadDocument,
    'update': UpdateDocument,
    'delete': DeleteDocument,
    'status': lambda params: 'Server is online!',
    'start_agent': StartAgent,
    'get_agents': GetAgents,
    'stop_agent': StopAgent,
    'agent_command': AgentCommand,
    'fido2_register_begin': Fido2RegisterBegin,
    'fido2_register_complete': Fido2RegisterComplete,
    'fido2_authenticate_begin': Fido2AuthenticateBegin,
    'fido2_authenticate_complete': Fido2AuthenticateComplete,
}


async def Main():
    global db, fido2_server, RP_ID, RP_NAME, ORIGIN, USERS
    
    if not os.path.exists(cred_file):
        print(f'Please place the {cred_file} in the same directory as this script.')
        cred_path = input('Enter the full path to the credentials file: ').strip()

        if os.path.exists(cred_path):
            shutil.copy(cred_path, cred_file)
            print(f'✅ Credentials file copied to {cred_file}')
        else:
            print(f'⚠️ File not found at {cred_path}. Please check the path and try again.')
            return
    else:
        print('✅ Credentials found.')

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_file)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    context = zmq.asyncio.Context()
    
    server = context.socket(zmq.REP)
    server.bind('tcp://0.0.0.0:5001')
    print('ZeroMQ server is running on port 5001...')

    RP_ID = os.environ.get('FIDO2_RP_ID', 'localhost')
    RP_NAME = os.environ.get('FIDO2_RP_NAME', 'Anbudsgivning')
    ORIGIN = os.environ.get('FIDO2_ORIGIN', 'https://localhost:3000')
    fido2_server = Fido2Server(PublicKeyCredentialRpEntity(id=RP_ID, name=RP_NAME))
    USERS = 'Users'

    try:
        while True:
            try:
                message = await server.recv_json()
                command = message.get('command')
                params = message.get('params', {})

                if command == 'exit':
                    break

                response = await ProcessCommand(command, params)
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
                await server.send_json(response_data)
            except (json.JSONDecodeError, KeyError) as e:
                await server.send_json({'error': f'Invalid request: {str(e)}'})
            except Exception as e:
                await server.send_json({'error': f'Server error: {str(e)}'})
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        server.close()
        context.term()


if __name__ == '__main__':
    asyncio.run(Main())