import json
import math
import datetime
from typing import List, Dict
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from openai import OpenAI
import os
from time import sleep

current_dir = os.path.dirname(os.path.abspath(__file__))
ted_url = 'https://ted.europa.eu/sv/search/result?classification-cpv=core&search-scope=ACTIVE'

def validate_json(content: str) -> bool:
    try:
        json.loads(content)
        return True
    except json.JSONDecodeError:
        return False

def extract_fallback_json(content: str) -> list:
    try:
        start = content.index('[')
        end = content.rindex(']') + 1
        return json.loads(content[start:end])
    except (ValueError, json.JSONDecodeError):
        return []


def fetch_page_html(url: str, timeout: int = 30) -> str:
    driver = webdriver.Chrome()
    driver.get(url)
    sleep(7)
    WebDriverWait(driver, timeout).until(
        lambda d: d.execute_script('return document.readyState') == 'complete'
    )
    html = driver.page_source
    driver.quit()
    return html

def chunk_html(html: str, max_chars: int = 4000) -> List[str]:
    chunks = []
    total_len = len(html)
    if total_len <= max_chars:
        return [html]
    num_chunks = math.ceil(total_len / max_chars)
    print(f'Number of chunks: {num_chunks}.')
    if num_chunks >= 10:
        num_chunks = 10
    for i in range(num_chunks):
        start = i * max_chars
        end = start + max_chars
        chunks.append(html[start:end])
    return chunks

def prompt_extract_docs(html_fragment: str) -> list[dict]:
    client = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=os.getenv("AI_API_KEY")
                )
    
    prompt = f"""You are a tender-scraper. Your objective is to find links for tender pages from this HTML fragment:
    {html_fragment}"""
    
    try:
        response = client.chat.completions.create(
            model="microsoft/mai-ds-r1:free",
            messages=[{"role": "user", "content": prompt}]
        )
        if not response.choices or len(response.choices) == 0:
            print("API returned no choices.")
            return []
        content = response.choices[0].message.content
        print(content, "\n")
        return json.loads(content) if validate_json(content) else []
    except json.JSONDecodeError:
        return extract_fallback_json(content)
    except Exception as e:
        print(f"API Error: {str(e)}")
        return []


def aggregate_results(results: List[List[Dict]]) -> List[Dict]:
    seen = set()
    aggregated = []
    for sublist in results:
        for item in sublist:
            url = item.get('url')
            if not url or url in seen:
                continue
            seen.add(url)
            # Normalize fields
            title = item.get('title', '').strip()
            date_str = item.get('date', '')
            size = item.get('size_kb')
            cpv = item.get('cpv_code', '').strip()
            try:
                size = float(size) if size else None
            except:
                size = None
            aggregated.append({
                'url': url,
                'title': title,
                'date': date_str,
                'size_kb': size,
                'cpv_code': cpv
            })
    return aggregated

def filter_results(docs: List[Dict], cpv_codes: List[str]) -> List[Dict]:
    today = datetime.date.today()
    filtered = []
    for d in docs:
        # Filter by deadline
        date_str = d.get('date', '')
        try:
            deadline = datetime.datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else None
        except ValueError:
            deadline = None
        if deadline and deadline < today:
            continue
        # Filter by CPV codes if specified
        cpv = d.get('cpv_code', '')
        if cpv_codes and cpv not in cpv_codes:
            continue
        filtered.append(d)
    return filtered

def Page(url: str, cpv_codes: List[str] = None):
    """Process tender portal pages and extract documents.
    
    Args:
        url: Tender portal URL to scrape
        cpv_codes: List of CPV codes to filter (optional)
    
    Returns:
        List of processed tender documents
    """
    # Process CPV codes
    cpv_list = [code.strip() for code in (cpv_codes or []) if code.strip()]
    
    # Core processing logic
    html = fetch_page_html(url)
    fragments = chunk_html(html)
    
    all_results = []
    for frag in fragments:
        docs = prompt_extract_docs(frag)
        all_results.append(docs)
    
    final_docs = aggregate_results(all_results)
    filtered_docs = filter_results(final_docs, cpv_list)
    
    file = os.path.join(current_dir, 'results.json')
    with open(file, 'w', encoding='utf-8') as f:
        json.dump(filtered_docs, f, ensure_ascii=False, indent=2)
    print(f"Extracted {len(final_docs)} documents, {len(filtered_docs)} after filtering. Saved to {file}.")
    
    return filtered_docs

