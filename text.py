from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import os
import re
import time
import argparse
import sys

# Import visible text extraction functionality from extract_text
from extract_text import extract_visible_text

def extract_visible_text_from_page(page):
    """Extract visible text content from a webpage"""
    # Extract text content of visible elements, with simplified approach
    visible_text = page.evaluate("""() => {
        // Function to check if an element is visible
        function isVisible(elem) {
            if (!elem) return false;
            const style = window.getComputedStyle(elem);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' &&
                   style.opacity !== '0' &&
                   elem.offsetWidth > 0 &&
                   elem.offsetHeight > 0;
        }
        
        // Basic list of elements to exclude (common UI elements)
        const excludeTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'BUTTON', 'NAV', 'FOOTER'];
        const excludeClasses = ['cookie', 'header', 'footer', 'menu', 'navigation', 'nav'];
        
        // Get text from all elements, filtering out obvious UI components
        function extractTextFromNode(node) {
            if (!node) return '';
            if (node.nodeType === 3) return node.textContent; // Text node
            
            if (node.nodeType !== 1) return ''; // Not an element node
            if (!isVisible(node)) return '';
            
            // Skip certain elements
            if (excludeTags.includes(node.tagName)) return '';
            
            // Skip by class/id
            if (node.className && excludeClasses.some(cls => 
                node.className.toLowerCase().includes(cls))) return '';
            if (node.id && excludeClasses.some(cls => 
                node.id.toLowerCase().includes(cls))) return '';
            
            // Build text from this node and its children
            let result = '';
            for (let child of node.childNodes) {
                result += extractTextFromNode(child);
            }
            
            // Add spacing
            if (node.tagName === 'P' || node.tagName === 'DIV' || 
                node.tagName === 'LI' || node.tagName === 'TD' || 
                node.tagName === 'H1' || node.tagName === 'H2' || 
                node.tagName === 'H3' || node.tagName === 'H4') {
                result += ' ';
            }
            
            return result;
        }
        
        // Start from body
        return extractTextFromNode(document.body).trim();
    }""")
    
    # Clean up the text - remove excessive whitespace
    cleaned_text = re.sub(r'\s+', ' ', visible_text).strip()
    return cleaned_text

# We've removed the description extraction function as it's no longer needed

