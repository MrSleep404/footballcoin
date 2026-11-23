<script setup lang="ts">
import type { Outcome } from "../types";

defineProps<{
  prob: Record<Outcome, number>;
  pick: Outcome;
}>();

const ITEMS: { key: Outcome; label: string }[] = [
  { key: "home", label: "主胜" },
  { key: "draw", label: "平局" },
  { key: "away", label: "客胜" },
];
</script>

<template>
  <div class="odds" role="group" aria-label="胜平负概率">
    <div
      v-for="item in ITEMS"
      :key="item.key"
      class="cell"
      :class="[item.key, { picked: pick === item.key }]"
    >
      <span class="label">
        <i class="dot" aria-hidden="true"></i>
        {{ item.label }}
      </span>
      <span class="value numeric">{{ prob[item.key] }}<small>%</small></span>
      <span class="hint">{{ pick === item.key ? "倾向" : "\u00A0" }}</span>
    </div>
  </div>
</template>

<style scoped>
.odds {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-2);
  transition: border-color 0.15s, background 0.15s;
}

.label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.home .dot {
  background: var(--home);
}

.draw .dot {
  background: var(--draw);
}

.away .dot {
  background: var(--away);
}

.value {
  font-size: 16px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.2px;
}

.value small {
  margin-left: 1px;
  color: var(--text-dim);
  font-size: 9px;
  font-weight: 600;
}

.hint {
  color: var(--brand);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.6px;
  line-height: 12px;
}

.cell.picked {
  border-color: rgba(199, 249, 75, 0.5);
  background: var(--brand-soft);
}

.cell.picked .value {
  color: var(--brand);
}

.cell.picked .label {
  color: var(--text);
}
</style>
