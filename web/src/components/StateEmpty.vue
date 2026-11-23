<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="state">
    <svg class="icon" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M16 9l4.5 3.2-1.7 5.3h-5.6L11.5 12.2z" fill="currentColor" />
    </svg>
    <h3>{{ title }}</h3>
    <p v-if="description" class="desc">{{ description }}</p>
    <div class="action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 20px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-card);
  background: var(--surface);
  text-align: center;
}

.icon {
  color: var(--text-dim);
}

h3 {
  font-size: 14px;
  font-weight: 700;
}

.desc {
  max-width: 380px;
  color: var(--text-muted);
  font-size: 12px;
}

.action {
  margin-top: 8px;
}

.action :deep(.btn) {
  display: inline-flex;
}
</style>
