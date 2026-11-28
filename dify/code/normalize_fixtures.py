import base64
import gzip
import json
from datetime import datetime, timedelta, timezone

BJ = timezone(timedelta(hours=8))

LEAGUE_NAMES = {
    "PL": "英超",
    "PD": "西甲",
    "SA": "意甲",
    "BL1": "德甲",
    "FL1": "法甲",
    "CL": "欧冠",
}

TEAM_TLA = {
    "ARS": "阿森纳", "AVL": "阿斯顿维拉", "BOU": "伯恩茅斯", "BRE": "布伦特福德",
    "BHA": "布莱顿", "CHE": "切尔西", "CRY": "水晶宫", "EVE": "埃弗顿",
    "FUL": "富勒姆", "LEE": "利兹联", "LIV": "利物浦", "MCI": "曼城",
    "MUN": "曼联", "NEW": "纽卡斯尔联", "NFO": "诺丁汉森林", "SUN": "桑德兰",
    "TOT": "热刺", "WHU": "西汉姆联", "WOL": "狼队", "BUR": "伯恩利",
    "ALA": "阿拉维斯", "ATH": "毕尔巴鄂竞技", "ATM": "马德里竞技", "BAR": "巴塞罗那",
    "BET": "皇家贝蒂斯", "CEL": "塞尔塔", "ESP": "西班牙人", "GET": "赫塔菲",
    "GIR": "赫罗纳", "LEG": "莱加内斯", "MLL": "马略卡", "OSA": "奥萨苏纳",
    "RAY": "巴列卡诺", "RMA": "皇家马德里", "RSO": "皇家社会", "SEV": "塞维利亚",
    "VAL": "瓦伦西亚", "VIL": "比利亚雷亚尔", "VLL": "巴拉多利德", "LPA": "拉斯帕尔马斯",
    "ATA": "亚特兰大", "BOL": "博洛尼亚", "CAG": "卡利亚里", "COM": "科莫",
    "EMP": "恩波利", "FIO": "佛罗伦萨", "GEN": "热那亚", "VER": "维罗纳",
    "INT": "国际米兰", "JUV": "尤文图斯", "LAZ": "拉齐奥", "LEC": "莱切",
    "MIL": "AC米兰", "MON": "蒙扎", "NAP": "那不勒斯", "PAR": "帕尔马",
    "ROM": "罗马", "TOR": "都灵", "UDI": "乌迪内斯", "VEN": "威尼斯",
    "B04": "勒沃库森", "BAY": "拜仁慕尼黑", "BOC": "波鸿", "BMG": "门兴格拉德巴赫",
    "BVB": "多特蒙德", "FCA": "奥格斯堡", "FCU": "柏林联合", "M05": "美因茨",
    "HDH": "海登海姆", "KIE": "荷尔斯泰因基尔", "RBL": "莱比锡红牛", "SCF": "弗赖堡",
    "SGE": "法兰克福", "STP": "圣保利", "SVW": "云达不莱梅", "TSG": "霍芬海姆",
    "VFB": "斯图加特", "WOB": "沃尔夫斯堡",
    "AJA": "欧塞尔", "SCO": "昂热", "ASM": "摩纳哥", "ASSE": "圣埃蒂安",
    "FCN": "南特", "HAC": "勒阿弗尔", "LIL": "里尔", "MHSC": "蒙彼利埃",
    "NIC": "尼斯", "OL": "里昂", "OM": "马赛", "PSG": "巴黎圣日耳曼",
    "RCL": "朗斯", "RCSA": "斯特拉斯堡", "SDR": "兰斯", "SB29": "布雷斯特",
    "SRFC": "雷恩", "TFC": "图卢兹",
}

