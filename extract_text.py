from playwright.sync_api import sync_playwright
import argparse
import os
import time
import json
import re
import sys
from Data.ai import TenderInfo
from Backend.browser import Browser

def sanitize_filename(url):
    """Create a safe filename from a URL."""
    # Extract the last part of the URL or use the full URL if needed
    parts = url.rstrip('/').split('/')
    if len(parts) > 3:  # Has path components
        name = parts[-1]
        if not name or name.startswith('?'):
            name = parts[-2]
    else:
        name = url.replace('://', '_').replace('/', '_')
    
    # Remove any query parameters
    name = name.split('?')[0]
    
    # Remove special characters
    name = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    
    # Add timestamp to ensure uniqueness
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    
    return f"{name}_{timestamp}"

def extract_visible_text(url, output_dir="extracted_text"):
    """Extract only the visible text content from a webpage using Playwright"""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate a filename based on the URL
    filename_base = sanitize_filename(url)
    
    print(f"Extracting visible text from: {url}")
    
    browser = Browser()
    try:
        browser.Start()
        browser.OpenPage(url)
        
        # Extract text content of visible elements
        visible_text = browser.page.evaluate("""() => {
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
            
            // Get text from all visible elements
            const elements = document.querySelectorAll('body *');
            let text = '';
            
            for (let elem of elements) {
                if (isVisible(elem) && 
                    elem.childElementCount === 0 && 
                    elem.textContent.trim().length > 0) {
                    text += elem.textContent.trim() + '\\n';
                }
            }
            
            return text;
        }""")
        
        # Save only the visible text
        visible_text_path = os.path.join(output_dir, f"{filename_base}.txt")
        with open(visible_text_path, "w", encoding="utf-8") as f:
            f.write(visible_text)
        
        print(f"\nExtraction complete. Visible text saved to: {visible_text_path}")
        print(f"Text length: {len(visible_text)} characters")
        
        return {
            "url": url,
            "visible_text_length": len(visible_text),
            "output_file": visible_text_path
        }
    finally:
        browser.Quit()

def process_extracted_text(text_file_path, url, output_dir="tender_analysis"):
    """Process extracted text using TenderInfo to get structured information"""
    try:
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Read extracted text content
        with open(text_file_path, 'r', encoding='utf-8') as f:
            text_content = f.read()
        
        print(f"Processing extracted text from: {text_file_path}")
        print(f"Text length: {len(text_content)} characters")
        
        # Create a Browser instance for TenderInfo
        browser = Browser()
        try:
            # Create a prompt for analysis 
            prompt = f"""Analyze this tender text and extract the structured information about the tender.
            Look for key tender details typically found in procurement notices such as the buyer organization, project details, 
            deadlines, requirements, and any contact information, etc. Anything related to the procurement process.
            
            Format your response as a plain JSON object with no markdown formatting, no code blocks, and no additional text.
            Only return the JSON object in this exact structure (replace the values with actual information from the text):

            {{
                "buyer": {{
                    "name": "Organization name"
                }},
                "project": {{
                    "title": "Project title",
                    "description": "Brief project description",
                    "branch": "Branch of the tender (construction, IT, etc.)"
                }},
                "timeline": {{
                    "publication_date": "Date when tender was published",
                    "deadline": "Submission deadline",
                    "start_date": "Project start date if available",
                    "end_date": "Project end date if available"
                }}
            }}

            You should translate the project description to English if it's not already in English and use the English version for the analysis.

            Content to analyze:
            {text_content}"""

            from Data.ai import PromptAI
            
            # Get response from AI
            response = PromptAI(prompt)
            
            # Extract JSON from response (remove any markdown code blocks)
            if response:
                # Remove markdown code blocks if present
                clean_response = response
                if "```json" in response:
                    clean_response = re.sub(r'```json\s*', '', response)
                    clean_response = re.sub(r'```\s*$', '', clean_response)
                elif "```" in response:
                    clean_response = re.sub(r'```\s*', '', response)
                    clean_response = re.sub(r'```\s*$', '', clean_response)
                
                # Parse the JSON data
                try:
                    parsed_info = json.loads(clean_response)
                    # Create a clean result object
                    tender_info = {
                        "url": url,
                        "info": parsed_info  # Use the already parsed JSON object directly
                    }
                except json.JSONDecodeError as e:
                    print(f"Warning: Could not parse tender info as JSON: {str(e)}")
                    # Fall back to string storage but without the markdown
                    tender_info = {
                        "url": url,
                        "info": clean_response
                    }
            else:
                tender_info = {
                    "url": url,
                    "info": {
                        "error": "no_response",
                        "message": "No response received from AI analysis"
                    }
                }
            
            # Save results
            base_name = os.path.basename(text_file_path).split('.')[0]
            output_file = os.path.join(output_dir, f"{base_name}_analysis.json")
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(tender_info, f, indent=2, ensure_ascii=False)
                
            print(f"Analysis saved to: {output_file}")
            return {
                "url": url,
                "source_text": text_file_path,
                "analysis_file": output_file,
                "tender_info": tender_info
            }
        finally:
            browser.Quit()
    except Exception as e:
        print(f"Error processing text file {text_file_path}: {str(e)}")
        return None

