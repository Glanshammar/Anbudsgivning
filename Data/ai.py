import os
import sys
import time
import json

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

from openai import OpenAI
import re
from Backend.browser import Browser
import pymupdf
import requests
from typing import List, Dict, Optional

# Global variables
language = "English"  # Default language, can be changed as needed
app_folder = os.path.join(current_dir, 'temp')  # Folder for temporary files
os.makedirs(app_folder, exist_ok=True)

def PromptAI(prompt: str) -> Optional[str]:
    """Send a prompt to the AI and get a response."""
    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("AI_API_KEY")
        )
        response = client.chat.completions.create(
            model="microsoft/mai-ds-r1:free",
            messages=[{"role": "user", "content": prompt}]
        )
        if not response or not response.choices:
            print("Warning: Empty response from AI")
            return None
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error in PromptAI: {str(e)}")
        return None

def GetLinksFromResponse(response_text: str) -> List[str]:
    """Extract URLs from AI response text."""
    if not response_text:
        return []
    pattern = r'https?://[^{}\s)>\]]+'
    urls = re.findall(pattern, response_text)
    return list(set(urls))  # Remove duplicates

def GetTenderLinksFromPortal(browser: Browser, portal_url: str) -> List[str]:
    """Get tender detail page links from a portal using AI."""
    try:
        urls = browser.GetLinksFromPage(portal_url)
        if not urls:
            print(f"Warning: No links found on portal {portal_url}")
            return []
            
        urls_string = "\n".join(urls)
        
        prompt = f"""From the following portal link, identify only the links that lead to individual tender detail pages or tender documents. 
        A tender detail page is a specific page for a single procurement opportunity, typically accessed by clicking on a tender in a list or search results.
        A tender document is a PDF, DOC, DOCX, TXT, etc. that is associated with a tender.
        Only include links that match the pattern for tender detail pages or tender documents.
        Output a list of these URLs only, with one URL per line.
        
        Links to analyze:
        {urls_string}"""

        response = PromptAI(prompt)
        if not response:
            print(f"Warning: No AI response for portal {portal_url}")
            return []
            
        return GetLinksFromResponse(response)
    except Exception as e:
        print(f"Error in GetTenderLinksFromPortal: {str(e)}")
        return []

def DownloadDocument(browser: Browser, url: str, save_dir: str) -> Optional[str]:
    """Download a document from a URL and return the local filepath."""
    try:
        # Generate a filename from the URL
        filename = url.split('/')[-1]
        if not filename:
            filename = f"document_{int(time.time())}.pdf"
        
        filepath = os.path.join(save_dir, filename)
        
        # Configure download settings for Playwright
        browser.page.context.set_default_timeout(60000)  # 60 seconds for download
        
        # Setup download event handler
        with browser.page.expect_download() as download_info:
            browser.page.goto(url)
        
        download = download_info.value
        # Wait for the download to complete
        download_path = download.path()
        
        # Move the file to the specified directory
        final_path = os.path.join(save_dir, filename)
        os.rename(download_path, final_path)
        
        # Check if file exists
        if os.path.exists(final_path):
            return final_path
        return None
    except Exception as e:
        print(f"Error downloading document: {str(e)}")
        return None

def TenderInfo(browser: Browser, source: str, is_document: bool = False) -> Dict:
    try:
        # Get content based on source type
        if is_document:
            doc = pymupdf.open(source)
            content = "".join(page.get_text() for page in doc if page.get_text())
        else:
            browser.OpenPage(source)
            content = browser.page.content()
        
        if not content:
            return create_error_response(source, "no_content", "No content available to analyze")
        
        # Common JSON structure for both document and webpage
        json_structure = """
        {
            "buyer": {
                "name": "Organization name"
            },
            "project": {
                "title": "Project title",
                "description": "Brief project description",
                "branch": "Branch of the tender (construction, IT, etc.)"
            },
            "timeline": {
                "publication_date": "Date when tender was published",
                "deadline": "Submission deadline",
                "start_date": "Project start date if available",
                "end_date": "Project end date if available"
            }
        }"""
        
        # Set up prompt based on source type
        source_type = "document" if is_document else "webpage"
        prompt = f"""Analyze this tender {source_type} and extract the structured information about the tender.
        Look for key tender details typically found in procurement notices such as the buyer organization, project details, 
        deadlines, requirements, and any contact information, etc. Anything related to the procurement process.
        
        Format your response exactly like this JSON structure (replace the values with actual information from the {source_type}):
        {json_structure}

        You should translate the project description to English if it's not already in English and use the English version for the analysis.
        """
        
        # Add error structure only for webpages
        if not is_document:
            prompt += """
            If you cannot find enough information to determine this is a tender notice, respond with:
            {
                "error": "insufficient_info",
                "message": "This does not appear to be a tender notice page"
            }
            """
        
        prompt += f"\nContent to analyze:\n{content}"
        
        # Get AI response
        response = PromptAI(prompt)
        if not response:
            return create_error_response(source, "ai_no_response", "Failed to get AI response for tender analysis")
            
        # Validate the response is proper JSON
        try:
            json.loads(response)
            return {"url": source, "info": response}
        except json.JSONDecodeError:
            return create_error_response(source, "invalid_json", 
                                    "AI response was not in valid JSON format",
                                    {"raw_response": response[:500]})
    except Exception as e:
        return create_error_response(source, "processing_error", f"Error analyzing tender: {str(e)}")

