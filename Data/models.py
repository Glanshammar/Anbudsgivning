from typing import List
from faker import Faker
from typing import List
import random
from datetime import datetime, timedelta, date

fake = Faker()
Faker.seed(42)

INDUSTRIES = [
    "Construction", "Healthcare", "Technology", "Finance", 
    "Manufacturing", "Education", "Energy", "Transportation",
]

CERTIFICATIONS = [
    "PMP", "CCNA", "AWS Certified", "CISSP", "Six Sigma", 
    "CFA", "PE License", "ISO 9001"
]

class Company:
    COLLECTION_NAME = 'Companies'

    def __init__(self, name: str, industry: str, id: str = None):
        self.id = id
        self.name = name
        self.industry = industry

    def __str__(self):
        return f"Company(id={self.id}, name={self.name}, industry={self.industry}"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'industry': self.industry,
        }
    
    @staticmethod
    def Generate(seed=None) -> 'Company':
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)
        
        return Company(
            name=fake.company(),
            id=f"company_{fake.bothify(text='????_####')}",
            industry=random.choice(INDUSTRIES)
        )


class Consultant:
    COLLECTION_NAME = 'Consultants'

    def __init__(self, name: str, consultant_id: str, expertise: list):
        self.name = name
        self.id = consultant_id
        self.expertise = expertise

    def to_dict(self):
        return {
            'name': self.name,
            'expertise': self.expertise,
            'id': self.id,
        }
    
    @staticmethod
    def Generate(seed=None) -> 'Consultant':
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

        exp_months = random.randint(6, 20*12)
        base_certs = random.sample(CERTIFICATIONS, k=random.randint(1, 3))

        return Consultant(
            name=fake.name(),
            consultant_id=f"consultant_{fake.bothify(text='????_####')}",
            expertise=random.sample(INDUSTRIES, k=random.randint(1, 2)),
            months_of_experience=exp_months,
            certifications=base_certs + [
                f"{fake.word().title()} Certified Specialist"
                for _ in range(random.randint(0, 2))
            ],
            contact_email=fake.free_email(),
            contact_phone=fake.numerify(text="+1 (###) ###-####")
        )


class TenderDocument:
    def __init__(self, technical_requirements, workforce_requirements, start_date, end_date):
        self.technical_requirements = technical_requirements
        self.workforce_requirements = workforce_requirements
        self.start_date = start_date
        self.end_date = end_date

    def __repr__(self):
        return f"TenderDocument(company_name={self.company_name}, project_description={self.project_description}, start_date={self.start_date}, end_date={self.end_date})"

    @staticmethod
    def Generate(seed=None) -> 'TenderDocument':
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

        industry = random.choice([
            "Construction", "Healthcare", "Technology", "Finance", "Manufacturing"
        ])

        start_date = datetime.now() + timedelta(days=random.randint(1, 30))
        end_date = start_date + timedelta(days=random.randint(30, 180))

        return TenderDocument(
            technical_requirements=[f"{fake.word().title()} Compliance" for _ in range(random.randint(2, 4))],
            workforce_requirements=f"{random.randint(3, 30)} workers required",
            start_date = start_date,
            end_date = end_date
        )
        
        
class BusinessCalendar:
    COLLECTION_NAME = 'BusinessCalendars'
    VALID_MONTH_FORMATS = [
        "%Y-%m",    # ISO Standard (2025-04)
        "%m/%Y",    # US Format (04/2025)
        "%Y/%m",    # Alternative ISO (2025/04)
        "%m-%Y",    # Hyphenated (04-2025)
        "%b %Y",    # Abbreviated month (Apr 2025)
        "%B %Y"     # Full month name (April 2025)
    ]
    
    def __init__(self, company_id: str):
        self.company_id = company_id
        self.availability = {}

    @staticmethod
    def _normalize_month(input_month) -> str:
        if isinstance(input_month, str) and BusinessCalendar._valid_month_format(input_month):
            return input_month
            
        if isinstance(input_month, (datetime, date)):
            return input_month.strftime("%Y-%m")

        if isinstance(input_month, int):
            if 1 <= input_month <= 12:
                now = datetime.now()
                return f"{now.year}-{input_month:02d}"
            raise ValueError(f"Invalid month number: {input_month} (must be 1-12)")

        if isinstance(input_month, tuple) and len(input_month) == 2:
            year, month = input_month
            return f"{year}-{month:02d}"

        try:
            for fmt in ["%Y-%m", "%m/%Y", "%Y/%m", "%b %Y", "%B %Y"]:
                try:
                    dt = datetime.strptime(str(input_month), fmt)
                    return dt.strftime("%Y-%m")
                except ValueError:
                    continue
        except TypeError:
            pass

        raise ValueError(f"Unrecognized month format: {input_month}")

    def add_availability(self, consultant_id: str, months: list):
        if not all(self._valid_month_format(m) for m in months):
            raise ValueError("Months must be in YYYY-MM format")
            
        self.availability.setdefault(consultant_id, []).extend(
            m for m in months if m not in self.availability.get(consultant_id, [])
        )
        self.availability[consultant_id].sort()

    def remove_availability(self, consultant_id: str, months: list):
        if consultant_id in self.availability:
            self.availability[consultant_id] = [
                m for m in self.availability[consultant_id] 
                if m not in months
            ]

    def get_available_consultants(self, target_month) -> list:
        normalized_month = self._normalize_month(target_month)
        if not self._valid_month_format(normalized_month):
            raise ValueError(f"Invalid month format: {target_month}")
            
        return [
            cid for cid, months in self.availability.items()
            if normalized_month in months
        ]

    def get_consultant_availability(self, consultant_id: str) -> list:
        return self.availability.get(consultant_id, []).copy()

    @staticmethod
    def _valid_month_format(month_str: str) -> bool:
        try:
            datetime.strptime(month_str, "%Y-%m")
            return True
        except ValueError:
            return False

    @staticmethod
    def Generate(seed=None, company=None, consultants=None) -> 'BusinessCalendar':
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

        if company is None:
            company = Company.Generate()

        if consultants is None:
            consultants = [Consultant.Generate() for _ in range(random.randint(3, 8))]
        
        calendar = BusinessCalendar(company_id=company.id)

        for consultant in consultants:
            for _ in range(random.randint(1, 3)):
                start = datetime.today() + timedelta(days=random.randint(0, 180))
                duration_months = random.randint(1, 6)
                
                months = [
                    (start + timedelta(days=30*i)).strftime("%Y-%m")
                    for i in range(duration_months)
                ]
                calendar.add_availability(consultant.id, months)

        return calendar

