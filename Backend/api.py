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
from Data import Consultant, Company
from Agents import AgentType, AgentManager


app = Flask(__name__)
context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect("tcp://localhost:5001")

def HandleExceptions(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except BadRequest:
            return http_400('Invalid JSON in request body.')
        except (zmq.ZMQError, ConnectionRefusedError):
            return http_503('Server unavailable.')
        except Exception as e:
            app.logger.error(f"Internal Server Error: {str(e)}")
            return http_500('Internal Server Error')
    return wrapper


def Response():
    try:
        response = socket.recv_json()
        return response['data'], response.get('status_code', 200)
    except zmq.error.Again:
        raise TimeoutError("The operation timed out")


@app.route('/server-status', methods=['GET'])
@HandleExceptions
def ServerStatus():
    socket.send_json({
        'command': 'status'
    })
    data, status_code = Response()
    return jsonify(data), status_code


@app.route('/api-status', methods=['GET'])
@HandleExceptions
def ApiStatus():
    http_200('API is Online!')


@app.route('/login', methods=['POST'])
@HandleExceptions
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
@HandleExceptions
def CreateCompany():
    data = request.get_json()

    if not isinstance(data, dict):
        return http_400('Invalid data format. Expected a JSON object.')
    
    command_data = {
        'command': 'create',
        'params': {
            'collection_name': 'Companies',
            'document_data': data
        }
    }
    socket.send_json(command_data)
    data, status_code = Response()
    return jsonify(data), status_code


# @JWTAuthentication
@app.route('/consultant', methods=['POST', 'GET'])
@HandleExceptions
def ConsultantsRequest():
    if request.method == 'POST':
        data = request.get_json()
        command_data = {
            'command': 'create',
            'params': {
                'collection_name': 'Consultants',
                'document_data': data,
                'document_name': request.args.get('docname')
            }
        }
    
        socket.send_json(command_data)
        data, status_code = Response()
        return jsonify(data), status_code
    elif request.method == 'GET':
        document_id = request.args.get('id')
        params = {'collection_name': 'Consultants'}
        
        if document_id:
            params['document_id'] = document_id.strip()
        
        command_data = {
            'command': 'read',
            'params': params
        }
        
        socket.send_json(command_data)
        data, status_code = Response()
        return jsonify(data), status_code


app.run(host='0.0.0.0', port=5000, threaded=True)
