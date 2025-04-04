import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

from flask import Flask, request, jsonify
from werkzeug.exceptions import BadRequest
from jwt_authentication import *
import jwt
import zmq
from functools import wraps
from httpcodes import *
from Data import Consultant, Company, Expertise
from Agents import AgentType, AgentManager


app = Flask(__name__)
context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect("tcp://localhost:5001")


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


def ValidateModel(model_class):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
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

def Response():
    try:
        response = socket.recv_json()
        return response['data'], response.get('status_code', 200)
    except zmq.error.Again:
        raise TimeoutError("The operation timed out")


@app.route('/server-status', methods=['GET'])
def ServerStatus():
    socket.send_json({
        'command': 'status'
    })
    response, status_code = Response()
    return jsonify(response), status_code


@app.route('/api-status', methods=['GET'])
def ApiStatus():
    http_200('API is Online!')


@app.route('/login', methods=['POST'])
def Login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    if username == "admin" and password == "password":
        token = GenerateJWT(user_id=1)
        return http_200(token)
    return http_401('Invalid credentials.')


# @JWTAuthentication
@app.route('/company', methods=['POST'])
@ValidateModel(Company)
def CreateCompany():
    return ProcessRequest(action='create', collection_name='Company', data=request.get_json(), doc_id='Company Info')


# @JWTAuthentication
@app.route('/consultant', methods=['POST', 'GET'])
@ValidateModel(Consultant)
def ConsultantsRequest():
    if request.method == 'POST':
        return ProcessRequest(action='create', 
                            collection_name='Consultants',
                            data=request.get_json(),
                            doc_id=request.args.get('docname'))
    elif request.method == 'GET':
        return ProcessRequest(action='read',
                            collection_name='Consultants',
                            data=None,
                            doc_id=None)


@app.route('/expertise', methods=['POST', 'GET', 'PUT'])
def ModelsRequest():
    if request.method == 'POST':
        return ProcessRequest(action='create',
                              collection_name='Company',
                              data=request.get_json(),
                              doc_id='Expertise')
    elif request.method == 'GET':
        return ProcessRequest(action='read',
                              collection_name='Company',
                              data=None,
                              doc_id='Expertise')
    elif request.method == 'PUT':
        return ProcessRequest(action='update',
                              collection_name='Company',
                              data=request.get_json(),
                              doc_id='Expertise')


app.run(host='0.0.0.0', port=5000, threaded=True)
