import feedparser
import json
import re
import hashlib
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_FILE = Path(__file__).parent.parent / "data" / "advisories.json"

RSS_FEEDS = [
    "https://www.cyber.gov.au/rss/alerts",
    "https://www.cyber.gov.au/rss/advisories",
]

CVE_RE = re.compile(r"CVE-\d{4}-\d+", re.IGNORECASE)

SEVERITY_MAP = {
    "Critical": ["critical", "actively exploited", "0-day", "zero-day", "remote code execution", "rce", "nation-state"],
    "High":     ["high", "important", "severe"],
    "Low":      ["low", "minor", "informational"],
}

def infer_severity(text: str) -> str:
    t = text.lower()
    for level, keywords in SEVERITY_MAP.items():
        if any(kw in t for kw in keywords):
            return level
    return "Medium"

def extract_cves(text: str) -> str:
    found = list(dict.fromkeys(CVE_RE.findall(text)))
    return ", ".join(found) if found else "N/A"

def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def extract_vendor(title: str) -> str:
    patterns = [
        r"affecting\s+(.+?)(?:\s+(?:devices?|products?|software|systems?))?$",
        r"in\s+(.+?)\s+(?:version|product|device|system)",
        r"^(.+?)\s+vulnerabilit",
    ]
    for pat in patterns:
        m = re.search(pat, title, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            if 2 < len(candidate) < 60:
                return candidate.title()
    return "N/A"

def format_entry(entry: dict) -> dict:
    if "published_parsed" in entry:
        date = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d")
    else:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    title   = entry.get("title", "")
    summary = strip_html(entry.get("summary", title))
    link    = entry.get("link", "")

    tags      = entry.get("tags", [])
    tag_text  = " ".join(t.get("term", "") for t in tags).lower()

    if "critical" in tag_text:
        severity = "Critical"
    elif "high" in tag_text:
        severity = "High"
    elif "low" in tag_text:
        severity = "Low"
    elif "medium" in tag_text or "moderate" in tag_text:
        severity = "Medium"
    else:
        severity = infer_severity(title + " " + summary)

    combined = title + " " + summary
    return {
        "id":       hashlib.md5(link.encode()).hexdigest()[:8],
        "title":    title,
        "link":     link,
        "date":     date,
        "summary":  summary[:500] + "…" if len(summary) > 500 else summary,
        "severity": severity,
        "vendor":   extract_vendor(title),
        "cve":      extract_cves(combined),
    }

def main():
    seen_links = set()
    items = []

    for url in RSS_FEEDS:
        print(f"Fetching {url} …")
        feed = feedparser.parse(url)
        if feed.bozo:
            print(f"  Warning: {feed.bozo_exception}")
        for entry in feed.entries:
            link = entry.get("link", "")
            if link in seen_links:
                continue
            seen_links.add(link)
            items.append(format_entry(entry))

    # Sort newest first
    items.sort(key=lambda x: x["date"], reverse=True)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "advisories": items,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(items)} advisories → {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
