import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

from flask import Flask, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from google.cloud.firestore_v1.base_query import FieldFilter
import zmq
import bcrypt
import re
from functools import wraps
from httpcodes import *
from Data import Consultant, CompanyProfile, Expertise, TenderDocument, TenderPortal
from Agents import AgentType, AgentManager
from Backend.db_app import *
from dotenv import load_dotenv

load_dotenv()
app = CreateApp()
context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect("tcp://localhost:5001")

# Collection name constants
COMPANY_DATA = 'CompanyData'
TENDERS = 'Tenders'
CONSULTANTS = 'Consultants'
# ------------------------------------------------------------------------------------------------------------- #
# --------------------------------------------- Request Functions --------------------------------------------- #
def ProcessRequest(collection_name: str = None, data: dict = None, doc_id: str = None):
    try:
        method_to_command = {
            'POST': 'create',
            'GET': 'read',
            'PUT': 'update',
            'DELETE': 'delete'
        }
        command_type = method_to_command.get(request.method)
        command = {
            'command': command_type,
            'params': {
                'collection_name': collection_name,
                'document_data': data,
                'document_id': doc_id
            }
        }
        socket.send_json(command)
        backend_response = socket.recv_json()
        return jsonify(backend_response["data"]), backend_response.get("status_code", 200)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def Response():
    try:
        response = socket.recv_json()
        return response['data'], response.get('status_code', 200)
    except zmq.error.Again:
        raise TimeoutError("The operation timed out")


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
    socket.send_json({
        'command': 'status'
    })
    response, status_code = Response()
    return jsonify(response), status_code


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
        return ProcessRequest(
            collection_name=CONSULTANTS,
            data=request.get_json(),
            doc_id=doc_id
        )
    elif request.method == 'POST':
        return ProcessRequest(
            collection_name=CONSULTANTS,
            data=request.get_json(),
            doc_id=doc_id
        )
    elif request.method == 'GET':
        return ProcessRequest(
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

        return ProcessRequest(collection_name=COMPANY_DATA,
                              data=availability,
                              doc_id='ConsultantCalendar')
    
    if request.method == 'GET':
        return ProcessRequest(collection_name=COMPANY_DATA,
                              data=None,
                              doc_id='ConsultantCalendar')


@app.route('/api/tenders', methods=['GET', 'POST'])
def TendersRequest():
    if request.method == 'GET':
        return ProcessRequest(collection_name=TENDERS,
                            data=None,
                            doc_id=request.args.get('tender_id'))
    if request.method == 'POST':
        return ProcessRequest(collection_name=TENDERS,
                              data=request.get_json(),
                              doc_id=request.args.get('tender_id'))


@app.route('/api/expertise', methods=['POST', 'GET', 'PUT'])
def ExpertiseRequest():
    if request.method == 'POST':
        return ProcessRequest(collection_name=COMPANY_DATA,
                              data=request.get_json(),
                              doc_id='Expertise')
    elif request.method == 'GET':
        return ProcessRequest(collection_name=COMPANY_DATA,
                              data=None,
                              doc_id='Expertise')
    elif request.method == 'PUT':
        return ProcessRequest(collection_name=COMPANY_DATA,
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
    if request.method == 'POST':
        portals_data = request.get_json().get('portals', [])
        validated_portals = []
        for portal in portals_data:
            portal_obj = TenderPortal(**portal)
            validated_portals.append(portal_obj.to_dict())
        return ProcessRequest(collection_name=COMPANY_DATA,
                             data={"portals": validated_portals},
                             doc_id='TenderPortals')
    
    if request.method == 'PUT':
        return ProcessRequest(collection_name=COMPANY_DATA,
                             data=request.get_json(),
                             doc_id='TenderPortals')
    
    if request.method == 'GET':
        return ProcessRequest(collection_name=COMPANY_DATA,
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
        return ProcessRequest(collection_name=COMPANY_DATA,
                             data=request.get_json(),
                             doc_id='CompanyProfile')
    
    if request.method == 'GET':
        return ProcessRequest(collection_name=COMPANY_DATA,
                             data=None,
                             doc_id='CompanyProfile')
# ------------------------------------------------------------------------------------------------------------- #
# ------------------------------------------------------------------------------------------------------------- #

app.run(host='0.0.0.0', port=5000, threaded=True)
