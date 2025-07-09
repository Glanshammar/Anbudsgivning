import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from datetime import datetime, timedelta
import logging
import asyncio
from time import sleep
from functools import wraps
from typing import Tuple, Dict, Any, Optional
from contextlib import asynccontextmanager
from flask import Flask, request, jsonify, current_app, session, abort, make_response
from flask_cors import CORS
from flask_login import login_user, logout_user, login_required, current_user, LoginManager, UserMixin
from google.cloud.firestore_v1.base_query import FieldFilter
import zmq
import zmq.asyncio
import bcrypt
import re
from httpcodes import *
from Data import Consultant, CompanyProfile, Expertise, TenderDocument, TenderPortal, UserProfile
from Agents import AgentType, AgentManager, Agent
from Backend.db_app import *
from dotenv import load_dotenv
from Logger.logger import LoggerManager
import threading
import time
import secrets
import inspect
import requests


# Collection name constants
COMPANY_DATA = 'CompanyData'
CONSULTANTS = 'Consultants'
USERS = 'Users'
TENDERS = 'Tenders'
BID_AUTHORING = 'BidAuthoring'


# Initialize logger
logger = LoggerManager.get_logger(
    name='api',
    log_to_console=True,
    level=logging.INFO
)


class ZMQClientPool:
    def __init__(self, max_connections: int = 10, server_url: str = "tcp://localhost:5001"):
        self.max_connections = max_connections
        self.server_url = server_url
        self.pool = None
        self.context = None
        self._initialize_pool()

    def _initialize_pool(self):
        """Initialize the connection pool with ZMQ sockets"""
        self.context = zmq.asyncio.Context()
        self.pool = asyncio.Queue(maxsize=self.max_connections)
        
        for _ in range(self.max_connections):
            socket = self.context.socket(zmq.REQ)
            socket.connect(self.server_url)
            self.pool.put_nowait(socket)

    @asynccontextmanager
    async def get_connection(self):
        """Get a connection from the pool with automatic reconnection"""
        if self.pool is None or self.context is None:
            self._initialize_pool()
            
        socket = await self.pool.get()
        try:
            if not socket.closed:
                yield socket
            else:
                new_socket = self.context.socket(zmq.REQ)
                new_socket.connect(self.server_url)
                yield new_socket
        finally:
            if not socket.closed:
                await self.pool.put(socket)

    async def close(self):
        """Close all connections in the pool"""
        if self.pool is not None:
            while not self.pool.empty():
                socket = await self.pool.get()
                if not socket.closed:
                    socket.close()
        if self.context is not None:
            self.context.term()
        self.pool = None
        self.context = None


load_dotenv()
app = CreateApp()


CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "Authorization"],
        "max_age": 86400  # Cache preflight response for 24 hours
    }
})


context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect("tcp://localhost:5001")

_connection_pool_initialized = False

@app.before_request
def initialize_connection_pool():
    """Initialize the ZMQ connection pool when the first request is made"""
    global _connection_pool_initialized
    if not _connection_pool_initialized:
        app.connection_pool = ZMQClientPool()
        _connection_pool_initialized = True


@app.teardown_appcontext
async def cleanup(exception=None):
    """Cleanup resources when the application context is torn down"""
    if hasattr(current_app, 'connection_pool'):
        await current_app.connection_pool.close()


@app.login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"message": "You must be logged in to access this resource."}), 401


# Global OPTIONS handler for all API routes
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        response.headers.add("Access-Control-Max-Age", "86400")
        return response


# ------------------------------------------------------------------------------------------------------------- #
# --------------------------------------------- Request Functions --------------------------------------------- #
async def ServerRequest(command: str = None, params: dict = None) -> Tuple[Dict[str, Any], int]:
    try:
        command_obj = {
            'command': command,
            'params': params if params is not None else {}
        }
        
        logger.debug(f"Sending server request: {command}", extra={'command': command, 'params': params})
        
        async with current_app.connection_pool.get_connection() as socket:
            await socket.send_json(command_obj)
            backend_response = await socket.recv_json()
        
        logger.debug(f"Received server response: {backend_response}", extra={'response': backend_response})
        return jsonify(backend_response["data"]), backend_response.get("status_code", 200)
    except Exception as e:
        logger.error(f"Server request failed: {str(e)}", extra={'error': str(e), 'command': command})
        # If we get an event loop error, reinitialize the pool
        if "bound to a different event loop" in str(e):
            current_app.connection_pool._initialize_pool()
        return jsonify({"error": str(e)}), 500


