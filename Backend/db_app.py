import os
import sys
from pathlib import Path
import json
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)
sys.path.insert(0, current_dir)

import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, jsonify
import datetime
from flask_login import LoginManager, UserMixin
from typing import Optional
import secrets
from datetime import datetime, timedelta

"""
Configuration loading order for CreateApp:
1. If a config object is passed, use it (highest precedence)
2. If a config file exists (config.json or config.yaml in the project root), load and apply its values
3. Set default values for any missing config keys

Supported config file formats: JSON (config.json) and YAML (config.yaml)

This module also sets up Flask-Login and provides a User class for session management.
"""

def InitDB(cred_path):
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firestore.client()

def CreateApp(config=None):
    app = Flask(__name__)
    
    # 1. Use passed config object if present
    if config:
        app.config.from_object(config)
    else:
        # 2. Try to load from config file
        root = Path(__file__).parent.parent
        config_json = root / 'config.json'
        config_yaml = root / 'config.yaml'
        loaded_config = {}
        if config_json.exists():
            with config_json.open() as f:
                loaded_config = json.load(f)
        elif config_yaml.exists() and HAS_YAML:
            with config_yaml.open() as f:
                loaded_config = yaml.safe_load(f)
        if loaded_config:
            app.config.update(loaded_config)
    
    # 3. Set defaults for any missing config keys
    # Always set a SECRET_KEY for Flask sessions. If not set in env or config, generate a random one at runtime.
    # This ensures the app works for everyone, but warns if a persistent key is not set (important for production).
    secret_key = os.getenv("SECRET_KEY")
    if not secret_key:
        secret_key = loaded_config.get("SECRET_KEY") if 'loaded_config' in locals() else None
    if not secret_key:
        import warnings
        secret_key = secrets.token_hex(32)
        warnings.warn("No SECRET_KEY set in environment or config. Using a random key. Sessions will not persist across restarts. Set SECRET_KEY for production.")
    app.config["SECRET_KEY"] = secret_key
    app.config.setdefault("PERMANENT_SESSION_LIFETIME", timedelta(hours=12))
    app.config['SESSION_REFRESH_EACH_REQUEST'] = True
    app.config.setdefault("SESSION_COOKIE_HTTPONLY", True)
    app.config.setdefault("SESSION_COOKIE_SECURE", True)
    app.config.setdefault("SESSION_COOKIE_SAMESITE", "Strict")

    app.db = InitDB(f'{os.path.dirname(os.path.dirname(__file__))}/credentials.json')

    # --- Flask-Login Setup ---
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'Login'

    USERS = 'Users'

    class User(UserMixin):
        def __init__(
            self,
            user_id: str,
            username: str,
            email: str,
            validated: bool = False
        ):
            self.id = user_id
            self.username = username
            self.email = email
            self.validated = validated

        def get_id(self) -> str:
            return str(self.id)

        @classmethod
        def get(cls, user_id: str) -> Optional["User"]:
            """Load user from Firestore by user_id."""
            from flask import current_app
            user_doc = current_app.db.collection(USERS).document(user_id).get()
            if user_doc.exists:
                data = user_doc.to_dict()
                return cls(
                    user_id=user_doc.id,
                    username=data.get('username'),
                    email=data.get('email'),
                    validated=data.get('validated', False)
                )
            return None

        @classmethod
        def authenticate(cls, username: str, password: str) -> Optional["User"]:
            """Authenticate user by username and password."""
            from flask import current_app
            from google.cloud.firestore_v1.base_query import FieldFilter
            import bcrypt
            users_ref = current_app.db.collection(USERS)
            user_docs = users_ref.where(filter=FieldFilter('username', '==', username)).limit(1).stream()
            user_doc = next(user_docs, None)
            if user_doc:
                user_data = user_doc.to_dict()
                if bcrypt.checkpw(password.encode(), user_data.get('password', '').encode()):
                    return cls(
                        user_id=user_doc.id,
                        username=user_data.get('username'),
                        email=user_data.get('email'),
                        validated=user_data.get('validated', False)
                    )
            return None

    @login_manager.user_loader
    def load_user(user_id):
        return User.get(user_id)

    # Attach User class to app for import elsewhere
    app.User = User
    return app