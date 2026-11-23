<script setup lang="ts">
import type { FormResult } from "../types";

defineProps<{
  form: FormResult[];
  label?: string;
}>();

const TITLES: Record<FormResult, string> = {
  W: "胜",
  D: "平",
  L: "负",
};

function describe(form: FormResult[]): string {
  if (form.length === 0) return "暂无近期战绩";
  return `近 ${form.length} 场：${form.map((item) => TITLES[item]).join("、")}`;
}
</script>

<template>
  <div class="form" :aria-label="describe(form)">
    <span v-if="label" class="label">{{ label }}</span>
    <span v-for="(item, index) in form" :key="index" class="dot" :class="item.toLowerCase()">
      {{ item }}
    </span>
    <span v-if="form.length === 0" class="empty">—</span>
  </div>
</template>

<style scoped>
.form {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.label {
  margin-right: 4px;
  color: var(--text-dim);
  font-size: 11px;
}

.dot {
  display: inline-grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 4px;
  color: var(--brand-ink);
  font-size: 9px;
  font-weight: 800;
  line-height: 1;
}

.w {
  background: var(--home);
}

.d {
  background: var(--draw);
}

.l {
  background: #ff6b5e;
}

.empty {
  color: var(--text-dim);
}
</style>
