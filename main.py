from Data import (DomainMain, Company, Consultant, TenderDocument, Calendar, Expertise,
                   Page, GetLinksFromPage, PromptAI,  mock_response_tender_pages, GetLinksFromResponse,
                   mock_response_document_links)
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
                # Get all the URLs from a tender portal (TED as example), and prompts the LLM which ones are tender pages.
                urls = GetLinksFromPage(ted_url)
                print(urls, '\n\n')
                urls_string = "\n".join(urls)
                prompt = urls_string + "\n\n Give me a list of links of tender pages from these links I give to you. There's a certain pattern to how the links look like. Make a list of only the links that you found and nothing else."
                response = PromptAI(prompt=prompt)
                print(response.choices[0].message.content)
                response_string = response.choices[0].message.content
                tender_urls = GetLinksFromResponse(response_text=response_string)
                print('\n'.join(str(item) for item in tender_urls))
            case 'url2':
                # Parses the links from the response from the AI. This test uses a mock response.
                tender_urls = GetLinksFromResponse(response_text=mock_response_tender_pages)
                print('\n'.join(str(item) for item in tender_urls))
            case 'doc':
                # Get the links from a tender page and finds the document links
                prompt = """Analyze the following links and return all tender document links as a list (PDF, DOC, DOCX, PPT, TXT, etc.) that are explicitly marked as English. Make a list of only the links that you found and nothing else."""
                urls = GetLinksFromPage(tender_url)
                urls_string = "\n".join(urls)
                print(urls_string, '\n\n')
                response = PromptAI(urls_string + '\n\n' + prompt)
                print(response.choices[0].message.content)
                response_string = response.choices[0].message.content
                document_urls = GetLinksFromResponse(response_text=response_string)
                print('\n'.join(str(item) for item in document_urls))
            case 'doc2':
                document_urls = GetLinksFromResponse(response_text=mock_response_document_links)
                print('\n'.join(str(item) for item in document_urls))
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