def extract_tender_info(soup, full_text, url=None, translate_to_english=False):
    """Extract structured tender information from the page"""
    tender_info = {
        "tender_id": "",
        "title": "",
        "url": url,
        "buyer": {
            "name": "",
            "email": "",
            "address": "",
            "country": ""
        },
        "contract": {
            "value": "",
            "currency": "",
            "estimated_value": "",
        },
        "dates": {
            "publication_date": "",
            "start_date": "",
            "end_date": "",
            "duration": "",
            "deadline": ""  # Single deadline field instead of separate ones
        },
        "cpv_codes": [],
        "reference_number": "",
        "status": ""
    }
    
    # Extract title and ID
    title_element = soup.find("h1")
    if title_element:
        title_text = title_element.get_text().strip()
        tender_info["title"] = title_text
        # The ID is often in the title
        if " - " in title_text:
            tender_info["tender_id"] = title_text.split(" - ")[0].strip()
    
    # Try multiple patterns for the tender ID/reference number
    id_patterns = [
        r"Reference\s*number\s*:?\s*([A-Za-z0-9\-_./]+)",
        r"Identifier\s*:?\s*([A-Za-z0-9\-_./]+)",
        r"Notice\s*number\s*:?\s*([A-Za-z0-9\-_./]+)",
        r"Publication\s*reference\s*:?\s*([A-Za-z0-9\-_./]+)"
    ]
    
    for pattern in id_patterns:
        id_match = re.search(pattern, full_text, re.IGNORECASE)
        if id_match and not tender_info["tender_id"]:
            tender_info["tender_id"] = id_match.group(1).strip()
            break

    # Extract buyer information with improved patterns
    buyer_name_patterns = [
        r"Official name\s*:?\s*([^\r\n:]+?)(?=\s*Email|\s*Registration|\s*Postal|\s*$)",
        r"Contracting authority\s*:?\s*([^\r\n:]+?)(?=\s*Email|\s*Registration|\s*Postal|\s*$)",
        r"Public buyer\s*:?\s*([^\r\n:]+?)(?=\s*Email|\s*Registration|\s*Postal|\s*$)",
        r"I\.1\)\s*Name\s*:?\s*([^\r\n:]+?)(?=\s*Address|\s*Contact|\s*$)",
        r"Organisation\s*:?\s*([^\r\n:]+?)(?=\s*Email|\s*Registration|\s*Postal|\s*$)"
    ]
    
    for pattern in buyer_name_patterns:
        name_match = re.search(pattern, full_text, re.IGNORECASE)
        if name_match:
            tender_info["buyer"]["name"] = name_match.group(1).strip()
            break
    
    # Email extraction
    email_match = re.search(r"Email\s*:?\s*([^\s@]+@[^\s@]+\.[^\s@]{2,})", full_text, re.IGNORECASE)
    if email_match:
        tender_info["buyer"]["email"] = email_match.group(1).strip()
    
    # Country extraction
    country_patterns = [
        r"Country\s*:?\s*([A-Za-z\s]+)(?=\s*[,.]|\s*$)",
        r"Member\s*state\s*:?\s*([A-Za-z\s]+)(?=\s*[,.]|\s*$)", 
    ]
    
    for pattern in country_patterns:
        country_match = re.search(pattern, full_text, re.IGNORECASE)
        if country_match:
            potential_country = country_match.group(1).strip()
            # Filter out common false positives
            if len(potential_country) > 2 and potential_country not in ["Start", "Estimated", "Duration", "Postal", "Email", "Reference"]:
                tender_info["buyer"]["country"] = potential_country
                break
    
    # Extract postal address
    address_patterns = [
        r"Postal address\s*:?\s*([^\r\n:]+?)(?=\s*Town|\s*Postcode|\s*City|\s*$)",
        r"Street\s*:?\s*([^\r\n:]+?)(?=\s*Town|\s*Postcode|\s*City|\s*$)",
        r"Address\s*:?\s*([^\r\n:]+?)(?=\s*Town|\s*Postcode|\s*City|\s*$)",
    ]
    
    for pattern in address_patterns:
        address_match = re.search(pattern, full_text, re.IGNORECASE)
        if address_match:
            tender_info["buyer"]["address"] = address_match.group(1).strip()
            break
    
    # Extract town/city information and add to address if found
    town_pattern = re.search(r"Town\s*:?\s*([^\r\n:]+?)(?=\s*Postcode|\s*$)", full_text, re.IGNORECASE)
    if town_pattern and tender_info["buyer"]["address"]:
        tender_info["buyer"]["address"] += ", " + town_pattern.group(1).strip()
    
    # Extract contract values
    value_patterns = [
        r"Value\s*:?\s*([\d\s,.]+)\s*([A-Z]{3})",
        r"Contract value\s*:?\s*([\d\s,.]+)\s*([A-Z]{3})",
        r"Total value\s*:?\s*([\d\s,.]+)\s*([A-Z]{3})",
    ]
    
    for pattern in value_patterns:
        value_match = re.search(pattern, full_text, re.IGNORECASE)
        if value_match:
            tender_info["contract"]["value"] = value_match.group(1).strip().replace(" ", "").replace(",", ".")
            tender_info["contract"]["currency"] = value_match.group(2).strip()
            break

    # Extract estimated value
    est_value_match = re.search(r"Estimated value[^:]*:?\s*([\d\s,.]+)\s*([A-Z]{3})", full_text, re.IGNORECASE)
    if est_value_match:
        tender_info["contract"]["estimated_value"] = est_value_match.group(1).strip().replace(" ", "").replace(",", ".")
        if not tender_info["contract"]["currency"]:
            tender_info["contract"]["currency"] = est_value_match.group(2).strip()
    
    # Extract dates - using a unified date format pattern
    date_formats = [
        r"\d{2}/\d{2}/\d{4}",  # DD/MM/YYYY
        r"\d{2}\.\d{2}\.\d{4}",  # DD.MM.YYYY
        r"\d{2}-\d{2}-\d{4}",   # DD-MM-YYYY
        r"\d{4}/\d{2}/\d{2}",   # YYYY/MM/DD
        r"\d{4}-\d{2}-\d{2}"    # YYYY-MM-DD
    ]
    
    date_pattern_combined = "|".join(f"({pattern})" for pattern in date_formats)
    
    # Start date
    start_date_match = re.search(fr"Start date\s*:?\s*({date_pattern_combined})", full_text, re.IGNORECASE)
    if start_date_match:
        for i in range(1, len(start_date_match.groups()) + 1):
            if start_date_match.group(i):
                date_str = start_date_match.group(i).strip()
                tender_info["dates"]["start_date"] = date_str
                break
    
    # End date
    end_date_match = re.search(fr"End date\s*:?\s*({date_pattern_combined})", full_text, re.IGNORECASE)
    if end_date_match:
        for i in range(1, len(end_date_match.groups()) + 1):
            if end_date_match.group(i):
                date_str = end_date_match.group(i).strip()
                tender_info["dates"]["end_date"] = date_str
                break
    
    # Publication date
    pub_date_match = re.search(fr"Publication date\s*:\s*({date_pattern_combined})", full_text)
    if pub_date_match:
        for i in range(1, len(pub_date_match.groups()) + 1):
            if pub_date_match.group(i):
                tender_info["dates"]["publication_date"] = pub_date_match.group(i).strip()
                break
    
    # Deadline (most important)
    deadline_patterns = [
        fr"Time limit for receipt of tenders\s*:?\s*Date\s*:?\s*({date_pattern_combined})",
        fr"Deadline for receipt of tenders\s*:?\s*({date_pattern_combined})",
        fr"tenders must be received by\s*:?\s*({date_pattern_combined})",
        fr"submission\s*deadline\s*:?\s*({date_pattern_combined})",
        fr"closing date for tenders\s*:?\s*({date_pattern_combined})",
        fr"deadline for submission of (tender|bid)s?\s*:?\s*({date_pattern_combined})"
    ]
    
    for pattern in deadline_patterns:
        deadline_match = re.search(pattern, full_text, re.IGNORECASE)
        if deadline_match:
            if "tender|bid" in pattern:
                date_str = deadline_match.group(2).strip()
            else:
                date_str = deadline_match.group(1).strip()
            tender_info["dates"]["deadline"] = date_str
            break
    
    # Duration in months/days
    duration_match = re.search(r"Duration.*?(\d+)\s+(month|day|week|year)s?", full_text, re.IGNORECASE)
    if duration_match:
        duration_count = duration_match.group(1)
        duration_unit = duration_match.group(2).lower()
        tender_info["dates"]["duration"] = f"{duration_count} {duration_unit}s"
    
    # Extract CPV codes with improved patterns
    cpv_patterns = [
        r"Main\s*classification\s*\(\s*cpv\s*\)\s*:?\s*(\d+)\s*([A-Za-z\s\-–]+?)(?=\s*\d|\s*\(|\s*$)",
        r"CPV\s*code.*?main.*?:?\s*(\d+)\s*([A-Za-z\s\-–]+?)(?=\s*\d|\s*\(|\s*$)",
        r"CPV.*?:?\s*(\d+)\s*([A-Za-z\s\-–]+?)(?=\s*\d|\s*\(|\s*$)",
    ]
    
    # Deduplicate CPV codes
    seen_cpv_codes = set()
    
    for pattern in cpv_patterns:
        cpv_matches = re.finditer(pattern, full_text, re.IGNORECASE)
        for match in cpv_matches:
            code = match.group(1).strip()
            description = match.group(2).strip()
            
            # Only add if we haven't seen this code before
            if code not in seen_cpv_codes:
                seen_cpv_codes.add(code)
                tender_info["cpv_codes"].append({
                    "code": code,
                    "description": description
                })
    
    # Extract status with multiple patterns
    status_patterns = [
        r"Status\s*:\s*([A-Za-z\s\-]+?)(?=\s*[,.]|\s*$|\r|\n)",
        r"Tender status\s*:\s*([A-Za-z\s\-]+?)(?=\s*[,.]|\s*$|\r|\n)",
        r"Current status\s*:\s*([A-Za-z\s\-]+?)(?=\s*[,.]|\s*$|\r|\n)",
        r"Procurement status\s*:\s*([A-Za-z\s\-]+?)(?=\s*[,.]|\s*$|\r|\n)",
    ]
    
    # Initialize status as empty
    tender_info["status"] = ""
    
    for pattern in status_patterns:
        status_match = re.search(pattern, full_text, re.IGNORECASE)
        if status_match:
            potential_status = status_match.group(1).strip()
            # Validate the status - ensure it's not random text or settings
            if (len(potential_status) > 0 and 
                len(potential_status) < 50 and 
                "=" not in potential_status and
                "setting" not in potential_status.lower()):
                tender_info["status"] = potential_status
                break
    
    # Extract reference number
    ref_patterns = [
        r"Reference\s*number\s*:?\s*([^\r\n:]+?)(?=\s*[,.]|\s*$)",
        r"Tender reference\s*:?\s*([^\r\n:]+?)(?=\s*[,.]|\s*$)",
    ]
    
    for pattern in ref_patterns:
        ref_match = re.search(pattern, full_text, re.IGNORECASE)
        if ref_match:
            tender_info["reference_number"] = ref_match.group(1).strip()
            break
    
