# FootballCoin · 五大联赛赛前预测

纯静态的五大联赛赛前预测站。预测由独立的 Dify 工作流生成，数据以 JSON 文件提交到本仓库，GitHub Actions 校验后构建并部署到 GitHub Pages。

- 站点：Vite + Vue 3 + TypeScript，hash 路由，无后端
- 数据：`data/matches/{YYYY-MM-DD}.json`（Dify 直接写入）
- 积分榜：`data/standings.json`（随预测任务更新，页面入口 `/standings`）
- 发布：push 到 `main` → 校验 → 生成索引 → 构建 → 部署
- 详细设计：[docs/技术方案.md](docs/技术方案.md)
- Dify 工作流文件：[dify/workflow.yml](dify/workflow.yml)（可直接导入）
- Dify 配置说明：[dify/README.md](dify/README.md)

## 目录结构

```
├─ .github/workflows/deploy.yml    # 校验、构建、部署
├─ data/
│  ├─ matches/YYYY-MM-DD.json      # 预测数据（Dify 写入）
│  ├─ results/YYYY-MM-DD.json      # 赛果回填
│  └─ standings.json               # 五大联赛积分榜（Dify 写入）
├─ dify/                           # 工作流提示词、代码节点、配置手册
├─ docs/技术方案.md
├─ scripts/
│  ├─ validate.mjs                 # 数据校验（零依赖）
│  ├─ build-index.mjs              # 生成 index.json 与 stats.json
│  └─ sync-data.mjs                # 复制 data 到 web/public/data
└─ web/                            # 站点源码
```

## 本地开发

要求 Node.js 20+。

```bash
cd web
npm install
npm run dev
```

`predev` 会自动生成索引并把 `data/` 同步到 `web/public/data/`。

其他命令：

```bash
node scripts/validate.mjs        # 校验数据
node scripts/build-index.mjs     # 生成索引与命中率
cd web && npm run build          # 类型检查 + 构建
```

本地预览构建产物：`cd web && npm run preview`。

## 部署到 GitHub Pages

1. 在仓库 **Settings → Pages** 中把 Source 设为 **GitHub Actions**。
2. 默认分支保持 `main`。
3. 直接 push 代码与 `data/`，Actions 会自动发布。
4. 产物地址：`https://<user>.github.io/<repo>/`（用户主页仓库为根路径）。

`VITE_BASE` 由工作流根据仓库名自动计算，无需手动改配置。

## 数据更新

Dify 工作流通过 GitHub Contents API 直接写入 `data/matches/{date}.json`，不需要中转服务。所需变量：

| 变量 | 说明 |
| --- | --- |
| `GH_OWNER` | 仓库 owner |
| `GH_REPO` | 仓库名 |
| `GH_BRANCH` | 目标分支，通常 `main` |
| `GH_TOKEN` | fine-grained PAT，`Contents: Read and write` |

推送完成后 Actions 自动重新部署。页面会展示数据生成时间。

## 免责声明

本站预测由 AI 模型基于公开数据生成，仅供足球爱好者参考与娱乐，不构成任何投注建议。
数据来源：[football-data.org](https://www.football-data.org/)。
