import feedparser
import json
from datetime import datetime

# Save JSON directly to the data folder
OUTPUT_FILE = "data/advisories.json"
ASD_RSS = "https://www.cyber.gov.au/rss/advisories"

def format_advisory(entry):
    date = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d") if 'published_parsed' in entry else None
    severity = entry.get("tags", [{}])[0].get("term","N/A") if "tags" in entry else "N/A"
    return {
        "title": entry.title,
        "link": entry.link,
        "vendor": "ASD",
        "severity": severity,
        "date": date,
        "summary": entry.get("summary", entry.title)
    }

feed = feedparser.parse(ASD_RSS)
items = [format_advisory(entry) for entry in feed.entries]

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(items, f, indent=2, ensure_ascii=False)

print(f"Fetched {len(items)} ASD advisories into {OUTPUT_FILE}.")
