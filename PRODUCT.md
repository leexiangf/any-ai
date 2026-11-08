# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are developers and power users of niche AI agent hosts (Amp, Orca, Droid, Kimi) who need to find community plugins and copy a real install command or marketplace flow.

Secondary audience: plugin authors who request listings and optionally add a README badge backlink. Design and IA prioritize finders/installers first.

## Product Purpose

Any AI (AI-AAII) is the Any Agent Install Index: community directories for niche AI agent hosts that mainstream catalogs under-serve.

It makes it possible to browse host-specific markets, open independently rewritten detail pages, and leave with a working install path — without treating upstream READMEs as the page.

Success means search exposure, detail-page clicks, and install-command copies.

## Positioning

A multi-host **install index**, not an official marketplace and not a mirrored awesome-list. Official products ship the agent; this product ships browseable, host-scoped install surfaces with real commands and programmatic detail pages. Neighboring directories cannot truthfully claim the same combination of: dedicated `{host}.aiaaii.com` markets, independent rewrites (not README mirrors), and explicit non-affiliation.

## Operating Context

- Mall home: `aiaaii.com` (Any AI / AI-AAII) — brand, market index, compare, Submit, About.
- One market per host subdomain: `amp.aiaaii.com`, `orca.aiaaii.com`, `droid.aiaaii.com`, `kimi.aiaaii.com` (and future hosts when open-market gates pass).
- Minimum market IA: `/`, `/items/`, `/items/{owner}/{slug}/`, `/categories/{slug}/`, `/guides/`, `/guides/{slug}/`, `/submit/`, `/about/`, plus sitemap/robots.
- Deploy model: one directory under `sites/{host|www}` → one Cloudflare project → one custom domain.
- Content ops: listing requests via GitHub issues; catalog/candidate JSON and scripts support discovery; detail pages rewritten from repo evidence.

## Capabilities and Constraints

- Static HTML/CSS sites (no app framework runtime in the shipped markets).
- Detail pages must be independent rewrites; do not mirror upstream README/description.
- Install blocks use only real host CLI / in-product marketplace flows; never invent commands.
- Empty or below-threshold markets stay noindex / offline until checklist thresholds are met.
- Community-maintained; not affiliated with Amp, Orca, Factory, Stably, Sourcegraph, Moonshot AI, Cursor, or any listed host vendor.
- Prefer upstream docs for authoritative APIs.
- Optional author badges link back to listed item pages.
- Undecided: news/blog layer and additional host markets remain optional expansions, not current product truth.

## Brand Commitments

| Asset | Value |
| --- | --- |
| Product name | **Any AI** |
| Domain | **aiaaii.com** (spoken **AI-AAII**) |
| AAII | **Any Agent Install Index** |
| One-liner | Any AI (AI-AAII) is the Any Agent Install Index: community directories for niche AI agent hosts. |
| Non-affiliation | Community-maintained; not affiliated with any listed host vendor. |

Exposure habit: logo / chrome show **Any AI** and **aiaaii.com** together so the brand is not guessable from the name alone. Host markets use shop names like “Amp Plugin Market” under the mall brand.

## Evidence on Hand

- Live mall and markets: [aiaaii.com](https://aiaaii.com), [amp](https://amp.aiaaii.com), [orca](https://orca.aiaaii.com), [droid](https://droid.aiaaii.com), [kimi](https://kimi.aiaaii.com).
- Repo sources: `README.md`, `sites/www`, `sites/{amp,orca,droid,kimi}`, `sites/_template`, host `styles.css` / `theme.js`, listing-request workflow linked from README.
- Writing playbooks under `docs/` for host detail pages (and adjacent reference docs for other site types — not claims about this product’s shipped stack).
- Do **not** fabricate testimonials, install counts, rankings, affiliation, or host-vendor endorsements.

## Product Principles

1. **Install truth over catalog vanity** — every detail page earns a real install path for that host.
2. **One host, one market, one sitemap** — keep search intent precise; don’t collapse hosts into a single muddy index.
3. **Rewrite, don’t mirror** — pages are independent products; upstream remains Source, not the body.
4. **Non-affiliation is visible** — community index language stays honest everywhere chrome and copy show.
5. **Measure what movers do** — optimize for search exposure, detail clicks, and command copies before secondary author-growth vanity.
