import json
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

        tbl = table()
        tbl.delete_item(Key={"expense_id": expense_id})

        return response(200, {"message": "Expense deleted", "expense_id": expense_id})

    except Exception as e:
        return response(500, {"error": str(e)})
