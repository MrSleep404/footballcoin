<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { DataNotFoundError, loadStats } from "../api/data";
import type { StatsFile } from "../types";
import { LEAGUE_COLOR, LEAGUE_NAME, formatGeneratedAt } from "../utils/format";
import StateEmpty from "../components/StateEmpty.vue";
import StateError from "../components/StateError.vue";

const stats = ref<StatsFile | null>(null);
const loading = ref(true);
const error = ref("");

const rows = computed(() => (stats.value?.byLeague ?? []).filter((item) => item.total > 0));

async function init() {
  loading.value = true;
  error.value = "";
  try {
    stats.value = await loadStats();
  } catch (cause) {
    stats.value = null;
    if (!(cause instanceof DataNotFoundError)) {
      error.value = cause instanceof Error ? cause.message : "加载失败";
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void init();
});
</script>

<template>
  <div class="stats">
    <header class="head">
      <span class="eyebrow">Accuracy</span>
      <h1>预测命中率</h1>
      <p>
        统计口径：已结束且存在赛前预测的比赛。胜负平按概率最高项判定，比分要求完全一致，数据随赛果回填自动更新。
      </p>
    </header>

    <div v-if="loading" class="cards">
      <div v-for="i in 3" :key="i" class="card kpi">
        <div class="skeleton" style="width: 52%; height: 11px"></div>
        <div class="skeleton" style="width: 38%; height: 28px; margin-top: 12px"></div>
      </div>
    </div>

    <StateError v-else-if="error" :message="error" @retry="init" />

    <StateEmpty
      v-else-if="!stats || stats.overall.total === 0"
      title="暂时还没有可统计的赛果"
      description="等首批比赛结束后，命中率会自动更新。"
    />

    <template v-else>
      <div class="cards">
        <section class="card kpi">
          <span class="label">已统计场次</span>
          <strong class="value numeric">{{ stats.overall.total }}</strong>
          <span class="sub">场</span>
        </section>
        <section class="card kpi">
          <span class="label">胜负平命中率</span>
          <strong class="value numeric accent">{{ stats.overall.outcomeRate }}<small>%</small></strong>
          <span class="sub numeric">{{ stats.overall.outcomeHit }} / {{ stats.overall.total }}</span>
          <span class="track" aria-hidden="true">
            <i :style="{ width: `${stats.overall.outcomeRate}%` }"></i>
          </span>
        </section>
        <section class="card kpi">
          <span class="label">比分命中率</span>
          <strong class="value numeric">{{ stats.overall.scoreRate }}<small>%</small></strong>
          <span class="sub numeric">{{ stats.overall.scoreHit }} / {{ stats.overall.total }}</span>
          <span class="track dim" aria-hidden="true">
            <i :style="{ width: `${stats.overall.scoreRate}%` }"></i>
          </span>
        </section>
      </div>

      <section class="card table-card">
        <h2>分联赛统计</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">联赛</th>
                <th scope="col">场次</th>
                <th scope="col">胜负平命中</th>
                <th scope="col">胜负平命中率</th>
                <th scope="col">比分命中</th>
                <th scope="col">比分命中率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.league">
                <td>
                  <span class="league">
                    <i :style="{ background: LEAGUE_COLOR[row.league] }" aria-hidden="true"></i>
                    {{ LEAGUE_NAME[row.league] ?? row.league }}
                  </span>
                </td>
                <td class="numeric">{{ row.total }}</td>
                <td class="numeric">{{ row.outcomeHit }}</td>
                <td class="numeric strong">{{ row.outcomeRate }}%</td>
                <td class="numeric">{{ row.scoreHit }}</td>
                <td class="numeric">{{ row.scoreRate }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p class="note">最近更新：{{ formatGeneratedAt(stats.updatedAt) }} / 仅供参考，不构成投注建议。</p>
    </template>
  </div>
</template>

<style scoped>
.stats {
  max-width: 900px;
  margin: 0 auto;
}

.head {
  margin-bottom: 18px;
}

.head h1 {
  margin-top: 2px;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 800;
  letter-spacing: -0.4px;
}

.head p {
  max-width: 640px;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 18px;
}

.label {
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.6px;
}

.value {
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
}

.value.accent {
  color: var(--brand);
}

.value small {
  margin-left: 1px;
  font-size: 14px;
  font-weight: 700;
}

.sub {
  color: var(--text-dim);
  font-size: 11px;
}

.track {
  display: block;
  width: 100%;
  height: 3px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-3);
}

.track i {
  display: block;
  height: 100%;
  background: var(--brand);
}

.track.dim i {
  background: var(--brand);
  opacity: 0.55;
}

.table-card {
  margin-top: 10px;
  padding: 16px 18px 18px;
}

.table-card h2 {
  margin-bottom: 10px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
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
  padding: 9px 12px;
  background: #050806;
  color: var(--text-muted);
  font-weight: 700;
  text-align: left;
}

thead th:first-child {
  border-radius: 6px 0 0 6px;
}

thead th:last-child {
  border-radius: 0 6px 6px 0;
}

tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover td {
  background: var(--surface-2);
}

tbody .strong {
  color: var(--brand);
  font-weight: 700;
}

.league {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.league i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.note {
  margin-top: 14px;
  color: var(--text-dim);
  font-size: 11px;
  text-align: center;
}

@media (max-width: 640px) {
  .cards {
    grid-template-columns: 1fr;
  }

  .kpi {
    padding: 13px 15px;
  }

  .value {
    font-size: 26px;
  }
}
</style>
