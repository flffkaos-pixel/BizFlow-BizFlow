# 🚀 시작 체크리스트 — BizFlow + CompWatch 전체 출시

> 모든 파일이 **`D:\business-workflows\deploy-full-automation`** 에 준비되어 있습니다.
> 이 체크리스트 순서대로 따라가면 됩니다.

---

## Phase 1: GitHub 저장소 준비 (30분)

- [ ] [github.com](https://github.com) 에서 **새 저장소 생성** (public 권장 → 무료 Actions 2,000분)
- [ ] 로컬 저장소를 GitHub에 연결:
  ```bash
  cd D:\business-workflows\deploy-full-automation
  git add -A
  git commit -m "초기 커밋: BizFlow + CompWatch 전체 스택"
  git remote add origin https://github.com/내아이디/저장소명.git
  git branch -M main
  git push -u origin main
  ```
- [ ] 저장소 **Settings → Pages** 에서 Source를 "GitHub Actions"로 설정
- [ ] [GITHUB-SECRETS.md](GITHUB-SECRETS.md) 참고하여 시크릿 등록

## Phase 2: 결제 준비 (PayPal) (1시간)

- [ ] [developer.paypal.com](https://developer.paypal.com) 계정 생성
- [ ] 앱 만들고 Client ID/Secret 확보 → 시크릿 등록
- [ ] [paypal-client의 테스트 절차](#)로 Sandbox 결제 테스트
- [ ] `landing/paypal-checkout.html` 에서 `client-id` 교체

## Phase 3: Lite 출시 (오라클 없음) — **하루 안에 가능**

- [ ] Cloudflare 계정 생성 (무료)
- [ ] [no-oracle/worker/SETUP.md](no-oracle/worker/SETUP.md) 따라 Worker 배포
  - [ ] `wrangler login`
  - [ ] `wrangler kv namespace create QUEUE`
  - [ ] `wrangler.toml` 에 KV ID 입력
  - [ ] `wrangler publish`
- [ ] 저장소 시크릿에 `WORKER_URL` 등록
- [ ] `process-queue.yml` 자동 실행 확인 (15분 간격)
- [ ] 카카오 채널 챗봇 등록 (Worker `/kakao` URL)
- [ ] **Lite 가격** → PRICING.md 참고 (설치 4.9만 / 월 1.9만)

## Phase 4: Pro 출시 (오라클 있음) — 2~3일

- [ ] [oracle/SETUP.md](oracle/SETUP.md) 따라 Oracle Cloud 세팅
  - [ ] Oracle Cloud 계정 생성 (Free Tier)
  - [ ] ARM 인스턴스 생성 (4코어/24GB)
  - [ ] Docker 설치
- [ ] `oracle/.env` 채우고 `docker compose up -d`
- [ ] n8n 워크플로우 임포트 (`n8n-workflows/*.json` 3개)
- [ ] Dify 챗봇 생성 (`dify/SETUP.md`)
- [ ] Cal.com 연동 (`CALCOM-GUIDE.md`)
- [ ] Watcher 실행 (`watcher/README.md`)
- [ ] **Pro 가격** → PRICING.md 참고 (설치 9.9만 / 월 3.9만)

## Phase 5: 운영 시작

- [ ] 랜딩페이지 배포 확인 (`https://내아이디.github.io/저장소명/`)
- [ ] 네이버 블로그/카페에 제품 소개 작성
- [ ] 첫 고객 3명 → 무료 체험 후 결제 전환
- [ ] `monitor-daily` 실행 확인 (매일 06:00 UTC)
- [ ] `report-monthly` 실행 확인 (매월 1일)

---

## 파일 구조 요약

```
deploy-full-automation/
├── .github/workflows/     ← GitHub Actions 5개 자동화
├── config/                ← 고객/모니터링 설정
├── dify/                  ← Dify 챗봇 설정 가이드
├── landing/               ← 랜딩페이지 (paypal-checkout.html)
├── n8n-workflows/         ← n8n 워크플로우 JSON 3개
├── no-oracle/             ← Lite 버전 (Worker + GA)
├── oracle/                ← Pro 버전 (Docker 스택)
├── paypal/                ← PayPal API 클라이언트
├── scripts/               ← 크롤링/리포트/고객등록 스크립트
├── snapshots/             ← 크롤링 결과 저장
└── watcher/               ← 이벤트 브릿지 서버
```

## 문서 목록

| 문서 | 내용 |
|------|------|
| `BUSINESS-OVERVIEW.md` | 전체 사업 설명 (서비스/수익/아키텍처) |
| `PRICING.md` | 두 버전 가격표 + 번들 + 업셀 |
| `GITHUB-SECRETS.md` | 시크릿 등록 가이드 |
| `KAKAO-BOOKING-GUIDE.md` | 카톡 AI 응대 전체 흐름 |
| `CALCOM-GUIDE.md` | Cal.com 연동 |
| `dify/SETUP.md` | Dify 챗봇 설정 |
| `oracle/SETUP.md` | Oracle 서버 세팅 |
| `no-oracle/README.md` | Lite 버전 개요 |
| `no-oracle/worker/SETUP.md` | Cloudflare Worker 배포 |
| `watcher/README.md` | Watcher 실행 |
