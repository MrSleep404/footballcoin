import fs from "node:fs";
import path from "node:path";

// 用法：node scripts/formula-review.mjs [--k=8] [--ha=1.07]
const args = Object.fromEntries(
  process.argv.slice(2).map((item) => {
    const [key, value] = item.replace(/^--/, "").split("=");
    return [key, value];
  }),
);
const K = Number(args.k ?? 8);
const HA = Number(args.ha ?? 1.07);
const LAMBDA_MIN = 0.25;
const LAMBDA_MAX = 3;

const MATCH_DIR = "data/matches";
const RESULT_DIR = "data/results";
const OUT = "docs/formula-review.csv";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pois = (lambda, k) => (Math.exp(-lambda) * lambda ** k) / [1, 1, 2, 6, 24, 120, 720, 5040, 40320][k];

// 联赛均值
const standings = JSON.parse(fs.readFileSync("data/standings.json", "utf8"));
const leagueAvg = new Map();
for (const code of Object.keys(standings.leagues)) {
  const lg = standings.leagues[code];
  let gf = 0;
  let played = 0;
  for (const row of lg.table) {
    gf += row.goalsFor;
    played += row.played;
  }
  leagueAvg.set(code, played ? gf / played : 1.35);
}

// 赛果
const resultMap = new Map();
if (fs.existsSync(RESULT_DIR)) {
  for (const f of fs.readdirSync(RESULT_DIR).filter((x) => x.endsWith(".json"))) {
    const j = JSON.parse(fs.readFileSync(path.join(RESULT_DIR, f), "utf8"));
    for (const r of j.results || []) resultMap.set(r.id, r);
  }
}

// 同一比赛保留最新生成版本
const byId = new Map();
for (const f of fs.readdirSync(MATCH_DIR).filter((x) => x.endsWith(".json"))) {
  const j = JSON.parse(fs.readFileSync(path.join(MATCH_DIR, f), "utf8"));
  for (const m of j.matches || []) {
    const prev = byId.get(m.id);
    if (!prev || j.generatedAt > prev.generatedAt) byId.set(m.id, { match: m, generatedAt: j.generatedAt });
  }
}

function parseStats(text) {
  const out = { recent: [] };
  if (!text) return out;
  let m = text.match(/样本 (\d+) 场）：场均进 ([\d.]+) \/ 失 ([\d.]+)/);
  if (m) out.total = { played: +m[1], gf: +m[2], ga: +m[3] };
  m = text.match(/主场 (\d+) 场：场均进 ([\d.]+) \/ 失 ([\d.]+)/);
  if (m) out.home = { played: +m[1], gf: +m[2], ga: +m[3] };
  m = text.match(/客场 (\d+) 场：场均进 ([\d.]+) \/ 失 ([\d.]+)/);
  if (m) out.away = { played: +m[1], gf: +m[2], ga: +m[3] };
  for (const r of text.matchAll(/(\d{4}-\d{2}-\d{2}) (主|客) (\d+)-(\d+) vs .+? ([WDL])/g)) {
    out.recent.push({ gf: +r[3], ga: +r[4] });
  }
  return out;
}

const recentNet = (s) => (s.recent.length ? s.recent.reduce((a, r) => a + r.gf - r.ga, 0) / s.recent.length : null);

function injuryFactor(injuries, side) {
  const list = (injuries && injuries[side]) || [];
  const out = list.filter((p) => (p.type || "").toLowerCase().includes("missing")).length;
  if (out === 0) return 1;
  if (out <= 2) return 0.97;
  if (out <= 4) return 0.94;
  return 0.9;
}

function weatherFactor(w) {
  if (!w) return 1;
  let f = 1;
  if ((w.precip ?? 0) > 60) f *= 0.95;
  if ((w.wind ?? 0) > 30) f *= 0.97;
  if ((w.temp ?? 10) < 0) f *= 0.98;
  return f;
}

