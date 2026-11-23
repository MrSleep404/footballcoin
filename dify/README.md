# Dify 工作流配置手册

本目录提供可直接导入 Dify 的工作流文件 [workflow.yml](workflow.yml)，以及提示词与代码节点参考。

**工作流行为**：每天定时运行一次，拉取五大联赛赛程与积分榜，逐场调用 LLM 生成预测，然后通过 GitHub Contents API 把未来 7 天的数据直接写入仓库的 `data/matches/{YYYY-MM-DD}.json`。

> `workflow.yml` 已按 Dify 1.18 的 DSL `0.7.0` 结构、graphon `0.8.0` 节点模型对齐。实现细节以该文件为准；第 3、4 节是节点说明，便于导入后核对和排查。

## 0. 导入步骤

1. Dify 工作室 → 创建空白应用 → **导入 DSL 文件** → 选择 `dify/workflow.yml`。
2. 导入后打开工作流，填写 7 个环境变量（见第 2 节）。
3. 打开「单场预测」LLM 节点，把模型改成你环境里已配置的模型（默认写的是 `openai / gpt-4o-mini`）。
4. **Dify 1.x 额外两步**：添加「触发器 → 定时触发」节点并连到「联赛列表」（见第 6 节）；确认日期迭代、HTTP 节点的参数符合预期。
5. 确认仓库里存在 `data/matches/` 目录（本项目自带 mock 数据，目录已存在；若全部删除请保留一个 `.gitkeep`）。
6. 手动运行一次，检查 GitHub 是否出现 `data/matches/{日期}.json` 提交。

> 文件按 DSL `0.7.0`（Dify 1.18）编写，导入时不应再出现「版本较低」提示。若你的实例版本更高，仍建议导入后核对节点参数；若更低，请升级或告知我版本号。

如导入时报错，请把 Dify 版本和报错信息（或从你的实例导出一个空工作流 DSL）发我，我按你的实际版本对齐。

## 1. 前置准备

| 项 | 说明 |
| --- | --- |
| Dify 版本 | 支持 Workflow、迭代节点、代码节点、HTTP 请求节点；最好支持定时触发 |
| football-data.org Token | 免费注册后在个人中心获取 `X-Auth-Token` |
| GitHub PAT | fine-grained token，仅授权目标仓库，权限 `Contents: Read and write` + `Metadata: Read` |
| 仓库 | 默认分支为 `main`，`data/matches/` 目录可写 |

## 2. 工作流变量

在工作流设置的「环境变量 / 密钥」中创建：

| 变量名 | 示例 | 说明 |
| --- | --- | --- |
| `FD_TOKEN` | `xxxxxxxx` | football-data.org Token |
| `GH_OWNER` | `yourname` | 仓库 owner |
| `GH_REPO` | `footballcoin` | 仓库名 |
| `GH_BRANCH` | `main` | 目标分支 |
| `GH_TOKEN` | `github_pat_xxx` | GitHub PAT |
| `MODEL_NAME` | `gpt-4o-mini` | 写入数据文件 `model` 字段的模型名 |
| `SYNC_TO_GITHUB` | `true` | 同步开关：`true` 推送到 GitHub；`false` 只在运行结果中输出文件内容，供本地测试 |

如果当前 Dify 版本不支持工作流环境变量，请升级，或改用「开始节点输入变量」并在每次运行前手动/通过 API 传入（注意输入值会出现在运行日志中）。

## 3. 节点清单

按顺序创建，节点名建议保持一致，便于对照。

