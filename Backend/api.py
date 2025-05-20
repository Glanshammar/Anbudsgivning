import os
import sys
from datetime import datetime

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

from flask import Flask, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from google.cloud.firestore_v1.base_query import FieldFilter
import zmq
import bcrypt
import re
import threading
from functools import wraps
from httpcodes import *
from Data import Consultant, CompanyProfile, Expertise, TenderDocument, TenderPortal
from Agents import AgentType, AgentManager
from Backend.db_app import *
from dotenv import load_dotenv
from flask_cors import CORS


load_dotenv()
app = CreateApp()
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect("tcp://localhost:5001")
# Add lock to synchronize requests to the server
zmq_lock = threading.Lock()

# Collection name constants
COMPANY_DATA = 'CompanyData'
CONSULTANTS = 'Consultants'
# ------------------------------------------------------------------------------------------------------------- #
# --------------------------------------------- Request Functions --------------------------------------------- #
def ServerRequest(command: str = None, params: dict = None):
    try:
        # Build the command object
        command_obj = {
            'command': command,
            'params': params if params is not None else {}
        }
        
        # Use lock to prevent race condition
        with zmq_lock:
            # Send the command to the server
            socket.send_json(command_obj)
            backend_response = socket.recv_json()
        
        return jsonify(backend_response["data"]), backend_response.get("status_code", 200)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

def DatabaseRequest(collection_name: str = None, data: dict = None, doc_id: str = None):
    try:
        method_to_command = {
            'POST': 'create',
            'GET': 'read',
            'PUT': 'update',
            'DELETE': 'delete'
        }
        command = method_to_command.get(request.method)
        params = {
            'collection_name': collection_name,
            'document_data': data,
            'document_id': doc_id
        }
        return ServerRequest(command, params)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def ValidateModel(model_class):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if request.method == 'GET':
                return func(*args, **kwargs)
            data = request.get_json()
            try:
                model_instance = model_class(**data)
                request.validated_data = model_instance.to_dict()
            except TypeError as e:
                return http_400(f"Validation Error: {str(e)}")
            except ValueError as e:
                return http_422(f"Data Error: {str(e)}")
            return func(*args, **kwargs)
        return wrapper
    return decorator
# ------------------------------------------------------------------------------------------------------------- #
# ---------------------------------------------- Route Functions ---------------------------------------------- #
@app.route('/api/verify_user', methods=['GET'])
@jwt_required()
def VerifyUser():
    current_user = get_jwt_identity()
    return jsonify(logged_in_as=current_user), 200


@app.route('/api/server', methods=['GET'])
def ServerStatus():
    return ServerRequest('status')


@app.route('/api/status', methods=['GET'])
def ApiStatus():
    return http_200('API is Online!')


