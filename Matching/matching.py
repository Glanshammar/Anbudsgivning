from datetime import datetime
from typing import List
from Data import TenderDocument, Company, Consultant, BusinessCalendar

def is_tender_match(
    tender: TenderDocument,
    company: Company,
    consultants: List[Consultant],
    calendar: BusinessCalendar
) -> bool:
    # 1. Extract industry from tender description
    try:
        tender_industry = tender.project_description.split(" in the ")[1].split(" industry.")[0]
        print(f"[DEBUG] Extracted tender industry: {tender_industry}")
    except IndexError:
        print("[DEBUG] Failed to extract industry from project description.")
        return False

    # 2. Company check
    print(f"[DEBUG] Checking company industry: {company.industry} against tender industry: {tender_industry}")
    if company.industry != tender_industry:
        print("[DEBUG] Company industry does not match tender industry.")
        return False
    
    print(f"[DEBUG] Checking if company services overlap with tender requirements...")
    if not any(service in tender.technical_requirements for service in company.services_offered):
        print("[DEBUG] No matching services found between company and tender requirements.")
        return False
    print("[DEBUG] Company services are compatible.")

    # 3. Check consultants (multiple)
    def is_consultant_eligible(consultant: Consultant) -> bool:
        print(f"[DEBUG] Checking consultant {consultant.id} expertise...")
        # Expertise check
        if tender_industry not in consultant.expertise:
            print(f"[DEBUG] Consultant {consultant.id} lacks expertise in {tender_industry}.")
            return False
        
        # Certification check
        print(f"[DEBUG] Checking consultant {consultant.id} certifications...")
        if not all(
            any(cert in req for cert in consultant.certifications)
            for req in tender.technical_requirements
        ):
            print(f"[DEBUG] Consultant {consultant.id} does not meet certification requirements.")
            return False
        
        # Experience check
        try:
            required_months = int(tender.timelines.split()[0])
            print(f"[DEBUG] Checking consultant {consultant.id} experience ({consultant.months_of_experience} months) against required {required_months} months.")
            if consultant.months_of_experience < required_months:
                print(f"[DEBUG] Consultant {consultant.id} has insufficient experience.")
                return False
        except ValueError:
            print("[DEBUG] Failed to parse required timeline from tender.")
            return False
        
        # Availability check
        def month_range(start: datetime, end: datetime) -> list[str]:
            months = []
            while start <= end:
                months.append(start.strftime("%Y-%m"))
                start = start.replace(month=start.month+1) if start.month < 12 \
                    else start.replace(year=start.year+1, month=1)
            return months

        required_months = month_range(tender.start_date, tender.end_date)
        available_months = calendar.get_consultant_availability(consultant.id)
        
        print(f"[DEBUG] Checking consultant {consultant.id} availability for required months: {required_months}")
        if not all(month in available_months for month in required_months):
            print(f"[DEBUG] Consultant {consultant.id} is unavailable for some required months.")
            return False
        
        print(f"[DEBUG] Consultant {consultant.id} meets all requirements.")
        return True

    for consultant in consultants:
        print(f"[DEBUG] Evaluating consultant {consultant.id}...")
        if is_consultant_eligible(consultant):
            print(f"[DEBUG] Consultant {consultant.id} is a match!")
            return True
    
    print("[DEBUG] No consultants meet the requirements.")
    return False
