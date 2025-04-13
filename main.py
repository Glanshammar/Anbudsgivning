from Data import DomainMain, Company, Consultant, TenderDocument, Calendar, Expertise
from Agents import AgentManager, AgentType
import requests
from Web import PageGrab
from zmq.auth import load_certificate
from datetime import datetime, timedelta
from Matching import IsTenderMatch


API_URL = 'http://127.0.0.1:5000'


if __name__ == "__main__":
    while True:
        command = input(">> ").lower()
        
        match command:
            case 'status':
                response = requests.get(f'{API_URL}/server-status')
                print(response.status_code)
                print(response.text)
            case 'expertise':
                response = requests.post(f'{API_URL}/expertise', json=Expertise)
                print(response.text)
            case 'match':
                # Fetch data from API
                consultants_request = requests.get(url=f'{API_URL}/consultants')
                tender_request = requests.get(url=f'{API_URL}/tenders', params={'tender_id': '0'})
                calendar_request = requests.get(url=f'{API_URL}/calendar')
                expertise_request = requests.get(url=f'{API_URL}/expertise')

                # Parse JSON responses
                consultants_data = consultants_request.json()
                tender_data = tender_request.json()
                calendar_data = calendar_request.json()
                expertise_data = expertise_request.json()
                print(consultants_data)
                print(tender_data)
                print(calendar_data)
                print(expertise_data)

                # Create Consultant objects
                consultants = [
                    Consultant(
                        id=int(consultant_id),
                        name=consultant['name'],
                        expertise=[expertise_data[str(e)] for e in consultant['expertise'] if str(e) in expertise_data]
                    )
                    for consultant_id, consultant in consultants_data.items()
                ]

                # Create TenderDocument object
                tender = TenderDocument(
                    qualifications=[expertise_data[str(q)] for q in tender_data['qualifications'].values() if str(q) in expertise_data],
                    workforce=tender_data['workforce'],
                    start_date=datetime.strptime(tender_data['start_date'], "%Y-%m-%d"),
                    end_date=datetime.strptime(tender_data['end_date'], "%Y-%m-%d")
                )

                # Add validation for qualifications
                if len(tender.qualifications) != len(tender_data['qualifications']):
                    invalid = [q for q in tender_data['qualifications'].values() if str(q) not in expertise_data]
                    raise ValueError(f"Invalid qualifications in tender data: {invalid}")

                # Setup calendar from server data
                calendar = Calendar()
                for consultant_id_str, months in calendar_data.items():
                    calendar.add_availability(
                        consultant_id=consultant_id_str,
                        months=months
                    )

                # Perform matching
                result = IsTenderMatch(
                    tender=tender,
                    consultants=consultants,
                    calendar=calendar
                )
                print("Is Tender Match:", result)
            case 'exit':
                break
            case 'expertise':
                response = requests.get(f'{API_URL}/expertise')
                print(response.text)
            case 'web':
                page1 = 'https://www.opic.com/upphandlingar/'
                page2 = 'https://www.e-avrop.com/upphandlingar/e-Upphandling/Default.aspx'
                page3 = 'https://tendium.ai/se/upphandlingar/'
                PageGrab(url=page3)
                print()
                PageGrab(url=page3, href_filter='upphandling')
            case _:
                print("Invalid command. Please try again.")
