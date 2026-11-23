<script setup lang="ts">
import { isToday, monthDayLabel, weekdayLabel } from "../utils/format";

defineProps<{
  dates: string[];
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <div class="strip" role="tablist" aria-label="按日期筛选">
    <button
      v-for="date in dates"
      :key="date"
      type="button"
      role="tab"
      class="day"
      :class="{ active: date === modelValue }"
      :aria-selected="date === modelValue"
      @click="emit('update:modelValue', date)"
    >
      <span class="week">{{ weekdayLabel(date) }}</span>
      <span class="md numeric">{{ monthDayLabel(date) }}</span>
      <span v-if="isToday(date)" class="today">今天</span>
    </button>
  </div>
</template>

<style scoped>
.strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 2px 8px;
  scrollbar-width: none;
}

.strip::-webkit-scrollbar {
  display: none;
}

.day {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 64px;
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-dim);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.day:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.day.active {
  border-color: var(--brand);
  background: var(--brand);
  color: var(--brand-ink);
}

.week {
  font-size: 11px;
  font-weight: 600;
}

.md {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.3px;
}

.today {
  position: absolute;
  top: -6px;
  right: -4px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--brand);
  color: var(--brand-ink);
  font-size: 9px;
  font-weight: 800;
  line-height: 14px;
}

.day.active .today {
  background: var(--brand-ink);
  color: var(--brand);
}
</style>
