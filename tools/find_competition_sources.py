from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import requests


sys.stdout.reconfigure(encoding="utf-8")

DATA_PATH = Path("source/data/competitions.json")
OUT_DIR = Path("tools/competition-research/candidates")

OFFICIAL_HINTS = (
    "moe.gov.cn",
    "sc.gov.cn",
    "edu.sc.gov.cn",
    "scedu.net",
    "gfbzb.gov.cn",
    "nuedc-training.com.cn",
    "smartcar.cdstm.cn",
    "nscscc.com",
    "mcm.edu.cn",
    "cumcm.cn",
    "tianti.com",
    "lanqiao.cn",
    "robomaster.com",
    "robocon.net.cn",
    "c4best.cn",
    "serviceoutsourcing.org.cn",
    "3dds.3ddl.net",
    "ican.org.cn",
    "ciccst.org.cn",
    "ciccw.cn",
    "cicc.org.cn",
)

DATE_PATTERN = re.compile(
    r"(?:20(?:25|26)\s*[年./-]\s*\d{1,2}\s*[月./-]\s*\d{1,2}\s*日?|"
    r"\d{1,2}\s*月\s*\d{1,2}\s*日|"
    r"20(?:25|26)\s*年\s*\d{1,2}\s*月)",
    re.I,
)

KEYWORDS = ("报名", "截止", "竞赛", "比赛", "初赛", "复赛", "决赛", "总决赛", "通知", "章程", "时间")


def normalize_url(url: str) -> str:
    if url.startswith("/"):
        return ""
    parsed = urlparse(url)
    if parsed.netloc.endswith("bing.com") and parsed.path == "/ck/a":
        qs = parse_qs(parsed.query)
        if "u" in qs:
            candidate = qs["u"][0]
            if candidate.startswith("a1"):
                candidate = candidate[2:]
            return unquote(candidate)
    return html.unescape(url)


def clean_text(text: str) -> str:
    text = re.sub(r"<script.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def bing_search(query: str, limit: int = 8) -> list[dict]:
    response = requests.get(
        "https://www.bing.com/search",
        params={"q": query},
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=20,
    )
    response.raise_for_status()
    text = response.text
    results: list[dict] = []
    for block in re.findall(r"<li class=\"b_algo\".*?</li>", text, flags=re.S):
        href_match = re.search(r"<a[^>]+href=\"([^\"]+)\"[^>]*>(.*?)</a>", block, flags=re.S)
        if not href_match:
            continue
        url = normalize_url(href_match.group(1))
        title = clean_text(href_match.group(2))
        snippet = clean_text(block)
        if not url or not title:
            continue
        results.append({"title": title, "url": url, "snippet": snippet[:500]})
        if len(results) >= limit:
            break
    return results


def score_result(result: dict) -> int:
    url = result["url"].lower()
    text = f"{result['title']} {result['snippet']}".lower()
    score = 0
    if any(hint in url for hint in OFFICIAL_HINTS):
        score += 4
    if any(keyword in text for keyword in KEYWORDS):
        score += 2
    if "2026" in text:
        score += 2
    if "2025" in text:
        score += 1
    if url.endswith(".pdf"):
        score += 1
    return score


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, required=True)
    parser.add_argument("--end", type=int, required=True)
    parser.add_argument("--sleep", type=float, default=1.2)
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    competitions = [item for item in data["competitions"] if args.start <= item["number"] <= args.end]

    output = []
    for item in competitions:
        queries = [
            f"{item['name']} 2026 报名 截止 比赛时间 官方",
            f"{item['name']} 2026 章程 通知 官方",
            f"{item['name']} 2025 报名 截止 比赛时间 官方",
        ]
        seen: set[str] = set()
        candidates: list[dict] = []
        for query in queries:
            try:
                for result in bing_search(query):
                    if result["url"] in seen:
                        continue
                    seen.add(result["url"])
                    result["score"] = score_result(result)
                    result["query"] = query
                    result["dateHints"] = DATE_PATTERN.findall(result["snippet"])
                    candidates.append(result)
            except Exception as exc:  # Keep the batch moving.
                candidates.append({"query": query, "error": str(exc), "score": 0})
            time.sleep(args.sleep)

        candidates.sort(key=lambda row: row.get("score", 0), reverse=True)
        output.append(
            {
                "number": item["number"],
                "name": item["name"],
                "organizer": item.get("organizer", ""),
                "candidates": candidates[:10],
            }
        )

    out_path = OUT_DIR / f"candidates-{args.start:03d}-{args.end:03d}.json"
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(out_path)


if __name__ == "__main__":
    main()
