# 建站获流 · 页面与运营模板

写页、定字段、排节奏时用。占位符按用户赛道替换。

---

## 首页

**Title：** `{宿主全称} {品类复数} - {主词} {Market|Hub|Directory} {Install|Download}`

**模块顺序：**

1. H1（主词）  
2. 定义句（可作 snippet）  
3. 数字条（条目 / 验证 / 更新时间）  
4. 非官方声明  
5. 卖点 4～6  
6. 宿主科普 + 可选 Source  
7. 分类网格  
8. 三步上手（真实命令可复制）  
9. FAQ 8～15  
10. 信任（更新 / 审核 / 可溯源）  
11. 为什么存在（缺口叙事）  

**定义句：** `A {主词} {动词} {宿主} — {动作1} and {动作2} to {用户利益}.`  
**Source（有上游才用）：** `Source: {官方文档或仓库} — {篇名或锚点}`

---

## 目录 / 分类

**目录：** H1 数量+主词 · 筛选（分类/状态/排序） · 卡片（名/一句话/状态/热度/更新） · 短 FAQ  

**分类：** H1 `{分类名} {主词}` · 分类定义 · 列表 · 挑选 3 标准 · 链回总目录与教程  

---

## 详情页（程序化）

```text
Title: {条目名} - {一句话角色} | {站点品牌}
H1 / 导语(80–160字) / 安装块(主+备通道)
元数据: 作者 分类 版本 license 更新 源链接
正文: 结构化重写（禁止只贴上游 description）
兼容 / FAQ 6–10 / 页脚：源码链接 + independent rewrite 声明
```

无安装方式 → 不发布或 noindex。

---

## 教程

顺序：概念 → 安装 → 配置 → 使用 → 更新 → 卸载 → 排错 → 开发  

单篇：How to {动作} {主词} · 前置 · 步骤 · 成功标准 · 失败表 · 相关链 · Updated  

---

## Submit

1. 三步流程  2. 硬性 checklist  3. Issue/表单模板  
4. FAQ  5. Badge：

```markdown
[![Listed on {site}](https://{domain}/badges/listed.svg)](https://{domain}/items/{owner}/{slug})
```

---

## 供给飞轮字段

| 字段 | 用途 |
|---|---|
| slug / owner / name | URL、标题 |
| one-liner | 卡片、meta |
| category | 分类页 |
| install_command | 转化 |
| source_url | 溯源 |
| status | 筛选/信任 |
| updated_at | 新鲜度 |
| stars / license / platform | 排序展示 |

收录：公开 · 有安装/用法 · 有说明文档 · 不冒充官方。  
拒收/降权：空文档 · 无入口 · 仿官方名。

---

## 渠道要点

**GitHub README：** 搜索向标题 · Badge · 安装命令 · 回链官网 Submit · 链上游 · 可选社群  
**Release：** note 末行固定官网 URL  
**产品内：** 插件/扩展/CLI → 详情 URL 或 Open in browser  

---

## 90 天节奏

| 阶段 | 动作 |
|---|---|
| W1–2 | 域名/骨架/首页+目录/README/首批条目 |
| W3–6 | 教程 6–8 · FAQ10+ · 详情模板稳定 · Badge · Search Console |
| W7–12 | 产品内入口 · 周更 Release · 按查询词补长尾 |

日常：刷元数据 · 周更教程/排错 · 双周按 Search Console 新建意图页 · 月清死链  

Search Console：CTR 低→改 Title/定义句；有展示无页→新建；排错词→专页。

---

## 换赛道裁剪

| 形态 | 保留 | 可砍 | 必加 |
|---|---|---|---|
| 生态目录 | 全套 | — | 供给飞轮 |
| 纯教程 | 首页+教程+FAQ | 大程序化 | 清单型内链 |
| 开源工具 | GitHub+文档 | 大分类 | CLI/包名+对比 |
| SaaS | 意图首页+文档 | GitHub 飞轮 | 集成/模板目录 |
| 本地语言优先 | 对应 locale 路由 | 其它语言可延后 | 不单押单一搜索引擎 |
| 一城多店 | 每店全套目录 | 综合首页扛单宿主爆词 | 子域 + 每店 sitemap + 开店门槛 |

**一城多店：** `{brand}` 总站导航；`{host}.{brand}` 分店吃宿主主词。每子域独立 sitemap；空店不索引。工程：`sites/www` + `sites/{host}` **各目录单独部署 Cloudflare**。见《多宿主目录商场-立项文档.md》§2.2。

---

## 文案零件

```text
This project is community-maintained and not affiliated with {Official}.

{Official} builds the core. It does not run a public registry for {items}.
We collect, categorize, and verify community {items}.

Updated regularly. Human-reviewed when marked verified. Every entry links back to its source.

1. Install / open {host}
2. Add {item} with {command}
3. Browse {hub} by category or search

This page is an independent rewrite of the project's README — see the source repository for authoritative docs.
```
