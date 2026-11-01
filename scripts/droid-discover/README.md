# Droid marketplace discover

半自动扩目录：从官方 `Factory-AI/factory-plugins` 开放 PR + `seeds.json` 收集候选仓，校验是否存在

- `.factory-plugin/marketplace.json`（原生），或
- `.claude-plugin/marketplace.json`（Droid 兼容回落）

并对照 `sites/droid/items/` 标出 **尚未收录** 的候选。

## Run

```bash
# 建议带 token，否则 GitHub API 匿名限额很容易触顶
# PowerShell: $env:GITHUB_TOKEN="ghp_xxx"
node scripts/droid-discover/discover.mjs

# 只跑 seeds（不扫官方 PR，网络不稳时用）
node scripts/droid-discover/discover.mjs --seeds-only
```

## Output

| File | Meaning |
| --- | --- |
| `out/candidates.json` | 可收录候选（含安装命令草稿、`alreadyListed: false`） |
| `out/rejected.json` | 已收录 / 无 marketplace.json / 仓不存在 |

## Next（人工）

1. 打开 `candidates.json`，按 stars / PR 活跃度排序挑条目  
2. 核对 `install.add` / `install.install` 是否可用  
3. 按现有详情页模板写独立 rewrite（禁止镜像 README）  
4. 更新 `items/` 索引、sitemap、部署  

## Sample run (2026-11-01)

匿名限额下跑通 `prs+seeds`：扫到 15 仓 → **2 新候选**（`LambdaTest/mcp-server-guide`、`cursor/plugins`），其余多为已收录或无 marketplace.json。PR 文件列表中后半段曾 403，完整扫需 `GITHUB_TOKEN`。

## Notes

- 不执行第三方代码；只读 GitHub API + raw JSON。  
- 产品内「自动安装/类型检测」不在本脚本范围（见立项 §7.1）。  
- 可把新发现的仓继续加进 `seeds.json` 做回归。  
- `out/` 样例可提交；重新跑会覆盖。 
