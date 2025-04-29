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
import userpaths

db = None

class ApiConfig:
    def __init__(self, firebase_cred_path=f"{root_dir}/credentials.json", debug=False, secret_key=os.getenv('SECRET_KEY')):
        self.FIREBASE_CRED_PATH = firebase_cred_path
        self.DEBUG = debug
        self.SECRET_KEY = secret_key

def InitDB(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    return firestore.client()

def CreateApp(config=None, firebase_cred_path=None):
    global db
    app = Flask(__name__)
    if config is not None:
        app.config.from_object(config)
    app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
    app.db = InitDB(app.config['FIREBASE_CRED_PATH'])
    db = app.db
    return app
