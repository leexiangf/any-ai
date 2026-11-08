# Unified discover（半自动采集）

把 Amp / Orca / Droid / Kimi 的「扫新插件」收成一条流水线：

```text
自动：GitHub 搜索 → 对照已收录 → 噪声过滤 → manifest 抽样校验 → 打分分档
人工：读 LATEST.md → 点名「上」→ list-batch / thicken / 部署
```

**不上架自动化**：安装命令与详情 rewrite 仍需人过一眼（防噪声、防误收录官方示例噪音）。

## Run

```powershell
$env:GITHUB_TOKEN = (gh auth token)
node scripts/discover/discover-all.mjs

# 只扫部分宿主
node scripts/discover/discover-all.mjs --hosts kimi,droid

# 少校验几个（更快）
node scripts/discover/discover-all.mjs --validate 12

# 不重跑 droid-discover（用现有 out/candidates.json）
node scripts/discover/discover-all.mjs --skip-droid-discover
```

## Output

| 文件 | 含义 |
| --- | --- |
| `ops/discover/latest.json` | 全量结构化结果（含 installs 草稿） |
| `ops/discover/LATEST.md` | 给人看的 P0/P1/P2 摘要 |
| `ops/discover/YYYY-MM-DD.json` | 当日快照 |

档位：

- **P0** — 已校验到可用 manifest，分数高 → 优先上架
- **P1** — 已校验，可第二批
- **P2 / noise** — 未校验或弱信号，默认不自动推荐

## 与旧脚本关系

| 旧 | 新 |
| --- | --- |
| `scripts/scan-new-plugins.mjs` | 被本脚本覆盖（可保留作对照） |
| `scripts/droid-discover/discover.mjs` | 仍由本脚本调用，结果并入 droid 桶 |
| `scripts/list-batch*.mjs` | 上架执行层；输入来自人工点名 / LATEST.md |

## Next（人工）

1. 打开 `ops/discover/LATEST.md`
2. 从 P0/P1 勾选
3. 说「上」或写进 batch 脚本 → thicken → 部署 → GSC

## Orca 加深搜

Orca 热度高时用深挖（分页 code search，默认校验最多 80）：

```powershell
$env:GITHUB_TOKEN = (gh auth token)
node scripts/discover/orca-deep.mjs
```

产出：`ops/discover/orca-deep.md` / `orca-deep.json`（已滤 launch-fork、空市集、已上架）。

## Orca 浅层可安装校验

上架 / 深挖之后跑一遍（仓库存在 + 可读到 `orca-plugin.json`）：

```powershell
$env:GITHUB_TOKEN = (gh auth token)
npm run verify:orca          # 全量
npm run verify:orca:new      # 只跑尚未标记的
```

产出：`ops/discover/orca-verify.json`，并回写 `catalog.json` 的 `installVerified*`，在列表标题旁与详情页标记 **Installable / 可安装**，附「已验证 / 不保证」说明。

**已验证**：GitHub 仓未归档，且能解析到 `orca-plugin.json`（或市场索引）。  
**不保证**：端内可见、运行正常、安全审核。

## Catalog stars（周期性刷新）

GitHub ★ 会变；目录页是静态 HTML，需脚本回写。

| 脚本 | 用途 |
| --- | --- |
| `npm run refresh:stars` | **日常**：只更新 `data-stars` / 显示数字（快） |
| `npm run refresh:stars:resolve` | 同上，并读详情页 Source（补 Amp monorepo ★0） |
| `npm run enrich:catalog` | 首次/重建：卡片结构 + toolbar + ★ |

```powershell
$env:GITHUB_TOKEN = (gh auth token)
npm run refresh:stars
# 或只刷一店
npm run refresh:stars -- --hosts amp,kimi
npm run refresh:stars -- --dry
```

快照：`ops/discover/stars-cache.json`。刷完后对有变动的店 `wrangler deploy`。

周期：Cursor `/loop 1d npm run refresh:stars`，或本机 Task Scheduler / cron 跑同一命令。
