import os
import sys
import json
from time import sleep
import asyncio

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from Browser.text import extract_tender_data
from Browser.browser import Browser
from bs4 import BeautifulSoup
from Browser.browser_use_test import BrowserUseTest

ted = "https://ted.europa.eu/en/search/result?classification-cpv=core&search-scope=ACTIVE"
tendium = "https://tendium.ai/se/upphandlingar/"
tendersontime_portal = 'https://www.tendersontime.com/sweden-tenders/'
opic = "https://www.opic.se/sv/upphandlingar"

def generate_button_selector(html_element, name=None):
    """
    Generate a unique selector for a button based on its attributes and content.
    
    Args:
        html_element: BeautifulSoup element representing the button
        name: Optional name to identify this button type
        
    Returns:
        dict: Dictionary with selector and metadata
    """
    # Start with tag name - fix for getting root element in soup.find()
    if html_element.name == 'html':
        # This is the document root, find the first meaningful element instead
        meaningful_elements = html_element.find_all(['button', 'a', 'span', 'div'], recursive=True)
        if meaningful_elements:
            html_element = meaningful_elements[0]
    
    tag_name = html_element.name
    base_selector = tag_name
    
    # Add ID if available (highest specificity)
    element_id = html_element.get('id')
    if element_id:
        return {
            'selector': f'#{element_id}',
            'type': 'id',
            'description': f"{name or 'Button'} with ID"
        }
    
    # Add classes
    classes = html_element.get('class', [])
    if classes:
        class_selector = base_selector + ''.join(f'.{cls}' for cls in classes)
        
        # Add role if it exists
        role = html_element.get('role')
        if role == 'button':
            class_selector += '[role="button"]'
    else:
        class_selector = base_selector
    
    # Check for text content to make it more specific
    text = html_element.text.strip()
    if text and len(text) < 30:  # Only use short text to avoid huge selectors
        # Escape quotes in text
        text = text.replace('"', '\\"').replace("'", "\\'")
        text_selector = f'{class_selector}:has-text("{text}")'
        return {
            'selector': text_selector,
            'type': 'text',
            'description': f"{name or 'Button'} with text content"
        }
    
    # Check for distinctive attributes
    for attr in ['aria-label', 'title', 'name', 'data-testid']:
        attr_value = html_element.get(attr)
        if attr_value:
            return {
                'selector': f'{class_selector}[{attr}="{attr_value}"]',
                'type': 'attribute',
                'description': f"{name or 'Button'} with {attr} attribute"
            }
    
    # Check for distinctive icon/SVG
    svg = html_element.find('svg')
    if svg:
        path = svg.find('path')
        if path and path.get('d'):
            # First few characters of path are often enough to be distinctive
            path_start = path.get('d')[:15]
            return {
                'selector': f'{class_selector}:has(svg:has(path[d^="{path_start}"]))',
                'type': 'icon',
                'description': f"{name or 'Button'} with specific icon"
            }
    
    # Check for position in parent
    parent = html_element.parent
    if parent:
        siblings = parent.find_all(html_element.name, class_=classes[0] if classes else None)
        if len(siblings) > 1:
            for i, sibling in enumerate(siblings):
                if sibling == html_element:
                    return {
                        'selector': f'{class_selector}:nth-child({i+1})',
                        'type': 'position',
                        'description': f"{name or 'Button'} at position {i+1}"
                    }
    
    # Fallback to just the class selector
    return {
        'selector': class_selector,
        'type': 'class',
        'description': f"{name or 'Button'} with class selector only"
    }

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
            sleep(2)
        browser.Quit()
    case 'elements2':
        page:int = 1
        browser = Browser(headless=False)
        browser.OpenPage(ted)
        sleep(4)
        
        for i in range(10):
            next_page = str(page+1)
            # browser.page.locator("#btn-next").click()
            # browser.page.get_by_text(next_page).click()
            # browser.page.get_by_role("button", name="next page").click()
            page += 1
            sleep(3)
        browser.Quit()
    case 'elements3':
        button_examples = [
            {
                'html': '''
                
                ''',
                'name': ''
            }
        ]

        selectors = {}
        
        for example in button_examples:
            try:
                # Parse HTML properly by wrapping in a container
                html = f"<div>{example['html'].strip()}</div>"
                soup = BeautifulSoup(html, "lxml")
            except Exception as e:
                print(f"lxml parser not available, falling back to html.parser: {str(e)}")
                soup = BeautifulSoup(html, "html.parser")
                
            # Get the actual element of interest (first child of our wrapper div)
            root_element = soup.div.contents[0]
            while root_element.name is None and root_element.next_sibling:  # Skip text nodes
                root_element = root_element.next_sibling
            
            # Generate selector for this button
            selector_data = generate_button_selector(root_element, example['name'])
            selectors[example['name']] = selector_data
        
        # Save the selectors to a file
        with open(os.path.join(current_dir, "selectors.json"), "w") as f:
            json.dump(selectors, f, indent=2)

        print(f"Saved selectors:")
        for name, data in selectors.items():
            print(f"  - {name}: {data['selector']} ({data['description']})")
    case 'elements4':
        # Test using the selectors from selectors.json to click buttons
        try:
            selectors_path = os.path.join(current_dir, "selectors.json")
            with open(selectors_path, "r") as f:
                selectors = json.load(f)
            
            print(f"Loaded {len(selectors)} selectors from {selectors_path}")
            for name, data in selectors.items():
                print(f"  - {name}: {data['selector']} ({data['description']})")
            
            browser = Browser(headless=False)
            browser.OpenPage(ted)
            print(f"Opened page: {ted}")
            
            for name, data in selectors.items():
                selector = data['selector']
                print(f"\nAttempting to find and click {name} with selector: {selector}")
                
                try:
                    element = browser.WaitForElement(selector, timeout=5000)
                    if element:
                        print(f"✓ Found {name}")
                        browser.Click(selector)
                        print(f"✓ Clicked {name}")
                        sleep(3)
                    else:
                        print(f"✗ Element '{name}' not found with selector: {selector}")
                except Exception as e:
                    print(f"✗ Error with {name}: {str(e)}")
            
            print("\nTest completed")
            sleep(5)
        except Exception as e:
            print(f"Error during test: {str(e)}")
        finally:
            if 'browser' in locals():
                browser.Quit()
                print("Browser closed")
    case 'agent':
        async def run_browser_use_test():
            test = BrowserUseTest(model_name="phi")
            task = "Go to Reddit, search for 'runescape', and summarize the first post."
            result = await test.run_test(task)
            
            print("\nTest Results:")
            print(f"Status: {result['status']}")
            print(f"Task: {result['task']}")
            if result['status'] == 'success':
                print(f"Result: {result['result']}")
            else:
                print(f"Error: {result['error']}")
            print(f"Model used: {result['model']}")
        
        asyncio.run(run_browser_use_test())
