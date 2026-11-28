<script setup lang="ts">
import { computed } from "vue";
import { formatGeneratedAt, isStale, relativeHours } from "../utils/format";

const props = defineProps<{
  generatedAt: string;
  degradedCount?: number;
  historical?: boolean;
}>();

const stale = computed(() => !props.historical && isStale(props.generatedAt));
</script>

<template>
  <div class="freshness" :class="{ warning: stale }">
    <div class="left">
      <span class="dot" aria-hidden="true"></span>
      <span v-if="stale">
        数据可能未更新：最后生成于 {{ formatGeneratedAt(generatedAt) }}（{{ relativeHours(generatedAt) }}）
      </span>
      <span v-else-if="historical">
        该日预测生成于 {{ formatGeneratedAt(generatedAt) }}（{{ relativeHours(generatedAt) }}）· 已定稿
      </span>
      <span v-else>
        数据生成于 {{ formatGeneratedAt(generatedAt) }}（{{ relativeHours(generatedAt) }}）· 每日更新，预测覆盖未来 3 天
      </span>
    </div>
    <div class="right">
      <span v-if="degradedCount" class="chip chip-warning">{{ degradedCount }} 场兜底</span>
    </div>
  </div>
</template>

<style scoped>
.freshness {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 11px;
}

.freshness.warning {
  border-color: rgba(244, 183, 64, 0.35);
  background: var(--warning-soft);
  color: var(--warning);
}

.left {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 0 3px rgba(199, 249, 75, 0.12);
  flex: none;
}

.warning .dot {
  background: var(--warning);
  box-shadow: 0 0 0 3px rgba(244, 183, 64, 0.12);
}

.right {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
