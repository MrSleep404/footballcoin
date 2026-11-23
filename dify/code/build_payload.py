import base64
import json
from datetime import datetime, timedelta, timezone

BJ = timezone(timedelta(hours=8))


def main(date: str, matches: list, model: str, degraded_count: int) -> dict:
    payload = {
        "schemaVersion": 1,
        "date": date,
        "generatedAt": datetime.now(BJ).isoformat(timespec="seconds"),
        "source": "football-data.org",
        "model": model,
        "matchCount": len(matches),
        "degradedCount": degraded_count,
        "matches": matches,
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    byte_size = len(text.encode("utf-8"))
    return {
        "content": text,
        "file": {
            "date": date,
            "content": text,
            "byteSize": byte_size,
        },
        "contentBase64": base64.b64encode(text.encode("utf-8")).decode("ascii"),
        "commitMessage": f"data: {date} 预测（{len(matches)} 场）",
        "byteSize": byte_size,
    }
