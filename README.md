# Any AI (AI-AAII)

**Any Agent Install Index** — community directories for niche AI agent hosts.

| 站 | 目录 | 域名 | CF |
|---|---|---|---|
| 商场总站 | `sites/www` | aiaaii.com | 单独 Project |
| Amp 店 | `sites/amp` | amp.aiaaii.com | 单独 Project |
| Orca 店 | `sites/orca` | orca.aiaaii.com | 单独 Project |

文档：`多宿主目录商场-立项文档.md` · 打法：`建站获流轮子.md`

## 本地预览（www）

```bash
npx --yes serve sites/www -p 4173
```

## 部署 Cloudflare Workers（静态 Assets）

本机已 `wrangler login` 后，在对应目录执行：

```bash
wrangler deploy --cwd sites/www    # Worker: aiaaii       → aiaaii.com / www.aiaaii.com
wrangler deploy --cwd sites/amp    # Worker: amp-aiaaii   → amp.aiaaii.com
wrangler deploy --cwd sites/orca   # Worker: orca-aiaaii  → orca.aiaaii.com
```

各目录有 `wrangler.toml` + `.assetsignore`（排除配置文件勿进 CDN）。