| # | 节点名 | 类型 | 输出 |
| --- | --- | --- | --- |
| 1 | 开始 | 开始 / 定时触发 | — |
| 2 | 联赛列表 | 代码 | `leagues` |
| 3 | 联赛迭代 | 迭代（输入 `leagues`，并发 1） | `leagueResults` |
| 4 | 拉赛程 | HTTP | `fixtures` |
| 5 | 拉积分榜 | HTTP | `standings` |
| 6 | 清洗与筛选 | 代码 | `days`、`matchTotal`、`leagueErrors` |
| 7 | 日期迭代 | 迭代（输入 `days.days`，并发 1） | 单个日期 |
| 8 | 比赛迭代 | 迭代（输入当日 `matches`，并发 3） | 单场比赛 |
| 9 | 单场预测 | LLM | `text` |
| 10 | 校验与兜底 | 代码 | `match`、`degraded` |
| 11 | 组装文件 | 代码 | `contentBase64`、`commitMessage`、`content`、`file` |
| 11A | 是否同步到 GitHub | IF/ELSE（日期迭代内） | 读取 `SYNC_TO_GITHUB`，决定是否继续写入 |
| 11B | 跳过同步 | 代码（日期迭代内） | 关闭同步时的占位分支 |
| 12 | 查询 sha | HTTP（GET） | `status_code`、`body` |
| 13 | 解析 sha | 代码 | `sha` |
| 14 | 条件分支 | IF/ELSE | — |
| 15A | 覆盖提交 | HTTP（PUT，带 sha） | 提交结果 |
| 15B | 新建提交 | HTTP（PUT，不带 sha） | 提交结果 |
| 16 | 结束 | 结束 | 运行统计 |

> 迭代节点可以嵌套，也可以按「日期迭代 → 内部比赛迭代」拆开。关键是每一层只处理一种集合，避免在代码节点里做大循环。

## 4. 节点落地细节

### 4.1 联赛列表（代码）

```python
def main() -> dict:
    return {"leagues": ["PL", "PD", "SA", "BL1", "FL1"]}
```

### 4.2 拉赛程（HTTP）

```
GET https://api.football-data.org/v4/competitions/{{item}}/matches?dateFrom={{dateFrom}}&dateTo={{dateTo}}
Header  X-Auth-Token: {{env.FD_TOKEN}}
```

- `dateFrom` = 今天减 45 天，`dateTo` = 今天加 10 天，可用代码节点预先算好。
- 超时 30 秒；失败重试 1 次。
- 免费版限流 10 次/分钟，联赛迭代并发设为 1。

### 4.3 拉积分榜（HTTP）

```
GET https://api.football-data.org/v4/competitions/{{item}}/standings
Header  X-Auth-Token: {{env.FD_TOKEN}}
```

### 4.4 清洗与筛选（代码）

- 代码见 [code/normalize_fixtures.py](code/normalize_fixtures.py)。
- 输入变量名 `league_results`，值为联赛迭代的输出数组；每个元素包含 `code`、`fixtures`、`standings`（变量名以 Dify 面板实际显示为准）。
- 代码节点内已内置队名映射；[team_names.json](team_names.json) 是同一份映射的便于编辑版本，新增球队时两边保持同步，键为 football-data.org 的 `tla`，缺失时回退英文名。

### 4.5 单场预测（LLM）

- System Prompt 见 [prompts/system.md](prompts/system.md)。
- User Prompt 见 [prompts/user.md](prompts/user.md)，按变量填入比赛信息。
- 文档中的 `{{home.name}}` 只是占位示意；在 Dify 的提示词编辑器中请用变量选择器插入实际引用（通常形如 `{{#node_id.field#}}`）。
- 参数：temperature `0.2`，max_tokens `600`，模型支持时开启 JSON 输出。
- 失败重试 1 次（仅网络错误），解析失败不重试，交给校验节点兜底。
- 节点已设置「异常处理 → 默认值」（`text` 为空串）：额度不足、超时等错误不会中断整个迭代，而是走排名先验兜底，`degraded` 标记为 `true`。

### 4.6 校验与兜底（代码）

- 代码见 [code/validate_prediction.py](code/validate_prediction.py)。
- 输入：`raw_text`（LLM 输出）、`match`（比赛迭代项，对象或 JSON 字符串）。
- 输出：`match`（合并了 prediction 的完整比赛对象）、`degraded`（布尔）。
- 兜底时同样输出 2 条 reasons，满足数据校验规则。

### 4.7 组装文件（代码）

- 代码见 [code/build_payload.py](code/build_payload.py)。
- 输入：`date`、`matches`（当日校验后的比赛数组）、`model`、`degraded_count`。
- 输出：`contentBase64`、`commitMessage`、`byteSize`、`content`（明文 JSON）、`file`（`{date, content, byteSize}`）。
- `contentBase64` 直接用于 HTTP 节点请求体，不要再加前缀或换行。

### 4.7.1 同步开关（本地测试）