function restFactor(text) {
  const m = String(text || "").match(/([\d.]+) 天(?:前|后)/);
  if (!m) return 1;
  const days = Math.abs(parseFloat(m[1]));
  if (days <= 2) return 0.92;
  if (days <= 3) return 0.95;
  return 1;
}

function predict(m) {
  const avg = leagueAvg.get(m.league) || 1.35;
  const hs = parseStats(m.stats?.statsHomeOwn);
  const as = parseStats(m.stats?.statsAwayOwn);
  if (!hs.total || !as.total) return null;

  const useHome = hs.home && hs.home.played >= 3;
  const useAway = as.away && as.away.played >= 3;
  const shrink = (v, played) => (v * played + K * avg) / (played + K);

  const hAtt = shrink(useHome ? hs.home.gf : hs.total.gf, useHome ? hs.home.played : hs.total.played);
  const hDef = shrink(useHome ? hs.home.ga : hs.total.ga, useHome ? hs.home.played : hs.total.played);
  const aAtt = shrink(useAway ? as.away.gf : as.total.gf, useAway ? as.away.played : as.total.played);
  const aDef = shrink(useAway ? as.away.ga : as.total.ga, useAway ? as.away.played : as.total.played);

  const rnH = recentNet(hs);
  const rnA = recentNet(as);
  const netH = (hs.total.gf - hs.total.ga) / Math.max(hs.total.played, 1);
  const netA = (as.total.gf - as.total.ga) / Math.max(as.total.played, 1);
  const fFormH = rnH == null ? 1 : clamp(1 + (rnH - netH) * 0.03, 0.88, 1.12);
  const fFormA = rnA == null ? 1 : clamp(1 + (rnA - netA) * 0.03, 0.88, 1.12);

  const diff = (m.away.rank || 10) - (m.home.rank || 10);
  const fRankH = 1 + clamp(diff * 0.004, -0.1, 0.1);
  const fRankA = 1 - clamp(diff * 0.004, -0.1, 0.1);

  const played = m.h2h?.played || 0;
  const fH2H = played ? 1 + clamp(((m.h2h.homeWins || 0) / played - 0.5) * 0.1, -0.05, 0.05) : 1;

  const lambdaH = clamp(
    ((hAtt * aDef) / avg) * HA * fFormH * fRankH * fH2H * injuryFactor(m.injuries, "home") * weatherFactor(m.weather) * restFactor(m.stats?.statsHomeLoad),
    LAMBDA_MIN,
    LAMBDA_MAX,
  );
  const lambdaA = clamp(
    ((aAtt * hDef) / avg / HA) * fFormA * fRankA * (2 - fH2H) * injuryFactor(m.injuries, "away") * weatherFactor(m.weather) * restFactor(m.stats?.statsAwayLoad),
    LAMBDA_MIN,
    LAMBDA_MAX,
  );

  let pw = 0;
  let pd = 0;
  let pl = 0;
  for (let i = 0; i <= 8; i += 1) {
    for (let j = 0; j <= 8; j += 1) {
      const p = pois(lambdaH, i) * pois(lambdaA, j);
      if (i > j) pw += p;
      else if (i === j) pd += p;
      else pl += p;
    }
  }
  const sum = pw + pd + pl;
  return {
    home: Math.round((pw / sum) * 100),
    draw: Math.round((pd / sum) * 100),
    away: Math.round((pl / sum) * 100),
    lambdaH,
    lambdaA,
  };
}

const argmax = (p) => (p.home >= p.draw && p.home >= p.away ? "home" : p.away >= p.draw ? "away" : "draw");
const brier = (p, actual) => ["home", "draw", "away"].reduce((s, k) => s + (p[k] / 100 - (actual === k ? 1 : 0)) ** 2, 0);
const outcomeOf = (r) => (r.homeGoals > r.awayGoals ? "home" : r.homeGoals < r.awayGoals ? "away" : "draw");

