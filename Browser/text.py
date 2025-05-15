from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import os
import re
import time
import sys
import shutil
import subprocess
import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple


def extract_text_from_images(image_paths: List[str]) -> str:
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        print("Error: pytesseract and/or Pillow not installed.")
        print("Please install them using: pip install pytesseract Pillow")
        return ""
    
    all_text = []
    
    for image_path in image_paths:
        try:
            # Open the image
            img = Image.open(image_path)
            
            # Extract text from the image
            text = pytesseract.image_to_string(img)
            
            # Add to the combined text
            all_text.append(text)
            
            print(f"Extracted {len(text)} characters from {image_path}")
        except Exception as e:
            print(f"Error extracting text from {image_path}: {str(e)}")
    
    # Combine all text with newlines between images
    combined_text = "\n\n".join(all_text)
    
    return combined_text

def extract_visible_text_from_page(page):
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


def normalize_currency(currency: str) -> str:
    if not currency:
        return ""
        
    # Convert to uppercase and strip any whitespace
    currency = currency.upper().strip()
    
    # Filter out common non-currency words that get extracted incorrectly
    invalid_currencies = [
        "OF", "THE", "FOR", "AND", "IS", "IN", "TO", "AT", "BY", "OR", 
        "IF", "AS", "ON", "THIS", "WITH", "FROM", "AN", "BE", "ALL", "THAT",
        "VALUE", "AMOUNT", "TOTAL", "COST", "PRICE", "SUM", "RATE"
    ]
    
    # If the currency is just a common word (not a currency), return empty string
    if currency in invalid_currencies:
        return ""
    
    # Common currency code mappings
    currency_map = {
        "EUR": "EUR",
        "EU": "EUR",
        "EURO": "EUR",
        "EUROS": "EUR",
        "€": "EUR",
        "EXC": "EUR",
        "EUROPEAN": "EUR",
        
        "USD": "USD",
        "US$": "USD",
        "DOLLAR": "USD",
        "DOLLARS": "USD",
        "$": "USD",
        
        "GBP": "GBP",
        "POUND": "GBP",
        "POUNDS": "GBP",
        "£": "GBP",
        "UKL": "GBP",
        
        "SEK": "SEK",
        "KR": "SEK",
        "KRONA": "SEK",
        "KRONOR": "SEK",
        
        "NOK": "NOK",
        "KRONE": "NOK",
        
        "DKK": "DKK",
        
        "PLN": "PLN",
        "ZLOTY": "PLN",
        
        "CHF": "CHF",
    }
    
    # Check if the currency is already a standard code
    if currency in currency_map:
        return currency_map[currency]
    
    # Handle common currency names and errors
    for key, value in currency_map.items():
        if key in currency:
            return value
    
    # For European tenders, default to EUR if we can't determine the currency
    # but it seems like it might be Euro-related
    if any(word in currency for word in ["E", "MONETARY", "EU "]):
        return "EUR"
    
    # If the currency is just a single letter or very short, it's likely an error
    if len(currency) <= 1:
        return ""
        
    # If the currency is too long, it's likely not a currency code
    if len(currency) > 5:
        return ""
        
    # Return the original if it looks like a valid currency code
    if currency.isalpha() and len(currency) == 3:
        return currency
        
    # Default to empty string for anything else
    return ""

