import requests
from bs4 import BeautifulSoup


def LinkGrab(url=None, href_filter=None):
    if url == None:
        print('You must pass a URL.')
        return
    links = []
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    print("Links found on the webpage:")
    for link in soup.find_all('a'):
        href = link.get('href')
        if href:
            if href_filter and href_filter.lower() in href.lower():
                links.append(href)
            elif not href_filter:
                links.append(href)
    
    for index, item in enumerate(links):
        print(index, item)
    
    return links


def TenderInfoGrab():
    pass