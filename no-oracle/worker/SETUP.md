# Cloudflare Worker 배포 가이드 (오라클 없는 버전)

이 Worker는 **카카오 웹훅을 받아서 KV에 저장** 하고, GitHub Actions가 처리한 답변을 회신하는 게이트웨이입니다.
Oracle 서버 없이 순수 Cloudflare 무료 티어로 돕니다.

---

## 1. 사전 준비

- Cloudflare 계정 (무료)
- GitHub 저장소 (비공개여도 가능)
- Node.js 설치 (wrangler 사용)

## 2. KV 네임스페이스 생성

```bash
cd no-oracle/worker
npm i -g wrangler
wrangler login

# KV 네임스페이스 생성 → ID가 출력됨
wrangler kv namespace create QUEUE
```

출력된 `id`를 `wrangler.toml`의 `kv_namespaces[0].id` 에 붙여넣기.

## 3. 배포

```bash
wrangler publish
```

배포 완료 시 표시되는 URL을 기록:
```
https://kakao-gateway.<your-subdomain>.workers.dev
```

## 4. 카카오 챗봇 등록

카카오 채널 → 챗봇 설정에서 **서버 주소**를:
```
https://kakao-gateway.<your-subdomain>.workers.dev/kakao
```
로 등록 (POST 요청).

> 💡 카카오 i 오픈빌더 승인 전 테스트하려면 curl로 확인:
> ```bash
> curl -X POST https://kakao-gateway.<sub>.workers.dev/kakao \
>   -H "Content-Type: application/json" \
>   -d '{"userRequest":{"utterance":"다음주 화요일 예약하고 싶어요","user":{"id":"test1"}}}'
> ```

## 5. 확인

```bash
curl https://kakao-gateway.<sub>.workers.dev/health
# → {"ok":true,"time":...}
```

## 6. 다음 단계

GitHub Actions 5분 큐 처리 스크립트(`no-oracle/scripts/process_queue.py`)와
워크플로우(`process-queue.yml`)를 설정하면 자동화가 완성됩니다.

---

## 무료 한도 (Cloudflare Workers Free)

| 항목 | 한도 |
|------|------|
| 요청 수 | 하루 100,000회 |
| KV 읽기 | 하루 100,000회 |
| KV 쓰기 | 하루 1,000회 |
| KV 저장 | 1GB |
| CPU 시간 | 하루 10ms 당 10만 |

→ 소규모 고객(문의 하루 100건 미만)에는 넉넉합니다.
