import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// GitHub Actions 会注入 VITE_BASE；未注入时使用相对路径，适配任意子目录部署
export default defineConfig({
  base: process.env.VITE_BASE ?? "./",
  plugins: [vue()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
