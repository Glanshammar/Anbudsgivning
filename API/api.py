from flask import Flask, request, jsonify
from httpcodes import *
from Database.database import db, GetDocument, AddDocument, DeleteDocument
from Database.users import AddUser, UpdateUser, GetUsers, GetUserByID
import threading

app = Flask(__name__)


@app.route('/status', methods=['GET'])
def Status():
    return http_200()

@app.route('/threads', methods=['GET'])
def Threads():
    return threading.active_count()

@app.route('/document/<collection>/<documentID>', methods=['GET'])
def DocumentGetById(collection, documentID):
    try:
        doc_ref = GetDocument(collection_name=collection, document_id=documentID)
        doc = doc_ref.get()
        if doc.exists:
            return http_200(doc.to_dict())
        else:
            return http_404('Document not found')
    except Exception as e:
        return http_500(str(e))


@app.route('/document/<collection>', methods=['GET'])
def DocumentGetAll(collection):
    try:
        collection_ref = db.collection(collection)
        docs = collection_ref.stream()

        documents = []
        for doc in docs:
            documents.append({
                "id": doc.id,
                "data": doc.to_dict()
            })

        return http_200({
            "collection": collection,
            "documents": documents
        })
    except Exception as e:
        return http_500(str(e))


@app.route('/document/<collection>/<documentID>', methods=['POST'])
def DocumentCreate(collection, documentID):
    try:
        data = request.get_json()

        if not data:
            return http_400('No data provided')

        document_id = AddDocument(collection_name=collection, document_data=data, document_name=documentID)

        return http_200(f"{document_id} was created.")
    except Exception as e:
        return http_500(str(e))


@app.route('/document/<collection>/<documentID>', methods=['PUT'])
def DocumentUpdate(collection, documentID):
    data = request.get_json()


@app.route('/users', methods=['POST'])
def UserAdd():
    try:
        user_data = request.get_json()
        if not user_data:
            return http_400("No user data provided")

        # Call the add_user function with the received data
        new_user_id = AddUser(user_data)

        return jsonify({"message": "User added successfully", "id": new_user_id}), 201
    except Exception as e:
        return http_500(str(e))


@app.route('/users/', methods=['GET'])
def UsersGet():
    try:
        return jsonify(GetUsers()), 200
    except Exception as e:
        return http_500(str(e))


@app.route('/users/<userID>', methods=['GET'])
def UserGetById(userID):
    try:
        user_data = GetUserByID(userID)

        if user_data:
            return jsonify(user_data), 200
        else:
            return http_404('User not found')
    except Exception as e:
        return http_500(str(e))


@app.route('/users/<userID>', methods=['DELETE'])
def UserDelete(userID):
    try:
        user_ref = db.collection('Users').document(userID)
        if not user_ref.get().exists:
            return http_404('User not found')

        user_ref.delete()
        return http_204()
    except Exception as e:
        return http_500(str(e))


@app.route('/users/<userID>', methods=['PUT'])
def UserUpdate(userID):
    try:
        data = request.get_json()
        if not data:
            return http_400("No update data provided")

        updated = UpdateUser(userID, data)
        if updated:
            return http_200("User updated successfully")
        else:
            return http_404('User not found')
    except Exception as e:
        return http_500(str(e))


app.run(host='0.0.0.0', port=5000, threaded=True)
