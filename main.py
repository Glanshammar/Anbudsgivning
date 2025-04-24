from Data import DomainMain, Company, Consultant, TenderDocument, Calendar, Expertise, Page, GetLinks, PromptAI, mock_response
from Agents import AgentManager, AgentType
import requests
import json
import os
import re
from zmq.auth import load_certificate
from datetime import datetime, timedelta
from Matching import IsTenderMatch
from openai import OpenAI


API_URL = 'http://127.0.0.1:5000'
ted_url = 'https://ted.europa.eu/sv/search/result?classification-cpv=core&search-scope=ACTIVE'
tender_url = 'https://ted.europa.eu/sv/notice/-/detail/266375-2025'
cpv_list = ["30100000", "45000000", "72000000"]


if __name__ == "__main__":
    while True:
        command = input(">> ").lower()
        
        match command:
            case 'urls':
                urls = GetLinks(ted_url)
                print(urls, '\n\n')
                urls_string = "\n".join(urls)
                prompt = urls_string + "\n\n Give me a list of links of tender pages from these links I give to you. There's a certain pattern to how the links look like."
                response = PromptAI(prompt=prompt)
                print(response.choices[0].message.content)
                response_text = response.choices[0].message.content
                tender_pattern = r'https?://[^{}\s)>\]]+'
                pattern_regex = r'https?://[^\s]*[{}][^\s]*'
                tender_urls = re.findall(tender_pattern, response_text)
                pattern = re.findall(pattern_regex, response_text)
                print('\n'.join(str(item) for item in tender_urls))
                print('\n', pattern)
            case 'url2':
                tender_pattern = r'https?://[^{}\s)>\]]+'
                pattern_regex = r'https?://[^\s]*[{}][^\s]*'
                tender_urls = re.findall(tender_pattern, mock_response)
                pattern = re.findall(pattern_regex, mock_response)
                print('\n'.join(str(item) for item in tender_urls))
                print('Pattern: ', pattern)
            case 'doc':
                prompt = """Analyze the following links and return all tender document links as a list (PDF, DOC, DOCX, PPT, TXT, etc.) that are explicitly marked as English."""
                urls = GetLinks(tender_url)
                urls_string = "\n".join(urls)
                print(urls_string, '\n\n')
                response = PromptAI(urls_string + '\n\n' + prompt)
                print(response.choices[0].message.content)
            case 'tender':
                Page(url=tender_url)
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
