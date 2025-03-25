import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from google.cloud.firestore_v1.document import DocumentReference
from opstatus import OpStatus
import os
import shutil
from time import sleep

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
cred_file = os.path.join(root_dir, 'creds.json')
db = None


def GetCollection(collection_name):
    collections = [collection.id for collection in db.collections()]

    if collection_name not in collections:
        print(f"⚠️ Collection '{collection_name}' does not exist in the database.")
        return OpStatus.DOCUMENT_NOT_FOUND

    print(f"✅ Collection '{collection_name}' found.")
    return db.collection(collection_name)


def CreateDocument(collection_name, document_data, document_name=None):
    if not collection_name:
        print("❌ Collection name cannot be empty.")
        return OpStatus.INVALID_INPUT

    if not isinstance(document_data, dict):
        print("❌ Document data must be a dictionary.")
        return OpStatus.INVALID_INPUT

    try:
        collection_ref = db.collection(collection_name)

        if document_name:
            new_doc_ref = collection_ref.document(document_name)
            new_doc_ref.set(document_data)
            print(f"✅ Document added successfully with name: {document_name}")
        else:
            new_doc_ref = collection_ref.add(document_data)[1]
            print(f"✅ Document added successfully with ID: {new_doc_ref.id}")

        return OpStatus.SUCCESS

    except Exception as e:
        print(f"❌ Error adding document: {str(e)}")
        return OpStatus.INVALID_INPUT


def GetDocument(collection_name, document_id):
    collection_ref = db.collection(collection_name)
    documents = [doc.id for doc in collection_ref.stream()]

    document_name = document_id.strip()
    if document_name.isdigit() and 1 <= int(document_name) <= len(documents):
        document_name = documents[int(document_name) - 1]

    doc_ref = collection_ref.document(document_name)
    if not doc_ref.get().exists:
        return OpStatus.DOCUMENT_NOT_FOUND
    return doc_ref


def GetDocuments(collection_name):
    try:
        collection_ref = db.collection(collection_name)
        docs = list(collection_ref.stream())

        if not docs:
            return OpStatus.EMPTY_DOCUMENT
        return docs

    except Exception as e:
        print(f"❌ Error getting documents: {str(e)}")
        return OpStatus.INVALID_INPUT


def UpdateDocument(collection_name, document_id, document_data, merge=True):
    if not collection_name or not document_id:
        print("❌ Collection name and document ID cannot be empty.")
        return OpStatus.INVALID_INPUT

    if not isinstance(document_data, dict):
        print("❌ Document data must be a dictionary.")
        return OpStatus.INVALID_INPUT

    try:
        collection_ref = db.collection(collection_name)
        
        documents = [doc.id for doc in collection_ref.stream()]
        if str(document_id).strip().isdigit():
            doc_index = int(document_id) - 1
            if 0 <= doc_index < len(documents):
                document_id = documents[doc_index]
            else:
                print("❌ Invalid document number.")
                return OpStatus.INVALID_FIELD

        doc_ref = collection_ref.document(document_id)

        if not doc_ref.get().exists:
            print(f"❌ Document '{document_id}' does not exist")
            return OpStatus.DOCUMENT_NOT_FOUND

        doc_ref.set(document_data, merge=merge)
            
        print(f"✅ Document '{document_id}' updated successfully")
        return OpStatus.SUCCESS

    except Exception as e:
        print(f"❌ Error updating document: {str(e)}")
        return OpStatus.INVALID_INPUT


def DeleteDocument(document):
    confirm = input("Are you sure you want to delete the entire document? (y/N): ").strip().lower()
    if confirm == 'y':
        document.delete()
        print("✅ Document deleted.")
        return OpStatus.SUCCESS
    else:
        print("Deletion cancelled.")
        return OpStatus.OPERATION_CANCELLED


def CreateField(document):
    name = input("Enter new field name: ").strip()
    value = input(f"Enter value for '{name}': ").strip()
    
    if not name:
        print("❌ Field name cannot be empty.")
        return OpStatus.INVALID_INPUT
    
    try:
        document.update({name: value})
        print(f"✅ Added '{name}' with value '{value}'.")
        return OpStatus.SUCCESS
    except Exception as e:
        print(f"❌ Error adding field: {str(e)}")
        return OpStatus.INVALID_INPUT


