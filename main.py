from Data import (Company, Consultant, TenderDocument, Calendar, Expertise, GetLinksFromResponse,
                   Page, GetLinksFromPage, PromptAI,  mock_response_tender_pages, mock_response_document_links)
from Agents import AgentManager, AgentType
from selenium import webdriver
import requests
from time import sleep
import userpaths
import json
import os
import re
import pymupdf
from datetime import datetime, timedelta
from Matching import IsTenderMatch
from dotenv import load_dotenv


load_dotenv()
documents_folder = userpaths.get_my_documents()
app_folder = os.path.join(documents_folder, 'AnbudApp')
os.makedirs(app_folder, exist_ok=True)
API_URL = 'http://127.0.0.1:5000'
ted_portal = 'https://ted.europa.eu/en/search/result?classification-cpv=core&search-scope=ACTIVE'
tender_url = 'https://ted.europa.eu/en/notice/-/detail/266375-2025'
tendium_portal = 'https://tendium.ai/se/upphandlingar/'
tendersontime_portal = 'https://www.tendersontime.com/sweden-tenders/'


if __name__ == "__main__":
    while True:
        command = input(">> ").lower()
        
        match command:
            case 'ted':
                url = "https://api.ted.europa.eu/v3/notices/search"
                ted_api_key = os.getenv("TED_API_KEY")

                headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }

                body = {
                    "query": "software",
                    "fields": ["ND", "PD", "TITLE"],
                    "page": 1,
                    "limit": 30
                }

                response = requests.post(url, headers=headers, data=json.dumps(body))
                if response.status_code == 200:
                    data = response.json()
                    print(data)
                else:
                    print(f"Error: {response.status_code} - {response.text}")
            case 'pages':
                Page(ted_portal)
                Page(tender_url)
            case 'urls':
                urls = GetLinksFromPage(tendersontime_portal)
                for url in urls:
                    print(url)
            case 'tenders':
                # Get all the URLs from a tender portal (TED as example), and prompts the LLM which ones are tender pages.
                urls = GetLinksFromPage(tendersontime_portal)
                urls_string = "\n".join(urls)
                prompt = urls_string + """\n\n From the links I provide, extract only the URLs that lead to individual tender detail pages. By "tender detail page," I mean the specific page for a single procurement opportunity, which you access by clicking on a tender in a list or search results on a procurement website.
                Only include links that match the pattern for tender detail pages. Output a list of these URLs only, and no duplicates."""

                print('Waiting for LLM to answer...')
                response = PromptAI(prompt=prompt)
                print(response.choices[0].message.content)
                response_string = response.choices[0].message.content
                tender_urls = GetLinksFromResponse(response_text=response_string)
                print("\n\nHere's a list of links to tender pages:")
                print('\n'.join(str(item) for item in tender_urls))
            case 'tenders2':
                # Parses the links from the response from the AI useing a mock response.
                tender_urls = GetLinksFromResponse(response_text=mock_response_tender_pages)
                print('\n'.join(str(item) for item in tender_urls))
            case 'tenderinfo':
                tender_document = os.path.join(app_folder, 'tender.pdf')
                doc = pymupdf.open(tender_document)
                text = ""
                for page in doc:
                    page_text = page.get_text()
                    if page_text:
                        text += page_text
                tender_info = 'Give me info about this tender (The buyer, project details, procedures, award criteria, dates, additional info, etc.).\n\n' + text
                print('Waiting for LLM to answer...')
                response = PromptAI(tender_info)
                print(response.choices[0].message.content)
            case 'doc':
                # Get the document links from a tender page and finds the document links.
                language = input('What language do you want the documents?: ')
                prompt = f"Analyze the following links and return all tender document links as a list (PDF, DOC, DOCX, TXT, etc.) that are either explicitly marked as {language} or are most likely to be in {language}. Make a list of only the links that you found and nothing else."
                urls = GetLinksFromPage(tender_url)
                urls_string = "\n".join(urls)
                print(urls_string, '\n\n')
                response = PromptAI(urls_string + '\n\n' + prompt)
                print(response.choices[0].message.content)
                response_string = response.choices[0].message.content
                document_urls = GetLinksFromResponse(response_text=response_string)
                print('\n'.join(str(item) for item in document_urls))
            case 'doc2':
                # Get the document links from a tender page and finds the document links using a mock response.
                document_urls = GetLinksFromResponse(response_text=mock_response_document_links)
                print('\n'.join(str(item) for item in document_urls))
                options = webdriver.ChromeOptions()
                prefs = {
                    "download.default_directory": app_folder,
                    "download.prompt_for_download": False,
                    "download.directory_upgrade": True,
                    "safebrowsing.enabled": True
                }
                options.add_experimental_option("prefs", prefs)
                driver = webdriver.Chrome(options=options)
                driver.get(document_urls[0])
                sleep(2)
                driver.quit()
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
            case _:
                print("Invalid command. Please try again.")
