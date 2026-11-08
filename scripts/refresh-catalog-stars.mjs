/**
 * Periodically refresh GitHub ★ on catalog cards (in-place).
 *
 * Does NOT rebuild card HTML / toolbars — only updates:
 *   data-stars="N"  and  <span class="item-stars-n">…</span>
 *
 * Usage (PowerShell):
 *   $env:GITHUB_TOKEN = (gh auth token)
 *   node scripts/refresh-catalog-stars.mjs
 *   node scripts/refresh-catalog-stars.mjs --hosts amp,kimi
 *   node scripts/refresh-catalog-stars.mjs --dry
 *   node scripts/refresh-catalog-stars.mjs --resolve-source   # Amp monorepo: read detail Source
 *
 * npm:
 *   npm run refresh:stars
 *   npm run refresh:stars -- --hosts droid
 *
 * Schedule examples:
 *   - Cursor: /loop 1d npm run refresh:stars
 *   - cron / Task Scheduler: run the node command daily, then deploy changed hosts
 *
 * Writes: ops/discover/stars-cache.json (last refresh snapshot)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITES = path.join(ROOT, "sites");
const CACHE_FILE = path.join(ROOT, "ops/discover/stars-cache.json");

const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const resolveSource = argv.includes("--resolve-source");
const hostsArg = argv.includes("--hosts") ? argv[argv.indexOf("--hosts") + 1] : null;
const HOSTS = hostsArg
  ? hostsArg.split(",").map((s) => s.trim()).filter(Boolean)
  : ["amp", "orca", "droid", "kimi"];

let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
if (!token) {
  try {
    token = execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch {
    /* optional */
  }
}

const apiCache = new Map(); // repoKey -> { stars, ok, at }

