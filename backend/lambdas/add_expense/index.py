import json
import uuid
import datetime
from decimal import Decimal
from dynamo_helpers import table

def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*"
        },
        "body": json.dumps(body)
    }

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))

        expense_id = str(uuid.uuid4())
        now = datetime.datetime.utcnow().isoformat()

        item = {
            "expense_id": expense_id,
            "amount": Decimal(str(body.get("amount", 0))),
            "category": body.get("category", "uncategorized"),
            "notes": body.get("notes", ""),
            "date": body.get("date", now),
            "created_at": now,
            "updated_at": now
        }

        tbl = table()
        tbl.put_item(Item=item)

        # Convert Decimal to float for frontend
        clean_item = item.copy()
        clean_item["amount"] = float(clean_item["amount"])

        return response(201, {
            "message": "Expense added",
            "item": clean_item
        })

    except Exception as e:
        return response(500, {"error": str(e)})
