import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

from datetime import datetime
from typing import List
from Data import TenderDocument, Company, Consultant, BusinessCalendar, Expertise

def IsTenderMatch(
    tender: TenderDocument,
    company: Company,
    consultants: List[Consultant],
    calendar: BusinessCalendar
) -> bool:
    
    print(f"Tender requires {tender.qualifications} and {tender.workforce_requirements} consultants.")

    if not tender or not company or not consultants or not calendar:
        print("[ERROR] Invalid input provided to tender match.")
        return False

    if tender.start_date >= tender.end_date:
        print("[ERROR] Tender start date must be before end date.")
        return False

    def month_range(start: datetime, end: datetime) -> List[str]:
        months = []
        current = datetime.strptime(start.strftime("%Y-%m"), "%Y-%m")
        while current <= end:
            months.append(current.strftime("%Y-%m"))
            next_month = current.month % 12 + 1
            next_year = current.year + (current.month // 12)
            current = current.replace(year=next_year, month=next_month)
        return months

    def is_consultant_eligible(consultant: Consultant) -> bool:
        print(f"Checking consultant {consultant.id}...")
        
        if not any(expertise in consultant.expertise for expertise in tender.qualifications):
            print(f"Consultant {consultant.id} lacks required expertise. ({consultant.expertise})")
            return False
        
        print(f"Consultant {consultant.id} has the required expertise. ({consultant.expertise})")

        required_months = month_range(tender.start_date, tender.end_date)
        available_months = calendar.get_consultant_availability(str(consultant.id))

        if not all(month in available_months for month in required_months):
            unavailable_months = [month for month in required_months if month not in available_months]
            print(f"Consultant {consultant.id} is unavailable for required months: {unavailable_months}")
            return False

        print(f"Consultant {consultant.id} meets all requirements.\n")
        return True

    eligible_consultants = [consultant for consultant in consultants if is_consultant_eligible(consultant)]

    if eligible_consultants:
        print(f"Found {len(eligible_consultants)} eligible consultants.")
        if len(eligible_consultants) >= tender.workforce_requirements:
            return True

    print(f"Not enough eligible consultants. Tender needs {tender.workforce_requirements}, company has {len(eligible_consultants)}.")
    return False