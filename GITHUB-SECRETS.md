# GitHub Actions 시크릿 설정 가이드

모든 자동화 워크플로우가 사용하는 시크릿을 저장소에 등록합니다.

> 등록 위치: GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**

---

## 공통 (모든 워크플로우)

| 시크릿 | 워크플로우 | 설명 |
|--------|-----------|------|
| `PAYPAL_CLIENT_ID` | paypal-check | PayPal REST API Client ID |
| `PAYPAL_CLIENT_SECRET` | paypal-check | PayPal REST API Secret |
| `PAYPAL_SANDBOX` | paypal-check | `true`(테스트) / `false`(실서비스) |
| `WORKER_URL` | process-queue, paypal-check | Cloudflare Worker 주소 `https://kakao-gateway.xxx.workers.dev` |
| `LLM_API_KEY` | process-queue | OpenAI/Gemini API 키 |
| `LLM_MODEL` | process-queue | `gpt-4o-mini` (기본) |
| `LLM_BASE` | process-queue | `https://api.openai.com/v1/chat/completions` |
| `TELEGRAM_BOT_TOKEN` | process-queue | (선택) 사장님 텔레그램 봇 토큰 |
| `TELEGRAM_CHAT_ID` | process-queue | (선택) 사장님 텔레그램 채팅 ID |
| `CLOUDFLARE_ACCOUNT_ID` | deploy-pages | Cloudflare 계정 ID (대시보드 > 계정 > 계정 ID) |
| `CLOUDFLARE_API_TOKEN` | deploy-pages | Cloudflare API 토큰 (Workers Pages API: Edit 권한) |

## 필요 시크릿 × 워크플로우 매트릭스

| 시크릿 | deploy-pages | monitor-daily | report-monthly | paypal-check | process-queue |
|--------|:---:|:---:|:---:|:---:|:---:|
| PAYPAL_CLIENT_ID | - | - | - | ✅ | - |
| PAYPAL_CLIENT_SECRET | - | - | - | ✅ | - |
| PAYPAL_SANDBOX | - | - | - | ✅ | - |
| WORKER_URL | - | - | - | ✅ | ✅ |
| LLM_API_KEY | - | - | - | - | ✅ |
| LLM_MODEL | - | - | - | - | ✅ |
| LLM_BASE | - | - | - | - | ✅ |
| TELEGRAM_BOT_TOKEN | - | - | - | - | ✅ |
| TELEGRAM_CHAT_ID | - | - | - | - | ✅ |
| CLOUDFLARE_ACCOUNT_ID | ✅ | - | - | - | - |
| CLOUDFLARE_API_TOKEN | ✅ | - | - | - | - |

> monitor-daily, report-monthly, paypal-check, process-queue는 **데이터 커밋/처리**만 수행하므로 별도 배포 시크릿 불필요.
> `deploy-pages`만 Cloudflare Pages 배포용 시크릿 필요.

## 텔레그램 봇 토큰 얻는 법 (선택)

1. 텔레그램에서 `@BotFather` 검색 → `/newbot` → 이름 지정
2. 받은 `HTTP API` 토큰 → `TELEGRAM_BOT_TOKEN`
3. `@userinfobot` 으로 채팅 → 본인 `id` → `TELEGRAM_CHAT_ID`

## PayPal 크레덴셜 얻는 법

1. [developer.paypal.com](https://developer.paypal.com) 가입
2. **Apps & Credentials** → **Create App**
3. Client ID / Secret 복사 → `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
4. (테스트) **Sandbox** 모드로 먼저 테스트 후 Live로 전환
