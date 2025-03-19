import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from google.cloud.firestore_v1.document import DocumentReference
from Database.database import db
import requests

def AddUser(user_data):
    try:
        users_ref = db.collection('Users')
        new_user_ref = users_ref.add(user_data)[1]
        print(f"✅ User added successfully with ID: {new_user_ref.id}")
    except Exception as e:
        print(f"❌ Error adding user: {str(e)}")

def GetUsers():
    users_ref = db.collection('Users')
    users = users_ref.stream()
    user_list = []
    for user in users:
        user_data = user.to_dict()
        user_data['id'] = user.id
        user_list.append(user_data)
    return user_list


def GetUserByID(userID):
    user_ref = db.collection('Users').document(userID)
    user = user_ref.get()

    if user.exists:
        user_data = user.to_dict()
        user_data['id'] = user.id
        return user_data
    else:
        return False


def DeleteUser(userID):
    user_ref = db.collection('Users').document(userID)
    if user_ref.get().exists:
        user_ref.delete()
        print(f"✅ User with ID {userID} deleted successfully")
    else:
        print(f"❌ User with ID {userID} not found")


def UpdateUser(user_id, user_data):
    user_ref = db.collection('Users').document(user_id)
    if not user_ref.get().exists:
        return False

    valid_fields = ['name', 'email']
    update_data = {k: v for k, v in user_data.items() if k in valid_fields}

    if update_data:
        user_ref.update(update_data)
        print(f"✅ User with ID {user_id} updated successfully")
        return True
    else:
        print(f"❌ No valid fields provided for update for user {user_id}")
        return False


def UsersMain():
    while True:
        print("\n--- Users Operations ---")
        print("1. Create User")
        print("2. View Users")
        print("3. Delete User")
        print("4. Exit")

        choice = input("Enter your choice (1-5): ").strip()

        if choice == '1':
            response = requests.post("http://127.0.0.1:5000/status")
            if response.status_code == 201:
                print(response.json()["message"])
            else:
                print(f"Unexpected status code: {response.status_code}")
        elif choice == '2':
            print(GetUsers())
        elif choice == '3':
            userID = int(input("Enter user ID: "))
            DeleteUser(userID)
        elif choice == '4':
            print("Exiting user management...")
            break
        else:
            print("Invalid choice. Please try again.")