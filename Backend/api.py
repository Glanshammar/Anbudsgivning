import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

from flask import Flask, request, jsonify
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


@app.route('/status', methods=['GET'])
def Status():
    return http_200()

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
def CreateCompany():
    try:
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid data format. Expected a JSON object."}), 400
        command_data = {
            'command': 'create',
            'params': {
                'collection_name': 'Companies',
                'document_data': data
            }
        }
        socket.send_json(command_data)
        response = socket.recv_json()
        
        if isinstance(response, int):
            return jsonify({"error": "Unexpected response from server"}), 500
        
        if "message" in response:
            return jsonify({"message": response["message"]}), 201
        else:
            return jsonify({"error": response.get("error", "Unknown error")}), 400
    
    except Exception as e:
        return jsonify({"exception": str(e)}), 400


# @JWTAuthentication
@app.route('/consultant', methods=['POST', 'GET'])
def ConsultantsRequest():
    if request.method == 'POST':
        try:
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
            response = socket.recv_json()
            
            if "message" in response:
                return jsonify({"message": response["message"]}), 201
            else:
                return jsonify({"error": response.get("error", "Unknown error")}), 400
        except Exception as e:
            return jsonify({"exception": str(e)}), 400
    
    elif request.method == 'GET':
        try:
            document_id = request.args.get('id')
            params = {'collection_name': 'Consultants'}
            
            if document_id:
                params['document_id'] = document_id.strip()
            
            command_data = {
                'command': 'read',
                'params': params
            }
            
            socket.send_json(command_data)
            response = socket.recv_json()
            
            if isinstance(response, dict) and "error" not in response:
                return jsonify(response), 200
            else:
                return jsonify({"error": response.get("error", "Failed to retrieve data")}), 400
        
        except Exception as e:
            return jsonify({"exception": str(e)}), 400
    

app.run(host='0.0.0.0', port=5000, threaded=True)
