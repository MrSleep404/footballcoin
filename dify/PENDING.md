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

## 3. 伤病数据：已接入（免费版按日期，覆盖次日）

**实测结论（2026-11-24，Free 套餐，100 次/天、10 次/分钟）**

| 请求 | 结果 |
| --- | --- |
| `injuries?league=39&season=2026` | ❌ `Free plans do not have access to this season, try from 2022 to 2024` |
| `injuries?date=2026-11-25` | ✅ 141 条、30 支球队，**一次覆盖当天全部联赛（含欧冠）** |
| `injuries?date=2026-11-26` | ❌ `try from 2026-11-23 to 2026-11-25`（免费版只有今天 ±1 天） |

- `season` 参数在免费版完全不可用，只能按 `date` 查
- 窗口是滚动的前后各 1 天，所以只能给「明天」的场次提供伤病
- 需要环境变量 `API_FOOTBALL_KEY`（secret），来自 dashboard.api-football.com

**工作流实现**

- `联赛列表` 新增输出 `injuryDate`（UTC 明天）
- 新增 `拉取伤病`（GET `https://v3.football.api-sports.io/injuries?date={{injuryDate}}`，Header `x-apisports-key`）
- 新增 `整理伤病`：把 141 条记录按球队聚合成 `{teams: {规范化队名: [{player, type, reason}]}}`，队名做去重音/去后缀/别名归一（`Bayern München → bayern munich`、`Club Brugge KV → brugge`）
- `生成比赛提示词` 新增 `injuries`、`injury_date` 两个输入：只有**开赛 UTC 日期 == injuryDate** 才注入伤病，其余场次输出「仅提供 X 名单，本场日期不同，未提供」
- 单场提示词加入「伤病情况」两行；system prompt 同步改为「伤病只使用输入中的伤病情况，未提供时不得编造」

**注意**

- 覆盖范围只有次日，7 天预测里只有临近 1 天的场次带伤病，属于预期
- `RUN_MODE=results` 时仍会多发 1 次伤病请求（用于获取 injuryDate），可忽略
- 若 `API_FOOTBALL_KEY` 留空，HTTP 节点会收到 401，需先填 key 再运行

## 4. 已接入（零成本）

### 4.1 交手记录

- 零新增请求：`/v4/competitions/{code}/matches` 已返回整赛季，含已结束比分
- 在「清洗与筛选」里新增 `_h2h()`，每场比赛输出 `h2h: {played, homeWins, draws, awayWins, last:[{date, home, away, score}]}`，最近 5 次
- 口径：`homeWins` 指本场主队获胜次数
- 不要用 `/v4/matches/{id}/head2head`：每场 1 次请求，必撞 10 次/分钟

### 4.2 天气（Open-Meteo，免 key）

- 新增「天气计划」→「拉取天气」→「合并天气」三节点，插在「清洗与筛选」和「积分榜同步迭代」之间
- 天气计划：按 `联赛:TLA` 查内置球场城市坐标表（五大联赛 + 常见欧战球队），多坐标一次批量请求，最多 40 个点
- 请求：`http://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&hourly=temperature_2m,precipitation_probability,wind_speed_10m&timezone=UTC&forecast_days=8`
  - 用 HTTP 而非 HTTPS：Dify 侧走 squid 代理时，到该站点的 TLS 握手会偶发 `The handshake operation timed out`（实测代理日志为 10s 只传 39 字节）。HTTP 端点实测 40 坐标仅 0.6s / 246KB
  - 节点超时放宽为 connect 20s / read 45s
- 合并：按开赛 UTC 小时匹配 `hourly.time`，给每场比赛写入 `weather: {temp, precip, wind}`
- 未覆盖的球队（无坐标）不写入 `weather`，提示词显示「未提供」
- 提示词新增「交手记录」「天气」两行；system prompt 要求只使用输入字段

### 4.3 博彩公司赔率（The Odds API，免费 500 次/月）

