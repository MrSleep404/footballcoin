<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { DataNotFoundError, loadFixtures, loadIndex, loadMatchDayWithResults } from "../api/data";
import type { FixtureDayFile, FixtureMatch, IndexFile, LeagueCode, Match, MatchDayFile } from "../types";
import { LEAGUE_COLOR, bjToday, monthDayLabel } from "../utils/format";
import DateStrip from "../components/DateStrip.vue";
import FixtureCard from "../components/FixtureCard.vue";
import FreshnessBanner from "../components/FreshnessBanner.vue";
import LeagueTabs from "../components/LeagueTabs.vue";
import MatchCard from "../components/MatchCard.vue";
import StateEmpty from "../components/StateEmpty.vue";
import StateError from "../components/StateError.vue";

interface Group {
  code: LeagueCode;
  name: string;
  matches: Match[];
}

const route = useRoute();
const router = useRouter();

const index = ref<IndexFile | null>(null);
const day = ref<MatchDayFile | null>(null);
const fixtures = ref<FixtureDayFile | null>(null);
const league = ref<LeagueCode | "ALL">("ALL");
const date = ref("");
const loading = ref(true);
const error = ref("");
const ready = ref(false);
const newData = ref(false);

const groups = computed<Group[]>(() => {
  if (!day.value) return [];
  const order = index.value?.leagues.map((item) => item.code) ?? (["PL", "PD", "SA", "BL1", "FL1"] as LeagueCode[]);
  const map = new Map<LeagueCode, Group>();
  for (const match of day.value.matches) {
    if (!map.has(match.league)) {
      map.set(match.league, { code: match.league, name: match.leagueName, matches: [] });
    }
    map.get(match.league)?.matches.push(match);
  }
  return order
    .filter((code) => map.has(code))
    .map((code) => {
      const group = map.get(code) as Group;
      return {
        ...group,
        matches: group.matches.slice().sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff)),
      };
    })
    .filter((group) => league.value === "ALL" || group.code === league.value);
});

const allDates = computed(() => {
  const set = new Set([...(index.value?.dates ?? []), ...(index.value?.fixtureDates ?? [])]);
  return [...set].sort();
});

const todayAvailable = computed(() => allDates.value.includes(bjToday()));
const shownCount = computed(() =>
  day.value ? day.value.matches.length : fixtures.value ? fixtures.value.matches.length : 0,
);
const dayLeagues = computed(() => {
  const list = day.value?.matches ?? fixtures.value?.matches ?? [];
  return new Set(list.map((item) => item.league)).size;
});

interface FixtureGroup {
  code: LeagueCode;
  name: string;
  matches: FixtureMatch[];
}

const fixtureGroups = computed<FixtureGroup[]>(() => {
  if (!fixtures.value) return [];
  const order = index.value?.leagues.map((item) => item.code) ?? (["PL", "PD", "SA", "BL1", "FL1", "CL"] as LeagueCode[]);
  const map = new Map<LeagueCode, FixtureGroup>();
  for (const match of fixtures.value.matches) {
    if (!map.has(match.league)) {
      map.set(match.league, { code: match.league, name: match.leagueName, matches: [] });
    }
    map.get(match.league)?.matches.push(match);
  }
  return order
    .filter((code) => map.has(code))
    .map((code) => {
      const group = map.get(code) as FixtureGroup;
      return {
        ...group,
        matches: group.matches.slice().sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff)),
      };
    })
    .filter((group) => league.value === "ALL" || group.code === league.value);
});

async function loadDay() {
  if (!date.value) return;
  loading.value = true;
  error.value = "";
  day.value = null;
  fixtures.value = null;
  const predictedDates = index.value?.dates ?? [];
  const fixtureDates = index.value?.fixtureDates ?? [];
  try {
    if (predictedDates.includes(date.value)) {
      day.value = await loadMatchDayWithResults(date.value, index.value?.resultDates ?? []);
    } else if (fixtureDates.includes(date.value)) {
      fixtures.value = await loadFixtures(date.value);
    } else {
      // 兼容历史索引：先尝试预测，不存在再读赛程
      try {
        day.value = await loadMatchDayWithResults(date.value, index.value?.resultDates ?? []);
      } catch (inner) {
        if (inner instanceof DataNotFoundError) fixtures.value = await loadFixtures(date.value);
        else throw inner;
      }
    }
  } catch (cause) {
    if (!(cause instanceof DataNotFoundError)) {
      error.value = cause instanceof Error ? cause.message : "加载失败";
    }
  } finally {
    loading.value = false;
  }
}