def process_urls_from_file(input_file, extract_dir, analysis_dir, limit=None):
    """Process URLs from a file, extracting text and analyzing."""
    # Check if the input file exists
    if not os.path.exists(input_file):
        print(f"Input file '{input_file}' not found. Creating a sample file.")
        with open(input_file, "w") as f:
            f.write("https://ted.europa.eu/en/notice/-/detail/266375-2025\n")
        print(f"Created '{input_file}' with a sample URL. Edit this file to add your own URLs.")
    
    # Read URLs from the file
    with open(input_file, "r") as f:
        urls = [line.strip() for line in f if line.strip()]
    
    # Apply limit if specified
    if limit and len(urls) > limit:
        print(f"Limiting processing to {limit} URLs out of {len(urls)} total.")
        urls = urls[:limit]
    else:
        print(f"Found {len(urls)} URLs to process.")
    
    results = []
    
    # Extract and process each URL
    for i, url in enumerate(urls):
        print(f"\nProcessing URL {i+1}/{len(urls)}: {url}")
        
        try:
            # Step 1: Extract text from the webpage
            extraction_result = extract_visible_text(url, extract_dir)
            print(f"Successfully extracted text from: {url}")
            
            # Step 2: Process the extracted text with TenderInfo
            analysis_result = process_extracted_text(
                extraction_result['output_file'], 
                url, 
                analysis_dir
            )
            
            if analysis_result:
                print(f"Successfully analyzed tender from: {url}")
                results.append(analysis_result)
                
                # Display some basic info from the analysis
                info = analysis_result['tender_info']['info']
                if isinstance(info, dict):
                    if 'buyer' in info and 'name' in info['buyer']:
                        print(f"Buyer: {info['buyer']['name']}")
                    if 'project' in info and 'title' in info['project']:
                        print(f"Project: {info['project']['title']}")
                    if 'timeline' in info and 'deadline' in info['timeline']:
                        print(f"Deadline: {info['timeline']['deadline']}")
                else:
                    print("Could not extract structured information from tender.")
            
        except Exception as e:
            print(f"Error processing URL: {url}")
            print(f"Error details: {str(e)}")
    
    # Save a summary of all results
    summary_file = os.path.join(analysis_dir, "processing_summary.json")
    summary = {
        "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_urls": len(urls),
        "successful_analysis": len(results),
        "urls_processed": [r["url"] for r in results]
    }
    
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\nProcessing complete. {len(results)} of {len(urls)} URLs successfully processed.")
    print(f"Summary saved to: {summary_file}")
    
    return results