**定位**：赔率是「市场共识」，不能直接当答案；用途是作为特征 + 对照基准（市场对胜负平的判断通常比纯模型更准）。页面上并列展示「模型 / 市场」两组概率，比单纯提升准确率更有说服力。

**前端已预留**：`Match.market = {bookmaker?, capturedAt?, prob:{home,draw,away}}`，详情页「赛前情报」会在有数据时展示市场概率与模型概率对照；无数据时整块隐藏，不影响现有页面。

| 来源 | 费用 | 覆盖 | 说明 |
| --- | --- | --- | --- |
| The Odds API | 免费 500 次/月（约 16 次/天） | 五大联赛 + 欧冠 | 起步首选，按联赛一次拿全轮 |
| football-data.org | 付费套餐 | 五大联赛 + 欧冠 | 与现有 token 同源，免费版无 odds |
| API-Football | 付费（约 €19/月起） | 五大联赛 + 欧冠 | `/odds` 支持多公司、初盘/临场 |
| 博彩公司官网/聚合站 | 免费 | — | 无公开 API，抓取违反 ToS，不用 |

**接口**（注册：https://the-odds-api.com/ ，免费版无需信用卡）

```
GET https://api.the-odds-api.com/v4/sports/{sport_key}/odds/?apiKey=xxx&regions=eu&markets=h2h
```

- 赛事 key：`soccer_epl`、`soccer_spain_la_liga`、`soccer_italy_serie_a`、`soccer_germany_bundesliga`、`soccer_france_ligue_one`、`soccer_uefa_champs_league`
- 频次：每联赛 1 次，五大联赛 + 欧冠 = 6 次/天，免费额度足够
- 抓取时机：赛前 3~6 小时取一次（临场盘信息量最大）

**处理方式**

1. 去水：`1/赔率` 归一化为「市场概率」，与模型概率并列
2. 进 prompt 当特征；模型与市场分歧大时要求说明理由
3. 前端详情页展示「模型 / 市场」两组概率，命中率页增加「模型 vs 市场」对比
4. 字段契约扩展：`data/matches` 新增 `market: { bookmaker, capturedAt, odds:{home,draw,away}, prob:{home,draw,away} }`，同时改前端类型、详情页、校验脚本

**合规提醒**：个人使用没问题；公开站点展示第三方赔率需遵守 The Odds API 的署名与再分发条款，上线前先看 ToS。

**建议路径（MVP）**：先用 The Odds API 免费额度做「五大联赛 + 欧冠、每天 6 次、只取 h2h」的 MVP，跑一周看它和模型的实际偏差，再决定要不要付费升级到 football-data 同源。

### 4.4 近期新闻（结论：暂不做）

暂不引入新闻作为分析依据，原因：

- **信息重叠**：新闻里最有用的伤停/停赛已被伤病方案覆盖，换帅频次极低
- **幻觉风险**：长文本、时效强、真伪混杂（转会传闻、口水话），最容易让模型“编造依据”
- **成本不低**：需额外抓取 + 一次 LLM 摘要（每队每天 1 次），或人工筛选
- **实体匹配**：英文队名/别名与现有 TLA 体系对不上，容易张冠李戴
- **效率更低**：赔率（4.3）本身就是新闻的聚合结果，且直接是概率形式

若以后确实要加，只做「结构化球队新闻」：从俱乐部官网/权威媒体 RSS 取标题，用关键词规则抽取「停赛 / 伤缺 / 换帅 / 罢训」四类事件，命中才写入 prompt，并声明「仅这些事件，未列出不代表不存在」。

### 4.5 分析要素优先级

1. 交手记录（已接入，4.1）
2. 天气（已接入，4.2）
3. 赔率（免费额度，4.3）
4. 伤病（已接入，免费版仅覆盖次日，见第 3 节）
5. 新闻（暂不做，4.4）

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