@app.route('/api/register', methods=['POST'])
def Register():
    def ValidatePassword(password):
        # Minimum 8 characters, at least one uppercase, one lowercase, one digit, one special character
        pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]{}<>.,;:|~`_+=-]).{8,}$'
        return bool(re.match(pattern, password))
    
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    # Basic validation
    if not username or not email or not password:
        return http_400("Username, email, and password are required.")
    
    if not ValidatePassword(password):
        return http_400("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.")

    # Check if user already exists
    users_ref = current_app.db.collection('Users')
    existing_users = list(users_ref.where(filter=FieldFilter('username', '==', username)).limit(1).stream())
    if existing_users:
        return http_409("Username already exists.")

    # Hash the password
    hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    # Store user in Firestore
    user_data = {
        "username": username,
        "email": email,
        "password": hashed_pw
    }
    users_ref.add(user_data)
    return http_201("User registered successfully.")


@app.route('/api/login', methods=['POST'])
def Login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return http_401("Username and password required.")

    # Query Firestore for user document
    users_ref = current_app.db.collection('Users')
    user_docs = users_ref.where(filter=FieldFilter('username', '==', username)).limit(1).stream()
    user_doc = next(user_docs, None)

    if not user_doc:
        return http_401("Invalid credentials.")

    user_data = user_doc.to_dict()
    stored_hash = user_data.get("password")

    # Verify password using bcrypt
    if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
        return http_401("Invalid credentials.")

    access_token = create_access_token(identity=user_doc.id, fresh=True)
    refresh_token = create_refresh_token(identity=user_doc.id)
    return jsonify(
        access_token=access_token,
        refresh_token=refresh_token
    ), 200


@app.route('/api/refresh', methods=['POST'])
@jwt_required(refresh=True)
def Refresh():
    current_user = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user, fresh=False)
    return jsonify(access_token=new_access_token), 200


@app.route('/api/consultants', methods=['POST', 'GET', 'PUT'])
@ValidateModel(Consultant)
def Consultants():
    doc_id = request.args.get('id')
    
    if request.method == 'PUT':
        return DatabaseRequest(
            collection_name=CONSULTANTS,
            data=request.get_json(),
            doc_id=doc_id
        )
    elif request.method == 'POST':
        return DatabaseRequest(
            collection_name=CONSULTANTS,
            data=request.get_json(),
            doc_id=doc_id
        )
    elif request.method == 'GET':
        return DatabaseRequest(
            collection_name=CONSULTANTS,
            data=None,
            doc_id=doc_id
        )


@app.route('/api/calendar', methods=['POST', 'GET'])
def BusinessCalendar():
    if request.method == 'POST':
        data = request.get_json()
        availability = data.get("availability")

        if not isinstance(availability, dict):
            return http_400("Invalid input: 'availability' must be a dictionary.")

        return DatabaseRequest(collection_name=COMPANY_DATA,
                              data=availability,
                              doc_id='ConsultantCalendar')
    
    if request.method == 'GET':
        return DatabaseRequest(collection_name=COMPANY_DATA,
                              data=None,
                              doc_id='ConsultantCalendar')


@app.route('/api/tenders', methods=['GET', 'POST', 'PUT'])
def TendersRequest():
    # JSON format
    """
    {
        "tenders": [
            {
                "branch": "Construction",
                "deadline": "2025-06-09",
                "end_date": "2025-09-25",
                "project_name": "Super Duper Bridge Project",
                "start_date": "2025-06-19"
            },
            {
                "branch": "IT",
                "deadline": "2025-06-09",
                "end_date": "2025-09-25",
                "project_name": "Super Duper IT Project",
                "start_date": "2025-06-19"
            }
        ]
    }
    """
    if request.method == 'GET':
        return DatabaseRequest(collection_name=COMPANY_DATA,
                            data=None,
                            doc_id='Tenders')
                            
    if request.method in ['POST', 'PUT']:
        tender_data = request.get_json().get('tenders', [])
        validated_tenders = []
        
        for tender in tender_data:
            # Convert date strings to datetime objects
            try:
                # Parse date strings to datetime objects
                for date_field in ['deadline', 'start_date', 'end_date']:
                    if date_field in tender and isinstance(tender[date_field], str):
                        tender[date_field] = datetime.datetime.strptime(tender[date_field], "%Y-%m-%d")
                
                tender_obj = TenderDocument(**tender)
                validated_tenders.append(tender_obj.to_dict())
            except (ValueError, TypeError) as e:
                return jsonify({"error": f"Invalid tender data: {str(e)}"}), 400
        
        if request.method == 'POST':
            return DatabaseRequest(collection_name=COMPANY_DATA,
                                data={"tenders": validated_tenders},
                                doc_id='Tenders')
        
        if request.method == 'PUT':
            existing_data = current_app.db.collection(COMPANY_DATA).document('Tenders').get()
            existing_tenders = existing_data.to_dict().get('tenders', []) if existing_data.exists else []
            
            # Combine existing and new tenders, avoiding duplicates based on project_name
            existing_projects = {tender['project_name'] for tender in existing_tenders}
            combined_tenders = existing_tenders + [
                tender for tender in validated_tenders 
                if tender['project_name'] not in existing_projects
            ]
            return DatabaseRequest(collection_name=COMPANY_DATA,
                                data={"tenders": combined_tenders},
                                doc_id='Tenders')


@app.route('/api/expertise', methods=['POST', 'GET', 'PUT'])
def ExpertiseRequest():
    if request.method == 'POST':
        return DatabaseRequest(collection_name=COMPANY_DATA,
                              data=request.get_json(),
                              doc_id='Expertise')
    elif request.method == 'GET':
        return DatabaseRequest(collection_name=COMPANY_DATA,
                              data=None,
                              doc_id='Expertise')
    elif request.method == 'PUT':
        return DatabaseRequest(collection_name=COMPANY_DATA,
                              data=request.get_json(),
                              doc_id='Expertise')


@app.route('/api/tender_portals', methods=['POST', 'GET', 'PUT'])
def TenderPortals():
    # JSON format
    """
    {
        "portals": [
            {
            "url": "https://tenderportal1.example.com",
            "username": "username1",
            "password": "password1"
            },
            {
            "url": "https://tenderportal2.example.com",
            "username": "username2",
            "password": "password2"
            }
        ]
    }
    """
    portals_data = request.get_json().get('portals', [])
    validated_portals = []
    for portal in portals_data:
        portal_obj = TenderPortal(**portal)
        validated_portals.append(portal_obj.to_dict())

    if request.method == 'POST':
        return DatabaseRequest(collection_name=COMPANY_DATA,
                             data={"portals": validated_portals},
                             doc_id='TenderPortals')
    
    if request.method == 'PUT':
        # Get existing portals
        existing_data = current_app.db.collection(COMPANY_DATA).document('TenderPortals').get()
        existing_portals = existing_data.to_dict().get('portals', []) if existing_data.exists else []
        
        # Combine existing and new portals, avoiding duplicates based on URL
        existing_urls = {portal['url'] for portal in existing_portals}
        combined_portals = existing_portals + [
            portal for portal in validated_portals 
            if portal['url'] not in existing_urls
        ]
        
        return DatabaseRequest(collection_name=COMPANY_DATA,
                             data={"portals": combined_portals},
                             doc_id='TenderPortals')
    
    if request.method == 'GET':
        return DatabaseRequest(collection_name=COMPANY_DATA,
                             data=None,
                             doc_id='TenderPortals')


@app.route('/api/company_profile', methods=['POST', 'GET'])
@ValidateModel(CompanyProfile)
def CompanyProfiles():
    # JSON format
    """
    {
        "name": "Example Corp",
        "country": "United States",
        "industry": "Construction"
    }
    """
    if request.method == 'POST':
        return DatabaseRequest(collection_name=COMPANY_DATA,
                             data=request.get_json(),
                             doc_id='CompanyProfile')
    
    if request.method == 'GET':
        return DatabaseRequest(collection_name=COMPANY_DATA,
                             data=None,
                             doc_id='CompanyProfile')
# ------------------------------------------------------------------------------------------------------------- #
# --------------------------------------------- Agent Management ---------------------------------------------- #
@app.route('/api/agent', methods=['POST', 'GET', 'DELETE'])
def AgentManagement():
    try:
        if request.method == 'POST':
            # JSON example
            """
            {
                agent_type: "WebCrawler"
            }
            """
            return ServerRequest(command='start_agent', params=request.get_json())

        elif request.method == 'GET':
            return ServerRequest(command='get_agents')

        elif request.method == 'DELETE':
            agent_id = request.args.get('agent_id')
            if not agent_id:
                return http_400("Missing agent_id parameter")
            
            command = {
                'command': 'stop_agent',
                'params': {'agent_id': int(agent_id)}
            }
            socket.send_json(command)
            response = socket.recv_json()
            return jsonify(response['data']), response['status_code']
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/agent/command', methods=['POST'])
def AgentCommand():
        return ServerRequest(command='agent_command', params=request.get_json())


app.run(host='0.0.0.0', port=5000, threaded=True)
