from faker import Faker
import random
from typing import List, Optional
from datetime import datetime, timedelta, date
import userpaths
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
import re
from dataclasses import dataclass, asdict

fake = Faker()
Faker.seed(42)

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
with open(os.path.join(root_dir, "expertise.txt"), "r") as file:
    lines = [line.strip() for line in file.readlines()]

Expertise = {index: value for index, value in enumerate(lines)}


class TenderPortal:
    def __init__(self, url:str, site:str, username:str, password:str):
        if not all(isinstance(arg, str) for arg in [url, username, password]):
            raise TypeError("All arguments (url, username, password) must be of type str")
        self.url = url
        self.username = username
        self.password = password
        self.site = site

    def __str__(self):
        return f"Tender Portal: {self.url}\nUsername: {self.username}\nSite: {self.site}"
    
    def to_dict(self):
        return {
            'url': self.url,
            'username': self.username,
            'password': self.password,
            'site': self.site
        }


class CompanyProfile:
    def __init__(self, name: str, country: str, province: str, industry: str, deadline_window: int = 7):
        if not all(isinstance(var, str) for var in [name, country, province, industry]):
            raise ValueError("Name, country, province, and industry must all be strings")
        if not isinstance(deadline_window, int):
            raise ValueError("Deadline window must be an integer")

        self.name = name
        self.country = country
        self.province = province
        self.industry = industry
        self.deadline_window = deadline_window

    def __str__(self):
        return f"CompanyProfile(name={self.name}, country={self.country}, industry={self.industry}, deadline_window={self.deadline_window})"

    def to_dict(self):
        return {
            'name': self.name,
            'country': self.country,
            'province': self.province,
            'industry': self.industry,
            'deadline_window': self.deadline_window
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
    # Define all states for tender documents
    VALID_STATES = [
        "nyinkommet",                    # Nyinkommet (Inbox)
        "under_utredning",              # Under utredning (Under investigation)
        "bid_authoring",               # Bid Authoring (Writing the bid)
        "sent_bids",                   # Upphandlingar vi bjudit på (Submitted)
    ]
    
    def __init__(self, project_name: str, branch: str, deadline: datetime, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, state: str = "nyinkommet"):
        if not isinstance(branch, str):
            raise ValueError('Invalid branch')
        if not isinstance(deadline, datetime):
            raise ValueError('Invalid deadline')
        if end_date is not None and not isinstance(end_date, datetime):
            raise ValueError('Invalid end_date')
        if not isinstance(project_name, str):
            raise ValueError('Invalid project_name')
        if start_date is not None and not isinstance(start_date, datetime):
            raise ValueError('Invalid start_date')
        if not isinstance(state, str):
            raise ValueError('Invalid state')
        if state not in self.VALID_STATES:
            raise ValueError(f'Invalid state: {state}. Must be one of {self.VALID_STATES}')
            
        self.branch = branch
        self.deadline = deadline
        self.start_date = start_date
        self.end_date = end_date
        self.project_name = project_name
        self.state = state
        self.tender_link = None
        self.description = None
        self.bid_data = None  # För att lagra bid authoring data
        self.submission_date = None  # När anbudet skickades in

    def __repr__(self):
        return f'TenderDocument(project_name={self.project_name}, state={self.state}, branch={self.branch}, deadline={self.deadline}, start_date={self.start_date}, end_date={self.end_date}), \nurl={self.tender_link}, description={self.description}'
        
    def to_dict(self):
        result = {
            'project_name': self.project_name,
            'branch': self.branch,
            'deadline': self.deadline.strftime("%Y-%m-%d"),
            'start_date': self.start_date.strftime("%Y-%m-%d") if self.start_date else None,
            'end_date': self.end_date.strftime("%Y-%m-%d") if self.end_date else None,
            'url': self.tender_link,
            'description': self.description,
            'state': self.state
        }
        
        # Lägg till extra fält om de finns
        if self.bid_data is not None:
            result['bid_data'] = self.bid_data
        if self.submission_date is not None:
            result['submission_date'] = self.submission_date.strftime("%Y-%m-%d") if isinstance(self.submission_date, datetime) else self.submission_date
            
        return result
    
    def update_state(self, new_state: str):
        """Uppdatera state för upphandlingen"""
        if new_state not in self.VALID_STATES:
            raise ValueError(f'Invalid state: {new_state}. Must be one of {self.VALID_STATES}')
        old_state = self.state
        self.state = new_state
        
        # Automatiskt sätt submission_date när anbudet skickas
        if new_state == "sent_bids" and old_state != "sent_bids":
            self.submission_date = datetime.now()
    
    def can_transition_to(self, target_state: str) -> bool:
        """Kontrollera om övergång till target_state är giltig"""
        if target_state not in self.VALID_STATES:
            return False
            
        # Definiera giltiga övergångar
        valid_transitions = {
            "nyinkommet": ["under_utredning"],
            "under_utredning": "nyinkommet",  # Kan gå tillbaka till inbox eller framåt
            "bid_authoring": "sent_bids",
            "sent_bids": []  # Slutstadium, inga övergångar
        }
        
        return target_state in valid_transitions.get(self.state, [])


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
        self.consultant_id = None
        self.role = 'User'

    def to_dict(self) -> dict:
        """Convert the profile to a dictionary, excluding None values"""
        return {
            k: v for k, v in {
                'username': self.username,
                'email': self.email,
                'password': self.password,
                'validated': self.validated,
                'consultant_id': self.consultant_id,
                'role': self.role
            }.items() if v is not None
        }

    def __str__(self) -> str:
        return f"UserProfile(username={self.username}, email={self.email}, validated={self.validated}, consultant_id={self.consultant_id}, role={self.role})"


@dataclass
class Fido2Credential:
    credential_id: str  # base64url-encoded
    public_key: str     # base64url-encoded
    sign_count: int
    transports: Optional[List[str]] = None
    user_handle: Optional[str] = None
    rp_id: Optional[str] = None
    # Add any other fields as needed

    def to_dict(self) -> dict:
        return asdict(self)