# Translation code removed
    
    return tender_info

def clean_extracted_data(tender_info):
    """Clean up the extracted data by removing partial matches and duplicates"""
    
    # Filter out partial matches in tender_info['buyer']['name']
    if tender_info['buyer']['name'] and 'Email' in tender_info['buyer']['name']:
        tender_info['buyer']['name'] = tender_info['buyer']['name'].split('Email')[0].strip()
    
    # Filter out partial country matches
    if tender_info['buyer']['country'] and any(word in tender_info['buyer']['country'] for word in 
                                             ['Start', 'Estimated', 'Duration', 'Postal']):
        tender_info['buyer']['country'] = ''
    
    # Additional status validation
    if tender_info['status']:
        # Check for invalid status content
        invalid_status_indicators = ['=', 'settings', 'undefined', '{', '}', '<', '>', 'null']
        if any(indicator in tender_info['status'].lower() for indicator in invalid_status_indicators):
            tender_info['status'] = ''
    
    # Clean up descriptions for CPV codes
    for cpv in tender_info['cpv_codes']:
        # Remove newlines and standardize spacing
        if cpv['description']:
            cpv['description'] = re.sub(r'\s+', ' ', cpv['description']).strip()
            
            # Remove common suffixes
            for suffix in ['classification', 'Legal basis', 'Postal address', 'General information', 'Additional']:
                if suffix in cpv['description']:
                    cpv['description'] = cpv['description'].split(suffix)[0].strip()
    
    return tender_info

