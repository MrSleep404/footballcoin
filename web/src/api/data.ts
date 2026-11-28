import type { FixtureDayFile, IndexFile, MatchDayFile, ResultFile, StandingsFile, StatsFile } from "../types";

const BASE = `${import.meta.env.BASE_URL}data`;

export class DataNotFoundError extends Error {
  constructor(path: string) {
    super(`数据不存在：${path}`);
    this.name = "DataNotFoundError";
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (response.status === 404) throw new DataNotFoundError(path);
  if (!response.ok) throw new Error(`请求 ${path} 失败（HTTP ${response.status}）`);
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`解析 ${path} 失败`);
  }
}

const dayCache = new Map<string, MatchDayFile>();

export function loadIndex(): Promise<IndexFile> {
  return fetchJson<IndexFile>("/index.json");
}

export async function loadMatchDay(date: string): Promise<MatchDayFile> {
  const cached = dayCache.get(date);
  if (cached) return cached;
  const day = await fetchJson<MatchDayFile>(`/matches/${date}.json`);
  dayCache.set(date, day);
  return day;
}

export function loadStats(): Promise<StatsFile> {
  return fetchJson<StatsFile>("/stats.json");
}

const fixtureCache = new Map<string, FixtureDayFile>();

/** 加载指定日期的赛程（该日期尚未生成预测时使用） */
export async function loadFixtures(date: string): Promise<FixtureDayFile> {
  const cached = fixtureCache.get(date);
  if (cached) return cached;
  const day = await fetchJson<FixtureDayFile>(`/fixtures/${date}.json`);
  fixtureCache.set(date, day);
  return day;
}

export function loadStandings(): Promise<StandingsFile> {
  return fetchJson<StandingsFile>("/standings.json");
}

/** 拉取指定日期的预测，并在存在赛果时合并进 result 字段 */
export async function loadMatchDayWithResults(date: string, resultDates: string[]): Promise<MatchDayFile> {
  const day = await loadMatchDay(date);
  if (!resultDates.includes(date)) return day;

  try {
    const results = await fetchJson<ResultFile>(`/results/${date}.json`);
    const byId = new Map(results.results.map((item) => [item.id, item]));
    return {
      ...day,
      matches: day.matches.map((match) => {
        const result = byId.get(match.id);
        if (!result) return match;
        return {
          ...match,
          result: { homeGoals: result.homeGoals, awayGoals: result.awayGoals, status: result.status },
        };
      }),
    };
  } catch {
    return day;
  }
}
