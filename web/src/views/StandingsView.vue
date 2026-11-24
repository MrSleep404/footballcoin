<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loadStandings } from "../api/data";
import type { LeagueCode, StandingsFile, StandingsLeague } from "../types";
import { LEAGUE_COLOR, LEAGUE_NAME, formatGeneratedAt } from "../utils/format";
import FormDots from "../components/FormDots.vue";
import StateEmpty from "../components/StateEmpty.vue";
import StateError from "../components/StateError.vue";
import TeamCrest from "../components/TeamCrest.vue";

const data = ref<StandingsFile | null>(null);
const loading = ref(true);
const error = ref("");
const active = ref<LeagueCode>("PL");

const leagues = computed<StandingsLeague[]>(() => data.value?.leagues ?? []);
const domesticCount = computed(() => leagues.value.filter((item) => item.code !== "CL").length);
const current = computed(
  () => leagues.value.find((item) => item.code === active.value) ?? leagues.value[0] ?? null,
);

interface ZoneRule {
  ucl: number;
  uel: number;
  uecl: number;
  relegation: number;
}

// 按各联赛常规名额划分（杯赛冠军占用的欧联/欧协联名额未单独扣除）
const ZONE_RULES: Record<LeagueCode, ZoneRule> = {
  PL: { ucl: 4, uel: 5, uecl: 6, relegation: 3 },
  PD: { ucl: 4, uel: 5, uecl: 6, relegation: 3 },
  SA: { ucl: 4, uel: 5, uecl: 6, relegation: 3 },
  BL1: { ucl: 4, uel: 5, uecl: 6, relegation: 2 },
  FL1: { ucl: 3, uel: 4, uecl: 5, relegation: 2 },
  CL: { ucl: 8, uel: 24, uecl: 0, relegation: 0 },
};

function zone(league: LeagueCode, rank: number, total: number): string {
  if (league === "CL") {
    if (rank <= 8) return "ucl";
    if (rank <= 24) return "playoff";
    return "out";
  }
  const rule = ZONE_RULES[league];
  if (rank <= rule.ucl) return "ucl";
  if (rank <= rule.uel) return "uel";
  if (rank <= rule.uecl) return "uecl";
  if (rule.relegation > 0 && rank > total - rule.relegation) return "relegation";
  return "";
}

async function init() {
  loading.value = true;
  error.value = "";
  try {
    const file = await loadStandings();
    data.value = file;
    if (file.leagues.length > 0 && !file.leagues.some((item) => item.code === active.value)) {
      active.value = file.leagues[0].code;
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void init();
});
</script>

<template>
  <div class="standings">
    <header class="head">
      <span class="eyebrow">Standings</span>
      <h1>五大联赛积分榜</h1>
      <p>排名与积分来自 football-data.org，随每日预测任务自动更新，同分并列按官方规则排序。</p>
      <p v-if="data?.updatedAt" class="updated numeric">更新于 {{ formatGeneratedAt(data.updatedAt) }}</p>
    </header>

    <StateError v-if="error" :message="error" @retry="init" />

    <div v-else-if="loading" class="card loading">
      <div class="skeleton" style="width: 42%; height: 16px"></div>
      <div class="skeleton" style="width: 100%; height: 260px; margin-top: 18px"></div>
    </div>

    <StateEmpty
      v-else-if="leagues.length === 0"
      title="暂无积分榜数据"
      description="下一次预测任务运行后会自动生成。"
    />

    <template v-else>
      <div class="tabs" role="tablist" aria-label="选择赛事">
        <template v-for="(league, index) in leagues" :key="league.code">
          <span
            v-if="index === domesticCount && domesticCount > 0"
            class="divider"
            aria-hidden="true"
            >欧战</span
          >
          <button
            type="button"
            role="tab"
            class="tab"
            :class="{ active: league.code === current?.code }"
            :aria-selected="league.code === current?.code"
            :style="{ '--league': LEAGUE_COLOR[league.code] }"
            @click="active = league.code"
          >
            <i aria-hidden="true"></i>
            {{ league.name || LEAGUE_NAME[league.code] }}
            <span v-if="league.matchday" class="md numeric">第 {{ league.matchday }} 轮</span>
          </button>
        </template>
      </div>

      <section
        v-if="current"
        class="card table-card"
        :style="{ '--league': LEAGUE_COLOR[current.code] }"
      >
        <table>
          <thead>
            <tr>
              <th scope="col" class="rank-col">#</th>
              <th scope="col">球队</th>
              <th scope="col" class="num">场</th>
              <th scope="col" class="num hide-sm">胜</th>
              <th scope="col" class="num hide-sm">平</th>
              <th scope="col" class="num hide-sm">负</th>
              <th scope="col" class="num hide-md">进/失</th>
              <th scope="col" class="num hide-md">净</th>
              <th scope="col" class="num">积分</th>
              <th scope="col" class="hide-sm">近 5 场</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in current.table" :key="row.rank">
              <td class="rank-col">
                <span
                  class="zone"
                  :class="zone(current.code, row.rank, current.table.length)"
                  aria-hidden="true"
                ></span>
                <span class="numeric rank">{{ row.rank }}</span>
              </td>
              <td>
                <div class="team">
                  <TeamCrest :name="row.name" :crest="row.crest" :size="22" />
                  <span class="name">{{ row.name }}</span>
                </div>
              </td>
              <td class="num numeric">{{ row.played }}</td>
              <td class="num numeric hide-sm">{{ row.won }}</td>
              <td class="num numeric hide-sm">{{ row.draw }}</td>
              <td class="num numeric hide-sm">{{ row.lost }}</td>
              <td class="num numeric hide-md">{{ row.goalsFor }}/{{ row.goalsAgainst }}</td>
              <td
                class="num numeric hide-md"
                :class="{ plus: row.goalDiff > 0, minus: row.goalDiff < 0 }"
              >
                {{ row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff }}
              </td>
              <td class="num numeric points">{{ row.points }}</td>
              <td class="hide-sm"><FormDots :form="row.form" /></td>
            </tr>
          </tbody>
        </table>

        <p class="legend">
          <template v-if="current.code === 'CL'">
            <span><i class="zone ucl" aria-hidden="true"></i> 直接晋级 16 强</span>
            <span><i class="zone playoff" aria-hidden="true"></i> 附加赛</span>
            <span><i class="zone out" aria-hidden="true"></i> 淘汰</span>
          </template>
          <template v-else>
            <span><i class="zone ucl" aria-hidden="true"></i> 欧冠</span>
            <span><i class="zone uel" aria-hidden="true"></i> 欧联</span>
            <span><i class="zone uecl" aria-hidden="true"></i> 欧协联</span>
            <span><i class="zone relegation" aria-hidden="true"></i> 降级区</span>
          </template>
          <span class="src">数据来源：football-data.org</span>
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.standings {
  max-width: 920px;
  margin: 0 auto;
}

.head {
  margin-bottom: 14px;
}

.eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--brand);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.head h1 {
  margin: 0 0 6px;
  font-size: 24px;
  letter-spacing: -0.3px;
}

