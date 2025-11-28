#!/usr/bin/env python3
import os
import json
import boto3
from decimal import Decimal

TABLE_NAME = os.environ.get("EXPENSES_TABLE", "ExpensesTable")
OUTPUT_FILE = os.environ.get("OUTPUT_FILE", "../../frontend/mock_data/expenses.json")

dynamodb = boto3.resource("dynamodb")
tbl = dynamodb.Table(TABLE_NAME)

def decimal_to_native(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def export_all():
    items = []
    resp = tbl.scan()
    items.extend(resp.get("Items", []))
    while 'LastEvaluatedKey' in resp:
        resp = tbl.scan(ExclusiveStartKey=resp['LastEvaluatedKey'])
        items.extend(resp.get("Items", []))
    # Convert Decimal values
    def convert(obj):
        if isinstance(obj, dict):
            return {k: convert(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [convert(x) for x in obj]
        if isinstance(obj, Decimal):
            return float(obj)
        return obj
    data = {"items": [convert(i) for i in items]}
    out_path = os.path.join(os.path.dirname(__file__), OUTPUT_FILE)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Exported {len(items)} items to {out_path}")

if __name__ == "__main__":
    export_all()
