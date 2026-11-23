import json


def main(body, date: str) -> dict:
    if isinstance(body, list):
        data = body
    else:
        try:
            data = json.loads(body or "[]")
        except (TypeError, ValueError):
            data = []
    if not isinstance(data, list):
        data = []

    target = f"{date}.json"
    for item in data:
        if isinstance(item, dict) and item.get("name") == target:
            return {"sha": str(item.get("sha") or "")}
    return {"sha": ""}
