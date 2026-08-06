import json
import os
import base64
import urllib.request
import urllib.parse
import datetime

PAYPAL_API = "https://api-m.paypal.com"
SANDBOX_API = "https://api-m.sandbox.paypal.com"

def get_access_token(client_id: str, client_secret: str, sandbox: bool = False) -> str:
    """PayPal OAuth2 access token 발급"""
    base = SANDBOX_API if sandbox else PAYPAL_API
    auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    data = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode()
    req = urllib.request.Request(
        f"{base}/v1/oauth2/token",
        data=data,
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["access_token"]


def create_order(access_token: str, amount: str, product: str, email: str, sandbox: bool = False) -> dict:
    """PayPal 주문 생성"""
    base = SANDBOX_API if sandbox else PAYPAL_API
    body = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": product,
                "description": f"Payment for {product} by {email}",
                "amount": {"currency_code": "USD", "value": amount},
            }
        ],
        "application_context": {
            "brand_name": "BizFlow",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "PAY_NOW",
        },
    }
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{base}/v2/checkout/orders",
        data=data,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def get_order(access_token: str, order_id: str, sandbox: bool = False) -> dict:
    """주문 상태 조회"""
    base = SANDBOX_API if sandbox else PAYPAL_API
    req = urllib.request.Request(
        f"{base}/v2/checkout/orders/{order_id}",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def capture_order(access_token: str, order_id: str, sandbox: bool = False) -> dict:
    """결제 캡처 (승인된 주문을 최종 완료)"""
    base = SANDBOX_API if sandbox else PAYPAL_API
    req = urllib.request.Request(
        f"{base}/v2/checkout/orders/{order_id}/capture",
        data=b"",
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def check_completed_orders():
    """실행 스크립트: Worker 주문 원장에서 대기 주문을 조회하고 결제 완료 여부를 체크"""
    client_id = os.environ.get("PAYPAL_CLIENT_ID", "")
    client_secret = os.environ.get("PAYPAL_CLIENT_SECRET", "")
    sandbox = os.environ.get("PAYPAL_SANDBOX", "false").lower() == "true"
    worker_url = os.environ.get("WORKER_URL", "").rstrip("/")

    if not client_id or not client_secret:
        print("PAYPAL_CLIENT_ID / SECRET 미설정. 종료합니다.")
        return

    token = get_access_token(client_id, client_secret, sandbox)

    # Worker 원장에서 대기 주문 조회 (없으면 로컬 pending_orders.json 폴백)
    pending = []
    if worker_url:
        try:
            req = urllib.request.Request(f"{worker_url}/orders", headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
            pending = data.get("pending", [])
            print(f"Worker에서 대기 주문 {len(pending)}건 조회됨")
        except Exception as e:
            print(f"Worker 조회 실패({e}), 로컬 파일로 폴백")
            pending = []

    if not pending:
        pending_file = "pending_orders.json"
        if os.path.exists(pending_file):
            with open(pending_file, "r", encoding="utf-8") as f:
                pending = json.load(f)
        else:
            print("대기 주문 없음. 완료.")
            return

    completed = []
    for order in pending:
        order_id = order.get("order_id") or order.get("orderId")
        if not order_id:
            continue
        try:
            status = get_order(token, order_id, sandbox)["status"]
            print(f"{order_id} → {status}")
            if status == "COMPLETED":
                completed.append(order)
            # Worker 원장에 처리 완료 표시
            if worker_url and status == "COMPLETED":
                mark_order_completed(worker_url, order_id)
        except Exception as e:
            print(f"조회 실패 {order_id}: {e}")

    if completed:
        print(json.dumps({"completed": completed}, ensure_ascii=False, indent=2))
    else:
        print("완료된 주문 없음.")


def mark_order_completed(worker_url: str, order_id: str):
    """Worker 원장에 주문 처리 완료 표시"""
    try:
        data = json.dumps({"orderId": order_id}).encode()
        req = urllib.request.Request(
            f"{worker_url}/orders/complete",
            data=data,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            json.loads(resp.read())
    except Exception as e:
        print(f"Worker 완료 표시 실패 {order_id}: {e}")


if __name__ == "__main__":
    check_completed_orders()
