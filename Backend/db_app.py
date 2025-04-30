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

db = None

def InitDB(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    return firestore.client()

def CreateApp(config=None):
    global db
    app = Flask(__name__)
    if config is not None:
        app.config.from_object(config)
    app.db = InitDB(f'{root_dir}/credentials.json')
    db = app.db
    return app
