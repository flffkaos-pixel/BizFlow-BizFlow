# Watcher 테스트 / 수동 실행 가이드

Watcher는 GitHub Actions의 단발성 작업(monitor-daily 등)과 Oracle 상시 서버를 이어주는 **이벤트 다리**입니다.
이벤트를 받아 n8n으로 재전달하고, 실패 시 텔레그램으로 사장님에게 알립니다.

---

## 1. 로컬 테스트 (Python)

```bash
cd D:\business-workflows\deploy-full-automation\watcher
pip install fastapi uvicorn requests

# 환경변수 설정 (PowerShell)
$env:N8N_WEBHOOK_URL="http://localhost:5678/webhook/kakao-inbound"
python watcher.py --port 8000
```

## 2. 헬스체크

```bash
curl http://localhost:8000/health
# → {"status":"ok","time":...}
```

## 3. 이벤트 전송 테스트

```bash
curl -X POST http://localhost:8000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "monitor_alarm",
    "customer": "홍길동",
    "text": "경쟁사 A사가 가격을 10% 내렸습니다"
  }'
```

## 4. 알람 테스트 (텔레그램 연동 시)

```bash
curl -X POST http://localhost:8000/alarm \
  -H "Content-Type: application/json" \
  -d '{"text":"테스트 알람"}'
```

## 5. Oracle 서버 배포 시

`oracle/docker-compose.yml` 의 `watcher` 서비스에 다음 환경변수 추가:

```yaml
  watcher:
    ...
    environment:
      N8N_WEBHOOK_URL: http://n8n:5678/webhook/kakao-inbound
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      TELEGRAM_CHAT_ID: ${TELEGRAM_CHAT_ID}
    command: >
      sh -c "pip install fastapi uvicorn requests &&
             python /app/watcher/watcher.py"
    volumes:
      - ../watcher:/app/watcher:ro
```

## 6. 지원하는 이벤트 타입

| type | 용도 |
|------|------|
| `monitor_daily` | 일일 경쟁사 크롤링 결과 → n8n → 리포트/알림 |
| `report_monthly` | 월간 리포트 생성 완료 알림 |
| `payment_success` | PayPal 결제 성공 → 고객 활성화 |
| `booking_created` | Cal.com 예약 생성 → n8n → 카톡 확정 |
| `monitor_alarm` | 이상 신호(가격변동/후기급증) → 텔레그램 즉시 알림 |
