#!/usr/bin/env python3
"""
process_queue.py - GitHub Actions 5분 큐 처리 (오라클 없는 버전)

역할:
  1. Cloudflare KV(/pending)에서 대기 중인 카톡 메시지 조회
  2. LLM API로 응답 생성 (예약 의도 판단 포함)
  3. 예약 의도면 사장님에게 텔레그램 알림
  4. 답변을 Worker(/reply)로 등록 → 카톡에 회신

환경변수 (GitHub Actions secrets에 등록):
  WORKER_URL            https://kakao-gateway.xxx.workers.dev
  LLM_API_KEY           OpenAI/Gemini API 키
  LLM_MODEL             gpt-4o-mini (기본)
  TELEGRAM_BOT_TOKEN    (선택)
  TELEGRAM_CHAT_ID      (선택) 사장님 알림용

실행: python process_queue.py
"""

import json
import os
import sys
import urllib.request
import urllib.error

WORKER_URL = os.getenv("WORKER_URL", "").rstrip("/")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_BASE = os.getenv("LLM_BASE", "https://api.openai.com/v1/chat/completions")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

BUSINESS_HOURS = "평일 09:00~18:00, 주말 휴무"

SYSTEM_PROMPT = f"""당신은 중소기업 AI 상담 비서입니다.
- 한국어로 친절하고 간결하게 답변하세요.
- 고객이 예약/상담/견적 의도를 보이면 날짜와 시간을 물어보거나 확정해 주세요.
- 영업시간은 {BUSINESS_HOURS}입니다.
- 답변은 반드시 아래 JSON 형식으로만 출력하세요:
{{"reply": "고객에게 보낼 답변", "booking": true/false, "customer_name": "", "datetime": "YYYY-MM-DDTHH:mm", "note": ""}}
- 예약 확정 시에만 booking을 true로 하고 datetime은 ISO 형식으로 채우세요."""


def http_json(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, method=method or ("GET" if data is None else "POST"))
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    if data is not None:
        req.add_header("Content-Type", "application/json")
        req.data = json.dumps(data).encode("utf-8")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_pending():
    return http_json(f"{WORKER_URL}/pending?limit=10", headers={"Content-Type": "application/json"})


def complete_message(msg_id, reply):
    http_json(
        f"{WORKER_URL}/complete",
        {"msgId": msg_id, "reply": reply},
        headers={"Content-Type": "application/json"},
    )


def llm_answer(utterance):
    resp = http_json(
        LLM_BASE,
        {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": utterance},
            ],
            "temperature": 0.3,
        },
        headers={"Authorization": f"Bearer {LLM_API_KEY}"},
    )
    content = resp["choices"][0]["message"]["content"]
    return parse_llm(content)


def parse_llm(content):
    try:
        start = content.find("{")
        end = content.rfind("}") + 1
        data = json.loads(content[start:end])
        return {
            "reply": data.get("reply", "처리되었습니다."),
            "booking": bool(data.get("booking")),
            "customer_name": data.get("customer_name", ""),
            "datetime": data.get("datetime", ""),
            "note": data.get("note", ""),
        }
    except Exception:
        return {"reply": content, "booking": False, "customer_name": "", "datetime": "", "note": ""}


def send_telegram(text):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        http_json(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            {"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "Markdown"},
        )
    except Exception as exc:
        print(f"[telegram] 실패: {exc}")


def main():
    if not WORKER_URL:
        print("WORKER_URL 환경변수가 필요합니다.")
        sys.exit(1)

    pending = get_pending()
    messages = pending.get("pending", [])
    if not messages:
        print("대기 메시지 없음.")
        return

    for msg in messages:
        msg_id = msg.get("msgId")
        utterance = msg.get("utterance", "")
        print(f"처리: {msg_id} / {utterance[:40]}")

        try:
            result = llm_answer(utterance)
            reply = result["reply"]

            # 예약 의도 → 사장님 알림
            if result["booking"]:
                dt = result["datetime"] or "미정"
                name = result["customer_name"] or "미입력"
                send_telegram(
                    f"📅 *신규 예약 요청*\n\n"
                    f"👤 고객: {name}\n🕐 일시: {dt}\n📝 메모: {result['note'] or '-'}\n\n"
                    f"> (확정은 수동으로 진행해 주세요)"
                )

            complete_message(msg_id, reply)
            print(f"완료: {msg_id} → {reply[:40]}")
        except urllib.error.HTTPError as exc:
            print(f"LLM 오류({exc.code}): {exc.read()[:200]}")
            complete_message(msg_id, "죄송합니다. 잠시 후 다시 시도해주세요.")
        except Exception as exc:
            print(f"오류: {exc}")
            complete_message(msg_id, "죄송합니다. 잠시 후 다시 시도해주세요.")


if __name__ == "__main__":
    main()