def display_analysis_example(analysis_dir):
    """Display a formatted example of the analysis results."""
    try:
        # Find JSON files in the analysis directory
        analysis_files = [f for f in os.listdir(analysis_dir) if f.endswith('_analysis.json')]
        
        if not analysis_files:
            print("No analysis files found.")
            return
        
        # Get the most recent file by sorting based on modification time
        analysis_files.sort(key=lambda x: os.path.getmtime(os.path.join(analysis_dir, x)), reverse=True)
        analysis_file = os.path.join(analysis_dir, analysis_files[0])
        
        with open(analysis_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Display formatted info
        print("\n" + "="*80)
        print(f"ANALYSIS RESULT: {os.path.basename(analysis_file)}")
        print("="*80)
        
        print(f"URL: {data['url']}")
        
        if isinstance(data['info'], dict):
            info = data['info']
            
            if 'buyer' in info and isinstance(info['buyer'], dict):
                print("\nBUYER:")
                for key, value in info['buyer'].items():
                    if value:  # Only show non-empty values
                        print(f"  {key.replace('_', ' ').capitalize()}: {value}")
            
            if 'project' in info and isinstance(info['project'], dict):
                print("\nPROJECT:")
                for key, value in info['project'].items():
                    if value:  # Only show non-empty values
                        # For description, format it nicely with word wrapping
                        if key == 'description' and isinstance(value, str) and len(value) > 60:
                            print(f"  {key.capitalize()}:")
                            # Word wrap to 70 chars
                            import textwrap
                            wrapped = textwrap.wrap(value, width=70)
                            for line in wrapped:
                                print(f"    {line}")
                        else:
                            print(f"  {key.replace('_', ' ').capitalize()}: {value}")
            
            if 'timeline' in info and isinstance(info['timeline'], dict):
                print("\nTIMELINE:")
                for key, value in info['timeline'].items():
                    if value:  # Only show non-empty values
                        print(f"  {key.replace('_', ' ').capitalize()}: {value}")
                        
            # If there are other fields in the info, show them as well
            for key, value in info.items():
                if key not in ['buyer', 'project', 'timeline'] and value:
                    if isinstance(value, dict):
                        print(f"\n{key.upper()}:")
                        for k, v in value.items():
                            if v:  # Only show non-empty values
                                print(f"  {k.replace('_', ' ').capitalize()}: {v}")
                    elif isinstance(value, list):
                        print(f"\n{key.upper()}:")
                        for item in value:
                            print(f"  - {item}")
                    else:
                        print(f"\n{key.upper()}: {value}")
        
        else:
            # Handle string or non-dict info
            print("\nRaw analysis:")
            print(data['info'])
        
        print("\n" + "="*80)
        print("The JSON files in the analysis directory contain the structured data shown above.")
        print("="*80 + "\n")
    
    except Exception as e:
        print(f"Error displaying analysis example: {str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract text from tender webpages and analyze them")
    parser.add_argument("-i", "--input", default="tender_links.txt", help="Input file with URLs to process (one per line)")
    parser.add_argument("-e", "--extract-dir", default="extracted_text", help="Directory to save extracted text files")
    parser.add_argument("-a", "--analysis-dir", default="tender_analysis", help="Directory to save analysis results")
    parser.add_argument("-l", "--limit", type=int, help="Limit the number of URLs to process")
    parser.add_argument("-u", "--url", help="Process a single URL instead of reading from a file")
    parser.add_argument("--show-example", action="store_true", help="Show an example of the analysis output format")
    
    args = parser.parse_args()
    
    # Make sure the analysis directory exists
    os.makedirs(args.analysis_dir, exist_ok=True)
    
    # If show-example is specified and analysis files exist, display an example and exit
    if args.show_example and os.path.exists(args.analysis_dir) and os.listdir(args.analysis_dir):
        display_analysis_example(args.analysis_dir)
        if not (args.url or os.path.exists(args.input)):
            sys.exit(0)
    
    if args.url:
        # Process a single URL
        print(f"Processing single URL: {args.url}")
        try:
            # Step 1: Extract text from the webpage
            extraction_result = extract_visible_text(args.url, args.extract_dir)
            print(f"Successfully extracted text from: {args.url}")
            
            # Step 2: Process the extracted text
            analysis_result = process_extracted_text(
                extraction_result['output_file'], 
                args.url, 
                args.analysis_dir
            )
            
            if analysis_result:
                print(f"Successfully analyzed tender from: {args.url}")
                print(f"Analysis saved to: {analysis_result['analysis_file']}")
                
                # Display the analysis example
                print("\nShowing analysis result:")
                display_analysis_example(args.analysis_dir)
        except Exception as e:
            print(f"Error processing URL: {args.url}")
            print(f"Error details: {str(e)}")
            sys.exit(1)
    else:
        # Process URLs from file
        results = process_urls_from_file(args.input, args.extract_dir, args.analysis_dir, args.limit)
        
        # Display an example of the analysis results if any were produced
        if results:
            display_analysis_example(args.analysis_dir) 