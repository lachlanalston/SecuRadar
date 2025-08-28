import json
import os
from datetime import datetime
import requests

RSS2JSON_URL = "https://api.rss2json.com/v1/api.json?rss_url=https://www.cyber.gov.au/rss/advisories"

print("Starting SecuRadar fetch via RSS2JSON...")

try:
    response = requests.get(RSS2JSON_URL, timeout=30, headers={"User-Agent": "SecuRadar/1.0"})
    response.raise_for_status()
    data = response.json()
except requests.RequestException as e:
    print("Failed to fetch feed:", e)
    exit(1)

# Convert RSS2JSON items to our format
advisories = []
for item in data.get("items", []):
    advisories.append({
        "title": item.get("title"),
        "link": item.get("link"),
        "date": item.get("pubDate"),
        "summary": item.get("content"),
        "severity": "Unknown"  # RSS2JSON doesn't provide severity, can add parsing if needed
    })

# Ensure data folder exists
os.makedirs("data", exist_ok=True)

# Save JSON for dashboard
with open("data/advisories.json", "w", encoding="utf-8") as f:
    json.dump(advisories, f, indent=2, ensure_ascii=False)

print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Fetched {len(advisories)} advisories successfully")
