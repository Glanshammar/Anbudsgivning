import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)
sys.path.insert(0, current_dir)

import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask
from .jwt_authentication import JWT_SECRET_KEY

def InitDB(cred_path):
    if not firebase_admin._apps:  # Check if already initialized
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firestore.client()

def CreateApp(config=None):
    app = Flask(__name__)
    
    if config:
        app.config.from_object(config)
    
    # Initialize Firebase and assign to app context
    app.db = InitDB(f'{os.path.dirname(os.path.dirname(__file__))}/credentials.json')
    
    return app