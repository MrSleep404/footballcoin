# 数据源与待办

> 最后更新：2026-11-24
> 关联文件：[workflow.yml](./workflow.yml)、[README.md](./README.md)、`FootballCoin 五大联赛预测-fixed.ifpkg`（本地文件，已被 .gitignore 忽略）

## 1. 已完成，待导入 Dify

**`RUN_MODE` 单工作流双链路**（预测 + 赛果回填）

| 模式 | 行为 |
| --- | --- |
| `predict` | 仅预测：不调用赛果接口 |
| `results` | 仅赛果：不拉赛程/积分榜、不调 LLM |
| `both`（默认） | 先预测、再回填赛果；留空按 `both` |

- 赛果数据源：`GET /v4/matches?status=FINISHED&dateFrom=&dateTo=`，**1 次请求**覆盖五大联赛
- 回看窗口：`LOOKBACK_DAYS = 5`（**不能超过 10 天，否则 400**）
- 写入位置：`data/results/{北京日期}.json`，id 规则与预测一致 `{league}-{BJdate}-{homeTLA}-{awayTLA}`
- 结束节点输出：`summary`（预测 + 赛果两段）、`files`（预测文件）、`resultFiles`（赛果文件）

**导入步骤**

1. Dify 导入 `FootballCoin 五大联赛预测-fixed.ifpkg`
2. 环境变量：填 `FD_TOKEN`、`GH_TOKEN`；确认 `RUN_MODE = both`、`GH_OWNER = MrSleep404`、`GH_REPO = footballcoin`
3. 定时建议（错开 1 分钟）：
   - 预测 `0 9 * * *`，`RUN_MODE=predict`
   - 赛果 `1 9 * * *`，`RUN_MODE=results`
4. 首次运行后确认 GitHub 出现 `data/results/*.json` 提交，CI 会自动重建索引

### 1.1 积分榜（已完成，待导入）

- 工作流新增「积分榜同步迭代」（读取 sha → 覆盖写入 `data/standings.json`），`RUN_MODE=results` 时自动跳过
- 「清洗与筛选」新增输出 `syncTasks`；新增按联赛覆盖的中文队名表 `TEAM_TLA_BY_LEAGUE`（2026-27 赛季 TLA 有变化，`FCB` 在德甲/西甲重名）
- 站点新增「积分榜」入口（`/standings`），欧战区前 4、降级区末 3 带色条
- 已用真实数据生成首份 `data/standings.json`（5 联赛全部球队）

### 1.2 欧冠接入（已完成，待导入）

- 新增环境变量 `COMPETITION_SET`：`domestic`（五大联赛）/ `europe`（欧冠）/ `all`
- 两个定时任务错开 1 分钟：09:00 五大联赛、09:01 欧冠；单次请求 10 次 / 2 次，均不超限流
- 积分榜写入改为「读取 → 合并本次赛事 → 写回」，两个任务不会互相覆盖
- 前端：`LeagueCode` 增加 `CL`，积分榜 Tab 增加「欧战」分组，欧冠配色 `#f5c451`
- 赛果回填白名单加入 `CL`；索引与统计的联赛列表加入「欧冠」
- 欧冠积分榜为 36 队单表（联赛阶段），`season.currentMatchday` 为空，轮次由未赛比赛推导
- **实测不可用**：欧联 EL 返回 403（免费套餐不含）；欧协联 football-data 返回 404（不提供）

## 2. 已实测的 football-data.org 结论（2026-11-24）

| 接口 | 结果 |
| --- | --- |
| `/v4/competitions/PL/matches` | 200，372KB，380 场（含已结束） |
| `/v4/competitions/PL/standings` | 200，5.7KB |
| `/v4/matches?competitions=PL,PD,SA,BL1,FL1&season=2026` | 200 但 **0 场**（`season` 被忽略，只取默认今天~明天） |
| `/v4/matches?competitions=...&dateFrom=2026-11-20&dateTo=2026-11-24&status=FINISHED` | 200，49KB，**48 场**（PL 10 / PD 10 / SA 10 / BL1 9 / FL1 9） |
| 同接口跨度 30 / 120 天 | 400 `Specified period must not exceed 10 days.` |

**结论**