function fmtStars(n) {
  const x = Number(n) || 0;
  if (x >= 10000) return Math.round(x / 1000) + "k";
  if (x >= 1000) return (x / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(x);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchRepoStars(owner, repo) {
  const key = `${owner}/${repo}`.toLowerCase();
  if (apiCache.has(key)) return apiCache.get(key);

  try {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "aiaaii-refresh-stars",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    await sleep(token ? 35 : 350);
    if (r.status === 404) {
      const miss = { stars: 0, ok: false, at: new Date().toISOString() };
      apiCache.set(key, miss);
      return miss;
    }
    if (!r.ok) {
      const miss = { stars: 0, ok: false, at: new Date().toISOString(), status: r.status };
      apiCache.set(key, miss);
      return miss;
    }
    const j = await r.json();
    const hit = {
      stars: Number(j.stargazers_count) || 0,
      ok: true,
      at: new Date().toISOString(),
    };
    apiCache.set(key, hit);
    return hit;
  } catch (e) {
    const miss = { stars: 0, ok: false, at: new Date().toISOString(), error: String(e.message || e) };
    apiCache.set(key, miss);
    return miss;
  }
}

function sourceRepoFromDetail(host, owner, slug) {
  const detail = path.join(SITES, host, "items", owner, slug, "index.html");
  if (!fs.existsSync(detail)) return null;
  const html = fs.readFileSync(detail, "utf8");
  const m = html.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
}

function walkCatalogPages(host) {
  const out = [];
  const itemsIndex = path.join(SITES, host, "items", "index.html");
  if (fs.existsSync(itemsIndex)) out.push(itemsIndex);
  const catRoot = path.join(SITES, host, "categories");
  if (fs.existsSync(catRoot)) {
    for (const ent of fs.readdirSync(catRoot, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const f = path.join(catRoot, ent.name, "index.html");
      if (fs.existsSync(f)) out.push(f);
    }
  }
  return out;
}

/**
 * Update one <a class="item" …> block's stars in place.
 */
function patchCardStars(cardHtml, stars) {
  let out = cardHtml;
  const n = Number(stars) || 0;
  const label = `${n} GitHub stars`;
  out = out.replace(/\sdata-stars="\d+"/i, ` data-stars="${n}"`);
  if (!/\sdata-stars="/i.test(out)) {
    out = out.replace(/class="item"/i, `class="item" data-stars="${n}"`);
  }
  out = out.replace(
    /title="[^"]*GitHub stars"/i,
    `title="${label}"`
  );
  out = out.replace(
    /aria-label="[^"]*GitHub stars"/i,
    `aria-label="${label}"`
  );
  if (/class="item-stars-n"/.test(out)) {
    out = out.replace(
      /(<span class="item-stars-n">)[^<]*(<\/span>)/i,
      `$1${fmtStars(n)}$2`
    );
  }
  return out;
}

async function starsForListing(host, owner, slug) {
  let hit = await fetchRepoStars(owner, slug);
  if (hit.ok) return { ...hit, repo: `${owner}/${slug}`, via: "path" };

  if (resolveSource) {
    const src = sourceRepoFromDetail(host, owner, slug);
    if (src && `${src.owner}/${src.repo}`.toLowerCase() !== `${owner}/${slug}`.toLowerCase()) {
      hit = await fetchRepoStars(src.owner, src.repo);
      if (hit.ok) return { ...hit, repo: `${src.owner}/${src.repo}`, via: "source" };
    }
  }
  return { ...hit, repo: `${owner}/${slug}`, via: "path" };
}

async function refreshFile(file, host, stats) {
  let html = fs.readFileSync(file, "utf8");
  const cardRe = /<a class="item"[^>]*>[\s\S]*?<\/a>/gi;
  const cards = html.match(cardRe);
  if (!cards?.length) return false;

  let changed = 0;
  const next = [];

  for (const card of cards) {
    const href = (card.match(/href="(\/items\/[^"]+)"/i) || [])[1] || "";
    const m = href.match(/^\/items\/([^/]+)\/([^/]+)\/?$/);
    if (!m) {
      next.push(card);
      continue;
    }
    const owner = m[1];
    const slug = m[2];
    const prev = Number((card.match(/data-stars="(\d+)"/i) || [])[1] || 0);
    const hit = await starsForListing(host, owner, slug);
    const stars = hit.ok ? hit.stars : prev; // keep previous if API failed
    if (hit.ok && stars !== prev) changed++;
    stats.touched++;
    stats.byRepo[hit.repo] = hit.stars;
    next.push(patchCardStars(card, stars));
    if (hit.ok) {
      console.log(
        `  ${stars !== prev ? "↑" : "="} ${owner}/${slug} ${prev} → ${stars}` +
          (hit.via === "source" ? ` (via ${hit.repo})` : "")
      );
    } else {
      console.log(`  ? ${owner}/${slug} keep ${prev} (api miss)`);
    }
  }

  let i = 0;
  html = html.replace(cardRe, () => next[i++]);
  if (!dry && changed >= 0) fs.writeFileSync(file, html, "utf8");
  stats.files++;
  stats.changedCards += changed;
  return changed > 0;
}

async function main() {
  console.log(
    [
      `refresh-catalog-stars`,
      `hosts=${HOSTS.join(",")}`,
      `dry=${dry}`,
      `resolve-source=${resolveSource}`,
      `token=${token ? "yes" : "no"}`,
    ].join(" · ")
  );

  const stats = { files: 0, touched: 0, changedCards: 0, byRepo: {}, hosts: {} };
  const started = new Date().toISOString();

  for (const host of HOSTS) {
    console.log(`\n=== ${host} ===`);
    let hostChanged = 0;
    for (const file of walkCatalogPages(host)) {
      console.log(path.relative(ROOT, file));
      const c = await refreshFile(file, host, stats);
      if (c) hostChanged++;
    }
    stats.hosts[host] = { pagesTouched: walkCatalogPages(host).length, pagesWithDiff: hostChanged };
  }

  const cache = {
    refreshedAt: started,
    finishedAt: new Date().toISOString(),
    dry,
    resolveSource,
    hosts: HOSTS,
    files: stats.files,
    cards: stats.touched,
    changedCards: stats.changedCards,
    repos: stats.byRepo,
  };

  if (!dry) {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
    console.log(`\nWrote ${path.relative(ROOT, CACHE_FILE)}`);
  }

  console.log(
    `\nDone. files=${stats.files} cards=${stats.touched} changed=${stats.changedCards}` +
      (dry ? " (dry — no writes)" : "")
  );
  console.log("Next: deploy hosts with changes, e.g. wrangler deploy in sites/{host}");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
