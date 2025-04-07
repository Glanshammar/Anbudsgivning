from Data import DomainMain, Company, Consultant, TenderDocument, BusinessCalendar, Expertise
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


if __name__ == "__main__":
    while True:
        command = input(">> ").lower()
        
        match command:
            case 'consultant':
                consultant_data = Consultant()

                response = requests.post(
                    url='http://127.0.0.1:5000/consultants',
                    json=consultant_data.to_dict()
                )

                print(response.status_code)
                print(response.json())
            case 'company':
                company_dummy_data = Company()
                command_data = {
                    'command': 'create',
                    'params': {
                        'collection_name': 'Company',
                        'document_data': company_dummy_data.to_dict()
                    }
                }

                client.send_json(command_data)
                response = client.recv_json()
            case 'status':
                response = requests.get("http://127.0.0.1:5000/server-status")
                print(response.status_code)
                print(response.text)
            case 'calendar':
                existing_company = Company.Generate()
                existing_consultants = [Consultant.Generate() for x in range(5)]
                print(f"\nTotal consultants generated: {len(existing_consultants)}")
                calendar = BusinessCalendar.Generate(company=existing_company, consultants=existing_consultants)
                current_month = datetime.now().month
                availabile_amount = len(calendar.get_available_consultants(current_month))
                print(f"\nCalendar for company: {calendar.company_id}")
                print(f"Available consultants in calendar: {availabile_amount}")
                print("\nConsultant Availability:")
                for idx, consultant in enumerate(existing_consultants):
                    availability = calendar.get_consultant_availability(consultant.id)
                    print(f"  Consultant #{idx+1}:")
                    print(f"    ID: {consultant.id}")
                    print(f"    Available months: {availability}")
                    print(f"    Current month status: {'Available' if str(current_month).zfill(2) in availability else 'Unavailable'}")
                    print("-" * 40)
            case 'match':
                params = []
                with open(file='/home/mondus/Documents/anbud1.txt', mode='r') as file:
                    for line in file:
                        params.append(line.strip())
                
                start_date = datetime.strptime(params[0], '%Y-%m-%d')
                end_date = datetime.strptime(params[1], '%Y-%m-%d')
                qualifications = [Expertise[q.strip()] for q in params[2].split(',') if q.strip() in Expertise]

                company = Company()
                consultants = [
                    Consultant(id=0, name='Andreas Johansson', expertise=[2, 3], company_id=0),
                    Consultant(id=1, name='Kalle Anka', expertise=[2, 3], company_id=0),
                    Consultant(id=2, name='Robert Johansson', expertise=[2, 3], company_id=0)
                ]
                availability = ['2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12']
                calendar = BusinessCalendar()
                calendar.add_availability(consultant_id=consultants[0].id, months=availability)
                calendar.add_availability(consultant_id=consultants[1].id, months=availability)
                availability.pop()
                calendar.add_availability(consultant_id=consultants[2].id, months=availability)
                document = TenderDocument(qualifications=qualifications, start_date=start_date, end_date=end_date, workforce_requirements=3)
                print(consultants[0].expertise)
                results = IsTenderMatch(tender=document, company=company, consultants=consultants, calendar=calendar)
                print(results)
            case 'match2':
                # Fetch data from API
                company_request = requests.get(url="http://127.0.0.1:5000/company", params={'id': '0'})
                consultants_request = requests.get(url="http://127.0.0.1:5000/consultants")
                tender_request = requests.get(url="http://127.0.0.1:5000/tenders", params={'tender_id': '0'})

                # Parse JSON responses
                company_data = json.loads(company_request.text)
                consultants_data = json.loads(consultants_request.text)
                tender_data = json.loads(tender_request.text)

                # Create Consultant objects
                consultants = [
                    Consultant(
                        id=consultant['id'],
                        name=consultant['name'],
                        expertise=consultant['expertise'],
                        company_id=int(consultant['company_id'])
                    )
                    for consultant in consultants_data.values()
                ]

                # Create TenderDocument object
                tender = TenderDocument(
                    qualifications=list(tender_data['qualifications'].values()),
                    workforce_requirements=tender_data['workforce'],
                    start_date=datetime.strptime(tender_data['start_date'], "%Y-%m-%d"),
                    end_date=datetime.strptime(tender_data['end_date'], "%Y-%m-%d")
                )

                # Create Company object
                company = Company(
                    name=company_data['name'],
                    id=company_data['id'],
                    calendar=company_data.get('calendar'),
                    consultants=consultants_data.keys()
                )

                # Setup calendar availability
                calendar = BusinessCalendar(company_id=company.id)
                availability = ['2025-05', '2025-06', '2025-07', '2025-08', 
                            '2025-09', '2025-10', '2025-11', '2025-12']

                for month in availability:
                    try:
                        datetime.strptime(month, "%Y-%m")
                    except ValueError:
                        raise ValueError(f"Invalid month format: {month}")

                # Add availability with string IDs
                for consultant in consultants:
                    calendar.add_availability(
                        consultant_id=str(consultant.id),
                        months=availability.copy()  # Prevent list reference issues
                    )

                # Perform matching
                result = IsTenderMatch(tender=tender, company=company, 
                                    consultants=consultants, calendar=calendar)
                print("Is Tender Match:", result)
            case 'exit':
                break
            case _:
                print("Invalid command. Please try again.")
