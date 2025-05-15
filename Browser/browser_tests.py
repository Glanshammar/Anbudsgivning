import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from Browser.text import extract_tender_data
from Browser.browser import Browser

ted = "https://ted.europa.eu/en/search/result?classification-cpv=core&search-scope=ACTIVE"
tendium = "https://tendium.ai/se/upphandlingar/"
tendersontime_portal = 'https://www.tendersontime.com/sweden-tenders/'

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