async def DatabaseRequest(collection_name: str = None, data: dict = None, doc_id: str = None) -> Tuple[Dict[str, Any], int]:
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
        return await ServerRequest(command, params)
    except Exception as e:
        logger.error(f"Database request failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


def ValidateModel(model_class):
    def decorator(func):
        if inspect.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                if request.method == 'GET':
                    return await func(*args, **kwargs)
                data = request.get_json()
                try:
                    model_instance = model_class(**data)
                    request.validated_data = model_instance.to_dict()
                except TypeError as e:
                    return http_400(f"Validation Error: {str(e)}")
                except ValueError as e:
                    return http_422(f"Data Error: {str(e)}")
                return await func(*args, **kwargs)
            return async_wrapper
        else:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
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
            return sync_wrapper
    return decorator


def ValidatePassword(password: str) -> bool:
    # Minimum 8 characters, at least one uppercase, one lowercase, one digit, one special character
    pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]{}<>.,;:|~`_+=-]).{8,}$'
    return bool(re.match(pattern, password))


def RoleRequired(*roles: str):
    """Decorator to require a user to have a specific role (or one of several roles), or be an Agent/AgentManager object."""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Allow if current_user is Agent or AgentManager instance
            if (
                not hasattr(current_user, 'role') or
                (
                    current_user.role not in roles and
                    not isinstance(current_user, Agent) and
                    not isinstance(current_user, AgentManager)
                )
            ):
                return http_403(f"You do not have the required role: {roles} or Agent/AgentManager access")
            return await func(*args, **kwargs)
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if (
                not hasattr(current_user, 'role') or
                (
                    current_user.role not in roles and
                    not isinstance(current_user, Agent) and
                    not isinstance(current_user, AgentManager)
                )
            ):
                return http_403(f"You do not have the required role: {roles} or Agent/AgentManager access")
            return func(*args, **kwargs)
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    return decorator

def BlockAgents(func):
    """Decorator to block access for Agent and AgentManager objects."""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        if isinstance(current_user, Agent) or isinstance(current_user, AgentManager):
            return http_403("Agent and AgentManager processes are not allowed to access this endpoint.")
        return await func(*args, **kwargs)
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        if isinstance(current_user, Agent) or isinstance(current_user, AgentManager):
            return http_403("Agent and AgentManager processes are not allowed to access this endpoint.")
        return func(*args, **kwargs)
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper
# ------------------------------------------------------------------------------------------------------------- #
# ---------------------------------------------- Route Functions ---------------------------------------------- #
@app.route('/api/status/server', methods=['GET'])
@login_required
async def ServerStatus() -> Tuple[Dict[str, Any], int]:
    return await ServerRequest('status')


@app.route('/api/status/api', methods=['GET'])
@login_required
async def ApiStatus() -> Tuple[Dict[str, Any], int]:
    return http_200('API is Online!')


@app.route('/api/user/register', methods=['POST'])
@BlockAgents
async def Register() -> Tuple[Dict[str, Any], int]:
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "User")

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

    # Generate a secure validation code
    validation_code = secrets.token_urlsafe(16)

    # Store user in Firestore with validated=False and validation_code
    user_data = {
        "username": username,
        "email": email,
        "password": hashed_pw,
        "validated": False,
        "validation_code": validation_code,
        "role": role
    }
    user_ref = users_ref.add(user_data)
    logger.info(f"User registered: {username}", extra={'user_id': user_ref[1].id})
    return jsonify({"message": "User registered successfully. Please validate your account.", "validation_code": validation_code}), 201


@app.route('/api/user/login', methods=['POST'])
@BlockAgents
async def Login() -> Tuple[Dict[str, Any], int]:
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return http_401("Username and password required.")

    # Use the User class's authenticate method
    user_obj = app.User.authenticate(username, password)
    if not user_obj:
        return http_401("Invalid credentials.")

    if not user_obj.validated:
        return http_401("Account not validated. Please validate your account.")

    login_user(user_obj)
    logger.info(f"User logged in: {username}", extra={'user_id': user_obj.id})
    return jsonify({"message": "Login successful"}), 200


@app.route('/api/user/logout', methods=['POST'])
@BlockAgents
async def Logout() -> Tuple[Dict[str, Any], int]:
    try:
        logout_user()
    except Exception as e:
        # Even if logout fails, we still want to return success
        # since the client should clear its session state
        logger.warning(f"Logout warning: {str(e)}", extra={'error': str(e)})
    return jsonify({"message": "Successfully logged out"}), 200


@app.route('/api/user/profile', methods=['GET'])
@BlockAgents
@login_required
async def GetProfile():
    try:
        current_user_id = current_user.get_id()
        logger.info(f"Getting profile for user: {current_user_id}", extra={'user_id': current_user_id})
        return await DatabaseRequest(collection_name=USERS, data=None, doc_id=current_user_id)
    except Exception as e:
        logger.error(f"Get profile failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


@app.route('/api/user/update', methods=['PUT'])
@BlockAgents
@login_required
@ValidateModel(UserProfile)
async def UpdateProfile():
    try:
        current_user_id = current_user.get_id()
        data = request.validated_data

        if 'password' in data:
            data['password'] = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
        
        logger.info(f"Updating profile for user: {current_user_id}", extra={'user_id': current_user_id})
        return await DatabaseRequest(collection_name=USERS, data=data, doc_id=current_user_id)
    except Exception as e:
        logger.error(f"Update profile failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


@app.route('/api/user/delete', methods=['DELETE'])
@BlockAgents
@login_required
async def DeleteUser() -> Tuple[Dict[str, Any], int]:
    current_user_id = current_user.get_id()
    logger.info(f"Deleting user: {current_user_id}", extra={'user_id': current_user_id})
    return await DatabaseRequest(collection_name=USERS, data=None, doc_id=current_user_id)


@app.route('/api/user/delete_other', methods=['POST'])
@BlockAgents
@login_required
@RoleRequired('Admin')
async def DeleteOtherUser() -> Tuple[Dict[str, Any], int]:
    data = request.get_json()
    user_id = data.get("user_id")
    logger.info(f"Deleting user: {user_id}", extra={'user_id': user_id})
    return await DatabaseRequest(collection_name=USERS, data=None, doc_id=user_id)


@app.route('/api/user/validate', methods=['POST'])
@BlockAgents
async def ValidateUser() -> Tuple[Dict[str, Any], int]:
    data = request.get_json()
    email = data.get("email")
    code = data.get("validation_code")

    if not code or not email:
        return http_400("Invalid input: Email and validation code are required.")

    users_ref = current_app.db.collection(USERS)
    query = users_ref.where(filter=FieldFilter('email', '==', email)).limit(1)
    user_docs = list(query.stream())
    if not user_docs:
        return http_404("User not found.")
    user_doc = user_docs[0]
    user_data = user_doc.to_dict()
    if user_data.get("validated", False):
        return http_400("User already validated.")
    if user_data.get("validation_code") != code:
        return http_401("Invalid validation code.")
    # Set validated to True and remove validation_code
    user_doc.reference.update({"validated": True, "validation_code": firestore.DELETE_FIELD})
    logger.info(f"User validated: {user_doc.id}", extra={'user_id': user_doc.id})
    return jsonify({"msg": "User validated successfully."}), 200


@app.route('/api/user/get_role', methods=['GET'])
@login_required
async def GetRoles():
    return jsonify({"role": current_user.role}), 200


@app.route('/api/consultants', methods=['GET', 'POST', 'PUT', 'DELETE'])
@login_required
@ValidateModel(Consultant)
async def Consultants():
    """
    Handle all consultant operations:
    GET: Get all consultants or a specific consultant by ID
    POST: Create a new consultant
    PUT: Update an existing consultant
    DELETE: Delete a consultant
    """
    try:
        consultant_id = request.args.get('id') if request.method == 'GET' else request.json.get('id')
        
        if request.method == 'GET':
            logger.info(f"Getting consultant: {consultant_id}", extra={'consultant_id': consultant_id})
            return await DatabaseRequest(CONSULTANTS, doc_id=consultant_id)
        elif request.method == 'POST':
            logger.info("Creating new consultant")
            return await DatabaseRequest(CONSULTANTS, request.get_json())
        elif request.method == 'PUT':
            if not consultant_id:
                return http_400("Consultant ID is required for update")
            logger.info(f"Updating consultant: {consultant_id}", extra={'consultant_id': consultant_id})
            return await DatabaseRequest(CONSULTANTS, request.get_json(), consultant_id)
        elif request.method == 'DELETE':
            if not consultant_id:
                return http_400("Consultant ID is required for deletion")
            logger.info(f"Deleting consultant: {consultant_id}", extra={'consultant_id': consultant_id})
            return await DatabaseRequest(CONSULTANTS, doc_id=consultant_id)
    except Exception as e:
        logger.error(f"Consultant operation failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


@app.route('/api/calendar', methods=['POST', 'GET'])
@login_required
async def BusinessCalendar():
    """
    {
        "availability": {
            "0": ["2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"],
            "1": ["2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"],
            "2": ["2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"]
        }
    }
    """
    current_user_id = current_user.get_id()

    if request.method == 'POST':
        data = request.get_json()
        availability = data.get("availability")

        if not isinstance(availability, dict):
            return http_400("Invalid input: 'availability' must be a dictionary.")

        logger.info(f"Creating consultant calendar: {availability} for user: {current_user_id}", extra={'availability': availability, 'user_id': current_user_id})
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                              data=availability,
                              doc_id='ConsultantCalendar')
    
    if request.method == 'GET':
        logger.info(f"Getting consultant calendar for user: {current_user_id}", extra={'user_id': current_user_id})
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                              data=None,
                              doc_id='ConsultantCalendar')


@app.route('/api/tenders', methods=['GET', 'POST', 'PUT', 'DELETE'])
@login_required
async def TendersRequest():
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

    current_user_id = current_user.get_id()
    doc_id = 'Tenders'

    if request.method == 'GET':
        logger.info(f"Getting tenders for user: {current_user_id}", extra={'user_id': current_user_id})
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                            data=None,
                            doc_id=doc_id)
                            
    elif request.method in ['POST', 'PUT']:
        tender_data = request.get_json().get('tenders', [])
        validated_tenders = []
        
        for tender in tender_data:
            # Convert date strings to datetime objects
            try:
                # Parse date strings to datetime objects
                for date_field in ['deadline', 'start_date', 'end_date']:
                    if date_field in tender and isinstance(tender[date_field], str) and tender[date_field].strip():
                        try:
                            tender[date_field] = datetime.strptime(tender[date_field], "%Y-%m-%d")
                        except ValueError as e:
                            return jsonify({"error": f"Invalid date format for {date_field}: {tender[date_field]}. Expected format: YYYY-MM-DD"}), 400
                
                # Sätt default state om det inte finns
                if 'state' not in tender:
                    tender['state'] = 'nyinkommet'
                
                # Skapa TenderDocument objekt, men hantera extra fält manuellt
                tender_params = {k: v for k, v in tender.items() 
                               if k in ['project_name', 'branch', 'deadline', 'start_date', 'end_date', 'state']}
                
                # Sätt None för tomma datum-fält
                if 'start_date' in tender_params and not tender_params['start_date']:
                    tender_params['start_date'] = None
                if 'end_date' in tender_params and not tender_params['end_date']:
                    tender_params['end_date'] = None
                    
                tender_obj = TenderDocument(**tender_params)
                
                # Lägg till extra fält som inte är i konstruktorn
                if 'description' in tender:
                    tender_obj.description = tender['description']
                if 'url' in tender:
                    tender_obj.tender_link = tender['url']
                if 'bid_data' in tender:
                    tender_obj.bid_data = tender['bid_data']
                if 'submission_date' in tender:
                    tender_obj.submission_date = tender['submission_date']
                
                validated_tenders.append(tender_obj.to_dict())
            except (ValueError, TypeError) as e:
                return jsonify({"error": f"Invalid tender data: {str(e)}"}), 400
        
        if request.method == 'POST':
            # Hämta befintliga tenders först
            existing_data = current_app.db.collection(COMPANY_DATA).document('Tenders').get()
            existing_tenders = existing_data.to_dict().get('tenders', []) if existing_data.exists else []
            
            # Kombinera befintliga och nya tenders, undvik dubbletter baserat på project_name
            existing_projects = {tender['project_name'] for tender in existing_tenders}
            new_tenders = [
                tender for tender in validated_tenders 
                if tender['project_name'] not in existing_projects
            ]
            combined_tenders = existing_tenders + new_tenders
            
            logger.info(f"Adding {len(new_tenders)} new tenders to {len(existing_tenders)} existing tenders for user: {current_user_id}", extra={'user_id': current_user_id})
            
            # Spara till databasen
            db_response, status_code = await DatabaseRequest(collection_name=COMPANY_DATA,
                                data={"tenders": combined_tenders},
                                doc_id=doc_id)
            
            # Returnera bara den första nya tendern (eftersom vi bara skapar en åt gången)
            if status_code == 200 and new_tenders:
                return jsonify({"tender": new_tenders[0]}), 201
            else:
                return db_response, status_code
        
        elif request.method == 'PUT':
            existing_data = current_app.db.collection(COMPANY_DATA).document('Tenders').get()
            existing_tenders = existing_data.to_dict().get('tenders', []) if existing_data.exists else []
            
            # Combine existing and new tenders, avoiding duplicates based on project_name
            existing_projects = {tender['project_name'] for tender in existing_tenders}
            combined_tenders = existing_tenders + [
                tender for tender in validated_tenders 
                if tender['project_name'] not in existing_projects
            ]
            logger.info(f"Updating tenders {combined_tenders} for user: {current_user_id}", extra={'user_id': current_user_id})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                data={"tenders": combined_tenders},
                                doc_id=doc_id)

    elif request.method == 'DELETE':
        try:
            logger.info(f"Deleting tenders for user: {current_user_id}", extra={'user_id': current_user_id})
            return await DatabaseRequest(
                collection_name=COMPANY_DATA,
                doc_id=doc_id
            )
        except Exception as e:
            logger.error(f"Error deleting tenders: {str(e)}", extra={'error': str(e)})
            return jsonify({"error": str(e)}), 500


@app.route('/api/tenders/<tender_id>/state', methods=['PUT'])
@login_required
async def update_tender_state(tender_id: str):
    """Uppdatera state för en specifik upphandling"""
    current_user_id = current_user.get_id()
    
    try:
        data = request.get_json()
        new_state = data.get('state')
        
        if not new_state:
            return jsonify({"error": "state is required"}), 400
            
        if new_state not in TenderDocument.VALID_STATES:
            return jsonify({"error": f"Invalid state. Must be one of {TenderDocument.VALID_STATES}"}), 400
        
        # Hämta befintliga tenders
        doc_ref = current_app.db.collection(COMPANY_DATA).document('Tenders')
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({"error": "No tenders found"}), 404
            
        tenders_data = doc.to_dict().get('tenders', [])
        
        # Hitta och uppdatera rätt tender (baserat på project_name som ID)
        tender_found = False
        for tender in tenders_data:
            if tender['project_name'] == tender_id:
                old_state = tender.get('state', 'nyinkommet')
                tender['state'] = new_state
                
                # Automatiskt sätt submission_date när anbudet skickas
                if new_state == "sent_bids" and old_state != "sent_bids":
                    tender['submission_date'] = datetime.now().strftime("%Y-%m-%d")
                
                tender_found = True
                break
                
        if not tender_found:
            return jsonify({"error": "Tender not found"}), 404
            
        # Spara tillbaka till databasen
        doc_ref.set({'tenders': tenders_data})
        
        logger.info(f"Updated tender {tender_id} state to {new_state} for user: {current_user_id}")
        return jsonify({"message": "State updated successfully", "tender_id": tender_id, "new_state": new_state}), 200
        
    except Exception as e:
        logger.error(f"Error updating tender state: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/tenders/by-state/<state>', methods=['GET'])
@login_required
async def get_tenders_by_state(state: str):
    """Hämta alla tenders med en specifik state"""
    current_user_id = current_user.get_id()
    
    if state not in TenderDocument.VALID_STATES:
        return jsonify({"error": f"Invalid state. Must be one of {TenderDocument.VALID_STATES}"}), 400
    
    try:
        doc_ref = current_app.db.collection(COMPANY_DATA).document('Tenders')
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({"tenders": []}), 200
            
        all_tenders = doc.to_dict().get('tenders', [])
        
        # Filtrera tenders baserat på state (default till 'nyinkommet' för befintliga tenders utan state)
        filtered_tenders = [tender for tender in all_tenders if tender.get('state', 'nyinkommet') == state]
        
        logger.info(f"Retrieved {len(filtered_tenders)} tenders with state {state} for user: {current_user_id}")
        return jsonify({"tenders": filtered_tenders}), 200
        
    except Exception as e:
        logger.error(f"Error getting tenders by state: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/tenders/states', methods=['GET'])
@login_required
async def get_tender_states():
    """Hämta alla giltiga tender states"""
    return jsonify({
        "states": TenderDocument.VALID_STATES,
        "state_labels": {
            "nyinkommet": "Nyinkommet",
            "under_utredning": "Under utredning",
            "bid_authoring": "Bid Authoring",
            "sent_bids": "Upphandlingar vi bjudit på"
        }
    }), 200


@app.route('/api/expertise', methods=['POST', 'GET', 'PUT'])
@login_required
async def ExpertiseRequest():
    try:
        current_user_id = current_user.get_id()
        doc_id = 'Expertise'
        
        if request.method == 'POST':
            logger.info(f"Creating expertise by user: {current_user_id}", extra={'user_id': current_user_id})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                  data=request.get_json(),
                                  doc_id=doc_id)
        elif request.method == 'GET':
            logger.info(f"Getting expertise by user: {current_user_id}", extra={'user_id': current_user_id})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                  data=None,
                                  doc_id=doc_id)
        elif request.method == 'PUT':
            logger.info(f"Updating expertise by user: {current_user_id}", extra={'user_id': current_user_id})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                  data=request.get_json(),
                                  doc_id=doc_id)
    except Exception as e:
        logger.error(f"Expertise request failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


@app.route('/api/tender_portals', methods=['POST', 'GET', 'PUT'])
@login_required
async def TenderPortals():
    # JSON format
    """
    {
        "portals": [
            {
            "site": "TenderPortal1",
            "url": "https://tenderportal1.example.com",
            "username": "username1",
            "password": "password1"
            },
            {
            "site": "TenderPortal2",
            "url": "https://tenderportal2.example.com",
            "username": "username2",
            "password": "password2"
            }
        ]
    }
    """
    current_user_id = current_user.get_id()
    doc_id = 'TenderPortals'

    if request.method == 'GET':
        logger.info(f"Getting portals for user: {current_user_id}", extra={'user_id': current_user_id})
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                             data=None,
                             doc_id=doc_id)

    portals_data = request.get_json().get('portals', [])
    validated_portals = []
    for portal in portals_data:
        portal_obj = TenderPortal(**portal)
        validated_portals.append(portal_obj.to_dict())

    if request.method == 'POST':
        existing_data = current_app.db.collection(COMPANY_DATA).document('TenderPortals').get()
        existing_portals = existing_data.to_dict().get('portals', []) if existing_data.exists else []

        # Avoid duplicates by URL
        existing_urls = {portal['url'] for portal in existing_portals}
        new_portals = [portal for portal in validated_portals if portal['url'] not in existing_urls]
        combined_portals = existing_portals + new_portals

        logger.info(f"Adding new portals {new_portals} for user: {current_user_id}", extra={'user_id': current_user_id})
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                                     data={"portals": combined_portals},
                                     doc_id=doc_id)
    
    elif request.method == 'PUT':
        logger.info(f"Updating portals {validated_portals} for user: {current_user_id}", extra={'user_id': current_user_id})
        existing_data = current_app.db.collection(COMPANY_DATA).document('TenderPortals').get()
        existing_portals = existing_data.to_dict().get('portals', []) if existing_data.exists else []
        
        # Combine existing and new portals, avoiding duplicates based on URL
        existing_urls = {portal['url'] for portal in existing_portals}
        combined_portals = existing_portals + [
            portal for portal in validated_portals 
            if portal['url'] not in existing_urls
        ]
        
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                             data={"portals": combined_portals},
                             doc_id=doc_id)


@app.route('/api/bid-authoring', methods=['GET', 'POST', 'PUT', 'DELETE'])
@login_required
async def BidAuthoringRequest():
    """
    Handle bid authoring data for specific tenders
    JSON format:
    {
        "tender_id": "project_name_or_id",
        "bid_data": {
            "personuppgifter": {
                "companyName": "string",
                "orgNumber": "string", 
                "address": "string",
                "contactPerson": "string",
                "email": "string",
                "phone": "string"
            },
            "summary": "string",
            "keySkills": "string",
            "history": "string",
            "status": 35,
            "last_modified": "2025-01-09T10:30:00Z"
        }
    }
    """
    current_user_id = current_user.get_id()
    
    if request.method == 'GET':
        # Get specific bid authoring data by tender_id
        tender_id = request.args.get('tender_id')
        if tender_id:
            doc_id = f"bid_{tender_id}"
            logger.info(f"Getting bid authoring data for tender {tender_id} by user: {current_user_id}")
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                data=None,
                                doc_id=doc_id)
        else:
            # Get all bid authoring documents
            logger.info(f"Getting all bid authoring data for user: {current_user_id}")
            try:
                # Get all documents that start with "bid_"
                docs = current_app.db.collection(COMPANY_DATA).where("__name__", ">=", "bid_").where("__name__", "<", "bid_\uf8ff").get()
                all_bids = {}
                for doc in docs:
                    if doc.id.startswith("bid_"):
                        tender_id = doc.id[4:]  # Remove "bid_" prefix
                        all_bids[tender_id] = doc.to_dict()
                return jsonify(all_bids), 200
            except Exception as e:
                logger.error(f"Error getting all bid authoring data: {str(e)}")
                return jsonify({"error": str(e)}), 500
    
    elif request.method in ['POST', 'PUT']:
        data = request.get_json()
        tender_id = data.get('tender_id')
        bid_data = data.get('bid_data', {})
        
        if not tender_id:
            return jsonify({"error": "tender_id is required"}), 400
            
        # Add timestamp
        bid_data['last_modified'] = datetime.now().isoformat()
        
        doc_id = f"bid_{tender_id}"
        
        if request.method == 'POST':
            logger.info(f"Creating bid authoring data for tender {tender_id} by user: {current_user_id}")
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                data=bid_data,
                                doc_id=doc_id)
        else:  # PUT
            logger.info(f"Updating bid authoring data for tender {tender_id} by user: {current_user_id}")
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                data=bid_data,
                                doc_id=doc_id)
    
    elif request.method == 'DELETE':
        tender_id = request.args.get('tender_id')
        if not tender_id:
            return jsonify({"error": "tender_id is required"}), 400
            
        doc_id = f"bid_{tender_id}"
        logger.info(f"Deleting bid authoring data for tender {tender_id} by user: {current_user_id}")
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                            data=None,
                            doc_id=doc_id)


@app.route('/api/company_profile', methods=['GET', 'POST', 'PUT', 'DELETE'])
@login_required
@RoleRequired('Admin')
@ValidateModel(CompanyProfile)
async def Company():
    try:
        doc_id = 'CompanyProfile'
        if request.method == 'GET':
            logger.info(f"Getting company profile", extra={'doc_id': doc_id})
            return await DatabaseRequest(COMPANY_DATA, data=None, doc_id=doc_id)
        elif request.method == 'POST':
            logger.info("Creating company profile", extra={'doc_id': doc_id})
            return await DatabaseRequest(COMPANY_DATA, data=request.validated_data, doc_id=doc_id)
        elif request.method == 'PUT':
            logger.info(f"Updating company profile", extra={'doc_id': doc_id})
            return await DatabaseRequest(COMPANY_DATA, data=request.validated_data, doc_id=doc_id)
        elif request.method == 'DELETE':
            logger.info(f"Deleting company profile", extra={'doc_id': doc_id})
            return await DatabaseRequest(COMPANY_DATA, data=None, doc_id=doc_id)
    except Exception as e:
        logger.error(f"Company profile operation failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500
# ------------------------------------------------------------------------------------------------------------- #
# --------------------------------------------- Agent Management ---------------------------------------------- #
@app.route('/api/agents', methods=['POST', 'GET', 'DELETE'])
@login_required
@RoleRequired('Admin')
async def AgentManagement():
    try:
        if request.method == 'POST':
            # JSON example
            """
            {
                agent_type: "WebCrawler"
            }
            """
            return await ServerRequest(command='start_agent', params=request.get_json())

        elif request.method == 'GET':
            return await ServerRequest(command='get_agents')

        elif request.method == 'DELETE':
            # JSON example
            """
            {
                "agent_id": 1
            }
            """
            agent_id = request.get_json().get('agent_id')
            if not agent_id:
                return http_400("Missing agent_id parameter")
            
            return await ServerRequest(command='stop_agent', params={'agent_id': int(agent_id)})
    except Exception as e:
        logger.error(f"Agent management failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


def GetLatestRelease():
    url = None
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        return data['tag_name'], data["assets"]
    return None, None


@app.route('/api/update_app', methods=['GET'])
def GetUpdate():
    # Create update directory in instance folder
    update_dir = os.path.join(app.instance_path, 'updates')
    os.makedirs(update_dir, exist_ok=True)
    
    # Version file path in update directory
    version_path = os.path.join(update_dir, 'version.txt')
    
    # Create version file if it doesn't exist
    if not os.path.exists(version_path):
        with open(version_path, 'w') as file:
            file.write('0.0.0')  # Initial version
    
    with open(version_path, 'r') as file:
        current_version = file.read().strip()
    
    latest_version, assets = GetLatestRelease()
    
    if latest_version and latest_version != current_version and len(assets) >= 1:
        # Find the main.py file in assets
        main_asset = next((asset for asset in assets if asset['name'] == 'main.py'), None)
        
        if not main_asset:
            return http_404("main.py not found in release assets")
        
        try:
            # Download main.py
            download_url = main_asset['browser_download_url']
            file_path = os.path.join(update_dir, 'main.py')
            
            # Stream download to handle large files
            with requests.get(download_url, stream=True) as response:
                response.raise_for_status()
                with open(file_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:  # Filter out keep-alive chunks
                            f.write(chunk)
            
            # Update version after successful download
            with open(version_path, 'w') as file:
                file.write(latest_version)
            
            return http_200({
                "status": "success",
                "version": latest_version,
                "downloaded_file": "main.py",
                "update_path": update_dir
            })
        except Exception as e:
            logger.error(f"Failed to download main.py: {str(e)}", extra={'error': str(e)})
            return http_500(f"Failed to download main.py: {str(e)}")
            
    return http_404("Update not found.")
# ------------------------------------------------------------------------------------------------------------- #
# -------------------------------------------- App Config & Startup -------------------------------- #
if __name__ == '__main__':
    import hypercorn.asyncio
    import hypercorn.config
    
    config = hypercorn.config.Config()
    config.bind = ["0.0.0.0:5000"]
    config.use_reloader = True

    asyncio.run(hypercorn.asyncio.serve(app, config))