def extract_tender_data(url, output_dir="tender_data"):
    """Main function to extract tender data from a URL"""
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Create a temporary directory for intermediate files
    temp_dir = os.path.join(output_dir, "temp_" + str(int(time.time())))
    os.makedirs(temp_dir, exist_ok=True)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1366, "height": 900})
            page = context.new_page()
        
            # Navigate to the page and wait for content to load
            print(f"Navigating to tender page: {url}")
            page.goto(url, wait_until="networkidle")
            
            # Wait for the page to be ready
            page.wait_for_selector("body", state="visible", timeout=60000)
            print("Page loaded successfully")
            
            # Extract visible text from page directly
            print("Extracting visible text from page...")
            visible_text = extract_visible_text_from_page(page)
            
            # Save the extracted text for debugging purposes
            with open(os.path.join(temp_dir, "visible_text.txt"), "w", encoding="utf-8") as f:
                f.write(visible_text)
            
            # Get page title
            page_title = page.title()
            print(f"Page title: {page_title}")
        
            # Get rendered HTML and parse with BeautifulSoup
            html = page.content()
            soup = BeautifulSoup(html, "html.parser")
            
            # Use the extracted visible text + raw HTML for regex extraction
            combined_text = visible_text + "\n\n" + html
            
            # Extract structured information
            tender_info = extract_tender_info(soup, combined_text, url)
            
            # Clean up the extracted data
            tender_info = clean_extracted_data(tender_info)
            
            # Print summary
            print(f"\nTender ID: {tender_info['tender_id']}")
            print(f"Title: {tender_info['title']}")
            print(f"URL: {tender_info['url']}")
            print(f"Buyer: {tender_info['buyer']['name']}")
            print(f"Buyer Email: {tender_info['buyer']['email']}")
            print(f"Deadline: {tender_info['dates']['deadline']}")
            
            # Save the structured data as the only permanent output
            json_path = os.path.join(output_dir, "tender_info.json")
            # Also save with tender-specific filename for easier identification
            tender_id_safe = tender_info['tender_id'].replace("-", "_").replace("/", "_")
            specific_json_path = os.path.join(output_dir, f"{tender_id_safe}.json")
            
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(tender_info, f, indent=2, ensure_ascii=False)
            
            with open(specific_json_path, "w", encoding="utf-8") as f:
                json.dump(tender_info, f, indent=2, ensure_ascii=False)
            
            print(f"\nTender data saved to '{json_path}'")
            
            browser.close()
            
            return tender_info
    finally:
        # Clean up the temporary directory
        import shutil
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                print(f"Temporary directory '{temp_dir}' has been removed")
            except Exception as e:
                print(f"Warning: Could not remove temporary directory: {str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract tender data from websites")
    parser.add_argument("-i", "--input", default="tender_links.txt", help="Input file with tender URLs (one per line)")
    parser.add_argument("-o", "--output", default="tender_data", help="Output directory for tender data")
    args = parser.parse_args()
    
    input_file = args.input
    output_dir = args.output
    
    # Check if the input file exists
    if not os.path.exists(input_file):
        print(f"Input file '{input_file}' not found. Creating a sample file.")
        with open(input_file, "w") as f:
            f.write("https://ted.europa.eu/en/notice/-/detail/266375-2025\n")
        print(f"Created '{input_file}' with a sample URL. Edit this file to add your own URLs.")
    
    # Read URLs from the file
    with open(input_file, "r") as f:
        urls = [line.strip() for line in f if line.strip()]
    
    print(f"Found {len(urls)} URLs to process.")
    
    # Process each URL
    for i, url in enumerate(urls):
        print(f"\nProcessing URL {i+1}/{len(urls)}: {url}")
        
        try:
            tender_info = extract_tender_data(url, output_dir)
            print(f"Successfully processed: {tender_info['title']}")
        except Exception as e:
            print(f"Error processing URL: {url}")
            print(f"Error details: {str(e)}")
