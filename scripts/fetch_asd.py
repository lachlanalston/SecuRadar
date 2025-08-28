import feedparser
import json
from datetime import datetime

OUTPUT_FILE = "data/test_advisories.json"
RSS_URL = "https://www.cisa.gov/uscert/ncas/alerts.xml"

def format_advisory(entry):
    date = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d") if 'published_parsed' in entry else None
    severity = entry.get("tags", [{}])[0].get("term","N/A") if "tags" in entry else "N/A"
    return {
        "title": entry.title,
        "link": entry.link,
        "vendor": "CISA",
        "severity": severity,
        "date": date,
        "summary": entry.get("summary", entry.title)
    }

feed = feedparser.parse(RSS_URL)
items = [format_advisory(entry) for entry in feed.entries]

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(items, f, indent=2, ensure_ascii=False)

print(f"Fetched {len(items)} advisories from CISA into {OUTPUT_FILE}.")
