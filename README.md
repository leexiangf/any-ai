# Any AI (AI-AAII)

**Any Agent Install Index** — community directories for niche AI agent hosts.

Official products ship the agent. We ship the **install index**: browse marketplace sources, copy real install commands, and discover plugins mainstream catalogs overlook.

🌐 **[aiaaii.com](https://aiaaii.com)** · Amp · Orca · Droid · Kimi

## Install commands we index

| Host | Add / discover | Install |
| --- | --- | --- |
| **Amp** | `amp plugins add <source>` | Amp plugin flows on [amp.aiaaii.com](https://amp.aiaaii.com) |
| **Orca** | Add marketplace source / pin | [orca.aiaaii.com](https://orca.aiaaii.com) · see [Orca marketplace source](#orca-marketplace-source) |
| **Droid** | `droid plugin marketplace add <git-url>` | `droid plugin install <plugin>@<marketplace> --scope user` → [droid.aiaaii.com](https://droid.aiaaii.com) |
| **Kimi** | `/plugins marketplace [json-url]` | `/plugins install <github-url>` → [kimi.aiaaii.com](https://kimi.aiaaii.com) |

## Markets

| Market | Listings | Site |
| --- | ---: | --- |
| **Amp Plugin Market** | 38 | [amp.aiaaii.com](https://amp.aiaaii.com) |
| **Orca Plugin Market** | 157 | [orca.aiaaii.com](https://orca.aiaaii.com) · [中文](https://orca.aiaaii.com/zh/) |
| **Droid Plugin Market** | 61 | [droid.aiaaii.com](https://droid.aiaaii.com) |
| **Kimi Plugin Market** | 46 | [kimi.aiaaii.com](https://kimi.aiaaii.com) |

Each host has its own subdomain: directory · categories · detail pages · guides · submit. Detail pages are **independent rewrites** (not mirrored READMEs).

## Orca marketplace source

Community **Git marketplace** for Orca (in-app “Marketplace sources”), separate from the website directory.

| | |
| --- | --- |
| **Repo** | [github.com/leexiangf/aiaaii-orca-marketplace](https://github.com/leexiangf/aiaaii-orca-marketplace) |
| **Add URL** | `https://github.com/leexiangf/aiaaii-orca-marketplace.git` |
| **Ref** | `main` |
| **Purpose** | Index of community Orca plugins that passed shallow installable verify (`orca-plugin.json` readable). Plugin code stays in each upstream repo. |
| **Scope** | Community packs only — official `stablyai` catalog entries are omitted (use Orca’s built-in / onorca.dev catalog for those). |
| **Not** | Not a security audit, not a runtime guarantee, **not affiliated** with Orca / Stably. |

### Add in Orca

1. **Settings → Plugins → Marketplace sources** (Manage sources)
2. **Add marketplace**
3. Paste: `https://github.com/leexiangf/aiaaii-orca-marketplace.git`
4. Ref: `main`
5. After the source loads, install plugins from the list

Monorepo copy used to build/sync this marketplace: [`marketplaces/aiaaii-orca/`](marketplaces/aiaaii-orca/). Website directory: [orca.aiaaii.com/items/](https://orca.aiaaii.com/items/) · guides: [how to add a marketplace source](https://orca.aiaaii.com/guides/how-to-add-marketplace-source/).

## For plugin authors

1. Public Git source + a clear install path (CLI, marketplace manifest, or documented pin).
2. Open a **[Listing request](https://github.com/leexiangf/any-ai/issues/new?template=listing-request.yml)**.
3. After listing, add a README badge (optional backlink):

```md
[![Listed on droid.aiaaii.com](https://droid.aiaaii.com/badges/listed.svg)](https://droid.aiaaii.com/items/{owner}/{slug}/)
```

Host badges: [amp](https://amp.aiaaii.com/submit/) · [orca](https://orca.aiaaii.com/submit/) · [droid](https://droid.aiaaii.com/submit/) · [kimi](https://kimi.aiaaii.com/submit/) · [mall](https://aiaaii.com/submit/)

## Brand

| | |
| --- | --- |
| Product | **Any AI** |
| Domain | **aiaaii.com** (AI-AAII) |
| AAII | **Any Agent Install Index** |

## Disclaimer

Community-maintained. **Not affiliated** with Amp, Orca, Factory, Stably, Sourcegraph, Moonshot AI, Cursor, or any listed host vendor. Prefer upstream docs for authoritative APIs.
