import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

from flask import Flask, request, jsonify
from werkzeug.exceptions import BadRequest
from jwt_authentication import *
from google.cloud import firestore
import zmq
import secrets
import bcrypt
import re
from functools import wraps
from httpcodes import *
from Data import Consultant, Company, Expertise
from Agents import AgentType, AgentManager
from Backend.db_app import *

config = ApiConfig()
app = CreateApp(config)
context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect("tcp://localhost:5001")

# Collection name constants
COMPANY_DATA = 'CompanyData'
TENDERS = 'Tenders'
CONSULTANTS = 'Consultants'
# ------------------------------------------------------------------------------------------------------------- #
# --------------------------------------------- API Key Functions --------------------------------------------- #
def GenerateApiKey():
    return f"sk_{secrets.token_urlsafe(32)}"


def StoreApiKeys(user_id: str, permissions: list):
    raw_key = GenerateApiKey()
    hashed_key = bcrypt.hashpw(raw_key.encode(), bcrypt.gensalt()).decode()
    
    db.collection('api_keys').add({
        'user_id': user_id,
        'key_hash': hashed_key,
        'permissions': permissions,
        'created_at': firestore.SERVER_TIMESTAMP,
        'last_used': None,
        'is_active': True
        })
    return raw_key


def ApiKeyRequired(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not api_key:
            return jsonify(error="Missing API key"), 401

        docs = db.collection('api_keys').where('is_active', '==', True).stream()
        for doc in docs:
            key_data = doc.to_dict()
            if bcrypt.checkpw(api_key.encode(), key_data['key_hash'].encode()):
                request.key_meta = key_data
                return f(*args, **kwargs)
        
        return jsonify(error="Invalid API key"), 401
    return decorated
# ------------------------------------------------------------------------------------------------------------- #
# --------------------------------------------- Request Functions --------------------------------------------- #

def ProcessRequest(action: str =None, collection_name: str =None, data: dict =None, doc_id:str =None):
    try:
        command = {
            'command': action,
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
@app.route('/protected', methods=['GET'])
@jwt_required()
def Protected():
    current_user = get_jwt_identity()
    return jsonify(logged_in_as=current_user), 200


@app.route('/keys', methods=['POST'])
def CreateKey():
    user_id = get_jwt_identity()
    raw_key = StoreApiKeys(user_id, permissions=['read:basic'])
    return jsonify(api_key=raw_key), 201


@app.route('/keys/<key_id>', methods=['DELETE'])
def RevokeKey(key_id):
    db.collection('api_keys').document(key_id).update({'is_active': False})
    return jsonify(status="revoked"), 200


@app.route('/server-status', methods=['GET'])
def ServerStatus():
    socket.send_json({
        'command': 'status'
    })
    response, status_code = Response()
    return jsonify(response), status_code


@app.route('/api-status', methods=['GET'])
def ApiStatus():
    return http_200('API is Online!')


@app.route('/register', methods=['POST'])
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
    users_ref = db.collection('Users')
    existing_users = list(users_ref.where('username', '==', username).stream())
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


@app.route('/login', methods=['POST'])
def Login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return http_401("Username and password required.")

    # Query Firestore for user document
    users_ref = db.collection('Users')
    user_query = users_ref.where('username', '==', username).limit(1).stream()
    user_doc = next(user_query, None)

    if not user_doc:
        return http_401("Invalid credentials.")

    user_data = user_doc.to_dict()
    stored_hash = user_data.get("password")

    # Verify password using bcrypt
    if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
        return http_401("Invalid credentials.")

    # Generate JWT with user ID or username (never include password)
    token = GenerateJWT(user_id=user_doc.id)
    return jsonify(token=token), 200


@app.route('/company', methods=['POST', 'GET'])
@ValidateModel(Company)
def Company():
    if request.method == 'POST':
        return ProcessRequest(
            action='create', 
            collection_name=COMPANY_DATA, 
            data=request.get_json(), 
            doc_id='Info')
    elif request.method == 'GET':
        return ProcessRequest(action='read', 
                              collection_name='CompanyList', 
                              data=None, 
                              doc_id=request.args.get('id'))


@app.route('/consultant/<string:doc_id>', methods=['PUT'])
def UpdateConsultant(doc_id):
    data = request.get_json()
    return ProcessRequest(
        action="update",
        collection_name=CONSULTANTS,
        data=data,
        doc_id=doc_id
    )


@app.route('/consultants', methods=['POST', 'GET'])
@ValidateModel(Consultant)
def ConsultantsRequest():
    if request.method == 'POST':
        return ProcessRequest(action='create', 
                            collection_name=CONSULTANTS,
                            data=request.get_json(),
                            doc_id=request.args.get('id'))
    elif request.method == 'GET':
        return ProcessRequest(action='read',
                            collection_name=CONSULTANTS,
                            data=None,
                            doc_id=None)


@app.route('/calendar', methods=['POST', 'GET'])
def BusinessCalendar():
    if request.method == 'POST':
        data = request.get_json()
        availability = data.get("availability")
        
        if not isinstance(availability, dict):
            return http_400("Invalid input: 'availability' must be a dictionary.")

        return ProcessRequest(
            action='create',
            collection_name=COMPANY_DATA,
            data=availability,
            doc_id='ConsultantCalendar'
        )
    
    if request.method == 'GET':
        return ProcessRequest(
            action='read',
            collection_name=COMPANY_DATA,
            data=None,
            doc_id='ConsultantCalendar'
        )


@app.route('/tenders', methods=['GET', 'POST'])
def TendersRequest():
    if request.method == 'GET':
        return ProcessRequest(action='read',
                            collection_name=TENDERS,
                            data=None,
                            doc_id=request.args.get('tender_id'))
    if request.method == 'POST':
        return ProcessRequest(action='create',
                              collection_name=TENDERS)


@app.route('/expertise', methods=['POST', 'GET', 'PUT'])
def ExpertiseRequest():
    if request.method == 'POST':
        return ProcessRequest(action='create',
                              collection_name=COMPANY_DATA,
                              data=request.get_json(),
                              doc_id='Expertise')
    elif request.method == 'GET':
        return ProcessRequest(action='read',
                              collection_name=COMPANY_DATA,
                              data=None,
                              doc_id='Expertise')
    elif request.method == 'PUT':
        return ProcessRequest(action='update',
                              collection_name=COMPANY_DATA,
                              data=request.get_json(),
                              doc_id='Expertise')

@app.route('/tender-portals', methods=['POST', 'GET'])
def SetTenderPortals():
    if request.method == 'POST':
        return ProcessRequest(action='create',
                              collection_name=COMPANY_DATA,
                              data=request.get_json(),
                              doc_id='TenderPortals')
    if request.method == 'GET':
        return ProcessRequest(action='read',
                              collection_name=COMPANY_DATA,
                              data=None,
                              doc_id='TenderPortals')
# ------------------------------------------------------------------------------------------------------------- #
# ------------------------------------------------------------------------------------------------------------- #

app.run(host='0.0.0.0', port=5000, threaded=True)
