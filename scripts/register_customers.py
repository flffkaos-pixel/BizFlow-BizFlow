"""PayPal 완료 주문을 읽어 고객 정보를 customers/ 폴더에 자동 등록"""
import json
import os
import sys
import datetime

def main(result_file: str):
    if not os.path.exists(result_file):
        print(f"{result_file} 없음. 종료.")
        return

    with open(result_file, "r", encoding="utf-8") as f:
        content = f.read()

    # 스크립트 출력에서 JSON 추출
    try:
        data = json.loads(content)
        completed = data.get("completed", [])
    except json.JSONDecodeError:
        # "완료된 주문 없음" 같은 텍스트 출력이면 종료
        if "완료된 주문 없음" in content or "없음" in content:
            print("완료된 주문 없음. 종료.")
            return
        print("JSON 파싱 실패. 출력 내용:")
        print(content)
        return

    os.makedirs("customers", exist_ok=True)

    for order in completed:
        email = order.get("email") or f"customer_{order['order_id']}@email.com"
        product = order.get("product") or "bizflow"
        order_id = order["order_id"]

        # 이미 등록된 고객인지 확인
        cust_path = f"customers/{email}.json"
        if os.path.exists(cust_path):
            print(f"이미 등록됨: {email}")
            continue

        customer = {
            "email": email,
            "product": product,
            "order_id": order_id,
            "status": "active",
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "next_billing": "monthly",
        }
        with open(cust_path, "w", encoding="utf-8") as f:
            json.dump(customer, f, ensure_ascii=False, indent=2)
        print(f"신규 고객 등록: {email} ({product})")

    # 처리된 주문은 pending에서 제거
    pending_file = "pending_orders.json"
    if os.path.exists(pending_file):
        with open(pending_file, "r", encoding="utf-8") as f:
            pending = json.load(f)
        processed_ids = {o["order_id"] for o in completed}
        remaining = [o for o in pending if o["order_id"] not in processed_ids]
        with open(pending_file, "w", encoding="utf-8") as f:
            json.dump(remaining, f, ensure_ascii=False, indent=2)
        print(f"pending_orders 정리: {len(pending)} → {len(remaining)}")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "result.json")
