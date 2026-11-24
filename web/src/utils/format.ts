import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { LeagueCode, Outcome } from "../types";

dayjs.extend(utc);
dayjs.extend(timezone);

export const BJ_TIMEZONE = "Asia/Shanghai";

export const LEAGUE_NAME: Record<LeagueCode, string> = {
  PL: "英超",
  PD: "西甲",
  SA: "意甲",
  BL1: "德甲",
  FL1: "法甲",
  CL: "欧冠",
};

export const LEAGUE_COLOR: Record<LeagueCode, string> = {
  PL: "#8b6cff",
  PD: "#ff9f43",
  SA: "#3fa9ff",
  BL1: "#ff5c5c",
  FL1: "#2dd4bf",
  CL: "#f5c451",
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  home: "主胜",
  draw: "平局",
  away: "客胜",
};

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function bjToday(): string {
  return dayjs().tz(BJ_TIMEZONE).format("YYYY-MM-DD");
}

export function formatKickoff(iso: string): string {
  return dayjs(iso).tz(BJ_TIMEZONE).format("MM-DD HH:mm");
}

export function formatKickoffTime(iso: string): string {
  return dayjs(iso).tz(BJ_TIMEZONE).format("HH:mm");
}

export function formatKickoffFull(iso: string): string {
  return dayjs(iso).tz(BJ_TIMEZONE).format("YYYY-MM-DD HH:mm");
}

export function formatGeneratedAt(iso: string): string {
  return dayjs(iso).tz(BJ_TIMEZONE).format("YYYY-MM-DD HH:mm");
}

export function weekdayLabel(date: string): string {
  return WEEKDAYS[dayjs.tz(date, BJ_TIMEZONE).day()] ?? "";
}

export function monthDayLabel(date: string): string {
  return dayjs.tz(date, BJ_TIMEZONE).format("MM-DD");
}

export function isToday(date: string): boolean {
  return date === bjToday();
}

export function isStale(iso: string, hours = 48): boolean {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return false;
  return Date.now() - time > hours * 3600_000;
}

export function relativeHours(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "未知时间";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export function outcomeLabel(outcome: Outcome): string {
  return OUTCOME_LABEL[outcome];
}

export function outcomeFromScore(homeGoals: number, awayGoals: number): Outcome {
  if (homeGoals > awayGoals) return "home";
  if (homeGoals < awayGoals) return "away";
  return "draw";
}
