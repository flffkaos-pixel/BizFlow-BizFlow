# Cloudflare Pages 배포 설정 가이드

> 랜딩페이지(`landing/`)를 **Cloudflare Pages**에 배포합니다. GitHub Pages 대신 Cloudflare로 통합하여 관리합니다.

---

## 1. Cloudflare 계정 준비

1. [dash.cloudflare.com](https://dash.cloudflare.com) 가입/로그인
2. **Workers & Pages** → **Pages** 메뉴
3. **프로젝트 만들기** → **GitHub에서 가져오기** 또는 **직접 업로드**
4. 프로젝트 이름: `bizflow` (이름은 자유, wrangler 명령어와 일치해야 함)

> **GitHub 연동 권장**: `cloudflare/wrangler-action`으로 배포하므로, Pages 대시보드에서 "직접 업로드"로 프로젝트만 생성해두면 됩니다. (GitHub 연동도 가능하지만 wrangler-action 방식이 CI에서 더 깔끔합니다.)

---

## 2. 필요한 값 확인

| 값 | 확인 위치 |
|-----|-----------|
| `CLOUDFLARE_ACCOUNT_ID` | Workers & Pages → 오른쪽 상단 프로필 → **계정 ID** 복사 |
| `CLOUDFLARE_API_TOKEN` | 내 프로필 → **API 토큰** → **토큰 만들기** → **Workers Pages API** 템플릿 → **편집** → **계정 > Workers Pages** 권한(Read/Edit) → **생성** → 토큰 복사 |

> ⚠️ API 토큰은 **한 번만 표시**됩니다. 바로 저장해두세요.

---

## 3. GitHub 시크릿 등록

저장소 → Settings → Secrets and variables → Actions → New repository secret:

| 시크릿 | 값 |
|--------|-----|
| `CLOUDFLARE_ACCOUNT_ID` | 2단계에서 복사한 Account ID |
| `CLOUDFLARE_API_TOKEN` | 2단계에서 생성한 API 토큰 |

> 기존 `WORKER_URL` 등은 그대로 둡니다 (카톡 Worker용).

---

## 4. 배포 확인

push 후 Actions 탭에서 `랜딩페이지 배포 (Cloudflare Pages)` 워크플로우가 실행됩니다.

성공 시:
- Cloudflare Pages 대시보드 → `bizflow` 프로젝트 → **배포 내역**에 최신 배포 확인
- 배포 URL: `https://bizflow.pages.dev` (또는 커스텀 도메인 연결 시 도메인)

---

## 5. 커스텀 도메인 연결 (선택)

1. Pages 대시보드 → `bizflow` → **사용자 지정 도메인** → **도메인 추가**
2. 예: `landing.bizflow.example.com` 또는 `bizflow.example.com`
3. DNS 레코드(CNAME) 자동 안내 → Cloudflare DNS에 추가
3. SSL 인증서 자동 발급 (무료)

---

## 6. 기존 GitHub Pages

기존 `deploy-pages.yml`은 GitHub Pages용이었으나, 이제 Cloudflare Pages로 통합됩니다. GitHub Pages 설정(Settings → Pages)은 **비활성화**하거나 그대로 둬도 됩니다.

---

## 7. 로컬 테스트 (선택)

```bash
# Cloudflare Wrangler 설치
npm i -g wrangler
wrangler login

# 로컬 미리보기
wrangler pages dev landing/ --project-name=bizflow

# 수동 배포
wrangler pages deploy landing/ --project-name=bizflow
```