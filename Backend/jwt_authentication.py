import datetime
import jwt
from functools import wraps
from httpcodes import *
from flask import request

SECRET_KEY = 'super_secret_key'

def GenerateJWT(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=30),
        "iat": datetime.datetime.now(datetime.timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def VerifyJWT(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
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