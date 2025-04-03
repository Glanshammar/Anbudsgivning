from Data import DomainMain, Company, Consultant, TenderDocument, BusinessCalendar
from Agents import AgentManager, AgentType
import requests
import zmq
from zmq.auth import load_certificate
from datetime import datetime, timedelta
from Matching import is_tender_match

context = zmq.Context()
client = context.socket(zmq.REQ)
client.connect("tcp://server:5001")


if __name__ == "__main__":
    while True:
        command = input(">> ")
        if command.lower() == "consultant":
            consult = Consultant.Generate()
            print(consult.to_dict)
        if command.lower() == "consult":
            consultant_dummy_data = Consultant.Generate()

            command_data = {
                'command': 'create',
                'params': {
                    'collection_name': 'Consultants',
                    'document_data': consultant_dummy_data.to_dict()
                }
            }

            client.send_json(command_data)
            response = client.recv_json()
        elif command.lower() == "company":
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
        elif command.lower() == "agent":
            manager = AgentManager()
        elif command.lower() == "domain":
            DomainMain('C:/Users/Mondus/Documents/Länkar.txt')
        elif command.lower() == "status":
            response = requests.get("http://127.0.0.1:5000/server-status")
            print(response.status_code)
            print(response.text)
        elif command.lower() == "calendar":
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
        elif command.lower() == "match":
            company = Company.Generate()
            consultants = [Consultant.Generate() for x in range(5)]
            calendar = BusinessCalendar.Generate(company=company, consultants=consultants)
            document = TenderDocument.Generate()
            results = is_tender_match(tender=document, company=company, consultants=consultants, calendar=calendar)
            print(results)
        elif command.lower() == "exit":
            break
        else:
            print("Invalid command. Please try again.")