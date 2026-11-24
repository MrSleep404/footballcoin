<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { DataNotFoundError, loadIndex, loadMatchDayWithResults } from "../api/data";
import type { IndexFile, LeagueCode, Match, MatchDayFile } from "../types";
import { LEAGUE_COLOR, bjToday, monthDayLabel } from "../utils/format";
import DateStrip from "../components/DateStrip.vue";
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

const todayAvailable = computed(() => index.value?.dates.includes(bjToday()) ?? false);
const shownCount = computed(() => groups.value.reduce((total, group) => total + group.matches.length, 0));

async function loadDay() {
  if (!date.value) return;
  loading.value = true;
  error.value = "";
  try {
    day.value = await loadMatchDayWithResults(date.value, index.value?.resultDates ?? []);
  } catch (cause) {
    day.value = null;
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

    date.value = data.dates.includes(queryDate)
      ? queryDate
      : nearestDate(data.dates, bjToday()) || data.latest;
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
        <h1>五大联赛与欧冠<span>赛前预测</span></h1>
        <p>
          基于赛程、积分榜与近期状态生成，覆盖五大联赛与欧冠联赛阶段，展示胜平负概率、预测比分与判断依据。
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
          <span class="v numeric">{{ index?.leagues.length ?? 6 }}</span>
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

        <DateStrip v-if="index && index.dates.length" v-model="date" :dates="index.dates" />
      </div>

      <FreshnessBanner
        v-if="day && !loading"
        :generated-at="day.generatedAt"
        :model="day.model"
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
        v-else-if="groups.length === 0"
        title="该日期暂无比赛预测"
        description="可以切换到其他日期，或等待下一次数据更新。"
      >
        <button v-if="index" type="button" class="btn" @click="jumpToLatest">查看最近有数据的日期</button>
      </StateEmpty>

      <div v-else class="groups">
        <section v-for="group in groups" :key="group.code" class="group">
          <h2 class="league-head">
            <i class="bar" :style="{ background: LEAGUE_COLOR[group.code] }" aria-hidden="true"></i>
            <span class="league-name">{{ group.name }}</span>
            <span class="league-count numeric">{{ group.matches.length }}</span>
            <span class="league-unit">场</span>
          </h2>
          <div class="list">
            <MatchCard v-for="match in group.matches" :key="match.id" :match="match" :date="day!.date" />
          </div>
        </section>

        <p class="board-note">
          概率为模型给出的相对倾向，非确定结论。数据来源：football-data.org、API-Football、The Odds API、Open-Meteo。
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