def create_error_response(source: str, error_code: str, message: str, extra_data: Dict = None) -> Dict:
    """Helper function to create standardized error responses."""
    print(f"Warning: {error_code} for source {source} - {message}")
    
    error_response = {
        "error": error_code,
        "message": message
    }
    
    if extra_data:
        error_response.update(extra_data)
        
    return {"url": source, "info": json.dumps(error_response)}

def FindDocumentLinks(browser: Browser, tender_url: str) -> List[str]:
    """Find document links on a tender page."""
    try:
        urls = browser.GetLinksFromPage(tender_url)
        if not urls:
            print(f"Warning: No links found on tender page {tender_url}")
            return []
            
        urls_string = "\n".join(urls)
        
        prompt = f"""Analyze the following pages and identify all document links (PDF, DOC, DOCX, TXT, etc.) 
        that are either explicitly marked as {language} or are most likely to be in {language}.
        Output only the document URLs, one per line and don't include more than one document for the same tender.
        
        Links to analyze:
        {urls_string}"""
        
        response = PromptAI(prompt)
        if not response:
            print(f"Warning: No AI response for tender documents {tender_url}")
            return []
            
        return GetLinksFromResponse(response)
    except Exception as e:
        print(f"Error in TenderDocuments: {str(e)}")
        return []

mock_response_document_links = "1. https://ted.europa.eu/en/notice/266375-2025/pdf"

mock_response_tender_pages = """
1. https://ted.europa.eu/sv/notice/-/detail/266375-2025  
2. https://ted.europa.eu/sv/notice/-/detail/266374-2025  
3. https://ted.europa.eu/sv/notice/-/detail/266372-2025  
4. https://ted.europa.eu/sv/notice/-/detail/266370-2025  
5. https://ted.europa.eu/sv/notice/-/detail/266367-2025  
6. https://ted.europa.eu/sv/notice/-/detail/266366-2025  
7. https://ted.europa.eu/sv/notice/-/detail/266365-2025  
8. https://ted.europa.eu/sv/notice/-/detail/266360-2025  
9. https://ted.europa.eu/sv/notice/-/detail/266353-2025  
10. https://ted.europa.eu/sv/notice/-/detail/266350-2025  
11. https://ted.europa.eu/sv/notice/-/detail/266342-2025  
12. https://ted.europa.eu/sv/notice/-/detail/266340-2025  
13. https://ted.europa.eu/sv/notice/-/detail/266337-2025  
14. https://ted.europa.eu/sv/notice/-/detail/266336-2025  
15. https://ted.europa.eu/sv/notice/-/detail/266334-2025  
16. https://ted.europa.eu/sv/notice/-/detail/266332-2025  
17. https://ted.europa.eu/sv/notice/-/detail/266331-2025  
18. https://ted.europa.eu/sv/notice/-/detail/266323-2025  
19. https://ted.europa.eu/sv/notice/-/detail/266322-2025  
20. https://ted.europa.eu/sv/notice/-/detail/266317-2025  
21. https://ted.europa.eu/sv/notice/-/detail/266312-2025  
22. https://ted.europa.eu/sv/notice/-/detail/266311-2025  
23. https://ted.europa.eu/sv/notice/-/detail/266306-2025  
24. https://ted.europa.eu/sv/notice/-/detail/266304-2025  
25. https://ted.europa.eu/sv/notice/-/detail/266302-2025  
26. https://ted.europa.eu/sv/notice/-/detail/266299-2025  
27. https://ted.europa.eu/sv/notice/-/detail/266298-2025  
28. https://ted.europa.eu/sv/notice/-/detail/266293-2025  
29. https://ted.europa.eu/sv/notice/-/detail/266292-2025  
30. https://ted.europa.eu/sv/notice/-/detail/266290-2025  
31. https://ted.europa.eu/sv/notice/-/detail/266285-2025  
32. https://ted.europa.eu/sv/notice/-/detail/266283-2025  
33. https://ted.europa.eu/sv/notice/-/detail/266277-2025  
34. https://ted.europa.eu/sv/notice/-/detail/266276-2025  
35. https://ted.europa.eu/sv/notice/-/detail/266272-2025  
36. https://ted.europa.eu/sv/notice/-/detail/266270-2025  
37. https://ted.europa.eu/sv/notice/-/detail/266262-2025  
38. https://ted.europa.eu/sv/notice/-/detail/266260-2025  
39. https://ted.europa.eu/sv/notice/-/detail/266258-2025  
40. https://ted.europa.eu/sv/notice/-/detail/266257-2025  
41. https://ted.europa.eu/sv/notice/-/detail/266256-2025  
42. https://ted.europa.eu/sv/notice/-/detail/266255-2025  
43. https://ted.europa.eu/sv/notice/-/detail/266254-2025  
44. https://ted.europa.eu/sv/notice/-/detail/266253-2025  
45. https://ted.europa.eu/sv/notice/-/detail/266248-2025  
46. https://ted.europa.eu/sv/notice/-/detail/266245-2025  
47. https://ted.europa.eu/sv/notice/-/detail/266241-2025  
48. https://ted.europa.eu/sv/notice/-/detail/266239-2025  
49. https://ted.europa.eu/sv/notice/-/detail/266238-2025  
50. https://ted.europa.eu/sv/notice/-/detail/266237-2025  
"""