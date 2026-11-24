<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    name: string;
    crest?: string;
    size?: number;
  }>(),
  { crest: "", size: 18 },
);

const failed = ref(false);
watch(
  () => props.crest,
  () => {
    failed.value = false;
  },
);

const initial = computed(() => (props.name || "?").trim().slice(0, 1) || "?");
</script>

<template>
  <img
    v-if="crest && !failed"
    class="crest"
    :src="crest"
    alt=""
    :width="size"
    :height="size"
    loading="lazy"
    decoding="async"
    @error="failed = true"
  />
  <span
    v-else
    class="crest fallback"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.round(size * 0.5)}px`,
    }"
    aria-hidden="true"
  >
    {{ initial }}
  </span>
</template>

<style scoped>
.crest {
  flex: 0 0 auto;
  object-fit: contain;
}

.fallback {
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-muted);
  font-weight: 700;
  line-height: 1;
}
</style>
