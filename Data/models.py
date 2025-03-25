from typing import List
from Backend import server

class Company:
    COLLECTION_NAME = 'Companies'

    def __init__(self, name: str, industry: str, services_offered: List[str], registration_number: str,
                 contact_email: str, contact_phone: str, past_projects: List[str], current_projects: List[str], id: str = None):
        self.id = id
        self.name = name
        self.industry = industry
        self.services_offered = services_offered
        self.registration_number = registration_number
        self.contact_email = contact_email
        self.contact_phone = contact_phone
        self.past_projects = past_projects
        self.current_projects = current_projects

    def __str__(self):
        return f"Company(id={self.id}, name={self.name}, industry={self.industry}, services_offered={self.services_offered}, " \
               f"registration_number={self.registration_number}, contact_email={self.contact_email}, " \
               f"contact_phone={self.contact_phone}, past_projects={self.past_projects}, " \
               f"current_projects={self.current_projects})"

    def to_dict(self):
        return {
            'name': self.name,
            'industry': self.industry,
            'services_offered': self.services_offered,
            'registration_number': self.registration_number,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone,
            'past_projects': self.past_projects,
            'current_projects': self.current_projects
        }

    @classmethod
    def AddCompany(cls, company):
        company_data = company.to_dict()
        return server.CreateDocument(cls.COLLECTION_NAME, company_data)

    @classmethod
    def GetCompanies(cls):
        companies = server.GetDocuments(cls.COLLECTION_NAME)
        return [cls(**doc.to_dict(), id=doc.id) for doc in companies]

    @classmethod
    def GetCompanyByID(cls, company_id):
        doc = server.db.collection(cls.COLLECTION_NAME).document(company_id).get()
        if doc.exists:
            company_data = doc.to_dict()
            return cls(**company_data, id=doc.id)
        return None

    @classmethod
    def DeleteCompany(cls, company_id):
        return server.DeleteDocument(server.db.collection(cls.COLLECTION_NAME).document(company_id))

    @classmethod
    def UpdateCompany(cls, company_id, update_data):
        return server.UpdateDocument(cls.COLLECTION_NAME, company_id, update_data)


class Consultant:
    COLLECTION_NAME = 'Consultants'

    def __init__(self, name, expertise, years_of_experience, certifications,
                 contact_email, contact_phone):
        self.name = name
        self.expertise = expertise
        self.years_of_experience = years_of_experience
        self.certifications = certifications
        self.contact_email = contact_email
        self.contact_phone = contact_phone

    def to_dict(self):
        return {
            'name': self.name,
            'expertise': self.expertise,
            'years_of_experience': self.years_of_experience,
            'certifications': self.certifications,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone,
        }

    @classmethod
    def AddConsultant(cls, consultant):
        consultant_data = consultant.to_dict()
        return server.CreateDocument(cls.COLLECTION_NAME, consultant_data)

    @classmethod
    def GetConsultants(cls):
        consultants = server.GetDocuments(cls.COLLECTION_NAME)
        return [cls(**doc.to_dict()) for doc in consultants]

    @classmethod
    def GetConsultantByID(cls, consultant_id):
        doc = server.db.collection(cls.COLLECTION_NAME).document(consultant_id).get()
        if doc.exists:
            consultant_data = doc.to_dict()
            consultant_data['id'] = doc.id
            return cls(**consultant_data)
        return None

    @classmethod
    def DeleteConsultant(cls, consultant_id):
        return server.DeleteDocument(server.db.collection(cls.COLLECTION_NAME).document(consultant_id))

    @classmethod
    def UpdateConsultant(cls, consultant_id, update_data):
        return server.UpdateDocument(cls.COLLECTION_NAME, consultant_id, update_data)
    
