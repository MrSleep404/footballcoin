import json
from datetime import datetime, timedelta, timezone

BJ = timezone(timedelta(hours=8))

LEAGUE_NAMES = {
    "PL": "英超",
    "PD": "西甲",
    "SA": "意甲",
    "BL1": "德甲",
    "FL1": "法甲",
}

# football-data.org 的 tla -> 中文名，缺失时回退英文名
TEAM_TLA = {
    # 英超
    "ARS": "阿森纳", "AVL": "阿斯顿维拉", "BOU": "伯恩茅斯", "BRE": "布伦特福德",
    "BHA": "布莱顿", "CHE": "切尔西", "CRY": "水晶宫", "EVE": "埃弗顿",
    "FUL": "富勒姆", "LEE": "利兹联", "LIV": "利物浦", "MCI": "曼城",
    "MUN": "曼联", "NEW": "纽卡斯尔联", "NFO": "诺丁汉森林", "SUN": "桑德兰",
    "TOT": "热刺", "WHU": "西汉姆联", "WOL": "狼队", "BUR": "伯恩利",
    # 西甲
    "ALA": "阿拉维斯", "ATH": "毕尔巴鄂竞技", "ATM": "马德里竞技", "BAR": "巴塞罗那",
    "BET": "皇家贝蒂斯", "CEL": "塞尔塔", "ESP": "西班牙人", "GET": "赫塔菲",
    "GIR": "赫罗纳", "LEG": "莱加内斯", "MLL": "马略卡", "OSA": "奥萨苏纳",
    "RAY": "巴列卡诺", "RMA": "皇家马德里", "RSO": "皇家社会", "SEV": "塞维利亚",
    "VAL": "瓦伦西亚", "VIL": "比利亚雷亚尔", "VLL": "巴拉多利德", "LPA": "拉斯帕尔马斯",
    # 意甲
    "ATA": "亚特兰大", "BOL": "博洛尼亚", "CAG": "卡利亚里", "COM": "科莫",
    "EMP": "恩波利", "FIO": "佛罗伦萨", "GEN": "热那亚", "VER": "维罗纳",
    "INT": "国际米兰", "JUV": "尤文图斯", "LAZ": "拉齐奥", "LEC": "莱切",
    "MIL": "AC米兰", "MON": "蒙扎", "NAP": "那不勒斯", "PAR": "帕尔马",
    "ROM": "罗马", "TOR": "都灵", "UDI": "乌迪内斯", "VEN": "威尼斯",
    # 德甲
    "B04": "勒沃库森", "BAY": "拜仁慕尼黑", "BOC": "波鸿", "BMG": "门兴格拉德巴赫",
    "BVB": "多特蒙德", "FCA": "奥格斯堡", "FCU": "柏林联合", "M05": "美因茨",
    "HDH": "海登海姆", "KIE": "荷尔斯泰因基尔", "RBL": "莱比锡红牛", "SCF": "弗赖堡",
    "SGE": "法兰克福", "STP": "圣保利", "SVW": "云达不莱梅", "TSG": "霍芬海姆",
    "VFB": "斯图加特", "WOB": "沃尔夫斯堡",
    # 法甲
    "AJA": "欧塞尔", "SCO": "昂热", "ASM": "摩纳哥", "ASSE": "圣埃蒂安",
    "FCN": "南特", "HAC": "勒阿弗尔", "LIL": "里尔", "MHSC": "蒙彼利埃",
    "NIC": "尼斯", "OL": "里昂", "OM": "马赛", "PSG": "巴黎圣日耳曼",
    "RCL": "朗斯", "RCSA": "斯特拉斯堡", "SDR": "兰斯", "SB29": "布雷斯特",
    "SRFC": "雷恩", "TFC": "图卢兹",
}


def _parse(raw):
    if isinstance(raw, (dict, list)):
        return raw
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return {}


