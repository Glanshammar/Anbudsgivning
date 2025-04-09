import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)


import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from google.cloud.firestore_v1.document import DocumentReference
from zmq.auth import Authenticator, create_certificates
from enum import Enum, IntEnum
from Agents import *
from Matching import IsTenderMatch
from multiprocessing import Process
import shutil
import zmq
import json


cred_file = os.path.join(root_dir, 'creds.json')
master_agent = None
db = None

KEYS_DIR = os.path.join(root_dir, 'keys')
SERVER_SECRET_KEY = os.path.join(KEYS_DIR, "server.key_secret")
CLIENT_KEY_DIR = os.path.join(KEYS_DIR, "clients")

os.makedirs(KEYS_DIR, exist_ok=True)
os.makedirs(CLIENT_KEY_DIR, exist_ok=True)

if not os.path.exists(SERVER_SECRET_KEY):
    print("🔑 Generating server certificates...")
    create_certificates(KEYS_DIR, "server")
    print(f"✅ Server keys created in {KEYS_DIR}")


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
        print('Starting master agent...')
        master_agent = AgentManager()
        return master_agent.__str__()
    elif isinstance(master_agent, AgentManager):
        return master_agent.__str__()
    else:
        return "Something went wrong. Couldn't start or recognize Master Agent."


def GetCollection(collection_name):
    collections = [collection.id for collection in db.collections()]
    if collection_name in collections:
        return OpStatus.SUCCESS
    return OpStatus.DOCUMENT_NOT_FOUND


def CreateDocument(collection_name, document_data, document_name=None):
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
            document_name = str(document_count + 1)

        new_doc_ref = collection_ref.document(document_name)
        new_doc_ref.set(document_data)

        return f"Success: Document added successfully with name: {document_name}"
    except Exception as e:
        return f"Error: Error adding document: {str(e)}"


def ReadDocument(collection_name: str, document_id: str = None):
    if not document_id or document_id.strip() == "":
        return "Error: Missing document ID"
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
            return "Error: No documents found in the collection."
        documents = [str(doc.to_dict()) for doc in docs]
        return "\n".join(documents)
    except Exception as e:
        return f"Error: Error getting documents: {str(e)}"


def UpdateDocument(collection_name, document_id, document_data, merge=True, add_section=False, section_key=None, section_data=None):
    if not collection_name or not document_id:
        return "Error: Collection name and document ID cannot be empty."

    if document_data is None and not add_section:
        return "Error: No data provided for update."

    try:
        # Fetch the collection and document reference
        collection_ref = db.collection(collection_name)
        doc_ref = collection_ref.document(document_id)

        # Check if the document exists
        if not doc_ref.get().exists:
            return f"Error: Document '{document_id}' does not exist"

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
        return f"Success: Document '{document_id}' updated successfully"
    except Exception as e:
        return f"Error: Error updating document: {str(e)}"


def DeleteDocument(document):
    try:
        document.delete()
        return "Success: Document deleted successfully."
    except Exception as e:
        return f"Error: Error deleting document: {str(e)}"


def CreateField(document, params):
    name = params['name'].strip()
    value = params['value'].strip()
    if not name:
        return "Error: Field name cannot be empty."
    try:
        document.update({name: value})
        return f"Success: Added field '{name}' with value '{value}'."
    except Exception as e:
        return f"Error: Error adding field: {str(e)}"


def ReadField(document, field):
    doc = document.get()
    if doc.exists:
        data = doc.to_dict()
        if field in data:
            return str({field: data[field]})
        else:
            return f"Error: Field '{field}' not found in document."
    else:
        return "Error: Document does not exist!"


def UpdateField(document, fieldID: int, value):
    doc = document.get()
    if not doc.exists:
        return "Error: Document does not exist!"
    fields = doc.to_dict()
    if not fields or fieldID < 1 or fieldID > len(fields):
        return "Error: Invalid field ID."
    try:
        field_name = list(fields.keys())[fieldID - 1]
        document.update({field_name: value})
        return f"Success: Field '{field_name}' updated successfully."
    except Exception as e:
        return f"Error: Error updating field: {str(e)}"


def DeleteField(document, fieldID: int):
    doc = document.get()
    if not doc.exists:
        return ('Document does not exist.', 404)
    fields = doc.to_dict()
    if not fields or fieldID < 1 or fieldID > len(fields):
        return ('Invalid field ID.', 400)
    try:
        field_name = list(fields.keys())[fieldID - 1]
        document.update({field_name: firestore.DELETE_FIELD})
        return f"Success: Field '{field_name}' deleted successfully."
    except Exception as e:
        return f"Error: Error deleting field: {str(e)}"