def extract_tender_info(soup, full_text, url=None, translate_to_english=False):
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
        r"Country\s*:?\s*([A-Za-z\s]+?)(?=\s*[,.]|\r|\n|\s*This|\s*$)",
        r"Member\s*state\s*:?\s*([A-Za-z\s]+?)(?=\s*[,.]|\r|\n|\s*This|\s*$)",
        r"Country\s*:?\s*(France|Germany|Italy|Spain|United Kingdom|UK|Belgium|Netherlands|Portugal|Sweden|Denmark|Finland|Austria|Greece|Ireland|Luxembourg|Poland|Czech Republic|Hungary|Romania|Bulgaria|Croatia|Cyprus|Estonia|Latvia|Lithuania|Malta|Slovakia|Slovenia)(?:\s*[,.]|\r|\n|\s*This|\s*$)"
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
    
    # Extract contract values with improved patterns
    value_patterns = [
        r"Value\s*:?\s*([\d\s,.]+)\s*([A-Za-z€£$]+)",
        r"Contract value\s*:?\s*([\d\s,.]+)\s*([A-Za-z€£$]+)",
        r"Total value\s*:?\s*([\d\s,.]+)\s*([A-Za-z€£$]+)",
        r"Estimated\s*value\s*:?\s*([\d\s,.]+)\s*([A-Za-z€£$]+)",
        r"Value excluding VAT\s*:?\s*([\d\s,.]+)\s*([A-Za-z€£$]+)"
    ]
    
    for pattern in value_patterns:
        value_match = re.search(pattern, full_text, re.IGNORECASE)
        if value_match:
            value_str = value_match.group(1).strip()
            # Only store the value if it looks like a valid number
            if re.search(r'\d', value_str):
                tender_info["contract"]["value"] = value_str.replace(" ", "").replace(",", ".")
                
                # Extract and normalize currency
                currency_str = value_match.group(2).strip()
                normalized_currency = normalize_currency(currency_str)
                if normalized_currency:
                    tender_info["contract"]["currency"] = normalized_currency
                
                break

    # Extract estimated value if not already found
    est_value_patterns = [
        r"Estimated value[^:]*:?\s*([\d\s,.]+)\s*([A-Za-z€£$]+)",
        r"Estimated total value\s*:?\s*([\d\s,.]+)\s*([A-Za-z€£$]+)"
    ]
    
    for pattern in est_value_patterns:
        est_value_match = re.search(pattern, full_text, re.IGNORECASE)
        if est_value_match:
            tender_info["contract"]["estimated_value"] = est_value_match.group(1).strip().replace(" ", "").replace(",", ".")
            if not tender_info["contract"]["currency"]:
                tender_info["contract"]["currency"] = normalize_currency(est_value_match.group(2).strip())
            break
    
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
        r"Main\s*classification\s*\(\s*cpv\s*\)\s*:?\s*(\d{8})\s*([A-Za-z\s\-–]+?)(?=\s*\d|\s*\(|\s*$)",
        r"CPV\s*code.*?main.*?:?\s*(\d{8})\s*([A-Za-z\s\-–]+?)(?=\s*\d|\s*\(|\s*$)",
        r"CPV.*?:?\s*(\d{8})\s*([A-Za-z\s\-–]+?)(?=\s*\d|\s*\(|\s*$)",
    ]
    
    # Deduplicate CPV codes
    seen_cpv_codes = set()
    
    for pattern in cpv_patterns:
        cpv_matches = re.finditer(pattern, full_text, re.IGNORECASE)
        for match in cpv_matches:
            code = match.group(1).strip()
            description = match.group(2).strip()
            
            # Skip if it looks like a duration or other non-CPV numeric reference
            if (re.match(r'^\d{1,3}$', code) and 
                any(word in description.lower() for word in ['month', 'year', 'day', 'week', 'hour'])):
                continue
                
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
    return tender_info

def is_valid_cpv_code(code: str) -> bool:
    """Validate if a string is likely a CPV code"""
    # CPV codes are typically 8 digits and may have an optional digit or letter suffix
    # Main divisions start with specific numbers (e.g., 03, 09, 14, ...)
    
    # Check if it's a pure digit and appropriate length
    if not code.isdigit():
        return False
        
    # Check length - most CPV codes are 8 digits
    if len(code) < 5 or len(code) > 12:  # Allow some flexibility
        return False
        
    # Check for common CPV division prefixes (2-digit)
    common_prefixes = [
        '03', '09', '14', '15', '16', '18', '19', '22', '24', '30', 
        '31', '32', '33', '34', '35', '37', '38', '39', '41', '42', 
        '43', '44', '45', '48', '50', '51', '55', '60', '63', '64', 
        '65', '66', '70', '71', '72', '73', '75', '76', '77', '79', 
        '80', '85', '90', '92', '98'
    ]
    
    prefix = code[:2]
    
    # If it's a very short code (1-3 digits), it's likely not a CPV code
    if len(code) <= 3:
        return False
        
    # If it's a longer code, check if it starts with a common CPV prefix
    if len(code) >= 5:
        # If we don't recognize the prefix but it's the right length, still accept it
        # as it might be a valid CPV code we don't have in our list
        return True
        
    return False

