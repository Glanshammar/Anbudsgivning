from Data import DomainMain, Company, Consultant, TenderDocument, Calendar, Expertise, Page
from Agents import AgentManager, AgentType
import requests
import json
import os
from zmq.auth import load_certificate
from datetime import datetime, timedelta
from Matching import IsTenderMatch
from openai import OpenAI


API_URL = 'http://127.0.0.1:5000'


if __name__ == "__main__":
    while True:
        command = input(">> ").lower()
        
        match command:
            case 'ai':
                client = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=os.getenv("AI_API_KEY")
                )
                response = client.chat.completions.create(
                    model="microsoft/mai-ds-r1:free",
                    messages=[{"role": "user",
                               "content": "Hello, world!"}]
                )
                print(response.choices[0].message.content)
            case 'tender':
                ted_url = 'https://ted.europa.eu/sv/search/result?classification-cpv=core&search-scope=ACTIVE'
                cpv_list = ["30100000", "45000000", "72000000"]
                Page(url=ted_url)
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
            case _:
                print("Invalid command. Please try again.")
