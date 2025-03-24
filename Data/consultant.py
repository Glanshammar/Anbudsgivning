import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from google.cloud.firestore_v1.document import DocumentReference
from Data.database import db
import requests

class Consultant:
    pass

def AddConsultant(consultant_data):
    try:
        consultant_ref = db.collection('Users')
        new_consultant_ref = consultant_ref.add(consultant_data)[1]
        print(f"✅ Consultant added successfully with ID: {new_consultant_ref.id}")
    except Exception as e:
        print(f"❌ Error adding consultant: {str(e)}")

def GetConsultants():
    consultant_ref = db.collection('Users')
    consultants = consultant_ref.stream()
    consultant_list = []
    for user in consultants:
        consultant_data = user.to_dict()
        consultant_data['id'] = user.id
        consultant_list.append(consultant_data)
    return consultant_list


def GetConsultantByID(consultantID):
    consultant_ref = db.collection('Users').document(consultantID)
    consultant = consultant_ref.get()

    if consultant.exists:
        consultant_data = consultant.to_dict()
        consultant_data['id'] = consultant.id
        return consultant_data
    else:
        return False


def DeleteConsultant(consultantID):
    consultant_ref = db.collection('Users').document(consultantID)
    if consultant_ref.get().exists:
        consultant_ref.delete()
        print(f"✅ User with ID {consultantID} deleted successfully")
    else:
        print(f"❌ User with ID {consultantID} not found")


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
        print("\n--- Consultant Operations ---")
        print("1. Create consultant")
        print("2. View consultants")
        print("3. Delete consultant")
        print("4. Exit")

        choice = input("Enter your choice (1-5): ").strip()

        if choice == '1':
            response = requests.post("http://127.0.0.1:5000/status")
            if response.status_code == 201:
                print(response.json()["message"])
            else:
                print(f"Unexpected status code: {response.status_code}")
        elif choice == '2':
            print(GetConsultants())
        elif choice == '3':
            consultantID = int(input("Enter consultant ID: "))
            DeleteConsultant(consultantID)
        elif choice == '4':
            print("Exiting user management...")
            break
        else:
            print("Invalid choice. Please try again.")