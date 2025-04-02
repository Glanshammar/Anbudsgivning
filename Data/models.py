from typing import List
from faker import Faker
from typing import List
import random

fake = Faker()
Faker.seed(42)

INDUSTRIES = [
    "Construction", "Healthcare", "Technology", "Finance", 
    "Manufacturing", "Education", "Energy", "Transportation",
]

SERVICES_BY_INDUSTRY = {
    "Construction": ["Project Management", "Structural Engineering", 
                    "Cost Estimation", "Site Safety", "Quality Control"],
    "Healthcare": ["Clinical Consultancy", "Hospital Management", 
                  "Medical Equipment", "Staff Training", "Compliance"],
    "Technology": ["Cloud Migration", "Cybersecurity", "AI Solutions",
                  "Software Development", "IT Infrastructure"],
    "Finance": ["Risk Management", "Investment Strategy", 
               "Regulatory Compliance", "Mergers & Acquisitions",
               "Tax Optimization"]
}

CERTIFICATIONS = [
    "PMP", "CCNA", "AWS Certified", "CISSP", "Six Sigma", 
    "CFA", "PE License", "ISO 9001"
]

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
    
    @staticmethod
    def Generate(seed=None) -> 'Company':
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

        industry = random.choice(INDUSTRIES)
        services = random.sample(
            SERVICES_BY_INDUSTRY.get(industry, ["General Consulting"]),
            k=random.randint(3, 5)
        )

        return Company(
            name=fake.company(),
            industry=industry,
            services_offered=services,
            registration_number=fake.bothify(text="??-####-####-###"),
            contact_email=fake.company_email(),
            contact_phone=fake.numerify(text="+1 (###) ###-####"),
            past_projects=[fake.catch_phrase() for _ in range(random.randint(2, 3))],
            current_projects=[fake.bs() for _ in range(random.randint(1, 2))]
        )


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
    
    @staticmethod
    def Generate(seed=None) -> 'Consultant':
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

        exp_years = random.randint(2, 25)
        base_certs = random.sample(CERTIFICATIONS, k=random.randint(1, 3))

        return Consultant(
            name=fake.name(),
            expertise=random.sample(INDUSTRIES, k=random.randint(1, 2)),
            years_of_experience=exp_years,
            certifications=base_certs + [
                f"{fake.word().title()} Certified Specialist"
                for _ in range(random.randint(0, 2))
            ],
            contact_email=fake.free_email(),
            contact_phone=fake.numerify(text="+1 (###) ###-####")
        )


class TenderDocument:
    def __init__(self, company_name, contact_details, address, registration_certificates,
                 tax_clearance_certificates, business_profile, project_description,
                 timelines, objectives, technical_requirements, workforce_requirements,
                 key_personnel, pricing_breakdown, payment_terms, financial_statements,
                 contract_terms, insurance_certificates, industry_registrations,
                 evaluation_criteria, administrative_requirements):
        # Basic Company Information
        self.company_name = company_name
        self.contact_details = contact_details
        self.address = address
        self.registration_certificates = registration_certificates
        self.tax_clearance_certificates = tax_clearance_certificates
        self.business_profile = business_profile

        # Project Overview
        self.project_description = project_description
        self.timelines = timelines
        self.objectives = objectives

        # Technical Requirements
        self.technical_requirements = technical_requirements

        # Employment and Workforce Details
        self.workforce_requirements = workforce_requirements
        self.key_personnel = key_personnel

        # Financial Information
        self.pricing_breakdown = pricing_breakdown
        self.payment_terms = payment_terms
        self.financial_statements = financial_statements

        # Legal and Compliance Documents
        self.contract_terms = contract_terms
        self.insurance_certificates = insurance_certificates
        self.industry_registrations = industry_registrations

        # Evaluation Criteria
        self.evaluation_criteria = evaluation_criteria

        # Administrative Requirements
        self.administrative_requirements = administrative_requirements

    def __repr__(self):
        return f"TenderDocument(company_name={self.company_name}, project_description={self.project_description})"

    @staticmethod
    def Generate(seed=None) -> 'TenderDocument':
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

        industry = random.choice([
            "Construction", "Healthcare", "Technology", "Finance", "Manufacturing"
        ])
        
        return TenderDocument(
            company_name=fake.company(),
            contact_details=f"Email: {fake.company_email()}, Phone: {fake.phone_number()}",
            address=fake.address(),
            registration_certificates=[fake.bothify(text="??-####-####") for _ in range(random.randint(1, 2))],
            tax_clearance_certificates=[fake.bothify(text="TAX-#####")],
            business_profile=fake.catch_phrase(),
            project_description=f"Project to develop {fake.bs()} in the {industry} industry.",
            timelines=f"{random.randint(3, 24)} months",
            objectives=f"To achieve {fake.catch_phrase()} within budget and timeline.",
            technical_requirements=[f"{fake.word().title()} Compliance" for _ in range(random.randint(2, 4))],
            workforce_requirements=f"{random.randint(3, 30)} workers required",
            key_personnel=[f"{fake.name()}, {random.choice(['Project Manager', 'Engineer', 'Consultant'])}"
                           for _ in range(random.randint(1, 3))],
            pricing_breakdown=f"${random.randint(100000, 5000000):,.2f}",
            payment_terms="50% upfront, 50% upon completion.",
            financial_statements="Available upon request.",
            contract_terms="Standard terms and conditions apply.",
            insurance_certificates=[f"{random.choice(['Public Liability', 'Professional Indemnity'])} Insurance"],
            industry_registrations=[f"{industry} Association Membership"],
            evaluation_criteria="Technical competence: 50%, Pricing: 50%",
            administrative_requirements=f"Submit by {fake.date_between(start_date='+15d', end_date='+200d')}"
        )
        
        
class BusinessCalendar():
    def __init__(self):
        self.availability = []
        self.months

    def AddConsultant(self, consultant_id, months : list):
        self.availability.append(consultant_id)

    @staticmethod
    def Generate():
        pass