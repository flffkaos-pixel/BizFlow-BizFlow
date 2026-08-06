# 카톡 AI 응대 실전 배포 가이드

이 문서는 n8n 워크플로우 + Dify 챗봇 + Cal.com 예약을 실제로 운영하기 위한 전체 순서입니다.

---

## 사전 준비물

| 항목 | 상세 | 비용 |
|------|------|------|
| Oracle Cloud 계정 | Always Free Tier (ARM 4코어/24GB) | 무료 |
| 도메인 | (권장) `내도메인.com` — 있어야 인증서 문제 없음 | ~1만원/년 |
| Cloudflare 계정 | Tunnel 무료, 도메인 네임서버를 Cloudflare로 | 무료 |
| 카카오톡 채널 | 채널 만들고 알림톡/챗봇 API 신청 | 무료 (공식 계정 필요) |
| PayPal 개발자 계정 | 개발자 모드에서 Sandbox 사용 | 무료 |

---

## 1단계: Oracle 서버에 전체 스택 설치

```bash
cd deploy-full-automation
cp oracle/.env.example oracle/.env
# .env 파일을 열어 도메인, 이메일, 비밀번호를 채운다
docker compose -f oracle/docker-compose.yml up -d
```

시작되는 서비스:

| 서비스 | 주소 | 역할 |
|--------|------|------|
| n8n | `https://n8n.내도메인.com` | 워크플로우 실행 |
| Dify | `https://dify.내도메인.com` | AI 챗봇 응대 |
| Cal.com | `https://cal.내도메인.com` | 예약 관리 |
| PostgreSQL | 내부 | 데이터 저장 |
| Redis | 내부 | 캐시 |
| Watcher | 내부 | GitHub Actions 이벤트 감지 → 실시간 응대 |

## 2단계: n8n 워크플로우 임포트

1. `https://n8n.내도메인.com` 접속 → 첫 실행 시 관리자 계정 생성
2. **워크플로우** → **"..." 메뉴 → "가져오기(Import)"**
3. `n8n-workflows/kakao-booking.json` 파일 선택

## 3단계: 환경 변수 입력

n8n에서 **자격 증명(Credentials)** 을 만듭니다:

| 자격 증명 | 값 |
|-----------|-----|
| HTTP Header Auth | `Authorization: Bearer {{Dify API 키}}` |
| HTTP Header Auth | `Authorization: Bearer {{Cal.com API 키}}` |

그리고 n8n → **설정 → 환경 변수** 에 추가:
- `DIFY_API_KEY`
- `CALCOM_API_KEY`
- `PUBLIC_DOMAIN`

## 4단계: Dify 챗봇 앱 생성

→ [Dify 챗봇 설정](dify/SETUP.md) 참고

## 5단계: Cal.com 설정

→ [n8n→Cal.com 연결](CALCOM-GUIDE.md) 참고

## 6단계: 카카오톡 채널 연동

카카오 채널에서 채널 관리자 → **관리 → 설정 → 채팅봇** 에서:

1. **카카오 i 오픈빌더** 또는 **간편봇** 으로 시작
2. 카카오 i 오픈빌더가 부담스러우면 → **카카오톡 채널 챗봇(파트너) API** 사용
3. n8n Webhook URL을 챗봇 서버 URL에 등록:
   ```
   https://n8n.내도메인.com/webhook/kakao-inbound
   ```
4. 요청/응답 포맷이 카카오 규격이면 n8n 워크플로우 앞에 **변환(Code) 노드**를 하나 추가해 주세요.

> 💡 카카오 공식 봇 API 승인 전까지는 **웹 데모** 로 테스트할 수 있습니다: `https://n8n.내도메인.com/webhook/kakao-inbound` 에 POST로 쏴보기.

## 7단계: 테스트 전체 흐름

```
카카오 문의
  → n8n webhook 수신
  → Dify AI 분석 (예약 여부 판단)
  → 예약이면 Cal.com 예약 생성
  → 사장님 Slack/텔레그램 알림
  → 카카오에 확정 응답
```

직접 테스트:
```bash
curl -X POST https://n8n.내도메인.com/webhook/kakao-inbound \
  -H "Content-Type: application/json" \
  -d '{"message":"다음주 화요일 오후 2시에 예약하고 싶어요."}'
```

## 8단계: 상시 자동화 (GitHub Actions + Watcher)

- `monitor-daily.yml`, `report-monthly.yml`, `paypal-check.yml` → GitHub Actions에서 자동 실행
- Watcher가 서버에서 이벤트를 받아 실시간 처리

## 9단계: 결제 연동

→ [PayPal 설정](README.md#paypal-결제-연동) 참고

---

## 흐름 요약도

```
[고객] → 카카오톡 채널
             ↓
        n8n (Webhook)
             ↓
        Dify 챗봇 ──예약 아님──→ 카톡 답변
             │
             │ 예약
             ↓
        Cal.com 예약 생성 ──→ 사장님 알림 (Slack/Telegram)
             ↓
        카톡 확정 응답 + 캘린더 반영
```

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| n8n 예약 노드 에러 | eventTypeId 없음 | CALCOM-GUIDE 2번 확인 |
| Dify 응답 느림 | 모델 응답 지연 | 저가 모델로 변경 |
| Webhook 404 | URL 오타 | `/webhook/kakao-inbound` 확인 |
| 인증서 오류 | 도메인 미연결 | Cloudflare Tunnel 도메인 설정 |
| 시간 9시간 차이 | UTC/KST 미보정 | CALCOM-GUIDE 6번 참고 |
