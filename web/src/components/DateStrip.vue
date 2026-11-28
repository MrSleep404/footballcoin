<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { isToday, monthDayLabel, weekdayLabel } from "../utils/format";

const props = defineProps<{
  dates: string[];
  modelValue: string;
  /** 已生成预测的日期；未包含的日期在日期条上淡化显示 */
  predictedDates?: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const strip = ref<HTMLElement | null>(null);

function isPending(date: string) {
  const predicted = props.predictedDates;
  if (!predicted || predicted.length === 0) return false;
  return !predicted.includes(date);
}

function centerActive(behavior: ScrollBehavior) {
  const box = strip.value;
  const item = box?.querySelector<HTMLElement>(".day.active");
  if (!box || !item) return;
  const left = Math.max(0, item.offsetLeft - (box.clientWidth - item.offsetWidth) / 2);
  if (behavior === "smooth") box.scrollTo({ left, behavior });
  else box.scrollLeft = left;
}

watch(
  () => props.modelValue,
  () => {
    void nextTick(() => centerActive("smooth"));
  },
);

onMounted(() => {
  void nextTick(() => centerActive("auto"));
});
</script>

<template>
  <div ref="strip" class="strip" role="tablist" aria-label="按日期筛选">
    <button
      v-for="date in dates"
      :key="date"
      type="button"
      role="tab"
      class="day"
      :class="{ active: date === modelValue, pending: isPending(date) }"
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
  padding: 8px 6px 8px 2px;
  scrollbar-color: var(--border-strong) transparent;
  scrollbar-width: thin;
  scroll-behavior: smooth;
}

.strip::-webkit-scrollbar {
  height: 4px;
}

.strip::-webkit-scrollbar-track {
  background: transparent;
}

.strip::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--border-strong);
}

@media (max-width: 640px) {
  .strip {
    scrollbar-width: none;
  }

  .strip::-webkit-scrollbar {
    display: none;
  }
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

/* 只有赛程、尚未生成预测的日期 */
.day.pending:not(.active) {
  border-style: dashed;
  color: var(--text-dim);
  opacity: 0.55;
}

.day.pending.active {
  border-style: dashed;
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
