<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { FixtureMatch } from "../types";
import { LEAGUE_COLOR, formatKickoffTime } from "../utils/format";
import TeamCrest from "./TeamCrest.vue";

defineProps<{
  match: FixtureMatch;
}>();

// 与 MatchCard 保持一致：手机端超过 6 个字符显示前 5 字 + 省略号
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
  <div
    class="fixture-card"
    :style="{ '--league': LEAGUE_COLOR[match.league] }"
    :aria-label="`${match.home.name} 对阵 ${match.away.name}，${formatKickoffTime(match.kickoff)} 开赛，暂未生成预测`"
  >
    <div class="side">
      <span class="league">
        <i aria-hidden="true"></i>
        {{ match.leagueName }}
      </span>
      <span class="time numeric">{{ formatKickoffTime(match.kickoff) }}</span>
    </div>

    <div class="matchup">
      <div class="team">
        <TeamCrest :name="match.home.name" :crest="match.home.crest" :size="isNarrow ? 26 : 30" />
        <div class="team-text">
          <span class="name" :title="match.home.name">{{ displayName(match.home.name) }}</span>
          <span class="sub numeric">#{{ match.home.rank }} <span class="sep">/</span> 主</span>
        </div>
      </div>

      <div class="pending">
        <span class="pending-label">暂未预测</span>
        <span class="pending-note">赛前 3 天开放</span>
      </div>

      <div class="team away">
        <TeamCrest :name="match.away.name" :crest="match.away.crest" :size="isNarrow ? 26 : 30" />
        <div class="team-text">
          <span class="name" :title="match.away.name">{{ displayName(match.away.name) }}</span>
          <span class="sub numeric">#{{ match.away.rank }} <span class="sep">/</span> 客</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fixture-card {
  position: relative;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 13px 16px;
  overflow: hidden;
  border: 1px dashed var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.fixture-card::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--league);
  opacity: 0.25;
  content: "";
}

.side {
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
  opacity: 0.6;
}

.time {
  color: var(--text-muted);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.matchup {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.team {
  display: flex;
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
  color: var(--text-muted);
  font-size: 15px;
  font-weight: 700;
  text-overflow: clip;
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

.pending {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 86px;
}

.pending-label {
  color: var(--text-dim);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.pending-note {
  color: var(--text-dim);
  font-size: 9px;
  opacity: 0.8;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .fixture-card {
    grid-template-columns: 1fr;
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
  }

  .pending {
    min-width: 70px;
  }

  .pending-label {
    font-size: 11px;
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
</style>
