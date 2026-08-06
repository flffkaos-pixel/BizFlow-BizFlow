# BizFlow Lite — 오라클 없는 완전 무료 버전

Oracle 서버 없이 **GitHub Actions + Cloudflare Workers** 만으로 운영되는 버전입니다.
응답이 최대 5분 지연되지만, 인프라 비용이 **0원** 입니다.

---

## 구성 요소

```
no-oracle/
├── worker/
│   ├── worker.js        ← Cloudflare Worker (카톡 웹훅 수신 + KV 큐)
│   ├── wrangler.toml    ← Worker 설정 (KV 바인딩)
│   └── SETUP.md         ← 배포 가이드
├── scripts/
│   └── process_queue.py ← GitHub Actions 5분 큐 처리 (LLM 응답 + 예약판단)
└── README.md            ← 이 파일
```

## 동작 흐름

```
고객 카톡 문의
   → Worker /kakao (즉시 "잠시만요" 응답, KV에 저장)
   → GitHub Actions (5분마다 process-queue.yml)
   → LLM 호출 → 예약 의도 판단
   → 예약이면 사장님 텔레그램 알림 (수동 확정)
   → 답변 등록 → Worker가 카톡에 회신
```

## 설치 순서

1. **Worker 배포**: `worker/SETUP.md` (wrangler + KV 생성 + publish)
2. **GitHub Actions 시크릿 등록** (저장소 Settings → Secrets):
   | 시크릿 | 값 |
   |--------|-----|
   | `WORKER_URL` | `https://kakao-gateway.xxx.workers.dev` |
   | `LLM_API_KEY` | OpenAI/Gemini 키 |
   | `LLM_MODEL` | `gpt-4o-mini` |
   | `LLM_BASE` | `https://api.openai.com/v1/chat/completions` |
   | `TELEGRAM_BOT_TOKEN` | (선택) 사장님 알림 |
   | `TELEGRAM_CHAT_ID` | (선택) |
3. **`process-queue.yml`** 이 이미 5분 cron으로 설정됨 → push만 하면 자동 실행
4. **카카오 채널 챗봇** → Worker `/kakao` URL 등록
5. **테스트**: `worker/SETUP.md`의 curl 예시로 확인

## 비용

| 항목 | 비용 |
|------|------|
| Cloudflare Workers | 무료 (하루 10만 요청) |
| Cloudflare KV | 무료 (하루 10만 읽기) |
| GitHub Actions | 무료 (2,000분/월) |
| LLM API | 실사용 (월 수천원) |
| **총 인프라 비용** | **0원** |

## Lite vs Pro

| | Lite (이 버전) | Pro (oracle/) |
|---|---|---|
| 응답 시간 | 최대 5분 | 즉시 |
| 예약 | 수동 확정 | 자동 (Cal.com) |
| 서버 | 없음 | Oracle 무료 |
| 가격 | 월 1.9만 | 월 3.9만 |

## GitHub Actions 시간 계산 (5분 cron = 1일 288회)

| 워크플로우 | 하루 실행 | 월 실행 | 분당/월 |
|-----------|----------|---------|---------|
| process-queue (5분) | 288 | 8,640 | ~7,200분 |
| → **초과 위험!** | | | |

> ⚠️ **주의**: 5분 cron은 하루 288회 실행으로 GitHub Actions 무료 한도(2,000분/월)를 크게 초과합니다.

### 해결 방법 (아래 중 선택)

| 방법 | 효과 | 단점 |
|------|------|------|
| **cron을 15분으로** (`*/15`) | 960분/월 — 안전 | 응답 최대 15분 지연 |
| **결제한 repo 사용** (프로 플랜) | 무제한 | 4$/월 (고객 비용 전가 가능) |
| **최소 대기시간 2개 계정** | 2,000분 × 2 | 관리 복잡 |
| **cron 10분** (`*/10`) | 1,440분/월 | 한도 근접, 여유 없음 |

> 🎯 **권장**: `*/15` 로 설정해 15분 응답 지연으로 안전하게 운영.
> Pro 고객에게는 그대로 5분 or 즉시 응답을 제공하면 차별화됨.

`process-queue.yml` 의 cron을 수정하세요:
```yaml
schedule:
  - cron: "*/15 * * * *"
```
