<template>
  <div class="about">
    <header class="head">
      <span class="eyebrow">How it works</span>
      <h1>关于本站</h1>
      <p>一个纯静态的五大联赛与欧冠赛前预测展示站，预测由独立的 Dify 工作流生成。</p>
    </header>

    <section class="block">
      <h2>预测是怎么来的</h2>
      <ol class="steps">
        <li>
          <span class="idx numeric">01</span>
          <div>
            <strong>采集</strong>
            <p>
              每天从 football-data.org 拉取五大联赛与欧冠的赛程、积分榜与赛果，并补充伤停名单（API-Football）、
              赛前赔率（The Odds API）与开赛天气（Open-Meteo）；欧联与欧协联免费套餐不开放，暂不覆盖。
            </p>
          </div>
        </li>
        <li>
          <span class="idx numeric">02</span>
          <div>
            <strong>计算特征</strong>
            <p>整理排名、近 5 场状态、赛季进失球与主客场表现。</p>
          </div>
        </li>
        <li>
          <span class="idx numeric">03</span>
          <div>
            <strong>模型推理</strong>
            <p>逐场调用大模型，输出胜平负概率、预测比分、信心度与理由。</p>
          </div>
        </li>
        <li>
          <span class="idx numeric">04</span>
          <div>
            <strong>校验与兜底</strong>
            <p>检查概率之和与字段完整性；失败时用排名先验兜底并标记。</p>
          </div>
        </li>
        <li>
          <span class="idx numeric">05</span>
          <div>
            <strong>发布</strong>
            <p>结果以 JSON 写入仓库，由 GitHub Actions 校验、生成索引并部署。</p>
          </div>
        </li>
      </ol>
    </section>

    <section class="block">
      <h2>指标说明</h2>
      <dl class="defs">
        <div>
          <dt>胜平负概率</dt>
          <dd>三项为整数，合计 100%，表示模型对三种赛果的相对倾向，不是确定结论。</dd>
        </div>
        <div>
          <dt>预测比分</dt>
          <dd>模型给出的最可能比分，仅作参考，命中难度远高于胜负平。</dd>
        </div>
        <div>
          <dt>信心度</dt>
          <dd>0–100 的模型自评，越高表示数据越充分、判断越稳定；高于 80 的情况较少。</dd>
        </div>
        <div>
          <dt>兜底估计</dt>
          <dd>模型未返回有效结果时，使用联赛排名差估算概率，信心度会被压低，参考价值有限。</dd>
        </div>
        <div>
          <dt>市场概率</dt>
          <dd>来自 The Odds API 的多家博彩公司赛前赔率，去除抽水后归一化取均值，仅用于与模型判断对照。</dd>
        </div>
        <div>
          <dt>命中率</dt>
          <dd>比赛结束后按“概率最高项”判断胜平负是否命中，比分要求完全一致。</dd>
        </div>
      </dl>
    </section>

    <section class="block">
      <h2>更新频率</h2>
      <p class="text">
        工作流每天运行一次，覆盖未来 7 天的比赛。页面顶部会展示数据的生成时间；如果超过 48
        小时没有更新，会出现提示。赛果通常在赛后次日回填。
      </p>
    </section>

    <section class="block">
      <h2>数据来源</h2>
      <dl class="defs">
        <div>
          <dt>football-data.org</dt>
          <dd>赛程、积分榜、赛果，以及由近两个赛季结果计算的历史交锋记录。</dd>
        </div>
        <div>
          <dt>API-Football</dt>
          <dd>伤停名单。免费套餐按日期查询、只覆盖次日，更远的场次显示“未提供”。</dd>
        </div>
        <div>
          <dt>The Odds API</dt>
          <dd>赛前胜平负赔率，取多家博彩公司均值并去除抽水，仅用于与模型概率对照。</dd>
        </div>
        <div>
          <dt>Open-Meteo</dt>
          <dd>开赛时的气温、降水概率与风速，按主队主场坐标查询。</dd>
        </div>
        <div>
          <dt>ESPN / Sky Sports / Football Italia / Get German Football News（RSS）</dt>
          <dd>与参赛球队相关的足球资讯标题与摘要，仅做聚合展示，点击跳转原文。</dd>
        </div>
      </dl>
    </section>

    <section class="block">
      <h2>免责声明</h2>
      <p class="text">
        本站预测由 AI 模型基于公开数据自动生成，仅供足球爱好者参考与娱乐，不构成任何投注建议。
        足球比赛存在高度不确定性，模型可能出错；请勿将预测结果作为任何财务决策的依据。
      </p>
      <p class="text">
        数据来源：football-data.org、API-Football、The Odds API、Open-Meteo、ESPN / Sky Sports / Football Italia / Get German Football News。
        本站不提供赛事直播、赔率交易或任何形式的投注服务。
      </p>
    </section>
  </div>
</template>

<style scoped>
.about {
  max-width: 820px;
  margin: 0 auto;
}

.head {
  margin-bottom: 16px;
}

.head h1 {
  margin-top: 2px;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 800;
  letter-spacing: -0.4px;
}

.head p {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.block {
  margin-bottom: 10px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
}

h2 {
  margin-bottom: 12px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.steps li {
  display: flex;
  gap: 12px;
}

.idx {
  flex: none;
  color: var(--brand);
  font-size: 11px;
  font-weight: 800;
  line-height: 20px;
}

.steps strong {
  display: block;
  font-size: 13px;
}

.steps p {
  margin-top: 1px;
  color: var(--text-muted);
  font-size: 12px;
}

.defs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
}

.defs dt {
  font-size: 12px;
  font-weight: 700;
}

.defs dd {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
}

.text {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.8;
}

.text + .text {
  margin-top: 8px;
}

@media (max-width: 640px) {
  .defs {
    grid-template-columns: 1fr;
  }
}
</style>