def normalize_status(status: str) -> str:
    status_lower = status.lower().strip()
    
    # Map various status values to standard statuses
    if any(word in status_lower for word in ['active', 'open', 'ongoing', 'current']):
        return 'Active'
    
    if any(word in status_lower for word in ['closed', 'expired', 'terminated', 'completed', 'awarded']):
        return 'Expired'
        
    if any(word in status_lower for word in ['cancel', 'withdrawn', 'abort']):
        return 'Cancelled'
        
    if any(word in status_lower for word in ['draft', 'planned', 'upcoming', 'future']):
        return 'Planned'
    
    # If we can't normalize it, return the original with proper capitalization
    return status.strip()

def clean_extracted_data(tender_info):
    # Filter out partial matches in tender_info['buyer']['name']
    if tender_info['buyer']['name'] and 'Email' in tender_info['buyer']['name']:
        tender_info['buyer']['name'] = tender_info['buyer']['name'].split('Email')[0].strip()
    
    # Filter out partial country matches
    if tender_info['buyer']['country'] and any(word in tender_info['buyer']['country'] for word in 
                                             ['Start', 'Estimated', 'Duration', 'Postal']):
        tender_info['buyer']['country'] = ''
    
    # Normalize and validate currency
    if tender_info['contract']['currency']:
        normalized_currency = normalize_currency(tender_info['contract']['currency'])
        # Only keep the currency if it's valid after normalization
        if normalized_currency:
            tender_info['contract']['currency'] = normalized_currency
        else:
            # If we couldn't normalize it, assume it's invalid and remove it
            tender_info['contract']['currency'] = ""
            
    # Look for evidence of Euro in the text if we don't have a currency
    if not tender_info['contract']['currency'] and tender_info['contract']['value']:
        # For European tenders, default to EUR if we have a value but no currency
        if tender_info['buyer']['country'] in ["France", "Germany", "Italy", "Spain", 
                                             "Belgium", "Netherlands", "Portugal", 
                                             "Sweden", "Denmark", "Finland", "Austria", 
                                             "Greece", "Ireland", "Luxembourg", "Poland", 
                                             "Czech Republic", "Hungary", "Romania", 
                                             "Bulgaria", "Croatia", "Cyprus", "Estonia", 
                                             "Latvia", "Lithuania", "Malta", "Slovakia", 
                                             "Slovenia"]:
            tender_info['contract']['currency'] = "EUR"
    
    # Additional status validation
    if tender_info['status']:
        # Check for invalid status content
        invalid_status_indicators = ['=', 'settings', 'undefined', '{', '}', '<', '>', 'null']
        if any(indicator in tender_info['status'].lower() for indicator in invalid_status_indicators):
            tender_info['status'] = ''
        else:
            # Normalize the status to a standard format
            tender_info['status'] = normalize_status(tender_info['status'])
    
    # Clean up and validate CPV codes
    valid_cpv_codes = []
    for cpv in tender_info['cpv_codes']:
        # Validate the code format - CPV codes should be numeric and at least 8 digits
        if not is_valid_cpv_code(cpv['code']):
            print(f"Removing invalid CPV code: {cpv['code']} - {cpv['description']}")
            continue
            
        # Filter out duration-related descriptions
        if any(word in cpv['description'].lower() for word in ['month', 'year', 'day', 'week', 'duration']):
            if cpv['description'].lower().strip() == 'months' or re.match(r'^\d+\s+(month|year|day|week)s?$', cpv['description'], re.IGNORECASE):
                print(f"Removing duration-related CPV entry: {cpv['code']} - {cpv['description']}")
                continue
        
        # Remove newlines and standardize spacing
        if cpv['description']:
            cpv['description'] = re.sub(r'\s+', ' ', cpv['description']).strip()
            
            # Remove common suffixes
            for suffix in ['classification', 'Legal basis', 'Postal address', 'General information', 'Additional']:
                if suffix in cpv['description']:
                    cpv['description'] = cpv['description'].split(suffix)[0].strip()
        
        valid_cpv_codes.append(cpv)
    
    # Replace the CPV codes with the validated list
    tender_info['cpv_codes'] = valid_cpv_codes
    
    # Check if deadline has passed and update status accordingly
    if tender_info['dates']['deadline']:
        try:
            # Try different date formats
            deadline_date = None
            date_formats = [
                "%d/%m/%Y",  # DD/MM/YYYY
                "%d.%m.%Y",  # DD.MM.YYYY
                "%d-%m-%Y",  # DD-MM-YYYY
                "%Y/%m/%d",  # YYYY/MM/DD
                "%Y-%m-%d"   # YYYY-MM-DD
            ]
            
            for date_format in date_formats:
                try:
                    deadline_date = datetime.datetime.strptime(tender_info['dates']['deadline'], date_format).date()
                    break
                except ValueError:
                    continue
            
            if deadline_date:
                current_date = datetime.date.today()
                if current_date > deadline_date:
                    tender_info['status'] = 'Expired'
                    print(f"Setting status to Expired as deadline ({tender_info['dates']['deadline']}) has passed")
                else:
                    # Set status to Active if the deadline hasn't passed yet
                    tender_info['status'] = 'Active'
                    print(f"Setting status to Active as deadline ({tender_info['dates']['deadline']}) has not passed yet")
        except Exception as e:
            print(f"Error parsing deadline date: {e}")
    else:
        # If no deadline is specified but we have other tender info, assume it's active
        if tender_info['tender_id'] or tender_info['title']:
            if not tender_info['status']:  # Only set if status is empty
                tender_info['status'] = 'Active'
                print("No deadline specified, but setting status to Active based on available tender information")
    
    # Final status check - ensure we have a status when we have tender details
    if not tender_info['status'] and (tender_info['tender_id'] or tender_info['title']):
        # If we reached here without setting a status but have tender details, default to Active
        tender_info['status'] = 'Active'
        print("Setting default status to Active")
    
    return tender_info

