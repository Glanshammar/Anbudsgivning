from faker import Faker
import random
from typing import List
from datetime import datetime, timedelta, date

fake = Faker()
Faker.seed(42)


Expertise = {
    "Fullstack": 1,
    "Frontend": 2,
    "Backend": 3,
    "Architect": 4,
    "AI": 5,
    "Construction": 6
}


class Company:
    def __init__(self, name: str ='ACME AB', calendar: int =None, consultants: List[int] = []):
        if not isinstance(name, str):
            raise ValueError("Name must be a string")
        self.name = name
        self.calendar = calendar
        self.consultants = consultants

    def __str__(self):
        return f"Company(name={self.name},\ncalendar={self.calendar},\nconsultants={self.consultants}"

    def to_dict(self):
        return {
            'name': self.name,
            'calendar': self.calendar,
            'consultants': self.consultants
        }


class Consultant:
    def __init__(self, id: int = None, name: str = fake.name(), expertise: List[int] = [0, 1]):
        if not isinstance(id, int):
            raise ValueError('Invalid ID format. Must be int')
        if not all(e in Expertise.values() for e in expertise):
            raise ValueError('Invalid expertise values')
        self.id = id
        self.name = name
        self.expertise = expertise

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'expertise': self.expertise,
        }


class TenderDocument:
    def __init__(self, qualifications: List[int], workforce_requirements: int, start_date: datetime, end_date: datetime):
        if not all(q in Expertise.values() for q in qualifications):
            raise ValueError('Invalid qualifications')
        self.qualifications = qualifications
        self.workforce_requirements = workforce_requirements
        self.start_date = start_date
        self.end_date = end_date

    def __repr__(self):
        return f'TenderDocument(company_name={self.company_name}, project_description={self.project_description}, start_date={self.start_date}, end_date={self.end_date})'
        
        
class BusinessCalendar:
    VALID_MONTH_FORMATS = [
        "%Y-%m",    # ISO Standard (2025-04)
        "%m/%Y",    # US Format (04/2025)
        "%Y/%m",    # Alternative ISO (2025/04)
        "%m-%Y",    # Hyphenated (04-2025)
        "%b %Y",    # Abbreviated month (Apr 2025)
        "%B %Y",    # Full month name (April 2025)
        "%d-%b-%Y", # Day-Month-Year format (08-Apr-2025)
        "%d/%m/%Y"  # Day/Month/Year format (08/04/2025)
    ]
    
    def __init__(self, availability: dict = {}):
        self.availability = availability

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

        for fmt in BusinessCalendar.VALID_MONTH_FORMATS:
            try:
                dt = datetime.strptime(str(input_month), fmt)
                return dt.strftime("%Y-%m")
            except ValueError:
                continue

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

