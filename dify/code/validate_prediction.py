import json

KEYS = ("home", "draw", "away")


def _clamp(value, lo, hi, default):
    try:
        return max(lo, min(hi, int(round(float(value)))))
    except (TypeError, ValueError):
        return default


def _parse_match(match):
    if isinstance(match, dict):
        return dict(match)
    try:
        return json.loads(match)
    except (TypeError, ValueError):
        return {}


def _normalize_prob(raw):
    if not isinstance(raw, dict):
        return None
    if not all(isinstance(raw.get(key), (int, float)) for key in KEYS):
        return None
    total = sum(float(raw[key]) for key in KEYS)
    if total <= 0:
        return None
    prob = {key: _clamp(float(raw[key]) / total * 100, 1, 98, 1) for key in KEYS}
    diff = 100 - sum(prob.values())
    top = max(prob, key=prob.get)
    prob[top] += diff
    return prob


def _fallback(match):
    home_rank = _clamp((match.get("home") or {}).get("rank"), 1, 40, 20)
    away_rank = _clamp((match.get("away") or {}).get("rank"), 1, 40, 20)
    home = max(15, min(70, int(round(45 + (away_rank - home_rank) * 1.2))))
    draw = 27
    away = max(1, 100 - home - draw)
    prob = {"home": home, "draw": draw, "away": away}
    return {
        "prob": prob,
        "score": {"home": 1, "away": 1},
        "confidence": 30,
        "pick": max(prob, key=prob.get),
        "reasons": [
            "模型未返回有效结果，使用排名先验估计",
            "该结果仅基于积分榜排名差，参考价值有限",
        ],
        "factors": ["排名差"],
        "risk": "该场为兜底结果，仅供参考",
    }


def main(raw_text: str, match) -> dict:
    item = _parse_match(match)
    merged = dict(item)

    try:
        data = json.loads(raw_text)
    except (TypeError, ValueError):
        merged["prediction"] = _fallback(item)
        merged["degraded"] = True
        return {"match": merged, "degraded": True, "error": "invalid_json"}

    prob = _normalize_prob(data.get("prob"))
    if prob is None:
        merged["prediction"] = _fallback(item)
        merged["degraded"] = True
        return {"match": merged, "degraded": True, "error": "invalid_prob"}

    score = data.get("score") or {}
    reasons = [str(text)[:40] for text in (data.get("reasons") or []) if str(text).strip()][:4]
    if len(reasons) < 2:
        reasons.append("综合双方近期状态与排名给出判断")
    factors = [str(text)[:12] for text in (data.get("factors") or []) if str(text).strip()][:5]

    merged["prediction"] = {
        "prob": prob,
        "score": {
            "home": _clamp(score.get("home"), 0, 9, 1),
            "away": _clamp(score.get("away"), 0, 9, 1),
        },
        "confidence": _clamp(data.get("confidence"), 0, 100, 50),
        "pick": max(prob, key=prob.get),
        "reasons": reasons,
        "factors": factors,
        "risk": str(data.get("risk") or "")[:60],
    }
    merged["degraded"] = False
    return {"match": merged, "degraded": False, "error": ""}
