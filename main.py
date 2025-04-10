from Data import DomainMain, Company, Consultant, TenderDocument, Calendar, Expertise
from Agents import AgentManager, AgentType
import requests
import zmq
import json
from zmq.auth import load_certificate
from datetime import datetime, timedelta
from Matching import IsTenderMatch

context = zmq.Context()
client = context.socket(zmq.REQ)
client.connect("tcp://server:5001")
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

                # Parse JSON responses
                consultants_data = consultants_request.json()
                tender_data = tender_request.json()
                calendar_data = calendar_request.json()

                # Create Consultant objects
                consultants = [
                    Consultant(
                        id=int(consultant_id),
                        name=consultant['name'],
                        expertise=[Expertise[e] for e in consultant['expertise']]
                    )
                    for consultant_id, consultant in consultants_data.items()
                ]

                # Create TenderDocument object
                tender = TenderDocument(
                    qualifications=[Expertise[q] for q in tender_data['qualifications'].values() if q in Expertise],
                    workforce=tender_data['workforce'],
                    start_date=datetime.strptime(tender_data['start_date'], "%Y-%m-%d"),
                    end_date=datetime.strptime(tender_data['end_date'], "%Y-%m-%d")
                )

                # Add validation for qualifications
                if len(tender.qualifications) != len(tender_data['qualifications']):
                    invalid = [q for q in tender_data['qualifications'].values() if q not in Expertise]
                    raise ValueError(f"Invalid qualifications in tender data: {invalid}")

                # Setup calendar availability from server data
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
            case _:
                print("Invalid command. Please try again.")
