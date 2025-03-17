from flask import Flask, jsonify, request
from httpcodes import *
from database import db, get_document, get_collection, add_document, print_all_documents
from users import add_user, update_user, delete_user, view_users

app = Flask(__name__)

@app.route('/status', methods=['GET'])
def Status():
    return ok_200()

@app.route('/document/<collection>/<documentID>', methods=['GET'])
def DocumentGet(collection, documentID):
    try:
        doc_ref = get_document(collection_name=collection, document_id=documentID)
        doc = doc_ref.get()
        if doc.exists:
            return ok_200(doc.to_dict())
        else:
            return not_found_404('Document not found')
    except Exception as e:
        return internal_server_error_500(str(e))


@app.route('/print/<collection>', methods=['GET'])
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

        return jsonify({
            "collection": collection,
            "documents": documents
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/document/<collection>/<documentID>', methods=['POST'])
def DocumentCreate(collection, documentID):
    try:
        data = request.get_json()

        if not data:
            return bad_request_400('No data provided')

        document_id = add_document(collection_name=collection, document_data=data, document_name=documentID)

        return jsonify({"message": "Document created successfully", "id": document_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/document/<collection>/<documentID>', methods=['PUT'])
def DocumentUpdate(collection, documentID, data):
    return not_found_404('Document update not implemented.')


@app.route('/users', methods=['POST'])
def UserAdd():
    try:
        user_data = request.get_json()
        if not user_data:
            return bad_request_400("No user data provided")

        # Call the add_user function with the received data
        new_user_id = add_user(user_data)

        return jsonify({"message": "User added successfully", "id": new_user_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/users/', methods=['GET'])
def UsersGet():
    return view_users()

@app.route('/users/<userID>', methods=['DELETE'])
def UserDelete(userID):
    return no_content_204()

@app.route('/users/<userID>', methods=['PUT'])
def UserUpdate(userID, data):
    return ok_200('User updated successfully.')


app.run(debug=True, host='0.0.0.0', port=5000)
