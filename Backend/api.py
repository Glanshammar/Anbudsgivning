import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from datetime import datetime
import logging
import asyncio
from time import sleep
from functools import wraps
from typing import Tuple, Dict, Any, Optional
from contextlib import asynccontextmanager

from flask import Flask, request, jsonify, current_app
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, get_jwt_identity,
    get_jwt, verify_jwt_in_request
)
from google.cloud.firestore_v1.base_query import FieldFilter
import zmq
import zmq.asyncio
import bcrypt
import re
from httpcodes import *
from Data import Consultant, CompanyProfile, Expertise, TenderDocument, TenderPortal, UserProfile
from Agents import AgentType, AgentManager
from Backend.db_app import *
from dotenv import load_dotenv
from Logger.logger import LoggerManager
import threading
import time


# Collection name constants
COMPANY_DATA = 'CompanyData'
CONSULTANTS = 'Consultants'
USERS = 'Users'
TENDERS = 'Tenders'


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


class TokenBlacklist:
    def __init__(self):
        self.collection = 'TokenBlacklist'
        self._cache = set()  # In-memory cache for quick lookups

    def _load_blacklist(self):
        """Load blacklisted tokens from Firestore into memory"""
        try:
            with app.app_context():
                blacklist_ref = current_app.db.collection(self.collection)
                docs = blacklist_ref.stream()
                for doc in docs:
                    self._cache.add(doc.id)
                logger.info(f"Loaded {len(self._cache)} blacklisted tokens from database")
        except Exception as e:
            logger.error(f"Error loading token blacklist: {str(e)}", extra={'error': str(e)})

    def add(self, token_jti: str, expires_at: Optional[datetime.datetime] = None):
        """Add a token to the blacklist"""
        try:
            with app.app_context():
                blacklist_ref = current_app.db.collection(self.collection)
                blacklist_ref.document(token_jti).set({
                    'blacklisted_at': datetime.datetime.now(datetime.UTC),
                    'expires_at': expires_at
                })
                self._cache.add(token_jti)
                logger.info(f"Token blacklisted: {token_jti}", extra={'token_jti': token_jti})
        except Exception as e:
            logger.error(f"Error blacklisting token: {str(e)}", extra={'error': str(e)})

    def is_blacklisted(self, token_jti: str) -> bool:
        """Check if a token is blacklisted"""
        return token_jti in self._cache

    def cleanup_expired(self):
        """Remove expired tokens from the blacklist"""
        try:
            with app.app_context():
                now = datetime.datetime.now(datetime.UTC)
                blacklist_ref = current_app.db.collection(self.collection)
                expired_tokens = blacklist_ref.where(
                    'expires_at', '<', now
                ).stream()
                
                for doc in expired_tokens:
                    doc.reference.delete()
                    self._cache.remove(doc.id)
                
                logger.info(f"Cleaned up expired tokens from blacklist")
        except Exception as e:
            logger.error(f"Error cleaning up expired tokens: {str(e)}", extra={'error': str(e)})


load_dotenv()
app = CreateApp()


CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE, OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})


context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect("tcp://localhost:5001")


token_blacklist = TokenBlacklist()

with app.app_context():
    token_blacklist._load_blacklist()

_connection_pool_initialized = False

@app.before_request
def initialize_connection_pool():
    """Initialize the ZMQ connection pool when the first request is made"""
    global _connection_pool_initialized
    if not _connection_pool_initialized:
        app.connection_pool = ZMQClientPool()
        _connection_pool_initialized = True


def cleanup_task():
    while True:
        with app.app_context():
            token_blacklist.cleanup_expired()
        time.sleep(900)

thread = threading.Thread(target=cleanup_task, daemon=True)
thread.start()
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


def CheckBlacklist():
    def decorator(fn):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            try:
                # Only verify JWT if we're in a request context
                if request:
                    auth_header = request.headers.get('Authorization', None)
                    verify_jwt_in_request()
                    jwt_data = get_jwt()
                    token_jti = jwt_data["jti"]
                    if token_blacklist.is_blacklisted(token_jti):
                        logger.warning(
                            f"Blacklisted token attempted by token: {token_jti}",
                            extra={
                                'token_jti': token_jti,
                                'ip': request.remote_addr,
                                'user_agent': request.user_agent.string,
                                'request': request
                            }
                        )
                        return http_401("Token has been revoked")
                return await fn(*args, **kwargs)
            except Exception as e:
                logger.error(f"Token validation failed: {str(e)}", extra={'error': str(e)})
                return http_401("Invalid token")
        return wrapper
    return decorator