def take_full_page_screenshot(page, output_path: str, scroll_delay: float = 0.5) -> List[str]:
    # Create the output directory if it doesn't exist
    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Get the page dimensions
    dimensions = page.evaluate("""() => {
        return {
            windowHeight: window.innerHeight,
            documentHeight: document.documentElement.scrollHeight,
            windowWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth
        }
    }""")
    
    window_height = dimensions['windowHeight']
    document_height = dimensions['documentHeight']
    
    # Calculate the number of screenshots needed
    num_screenshots = max(1, int(document_height / (window_height * 0.8)))  # Overlap by 20%
    
    screenshot_paths = []
    
    # Take screenshots while scrolling
    for i in range(num_screenshots):
        # Calculate scroll position
        scroll_position = i * (window_height * 0.8)
        if i == num_screenshots - 1:  # Last screenshot
            scroll_position = document_height - window_height
        
        # Scroll to position
        page.evaluate(f"window.scrollTo(0, {scroll_position})")
        
        # Wait for any lazy-loaded content to appear
        time.sleep(scroll_delay)
        
        # Take the screenshot
        screenshot_path = str(output_dir / f"screenshot_{i:03d}.png")
        page.screenshot(path=screenshot_path)
        screenshot_paths.append(screenshot_path)
        
        print(f"Screenshot {i+1}/{num_screenshots} saved to {screenshot_path}")
    
    # Return to the top of the page
    page.evaluate("window.scrollTo(0, 0)")
    
    return screenshot_paths

