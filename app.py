import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_tags(html_str):
    """Simple regex utility to convert HTML text into clean plain text for tweets."""
    # Replace links with text (URL) format
    cleaned = re.sub(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', r'\2 (\1)', html_str)
    # Remove all other HTML tags
    cleaned = re.sub(r'<[^>]+>', '', cleaned)
    # Decode common HTML entities
    entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&nbsp;': ' '
    }
    for entity, char in entities.items():
        cleaned = cleaned.replace(entity, char)
    # Clean up whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def parse_release_feed():
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry_node in root.findall('atom:entry', ns):
            title = entry_node.find('atom:title', ns).text
            entry_id = entry_node.find('atom:id', ns).text
            updated = entry_node.find('atom:updated', ns).text
            
            link_node = entry_node.find('atom:link', ns)
            link = link_node.attrib.get('href', '') if link_node is not None else ''
            
            content_node = entry_node.find('atom:content', ns)
            content_html = content_node.text if content_node is not None else ''
            
            # Split the content html by <h3> headings to extract individual updates
            parts = re.split(r'(<h3>.*?</h3>)', content_html, flags=re.IGNORECASE)
            
            items = []
            if len(parts) > 1:
                # The split alternates between the h3 tags and the following text content
                for i in range(1, len(parts), 2):
                    h3_tag = parts[i]
                    body_content = parts[i+1] if i+1 < len(parts) else ""
                    
                    type_match = re.search(r'<h3>(.*?)</h3>', h3_tag, re.IGNORECASE)
                    item_type = type_match.group(1).strip() if type_match else "General"
                    
                    body_cleaned = body_content.strip()
                    plain_text = clean_html_tags(body_cleaned)
                    
                    items.append({
                        'type': item_type,
                        'html': body_cleaned,
                        'text': plain_text
                    })
            else:
                # No <h3> tags, treat the whole entry content as one general item
                plain_text = clean_html_tags(content_html)
                items.append({
                    'type': 'General',
                    'html': content_html.strip(),
                    'text': plain_text
                })
                
            entries.append({
                'date': title,
                'id': entry_id,
                'updated': updated,
                'link': link,
                'items': items
            })
            
        return {
            'success': True,
            'entries': entries,
            'feed_title': root.find('atom:title', ns).text or "BigQuery Release Notes",
            'feed_updated': root.find('atom:updated', ns).text or ""
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def release_notes_api():
    result = parse_release_feed()
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
