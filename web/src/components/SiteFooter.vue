<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <footer class="site-footer">
    <div class="inner">
      <div class="brand-row">
        <span class="mark" aria-hidden="true">FC</span>
        <span class="brand">FootballCoin</span>
        <span class="tag">AI 赛前预测</span>
      </div>
      <p class="disclaimer">
        本站预测由 AI 模型基于公开数据生成，仅供足球爱好者参考与娱乐，不构成任何投注建议。足球比赛存在高度不确定性，请理性看待预测结果。
      </p>
      <div class="meta">
        <span>数据来源：football-data.org、API-Football、The Odds API、Open-Meteo</span>
        <span aria-hidden="true">/</span>
        <RouterLink to="/about">方法与免责声明</RouterLink>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 28px 16px 36px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.mark {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--surface-3);
  color: var(--brand);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.brand {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.tag {
  padding: 1px 7px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-dim);
  font-size: 10px;
}

.disclaimer {
  color: var(--text-dim);
  font-size: 12px;
  line-height: 1.8;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: var(--text-dim);
  font-size: 12px;
}

.meta a {
  color: var(--text-muted);
}

.meta a:hover {
  color: var(--brand);
}

@media (max-width: 640px) {
  .inner {
    padding-bottom: 28px;
  }
}
</style>
