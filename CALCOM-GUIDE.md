# n8n → Cal.com 예약 연결 가이드

`kakao-booking.json` 워크플로우가 Cal.com에 예약을 만들 때 필요한 설정입니다.

---

## 1. Cal.com 실행 확인

Oracle 서버에서 Cal.com이 실행 중인지 확인:

```bash
docker compose -f oracle/docker-compose.yml ps
```

실행 중이면 `https://cal.내도메인.com` 접속.

## 2. Event Type ID 확보 (가장 중요)

n8n 워크플로우는 `행사타입ID`(eventTypeId) 값이 필요합니다.

1. Cal.com 접속 → 로그인 (첫 실행 시 관리자 계정 생성)
2. **"이벤트 유형"** 메뉴 → 기본 "15분 회의" / "30분 회의" 중 하나 선택
3. 각 이벤트 유형은 URL 형태로 주소가 나옵니다:
   ```
   https://cal.내도메인.com/yourusername/30min
   ```
   → URL 마지막 부분이 Event Type 이름. **Event Type ID는 이 숫자가 아니라 별도 번호**입니다.
4. 정확한 ID 확인 방법 (API):
   ```bash
   curl -H "Authorization: Bearer cal_xxx" https://cal.내도메인.com/api/v1/event-types
   ```
   응답의 `id` 필드가 Event Type ID입니다.

> 💡 n8n 워크플로우에서 **아직 이 값이 채워지지 않으면 테스트 시 오류가 납니다.** Dify 프롬프트의 `행사타입ID` 값과 동일한지 확인하세요.

## 3. Cal.com API Key 발급

1. Cal.com 접속 → **설정(Settings)** → **개발자(Developer)** → **API Keys**
2. **"API 키 생성"** 클릭 → `cal_` 로 시작하는 키 복사
3. `oracle/.env`의 `CALCOM_API_KEY=` 에 붙여넣기

## 4. Cal.com API 엔드포인트

n8n 워크플로우의 `calcom-booking` 노드는 다음과 같이 요청합니다:

- **URL**: `https://cal.내도메인.com/api/v1/bookings`
- **Method**: POST
- **Headers**: `Authorization: Bearer cal_xxx`
- **Body**:
  ```json
  {
    "eventTypeId": 1,
    "start": "2026-08-10T14:00:00",
    "name": "홍길동",
    "email": "hong@example.com",
    "notes": "상담 예약"
  }
  ```

## 5. 이메일 알림 (선택)

Cal.com은 예약 시 고객/관리자에게 이메일 알림을 보냅니다.
SMTP 설정이 필요하면 `oracle/.env`의 `SENDER_EMAIL`/`SMTP_*` 값을 채우세요.
설정 안 하면 이메일 알림 없이 예약만 만들어집니다.

## 6. 예약 시간대 (Timezone) 주의

- Cal.com API에 전달하는 `start` 값은 **ISO 8601** 형식 (예: `2026-08-10T14:00:00`)
- Dify가 보내는 시간이 UTC 기준인지 로컬 기준인지 확인하세요. 한국(KST, UTC+9)이면 9시간을 더해 보내야 할 수 있습니다.
- 필요하면 n8n의 `dify-analyze` 노드 응답에서 `start` 를 보정하는 Code 노드를 추가:
  ```js
  const raw = $json.answer.match(/시작일시:\s*([^\n]+)/)?.[1];
  return [{ ...$json, start: new Date(raw).toISOString() }];
  ```

## 7. 테스트

n8n에서 워크플로우 실행 → Webhook URL 호출:

```bash
curl -X POST https://n8n.내도메인.com/webhook/kakao-inbound \
  -H "Content-Type: application/json" \
  -d '{"message":"다음주 화요일 2시에 예약하고 싶어요"}'
```

응답으로 예약 확정 메시지가 오면 성공.

---

다음 단계: [전체 실전 배포 가이드](../oracle/SETUP.md)
