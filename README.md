# 설정 가이드 (GitHub Actions 완전자동)

## 1단계: 저장소 만들기

1. GitHub에서 **새 공개 저장소** 생성 (예: `compwatch-auto`)
2. 이 `deploy-full-automation` 폴더의 파일들을 그 저장소에 push

```bash
cd D:\business-workflows\deploy-full-automation
git init
git add -A
git commit -m "init: 완전자동 운영 시스템"
git remote add origin https://github.com/사용자명/compwatch-auto.git
git push -u origin main
```

> **공개 저장소**여야 무료 2,000분/월을 받습니다. (비공개는 500분)

## 2단계: PayPal 설정

### 2-1. PayPal Developer 계정

1. https://developer.paypal.com 에 가입
2. **Apps & Credentials** → **Create App**
3. Client ID와 Secret 확보

### 2-2. 실거래 활성화

- 테스트용: `paypal/paypal_client.py` 에서 `PAYPAL_API = "https://api-m.paypal.com"` (실서버)
- 샌드박스 테스트 시: `PAYPAL_SANDBOX=true` 환경변수 사용
- 실결제를 받으려면 PayPal 대시보드에서 **Live** 앱으로 전환 (비즈니스 계정 필요)

## 3단계: GitHub Secrets 설정

저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | 값 |
|--------|-----|
| `PAYPAL_CLIENT_ID` | PayPal 앱의 Client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal 앱의 Client Secret |

## 4단계: 모니터링할 사이트 등록

`config/sites.json` 편집:

```json
[
  { "url": "https://경쟁사1.com", "grade": "A" },
  { "url": "https://경쟁사2.com/pricing", "grade": "B" }
]
```

- `A`: 매일 크롤링
- `B`: 격일 크롤링
- `C`: 주 1회

## 5단계: 자동 배포 확인

- `deploy-pages.yml` → 랜딩페이지가 `https://사용자명.github.io/저장소명/` 에 배포됨
- GitHub Actions 탭에서 워크플로우가 주기적으로 실행되는지 확인

## 6단계: 첫 수동 실행

Actions 탭 → 각 워크플로우 → **Run workflow** → **Run workflow** 버튼 클릭

- `monitor-daily.yml` → 지금 크롤링 테스트
- `paypal-check.yml` → 결제 감지 테스트
- `report-monthly.yml` → 리포트 테스트

## 문제 해결

| 증상 | 해결 |
|------|------|
| `401 Unauthorized` | PayPal Client ID/Secret 오타 확인 |
| `403` 크롤링 실패 | 사이트가 Cloudflare 강하게 막는 경우 → site.json에서 `grade: C` 로 낮춤 |
| Actions 실행 안 됨 | 저장소가 public인지 확인 (비공개는 500분만 제공) |
| 결제 후 고객 등록 안 됨 | `pending_orders.json`이 없는지 확인 → 수동으로 주문 기록 필요 |

## 한계 (명확히)

1. **무료 2,000분/월** — 초과하면 다음 달까지 정지. 워크플로우 간격을 줄여 관리.
2. **실시간 응대 불가** — Actions는 주기적으로 깨어나는 방식이라 카톡 챗봇 24시간 상시는 불가. 하루 2회 응대 동기화 권장.
3. **상시 웹훅 불가** — PayPal IPN을 받을 상시 서버가 없으므로 폴링 방식 사용 (최대 2시간 지연).

> 실시간 서비스가 필수면 최소 1대의 상시 서버가 필요하지만,
> "주기적 자동화 + 결제 + 리포트" 구조라면 위 설정으로 0원 운영이 가능합니다.
