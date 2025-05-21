import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

from flask import Flask, request, jsonify, current_app, Blueprint
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
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
from Logger.logger import LoggerManager
from datetime import datetime
import logging
from typing import Tuple, Dict, Any


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
USERS = 'Users'
TENDERS = 'Tenders'

logger = LoggerManager.get_logger(
    name='api',
    log_to_console=True,
    level=logging.INFO
)

token_blacklist = set()
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
        logger.debug(f"Sending server request: {command}", extra={'command': command, 'params': params})

        
        logger.debug(f"Received server response: {backend_response}", extra={'response': backend_response})
        
        return jsonify(backend_response["data"]), backend_response.get("status_code", 200)
    except Exception as e:
        logger.error(f"Server request failed: {str(e)}", extra={'error': str(e), 'command': command})
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

def ValidatePassword(password: str) -> bool:
    # Minimum 8 characters, at least one uppercase, one lowercase, one digit, one special character
    pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]{}<>.,;:|~`_+=-]).{8,}$'
    return bool(re.match(pattern, password))
# ------------------------------------------------------------------------------------------------------------- #
# ---------------------------------------------- Route Functions ---------------------------------------------- #


@app.route('/api/status/server', methods=['GET'])
@jwt_required()
def ServerStatus():
    return ServerRequest('status')


@app.route('/api/status/api', methods=['GET'])
@jwt_required()
def ApiStatus():
    return http_200('API is Online!')


@app.route('/api/users/register', methods=['POST'])
def Register():
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
    users_ref = current_app.db.collection(USERS)
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


@app.route('/api/users/login', methods=['POST'])
def Login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return http_401("Username and password required.")

    # Query Firestore for user document
    users_ref = current_app.db.collection(USERS)
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


@app.route('/api/users/refresh-token', methods=['POST'])
@jwt_required(refresh=True)
def RefreshToken() -> Tuple[Dict[str, Any], int]:
    """
    Refresh the access token for the current user.
    
    This endpoint:
    1. Validates the refresh token
    2. Checks if the token is blacklisted
    3. Verifies the user still exists
    4. Creates a new access token
    
    Returns:
        Tuple[Dict[str, Any], int]: JSON response with new access token and status code
        
    Raises:
        HTTPException: If token is invalid, expired, or user not found
    """
    try:
        jwt_data = get_jwt()
        token_jti = jwt_data["jti"]
        
        if token_jti in token_blacklist:
            logger.warning(
                "Blacklisted refresh token attempted",
                extra={
                    'token_jti': token_jti,
                    'ip': request.remote_addr,
                    'user_agent': request.user_agent.string
                }
            )
            return http_401("Token has been revoked")
        
        current_user = get_jwt_identity()
        users_ref = current_app.db.collection(USERS)
        user_doc = users_ref.document(current_user).get()
        
        if not user_doc.exists:
            logger.warning(
                "Refresh attempted for non-existent user",
                extra={
                    'user_id': current_user,
                    'ip': request.remote_addr,
                    'user_agent': request.user_agent.string
                }
            )
            return http_401("User no longer exists")
        
        new_access_token = create_access_token(identity=current_user, fresh=False)
        token_blacklist.add(token_jti)
        
        logger.info(
            "Successfully refreshed token",
            extra={
                'user_id': current_user,
                'ip': request.remote_addr,
                'user_agent': request.user_agent.string
            }
        )
        return jsonify(access_token=new_access_token), 200
        
    except Exception as e:
        logger.error(
            "Error during token refresh",
            extra={
                'error': str(e),
                'ip': request.remote_addr,
                'user_agent': request.user_agent.string
            }
        )
        return http_401("Invalid refresh token")


@app.route('/api/users/profile', methods=['PUT', 'PATCH'])
@jwt_required()
def UpdateProfile() -> Tuple[Dict[str, Any], int]:
    """
    Update the profile of the currently logged-in user.
    Allows optional updates to email, name, and password.
    Validates that the email is not already in use by another user if email is being updated.
    
    JSON Structure:
    {
        "email": "newemail@example.com",    // Optional: New email address
        "username": "NewUsername",          // Optional: New username
        "password": "NewP@ssw0rd"           // Optional: New password (must meet requirements)
    }
    
    Note: All fields are optional. Only provided fields will be updated.
    Password requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    
    Returns:
        Tuple[Dict[str, Any], int]: Response with status code
    """
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            logger.warning("Update profile attempted with empty data", extra={'user_id': current_user_id})
            return http_400("No update data provided")

        # Get current user data
        users_ref = current_app.db.collection(USERS)
        current_user = users_ref.document(current_user_id).get()
        
        if not current_user.exists:
            logger.error("User not found during profile update", extra={'user_id': current_user_id})
            return http_404("User not found")

        current_data = current_user.to_dict()
        update_data = {}

        # Handle email update if provided
        if 'email' in data:
            new_email = data['email']
            if new_email != current_data.get('email'):
                # Check if email is already used by another user
                email_query = users_ref.where(filter=FieldFilter('email', '==', new_email)).limit(1).stream()
                existing_user = next(email_query, None)
                
                if existing_user and existing_user.id != current_user_id:
                    logger.warning(
                        "Email already in use",
                        extra={
                            'user_id': current_user_id,
                            'attempted_email': new_email,
                            'existing_user_id': existing_user.id
                        }
                    )
                    return http_409("Email is already in use")
                update_data['email'] = new_email

        # Handle username update if provided
        if 'username' in data:
            new_username = data['username']
            if new_username != current_data.get('username'):
                # Check if username is already used by another user
                username_query = users_ref.where(filter=FieldFilter('username', '==', new_username)).limit(1).stream()
                existing_user = next(username_query, None)
                
                if existing_user and existing_user.id != current_user_id:
                    logger.warning(
                        "Username already in use",
                        extra={
                            'user_id': current_user_id,
                            'attempted_username': new_username,
                            'existing_user_id': existing_user.id
                        }
                    )
                    return http_409("Username is already in use")
                update_data['username'] = new_username

        # Handle password update if provided
        if 'password' in data:
            if not ValidatePassword(data['password']):
                logger.warning("Invalid password format during profile update", extra={'user_id': current_user_id})
                return http_400("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol")
            update_data['password'] = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()

        if not update_data:
            logger.warning("No valid updates provided", extra={'user_id': current_user_id})
            return http_400("No valid updates provided")

        # Update the user's profile
        return DatabaseRequest(
            collection_name=USERS,
            data=update_data,
            doc_id=current_user_id
        )

    except Exception as e:
        logger.error(
            "Error updating profile",
            extra={
                'error': str(e),
                'user_id': current_user_id
            }
        )
        return http_500("Failed to update profile")


@app.route('/api/consultants', methods=['POST', 'GET', 'PUT'])
@jwt_required()
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
    """
    {
        "availability": {
            "0": ["2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"],
            "1": ["2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"],
            "2": ["2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"]
        }
    }
    """
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
    if request.method == 'GET':
            return DatabaseRequest(collection_name=COMPANY_DATA,
                                data=None,
                                doc_id='TenderPortals')

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
# ------------------------------------------------------------------------------------------------------------- #
# ------------------------------------------------------------------------------------------------------------- #

app.run(host='0.0.0.0', port=5000, threaded=True)