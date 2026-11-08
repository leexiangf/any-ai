# Any AI Orca Marketplace

Community Orca plugin index maintained for [orca.aiaaii.com](https://orca.aiaaii.com/).

**Not affiliated with Orca / Stably.** Plugin APIs change often. Community packs are unreviewed — prefer pinned refs and read each repo before enabling.

## Add in Orca

1. Settings → Plugins → Marketplace sources (Manage sources)
2. Add marketplace
3. Paste:

```
https://github.com/leexiangf/aiaaii-orca-marketplace.git
```

4. Ref: `main`
5. After the source loads, install plugins from the list

## What’s in this repo

- `orca-marketplace.json` — index only (plugin code stays in each upstream repo)
- Generated from the Any AI Orca catalog; official `stablyai` listings are omitted (use the in-app / onorca.dev catalog for those)
- **Only plugins that passed shallow installable verify** (repo exists + parseable `orca-plugin.json`) are included. This does **not** guarantee runtime quality or security.

## Counts

- Plugins listed: **103**
- Skipped (unverified / official / marketplace-type): **54**
- Generated: 2026-11-08T07:24:15.094Z

## Website

- Directory: https://orca.aiaaii.com/items/
- Guides: https://orca.aiaaii.com/guides/