- 赛程 + 积分榜保持「逐联赛」请求（5 × 2 = 10 次/分钟，正好打满）
- 赛果回填必须走 1 次合并请求，已验证可用
- 「一次拉五个联赛整赛季」不可行（10 天上限 + `season` 无效），不要改现有结构
- 免费套餐限流：10 次/分钟；token 目前有效

## 3. 搁置：伤病数据

**原因**：football-data 没有伤病接口；API-Football（api-sports.io）暂时访问不了。

| 用途 | 地址 |
| --- | --- |
| 官网 | https://www.api-football.com/ |
| 控制台（注册/拿 key/看额度） | https://dashboard.api-football.com/ |
| 文档 v3 | https://www.api-football.com/documentation-v3 |

**待验证**（拿到 key 后第一件事）

```
GET https://v3.football.api-sports.io/injuries?league=39&season=2026
Header: x-apisports-key: <key>
```

- 联赛 id：英超 39、西甲 140、意甲 135、德甲 78、法甲 61
- 免费版通常 100 次/天、10 次/分钟，但**可查赛季有限制**，2026 赛季可能取不到
- 若返回空/套餐错误 → 需要付费或放弃该项

**落地方式**（验证通过后）

- 位置：预测链路**前置**（伤病是 LLM 输入，不能放在预测之后）
- 频次：每联赛 1 次，共 5 次/天；走 API-Football 独立配额，不占 football-data 的 10 次/分钟
- 输出：`[{player, position, status}]`，缺失给空数组，prompt 中标注「未提供」

## 4. 待做（零成本、不需要新账号）

### 4.1 交手记录

- 零新增请求：`/v4/competitions/{code}/matches` 已返回整赛季，含已结束比分
- 在「清洗与筛选」节点里加 `h2h: {played, homeWins, draws, awayWins, last:[{date, score}]}`，取最近 3~5 次
- 不要用 `/v4/matches/{id}/head2head`：每场 1 次请求，必撞 10 次/分钟

### 4.2 天气（Open-Meteo，免 key）

```
https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&hourly=temperature_2m,precipitation_probability,wind_speed_10m&start_date=&end_date=&timezone=UTC
```

- 需要静态「场地 → 经纬度」表（五大联赛约 100 个球场，未知场地回退城市坐标）
- 只取开赛前 3 天内场次，按「城市 + 日期」去重；支持多坐标批量参数
- 权重放低：只影响体感/传控节奏

## 5. 虚构数据：已清理（2026-11-24）

- 已删除 `data/matches/2026-11-20.json`、`11-23`、`11-24` 与 `data/results/2026-11-20.json`
- 已重建索引：预测 6 个日期、赛果 4 个日期（11-21~11-24 为无预测文件的“孤儿”赛果，统计自动忽略）
- 命中率当前为 0 场，真实累计从有预测且有赛果的日期开始
- 遗留：11-25/26 是真实的欧冠比赛，原虚构文件已被覆盖；两者分属不同任务时不会再互相覆盖，见下条

**同日文件合并**：`data/matches/{date}.json` 已改为「读取现有 → 按 id 合并 → 写回」，五大联赛与欧冠两个定时任务写同一天时不再互相冲掉（新增节点「读取当天文件」「合并当天比赛」）。

## 6. 已知事项与提醒

- **EdgeOne 401**：`footballcoin-icouqhbp.edgeone.cool` 是预览部署，响应头 `X-EOP-MSG: eo_time missing`，需要签名参数；要长期访问请「提升为生产部署」或用 GitHub Pages
- **命中率会归零**：真实赛果会整文件覆盖 `data/results/2026-11-20.json`，属于预期行为
- **Token 安全**：FD token 与 GH token 都曾出现在对话/本地文本中，建议有空时重新生成
- **ifpkg 不入库**：`*.ifpkg`、`GH_token.txt` 已在 `.gitignore`，部署只依赖仓库里的 `data/` 与 `web/`

## 7. 常用命令

```bash
node scripts/validate.mjs        # 校验 data/ 下所有数据文件
node scripts/build-index.mjs     # 重建 index.json 与 stats.json
cd web && npm run build          # 构建前端（必须在 web/ 下执行）
```
