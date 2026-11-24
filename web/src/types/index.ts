export type LeagueCode = "PL" | "PD" | "SA" | "BL1" | "FL1" | "CL";
export type Outcome = "home" | "draw" | "away";
export type FormResult = "W" | "D" | "L";
export type MatchStatus = "scheduled" | "finished";

export interface TeamInfo {
  name: string;
  nameEn: string;
  crest?: string;
  rank: number;
  form: FormResult[];
  goalsFor?: number;
  goalsAgainst?: number;
}

export interface Prediction {
  prob: Record<Outcome, number>;
  score: { home: number; away: number };
  confidence: number;
  pick: Outcome;
  reasons: string[];
  factors: string[];
  risk: string;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  status: string;
}

export interface Match {
  id: string;
  league: LeagueCode;
  leagueName: string;
  kickoff: string;
  status: MatchStatus;
  matchday?: number;
  venue?: string;
  home: TeamInfo;
  away: TeamInfo;
  prediction: Prediction;
  degraded: boolean;
  result: MatchResult | null;
}

export interface MatchDayFile {
  schemaVersion: number;
  date: string;
  generatedAt: string;
  source: string;
  model: string;
  matchCount: number;
  degradedCount: number;
  matches: Match[];
}

export interface LeagueOption {
  code: LeagueCode;
  name: string;
}

export interface IndexFile {
  schemaVersion: number;
  updatedAt: string;
  latest: string;
  earliest: string;
  dates: string[];
  resultDates: string[];
  leagues: LeagueOption[];
}

export interface ResultItem {
  id: string;
  homeGoals: number;
  awayGoals: number;
  outcome: Outcome;
  status: string;
  updatedAt: string;
}

export interface ResultFile {
  schemaVersion: number;
  date: string;
  generatedAt: string;
  results: ResultItem[];
}

export interface StandingsRow {
  rank: number;
  name: string;
  tla: string;
  crest?: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: FormResult[];
}

export interface StandingsLeague {
  code: LeagueCode;
  name: string;
  matchday?: number | null;
  table: StandingsRow[];
}

export interface StandingsFile {
  schemaVersion: number;
  updatedAt: string;
  leagues: StandingsLeague[];
}

export interface LeagueStats {
  league: LeagueCode;
  total: number;
  outcomeHit: number;
  outcomeRate: number;
  scoreHit: number;
  scoreRate: number;
}

export interface StatsFile {
  schemaVersion: number;
  updatedAt: string;
  overall: Omit<LeagueStats, "league">;
  byLeague: LeagueStats[];
}