def ProcessCommand(command, params):
    match command.lower():
        case 'create':
            collection_name = params.get('collection_name')
            document_data = params.get('document_data')
            document_id = params.get('document_id')
            if not isinstance(document_data, dict):
                return ('document_data must be a dictionary', 400)
            return CreateDocument(collection_name, document_data, document_id)
        case 'read':
            collection_name = params.get('collection_name')
            document_id = params.get('document_id')
            
            if document_id:  # Single document read
                try:
                    document = ReadDocument(collection_name, document_id)
                    return document
                except ValueError as e:
                    return f"Exception:  {str(e)}"
            else:  # Full collection read
                try:
                    collection_ref = db.collection(collection_name)
                    docs = collection_ref.stream()
                    return {doc.id: doc.to_dict() for doc in docs}
                except Exception as e:
                    return f"Exception:  {str(e)}"
        case 'update':
            collection_name = params.get('collection_name')
            document_id = params.get('document_id')
            document_data = params.get('document_data', {})
            add_section = params.get('add_section', False)
            section_key = params.get('section_key')
            section_data = params.get('section_data', {})

            if not collection_name or not document_id:
                return ("Error: Collection name and document ID required", 400)

            result = UpdateDocument(
                collection_name=collection_name,
                document_id=document_id,
                document_data=document_data,
                add_section=add_section,
                section_key=section_key,
                section_data=section_data
            )
            return (result, 200) if "Success" in result else (result, 400)
        case 'delete':
            collection_name = params.get('collection_name')
            document_id = params.get('document_id')
            document = ReadDocument(collection_name, document_id)
            if isinstance(document, DocumentReference):
                return DeleteDocument(document)
            else:
                return ('Document not found', 404)
        case 'status':
            return 'Server is online!'
        case 'agent':
            return MasterAgent()
        case _:
            return 'Unknown command.'


if __name__ == '__main__':
    if not os.path.exists(cred_file):
        print(f"Please place the '{cred_file}' in the same directory as this script.")
        cred_path = input("Enter the full path to the credentials file: ").strip()

        if os.path.exists(cred_path):
            shutil.copy(cred_path, cred_file)
            print(f"✅ Credentials file copied to {cred_file}")
        else:
            print(f"⚠️ File not found at {cred_path}. Please check the path and try again.")
            exit(1)
    else:
        print("✅ Credentials found.")

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_file)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    context = zmq.Context()
    
    # Setup CURVE authentication
    '''
    auth = Authenticator(context)
    auth.configure_curve(domain='*', location=CLIENT_KEY_DIR)
    auth.start()
    '''
    
    # Create ROUTER socket
    '''
    server = context.socket(zmq.ROUTER)
    server.curve_server = True
    server_secret, server_public = zmq.auth.load_certificate(SERVER_SECRET_KEY)
    server.curve_secretkey = server_secret
    server.curve_publickey = server_public
    '''
    
    server = context.socket(zmq.REP)
    server.bind("tcp://0.0.0.0:5001")
    print("ZeroMQ server is running on port 5001...")
    
    # Bind to port with encryption
    '''
    server.bind("tcp://0.0.0.0:5001")
    print("🔒 Secure ZeroMQ server is running on port 5001...")
    
    import atexit
    @atexit.register
    def Cleanup():
        auth.stop()
        server.close()
        context.term()
    '''


    while True:
        try:
            message = server.recv_json()
            command = message.get('command')
            params = message.get('params', {})

            if command == 'exit':
                break

            raw_response = ProcessCommand(command, params)
            if isinstance(raw_response, tuple) and len(raw_response) == 2:
                response_data = {
                    'data': raw_response[0],
                    'status_code': raw_response[1]
                }
            else:
                response_data = {
                    'data': raw_response,
                    'status_code': 200
                }
            server.send_json(response_data)
        except (json.JSONDecodeError, KeyError) as e:
            server.send_json({"error": f"Invalid request: {str(e)}"})

    '''
    while True:
        try:
            client_id, *msg_parts = server.recv_multipart()
            message = json.loads(msg_parts[-1])
            
            command = message.get('command')
            params = message.get('params', {})

            if command == 'exit':
                break

            response = ProcessCommand(command, params)
            
            server.send_multipart([client_id, b'', json.dumps(response).encode()])
            
        except Exception as e:
            Cleanup()
            server.send_multipart([client_id, b'', json.dumps({"error": str(e)}).encode()])
            raise
    
    Cleanup()
    '''