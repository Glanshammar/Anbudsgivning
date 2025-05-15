from Browser.browser import Browser
from time import sleep
from Browser.pagination import go_to_next_page
from typing import List, Dict, Optional, Tuple
import json

ted = "https://ted.europa.eu/en/search/result?classification-cpv=core&search-scope=ACTIVE"
tendium = "https://tendium.ai/se/upphandlingar/"
tendersontime_portal = 'https://www.tendersontime.com/sweden-tenders/'

def test_pagination_on_site(browser, url, num_pages=2):
    """
    Test pagination on a specific website by navigating through multiple pages
    
    Args:
        browser: Browser instance
        url: URL to test
        num_pages: Number of pages to navigate through
    """
    print(f"\n\nTesting pagination on {url}")
    browser.OpenPage(url)
    sleep(5)  # Wait for page to load
    
    for i in range(1, num_pages + 1):
        print(f"Currently on page {i}")
        
        # For the first page, try to get some information
        if i == 1:
            # Get the current URL to verify later if we changed pages
            current_url = browser.page.url
            print(f"Current URL: {current_url}")
            
            # Get the page title
            page_title = browser.page.title()
            print(f"Page title: {page_title}")
        
        if i < num_pages:
            # Try to navigate to the next page
            if go_to_next_page(browser, debug=True):
                print(f"Successfully navigated to page {i+1}")
                sleep(5)  # Wait for the page to load
                
                # Get the new URL to confirm the page changed
                new_url = browser.page.url
                if new_url != current_url:
                    print(f"URL changed: {new_url}")
                else:
                    print("URL didn't change, but may still have navigated (SPA)")
                
                # Get the new page title
                new_page_title = browser.page.title()
                if new_page_title != page_title:
                    print(f"Page title changed: {new_page_title}")
                
                # Update current info for the next comparison
                current_url = new_url
                page_title = new_page_title
            else:
                print(f"Failed to navigate to page {i+1}")
                break
    
    print(f"Finished testing pagination on {url}")

# Main code
browser = Browser(headless=False)

try:
    # Test different portals
    portals = [
        tendersontime_portal,
        ted,
        tendium
    ]
    
    for portal in portals:
        try:
            test_pagination_on_site(browser, portal, num_pages=2)
        except Exception as e:
            print(f"Error testing {portal}: {e}")
finally:
    browser.Quit()