def _now(now_iso):
    if not now_iso:
        return datetime.now(timezone.utc)
    try:
        value = datetime.fromisoformat(str(now_iso).replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def _team_name(team):
    team = team or {}
    tla = team.get("tla")
    if tla and tla in TEAM_TLA:
        return TEAM_TLA[tla]
    return team.get("shortName") or team.get("name") or "未知球队"


def _code(team):
    team = team or {}
    tla = team.get("tla")
    if tla:
        return str(tla).upper()
    name = team.get("shortName") or team.get("name") or "XXX"
    letters = "".join(ch for ch in name if ch.isalnum()).upper()
    return letters[:3] or "XXX"


def _table_map(standings):
    result = {}
    for block in (standings or {}).get("standings") or []:
        if block.get("type") != "TOTAL":
            continue
        for row in block.get("table") or []:
            team_id = (row.get("team") or {}).get("id")
            if team_id is not None:
                result[team_id] = row
    return result


def _forms(matches):
    forms = {}
    ordered = sorted(matches, key=lambda item: item.get("utcDate") or "", reverse=True)
    for match in ordered:
        full = ((match.get("score") or {}).get("fullTime") or {})
        home_goals, away_goals = full.get("home"), full.get("away")
        if home_goals is None or away_goals is None:
            continue
        home_id = (match.get("homeTeam") or {}).get("id")
        away_id = (match.get("awayTeam") or {}).get("id")
        if home_id is not None:
            forms.setdefault(home_id, []).append(
                "W" if home_goals > away_goals else "D" if home_goals == away_goals else "L"
            )
        if away_id is not None:
            forms.setdefault(away_id, []).append(
                "W" if away_goals > home_goals else "D" if away_goals == home_goals else "L"
            )
    return {key: value[:5] for key, value in forms.items()}


def _team_entry(team, row, form):
    return {
        "name": _team_name(team),
        "nameEn": team.get("name") or "Unknown",
        "rank": int(row.get("position") or 20),
        "form": form,
        "goalsFor": int(row.get("goalsFor") or 0),
        "goalsAgainst": int(row.get("goalsAgainst") or 0),
    }


def main(league_results: list, now_iso: str = "") -> dict:
    current = _now(now_iso)
    deadline = current + timedelta(days=7)
    days = {}
    errors = []

    for item in league_results or []:
        if not isinstance(item, dict):
            continue
        code = item.get("code")
        league_name = LEAGUE_NAMES.get(code, code or "未知联赛")
        fixtures = _parse(item.get("fixtures"))
        standings = _parse(item.get("standings"))
        raw_matches = fixtures.get("matches") or []
        if not raw_matches:
            errors.append(f"{code}: 未获取到赛程")
            continue

        table = _table_map(standings)
        finished = [m for m in raw_matches if m.get("status") == "FINISHED"]
        forms = _forms(finished)

        for match in raw_matches:
            if match.get("status") not in ("SCHEDULED", "TIMED"):
                continue
            try:
                kickoff = datetime.fromisoformat(str(match.get("utcDate")).replace("Z", "+00:00"))
            except (TypeError, ValueError):
                continue
            if kickoff.tzinfo is None:
                kickoff = kickoff.replace(tzinfo=timezone.utc)
            if kickoff < current or kickoff > deadline:
                continue

            bj_date = kickoff.astimezone(BJ).strftime("%Y-%m-%d")
            home = match.get("homeTeam") or {}
            away = match.get("awayTeam") or {}

            entry = {
                "id": f"{code}-{bj_date}-{_code(home)}-{_code(away)}",
                "league": code,
                "leagueName": league_name,
                "kickoff": kickoff.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "status": "scheduled",
                "matchday": match.get("matchday"),
                "venue": match.get("venue") or "",
                "home": _team_entry(home, table.get(home.get("id")) or {}, forms.get(home.get("id"), [])),
                "away": _team_entry(away, table.get(away.get("id")) or {}, forms.get(away.get("id"), [])),
                "prediction": None,
                "degraded": False,
                "result": None,
            }
            days.setdefault(bj_date, []).append(entry)

    ordered_days = []
    for date in sorted(days.keys()):
        ordered_days.append(
            {"date": date, "matches": sorted(days[date], key=lambda m: m["kickoff"])}
        )

    return {
        "days": ordered_days,
        "matchTotal": sum(len(day["matches"]) for day in ordered_days),
        "leagueErrors": errors,
    }
