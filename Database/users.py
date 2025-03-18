import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from google.cloud.firestore_v1.document import DocumentReference
from Database.database import db
import requests

def add_user(user_data):
    try:
        users_ref = db.collection('Users')
        new_user_ref = users_ref.add(user_data)[1]
        print(f"✅ User added successfully with ID: {new_user_ref.id}")
    except Exception as e:
        print(f"❌ Error adding user: {str(e)}")

def view_users():
    users_ref = db.collection('Users')
    users = users_ref.stream()
    user_list = []
    for user in users:
        user_data = user.to_dict()
        user_data['id'] = user.id  # Add the document ID to the user data
        user_list.append(user_data)
    return user_list

def delete_user():
    user_id = input("Enter user ID to delete: ").strip()
    user_ref = db.collection('Users').document(user_id)
    if user_ref.get().exists:
        user_ref.delete()
        print(f"✅ User with ID {user_id} deleted successfully")
    else:
        print(f"❌ User with ID {user_id} not found")


def update_user(user_id, user_data):
    user_ref = db.collection('Users').document(user_id)
    user = user_ref.get()
    if user.exists:
        user_ref.update(user_data)
        print(f"✅ User with ID {user_id} updated successfully")
    else:
        print(f"❌ User with ID {user_id} not found")


def users_main():
    while True:
        print("\n--- Users Operations ---")
        print("1. Create User")
        print("2. View Users")
        print("3. Update User")
        print("4. Delete User")
        print("5. Exit")

        choice = input("Enter your choice (1-5): ").strip()

        if choice == '1':
            add_user()
        elif choice == '2':
            view_users()
        elif choice == '3':
            update_user()
        elif choice == '4':
            delete_user()
        elif choice == '5':
            print("Exiting user management...")
            break
        else:
            print("Invalid choice. Please try again.")