# 2026-27 赛季的 tla 与历史赛季不同（个别 tla 跨联赛重名），按联赛覆盖
TEAM_TLA_BY_LEAGUE = {
    "PL": {
        "HUL": "赫尔城", "COV": "考文垂", "IPS": "伊普斯维奇", "NOT": "诺丁汉森林",
    },
    "PD": {
        "FCB": "巴塞罗那", "ATL": "马德里竞技", "SAN": "桑坦德竞技", "DEP": "拉科鲁尼亚",
        "LEV": "莱万特", "ELC": "埃尔切", "MAL": "马拉加",
    },
    "SA": {
        "FRO": "弗罗西诺内", "USL": "莱切", "SAS": "萨索洛",
    },
    "BL1": {
        "FCB": "拜仁慕尼黑", "KOE": "科隆", "ELV": "埃尔弗斯贝格", "HSV": "汉堡",
        "SCP": "帕德博恩", "S04": "沙尔克04", "UNB": "柏林联合",
    },
    "FL1": {
        "PFC": "巴黎FC", "LYO": "里昂", "MAR": "马赛", "REN": "雷恩", "FCL": "洛里昂",
        "TOU": "图卢兹", "LMF": "勒芒", "ETR": "特鲁瓦", "RC": "斯特拉斯堡", "ANG": "昂热",
        "BRE": "布雷斯特",
    },
    "CL": {
        "BRU": "布鲁日", "SPO": "葡萄牙体育", "LIN": "LASK林茨", "GAL": "加拉塔萨雷",
        "FEN": "费内巴切", "SHD": "顿涅茨克矿工", "VIK": "维京", "ATL": "马德里竞技",
        "PSV": "埃因霍温", "FCP": "波尔图", "AEK": "AEK雅典", "SAB": "萨巴巴库",
        "FEY": "费耶诺德", "SLP": "布拉格斯拉维亚", "SBA": "布拉迪斯拉发", "FK": "博多格林特",
    },
}

# tla 无法区分时的队名关键词（如欧冠 FCB 可能是拜仁或巴萨）
NAME_HINTS = (
    ("bayern", "拜仁慕尼黑"),
    ("barcelona", "巴塞罗那"),
    ("barça", "巴塞罗那"),
    ("atleti", "马德里竞技"),
    ("bodø", "博多格林特"),
    ("bodo", "博多格林特"),
    ("slavia", "布拉格斯拉维亚"),
    ("bratislava", "布拉迪斯拉发"),
    ("shak", "顿涅茨克矿工"),
    ("lask", "LASK林茨"),
    ("aek", "AEK雅典"),
)


def _parse(raw):
    if isinstance(raw, (dict, list)):
        return raw
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return {}


def _team_name(team, league=None):
    team = team or {}
    tla = str(team.get("tla") or "").strip().upper()
    names = TEAM_TLA_BY_LEAGUE.get(league or "", {})
    if tla and tla in names:
        return names[tla]
    if tla and tla in TEAM_TLA:
        return TEAM_TLA[tla]
    hint_text = f"{team.get('shortName') or ''} {team.get('name') or ''}".lower()
    for keyword, value in NAME_HINTS:
        if keyword in hint_text:
            return value
    return team.get("shortName") or team.get("name") or "未知球队"


def _code(team):
    team = team or {}
    tla = str(team.get("tla") or "").strip()
    if tla:
        return tla.upper()
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


def _cache_map(payload):
    body = _parse(payload)
    if isinstance(body, dict) and body.get("content"):
        try:
            raw = base64.b64decode(str(body["content"]))
            # 缓存文件以 gzip+base64 存储，兼容早期的明文 JSON
            if raw[:2] == b"\x1f\x8b":
                raw = gzip.decompress(raw)
            body = json.loads(raw.decode("utf-8"))
        except (TypeError, ValueError, KeyError, OSError):
            return {}
    if not isinstance(body, dict):
        return {}
    return body.get("leagues") or {}


def _h2h_cached(cache, home_id, away_id):
    # 缓存键为「较小编号-较大编号」；统计口径以小编号球队为主视角，
    # 但 last 保存的是真实主客场与真实比分，任何情况下都原样透传。
    if not cache or home_id is None or away_id is None:
        return None
    low, high = sorted([home_id, away_id])
    entry = cache.get(f"{low}-{high}")
    if not isinstance(entry, dict) or not entry.get("played"):
        return None
    last = entry.get("last") or []
    if home_id == low:
        return {
            "played": int(entry.get("played") or 0),
            "homeWins": int(entry.get("homeWins") or 0),
            "draws": int(entry.get("draws") or 0),
            "awayWins": int(entry.get("awayWins") or 0),
            "last": last,
        }
    return {
        "played": int(entry.get("played") or 0),
        "homeWins": int(entry.get("awayWins") or 0),
        "draws": int(entry.get("draws") or 0),
        "awayWins": int(entry.get("homeWins") or 0),
        "last": last,
    }


