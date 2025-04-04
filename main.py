from Data import DomainMain, Company, Consultant, TenderDocument, BusinessCalendar
from Agents import AgentManager, AgentType
import requests
import zmq
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
                consultant_data = Consultant.Generate()

                response = requests.post(
                    url='http://127.0.0.1:5000/consultants',
                    json=consultant_data.to_dict()
                )

                print(response.status_code)
                print(response.json())
            case 'company':
                company_dummy_data = Company.Generate()
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
                qualifications = params[2].split(',')

                company = Company.Generate()
                consultants = [Consultant.Generate() for x in range(10)]
                calendar = BusinessCalendar.Generate(company=company, consultants=consultants)
                document = TenderDocument(qualifications=qualifications, start_date=start_date, end_date=end_date, workforce_requirements=3)
                results = IsTenderMatch(tender=document, company=company, consultants=consultants, calendar=calendar)
                print(results)
            case 'exit':
                break
            case _:
                print("Invalid command. Please try again.")