.head p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.7;
}

.updated {
  margin-top: 4px;
  color: var(--text-dim);
  font-size: 11px;
}

.loading {
  padding: 20px;
}

.skeleton {
  border-radius: 6px;
  background: linear-gradient(90deg, var(--surface-2), var(--surface-3), var(--surface-2));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.divider {
  flex: 0 0 auto;
  align-self: center;
  padding: 0 2px 0 8px;
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.tab i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--league);
}

.tab .md {
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 600;
}

.tab:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.tab.active {
  border-color: var(--league);
  background: var(--surface-2);
  color: var(--text);
}

.table-card {
  overflow: hidden;
  padding: 0;
}

.table-card table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

thead th {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-align: left;
  white-space: nowrap;
}

tbody td {
  padding: 8px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background: var(--surface-2);
}

.num {
  text-align: right;
}

thead th:last-child,
tbody td:last-child {
  width: 126px;
  padding-right: 10px;
  text-align: center;
}

tbody td:last-child .form {
  justify-content: center;
}

.rank-col {
  position: relative;
  width: 46px;
  padding-left: 14px !important;
  text-align: left;
}

.zone {
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: transparent;
}

.rank-col .zone {
  position: absolute;
  top: 50%;
  left: 6px;
  margin-top: -7px;
}

.zone.ucl {
  background: #3fa9ff;
}

.zone.uel {
  background: #ff9f43;
}

.zone.uecl {
  background: #2dd4bf;
}

.zone.playoff {
  background: #8b6cff;
}

.zone.out {
  background: var(--surface-3);
}

.zone.relegation {
  background: var(--danger);
}

.rank {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.team {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.name {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.points {
  font-size: 14px;
  font-weight: 800;
}

.plus {
  color: var(--home);
}

.minus {
  color: var(--danger);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin: 0;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 10px;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend .zone {
  height: 10px;
}

.src {
  margin-left: auto;
}

@media (max-width: 1024px) {
  .hide-md {
    display: none;
  }
}

@media (max-width: 720px) {
  .hide-sm {
    display: none;
  }

  .head h1 {
    font-size: 21px;
  }

  thead th,
  tbody td {
    padding: 8px 6px;
  }

  .rank-col {
    width: 40px;
    padding-left: 12px !important;
  }

  .name {
    font-size: 13px;
  }

  .legend .src {
    margin-left: 0;
    width: 100%;
  }
}
</style>
