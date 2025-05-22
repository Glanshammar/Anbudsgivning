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
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(minutes=1)  # Access token expires in 1 minute
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = datetime.timedelta(hours=12)  # Refresh token expires in 12 hours
    app.config["JWT_REFRESH_TOKEN_EXPIRES_INACTIVE"] = datetime.timedelta(minutes=15)  # Refresh token expires after 15 minutes of inactivity
    app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
    app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token"
    app.config["JWT_REFRESH_COOKIE_NAME"] = "refresh_token"
    app.config["JWT_COOKIE_SECURE"] = True
    app.config["JWT_COOKIE_SAMESITE"] = "Strict"  # Or "Lax" if you need cross-site POSTs
    app.config["JWT_COOKIE_CSRF_PROTECT"] = True  # Optional, for extra CSRF protection

    app.db = InitDB(f'{os.path.dirname(os.path.dirname(__file__))}/credentials.json')
    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app)
    return app