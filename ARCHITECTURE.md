# GitHub Actions 기반 완전무료 자동운영 시스템

## 개요

서버 구매 없이, 오직 GitHub Actions 무료 크레딧만으로 두 서비스를 운영합니다.

| 항목 | 방법 | 비용 |
|------|------|------|
| 랜딩페이지 호스팅 | GitHub Pages | 무료 |
| 경쟁사 크롤링 | Actions cron (매일) | 무료 |
| 월간 리포트 | Actions cron (매월 1일) | 무료 |
| 페이팔 결제 감지 | Actions cron (1시간 간격 폴링) | 무료 |
| 신규 고객 자동 가입 | Actions에서 PayPal API 확인 후 DB에 기록 | 무료 |
| 저장소 | public GitHub repo | 무료 |

## 구조

```
.github/workflows/
├── deploy-pages.yml      # 랜딩페이지 → GitHub Pages 배포
├── monitor-daily.yml     # 경쟁사 크롤링 + 변경 감지 (매일 06:00)
├── report-monthly.yml    # 월간 리포트 생성 + 이메일 발송 (매월 1일)
└── paypal-check.yml      # 페이팔 결제 확인 + 고객 프로비저닝 (1시간 간격)
```

## 작동 원리

1. 고객이 랜딩페이지에서 **PayPal 버튼** 클릭 → 결제 완료
2. 결제 금액과 주문번호가 `PAYMENTS.json`에 기록됨 (GitHub Actions가 커밋)
3. 1시간마다 `paypal-check.yml`이 실행되어 PayPal REST API를 조회
4. 결제가 `COMPLETED`인 주문 발견 → `customers/` 폴더에 고객 정보 생성
5. `monitor-daily.yml`이 해당 고객의 URL을 크롤링 시작

## 필요한 GitHub Secrets

| 이름 | 값 |
|------|-----|
| `PAYPAL_CLIENT_ID` | PayPal REST API Client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal REST API Client Secret |
| `GITHUB_TOKEN` | 기본 제공 (설정 불필요) |

## 무료 크레딧 계산 (월)

| 워크플로우 | 실행 횟수 | 소요시간 | 분 환산 |
|-----------|----------|----------|---------|
| deploy-pages | 5 | 1분 | 5 |
| monitor-daily | 30 | 10분 | 300 |
| report-monthly | 1 | 5분 | 5 |
| paypal-check | 720 | 2분 | 1,440 |
| **합계** | | | **1,750분** |

> GitHub Actions 무료 한도: **공개 저장소 2,000분/월**.
> paypal-check의 간격을 2시간으로 늘리면 720분으로 줄어 총 **1,030분** → 여유 확보.
