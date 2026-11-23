<script setup lang="ts">
import { computed } from "vue";
import type { Outcome } from "../types";
import { OUTCOME_LABEL } from "../utils/format";

const props = withDefaults(
  defineProps<{
    prob: Record<Outcome, number>;
    showLabels?: boolean;
    height?: number;
  }>(),
  { showLabels: true, height: 10 },
);

const ariaLabel = computed(
  () =>
    `主胜 ${props.prob.home}%，平局 ${props.prob.draw}%，客胜 ${props.prob.away}%`,
);
</script>

<template>
  <div class="prob">
    <div
      class="bar"
      role="img"
      :aria-label="ariaLabel"
      :style="{ height: `${height}px` }"
    >
      <span class="seg home" :style="{ width: `${prob.home}%` }"></span>
      <span class="seg draw" :style="{ width: `${prob.draw}%` }"></span>
      <span class="seg away" :style="{ width: `${prob.away}%` }"></span>
    </div>
    <div v-if="showLabels" class="legend">
      <span class="item"><i class="dot home"></i>{{ OUTCOME_LABEL.home }} {{ prob.home }}%</span>
      <span class="item"><i class="dot draw"></i>{{ OUTCOME_LABEL.draw }} {{ prob.draw }}%</span>
      <span class="item"><i class="dot away"></i>{{ OUTCOME_LABEL.away }} {{ prob.away }}%</span>
    </div>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  gap: 2px;
  width: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-3);
}

.seg {
  display: block;
  height: 100%;
  transition: width 0.3s ease;
}

.seg.home,
.dot.home {
  background: var(--home);
}

.seg.draw,
.dot.draw {
  background: var(--draw);
}

.seg.away,
.dot.away {
  background: var(--away);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 12px;
}

.item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
</style>
