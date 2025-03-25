import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from google.cloud.firestore_v1.document import DocumentReference
from Backend import db
import requests
from typing import List


class Consultant:
    def __init__(self, name: str, expertise: List[str], years_of_experience: int, certifications: List[str],
                 contact_email: str, contact_phone: str, availability: str, hourly_rate: float):
        self.name = name
        self.expertise = expertise
        self.years_of_experience = years_of_experience
        self.certifications = certifications
        self.contact_email = contact_email
        self.contact_phone = contact_phone
        self.availability = availability
        self.hourly_rate = hourly_rate

    def __str__(self):
        return f"Consultant(name={self.name}, expertise={self.expertise}, years_of_experience={self.years_of_experience}, " \
               f"certifications={self.certifications}, contact_email={self.contact_email}, " \
               f"contact_phone={self.contact_phone}, availability={self.availability}, hourly_rate={self.hourly_rate})"


def AddConsultant(consultant_data):
    try:
        consultant_ref = db.collection('Consultants')
        new_consultant_ref = consultant_ref.add(consultant_data)[1]
        print(f"✅ Consultant added successfully with ID: {new_consultant_ref.id}")
    except Exception as e:
        print(f"❌ Error adding consultant: {str(e)}")

def GetConsultants():
    consultant_ref = db.collection('Consultants')
    consultants = consultant_ref.stream()
    consultant_list = []
    for user in consultants:
        consultant_data = user.to_dict()
        consultant_data['id'] = user.id
        consultant_list.append(consultant_data)
    return consultant_list


def GetConsultantByID(consultantID):
    consultant_ref = db.collection('Consultants').document(consultantID)
    consultant = consultant_ref.get()

    if consultant.exists:
        consultant_data = consultant.to_dict()
        consultant_data['id'] = consultant.id
        return consultant_data
    else:
        return False


def DeleteConsultant(consultantID):
    consultant_ref = db.collection('Consultants').document(consultantID)
    if consultant_ref.get().exists:
        consultant_ref.delete()
        print(f"✅ User with ID {consultantID} deleted successfully")
    else:
        print(f"❌ User with ID {consultantID} not found")


def UpdateConsultant(user_id, user_data):
    user_ref = db.collection('Consultants').document(user_id)
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