def _h2h(matches, home_id, away_id):
    empty = {"played": 0, "homeWins": 0, "draws": 0, "awayWins": 0, "last": []}
    if home_id is None or away_id is None:
        return empty
    ordered = sorted(matches, key=lambda item: item.get("utcDate") or "", reverse=True)
    entries = []
    home_wins = draws = away_wins = 0
    for match in ordered:
        home = match.get("homeTeam") or {}
        away = match.get("awayTeam") or {}
        if {home.get("id"), away.get("id")} != {home_id, away_id}:
            continue
        full = ((match.get("score") or {}).get("fullTime") or {})
        home_goals, away_goals = full.get("home"), full.get("away")
        if home_goals is None or away_goals is None:
            continue
        same_side = home.get("id") == home_id
        if home_goals == away_goals:
            draws += 1
        elif (home_goals > away_goals) == same_side:
            home_wins += 1
        else:
            away_wins += 1
        if len(entries) < 5:
            entries.append({
                "date": str(match.get("utcDate") or "")[:10],
                "home": home.get("shortName") or home.get("name") or "",
                "away": away.get("shortName") or away.get("name") or "",
                "score": f"{home_goals}-{away_goals}",
            })
    return {
        "played": home_wins + draws + away_wins,
        "homeWins": home_wins,
        "draws": draws,
        "awayWins": away_wins,
        "last": entries,
    }


def _team_entry(team, row, form, league):
    return {
        "id": team.get("id"),
        "name": _team_name(team, league),
        "nameEn": team.get("name") or "Unknown",
        "crest": team.get("crest") or "",
        "rank": int(row.get("position") or 20),
        "form": form,
        "goalsFor": int(row.get("goalsFor") or 0),
        "goalsAgainst": int(row.get("goalsAgainst") or 0),
    }


def _form(value):
    items = [str(part).strip().upper() for part in str(value or "").split(",")]
    return [part for part in items if part in ("W", "D", "L")][:5]


def _table(league_code, league_name, standings, matchday, forms=None):
    forms = forms or {}
    rows = sorted(
        _table_map(standings).values(),
        key=lambda row: int(row.get("position") or 99),
    )
    table = []
    for row in rows:
        team = row.get("team") or {}
        table.append({
            "rank": int(row.get("position") or 0),
            "name": _team_name(team, league_code),
            "tla": _code(team),
            "crest": team.get("crest") or "",
            "played": int(row.get("playedGames") or 0),
            "won": int(row.get("won") or 0),
            "draw": int(row.get("draw") or 0),
            "lost": int(row.get("lost") or 0),
            "goalsFor": int(row.get("goalsFor") or 0),
            "goalsAgainst": int(row.get("goalsAgainst") or 0),
            "goalDiff": int(row.get("goalDifference") or 0),
            "points": int(row.get("points") or 0),
            "form": _form(row.get("form")) or forms.get(team.get("id")) or [],
        })
    return {
        "code": league_code,
        "name": league_name,
        "matchday": matchday,
        "table": table,
    }


def _pool(matches, league):
    # 精简后的比赛池：只保留跨赛事统计需要的字段
    items = []
    for match in matches or []:
        home = match.get("homeTeam") or {}
        away = match.get("awayTeam") or {}
        full = (match.get("score") or {}).get("fullTime") or {}
        items.append({
            "utc": str(match.get("utcDate") or ""),
            "status": match.get("status"),
            "homeId": home.get("id"),
            "awayId": away.get("id"),
            "homeName": _team_name(home, league),
            "awayName": _team_name(away, league),
            "homeGoals": full.get("home"),
            "awayGoals": full.get("away"),
        })
    items.sort(key=lambda item: item["utc"], reverse=True)
    return items