- `SYNC_TO_GITHUB` 为字符串，只有填小写 `true` 才会写入 GitHub；其他值（含 `false`、空值）一律跳过。
- 关闭后不会调用任何 GitHub 接口，`结束` 节点会输出 `files` 数组，每项包含 `date`、`content`、`byteSize`。
- 本地测试步骤：把 `files[].content` 保存为 `data/matches/{date}.json`，然后在 `web/` 下执行 `npm run build`（会重新生成索引并复制数据），最后 `npm run preview`。
- 开关是环境变量，修改后对下一次运行生效，不需要重新导入 DSL；定时任务同样适用，不会因为缺少输入而失败。

### 4.8 查询目录并解析 sha（HTTP GET + 代码）

```
GET https://api.github.com/repos/{{env.GH_OWNER}}/{{env.GH_REPO}}/contents/data/matches?ref={{env.GH_BRANCH}}
Authorization: Bearer {{env.GH_TOKEN}}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

- 超时 20 秒。
- 返回的是目录下文件数组，不区分目标文件是否存在，因此不会因为文件不存在返回 404。
- 前提：`data/matches/` 目录已存在；目录缺失会 404，需要先提交一个文件或 `.gitkeep`。

### 4.9 解析 sha（代码）

- 代码见 [code/extract_sha.py](code/extract_sha.py)。
- 输入：目录列表 `body`、目标 `date`；输出：`sha`（未找到时为空字符串）。
- 在数组中按 `name == "{date}.json"` 匹配。

### 4.10 条件分支

- 条件：`sha` 不为空 → 分支 A（覆盖）；为空 → 分支 B（新建）。

### 4.11 写入文件（HTTP PUT）

```
PUT https://api.github.com/repos/{{env.GH_OWNER}}/{{env.GH_REPO}}/contents/data/matches/{{date}}.json
Authorization: Bearer {{env.GH_TOKEN}}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
Content-Type: application/json
```

分支 A（文件已存在）：

```json
{
  "message": "{{commitMessage}}",
  "content": "{{contentBase64}}",
  "branch": "{{env.GH_BRANCH}}",
  "sha": "{{sha}}"
}
```

分支 B（新文件，**不要出现 sha 字段**）：

```json
{
  "message": "{{commitMessage}}",
  "content": "{{contentBase64}}",
  "branch": "{{env.GH_BRANCH}}"
}
```

## 5. 首次联调

1. 单独运行「联赛列表 → 联赛迭代 → 拉赛程」三个节点，确认能拿到 5 个联赛的数据。
2. 运行到「清洗与筛选」，检查 `days` 是否覆盖未来 7 天、`matchTotal` 是否合理。
3. 跑完整流程，确认 GitHub 出现 `data/matches/{date}.json` 提交。
4. 检查 GitHub Actions 是否被触发、Pages 是否更新。
5. 同一天再次运行，确认仓库中仍然只有一个同名文件（覆盖更新）。

## 6. 定时触发

- Dify 1.x：定时能力已独立为触发器节点。添加「触发器 → 定时触发」（Schedule Trigger），cron `0 9 * * *`、时区 `Asia/Shanghai`，连到「联赛列表」；原有「开始」节点保留作手动运行入口。
- Dify 0.x：可在开始节点直接选择定时触发。
- 两种方式都不支持时：用 GitHub Actions 的 `schedule` 调 Dify 的 `POST /v1/workflows/run`（需要 Dify API Key，存 GitHub Secrets），或使用任意外部 cron 服务。注意这条链路只是触发工作流，数据仍然由 Dify 直接推送到 GitHub。

## 7. 常见问题

| 问题 | 处理 |
| --- | --- |
| 404 中断工作流 | 把查询 sha 节点的错误处理改成「失败时继续」并映射为空 sha |
| 422 写入失败 | 新建分支里误带了空 `sha` 字段，删除该字段 |
| 中文变成 `\uXXXX` | 代码节点使用 `ensure_ascii=False` + UTF-8 |
| 概率之和不等于 100 | 校验节点会归一化，若仍失败检查 prompt 是否被改动 |
| 某联赛无数据 | 检查该联赛迭代的错误输出，其他联赛会继续提交 |
| 不想写入仓库只想本地测试 | 把 `SYNC_TO_GITHUB` 设为 `false`，从结束节点的 `files` 复制数据 |
| 队名是英文 | 在 `team_names.json` 补充对应 `tla`，重新粘贴到代码节点 |
| 运行时间过长 | 把比赛迭代并发从 3 调到 5；不要提高联赛迭代并发 |
