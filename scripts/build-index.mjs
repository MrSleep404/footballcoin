import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DATA = join(ROOT, "data");
const MATCH_DIR = join(DATA, "matches");
const RESULT_DIR = join(DATA, "results");

const LEAGUES = [
  { code: "PL", name: "英超" },
  { code: "PD", name: "西甲" },
  { code: "SA", name: "意甲" },
  { code: "BL1", name: "德甲" },
  { code: "FL1", name: "法甲" },
  { code: "CL", name: "欧冠" },
];

function beijingNow() {
  return new Date(Date.now() + 8 * 3600_000).toISOString().replace("Z", "+08:00");
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function listDates(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .map((name) => name.replace(".json", ""))
    .sort();
}

function rate(hit, total) {
  return total === 0 ? 0 : Math.round((hit / total) * 1000) / 10;
}

const dates = listDates(MATCH_DIR);
const resultDates = listDates(RESULT_DIR);

if (dates.length === 0) {
  console.warn("警告：data/matches 下没有数据文件");
}

const index = {
  schemaVersion: 1,
  updatedAt: beijingNow(),
  latest: dates.at(-1) ?? "",
  earliest: dates[0] ?? "",
  dates,
  resultDates,
  leagues: LEAGUES,
};

writeFileSync(join(DATA, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");

const overall = { total: 0, outcomeHit: 0, outcomeRate: 0, scoreHit: 0, scoreRate: 0 };
const leagueStats = new Map(
  LEAGUES.map((league) => [
    league.code,
    { league: league.code, total: 0, outcomeHit: 0, outcomeRate: 0, scoreHit: 0, scoreRate: 0 },
  ]),
);

for (const date of resultDates) {
  const matchFile = join(MATCH_DIR, `${date}.json`);
  if (!existsSync(matchFile)) continue;
  const day = readJson(matchFile);
  const byId = new Map(day.matches.map((match) => [match.id, match]));
  const resultFile = readJson(join(RESULT_DIR, `${date}.json`));
  for (const result of resultFile.results) {
    const match = byId.get(result.id);
    if (!match) continue;
    const prediction = match.prediction;
    const outcomeHit = prediction.pick === result.outcome ? 1 : 0;
    const scoreHit =
      prediction.score.home === result.homeGoals && prediction.score.away === result.awayGoals ? 1 : 0;

    overall.total += 1;
    overall.outcomeHit += outcomeHit;
    overall.scoreHit += scoreHit;

    const league = leagueStats.get(match.league);
    if (league) {
      league.total += 1;
      league.outcomeHit += outcomeHit;
      league.scoreHit += scoreHit;
    }
  }
}

overall.outcomeRate = rate(overall.outcomeHit, overall.total);
overall.scoreRate = rate(overall.scoreHit, overall.total);

const byLeague = [...leagueStats.values()].map((league) => ({
  ...league,
  outcomeRate: rate(league.outcomeHit, league.total),
  scoreRate: rate(league.scoreHit, league.total),
}));

const stats = {
  schemaVersion: 1,
  updatedAt: beijingNow(),
  overall,
  byLeague,
};

writeFileSync(join(DATA, "stats.json"), `${JSON.stringify(stats, null, 2)}\n`, "utf8");

console.log(
  `✓ 生成索引：${dates.length} 个预测日期，${resultDates.length} 个赛果日期；命中统计 ${overall.total} 场`,
);
