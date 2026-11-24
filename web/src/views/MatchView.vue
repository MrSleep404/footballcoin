<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { DataNotFoundError, loadIndex, loadMatchDayWithResults } from "../api/data";
import type { Match } from "../types";
import {
  LEAGUE_COLOR,
  formatGeneratedAt,
  formatKickoffFull,
  outcomeFromScore,
  outcomeLabel,
} from "../utils/format";
import FormDots from "../components/FormDots.vue";
import OddsRow from "../components/OddsRow.vue";
import StateEmpty from "../components/StateEmpty.vue";
import StateError from "../components/StateError.vue";
import TeamCrest from "../components/TeamCrest.vue";

const route = useRoute();
const match = ref<Match | null>(null);
const loading = ref(true);
const notFound = ref(false);
const error = ref("");
const generatedAt = ref("");

const date = computed(() => String(route.params.date ?? ""));
const id = computed(() => String(route.params.id ?? ""));

const actualOutcome = computed(() => {
  const result = match.value?.result;
  return result ? outcomeFromScore(result.homeGoals, result.awayGoals) : null;
});

const actualOutcomeLabel = computed(() =>
  actualOutcome.value ? outcomeLabel(actualOutcome.value) : "",
);

const hit = computed(() => {
  if (!match.value || !actualOutcome.value) return null;
  return actualOutcome.value === match.value.prediction.pick;
});

const scoreHit = computed(() => {
  const result = match.value?.result;
  const score = match.value?.prediction.score;
  if (!result || !score) return false;
  return score.home === result.homeGoals && score.away === result.awayGoals;
});

const h2h = computed(() => {
  const value = match.value?.h2h;
  return value && value.played > 0 ? value : null;
});
const weather = computed(() => match.value?.weather ?? null);
const market = computed(() => match.value?.market ?? null);
const injuries = computed(() => match.value?.injuries ?? null);
const hasIntel = computed(() =>
  Boolean(h2h.value || weather.value || market.value || injuries.value),
);

