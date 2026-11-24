<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <header class="site-header">
    <div class="inner">
      <RouterLink to="/" class="brand">
        <span class="mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="20" height="20">
            <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M16 9.5l4 3-1.5 4.5h-5L12 12.5z" fill="currentColor" />
          </svg>
        </span>
        <span class="brand-text">
          <span class="brand-name">FootballCoin</span>
          <span class="brand-sub">五大联赛预测</span>
        </span>
      </RouterLink>

      <nav class="nav" aria-label="主导航">
        <RouterLink to="/" exact-active-class="active">预测</RouterLink>
        <RouterLink to="/standings" active-class="active">积分榜</RouterLink>
        <RouterLink to="/stats" active-class="active">命中率</RouterLink>
        <RouterLink to="/about" active-class="active">关于</RouterLink>
      </nav>

      <span class="live-chip">
        <i aria-hidden="true"></i>
        每日更新
      </span>
    </div>
  </header>

  <nav class="bottom-nav" aria-label="移动端导航">
    <RouterLink to="/" exact-active-class="active">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7" />
        <path d="M3 9h18M9 9v11" fill="none" stroke="currentColor" stroke-width="1.7" />
      </svg>
      <span>预测</span>
    </RouterLink>
    <RouterLink to="/standings" active-class="active">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 6h10M4 12h16M4 18h7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
      </svg>
      <span>积分榜</span>
    </RouterLink>
    <RouterLink to="/stats" active-class="active">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M5 20V11M12 20V5M19 20v-6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
      </svg>
      <span>命中率</span>
    </RouterLink>
    <RouterLink to="/about" active-class="active">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7" />
        <path d="M12 11v6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
        <circle cx="12" cy="7.6" r="1.1" fill="currentColor" />
      </svg>
      <span>关于</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--border);
  background: rgba(7, 11, 9, 0.86);
  backdrop-filter: blur(14px);
}

.inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: var(--max-width);
  height: var(--header-height);
  margin: 0 auto;
  padding: 0 16px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--brand);
  color: var(--brand-ink);
  flex: none;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}

.brand-name {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.brand-sub {
  color: var(--text-dim);
  font-size: 10px;
  letter-spacing: 1px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}

.nav a {
  padding: 5px 16px;
  border-radius: 7px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;
}

.nav a:hover {
  color: var(--text);
  background: var(--surface-2);
}

.nav a.active {
  background: var(--brand);
  color: var(--brand-ink);
}

.live-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  white-space: nowrap;
}

.live-chip i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 0 3px rgba(199, 249, 75, 0.15);
}

.bottom-nav {
  display: none;
}

@media (max-width: 720px) {
  .nav,
  .live-chip {
    display: none;
  }

  .bottom-nav {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--border);
    background: rgba(9, 14, 12, 0.96);
    backdrop-filter: blur(14px);
  }

  .bottom-nav a {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 6px 0;
    border-radius: 8px;
    color: var(--text-dim);
    font-size: 11px;
    font-weight: 600;
  }

  .bottom-nav a.active {
    color: var(--brand);
  }
}
</style>
