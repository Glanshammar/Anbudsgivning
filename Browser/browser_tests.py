import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from Browser.text import extract_tender_data
from Browser.browser import Browser
from time import sleep
import json
from bs4 import BeautifulSoup

ted = "https://ted.europa.eu/en/search/result?classification-cpv=core&search-scope=ACTIVE"
tendium = "https://tendium.ai/se/upphandlingar/"
tendersontime_portal = 'https://www.tendersontime.com/sweden-tenders/'

current_dir = os.path.dirname(os.path.abspath(__file__))

test = input("Test: ")

match test:
    case 'text':
        input_file = os.path.join(current_dir, "tender_links.txt")
        output_dir = os.path.join(current_dir, "tender_data")
        take_screenshots = True
        keep_temp_files = False
    
        print(f"Input file: {input_file}")
        print(f"Output directory: {output_dir}")
        print(f"Take screenshots: {'Yes' if take_screenshots else 'No'}")
        print(f"Keep temporary files: {'Yes' if keep_temp_files else 'No'}")
        
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Input file '{input_file}' not found.")
        
        # Process all links in the file
        print(f"Processing all URLs from {input_file}")
        
        try:
            # Use extract_tender_data with input_file parameter to process all URLs
            summary = extract_tender_data(
                url="",  # Empty URL since we're using input_file
                output_dir=output_dir,
                take_screenshots=take_screenshots,
                keep_temp_files=keep_temp_files,
                input_file=input_file
            )
            
            # Display brief summary
            print(f"\nProcessed {summary['total_urls']} URLs:")
            print(f"- Successful: {summary['successful']}")
            print(f"- Failed: {summary['failed']}")
            print(f"Summary saved to: {os.path.join(output_dir, 'processing_summary.json')}")
        except Exception as e:
            print(f"Error processing batch: {str(e)}")
    case 'elements':
        page:int = 1
        browser = Browser(headless=False)
        browser.OpenPage(ted)
        buttons = browser.page.locator("button")
        button_list = [buttons.nth(i) for i in range(buttons.count())]
        pagination_button = None
        for i in range(10):
            for button in button_list:
                if button.text_content() == str(page+1):
                    pagination_button = button
            pagination_button.click()
            page += 1
            sleep(3)
        browser.Quit()
    case 'elements2':
        with open("selectors.json") as f:
            selectors = json.load(f)
        browser = Browser(headless=False)
        browser.OpenPage(ted)
        browser.page.locator(selectors["pagination_button"]).click()
        sleep(10)
        browser.Quit()
    case 'elements3':
        html = '''
        <span class="CustomReactClasses-MuiButton-label">
        2
        <span class="CustomReactClasses-MuiButton-endIcon CustomReactClasses-MuiButton-iconSizeMedium">
            <svg class="CustomReactClasses-MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7L8 5z"></path>
            </svg>
        </span>
        </span>
        '''

        try:
            # Try lxml first as it's faster
            soup = BeautifulSoup(html, "lxml")
        except Exception as e:
            print(f"lxml parser not available, falling back to html.parser: {str(e)}")
            # Fall back to built-in parser
            soup = BeautifulSoup(html, "html.parser")

        target = soup.find("span", class_=True)

        # Build a CSS selector from tag and all classes
        tag = target.name
        classes = target.get("class", [])
        selector = tag + "".join(f".{cls}" for cls in classes)

        selectors = {
            "pagination_button": selector
        }
        with open(os.path.join(current_dir, "selectors.json"), "w") as f:
            json.dump(selectors, f, indent=2)

        print(f"Saved selector: {selector}")
    case 'elements4':
        with open(os.path.join(current_dir, "selectors.json")) as f:
            selectors = json.load(f)
        browser = Browser(headless=False)
        browser.OpenPage(ted)
        
        # Find all elements matching the selector
        elements = browser.page.locator(selectors["pagination_button"])
        print(f"Found {elements.count()} elements matching the selector")
        
        # Find the "Go to the next page" button based on the error message
        next_page_button = browser.page.get_by_role("button", name="Go to the next page").first
        next_page_button.click()
        
        print("Successfully clicked the next page button")
        sleep(10)
        browser.Quit()