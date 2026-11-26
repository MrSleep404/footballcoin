import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MATCH_DIR = join(ROOT, "data", "matches");
const RESULT_DIR = join(ROOT, "data", "results");
const OUT = process.argv[2] ? join(ROOT, process.argv[2]) : join(ROOT, "data", "review.csv");

// 伤病只覆盖开赛前 3 天内的窗口，超出窗口的快照本来就没有名单
const INJURY_WINDOW_DAYS = 3;

const HEADER = [
  "日期",
  "联赛",
  "主队",
  "客队",
  "模型主",
  "模型平",
  "模型客",
  "市场主",
  "市场平",
  "市场客",
  "分歧(pp)",
  "信心度",
  "模型倾向",
  "实际结果",
  "主队进球",
  "客队进球",
  "胜平负命中",
  "比分命中",
  "比分偏差",
  "主队伤员",
  "客队伤员",
  "伤员名单",
  "气温",
  "降水概率",
  "风速",
  "伤病窗口",
  "生成时间",
  "提示词版本",
];

function readJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      try {
        return JSON.parse(readFileSync(join(dir, name), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function round1(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : "";
}

function injuryState(match, generatedAt, version) {
  if (match.injuries) return "有名单";
  const genDay = String(generatedAt || "").slice(0, 10);
  const matchDay = String(match.kickoff || "").slice(0, 10);
  if (!genDay || !matchDay) return "未知";
  const diff = (Date.parse(matchDay) - Date.parse(genDay)) / 86400000;
  if (diff > INJURY_WINDOW_DAYS) return "窗口外";
  // 无版本号或 legacy 前缀的都是伤病字段上线前的旧批次，不能用「窗口内无名单」解释
  const legacy = !version || String(version).startsWith("legacy");
  return legacy ? "旧批次无字段" : "窗口内无名单";
}

function injuryNames(items) {
  return (items || [])
    .map((item) => `${item.player || "?"}(${item.reason || item.type || "伤缺"})`)
    .join("；");
}

const results = new Map();
for (const file of readJsonFiles(RESULT_DIR)) {
  for (const item of file.results || []) {
    if (item && item.id) results.set(item.id, item);
  }
}

const rows = [];
let outcomeHits = 0;
let scoreHits = 0;

for (const file of readJsonFiles(MATCH_DIR)) {
  const generatedAt = String(file.generatedAt || "");
  const promptVersion = String(file.promptVersion || "");
  for (const match of file.matches || []) {
    const result = results.get(match.id);
    if (!result) continue;

    const prob = match.prediction?.prob || {};
    const market = match.market?.prob || {};
    const score = match.prediction?.score || {};
    const weather = match.weather || {};
    const injuries = match.injuries || null;

    const gaps = ["home", "draw", "away"]
      .filter((key) => Number.isFinite(prob[key]) && Number.isFinite(market[key]))
      .map((key) => Math.abs(prob[key] - market[key]));
    const gap = gaps.length ? Math.max(...gaps) : "";

    const outcomeHit = match.prediction?.pick === result.outcome;
    const scoreHit = score.home === result.homeGoals && score.away === result.awayGoals;
    const scoreGap =
      Number.isFinite(score.home) && Number.isFinite(score.away)
        ? Math.abs(score.home - result.homeGoals) + Math.abs(score.away - result.awayGoals)
        : "";

    if (outcomeHit) outcomeHits += 1;
    if (scoreHit) scoreHits += 1;

    rows.push([
      file.date || "",
      match.leagueName || match.league || "",
      match.home?.name || "",
      match.away?.name || "",
      prob.home ?? "",
      prob.draw ?? "",
      prob.away ?? "",
      market.home ?? "",
      market.draw ?? "",
      market.away ?? "",
      round1(gap),
      match.prediction?.confidence ?? "",
      match.prediction?.pick ?? "",
      result.outcome || "",
      result.homeGoals ?? "",
      result.awayGoals ?? "",
      outcomeHit ? "是" : "否",
      scoreHit ? "是" : "否",
      scoreGap,
      injuries ? (injuries.home || []).length : "",
      injuries ? (injuries.away || []).length : "",
      injuries ? `主：${injuryNames(injuries.home) || "无"}；客：${injuryNames(injuries.away) || "无"}` : "",
      weather.temp ?? "",
      weather.precip ?? "",
      weather.wind ?? "",
      injuryState(match, generatedAt, promptVersion),
      generatedAt,
      promptVersion,
    ]);
  }
}

const lines = [HEADER, ...rows].map((cols) => cols.map(csvCell).join(","));
writeFileSync(OUT, "\uFEFF" + lines.join("\r\n") + "\r\n", "utf8");

const total = rows.length;
const rate = (value) => (total ? `${Math.round((value / total) * 1000) / 10}%` : "-");
console.log(`✓ 已导出 ${total} 场（仅含有赛果的比赛）→ ${OUT}`);
console.log(`  胜平负命中 ${outcomeHits} 场（${rate(outcomeHits)}），比分命中 ${scoreHits} 场（${rate(scoreHits)}）`);
const windows = rows.reduce((acc, row) => {
  acc[row[25]] = (acc[row[25]] || 0) + 1;
  return acc;
}, {});
console.log(`  伤病窗口分布：${Object.entries(windows).map(([key, value]) => `${key} ${value}`).join(" / ")}`);
