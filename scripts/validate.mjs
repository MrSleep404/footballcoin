import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DATA = join(ROOT, "data");
const LEAGUES = new Set(["PL", "PD", "SA", "BL1", "FL1", "CL"]);
const OUTCOMES = new Set(["home", "draw", "away"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
let checkedFiles = 0;
let checkedMatches = 0;

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isInt(value, lo, hi) {
  return Number.isInteger(value) && value >= lo && value <= hi;
}

function checkTeam(file, label, team) {
  if (!isObject(team)) {
    fail(file, `${label} 缺失`);
    return;
  }
  if (typeof team.name !== "string" || !team.name.trim()) fail(file, `${label}.name 为空`);
  if (typeof team.nameEn !== "string" || !team.nameEn.trim()) fail(file, `${label}.nameEn 为空`);
  if (!Number.isInteger(team.rank) || team.rank < 1) fail(file, `${label}.rank 非法`);
  if (!Array.isArray(team.form) || team.form.length > 5) {
    fail(file, `${label}.form 必须是长度不超过 5 的数组`);
  } else if (team.form.some((item) => !["W", "D", "L"].includes(item))) {
    fail(file, `${label}.form 只能包含 W/D/L`);
  }
  for (const key of ["goalsFor", "goalsAgainst"]) {
    if (team[key] !== undefined && (!Number.isInteger(team[key]) || team[key] < 0)) {
      fail(file, `${label}.${key} 非法`);
    }
  }
}

function checkPrediction(file, id, prediction) {
  if (!isObject(prediction)) {
    fail(file, `${id} prediction 缺失`);
    return;
  }
  const prob = prediction.prob;
  if (!isObject(prob)) {
    fail(file, `${id} prob 缺失`);
  } else {
    for (const key of OUTCOMES) {
      if (!isInt(prob[key], 1, 98)) fail(file, `${id} prob.${key} 必须是 1-98 的整数`);
    }
    const sum = prob.home + prob.draw + prob.away;
    if (sum !== 100) fail(file, `${id} 概率之和为 ${sum}，应为 100`);
    const max = Math.max(prob.home, prob.draw, prob.away);
    if (!OUTCOMES.has(prediction.pick)) {
      fail(file, `${id} pick 非法`);
    } else if (prob[prediction.pick] !== max) {
      fail(file, `${id} pick 与最大概率项不一致`);
    }
  }
  const score = prediction.score;
  if (!isObject(score) || !isInt(score.home, 0, 9) || !isInt(score.away, 0, 9)) {
    fail(file, `${id} score 必须是 0-9 的整数`);
  }
  if (!isInt(prediction.confidence, 0, 100)) fail(file, `${id} confidence 必须是 0-100 的整数`);
  const reasons = prediction.reasons;
  if (!Array.isArray(reasons) || reasons.length < 2 || reasons.length > 4) {
    fail(file, `${id} reasons 需要 2-4 条`);
  } else {
    reasons.forEach((reason, index) => {
      if (typeof reason !== "string" || !reason.trim()) fail(file, `${id} reasons[${index}] 为空`);
      else if (reason.length > 40) fail(file, `${id} reasons[${index}] 超过 40 字`);
    });
  }
  if (prediction.factors !== undefined) {
    if (!Array.isArray(prediction.factors) || prediction.factors.length > 5) {
      fail(file, `${id} factors 必须是不超过 5 条的数组`);
    }
  }
  if (prediction.risk !== undefined) {
    if (typeof prediction.risk !== "string") fail(file, `${id} risk 必须是字符串`);
    else if (prediction.risk.length > 60) fail(file, `${id} risk 超过 60 字`);
  }
}

function validateMatchFile(file, data) {
  const date = basename(file, ".json");
  if (!DATE_RE.test(date)) fail(file, "文件名必须是 YYYY-MM-DD");
  if (!isObject(data)) {
    fail(file, "根节点必须是对象");
    return;
  }
  if (data.schemaVersion !== 1) fail(file, "schemaVersion 必须为 1");
  if (data.date !== date) fail(file, `date 字段（${data.date}）与文件名不一致`);
  const generated = Date.parse(data.generatedAt);
  if (Number.isNaN(generated)) fail(file, "generatedAt 不是合法时间");
  else if (generated - Date.now() > 3600_000) fail(file, "generatedAt 晚于当前时间超过 1 小时");
  if (typeof data.model !== "string" || !data.model) fail(file, "model 为空");
  if (!Array.isArray(data.matches) || data.matches.length === 0) {
    fail(file, "matches 不能为空");
    return;
  }
  if (data.matchCount !== data.matches.length) fail(file, "matchCount 与 matches 数量不一致");
  const degraded = data.matches.filter((match) => match.degraded === true).length;
  if (data.degradedCount !== degraded) fail(file, "degradedCount 与实际降级场次不一致");

  const ids = new Set();
  for (const match of data.matches) {
    checkedMatches += 1;
    if (!isObject(match)) {
      fail(file, "matches 中存在非对象成员");
      continue;
    }
    const id = match.id;
    if (typeof id !== "string" || !id.includes(date)) fail(file, "比赛 id 缺失或未包含日期");
    if (ids.has(id)) fail(file, `比赛 id 重复：${id}`);
    ids.add(id);
    if (!LEAGUES.has(match.league)) fail(file, `${id} league 非法`);
    if (typeof match.leagueName !== "string" || !match.leagueName) fail(file, `${id} leagueName 为空`);
    if (Number.isNaN(Date.parse(match.kickoff))) fail(file, `${id} kickoff 非法`);
    if (!["scheduled", "finished"].includes(match.status)) fail(file, `${id} status 非法`);
    checkTeam(file, `${id}.home`, match.home);
    checkTeam(file, `${id}.away`, match.away);
    checkPrediction(file, id, match.prediction);
    if (typeof match.degraded !== "boolean") fail(file, `${id} degraded 必须是布尔值`);
    if (match.status === "finished") {
      const result = match.result;
      if (!isObject(result) || !isInt(result.homeGoals, 0, 99) || !isInt(result.awayGoals, 0, 99)) {
        fail(file, `${id} 已结束但缺少合法 result`);
      }
    } else if (match.result !== null && match.result !== undefined) {
      fail(file, `${id} 未结束但存在 result`);
    }
  }
}

function validateResultFile(file, data) {
  const date = basename(file, ".json");
  if (!DATE_RE.test(date)) fail(file, "文件名必须是 YYYY-MM-DD");
  if (!isObject(data)) {
    fail(file, "根节点必须是对象");
    return;
  }
  if (data.schemaVersion !== 1) fail(file, "schemaVersion 必须为 1");
  if (data.date !== date) fail(file, "date 字段与文件名不一致");
  if (!Array.isArray(data.results)) {
    fail(file, "results 必须是数组");
    return;
  }
  const ids = new Set();
  for (const item of data.results) {
    if (!isObject(item) || typeof item.id !== "string") {
      fail(file, "results 中存在缺少 id 的成员");
      continue;
    }
    if (ids.has(item.id)) fail(file, `赛果 id 重复：${item.id}`);
    ids.add(item.id);
    if (!isInt(item.homeGoals, 0, 99) || !isInt(item.awayGoals, 0, 99)) {
      fail(file, `${item.id} 比分非法`);
    }
    if (!OUTCOMES.has(item.outcome)) fail(file, `${item.id} outcome 非法`);
    if (Number.isNaN(Date.parse(item.updatedAt))) fail(file, `${item.id} updatedAt 非法`);
  }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(file, `JSON 解析失败：${error.message}`);
    return null;
  }
}

function walk(kind, validator) {
  const dir = join(DATA, kind);
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  for (const name of files) {
    const file = join(dir, name);
    const display = `data/${kind}/${name}`;
    const data = readJson(file);
    checkedFiles += 1;
    if (data) validator(display, data);
  }
}

walk("matches", validateMatchFile);
walk("results", validateResultFile);

if (errors.length > 0) {
  console.error(`数据校验失败，共 ${errors.length} 个问题：`);
  for (const message of errors) console.error(`  ✗ ${message}`);
  process.exit(1);
}

console.log(`✓ 数据校验通过：${checkedFiles} 个文件，${checkedMatches} 场比赛`);
