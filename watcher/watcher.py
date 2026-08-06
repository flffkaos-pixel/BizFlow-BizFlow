#!/usr/bin/env python3
"""
Watcher - GitHub Actions 이벤트 수신 + 실시간 처리

역할:
  1. GitHub Actions(monitor-daily 등)가 만든 이벤트를 n8n 웹훅으로 전달
  2. Dify(챗봇)가 내린 답변을 카톡/이메일로 포워딩
  3. 예약 확정 시 Cal.com 웹훅과 연결
  4. 실패 시 텔레그램 알림

동작 방식:
  - FastAPI로 작은 HTTP 서버를 띄워 이벤트를 받고,
  - 받은 이벤트를 n8n 워크플로우로 재전달한다.
  - (cron과 별개로 항상 실행되므로, GitHub Actions의 단발성 작업과
    Oracle 서버의 상시 응대를 잇는 다리가 된다.)

실행:
  pip install fastapi uvicorn requests
  python watcher.py --port 8000

환경변수 (.env):
  WATCHER_PORT       기본 8000
  N8N_WEBHOOK_URL    n8n 워크플로우의 webhook URL
  N8N_API_KEY        (선택) n8n 인증 토큰
  TELEGRAM_BOT_TOKEN (선택) 실패 알림용
  TELEGRAM_CHAT_ID   (선택) 실패 알림용
"""

import json
import os
import time
import urllib.request
import urllib.error
from typing import Dict, Optional

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import requests


app = FastAPI(title="Oracle Watcher", version="1.0.0")

# ── 설정 ──────────────────────────────────────────────
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://n8n:5678/webhook/kakao-inbound")
N8N_API_KEY = os.getenv("N8N_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


def send_telegram(text: str) -> None:
    """실패/중요 이벤트를 사장님 텔레그램으로 알린다."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": text}, timeout=10)
    except Exception as exc:  # pragma: no cover
        print(f"[telegram] 알림 실패: {exc}")


def forward_to_n8n(payload: Dict) -> Dict:
    """이벤트를 n8n 워크플로우로 재전달."""
    headers = {"Content-Type": "application/json"}
    if N8N_API_KEY:
        headers["X-N8N-API-KEY"] = N8N_API_KEY
    resp = requests.post(N8N_WEBHOOK_URL, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


@app.get("/health")
def health():
    return {"status": "ok", "time": int(time.time())}


@app.post("/events")
async def receive_event(request: Request):
    """
    이벤트 수신 엔드포인트.

    예시 payload:
      {
        "type": "monitor_daily",          // 어떤 이벤트인지
        "customer": "홍길동",
        "competitors": [...],              // CompWatch 경쟁사 데이터
        "summary": "오늘 신규 리뷰 3건 발견",
        "generated_at": "2026-08-06T06:00:00Z"
      }
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON 바디 필요")

    event_type = body.get("type", "unknown")
    print(f"[event] type={event_type} received")

    # 필수 이벤트 타입 검증
    if event_type not in ("monitor_daily", "report_monthly", "payment_success", "booking_created", "monitor_alarm"):
        raise HTTPException(status_code=422, detail=f"지원하지 않는 이벤트 타입: {event_type}")

    try:
        result = forward_to_n8n(body)
        return JSONResponse({"accepted": True, "forwarded": result}, status_code=200)
    except Exception as exc:
        print(f"[event] n8n 전달 실패: {exc}")
        send_telegram(f"⚠️ Watcher: 이벤트 처리 실패\n타입: {event_type}\n오류: {exc}")
        return JSONResponse({"accepted": True, "forwarded": None, "error": str(exc)}, status_code=200)


@app.post("/alarm")
async def alarm(request: Request):
    """크롤러가 이상 신호(가격 변동, 후기 급증)를 감지하면 호출."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON 바디 필요")

    text = body.get("text", "CompWatch 알람 발생")
    send_telegram(f"🚨 CompWatch 알람\n{text}")
    return JSONResponse({"accepted": True}, status_code=200)


@app.get("/version")
def version():
    return {"name": "oracle-watcher", "version": "1.0.0"}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Oracle Watcher 이벤트 브릿지")
    parser.add_argument("--port", type=int, default=int(os.getenv("WATCHER_PORT", "8000")))
    parser.add_argument("--host", default="0.0.0.0")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
