from faker import Faker
import random
from typing import List, Optional
from datetime import datetime, timedelta, date
import userpaths
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
import re

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
    def __init__(self, name: str, country: str, industry: str):
        if not all(isinstance(var, str) for var in [name, country, industry]):
            raise ValueError("Name, country, and industry must all be strings")

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
    def __init__(self, project_name: str, branch: str, deadline: datetime, start_date: datetime, end_date: datetime):
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
        self.start_date = start_date
        self.end_date = end_date
        self.project_name = project_name

    def __repr__(self):
        return f'TenderDocument(project_name={self.project_name}, branch={self.branch}, deadline={self.deadline}, start_date={self.start_date}, end_date={self.end_date})'
        
    def to_dict(self):
        return {
            'project_name': self.project_name,
            'branch': self.branch,
            'deadline': self.deadline.strftime("%Y-%m-%d"),
            'start_date': self.start_date.strftime("%Y-%m-%d"),
            'end_date': self.end_date.strftime("%Y-%m-%d"),
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


class UserProfile:
    def __init__(
        self,
        username: Optional[str] = None,
        email: Optional[str] = None,
        password: Optional[str] = None
    ):
        # Validate that at least one field is provided
        if all(field is None for field in [username, email, password]):
            raise ValueError("At least one field (username, email, or password) must be provided")

        # Validate username if provided
        if username is not None:
            if not isinstance(username, str):
                raise ValueError("Username must be a string")
            if len(username) < 3:
                raise ValueError("Username must be at least 3 characters long")
            if not username.isalnum():
                raise ValueError("Username must contain only alphanumeric characters")

        # Validate email if provided
        if email is not None:
            if not isinstance(email, str):
                raise ValueError("Email must be a string")
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, email):
                raise ValueError("Invalid email format")

        # Validate password if provided
        if password is not None:
            if not isinstance(password, str):
                raise ValueError("Password must be a string")
            # Minimum 8 characters, at least one uppercase, one lowercase, one digit, one special character
            password_pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]{}<>.,;:|~`_+=-]).{8,}$'
            if not re.match(password_pattern, password):
                raise ValueError("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol")

        self.username = username
        self.email = email
        self.password = password
        self.validated = False

    def to_dict(self) -> dict:
        """Convert the profile to a dictionary, excluding None values"""
        return {
            k: v for k, v in {
                'username': self.username,
                'email': self.email,
                'password': self.password,
                'validated': self.validated
            }.items() if v is not None
        }

    def __str__(self) -> str:
        return f"UserProfile(username={self.username}, email={self.email}, validated={self.validated})"

