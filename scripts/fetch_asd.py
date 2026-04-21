import feedparser
import json
import re
import hashlib
import requests
from curl_cffi import requests as cffi_requests
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_FILE = Path(__file__).parent.parent / "data" / "advisories.json"

# Browser-like UA — some gov sites block Python's default agent
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

RSS_FEEDS = [
    {"url": "https://www.cyber.gov.au/rss/alerts",        "source": "ASD"},
    {"url": "https://www.cyber.gov.au/rss/advisories",     "source": "ASD"},
    {"url": "https://www.ncsc.gov.uk/api/1/services/v1/guidance-rss-feed.xml", "source": "NCSC UK"},
    {"url": "https://www.ncsc.gov.uk/api/1/services/v1/report-rss-feed.xml",  "source": "NCSC UK"},
]

CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

CVE_RE = re.compile(r"CVE-\d{4}-\d+", re.IGNORECASE)

SEVERITY_MAP = {
    "Critical": ["critical", "actively exploited", "0-day", "zero-day",
                 "remote code execution", "rce", "nation-state", "ransomware"],
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


def format_rss_entry(entry: dict, source: str) -> dict:
    if "published_parsed" in entry:
        date = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d")
    else:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    title   = entry.get("title", "")
    summary = strip_html(entry.get("summary", title))
    link    = entry.get("link", "")

    tags     = entry.get("tags", [])
    tag_text = " ".join(t.get("term", "") for t in tags).lower()

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
        "source":   source,
        "title":    title,
        "link":     link,
        "date":     date,
        "summary":  summary[:500] + "…" if len(summary) > 500 else summary,
        "severity": severity,
        "vendor":   extract_vendor(title),
        "cve":      extract_cves(combined),
    }


def fetch_cisa_kev() -> list[dict]:
    """Fetch CISA Known Exploited Vulnerabilities catalog."""
    print(f"Fetching CISA KEV …")
    try:
        r = requests.get(CISA_KEV_URL, headers={"User-Agent": USER_AGENT}, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"  Error fetching KEV: {e}")
        return []

    items = []
    for v in data.get("vulnerabilities", []):
        cve_id  = v.get("cveID", "N/A")
        title   = v.get("vulnerabilityName", cve_id)
        vendor  = v.get("vendorProject", "N/A")
        product = v.get("product", "")
        date    = v.get("dateAdded", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        desc    = v.get("shortDescription", "")
        action  = v.get("requiredAction", "")
        ransomware = v.get("knownRansomwareCampaignUse", "")

        summary_parts = [desc]
        if action:
            summary_parts.append(f"Required action: {action}")
        if ransomware == "Known":
            summary_parts.append("Known ransomware campaign use.")
        summary = " ".join(summary_parts).strip()

        severity = "Critical" if ransomware == "Known" else infer_severity(title + " " + summary)

        link = f"https://www.cisa.gov/known-exploited-vulnerabilities-catalog"

        items.append({
            "id":       hashlib.md5(cve_id.encode()).hexdigest()[:8],
            "source":   "CISA KEV",
            "title":    title,
            "link":     link,
            "date":     date,
            "summary":  summary[:500] + "…" if len(summary) > 500 else summary,
            "severity": severity,
            "vendor":   f"{vendor} — {product}".strip(" —") if product else vendor,
            "cve":      cve_id,
        })

    print(f"  Got {len(items)} KEV entries")
    return items


def main():
    seen_links: set[str] = set()
    items: list[dict] = []

    # ASD feeds: use curl-cffi to impersonate Chrome's exact TLS fingerprint
    # (JA3 + HTTP/2). cyber.gov.au uses Cloudflare which silently drops
    # connections with non-browser TLS signatures from cloud provider IPs.
    # Other feeds use plain requests (already working fine).
    asd_session = cffi_requests.Session()

    # Standard requests session for non-ASD feeds
    std_session = requests.Session()
    std_session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
    })

    for feed_cfg in RSS_FEEDS:
        url    = feed_cfg["url"]
        source = feed_cfg["source"]
        print(f"Fetching {url} …")
        try:
            if source == "ASD":
                r = asd_session.get(url, impersonate="chrome124", timeout=30)
            else:
                r = std_session.get(url, timeout=30)
            r.raise_for_status()
            feed = feedparser.parse(r.content)
        except Exception as e:
            print(f"  Error: {e} — skipping")
            continue
        if feed.bozo and feed.bozo_exception:
            print(f"  Warning: {feed.bozo_exception}")
        count = 0
        for entry in feed.entries:
            link = entry.get("link", "")
            if link in seen_links:
                continue
            seen_links.add(link)
            items.append(format_rss_entry(entry, source))
            count += 1
        print(f"  Got {count} entries")

    # CISA KEV (JSON)
    kev_items = fetch_cisa_kev()
    for item in kev_items:
        if item["link"] not in seen_links:
            # KEV entries share the catalog URL; deduplicate by CVE instead
            dedup_key = item["cve"]
            if dedup_key not in seen_links:
                seen_links.add(dedup_key)
                items.append(item)

    items.sort(key=lambda x: x["date"], reverse=True)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "advisories":   items,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(items)} total advisories → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
