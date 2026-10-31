---
name: traffic-site-playbook
description: >-
  Plans, scaffolds, and audits traffic sites for hot ecosystems with an official
  gap (directory, tutorials, templates, marketplace layer). Runs the 建站获流
  workflow: canvas, naming triad, command-word SEO, intent IA, programmatic
  detail pages, GitHub/package channels, supply flywheel. Use when the user
  asks to 建站获流, design a 目录站/教程站/聚合站, do 程序化 SEO, plan multi-channel
  traffic (search + GitHub + package + in-product), or review a site against
  this playbook.
---

# 建站获流

可复用技能：帮用户（或任意仓库）把「宿主生态缺口层」做成可持续获流的站与分发。  
默认场景：**宿主已有热度，官方缺目录 / 教程 / 模板 / 市场层**。  
你是执行者，不是资料馆：按流程产出可落地的画布、命名、IA、页面稿、任务板；需要版式时用 [templates.md](templates.md)。

## 立刻做什么

1. 确认用户目标：规划 / 写页 / 审站 / 裁剪赛道。  
2. **从零或改定位** → 先填立项画布（缺项就问，不瞎填），不过关则停并说明卡点。  
3. **多宿主商场** → 总画布 + 每店迷你画布；一宿主一子域、每店独立 sitemap；**www 与各店一目录一 CF 部署**；开店门槛不过不开店。见仓库《多宿主目录商场-立项文档.md》。  
4. 通过后按序交付：命名三件套 → IA → 渠道与飞轮 → 90 天任务板。  
5. **写具体页面** → 套 [templates.md](templates.md)，禁止空壳详情页。  
6. **审现有站** → 对照下方硬规则与检查清单，只列缺口与改法。

输出用用户语言；结构清晰，可直接当 Todo 执行。

## 立项画布

```text
【宿主生态】
【官方已做】
【官方没做 / 做得散】
【我们占的一层】□目录 □对比 □教程 □模板 □镜像/聚合 □安装器/市场
【主搜索词】
【命令/API 词】（用户每天会敲的 CLI/API；可与主词重合）
【主词变体】
【数据从哪来】□公开 API □GitHub topic □包注册表 □RSS □用户提交 □人工
【上游文档可否引用】□有官方 docs 可 Source □无
【产品内入口】□插件 □扩展 □CLI □SDK □Bookmarklet □无
【90 天成功标准】展示 / 点击 / 回链 / 安装或订阅
```

**通过（建议全满足）：** 宿主有热度 · 真实缺口 · 主词可承载 · 条目可规模化 · 能声明非官方。

## 硬规则

1. **搜索 × 分发 × 供给** 至少规划两层；禁止只做单页改 Title。  
2. **命令/API 词优先于纯营销词**；无真实命令勿伪造。  
3. **详情页禁止镜像** 上游 README/description；必须结构化重写。  
4. **Source 行** 仅有可靠上游时使用；借信任，不冒充官方。  
5. **双语** 只作渠道分工；无语言数据勿当成排名策略。  
6. 不编造未验证手段（买链、玄学 Schema、空口竞品结论等）。

## 命名三件套

| 资产 | 规则 |
|---|---|
| 域名 | 尽量 exact / near-exact 主词 |
| GitHub Org + 核心仓 | Org ≈ 主词；Homepage → 官网 |
| 包名 | 安装命令里反复出现主词（若适用） |

另占 **日敲命令/API**：写入安装块、教程标题、FAQ 问句。

检查：口语=域名 · 关键词跨 Title/H1/Org/包描述一致 · non-affiliated 可见。

## 最小 IA 与内链

```text
/  /items  /items/{id}  /categories/{slug}
/guides  /guides/{slug}  /submit  /about  /{locale?}
```

首页 → 分类 + 教程 + Submit；详情 → 分类 + 教程 + 源码；FAQ 每答 ≥1 站内深链。

## 渠道最小集

| 渠道 | 必做 |
|---|---|
| 官网 | 意图矩阵 + 可索引详情 |
| GitHub | 搜索向 README + Badge + 安装命令 + 回链官网 |
| 包管理器 | 包名主词化（若适用） |
| 产品内 | 能做则做（市场入口 / Open in browser / CLI 打印 URL） |
| Submit | 收录条件 + Badge 反链代码 |

## 交付物模板（按需裁剪）

```markdown
## 画布结论
（通过/不通过 + 一句话缺口叙事）

## 命名
域名 / Org / 仓 / 包名 / 命令词

## IA
路由树 + 内链要点

## 渠道与飞轮
官网 / GitHub / 包 / 产品内 / Submit+Badge / 数据源

## 任务板
战略 · 资产 · MVP · 渠道 · 飞轮 · 运营（可勾选）
```

## 任务板清单

- **战略** 画布通过 · 缺口叙事一句话  
- **资产** 域名 · Org/仓 · 包名 · Search Console  
- **MVP** 首页 · 目录/分类/详情模板 · 教程≥5 · Submit+Badge · About · sitemap  
- **渠道** README 定稿 · Homepage · Release 含官网 · 产品内入口立项  
- **飞轮** 数据源 · 自动刷新 · 审核规则 · Badge 文档  
- **运营** 90 天节奏 · 每周 GSC：CTR 低改 Title；有展示无页则新建  

版式、字段、文案零件、赛道裁剪 → [templates.md](templates.md)。
