"""경쟁사 모니터링 크롤러 (GitHub Actions용)
config/sites.json 에 정의된 URL을 크롤링하여 snapshots/ 폴더에 저장.
"""

import hashlib
import json
import os
import datetime

try:
    from scrapling import StealthyFetcher
    HAS_SCRAPLING = True
except ImportError:
    HAS_SCRAPLING = False

import urllib.request


def fetch_with_scrapling(url: str) -> str:
    """Scrapling StealthyFetcher로 Cloudflare 우회 크롤링"""
    page = StealthyFetcher.get(url, stealthy_headers=True)
    return page.html_content


def fetch_simple(url: str) -> str:
    """간단한 URL 패치 (Scrapling 없는 경우)"""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 CompWatchBot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def main():
    sites_file = "config/sites.json"
    if not os.path.exists(sites_file):
        print(f"{sites_file} 없음. 예시 파일을 생성합니다.")
        os.makedirs("config", exist_ok=True)
        sample = [
            {"url": "https://example.com", "grade": "A"},
            {"url": "https://example.org/pricing", "grade": "B"},
        ]
        with open(sites_file, "w", encoding="utf-8") as f:
            json.dump(sample, f, ensure_ascii=False, indent=2)
        print("config/sites.json 생성됨. URL을 수정한 뒤 다시 실행하세요.")
        return

    with open(sites_file, "r", encoding="utf-8") as f:
        sites = json.load(f)

    os.makedirs("snapshots", exist_ok=True)
    today = datetime.date.today().isoformat()

    for site in sites:
        url = site["url"]
        grade = site.get("grade", "C")
        print(f"[{grade}] {url}")

        try:
            if HAS_SCRAPLING:
                html = fetch_with_scrapling(url)
            else:
                html = fetch_simple(url)
        except Exception as e:
            print(f"  실패: {e}")
            continue

        checksum = hashlib.sha256(html.encode()).hexdigest()[:16]
        filename = f"snapshots/{today}_{grade}_{checksum}.html"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  저장: {filename} ({len(html)} bytes)")

        # 이전 스냅샷과 비교
        prev_dir = f"snapshots/{grade}"
        os.makedirs(prev_dir, exist_ok=True)
        prev_files = sorted(f for f in os.listdir(prev_dir) if f.startswith(today) is False)

        if prev_files:
            with open(os.path.join(prev_dir, prev_files[-1]), "r", encoding="utf-8") as f:
                prev_html = f.read()
            prev_checksum = hashlib.sha256(prev_html.encode()).hexdigest()[:16]
            if prev_checksum != checksum:
                print(f"  ⚠ 변경 감지됨 (이전 {prev_checksum})")
            else:
                print(f"  변경 없음")
        else:
            print(f"  첫 스냅샷 (기준 생성)")


if __name__ == "__main__":
    main()