def extract_tender_data(url: str, output_dir: str = "tender_data", take_screenshots: bool = False, 
                        keep_temp_files: bool = False, input_file: Optional[str] = None) -> Dict[str, Any]:
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Check if we're processing multiple URLs from a file
    if input_file:
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
        
        results = []
        
        # Extract and process each URL
        for i, current_url in enumerate(urls):
            print(f"\nProcessing URL {i+1}/{len(urls)}: {current_url}")
            
            try:
                # Extract tender data for this URL (recursive call without input_file)
                tender_info = extract_tender_data(
                    current_url, 
                    output_dir, 
                    take_screenshots=take_screenshots,
                    keep_temp_files=keep_temp_files
                )
                
                # Add to results
                results.append({
                    "url": current_url,
                    "tender_id": tender_info["tender_id"],
                    "title": tender_info["title"],
                    "buyer": tender_info["buyer"]["name"],
                    "deadline": tender_info["dates"]["deadline"],
                    "status": tender_info["status"]
                })
                
                print(f"Successfully processed tender: {tender_info['title']}")
                
            except Exception as e:
                print(f"Error processing URL: {current_url}")
                print(f"Error details: {str(e)}")
                
                # Add failed URL to results with error info
                results.append({
                    "url": current_url,
                    "error": str(e),
                    "status": "Failed"
                })
        
        # Create summary
        summary = {
            "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_urls": len(urls),
            "successful": len([r for r in results if "error" not in r]),
            "failed": len([r for r in results if "error" in r]),
            "results": results
        }
        
        # Save summary to file
        summary_file = os.path.join(output_dir, "processing_summary.json")
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\nProcessing complete. {summary['successful']} of {len(urls)} URLs successfully processed.")
        print(f"Summary saved to: {summary_file}")
        
        return summary
    
    # Single URL processing - existing code
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
            
            # Take screenshots if requested
            screenshot_paths = []
            screenshot_text = ""
            if take_screenshots:
                print("Taking full page screenshots...")
                screenshots_dir = os.path.join(temp_dir, "screenshots")
                screenshot_paths = take_full_page_screenshot(page, screenshots_dir)
                print(f"Took {len(screenshot_paths)} screenshots of the page")
                
                # Extract text from screenshots using OCR
                print("Extracting text from screenshots using OCR...")
                screenshot_text = extract_text_from_images(screenshot_paths)
                
                # Save the OCR text for debugging
                ocr_text_path = os.path.join(temp_dir, "ocr_text.txt")
                with open(ocr_text_path, "w", encoding="utf-8") as f:
                    f.write(screenshot_text)
                print(f"OCR text saved to {ocr_text_path}")
            
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
            
            # Combine all text sources for comprehensive extraction
            if screenshot_text:
                combined_text = visible_text + "\n\n" + screenshot_text + "\n\n" + html
            else:
                combined_text = visible_text + "\n\n" + html
        
            # Extract & clean structured information
            tender_info = extract_tender_info(soup, combined_text, url)
            tender_info = clean_extracted_data(tender_info)
            
            # If we're keeping temp files, update the screenshot paths to be relative to output directory
            if keep_temp_files and take_screenshots:
                # Create permanent copies of the screenshots
                permanent_screenshots_dir = os.path.join(output_dir, f"{tender_info['tender_id'] or 'unknown'}_screenshots")
                os.makedirs(permanent_screenshots_dir, exist_ok=True)
                
                permanent_paths = []
                for i, screenshot_path in enumerate(screenshot_paths):
                    permanent_path = os.path.join(permanent_screenshots_dir, f"screenshot_{i:03d}.png")
                    shutil.copy(screenshot_path, permanent_path)
                    permanent_paths.append(permanent_path)
            
            # Print summary
            print(f"\nTender ID: {tender_info['tender_id']}")
            print(f"Title: {tender_info['title']}")
            print(f"URL: {tender_info['url']}")
            print(f"Buyer: {tender_info['buyer']['name']}")
            print(f"Buyer Email: {tender_info['buyer']['email']}")
            print(f"Deadline: {tender_info['dates']['deadline']}")
            print(f"Status: {tender_info['status']}")
        
            # Save the structured data as the only permanent output
            json_path = os.path.join(output_dir, "tender_info.json")
            # Also save with tender-specific filename for easier identification
            tender_id_safe = tender_info['tender_id'].replace("-", "_").replace("/", "_") if tender_info['tender_id'] else 'unknown'
            specific_json_path = os.path.join(output_dir, f"{tender_id_safe}.json")
            
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(tender_info, f, indent=2, ensure_ascii=False)
        
            with open(specific_json_path, "w", encoding="utf-8") as f:
                json.dump(tender_info, f, indent=2, ensure_ascii=False)
            
            print(f"\nTender data saved to '{json_path}'")
            browser.close()
            
            # If we're keeping temp files, copy them to a persistent location
            if keep_temp_files:
                persistent_temp_dir = os.path.join(output_dir, f"{tender_id_safe}_temp")
                print(f"Keeping temporary files in '{persistent_temp_dir}'")
                
                # If the directory already exists, remove it first
                if os.path.exists(persistent_temp_dir):
                    shutil.rmtree(persistent_temp_dir)
                
                # Copy the temporary directory to the persistent location
                shutil.copytree(temp_dir, persistent_temp_dir)
            
            return tender_info
    finally:
        # Clean up the temporary directory if we're not keeping the files
        if os.path.exists(temp_dir) and not keep_temp_files:
            try:
                shutil.rmtree(temp_dir)
                print(f"Temporary directory '{temp_dir}' has been removed")
            except Exception as e:
                print(f"Warning: Could not remove temporary directory: {str(e)}")


