import os
import boto3
from decimal import Decimal
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer

dynamodb = boto3.resource("dynamodb")
client = boto3.client("dynamodb")
serializer = TypeSerializer()
deserializer = TypeDeserializer()
TABLE_NAME = os.environ.get("EXPENSES_TABLE")

def table():
    return dynamodb.Table(TABLE_NAME)

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def serialize_item(item: dict):
    return {k: serializer.serialize(v) for k, v in item.items()}

def deserialize_item(ddb_item: dict):
    return {k: deserializer.deserialize(v) for k, v in ddb_item.items()}
