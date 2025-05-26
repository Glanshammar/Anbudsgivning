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
from flask import Flask, request, jsonify, current_app
from flask_cors import CORS
from flask_login import login_user, logout_user, login_required, current_user
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
import secrets
import inspect


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


load_dotenv()
app = CreateApp()


CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})


context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect("tcp://localhost:5001")


with app.app_context():
    pass

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
            pass
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

    # Generate a secure validation code
    validation_code = secrets.token_urlsafe(8)

    # Store user in Firestore with validated=False and validation_code
    user_data = {
        "username": username,
        "email": email,
        "password": hashed_pw,
        "validated": False,
        "validation_code": validation_code
    }
    user_ref = users_ref.add(user_data)
    logger.info(f"User registered: {username}", extra={'user_id': user_ref[1].id})
    # For now, return the code in the response
    return jsonify({"message": "User registered successfully. Please validate your account.", "validation_code": validation_code}), 201


@app.route('/api/user/login', methods=['POST'])
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
        return http_401("Account not validated. Please validate your account before logging in.")

    print(f"User validated: {user_obj.validated}")
    login_user(user_obj)
    logger.info(f"User logged in: {username}", extra={'user_id': user_obj.id})
    return jsonify({"message": "Login successful"}), 200

@app.route('/api/user/logout', methods=['POST'])
@login_required
async def Logout() -> Tuple[Dict[str, Any], int]:
    logout_user()
    return jsonify({"message": "Successfully logged out"}), 200

@app.route('/api/user/profile', methods=['GET'])
@login_required
async def GetProfile():
    try:
        current_user_id = current_user.get_id()
        logger.info(f"Getting profile for user: {current_user_id}", extra={'user_id': current_user_id})
        return await DatabaseRequest(collection_name=USERS, data=None, doc_id=current_user_id)
    except Exception as e:
        logger.error(f"Get profile failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/profile', methods=['PUT'])
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


@app.route('/api/user/validate', methods=['POST'])
async def ValidateUser() -> Tuple[Dict[str, Any], int]:
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    code = data.get("validation_code")

    if not code or (not username and not email):
        return http_400("Username or email and validation code are required.")

    users_ref = current_app.db.collection(USERS)
    query = None
    if username:
        query = users_ref.where(filter=FieldFilter('username', '==', username)).limit(1)
    elif email:
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

    if request.method == 'GET':
        logger.info(f"Getting tenders for user: {current_user_id}", extra={'user_id': current_user_id})
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
            logger.info(f"Creating new tenders {validated_tenders} for user: {current_user_id}", extra={'user_id': current_user_id})
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
            logger.info(f"Updating tenders {combined_tenders} for user: {current_user_id}", extra={'user_id': current_user_id})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                data={"tenders": combined_tenders},
                                doc_id='Tenders')

    elif request.method == 'DELETE':
        try:
            logger.info(f"Deleting tenders for user: {current_user_id}", extra={'user_id': current_user_id})
            return await DatabaseRequest(
                collection_name=COMPANY_DATA,
                doc_id='Tenders'
            )
        except Exception as e:
            logger.error(f"Error deleting tenders: {str(e)}", extra={'error': str(e)})
            return jsonify({"error": str(e)}), 500


@app.route('/api/expertise', methods=['POST', 'GET', 'PUT'])
@login_required
async def ExpertiseRequest():
    try:
        current_user_id = current_user.get_id()
        
        if request.method == 'POST':
            logger.info(f"Creating expertise by user: {current_user_id}", extra={'user_id': current_user_id})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                  data=request.get_json(),
                                  doc_id='Expertise')
        elif request.method == 'GET':
            logger.info(f"Getting expertise by user: {current_user_id}", extra={'user_id': current_user_id})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                  data=None,
                                  doc_id='Expertise')
        elif request.method == 'PUT':
            logger.info(f"Updating expertise by user: {current_user_id}", extra={'user_id': current_user_id})
            return await DatabaseRequest(collection_name=COMPANY_DATA,
                                  data=request.get_json(),
                                  doc_id='Expertise')
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
    current_user_id = current_user.get_id()

    if request.method == 'GET':
        logger.info(f"Getting portals for user: {current_user_id}", extra={'user_id': current_user_id})
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                             data=None,
                             doc_id='TenderPortals')

    portals_data = request.get_json().get('portals', [])
    validated_portals = []
    for portal in portals_data:
        portal_obj = TenderPortal(**portal)
        validated_portals.append(portal_obj.to_dict())

    if request.method == 'POST':
        logger.info(f"Creating new portals {validated_portals} for user: {current_user_id}", extra={'user_id': current_user_id})
        return await DatabaseRequest(collection_name=COMPANY_DATA,
                             data={"portals": validated_portals},
                             doc_id='TenderPortals')
    
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
                             doc_id='TenderPortals')


@app.route('/api/company', methods=['GET', 'POST', 'PUT', 'DELETE'])
@login_required
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
# ------------------------------------------------------------------------------------------------------------- #
# --------------------------------------------- Agent Management ---------------------------------------------- #
@app.route('/api/agents', methods=['POST', 'GET', 'DELETE'])
@login_required
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

@app.route('/api/agents/logs', methods=['GET'])
@login_required
async def GetAgentLogs():
    try:
        return await ServerRequest('get_agent_logs')
    except Exception as e:
        logger.error(f"Get agent logs failed: {str(e)}", extra={'error': str(e)})
        return jsonify({"error": str(e)}), 500
# ------------------------------------------------------------------------------------------------------------- #
# ------------------------------------------------------------------------------------------------------------- #
@app.route('/api/test/wait', methods=['GET'])
async def TestWait():
    await asyncio.sleep(15)
    return http_200('Wait test done.')


@app.route('/api/test/async', methods=['GET'])
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

@app.teardown_appcontext
async def cleanup(exception=None):
    """Cleanup resources when the application context is torn down"""
    if hasattr(current_app, 'connection_pool'):
        await current_app.connection_pool.close()


@app.login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"message": "You must be logged in to access this resource."}), 401


if __name__ == '__main__':
    import hypercorn.asyncio
    import hypercorn.config
    
    config = hypercorn.config.Config()
    config.bind = ["0.0.0.0:5000"]
    config.use_reloader = True

    asyncio.run(hypercorn.asyncio.serve(app, config))