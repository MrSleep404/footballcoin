<script setup lang="ts">
defineProps<{
  message?: string;
}>();

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div class="state" role="alert">
    <div class="icon" aria-hidden="true">!</div>
    <h3>数据加载失败</h3>
    <p class="desc">{{ message ?? "请检查网络后重试。" }}</p>
    <button type="button" class="btn" @click="emit('retry')">重新加载</button>
  </div>
</template>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  text-align: center;
}

.icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--danger-soft);
  color: var(--danger);
  font-weight: 800;
}

h3 {
  font-size: 14px;
  font-weight: 700;
}

.desc {
  max-width: 420px;
  color: var(--text-muted);
  font-size: 12px;
}

.btn {
  margin-top: 8px;
}
</style>
