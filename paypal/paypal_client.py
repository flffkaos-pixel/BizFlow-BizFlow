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
    """실행 스크립트: 고객 폴더를 읽고 완료 여부 체크"""
    client_id = os.environ.get("PAYPAL_CLIENT_ID", "")
    client_secret = os.environ.get("PAYPAL_CLIENT_SECRET", "")
    sandbox = os.environ.get("PAYPAL_SANDBOX", "false").lower() == "true"

    if not client_id or not client_secret:
        print("PAYPAL_CLIENT_ID / SECRET 미설정. 종료합니다.")
        return

    token = get_access_token(client_id, client_secret, sandbox)

    # 대기중인 주문 확인
    pending_file = "pending_orders.json"
    if not os.path.exists(pending_file):
        print("pending_orders.json 없음. 완료.")
        return

    with open(pending_file, "r", encoding="utf-8") as f:
        pending = json.load(f)

    completed = []
    for order in pending:
        try:
            status = get_order(token, order["order_id"], sandbox)["status"]
            print(f"{order['order_id']} → {status}")
            if status == "COMPLETED":
                completed.append(order)
        except Exception as e:
            print(f"조회 실패 {order['order_id']}: {e}")

    if completed:
        print(json.dumps({"completed": completed}, ensure_ascii=False, indent=2))
    else:
        print("완료된 주문 없음.")


if __name__ == "__main__":
    check_completed_orders()
