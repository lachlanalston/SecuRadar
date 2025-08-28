import feedparser
import json
import os
from datetime import datetime
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

RSS_URL = "https://www.cyber.gov.au/rss/advisories"

print("Starting SecuRadar fetch...")

# Setup requests session with retries
session = requests.Session()
retry = Retry(
    total=5,                # Retry up to 5 times
    backoff_factor=5,       # Wait 5s, 10s, 15s… between retries
    status_forcelist=[500, 502, 503, 504]
)
adapter = HTTPAdapter(max_retries=retry)
session.mount("http://", adapter)
session.mount("https://", adapter)

try:
    response = session.get(RSS_URL, timeout=60, headers={"User-Agent": "SecuRadar/1.0"})
    response.raise_for_status()
except requests.RequestException as e:
    print("Failed to fetch feed:", e)
    exit(1)

# Parse feed
feed = feedparser.parse(response.text)

advisories = []
for entry in feed.entries:
    advisories.append({
        "title": entry.title,
        "link": entry.link,
        "date": entry.published,
        "summary": entry.summary,
        "severity": entry.get("advisory_severity", "Unknown")
    })

# Ensure data folder exists
os.makedirs("data", exist_ok=True)

# Save JSON for dashboard
with open("data/advisories.json", "w", encoding="utf-8") as f:
    json.dump(advisories, f, indent=2, ensure_ascii=False)

print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Fetched {len(advisories)} advisories successfully")
