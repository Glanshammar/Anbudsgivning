import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from google.cloud.firestore_v1.document import DocumentReference
import datetime
import os
import re

script_dir = os.path.dirname(os.path.abspath(__file__))
cred_file = os.path.join(script_dir, 'creds.json')

if not os.path.exists(cred_file):
    print(f"Please place the '{cred_file}' in the same directory as this script.")
    cred_path = input("Enter the full path to the credentials file: ").strip()

    if os.path.exists(cred_path):
        import shutil

        shutil.copy(cred_path, cred_file)
        print(f"✅ Credentials file copied to {cred_file}")
    else:
        print(f"⚠️ File not found at {cred_path}. Please check the path and try again.")
        exit(1)
else:
    print("✅ Credentials found.")

# Initialize Firestore
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_file)
    firebase_admin.initialize_app(cred)

db = firestore.client()


def get_collection(collection_name):
    collections = [collection.id for collection in db.collections()]

    if collection_name not in collections:
        print(f"⚠️ Collection '{collection_name}' does not exist in the database.")
        return None

    print(f"✅ Collection '{collection_name}' found.")
    return db.collection(collection_name)


def get_document(collection_name, document_id):
    documents = [doc.id for doc in db.collection(collection_name).stream()]
    '''
    print("\nAvailable Documents:")
    for i, document in enumerate(documents, 1):
        print(f"{i}. {document}")
    '''

    document_name = document_id.strip()
    if document_name.isdigit() and 1 <= int(document_name) <= len(documents):
        document_name = documents[int(document_name) - 1]

    return db.collection(collection_name).document(document_name)


def print_all_documents(collection_name):
    try:
        collection_ref = db.collection(collection_name)
        docs = collection_ref.stream()

        print(f"Documents in collection '{collection_name}':")
        for doc in docs:
            print(f"Document ID: {doc.id}")
            print(f"Data: {doc.to_dict()}")
            print("-" * 40)

    except Exception as e:
        print(f"❌ Error printing documents: {str(e)}")


def add_document(collection_name, document_data, document_name=None):
    if not collection_name:
        raise ValueError("Collection name cannot be empty.")

    if not isinstance(document_data, dict):
        raise ValueError("Document data must be a dictionary.")

    try:
        collection_ref = db.collection(collection_name)

        if document_name:
            new_doc_ref = collection_ref.document(document_name)
            new_doc_ref.set(document_data)
            print(f"✅ Document added successfully with name: {document_name}")
        else:
            new_doc_ref = collection_ref.add(document_data)[1]
            print(f"✅ Document added successfully with ID: {new_doc_ref.id}")

        return new_doc_ref.id

    except Exception as e:
        print(f"❌ Error adding document: {str(e)}")
        raise


def delete_document(document):
    confirm = input("Are you sure you want to delete the entire document? (y/N): ").strip().lower()
    if confirm == 'y':
        document.delete()
        print("✅ Document deleted.")
    else:
        print("Deletion cancelled.")

def add_field(document):
    name = input("Enter new field name: ").strip()
    value = input(f"Enter value for '{name}': ").strip()
    document.update({name: value})
    print(f"✅ Added '{name}' with value '{value}'.")


def read_document(document):
    doc = document.get()
    if not doc.exists:
        print("The document does not exist.")
        return

    data = doc.to_dict()
    if not data:
        print("The document is empty.")
        return

    print("\nCurrent fields:")
    for i, (key, value) in enumerate(data.items(), 1):
        if isinstance(value, DocumentReference):
            # Handle single document reference
            ref_doc = value.get()
            print(f"{i}. {key}:")
            print(f"   └── Referenced document: {value.path}")
            print(f"       Data: {ref_doc.to_dict() if ref_doc.exists else '[Missing document]'}")
        elif isinstance(value, list) and all(isinstance(item, DocumentReference) for item in value):
            # Handle list of document references
            print(f"{i}. {key}:")
            for ref in value:
                ref_doc = ref.get()
                print(f"   ├── Reference: {ref.path}")
                print(f"   │   Data: {ref_doc.to_dict() if ref_doc.exists else '[Missing document]'}")
        else:
            print(f"{i}. {key}: {value}")

def view_all_fields(document):
    doc = document.get()
    if doc.exists:
        data = doc.to_dict()
        if data:
            print("\nCurrent fields:")
            for i, (key, value) in enumerate(data.items(), 1):
                print(f"{i}. {key}: {value}")
        else:
            print("The document is empty.")
    else:
        print("The document does not exist.")


def read_field(document):
    name = input("Enter field name to read: ").strip()
    doc = document.get()
    if doc.exists:
        data = doc.to_dict()
        if name in data:
            print(f"{name}: {data[name]}")
        else:
            print(f"Field '{name}' does not exist in the document.")
    else:
        print("Document does not exist!")

def update_field(document):
    view_all_fields(document)
    doc = document.get()
    if doc.exists and doc.to_dict():
        try:
            choice = int(input("\nEnter the number of the field to update: "))
            fields = list(doc.to_dict().keys())
            name = fields[choice - 1]
            value = input(f"Enter new value for '{name}': ").strip()
            document.update({name: value})
            print(f"✅ Updated '{name}' to '{value}'.")
        except (ValueError, IndexError):
            print("Invalid selection. Please try again.")
    else:
        print("No fields to update.")

# Delete Field Operation
def delete_field(document):
    view_all_fields(document)
    doc = document.get()
    if doc.exists and doc.to_dict():
        try:
            choice = int(input("\nEnter the number of the field to delete: "))
            fields = list(doc.to_dict().keys())
            name = fields[choice - 1]
            document.update({name: firestore.DELETE_FIELD})
            print(f"✅ Deleted field '{name}'.")
        except (ValueError, IndexError):
            print("Invalid selection. Please try again.")
    else:
        print("No fields to delete.")


def collection_and_document():
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
                    collection = get_collection(collection_name)
                except Exception as e:
                    print(f"❌ Error: {str(e)}")
            else:
                print("❌ Invalid number. Please choose a valid option.")
        else:
            try:
                collection_name = collection_input
                collection = get_collection(collection_name)
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


def db_main():
    collection, document = collection_and_document()
    print("\n--- CRUD Operations ---")
    print("1. Create Field")
    print("2. Read Entire Document")
    print("3. Read Specific Field")
    print("4. Update Field")
    print("5. Delete Field")
    print("6. Exit")

    while True:
          choice = input("Enter your choice (1-6): ").strip()

          match choice:
              case '1':
                  add_field(document)
              case '2':
                  read_document(document)
              case '3':
                  read_field(document)
              case '4':
                  update_field(document)
              case '5':
                  delete_field(document)
              case '6':
                  print("Exiting...")
                  break
              case _:
                  print("Invalid choice. Please try again.")

def add_user():
    print('Method not added.')

def view_users():
    users_ref = db.collection('users')
    users = users_ref.stream()
    for user in users:
        print(f"User ID: {user.id}")

def db_users():
  print("\n--- Users Operations ---")
  print("1. Create User")
  print("2. View Users")

