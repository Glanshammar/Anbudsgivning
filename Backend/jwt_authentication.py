import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)
sys.path.insert(0, current_dir)

import datetime
import jwt
from functools import wraps
from httpcodes import *
from flask import request
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, create_access_token

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")


def GenerateJWT(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=30),
        "iat": datetime.datetime.now(datetime.timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

def VerifyJWT(token):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None, "Token expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"


def JWTAuthentication(f):
    @wraps(f)
    def authentication(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return http_403('Token required.')

        payload, error = VerifyJWT(token)
        if error:
            return http_403(error)
        
        request.user = payload
        return f(*args, **kwargs)

    return authentication