def ReadField(document, field):
    doc = document.get()
    if doc.exists:
        data = doc.to_dict()
        if field in data:
            return data[field]
        else:
            print(f"❌ Field '{field}' not found in document.")
            return OpStatus.INVALID_FIELD
    else:
        print("❌ Document does not exist!")
        return OpStatus.DOCUMENT_NOT_FOUND


def UpdateField(document, fieldID : int, value) -> OpStatus:
    doc = document.get()
    
    if not doc.exists:
        return OpStatus.DOCUMENT_NOT_FOUND
        
    fields = doc.to_dict()
    if not fields:
        return OpStatus.EMPTY_DOCUMENT

    try:
        field_name = list(fields.keys())[fieldID - 1]
    except (IndexError, TypeError):
        return OpStatus.INVALID_FIELD

    try:
        document.update({field_name: value})
        return OpStatus.SUCCESS
    except Exception as e:
        print(f"Update error: {str(e)}")
        return OpStatus.INVALID_FIELD


def DeleteField(document, fieldID: int) -> OpStatus:
    doc = document.get()
    
    if not doc.exists:
        return OpStatus.DOCUMENT_NOT_FOUND
        
    fields = doc.to_dict()
    if not fields:
        return OpStatus.EMPTY_DOCUMENT

    try:
        field_name = list(fields.keys())[fieldID - 1]
    except (IndexError, TypeError):
        return OpStatus.INVALID_FIELD

    try:
        document.update({field_name: firestore.DELETE_FIELD})
        return OpStatus.SUCCESS
    except Exception as e:
        print(f"Deletion error: {str(e)}")
        return OpStatus.INVALID_FIELD


def CollectionAndDocument():
    print("Available Collections:")
    collections = [collection.id for collection in db.collections()]
    for i, collection in enumerate(collections, 1):
        print(f"{i}. {collection}")

    collection = None
    while not collection:
        collection_input = input("Enter collection name or number: ").strip()

        if collection_input.isdigit():
            collection_index = int(collection_input)
            if 1 <= collection_index <= len(collections):
                collection_name = collections[collection_index - 1]
                try:
                    collection = GetCollection(collection_name)
                except Exception as e:
                    print(f"❌ Error: {str(e)}")
            else:
                print("❌ Invalid number. Please choose a valid option.")
        else:
            try:
                collection_name = collection_input
                collection = GetCollection(collection_name)
            except Exception as e:
                print(f"❌ Error: {str(e)}")

    print("\nAvailable Documents:")
    documents = [doc.id for doc in collection.stream()]
    for i, document in enumerate(documents, 1):
        print(f"{i}. {document}")

    document = None
    while not document:
        document_input = input("Enter document name or number: ").strip()
        if document_input.isdigit():
            document_index = int(document_input)
            if 1 <= document_index <= len(documents):
                document_name = documents[document_index - 1]
                document = collection.document(document_name)
            else:
                print("❌ Invalid number. Please choose a valid option.")
        else:
            document = collection.document(document_input)

    return collection, document


def ProcessCommand(command):
    if command.lower() == 'exit':
        return False
    elif command.lower() == 'create':
        collection, _ = CollectionAndDocument()
        document_data = input("Enter document data (as a dictionary): ")
        CreateDocument(collection.id, eval(document_data))
    elif command.lower() == 'read':
        collection, document = CollectionAndDocument()
        print(document.get().to_dict())
    elif command.lower() == 'update':
        collection, document = CollectionAndDocument()
        update_data = input("Enter update data (as a dictionary): ")
        UpdateDocument(collection.id, document.id, eval(update_data))
    elif command.lower() == 'delete':
        collection, document = CollectionAndDocument()
        DeleteDocument(document)
    else:
        print("Unknown command. Available commands: create, read, update, delete, exit")
    return True


if __name__ == '__main__':
    if not os.path.exists(cred_file):
        print(f"Please place the '{cred_file}' in the same directory as this script.")
        cred_path = input("Enter the full path to the credentials file: ").strip()

        if os.path.exists(cred_path):
            shutil.copy(cred_path, cred_file)
            print(f"✅ Credentials file copied to {cred_file}")
        else:
            print(f"⚠️ File not found at {cred_path}. Please check the path and try again.")
            exit(1)
    else:
        print("✅ Credentials found.")

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_file)
        firebase_admin.initialize_app(cred)

    db = firestore.client()

    while True:
        collection, document = CollectionAndDocument()
        print(document)
        sleep(60)