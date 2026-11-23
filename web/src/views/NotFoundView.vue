<template>
  <div class="not-found">
    <p class="code numeric">404</p>
    <h1>页面不存在</h1>
    <p class="desc">链接可能已失效，或者输入了一个错误的地址。</p>
    <RouterLink class="btn" to="/">返回首页</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 80px 20px;
  text-align: center;
}

.code {
  color: var(--brand);
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -2px;
}

h1 {
  font-size: 19px;
  font-weight: 700;
}

.desc {
  color: var(--text-muted);
  font-size: 12px;
}

.btn {
  margin-top: 12px;
}
</style>
