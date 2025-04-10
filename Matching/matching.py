import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

from datetime import datetime
from typing import List
from Data import TenderDocument, Consultant, Calendar

def IsTenderMatch(
    tender: TenderDocument,
    consultants: List[Consultant],
    calendar: Calendar
) -> bool:
    
    print(f"Tender requires {tender.qualifications} and {tender.workforce} consultants.")

    if not tender or not consultants or not calendar:
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

    required_months = month_range(tender.start_date, tender.end_date)
    required_qualifications = set(tender.qualifications)

    def is_consultant_eligible(consultant: Consultant) -> bool:
        # Check for at least one matching qualification
        if not any(ex in consultant.expertise for ex in required_qualifications):
            return False
            
        # Check availability in at least one required month
        consultant_months = calendar.get_consultant_availability(str(consultant.id))
        return any(month in consultant_months for month in required_months)

    eligible_consultants = [c for c in consultants if is_consultant_eligible(c)]

    # Qualification coverage check
    covered_quals = {ex for c in eligible_consultants for ex in c.expertise}
    if not required_qualifications.issubset(covered_quals):
        print(f"Missing qualifications: {required_qualifications - covered_quals}")
        return False

    # Monthly availability check per qualification
    for month in required_months:
        for qual in required_qualifications:
             if not any(
                qual in c.expertise and 
                month in calendar.get_consultant_availability(str(c.id))
                for c in eligible_consultants
            ):
                print(f"No coverage for qualification {qual} in {month}")
                return False
           
    # Workforce check
    if len(eligible_consultants) < tender.workforce:
        print(f"Insufficient workforce: {len(eligible_consultants)}/{tender.workforce}")
        return False

    print("Tender requirements fully covered with available consultants!")
    return True