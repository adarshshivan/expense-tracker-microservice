import json
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
        expense_id = event["pathParameters"]["expense_id"]
        body = json.loads(event.get("body", "{}"))

        tbl = table()

        update_expr = "SET amount = :a, category = :c, notes = :n, #d = :d"
        expr_values = {
            ":a": Decimal(str(body.get("amount", 0))),
            ":c": body.get("category", "uncategorized"),
            ":n": body.get("notes", ""),
            ":d": body.get("date")
        }
        expr_names = {
            "#d": "date"
        }

        tbl.update_item(
            Key={"expense_id": expense_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )

        return response(200, {"message": "Expense updated", "expense_id": expense_id})

    except Exception as e:
        return response(500, {"error": str(e)})