def main(league_results: list, mode: str, h2h_cache) -> dict:
    current = datetime.now(timezone.utc)
    deadline = current + timedelta(days=30)
    predict_deadline = current + timedelta(days=3)
    cache = _cache_map(h2h_cache)
    pools = {}
    names = {}
    tables = []
    additions = {}
    pending = []

    for item in league_results or []:
        if not isinstance(item, dict):
            continue
        code = item.get("code")
        league_name = LEAGUE_NAMES.get(code, code or "未知联赛")
        fixtures = _parse(item.get("fixtures"))
        standings = _parse(item.get("standings"))
        rank_map = _table_map(standings)
        raw_matches = fixtures.get("matches") or []
        pools[code] = _pool(raw_matches, code)
        for match in raw_matches:
            for team in (match.get("homeTeam") or {}, match.get("awayTeam") or {}):
                team_id = team.get("id")
                if team_id is not None and team_id not in names:
                    names[team_id] = _team_name(team, code)
        matchday = (fixtures.get("season") or {}).get("currentMatchday")
        if not matchday:
            upcoming = [
                m.get("matchday")
                for m in raw_matches
                if m.get("status") in ("SCHEDULED", "TIMED") and m.get("matchday")
            ]
            matchday = min(upcoming) if upcoming else None
        finished = [m for m in raw_matches if m.get("status") == "FINISHED"]
        forms = _forms(finished)
        table = _table(code, league_name, standings, matchday, forms)
        if table["table"]:
            tables.append(table)
        if not raw_matches:
            continue
        pending.append((code, league_name, raw_matches, rank_map, forms, finished))

        league_add = {}
        for done in finished:
            home_team = done.get("homeTeam") or {}
            away_team = done.get("awayTeam") or {}
            if not home_team.get("id") or not away_team.get("id"):
                continue
            full = (done.get("score") or {}).get("fullTime") or {}
            hg, ag = full.get("home"), full.get("away")
            if hg is None or ag is None:
                continue
            low, high = sorted([home_team["id"], away_team["id"]])
            league_add.setdefault(f"{low}-{high}", []).append({
                "date": str(done.get("utcDate") or "")[:10],
                "home": home_team.get("shortName") or home_team.get("name") or "",
                "away": away_team.get("shortName") or away_team.get("name") or "",
                "score": f"{hg}-{ag}",
                "lowIsHome": home_team["id"] == low,
            })
        if league_add:
            additions[code] = league_add

    flat = []
    # 赛程按日期分组：Dify 代码节点单个数组输出不能超过 100 个元素，
    # 30 天 5 个联赛平铺会超限，这里顶层只保留日期（最多 31 个）
    schedule_days = {}
    for code, league_name, raw_matches, rank_map, forms, finished in pending:
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
            kickoff_utc = kickoff.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            match_id = f"{code}-{bj_date}-{_code(home)}-{_code(away)}"

            # 30 天赛程：只保留展示所需字段
            schedule_days.setdefault(bj_date, []).append({
                "id": match_id,
                "league": code,
                "leagueName": league_name,
                "kickoff": kickoff_utc,
                "home": {
                    "name": _team_name(home, code),
                    "crest": home.get("crest") or "",
                    "rank": (rank_map.get(home.get("id")) or {}).get("rank") or 0,
                },
                "away": {
                    "name": _team_name(away, code),
                    "crest": away.get("crest") or "",
                    "rank": (rank_map.get(away.get("id")) or {}).get("rank") or 0,
                },
            })

            # 预测范围只保留未来 3 天，避免无谓的统计、天气与模型调用
            if kickoff > predict_deadline:
                continue

            flat.append({
                "id": match_id,
                "league": code,
                "leagueName": league_name,
                "kickoff": kickoff_utc,
                "status": "scheduled",
                "matchday": match.get("matchday"),
                "venue": match.get("venue") or "",
                "home": _team_entry(home, rank_map.get(home.get("id")) or {}, forms.get(home.get("id"), []), code),
                "away": _team_entry(away, rank_map.get(away.get("id")) or {}, forms.get(away.get("id"), []), code),
                "h2h": _h2h_cached(cache.get(code) or {}, home.get("id"), away.get("id"))
                or _h2h(finished, home.get("id"), away.get("id")),
                "prediction": None,
                "degraded": False,
                "result": None,
            })

    flat.sort(key=lambda item: item["kickoff"])
    schedule = [
        {
            "date": date,
            "matches": sorted(schedule_days[date], key=lambda item: item["kickoff"]),
        }
        for date in sorted(schedule_days)
    ]

    tasks = []
    value = (mode or "both").strip().lower()
    if value != "results" and tables:
        payload = {
            "schemaVersion": 1,
            "updatedAt": datetime.now(BJ).isoformat(timespec="seconds"),
            "leagues": tables,
        }
        text = json.dumps(payload, ensure_ascii=False, indent=2)
        tasks.append({
            "contentBase64": base64.b64encode(text.encode("utf-8")).decode("ascii"),
            "commitMessage": f"data: 五大联赛积分榜（{len(tables)} 个联赛）",
        })
    return {"matches": flat, "schedule": schedule, "syncTasks": tasks, "h2hAdditions": additions, "pools": pools, "names": names}
