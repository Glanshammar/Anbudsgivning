import re
import os
from database import db
from urllib.parse import urlparse

def extract_main_domain(url):
    try:
        parsed_url = urlparse(url)
        hostname = parsed_url.netloc

        if hostname.startswith('www.'):
            hostname = hostname[4:]

        match = re.search(r'([a-zA-Z0-9-]+\.(?:[a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,}))$', hostname)

        if match:
            return match.group(1)
        return hostname
    except Exception as e:
        print(f"Error extracting main domain from URL '{url}': {e}")
        return url

def process_domains(links):
    return {extract_main_domain(link): link for link in links}

def parse_links(file_path):
    links = []
    with open(file_path, 'r') as file:
        for line in file:
            urls = re.findall(r'(https?://[^\s]+)', line)
            links.extend(urls)
    return links

def save_links_to_db(db, links):
    collection_name = input("Enter the collection name to save links: ").strip()
    document_name = input("Enter the document name to save links: ").strip()

    doc_ref = db.collection(collection_name).document(document_name)
    doc = doc_ref.get()
    existing_links = doc.to_dict() if doc.exists else {}

    existing_domains = set(process_domains(existing_links.values()).keys())
    new_domains = set(process_domains(links).keys())
    duplicate_domains = existing_domains.intersection(new_domains)

    domains_to_replace = set()
    if duplicate_domains:
        print("Duplicate domains found:")
        for domain in duplicate_domains:
            print(f"- {domain}")
        to_replace = input("Enter domains to replace (comma-separated) or 'all': ").lower()
        domains_to_replace = set(duplicate_domains if to_replace == 'all' else to_replace.split(','))

    final_links = {k: v for k, v in existing_links.items() if extract_main_domain(v) not in domains_to_replace}
    for link in links:
        domain = extract_main_domain(link)
        if domain not in existing_domains or domain in domains_to_replace:
            key = f"{len(final_links)}"
            final_links[key] = link

    doc_ref.set(final_links)
    print(f"✅ Links saved to Firestore collection '{collection_name}', document '{document_name}'.")


def domain_main(input_file):
    if not os.path.exists(input_file):
        print(f"Error: File '{input_file}' not found.")
    else:
        parsed_links = parse_links(input_file)
        save_links_to_db(db, parsed_links)

        print(f"URLs have been successfully processed and saved to the database.")