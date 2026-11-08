/**
 * Build marketplaces/aiaaii-orca/orca-marketplace.json from sites/orca/catalog.json.
 *
 * Usage:
 *   node scripts/build-orca-marketplace.mjs
 *   node scripts/build-orca-marketplace.mjs --resolve-tags
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "marketplaces", "aiaaii-orca");
const CATALOG = path.join(ROOT, "sites", "orca", "catalog.json");
const PINS_CACHE = path.join(OUT_DIR, "pins-cache.json");
const RESOLVE_TAGS = process.argv.includes("--resolve-tags");

const MARKETPLACE = {
  name: "Any AI Orca Marketplace",
  owner: "leexiangf",
  homepage: "https://orca.aiaaii.com/",
};

function normalizeGitUrl(url) {
  if (!url) return null;
  let u = String(url).trim().replace(/\/$/, "");
  if (!u.endsWith(".git")) u += ".git";
  if (!/^https:\/\/github\.com\//i.test(u)) return null;
  return u;
}

function githubOwnerRepo(gitUrl) {
  const m = gitUrl.match(/github\.com\/([^/]+)\/([^/.]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

function isMarketplaceEntry(item) {
  const cat = String(item.category || "").toLowerCase();
  const slug = String(item.slug || "").toLowerCase();
  const name = String(item.name || "").toLowerCase();
  return (
    cat === "marketplaces" ||
    slug.includes("marketplace") ||
    /marketplace|plugins index|catalog/i.test(name)
  );
}

function loadPinsCache() {
  if (!fs.existsSync(PINS_CACHE)) return {};
  try {
    return JSON.parse(fs.readFileSync(PINS_CACHE, "utf8"));
  } catch {
    return {};
  }
}

async function resolveRef(owner, repo, cache) {
  const key = `${owner}/${repo}`;
  if (cache[key]?.ref) return cache[key].ref;

  if (!RESOLVE_TAGS) {
    cache[key] = { ref: "main", source: "default" };
    return "main";
  }

  try {
    const rel = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "aiaaii-orca-marketplace-builder",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
      }
    );
    if (rel.ok) {
      const j = await rel.json();
      const tag = j.tag_name;
      if (tag) {
        cache[key] = { ref: tag, source: "release" };
        return tag;
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const tags = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "aiaaii-orca-marketplace-builder",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
      }
    );
    if (tags.ok) {
      const arr = await tags.json();
      if (arr[0]?.name) {
        cache[key] = { ref: arr[0].name, source: "tag" };
        return arr[0].name;
      }
    }
  } catch {
    /* fall through */
  }

  cache[key] = { ref: "main", source: "fallback" };
  return "main";
}

function mapCategory(cat) {
  const c = String(cat || "commands-panels");
  const allowed = new Set([
    "themes",
    "languages",
    "icons",
    "editors",
    "commands-panels",
    "remote-vms",
    "keybindings",
    "syntax",
  ]);
  if (allowed.has(c)) return c;
  if (c === "terminal-themes") return "themes";
  if (c === "vm-recipes") return "remote-vms";
  if (c === "content-packs") return "commands-panels";
  return "commands-panels";
}

async function main() {
  if (!fs.existsSync(CATALOG)) {
    console.error("Missing", CATALOG);
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const items = Array.isArray(catalog.items) ? catalog.items : [];
  const pins = loadPinsCache();

  const candidates = items.filter((it) => {
    if (!it?.gitUrl || !it?.id) return false;
    if (isMarketplaceEntry(it)) return false;
    // Official seed catalog already ships in-app; keep this index community-focused.
    if (String(it.owner || "").toLowerCase() === "stablyai") return false;
    if (String(it.id).toLowerCase().startsWith("stablyai.")) return false;
    // Marketplace is the first install surface — only shallow-verified installable plugins.
    if (it.installVerified !== true) return false;
    return true;
  });

  const plugins = [];
  const skipped = [];

  for (const it of items) {
    if (!it?.gitUrl || !it?.id) continue;
    if (isMarketplaceEntry(it)) {
      skipped.push({ id: it.id, reason: "marketplace-entry" });
      continue;
    }
    if (String(it.owner || "").toLowerCase() === "stablyai" || String(it.id).toLowerCase().startsWith("stablyai.")) {
      skipped.push({ id: it.id, reason: "official-seed" });
      continue;
    }
    if (it.installVerified !== true) {
      skipped.push({
        id: it.id,
        reason: it.installVerified === false ? `unverified:${it.installVerifiedReason || "failed"}` : "unverified:pending",
      });
    }
  }

  for (const it of candidates) {
    const url = normalizeGitUrl(it.gitUrl);
    if (!url) {
      skipped.push({ id: it.id, reason: "bad-git-url" });
      continue;
    }
    const or = githubOwnerRepo(url);
    if (!or) {
      skipped.push({ id: it.id, reason: "parse-git" });
      continue;
    }

    let ref = typeof it.recommendedPin === "string" && it.recommendedPin !== "tag"
      ? it.recommendedPin
      : null;
    if (!ref) ref = await resolveRef(or.owner, or.repo, pins);

    plugins.push({
      id: it.id,
      source: {
        kind: "git",
        url,
        ref,
      },
      description: (it.description || it.name || it.id).slice(0, 280),
      categories: [mapCategory(it.category)],
    });
  }

  plugins.sort((a, b) => a.id.localeCompare(b.id));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(PINS_CACHE, JSON.stringify(pins, null, 2) + "\n", "utf8");

  const marketplace = {
    name: MARKETPLACE.name,
    owner: MARKETPLACE.owner,
    plugins,
  };

  const outJson = path.join(OUT_DIR, "orca-marketplace.json");
  fs.writeFileSync(outJson, JSON.stringify(marketplace, null, 2) + "\n", "utf8");

  const readme = `# Any AI Orca Marketplace

Community Orca plugin index maintained for [orca.aiaaii.com](https://orca.aiaaii.com/).

**Not affiliated with Orca / Stably.** Plugin APIs change often. Community packs are unreviewed — prefer pinned refs and read each repo before enabling.

## Add in Orca

1. Settings → Plugins → Marketplace sources (Manage sources)
2. Add marketplace
3. Paste:

\`\`\`
https://github.com/leexiangf/aiaaii-orca-marketplace.git
\`\`\`

4. Ref: \`main\`
5. After the source loads, install plugins from the list

## What’s in this repo

- \`orca-marketplace.json\` — index only (plugin code stays in each upstream repo)
- Generated from the Any AI Orca catalog; official \`stablyai\` listings are omitted (use the in-app / onorca.dev catalog for those)
- **Only plugins that passed shallow installable verify** (repo exists + parseable \`orca-plugin.json\`) are included. This does **not** guarantee runtime quality or security.

## Counts

- Plugins listed: **${plugins.length}**
- Skipped (unverified / official / marketplace-type): **${skipped.length}**
- Generated: ${new Date().toISOString()}

## Website

- Directory: https://orca.aiaaii.com/items/
- Guides: https://orca.aiaaii.com/guides/
`;

  fs.writeFileSync(path.join(OUT_DIR, "README.md"), readme, "utf8");

  const unverified = skipped.filter((s) => String(s.reason).startsWith("unverified"));
  console.log(
    JSON.stringify(
      {
        ok: true,
        plugins: plugins.length,
        skipped: skipped.length,
        skippedUnverified: unverified.length,
        resolveTags: RESOLVE_TAGS,
        out: outJson,
      },
      null,
      2
    )
  );
  if (unverified.length) {
    console.log(
      "skipped unverified",
      unverified.slice(0, 20).map((s) => `${s.id} (${s.reason})`)
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
