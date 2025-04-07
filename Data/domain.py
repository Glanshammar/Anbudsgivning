import re
import os
from urllib.parse import urlparse

def ExtractMainDomain(url):
    try:
        match = re.search(r'\/\/(?:www\.)?([^\/\?]+)', url)

        if match:
            return match.group(1)

        parsed_url = urlparse(url)
        hostname = parsed_url.netloc

        return hostname
    except Exception as e:
        print(f"Error extracting main domain from URL '{url}': {e}")
        return url

def ProcessDomains(links):
    return {ExtractMainDomain(link): link for link in links}

def ParseLinks(file_path):
    links = []
    with open(file_path, 'r') as file:
        for line in file:
            urls = re.findall(r'(https?://[^\s]+)', line)
            links.extend(urls)
    return links

def SaveLinksToDB(db, links):
    collection_name = input("Enter the collection name to save links: ").strip()
    document_name = input("Enter the document name to save links: ").strip()

    doc_ref = db.collection(collection_name).document(document_name)
    doc = doc_ref.get()
    existing_links = doc.to_dict() if doc.exists else {}

    existing_domains = set(ProcessDomains(existing_links.values()).keys())
    new_domains = set(ProcessDomains(links).keys())
    duplicate_domains = existing_domains.intersection(new_domains)

    domains_to_replace = set()
    if duplicate_domains:
        print("Duplicate domains found:")
        for domain in duplicate_domains:
            print(f"- {domain}")
        to_replace = input("Enter domains to replace (comma-separated) or 'all': ").lower()
        domains_to_replace = set(duplicate_domains if to_replace == 'all' else to_replace.split(','))

    final_links = {k: v for k, v in existing_links.items() if ProcessDomains(v) not in domains_to_replace}
    for link in links:
        domain = ProcessDomains(link)
        if domain not in existing_domains or domain in domains_to_replace:
            key = f"{len(final_links)}"
            final_links[key] = link

    doc_ref.set(final_links)
    print(f"✅ Links saved to Firestore collection '{collection_name}', document '{document_name}'.")


def DomainMain(input_file):
    if not os.path.exists(input_file):
        print(f"Error: File '{input_file}' not found.")
    else:
        parsed_links = ParseLinks(input_file)
        # SaveLinksToDB(db, parsed_links)

        print(f"URLs have been successfully processed and saved to the database.")