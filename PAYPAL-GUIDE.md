# PayPal 결제 연동 가이드 (Phase 2)

> 목표: 고객이 랜딩페이지에서 결제하면 → 주문이 기록되고 → GitHub Actions가 2시간마다
> 결제 완료 여부를 확인 → 고객 계정 자동 활성화.

---

## 전체 결제 흐름

```
고객이 랜딩페이지에서 플랜 선택 + 이메일 입력
   → PayPal 결제창 (팝업)
   → 결제 완료 (onApprove)
   → 주문을 Cloudflare Worker /orders 에 기록 (KV 저장)
   → GitHub Actions (2시간마다 paypal-check.yml)
   → Worker /orders 에서 대기 주문 조회
   → PayPal API로 결제 상태 확인 (COMPLETED?)
   → 완료 시 customers/{email}.json 생성 → 고객 활성화
```

---

## 1단계: PayPal 앱 만들기 (개발자 포털)

1. [developer.paypal.com](https://developer.paypal.com) 접속 → 로그인
2. 좌측 **Apps & Credentials**
3. **Create App** 클릭
   - App Name: `BizFlow`
   - App Type: **Merchant**
4. 생성되면 **Client ID** / **Secret** 표시 → 복사

## 2단계: 샌드박스 테스트 계정 확인

PayPal 개발자 포털은 기본적으로 **Sandbox** 모드입니다.

1. **Sandbox → Test accounts** 메뉴
2. 기본 샌드박스 계정 확인 (이메일/password)
   - `xxx-business@business.example.com` (판매자)
   - `xxx-personal@personal.example.com` (구매자)
3. 구매자 계정으로 로그인해 테스트 결제 가능

## 3단계: GitHub 시크릿 등록

저장소 → Settings → Secrets and variables → Actions:

| 시크릿 | 값 |
|--------|-----|
| `PAYPAL_CLIENT_ID` | 1단계에서 복사한 Client ID |
| `PAYPAL_CLIENT_SECRET` | 1단계에서 복사한 Secret |
| `PAYPAL_SANDBOX` | `true` (테스트 중) |
| `WORKER_URL` | `https://kakao-gateway.xxx.workers.dev` |

> ⚠️ 실서비스 전환 시: `PAYPAL_SANDBOX`를 `false`로, Client ID를 **Live** 모드 앱의 것으로 교체.

## 4단계: 랜딩페이지 연동

`landing/paypal-checkout.html` 에서:

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=USD&intent=capture"></script>
```

- `YOUR_CLIENT_ID` → 샌드박스 Client ID 로 교체
- `WORKER_URL` 변수 → 배포한 Worker 주소로 교체

변경 후 push 하면 GitHub Pages가 자동 배포됩니다.

## 5단계: 결제 테스트

1. `https://flffkaos-pixel.github.io/BizFlow-BizFlow/paypal-checkout.html` 접속
2. 플랜 선택 (Lite $3 / Pro $6)
3. 이메일 입력
4. **PayPal 결제** 클릭 → 샌드박스 로그인 (구매자 계정)
5. 결제 승인

## 6단계: 자동화 확인

1. Worker 확인:
   ```bash
   curl https://kakao-gateway.xxx.workers.dev/orders
   ```
   → `pending` 배열에 방금 결제한 주문이 보여야 함

2. GitHub Actions 수동 실행:
   ```bash
   gh workflow run paypal-check.yml
   ```

3. Actions 로그 확인:
   - `Worker에서 대기 주문 N건 조회됨`
   - `ORDER_ID → COMPLETED`
   - `신규 고객 등록: xxx@xxx.com (lite/pro)`

4. 저장소에 `customers/` 폴더에 고객 JSON 생성 확인

## 7단계: 실서비스 전환

1. PayPal 대시보드 → **Live** 탭 → Create App → Live Client ID/Secret 발급
2. 랜딩페이지 client-id → Live로 교체
3. 시크릿 `PAYPAL_CLIENT_ID/SECRET` → Live 값으로 교체
4. `PAYPAL_SANDBOX` → `false`
5. 배포 후 실제 결제 테스트

---

## 트러블슈팅

| 문제 | 원인 | 해결 |
|------|------|------|
| PayPal 버튼 안 뜸 | client-id 오타/미교체 | SDK URL의 client-id 확인 |
| 결제 후 주문 미기록 | WORKER_URL 미설정 | Worker 배포 + 랜딩페이지 URL 교체 |
| Actions에서 주문 0건 | WORKER_URL 시크릿 미등록 | 3단계 시크릿 확인 |
| 주문 상태 PENDING 반복 | 결제가 capture 전 | PayPal 화면에서 결제 완료까지 진행 |
| 고객 미등록 | result.json 파싱 실패 | register_customers.py 로그 확인 |

---

## 참고: 실제 가격 (PRICING.md 기준)

| 상품 | USD 표시 (테스트) | KRW (실서비스) |
|------|------|------|
| BizFlow Lite | $3 | 19,000원 |
| BizFlow Pro | $6 | 39,000원 |
| CompWatch Starter | $3 | 19,000원 |
| CompWatch Pro | $6 | 39,000원 |

> PayPal은 USD 기준 결제가 단순합니다. KRW 전환은 PayPal 결제 시 자동 환전됩니다.