function syncQuery() {
  const query: Record<string, string> = { date: date.value };
  if (league.value !== "ALL") query.league = league.value;
  void router.replace({ query });
}

function nearestDate(dates: string[], today: string): string {
  if (!dates.length) return "";
  const target = Date.parse(today);
  let best = dates[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const item of dates) {
    const diff = Math.abs(Date.parse(item) - target);
    if (diff < bestDiff || (diff === bestDiff && item > best)) {
      best = item;
      bestDiff = diff;
    }
  }
  return best;
}

async function init() {
  loading.value = true;
  error.value = "";
  ready.value = false;
  try {
    const data = await loadIndex();
    index.value = data;
    const queryDate = typeof route.query.date === "string" ? route.query.date : "";
    const queryLeague = typeof route.query.league === "string" ? route.query.league : "";

    const all = [...new Set([...data.dates, ...(data.fixtureDates ?? [])])].sort();
    const preferred = data.dates.length ? data.dates : all;
    date.value = all.includes(queryDate) ? queryDate : nearestDate(preferred, bjToday()) || data.latest || all[0] || "";
    league.value = data.leagues.some((item) => item.code === queryLeague)
      ? (queryLeague as LeagueCode)
      : "ALL";

    await loadDay();
    syncQuery();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "无法加载预测数据";
    loading.value = false;
    return;
  }
  ready.value = true;
}

function jumpToLatest() {
  if (index.value?.latest) {
    league.value = "ALL";
    date.value = index.value.latest;
  }
}

async function checkUpdate() {
  if (document.visibilityState !== "visible" || !index.value || loading.value) return;
  try {
    const fresh = await loadIndex();
    if (fresh.updatedAt !== index.value.updatedAt) newData.value = true;
  } catch {
    // 静默失败，避免打断浏览
  }
}

function applyUpdate() {
  newData.value = false;
  void init();
}

watch(league, () => {
  if (!ready.value) return;
  syncQuery();
});

watch(date, () => {
  if (!ready.value) return;
  syncQuery();
  void loadDay();
});

