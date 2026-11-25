<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { Match } from "../types";
import { LEAGUE_COLOR, formatKickoffTime, outcomeFromScore } from "../utils/format";
import OddsRow from "./OddsRow.vue";
import TeamCrest from "./TeamCrest.vue";

const props = defineProps<{
  match: Match;
  date: string;
}>();

const outcomeHit = computed(() => {
  if (!props.match.result) return null;
  const actual = outcomeFromScore(props.match.result.homeGoals, props.match.result.awayGoals);
  return actual === props.match.prediction.pick;
});

const scoreHit = computed(() => {
  const result = props.match.result;
  const score = props.match.prediction?.score;
  if (!result || !score) return null;
  return score.home === result.homeGoals && score.away === result.awayGoals;
});

const scoreText = computed(() => {
  const result = props.match.result;
  if (result) return `${result.homeGoals} : ${result.awayGoals}`;
  return `${props.match.prediction.score.home} : ${props.match.prediction.score.away}`;
});

// 已有赛果时，卡片主比分改为实际比分，预测比分以小字并列显示
const predictedText = computed(() => {
  const score = props.match.prediction?.score;
  return score ? `${score.home} : ${score.away}` : "";
});

// 移动端列宽有限，队名按固定规则截断：超过 6 个字符保留前 5 个再补省略号
const isNarrow = ref(false);
let media: MediaQueryList | null = null;
const syncNarrow = () => {
  isNarrow.value = media?.matches ?? false;
};

onMounted(() => {
  media = window.matchMedia("(max-width: 640px)");
  syncNarrow();
  media.addEventListener("change", syncNarrow);
});

onBeforeUnmount(() => {
  media?.removeEventListener("change", syncNarrow);
});

const displayName = (name: string) => {
  if (!isNarrow.value) return name;
  const chars = Array.from(name);
  return chars.length > 6 ? `${chars.slice(0, 5).join("")}…` : name;
};
</script>

<template>
  <RouterLink
    class="match-card"
    :to="`/match/${date}/${match.id}`"
    :aria-label="`${match.home.name} 对阵 ${match.away.name}，${formatKickoffTime(match.kickoff)} 开赛`"
    :style="{ '--league': LEAGUE_COLOR[match.league] }"
  >
    <div class="side">
      <span class="league">
        <i aria-hidden="true"></i>
        {{ match.leagueName }}
      </span>
      <span class="time numeric">{{ formatKickoffTime(match.kickoff) }}</span>
      <span v-if="match.degraded" class="tag warn">兜底</span>
    </div>

    <div class="matchup">
      <div class="team">
        <TeamCrest :name="match.home.name" :crest="match.home.crest" :size="isNarrow ? 26 : 30" />
        <div class="team-text">
          <span class="name" :title="match.home.name">{{ displayName(match.home.name) }}</span>
          <span class="sub numeric">#{{ match.home.rank }} <span class="sep">/</span> 主</span>
        </div>
      </div>

      <div class="score">
        <span class="nums numeric">{{ scoreText }}</span>
        <span class="label">{{ match.result ? "赛果" : "预测比分" }}</span>
        <span v-if="match.result" class="predicted numeric">预测 {{ predictedText }}</span>
        <div v-if="match.result" class="hits">
          <span class="tag" :class="outcomeHit ? 'ok' : 'miss'" title="胜平负按概率最高项判断">
            胜平负 {{ outcomeHit ? "✓" : "✗" }}
          </span>
          <span class="tag" :class="scoreHit ? 'ok' : 'miss'" title="比分要求与预测完全一致">
            比分 {{ scoreHit ? "✓" : "✗" }}
          </span>
        </div>
      </div>

      <div class="team away">
        <TeamCrest :name="match.away.name" :crest="match.away.crest" :size="isNarrow ? 26 : 30" />
        <div class="team-text">
          <span class="name" :title="match.away.name">{{ displayName(match.away.name) }}</span>
          <span class="sub numeric">#{{ match.away.rank }} <span class="sep">/</span> 客</span>
        </div>
      </div>
    </div>

    <OddsRow class="odds" :prob="match.prediction.prob" :pick="match.prediction.pick" />

    <div class="conf">
      <span class="conf-label">信心度</span>
      <span class="conf-value numeric">{{ match.prediction.confidence }}</span>
      <span class="conf-bar" aria-hidden="true">
        <i :style="{ width: `${match.prediction.confidence}%` }"></i>
      </span>
    </div>

    <span class="arrow" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <path d="M3 8h9M8.5 3.5L13 8l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
  </RouterLink>
