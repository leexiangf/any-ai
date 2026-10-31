# Shop template

Copy this folder to `sites/{host}/` when opening a new host shop on Any AI (AI-AAII).

## Placeholders

Replace every `{{TOKEN}}` before preview / deploy:

| Token | Example (Amp) | Example (Orca) |
| --- | --- | --- |
| `{{HOST}}` | `amp` | `orca` |
| `{{HOST_NAME}}` | `Amp` | `Orca` |
| `{{SHOP_NAME}}` | `Amp Plugin Market` | `Orca Plugin Market` |
| `{{DOMAIN}}` | `amp.aiaaii.com` | `orca.aiaaii.com` |
| `{{PRIMARY_KEYWORD}}` | `Amp plugin` | `Orca plugin` |
| `{{NOUN}}` / `{{NOUN_PLURAL}}` | `plugin` / `plugins` | `plugin` / `plugins` |
| `{{INSTALL_CMD}}` | `amp plugins add <url>` | Marketplace Add → install |
| `{{VENDOR}}` | `Amp / Sourcegraph` | `Orca / Stably` |
| `{{CATEGORY_SLUG}}` | `security` | `marketplaces` |
| `{{OWNER}}` / `{{SLUG}}` | `rsclarke` / `aws-…` | `stablyai` / `orca-plugins` |

## Minimum IA

```text
/  /items/  /items/{owner}/{slug}/  /categories/{slug}/
/guides/  /guides/{slug}/  /submit/  /about/
sitemap.xml  robots.txt  _headers  styles.css
```

Sample stubs live under `items/_sample/`, `categories/_sample/`, and two starter guides. Rename folders to real ids; delete unused samples before indexing.

## Open-shop checklist

1. Mini-canvas in `多宿主目录商场-立项文档.md` passes (§5 开店门槛).
2. `Copy-Item sites\_template sites\{host} -Recurse` then global-replace tokens.
3. Fill ≥3 real detail pages + ≥5 guides with **real** install commands (no invented CLI).
4. New Cloudflare Pages project → bind `{host}.aiaaii.com` → GSC + sitemap.
5. Empty shops stay **noindex** / offline until the threshold is met.
6. Link the shop from `sites/www` mall home when live.

## Item card markup (do not regress)

Badge sits **beside** the body, not under the title:

```html
<a class="item" href="/items/{owner}/{slug}/">
  <div class="item-body">
    <h2 class="item-name">…</h2>
    <p class="item-one">…</p>
    <p class="item-meta">…</p>
  </div>
  <span class="item-badge">category</span>
</a>
```

`styles.css` already uses flex + `item-body` / `item-badge`. Do not reintroduce `item-top`.