onMounted(() => {
  void init();
  document.addEventListener("visibilitychange", checkUpdate);
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", checkUpdate);
});
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">Matchday Predictions</span>
        <h1>五大联赛与欧冠<span>AI 赛前预测</span></h1>
        <p>
          赛程覆盖未来 30 天，预测在赛前 3 天内生成，展示胜平负概率、预测比分与判断依据。
          <span class="hero-note">仅供娱乐参考。</span>
        </p>
      </div>
      <div class="hero-stats">
        <div class="stat">
          <span class="k">日期</span>
          <span class="v numeric">{{ date ? monthDayLabel(date) : "--" }}</span>
        </div>
        <div class="stat">
          <span class="k">场次</span>
          <span class="v numeric">{{ day?.matchCount ?? shownCount }}</span>
        </div>
        <div class="stat">
          <span class="k">联赛</span>
          <span class="v numeric">{{ dayLeagues }}</span>
        </div>
      </div>
    </section>

    <div v-if="newData" class="update-bar">
      <span><i aria-hidden="true"></i> 检测到新数据</span>
      <button type="button" @click="applyUpdate">立即刷新</button>
    </div>

    <StateError v-if="error" :message="error" @retry="init" />

    <template v-else>
      <div class="board-head">
        <div class="toolbar">
          <LeagueTabs v-if="index" v-model="league" :leagues="index.leagues" />
          <span v-if="todayAvailable && date !== bjToday()" class="today-hint">
            <button type="button" @click="date = bjToday()">回到今天</button>
          </span>
        </div>

        <DateStrip v-if="index && allDates.length" v-model="date" :dates="allDates" :predicted-dates="index.dates" />
      </div>

      <FreshnessBanner
        v-if="day && !loading"
        :generated-at="day.generatedAt"
        :degraded-count="day.degradedCount"
      />

      <div v-if="loading" class="groups" aria-busy="true" aria-label="正在加载">
        <div v-for="i in 2" :key="i" class="card skeleton-card">
          <div class="skeleton" style="width: 22%; height: 14px"></div>
          <div class="skeleton" style="width: 62%; height: 22px; margin-top: 14px"></div>
          <div class="skeleton" style="width: 100%; height: 52px; margin-top: 14px"></div>
        </div>
      </div>

      <StateEmpty
        v-else-if="groups.length === 0 && fixtureGroups.length === 0"
        title="该日期暂无比赛"
        description="可以切换到其他日期，或等待下一次数据更新。"
      >
        <button v-if="index" type="button" class="btn" @click="jumpToLatest">查看最近有数据的日期</button>
      </StateEmpty>

      <div v-else-if="day" class="groups">
        <section v-for="group in groups" :key="group.code" class="group">
          <h2 class="league-head">
            <i class="bar" :style="{ background: LEAGUE_COLOR[group.code] }" aria-hidden="true"></i>
            <span class="league-name">{{ group.name }}</span>
            <span class="league-count numeric">{{ group.matches.length }}</span>
            <span class="league-unit">场</span>
          </h2>
          <div class="list">
            <MatchCard v-for="match in group.matches" :key="match.id" :match="match" :date="day.date" />
          </div>
        </section>

        <p class="board-note">
          概率为模型给出的相对倾向，非确定结论。数据来源：football-data.org、API-Football、The Odds API、Open-Meteo。
        </p>
      </div>

      <div v-else class="groups">
        <p class="pending-banner">
          <span>该日期尚未生成预测</span>
          <span>预测在赛前 3 天内生成，届时可查看概率与理由。</span>
        </p>

        <section v-for="group in fixtureGroups" :key="group.code" class="group">
          <h2 class="league-head">
            <i class="bar" :style="{ background: LEAGUE_COLOR[group.code] }" aria-hidden="true"></i>
            <span class="league-name">{{ group.name }}</span>
            <span class="league-count numeric">{{ group.matches.length }}</span>
            <span class="league-unit">场</span>
          </h2>
          <div class="list">
            <FixtureCard v-for="match in group.matches" :key="match.id" :match="match" />
          </div>
        </section>

        <p class="board-note">
          赛程覆盖未来 30 天，预测覆盖未来 3 天。比赛进入预测窗口后，此页会自动显示完整预测。
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.eyebrow {
  display: block;
  margin-bottom: 4px;
}

h1 {
  font-size: clamp(26px, 3.2vw, 36px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.5px;
}

h1 span {
  margin-left: 6px;
  color: var(--brand);
}

.hero-copy p {
  max-width: 620px;
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.hero-note {
  color: var(--text-dim);
  white-space: nowrap;
}

.hero-stats {
  display: flex;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--border);
  flex: none;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 78px;
  padding: 8px 14px;
  background: var(--surface);
}

.stat .k {
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.6px;
}

.stat .v {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.update-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px 14px;
  border: 1px solid rgba(199, 249, 75, 0.4);
  border-radius: 8px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 12px;
  font-weight: 600;
}

.update-bar span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.update-bar i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
}

.update-bar button {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: var(--brand);
  color: var(--brand-ink);
  font-size: 11px;
  font-weight: 700;
}

.board-head {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.today-hint button {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.today-hint button:hover {
  border-color: var(--brand);
  color: var(--brand);
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin-top: 16px;
}

.league-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
  padding-left: 2px;
}

.league-head .bar {
  width: 3px;
  height: 14px;
  border-radius: 2px;
}

.league-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.league-count {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.league-unit {
  color: var(--text-dim);
  font-size: 10px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.skeleton-card {
  padding: 16px;
}

.board-note {
  color: var(--text-dim);
  font-size: 11px;
  text-align: center;
}

.pending-banner {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  color: var(--text-dim);
  font-size: 12px;
}

.pending-banner span:first-child {
  color: var(--text-muted);
  font-weight: 700;
}

@media (max-width: 720px) {
  .hero {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .hero-stats {
    align-self: stretch;
  }

  .stat {
    flex: 1;
    min-width: 0;
    padding: 7px 8px;
  }

  .stat .v {
    font-size: 16px;
  }

  .board-head {
    padding: 8px 10px;
  }
}
</style>
