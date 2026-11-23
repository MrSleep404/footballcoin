import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// GitHub Actions 会注入 VITE_BASE；本地开发默认使用根路径
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [vue()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