async function init() {
  loading.value = true;
  error.value = "";
  notFound.value = false;
  match.value = null;
  try {
    const index = await loadIndex();
    const day = await loadMatchDayWithResults(date.value, index.resultDates);
    generatedAt.value = day.generatedAt;
    const found = day.matches.find((item) => item.id === id.value);
    if (found) match.value = found;
    else notFound.value = true;
  } catch (cause) {
    if (cause instanceof DataNotFoundError) notFound.value = true;
    else error.value = cause instanceof Error ? cause.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

watch([date, id], () => {
  void init();
});

onMounted(() => {
  void init();
});
</script>

<template>
  <div class="detail">
    <div class="back">
      <RouterLink :to="{ path: '/', query: { date } }">
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <path d="M13 8H4M8.5 3.5L4 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        返回预测列表
      </RouterLink>
    </div>

    <StateError v-if="error" :message="error" @retry="init" />

    <div v-else-if="loading" class="card loading">
      <div class="skeleton" style="width: 38%; height: 16px"></div>
      <div class="skeleton" style="width: 78%; height: 34px; margin-top: 20px"></div>
      <div class="skeleton" style="width: 100%; height: 56px; margin-top: 22px"></div>
    </div>

    <StateEmpty v-else-if="notFound" title="没有找到这场比赛" description="比赛可能已过期，或链接中的日期不正确。">
      <RouterLink class="btn" to="/">返回首页</RouterLink>
    </StateEmpty>

    <template v-else-if="match">
      <article
        class="card scoreboard"
        :style="{ '--league': LEAGUE_COLOR[match.league] }"
      >
        <div class="head-top">
          <span class="league">
            <i aria-hidden="true"></i>
            {{ match.leagueName }}
          </span>
          <span v-if="match.matchday" class="chip">第 {{ match.matchday }} 轮</span>
          <span v-if="match.degraded" class="chip chip-warning">兜底估计</span>
          <span v-if="match.result" class="chip" :class="hit ? 'hit' : 'miss'">
            {{ hit ? "预测命中" : "预测未中" }}
          </span>
        </div>

        <p class="kickoff">
          {{ formatKickoffFull(match.kickoff) }}
          <span v-if="match.venue"> / {{ match.venue }}</span>
        </p>

        <div class="teams">
          <div class="team">
            <span class="role">主队</span>
            <span class="name">
              <TeamCrest :name="match.home.name" :crest="match.home.crest" :size="30" />
              <span class="name-text">{{ match.home.name }}</span>
            </span>
            <span class="rank numeric">联赛第 {{ match.home.rank }}</span>
            <FormDots :form="match.home.form" label="近况" />
          </div>

          <div class="center">
            <span class="score numeric">
              <template v-if="match.result">{{ match.result.homeGoals }} : {{ match.result.awayGoals }}</template>
              <template v-else>{{ match.prediction.score.home }} : {{ match.prediction.score.away }}</template>
            </span>
            <span class="score-label">{{ match.result ? "实际比分" : "预测比分" }}</span>
          </div>

          <div class="team right">
            <span class="role">客队</span>
            <span class="name">
              <TeamCrest :name="match.away.name" :crest="match.away.crest" :size="30" />
              <span class="name-text">{{ match.away.name }}</span>
            </span>
            <span class="rank numeric">联赛第 {{ match.away.rank }}</span>
            <FormDots :form="match.away.form" label="近况" />
          </div>
        </div>

        <OddsRow class="odds" :prob="match.prediction.prob" :pick="match.prediction.pick" />
      </article>

      <div class="summary">
        <section class="card metric">
          <span class="metric-label">模型倾向</span>
          <span class="metric-value">{{ outcomeLabel(match.prediction.pick) }}</span>
        </section>
        <section class="card metric">
          <span class="metric-label">信心度</span>
          <span class="metric-value numeric">{{ match.prediction.confidence }}<small>/100</small></span>
          <div class="meter" role="img" :aria-label="`信心度 ${match.prediction.confidence}`">
            <span :style="{ width: `${match.prediction.confidence}%` }"></span>
          </div>
        </section>
        <section class="card metric">
          <span class="metric-label">数据生成</span>
          <span class="metric-date numeric">{{ formatGeneratedAt(generatedAt) }}</span>
        </section>
      </div>

      <section v-if="match.result" class="block">
        <h2>赛果复盘</h2>
        <p class="result-line">
          实际比分 <strong class="numeric">{{ match.result.homeGoals }} : {{ match.result.awayGoals }}</strong>
          （{{ actualOutcomeLabel }}），模型预测
          <strong>{{ outcomeLabel(match.prediction.pick) }}</strong>、
          <strong class="numeric">{{ match.prediction.score.home }} : {{ match.prediction.score.away }}</strong>
        </p>
        <p class="result-tags">
          <span class="chip" :class="hit ? 'hit' : 'miss'">
            胜负平：{{ hit ? "命中" : "未中" }}
          </span>
          <span class="chip" :class="scoreHit ? 'hit' : 'miss'">
            比分：{{ scoreHit ? "命中" : "未中" }}
          </span>
        </p>
      </section>

      <section v-if="hasIntel" class="block">
        <h2>赛前情报</h2>
        <div class="intel">
          <div v-if="h2h" class="intel-item">
            <span class="intel-label">交手记录（近 {{ h2h.played }} 次）</span>
            <span class="intel-value numeric">
              主队 {{ h2h.homeWins }} 胜 · {{ h2h.draws }} 平 · 客队 {{ h2h.awayWins }} 胜
            </span>
            <ul v-if="h2h.last.length" class="intel-list">
              <li v-for="item in h2h.last" :key="`${item.date}-${item.home}`">
                <span class="intel-date numeric">{{ item.date }}</span>
                <span>{{ item.home }}</span>
                <strong class="numeric">{{ item.score }}</strong>
                <span>{{ item.away }}</span>
              </li>
            </ul>
          </div>

          <div v-if="weather" class="intel-item">
            <span class="intel-label">开赛天气</span>
            <span class="intel-value numeric">
              <template v-if="weather.temp !== null">{{ weather.temp }}℃</template>
              <template v-if="weather.precip !== null"> · 降水 {{ weather.precip }}%</template>
              <template v-if="weather.wind !== null"> · 风速 {{ weather.wind }} km/h</template>
            </span>
          </div>

          <div v-if="injuries" class="intel-item">
            <span class="intel-label">
              伤停名单{{ injuries.date ? `（${injuries.date}）` : "" }}
            </span>
            <div v-if="injuries.home.length" class="injury-group">
              <span class="injury-team">{{ match.home.name }}</span>
              <span v-for="item in injuries.home" :key="`h-${item.player}`" class="injury-line">
                <strong>{{ item.player }}</strong>
                <span class="injury-meta">{{ item.type }}{{ item.reason ? ` · ${item.reason}` : "" }}</span>
              </span>
            </div>
            <div v-if="injuries.away.length" class="injury-group">
              <span class="injury-team">{{ match.away.name }}</span>
              <span v-for="item in injuries.away" :key="`a-${item.player}`" class="injury-line">
                <strong>{{ item.player }}</strong>
                <span class="injury-meta">{{ item.type }}{{ item.reason ? ` · ${item.reason}` : "" }}</span>
              </span>
            </div>
            <span v-if="!injuries.home.length && !injuries.away.length" class="intel-value">
              暂无官方伤停记录
            </span>
          </div>

          <div v-if="market" class="intel-item">
            <span class="intel-label">
              市场概率{{ market.bookmaker ? `（${market.bookmaker}）` : "" }}
            </span>
            <span class="intel-value numeric">
              主 {{ market.prob.home }}% · 平 {{ market.prob.draw }}% · 客 {{ market.prob.away }}%
            </span>
            <span class="intel-compare numeric">
              模型：主 {{ match.prediction.prob.home }}% · 平 {{ match.prediction.prob.draw }}% ·
              客 {{ match.prediction.prob.away }}%
            </span>
          </div>
        </div>
      </section>

      <section class="block">
        <h2>预测理由</h2>
        <ol class="reasons">
          <li v-for="(reason, index) in match.prediction.reasons" :key="index">
            <span class="idx numeric">{{ String(index + 1).padStart(2, "0") }}</span>
            <span>{{ reason }}</span>
          </li>
        </ol>
      </section>

      <section v-if="match.prediction.factors.length" class="block">
        <h2>关键因素</h2>
        <div class="factors">
          <span v-for="factor in match.prediction.factors" :key="factor" class="factor">{{ factor }}</span>
        </div>
      </section>

      <section v-if="match.prediction.risk" class="block risk">
        <h2>风险提示</h2>
        <p>{{ match.prediction.risk }}</p>
      </section>

      <section v-if="match.degraded" class="block risk">
        <h2>关于兜底估计</h2>
        <p>
          本场比赛模型未返回有效结果，系统使用双方联赛排名差生成先验概率，并降低了信心度。该结果参考价值有限。
        </p>
      </section>

      <section class="block">
        <h2>双方数据</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">指标</th>
                <th scope="col">{{ match.home.name }}</th>
                <th scope="col">{{ match.away.name }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">联赛排名</th>
                <td class="numeric">第 {{ match.home.rank }}</td>
                <td class="numeric">第 {{ match.away.rank }}</td>
              </tr>
              <tr>
                <th scope="row">近 5 场</th>
                <td><FormDots :form="match.home.form" /></td>
                <td><FormDots :form="match.away.form" /></td>
              </tr>
              <tr>
                <th scope="row">赛季进球</th>
                <td class="numeric">{{ match.home.goalsFor ?? "—" }}</td>
                <td class="numeric">{{ match.away.goalsFor ?? "—" }}</td>
              </tr>
              <tr>
                <th scope="row">赛季失球</th>
                <td class="numeric">{{ match.home.goalsAgainst ?? "—" }}</td>
                <td class="numeric">{{ match.away.goalsAgainst ?? "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p class="note">
        预测由 AI 模型生成，仅供娱乐参考，不构成投注建议。数据来源：football-data.org、API-Football、The Odds API、Open-Meteo。
      </p>
    </template>
  </div>
</template>

<style scoped>
.detail {
  max-width: 860px;
  margin: 0 auto;
}

.back {
  margin-bottom: 12px;
  font-size: 12px;
}

.back a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
}

.back a:hover {
  color: var(--brand);
}

.loading {
  padding: 24px;
}

.scoreboard {
  position: relative;
  overflow: hidden;
  padding: 18px 20px 20px;
}

.scoreboard::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: var(--league);
  content: "";
}

.head-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.league {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.league i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--league);
}

.kickoff {
  margin-top: 6px;
  color: var(--text-dim);
  font-size: 11px;
}

.teams {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin: 20px 0 16px;
}

.team {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.team.right {
  align-items: flex-end;
  text-align: right;
}

.role {
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: clamp(19px, 3vw, 26px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

.team.right .name {
  flex-direction: row-reverse;
}

.name-text {
  overflow-wrap: anywhere;
}

.rank {
  color: var(--text-muted);
  font-size: 11px;
}

.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 10px;
}

.score {
  color: var(--brand);
  font-family: var(--font-mono);
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: 1px;
}

.score-label {
  color: var(--text-dim);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 10px 0;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.metric-label {
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.6px;
}

.metric-value {
  font-size: 18px;
  font-weight: 800;
}

.metric-value small {
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 500;
}

.metric-date {
  font-size: 13px;
  font-weight: 700;
}

.meter {
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-3);
}

.meter span {
  display: block;
  height: 100%;
  background: var(--brand);
}

.block {
  margin-top: 10px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.block h2 {
  margin-bottom: 10px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.intel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.intel-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.intel-label {
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.intel-value {
  font-size: 13px;
  font-weight: 700;
}

.intel-compare {
  color: var(--text-muted);
  font-size: 12px;
}

.intel-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}

.intel-list li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--text-muted);
  font-size: 12px;
}

.intel-date {
  color: var(--text-dim);
  font-size: 11px;
}

.injury-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.injury-team {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.injury-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
}

.injury-meta {
  color: var(--text-dim);
  font-size: 11px;
}

.intel-list strong {
  color: var(--text);
}

.reasons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reasons li {
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 13px;
}

.idx {
  color: var(--brand);
  font-size: 10px;
  font-weight: 800;
}

.factors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.factor {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 12px;
}

.risk {
  border-color: rgba(244, 183, 64, 0.3);
  background: var(--warning-soft);
}

.risk p {
  color: #f5d089;
  font-size: 13px;
}

.result-line {
  font-size: 13px;
}

.result-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.hit {
  border-color: rgba(53, 224, 140, 0.35);
  background: rgba(53, 224, 140, 0.12);
  color: var(--home);
}

.miss {
  border-color: rgba(255, 92, 92, 0.35);
  background: var(--danger-soft);
  color: var(--danger);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  white-space: nowrap;
}

thead th {
  padding: 8px 10px;
  background: #050806;
  color: var(--text-muted);
  font-weight: 700;
  text-align: left;
}

thead th:first-child {
  border-radius: 5px 0 0 5px;
}

thead th:last-child {
  border-radius: 0 5px 5px 0;
}

tbody th,
tbody td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

tbody th {
  color: var(--text-dim);
  font-weight: 500;
}

tbody tr:last-child th,
tbody tr:last-child td {
  border-bottom: none;
}

.note {
  margin-top: 18px;
  color: var(--text-dim);
  font-size: 11px;
  text-align: center;
}

@media (max-width: 640px) {
  .scoreboard {
    padding: 16px 14px;
  }

  .summary {
    grid-template-columns: 1fr;
  }

  .metric {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .meter {
    width: 64px;
  }

  .teams {
    gap: 8px;
  }

  .name {
    font-size: 17px;
  }

  .score {
    font-size: 26px;
  }
}
</style>
