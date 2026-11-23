<script setup lang="ts">
import type { LeagueCode, LeagueOption } from "../types";
import { LEAGUE_COLOR } from "../utils/format";

const props = defineProps<{
  leagues: LeagueOption[];
  modelValue: LeagueCode | "ALL";
}>();

const emit = defineEmits<{
  "update:modelValue": [value: LeagueCode | "ALL"];
}>();

function select(value: LeagueCode | "ALL") {
  if (value !== props.modelValue) emit("update:modelValue", value);
}
</script>

<template>
  <div class="tabs" role="tablist" aria-label="按联赛筛选">
    <button
      type="button"
      role="tab"
      :aria-selected="modelValue === 'ALL'"
      class="tab"
      :class="{ active: modelValue === 'ALL' }"
      @click="select('ALL')"
    >
      全部
    </button>
    <button
      v-for="league in leagues"
      :key="league.code"
      type="button"
      role="tab"
      :aria-selected="modelValue === league.code"
      class="tab"
      :class="{ active: modelValue === league.code }"
      @click="select(league.code)"
    >
      <i class="dot" :style="{ background: LEAGUE_COLOR[league.code] }" aria-hidden="true"></i>
      {{ league.name }}
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 6px 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.tab:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.tab.active {
  border-color: var(--brand);
  background: var(--brand);
  color: var(--brand-ink);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.tab.active .dot {
  background: var(--brand-ink) !important;
}
</style>
