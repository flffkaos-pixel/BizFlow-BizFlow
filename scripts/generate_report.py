"""월간 리포트 생성 - snapshots/ 변경 이력을 요약하여 markdown 리포트 작성"""
import os
import glob
import datetime
import re


def main():
    os.makedirs("reports", exist_ok=True)
    today = datetime.date.today()
    month = today.strftime("%Y-%m")

    report = []
    report.append(f"# 월간 모니터링 리포트 ({month})")
    report.append("")
    report.append(f"생성일: {today.isoformat()}")
    report.append("")
    report.append("## 요약")
    report.append("")

    # snapshots 폴더에서 이번 달 파일 수집
    if os.path.exists("snapshots"):
        files = glob.glob("snapshots/*.html")
        if files:
            report.append(f"- 크롤링된 스냅샷: {len(files)}건")
        else:
            report.append("- 크롤링된 스냅샷: 0건")
    else:
        report.append("- snapshots 폴더가 아직 없습니다.")

    # customers 수집
    if os.path.exists("customers"):
        customers = glob.glob("customers/*.json")
        report.append(f"- 활성 고객: {len(customers)}명")
    else:
        report.append("- 고객: 0명")

    # pending orders
    if os.path.exists("pending_orders.json"):
        import json
        with open("pending_orders.json", "r", encoding="utf-8") as f:
            pending = json.load(f)
        report.append(f"- 처리 대기 주문: {len(pending)}건")

    report.append("")
    report.append("## 이번 달 변경 감지 목록")
    report.append("")

    # 이번 달 변경 이력 (snapshots 내 변경 로그)
    log_file = "CHANGES.md"
    if os.path.exists(log_file):
        with open(log_file, "r", encoding="utf-8") as f:
            content = f.read()
        # CHANGES.md 앞부분만 포함
        report.append(content[:2000] if content else "기록 없음")
    else:
        report.append("이번 달 감지된 변경이 없습니다.")

    filename = f"reports/monthly_{month}.md"
    with open(filename, "w", encoding="utf-8") as f:
        f.write("\n".join(report))

    print(f"리포트 생성: {filename}")


if __name__ == "__main__":
    main()
