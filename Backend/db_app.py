import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)
sys.path.insert(0, current_dir)

import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask
import datetime

def InitDB(cred_path):
    if not firebase_admin._apps:  # Check if already initialized
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firestore.client()

def CreateApp(config=None):
    app = Flask(__name__)
    
    if config:
        app.config.from_object(config)
    
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(minutes=30)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = datetime.timedelta(days=7)

    app.db = InitDB(f'{os.path.dirname(os.path.dirname(__file__))}/credentials.json')
    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app)
    return app