const rows = [];
for (const { match: m, generatedAt } of byId.values()) {
  if (!m.stats || !m.prediction?.prob) continue;
  const f = predict(m);
  if (!f) continue;
  const result = resultMap.get(m.id);
  const actual = result ? outcomeOf(result) : "";
  rows.push({
    date: m.kickoff.slice(0, 10),
    league: m.league,
    home: m.home.name,
    away: m.away.name,
    formula: `${f.home}/${f.draw}/${f.away}`,
    model: `${m.prediction.prob.home}/${m.prediction.prob.draw}/${m.prediction.prob.away}`,
    market: m.market?.prob ? `${m.market.prob.home}/${m.market.prob.draw}/${m.market.prob.away}` : "",
    formulaPick: argmax(f),
    modelPick: argmax(m.prediction.prob),
    marketPick: m.market?.prob ? argmax(m.market.prob) : "",
    actualScore: result ? `${result.homeGoals}-${result.awayGoals}` : "",
    actual,
    formulaHit: result ? (argmax(f) === actual ? 1 : 0) : "",
    modelHit: result ? (argmax(m.prediction.prob) === actual ? 1 : 0) : "",
    marketHit: result && m.market?.prob ? (argmax(m.market.prob) === actual ? 1 : 0) : "",
    formulaBrier: result ? brier(f, actual).toFixed(4) : "",
    modelBrier: result ? brier(m.prediction.prob, actual).toFixed(4) : "",
    marketBrier: result && m.market?.prob ? brier(m.market.prob, actual).toFixed(4) : "",
    lambda: `${f.lambdaH.toFixed(2)}/${f.lambdaA.toFixed(2)}`,
    generatedAt,
  });
}

rows.sort((a, b) => a.date.localeCompare(b.date) || a.league.localeCompare(b.league));

const header = [
  "date", "league", "home", "away",
  "formula_home_draw_away", "model_home_draw_away", "market_home_draw_away",
  "formula_pick", "model_pick", "market_pick",
  "actual_score", "actual_outcome",
  "formula_hit", "model_hit", "market_hit",
  "formula_brier", "model_brier", "market_brier",
  "lambda_home_away", "generated_at",
];
const lines = [header.join(",")];
for (const r of rows) {
  lines.push([
    r.date, r.league, r.home, r.away,
    r.formula, r.model, r.market,
    r.formulaPick, r.modelPick, r.marketPick,
    r.actualScore, r.actual,
    r.formulaHit, r.modelHit, r.marketHit,
    r.formulaBrier, r.modelBrier, r.marketBrier,
    r.lambda, r.generatedAt,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `\ufeff${lines.join("\n")}`, "utf8");

const finished = rows.filter((r) => r.actual);
console.log(`已写入 ${OUT}`);
console.log(`总场次 ${rows.length}，有赛果 ${finished.length}，参数 k=${K} ha=${HA}`);

if (finished.length) {
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const hit = (key) => ((finished.filter((r) => r[key] === 1).length / finished.length) * 100).toFixed(1);
  const b = (key) => avg(finished.filter((r) => r[key] !== "").map((r) => Number(r[key]))).toFixed(4);
  console.log(`命中率 公式 ${hit("formulaHit")}% 模型 ${hit("modelHit")}% 市场 ${hit("marketHit")}%`);
  console.log(`Brier 公式 ${b("formulaBrier")} 模型 ${b("modelBrier")} 市场 ${b("marketBrier")}`);

  const buckets = [[50, 60], [60, 70], [70, 80], [80, 101]];
  for (const [lo, hi] of buckets) {
    const group = finished.filter((r) => {
      const p = Math.max(...r.formula.split("/").map(Number));
      return p >= lo && p < hi;
    });
    if (!group.length) continue;
    const rate = (group.filter((r) => r.formulaHit === 1).length / group.length) * 100;
    console.log(`公式最高概率 ${lo}-${hi - 1}%：${group.length} 场，实际命中 ${rate.toFixed(1)}%`);
  }
}