</template>

<style scoped>
.match-card {
  position: relative;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 292px 88px 14px;
  grid-template-areas: "side matchup odds conf arrow";
  align-items: center;
  gap: 14px;
  padding: 13px 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  transition: border-color 0.15s, background 0.15s;
}

.match-card::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--league);
  opacity: 0.55;
  content: "";
}

.match-card:hover {
  border-color: var(--border-strong);
  background: var(--surface-2);
}

.side {
  grid-area: side;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.league {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.league i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--league);
}

.time {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.tag {
  padding: 0 5px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 800;
  line-height: 15px;
  letter-spacing: 0.3px;
}

.tag.ok {
  background: rgba(53, 224, 140, 0.14);
  color: var(--home);
}

.tag.miss {
  background: var(--surface-2);
  color: var(--text-dim);
}

.tag.warn {
  background: var(--warning-soft);
  color: var(--warning);
}

.matchup {
  grid-area: matchup;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.team {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.team.away {
  flex-direction: row-reverse;
  text-align: right;
}

.team-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.team.away .team-text {
  align-items: flex-end;
}

.name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.sep {
  margin: 0 2px;
  opacity: 0.5;
}

.score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 74px;
}

.nums {
  font-family: var(--font-mono);
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.label {
  color: var(--text-dim);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.predicted {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.hits {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
  margin-top: 2px;
}

.odds {
  grid-area: odds;
}

.conf {
  grid-area: conf;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.conf-label {
  color: var(--text-dim);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.conf-value {
  color: var(--brand);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.1;
}

.conf-bar {
  display: block;
  width: 100%;
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-3);
}

.conf-bar i {
  display: block;
  height: 100%;
  background: var(--brand);
}

.arrow {
  grid-area: arrow;
  color: var(--text-dim);
}

.match-card:hover .arrow {
  color: var(--brand);
}

@media (max-width: 1024px) {
  .match-card {
    grid-template-columns: 88px minmax(0, 1fr) 88px;
    grid-template-areas:
      "side matchup conf"
      "odds odds odds";
    gap: 12px;
    padding: 14px 16px;
  }

  .arrow {
    display: none;
  }

  .conf {
    align-items: flex-end;
  }

  .conf-label {
    text-align: right;
  }
}

@media (max-width: 640px) {
  .match-card {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "side side"
      "matchup matchup"
      "odds odds"
      "conf conf";
    gap: 10px;
    padding: 12px 13px;
  }

  .side {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .time {
    font-size: 14px;
  }

  .side .league {
    margin-right: auto;
  }

  .team {
    gap: 6px;
  }

  .name {
    font-size: 13px;
    /* 已由脚本按字符数截断，不再叠加 CSS 省略号 */
    text-overflow: clip;
  }

  .nums {
    font-size: 18px;
  }

  /* 收窄中间比分列与列间距，把空间让给两侧队名 */
  .matchup {
    gap: 8px;
  }

  .score {
    max-width: 70px;
  }

  .conf {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .conf-label {
    order: 0;
  }

  .conf-value {
    order: 1;
    font-size: 15px;
  }

  .conf-bar {
    order: 2;
    flex: 1;
    width: auto;
  }
}

@media (max-width: 380px) {
  .team {
    gap: 4px;
  }

  .name {
    font-size: 12px;
  }
}

@media (max-width: 350px) {
  /* 极窄屏放不下「6 字」与「5 字 + 省略号」，退回浏览器省略号，避免硬裁切 */
  .name {
    text-overflow: ellipsis;
  }
}
</style>
