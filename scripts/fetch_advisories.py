import feedparser
import json
import os
from datetime import datetime

# ASD RSS feed
RSS_URL = "https://www.cyber.gov.au/rss/advisories"

# Parse the feed
feed = feedparser.parse(RSS_URL)

# Convert to JSON structure
advisories = []
for entry in feed.entries:
    advisories.append({
        "title": entry.title,
        "link": entry.link,
        "date": entry.published,           # e.g., "Thu, 28 Aug 2025 10:00:00 GMT"
        "summary": entry.summary,
        "severity": entry.get("advisory_severity", "Unknown")
    })

# Ensure data folder exists
os.makedirs("data", exist_ok=True)

# Save JSON for the dashboard
with open("data/advisories.json", "w", encoding="utf-8") as f:
    json.dump(advisories, f, indent=2, ensure_ascii=False)

print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Fetched {len(advisories)} advisories")
