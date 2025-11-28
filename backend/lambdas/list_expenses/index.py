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
        tbl = table()
        resp = tbl.scan()
        items = resp.get("Items", [])

        # Convert Decimal to float
        for it in items:
            for k, v in it.items():
                if isinstance(v, Decimal):
                    it[k] = float(v)

        return response(200, items)

    except Exception as e:
        return response(500, {"error": str(e)})
