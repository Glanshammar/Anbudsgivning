from faker import Faker
import random
from typing import List
from datetime import datetime, timedelta, date
import userpaths
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

fake = Faker()
Faker.seed(42)

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
with open(os.path.join(root_dir, "expertise.txt"), "r") as file:
    lines = [line.strip() for line in file.readlines()]

Expertise = {index: value for index, value in enumerate(lines)}


class TenderPortal:
    def __init__(self, url:str, username:str, password:str):
        if not all(isinstance(arg, str) for arg in [url, username, password]):
            raise TypeError("All arguments (url, username, password) must be of type str")
        self.url = url
        self.username = username
        self.password = password

    def __str__(self):
        return f"Tender Portal: {self.url}\nUsername: {self.username}\nPassword: {self.password}"
    
    def to_dict(self):
        return {
            'url': self.url,
            'username': self.username,
            'password': self.password
        }


class CompanyProfile:
    def __init__(self, name:str, country:str, industry:str):
        if not isinstance(name, str):
            raise ValueError("Name must be a string")
        if not isinstance(country, str):
            raise ValueError("Country must be a string")
        if not isinstance(industry, str):
            raise ValueError("Industry must be a string")

        self.name = name
        self.country = country
        self.industry = industry

    def __str__(self):
        return f"CompanyProfile(name={self.name}, country={self.country}, industry={self.industry})"

    def to_dict(self):
        return {
            'name': self.name,
            'country': self.country,
            'industry': self.industry,
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
    def __init__(self, branch: str, deadline: datetime, end_date: datetime, project_name: str, start_date: datetime):
        if not isinstance(branch, str):
            raise ValueError('Invalid branch')
        if not isinstance(deadline, datetime):
            raise ValueError('Invalid deadline')
        if not isinstance(end_date, datetime):
            raise ValueError('Invalid end_date')
        if not isinstance(project_name, str):
            raise ValueError('Invalid project_name')
        if not isinstance(start_date, datetime):
            raise ValueError('Invalid start_date')
        self.branch = branch
        self.deadline = deadline
        self.end_date = end_date
        self.project_name = project_name
        self.start_date = start_date

    def __repr__(self):
        return f'TenderDocument(branch={self.branch}, deadline={self.deadline}, end_date={self.end_date}, project_name={self.project_name}, start_date={self.start_date})'
        
    def to_dict(self):
        return {
            'branch': self.branch,
            'deadline': self.deadline.strftime("%Y-%m-%d"),
            'end_date': self.end_date.strftime("%Y-%m-%d"),
            'project_name': self.project_name,
            'start_date': self.start_date.strftime("%Y-%m-%d")
        }


class Calendar:
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
        self.availability.clear()

    def __del__(self):
        self.availability.clear()


    @staticmethod
    def _normalize_month(input_month) -> str:
        if isinstance(input_month, str) and Calendar._valid_month_format(input_month):
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

        for fmt in Calendar.VALID_MONTH_FORMATS:
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

