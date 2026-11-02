# Badge outreach templates

Reusable copy for **Listed on {host}.aiaaii.com** backlink asks. Personalized batches live in `DRAFTS.md` (regenerate with the scripts below).

## Badge markdown (canonical)

| Host | Markdown |
| --- | --- |
| Amp | `[![Listed on amp.aiaaii.com](https://amp.aiaaii.com/badges/listed.svg)](https://amp.aiaaii.com/items/{owner}/{slug}/)` |
| Orca | `[![Listed on orca.aiaaii.com](https://orca.aiaaii.com/badges/listed.svg)](https://orca.aiaaii.com/items/{owner}/{slug}/)` |
| Droid | `[![Listed on droid.aiaaii.com](https://droid.aiaaii.com/badges/listed.svg)](https://droid.aiaaii.com/items/{owner}/{slug}/)` |
| Mall (optional) | `[![Listed on aiaaii.com](https://aiaaii.com/badges/listed.svg)](https://aiaaii.com/)` |

Prefer linking the **marketplace / primary listing** URL when a pack has several plugin pages.

## GitHub Issue (paste into *their* repo)

**Title**

```text
Optional: Listed on {host}.aiaaii.com badge for README
```

**Body**

```md
## Context

Hi! We independently listed **{title}** on the community **{Host} Plugin Market** (Any AI / AI-AAII — not affiliated with the host vendor).

Listing: {listing_url}

## Ask

If this looks correct, would you consider adding a README badge that links back to the listing? Optional — no obligation.

    {badge_markdown}

Preview: https://{host}.aiaaii.com/badges/listed.svg

## Notes

- Community directory only; install commands point at your public source.
- Corrections welcome (wrong one-liner, install path, or prefer noindex) — comment here or open https://github.com/leexiangf/any-ai/issues
- Mall: https://aiaaii.com/

Thanks for shipping public installable plugins.
```

## Email / DM

```text
Subject: Listed {title} on {host}.aiaaii.com — optional README badge

Hi {owner} team,

We published an independent community listing for **{title}** on {Host} Plugin Market (Any AI / AI-AAII; not affiliated with the host vendor):

{listing_url}

If accurate, you're welcome to drop this badge in the README (optional):

{badge_markdown}

Happy to fix anything that looks wrong. Reply here or file https://github.com/leexiangf/any-ai/issues

Thanks,
Any AI (aiaaii.com)
```

## Send rules

1. One message per **GitHub source repo** (not per plugin page).
2. Prefer GitHub Issue on the source repo; use email only if Issues are disabled.
3. Do not spam official host orgs first (Factory-AI / Stably) — Wave 3 in `TRACKING.csv`.
4. Mark `TRACKING.csv` → `sent` / `accepted` / `declined` / `skipped`.
5. Cap ~8–12 outreach/day to stay human.

## Regenerate

```bash
node scripts/badge-outreach/extract-listings.mjs
node scripts/badge-outreach/generate-drafts.mjs
```
