import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

from flask import Flask, request, jsonify
from httpcodes import *
from Data import Consultant, Company
from Agents import AgentType, AgentManager


app = Flask(__name__)


@app.route('/status', methods=['GET'])
def Status():
    return http_200()

@app.route('/api', methods=['GET'])
def api():
    name = request.args.get('name')
    age = request.args.get('age', type=int)

    return f"Name: {name}, Age: {age}"

@app.route('/agent', methods=['POST'])
def Agent():
    name = request.args.get('name')
    agent_type = request.args.get('type')
    task = request.args.get('task')
    manager = AgentManager

@app.route('/company', methods=['POST'])
def CreateCompany():
    try:
        data = request.get_json()
        new_company = Company(**data)
        company_id = Company.AddCompany(new_company)
        return jsonify({"message": "Company created successfully", "id": company_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/consultant', methods=['POST'])
def CreateConsultant():
    try:
        data = request.get_json()
        new_consultant = Consultant(**data)
        consultant_id = Consultant.AddConsultant(new_consultant)
        return jsonify({"message": "Consultant created successfully", "id": consultant_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    

app.run(host='0.0.0.0', port=5000, threaded=True)