def ValidatePassword(password: str) -> bool:
    # Minimum 8 characters, at least one uppercase, one lowercase, one digit, one special character
    pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]{}<>.,;:|~`_+=-]).{8,}$'
    return bool(re.match(pattern, password))


def GetUsername() -> str:
    try:
        user_id = get_jwt_identity()
        user_doc = current_app.db.collection(USERS).document(user_id).get()
        return user_doc.get('username') if user_doc.exists else 'unknown'
    except Exception as e:
        logger.error(f"Error checking username: {str(e)}", extra={'error': str(e)})
        return 'unknown'
# ------------------------------------------------------------------------------------------------------------- #
# ---------------------------------------------- Route Functions ---------------------------------------------- #
@app.route('/api/status/server', methods=['GET'])
@jwt_required()
@CheckBlacklist()
async def ServerStatus() -> Tuple[Dict[str, Any], int]:
    return await ServerRequest('status')


@app.route('/api/status/api', methods=['GET'])
@jwt_required()
@CheckBlacklist()
async def ApiStatus() -> Tuple[Dict[str, Any], int]:
    return http_200('API is Online!')


@app.route('/api/user/register', methods=['POST'])
async def Register() -> Tuple[Dict[str, Any], int]:
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
    logger.info(f"User registered: {username}", extra={'user_id': user_data.id})
    return http_201("User registered successfully.")


@app.route('/api/user/login', methods=['POST'])
async def Login() -> Tuple[Dict[str, Any], int]:
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
    logger.info(f"User logged in: {username}", extra={'user_id': user_doc.id})
    return jsonify(
        access_token=access_token,
        refresh_token=refresh_token
    ), 200


@app.route('/api/user/logout', methods=['POST'])
@jwt_required()
@CheckBlacklist()
async def Logout() -> Tuple[Dict[str, Any], int]:
    try:
        username = GetUsername()
        jwt_data = get_jwt()
        token_jti = jwt_data["jti"]
        expires_at = datetime.datetime.fromtimestamp(jwt_data["exp"])
        
        token_blacklist.add(token_jti, expires_at)
        logger.info(f"User logged out: {username}", extra={'username': username})
        return jsonify({"message": "Successfully logged out"}), 200
    except Exception as e:
        logger.error(f"Logout failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


@app.route('/api/user/refresh-token', methods=['POST'])
@jwt_required(refresh=True)
@CheckBlacklist()
async def RefreshToken() -> Tuple[Dict[str, Any], int]:
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
        
        if token_blacklist.is_blacklisted(token_jti):
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
        logger.info(f"Token refreshed for user: {current_user}", extra={'user_id': current_user})
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


@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
@CheckBlacklist()
async def GetProfile():
    try:
        current_user_id = get_jwt_identity()
        username = GetUsername()
        logger.info(f"Getting profile for user: {username}", extra={'username': username})
        return await DatabaseRequest(USERS, doc_id=current_user_id)
    except Exception as e:
        logger.error(f"Get profile failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


@app.route('/api/user/profile', methods=['PUT'])
@jwt_required()
@CheckBlacklist()
@ValidateModel(UserProfile)
async def UpdateProfile():
    try:
        username = GetUsername()
        current_user_id = get_jwt_identity()
        data = request.validated_data

        if 'password' in data:
            data['password'] = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
        
        logger.info(f"Updating profile for user: {username}", extra={'user_id': username})
        return await DatabaseRequest(USERS, data, current_user_id)
    except Exception as e:
        logger.error(f"Update profile failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


@app.route('/api/consultants', methods=['GET', 'POST', 'PUT', 'DELETE'])
@jwt_required()
@CheckBlacklist()
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
@jwt_required()
@CheckBlacklist()
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
    username = GetUsername()

    if request.method == 'POST':
        data = request.get_json()
        availability = data.get("availability")

        if not isinstance(availability, dict):
            return http_400("Invalid input: 'availability' must be a dictionary.")

        logger.info(f"Creating consultant calendar: {availability} for user: {username}", extra={'availability': availability, 'user_id': username})
        return DatabaseRequest(collection_name=COMPANY_DATA,
                              data=availability,
                              doc_id='ConsultantCalendar')
    
    if request.method == 'GET':
        logger.info(f"Getting consultant calendar for user: {username}", extra={'user_id': username})
        return DatabaseRequest(collection_name=COMPANY_DATA,
                              data=None,
                              doc_id='ConsultantCalendar')


@app.route('/api/tenders', methods=['GET', 'POST', 'PUT', 'DELETE'])
@jwt_required()
@CheckBlacklist()
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

    username = GetUsername()

    if request.method == 'GET':
        logger.info(f"Getting tenders for user: {username}", extra={'user_id': username})
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                            data=None,
                            doc_id='Tenders')
                            
    elif request.method in ['POST', 'PUT']:
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
            logger.info(f"Creating new tenders {validated_tenders} for user: {username}", extra={'user_id': username})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                data={"tenders": validated_tenders},
                                doc_id='Tenders')
        
        elif request.method == 'PUT':
            existing_data = current_app.db.collection(COMPANY_DATA).document('Tenders').get()
            existing_tenders = existing_data.to_dict().get('tenders', []) if existing_data.exists else []
            
            # Combine existing and new tenders, avoiding duplicates based on project_name
            existing_projects = {tender['project_name'] for tender in existing_tenders}
            combined_tenders = existing_tenders + [
                tender for tender in validated_tenders 
                if tender['project_name'] not in existing_projects
            ]
            logger.info(f"Updating tenders {combined_tenders} for user: {username}", extra={'user_id': username})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                data={"tenders": combined_tenders},
                                doc_id='Tenders')

    elif request.method == 'DELETE':
        try:
            logger.info(f"Deleting tenders for user: {username}", extra={'user_id': username})
            return await DatabaseRequest(
                collection_name=COMPANY_DATA,
                doc_id='Tenders'
            )
        except Exception as e:
            logger.error(f"Error deleting tenders: {str(e)}", extra={'error': str(e)})
            return jsonify({"error": str(e)}), 500


@app.route('/api/expertise', methods=['POST', 'GET', 'PUT'])
@jwt_required()
@CheckBlacklist()
async def ExpertiseRequest():
    try:
        username = GetUsername()
        
        if request.method == 'POST':
            logger.info(f"Creating expertise by user: {username}", extra={'user_id': username})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                  data=request.get_json(),
                                  doc_id='Expertise')
        elif request.method == 'GET':
            logger.info(f"Getting expertise by user: {username}", extra={'user_id': username})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                  data=None,
                                  doc_id='Expertise')
        elif request.method == 'PUT':
            logger.info(f"Updating expertise by user: {username}", extra={'user_id': username})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                  data=request.get_json(),
                                  doc_id='Expertise')
    except Exception as e:
        logger.error(f"Expertise request failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


@app.route('/api/tender_portals', methods=['POST', 'GET', 'PUT'])
@jwt_required()
@CheckBlacklist()
async def TenderPortals():
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
        logger.info(f"Getting portals for user: {username}", extra={'user_id': username})
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                             data=None,
                             doc_id='TenderPortals')

    username = GetUsername()

    portals_data = request.get_json().get('portals', [])
    validated_portals = []
    for portal in portals_data:
        portal_obj = TenderPortal(**portal)
        validated_portals.append(portal_obj.to_dict())

    if request.method == 'POST':
        logger.info(f"Creating new portals {validated_portals} for user: {username}", extra={'user_id': username})
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                             data={"portals": validated_portals},
                             doc_id='TenderPortals')
    
    elif request.method == 'PUT':
        logger.info(f"Updating portals {validated_portals} for user: {username}", extra={'user_id': username})
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
                             doc_id='TenderPortals')


@app.route('/api/company', methods=['GET', 'POST', 'PUT', 'DELETE'])
@jwt_required()
@CheckBlacklist()
async def Company():
    """
    Handle all company operations:
    GET: Get all companies or a specific company by ID
    POST: Create a new company
    PUT: Update an existing company
    DELETE: Delete a company
    """
    try:
        company_id = request.args.get('id')
        
        if request.method == 'GET':
            logger.info(f"Getting company: {company_id}", extra={'company_id': company_id})
            return await DatabaseRequest(COMPANY_DATA, doc_id=company_id)
        elif request.method == 'POST':
            logger.info("Creating new company")
            return await DatabaseRequest(COMPANY_DATA, request.get_json())
        elif request.method == 'PUT':
            if not company_id:
                return http_400("Company ID is required for update")
            logger.info(f"Updating company: {company_id}", extra={'company_id': company_id})
            return await DatabaseRequest(COMPANY_DATA, request.get_json(), company_id)
        elif request.method == 'DELETE':
            if not company_id:
                return http_400("Company ID is required for deletion")
            logger.info(f"Deleting company: {company_id}", extra={'company_id': company_id})
            return await DatabaseRequest(COMPANY_DATA, doc_id=company_id)
    except Exception as e:
        logger.error(f"Company operation failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500


@app.route('/api/user/refresh', methods=['POST'])
@jwt_required()
@CheckBlacklist()
async def Refresh():
    try:
        data = request.get_json()
        return await ServerRequest('refresh', data)
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500
# ------------------------------------------------------------------------------------------------------------- #
# --------------------------------------------- Agent Management ---------------------------------------------- #
@app.route('/api/agents', methods=['POST', 'GET', 'DELETE'])
@jwt_required()
@CheckBlacklist()
async def AgentManagement():
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
            # JSON example
            """
            {
                "agent_id": 1
            }
            """
            agent_id = request.get_json().get('agent_id')
            if not agent_id:
                return http_400("Missing agent_id parameter")
            
            command = {
                'command': 'stop_agent',
                'params': {'agent_id': int(agent_id)}
            }
            socket.send_json(command)
            response = socket.recv_json()
            return jsonify(response), response['status_code']
    except Exception as e:
        logger.error(f"Agent management failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500

@app.route('/api/agents/logs', methods=['GET'])
@jwt_required()
@CheckBlacklist()
async def GetAgentLogs():
    try:
        return await ServerRequest('get_agent_logs')
    except Exception as e:
        logger.error(f"Get agent logs failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500
# ------------------------------------------------------------------------------------------------------------- #
# ------------------------------------------------------------------------------------------------------------- #
@app.route('/api/test/async', methods=['GET'])
@CheckBlacklist()
async def TestAsync():
    """
    Test endpoint to demonstrate async functionality.
    Makes multiple concurrent requests to the server and measures total time.
    
    Returns:
        JSON response with timing information and results
    """
    try:
        import time
        start_time = time.time()
        
        # Create multiple concurrent tasks
        tasks = [
            ServerRequest('status'),  # Server status
            ServerRequest('get_agents'),  # Get all agents
            DatabaseRequest('CompanyData', doc_id='CompanyProfile'),  # Company profile
            DatabaseRequest('Consultants'),  # All consultants
            DatabaseRequest('CompanyData', doc_id='Tenders')  # All tenders
        ]
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Format results
        response = {
            "total_time_seconds": round(total_time, 3),
            "requests_made": len(tasks),
            "average_time_per_request": round(total_time / len(tasks), 3),
            "results": [
                {
                    "request": task.__name__ if hasattr(task, '__name__') else str(task),
                    "status_code": result[1] if isinstance(result, tuple) else 500,
                    "data": result[0].get_json() if isinstance(result, tuple) else str(result)
                }
                for task, result in zip(tasks, results)
            ]
        }
        
        logger.info(
            "Async test completed",
            extra={
                'total_time': total_time,
                'requests_made': len(tasks),
                'average_time': total_time / len(tasks)
            }
        )
        
        return jsonify(response), 200
    except Exception as e:
        logger.error(f"Async test failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500
# ------------------------------------------------------------------------------------------------------------- #
# ------------------------------------------------------------------------------------------------------------- #

""" @app.teardown_appcontext
@CheckBlacklist()
async def cleanup(exception=None):
    Cleanup resources when the application context is torn down
    if hasattr(current_app, 'connection_pool'):
        await current_app.connection_pool.close() """


if __name__ == '__main__':
    import hypercorn.asyncio
    import hypercorn.config
    import signal
    import sys

    config = hypercorn.config.Config()
    config.bind = ["0.0.0.0:5000"]
    config.use_reloader = True

    async def shutdown():
        print("\nShutting down server and cleaning up ZMQ resources...")
        if hasattr(app, 'connection_pool'):
            await app.connection_pool.close()
        if 'context' in globals():
            context.term()
        print("Cleanup complete. Bye!")

    def handle_exit(*args):
        # Kör shutdown i event loop
        loop = asyncio.get_event_loop()
        loop.run_until_complete(shutdown())
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    try:
        asyncio.run(hypercorn.asyncio.serve(app, config))
    except (KeyboardInterrupt, SystemExit):
        pass
