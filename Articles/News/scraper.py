import requests
from bs4 import BeautifulSoup
import json
import re
import PyPDF2
from io import BytesIO
from urllib.parse import urlparse


if __name__ == '__main__':
    # Example usage
    url = input("Enter the URL of the article: ")
    try:
        article_data = scrape_article(url)
        save_to_json(article_data)
        print("Article saved successfully!")
    except Exception as e:
        print(f"An error occurred: {e}")


def scrape_article(url):
    # Fetch the webpage
    response = requests.get(url)
    response.raise_for_status()  # Raise an error for bad status codes

    # Check if the URL points to a PDF
    if url.lower().endswith('.pdf'):
        return scrape_pdf(url)

    # Parse the HTML content
    soup = BeautifulSoup(response.text, 'html.parser')

    # Extract the headline
    headline = soup.find('h1').get_text() if soup.find('h1') else 'No headline found'

    # Extract the author (common patterns: <meta> tags, <span> with class 'author', etc.)
    author = soup.find('meta', attrs={'name': 'author'}) or \
              soup.find('span', class_=re.compile('author', re.I)) or \
              soup.find('a', class_=re.compile('author', re.I))
    author = author.get('content') if author and author.get('content') else \
             author.get_text() if author else 'No author found'

    # Extract the body (common patterns: <article>, <div> with class 'content', etc.)
    body = soup.find('article') or \
           soup.find('div', class_=re.compile('content|article|body', re.I))
    body = body.get_text(separator='\n').strip() if body else 'No body found'

    return {
        'headline': headline,
        'author': author,
        'body': body,
        'url': url
    }

def scrape_pdf(url):
    # Fetch the PDF
    response = requests.get(url)
    response.raise_for_status()

    # Read the PDF content
    pdf_file = BytesIO(response.content)
    reader = PyPDF2.PdfReader(pdf_file)

    # Extract text from all pages
    text = ''
    for page in reader.pages:
        text += page.extract_text()

    return {
        'headline': urlparse(url).path.split('/')[-1],  # Use the filename as the headline
        'author': 'No author found',  # PDFs often don't have author metadata
        'body': text,
        'url': url
    }

def save_to_json(data, filename='articles.json'):
    # Load existing data if the file exists
    try:
        with open(filename, 'r') as f:
            existing_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        existing_data = []

    # Append new data
    existing_data.append(data)

    # Save the updated data
    with open(filename, 'w') as f:
        json.dump(existing_data, f, indent=4)
