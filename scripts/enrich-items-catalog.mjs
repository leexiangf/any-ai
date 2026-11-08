/**
 * Enrich host /items/ (and category) grids with GitHub stars + catalog toolbar.
 *
 * Usage:
 *   $env:GITHUB_TOKEN = (gh auth token)
 *   node scripts/enrich-items-catalog.mjs
 *   node scripts/enrich-items-catalog.mjs amp kimi
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITES = path.join(ROOT, "sites");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const HOSTS = args.length ? args : ["amp", "orca", "droid", "kimi"];

let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
if (!token) {
  try {
    token = execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch {
    /* optional */
  }
}

const STAR_SVG = `<svg class="item-star-icon" viewBox="0 0 16 16" aria-hidden="true" width="12" height="12"><path fill="currentColor" d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.92L8 10.77l-3.52 1.85.67-3.92L2.3 5.64l3.94-.57L8 1.5z"/></svg>`;

const TOOLBAR = `        <div class="catalog-toolbar">
          <label class="catalog-search">
            <span class="visually-hidden">Search plugins by name</span>
            <input type="search" id="catalog-q" name="q" placeholder="Search by name…" autocomplete="off" enterkeyhint="search" />
          </label>
          <label class="catalog-sort">
            <span class="visually-hidden">Sort plugins</span>
            <select id="catalog-sort" name="sort">
              <option value="stars-desc" selected>Stars · high to low</option>
              <option value="stars-asc">Stars · low to high</option>
              <option value="name-asc">Name · A–Z</option>
              <option value="name-desc">Name · Z–A</option>
            </select>
          </label>
        </div>
        <p class="catalog-count" id="catalog-count" hidden></p>
        <p class="catalog-empty" id="catalog-empty" hidden>No plugins match that search.</p>
`;

const starCache = new Map();

function fmtStars(n) {
  const x = Number(n) || 0;
  if (x >= 10000) return Math.round(x / 1000) + "k";
  if (x >= 1000) return (x / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(x);
}

async function fetchStars(owner, repo) {
  const key = `${owner}/${repo}`.toLowerCase();
  if (starCache.has(key)) return starCache.get(key);
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "aiaaii-catalog-stars",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!r.ok) {
      starCache.set(key, 0);
      await sleep(token ? 40 : 300);
      return 0;
    }
    const j = await r.json();
    const n = Number(j.stargazers_count) || 0;
    starCache.set(key, n);
    await sleep(token ? 40 : 300);
    return n;
  } catch {
    starCache.set(key, 0);
    return 0;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseItemCard(html) {
  const href = (html.match(/href="(\/items\/[^"]+)"/i) || [])[1] || "";
  const m = href.match(/^\/items\/([^/]+)\/([^/]+)\/?$/);
  const owner = m ? m[1] : "";
  const slug = m ? m[2] : "";
  const name = ((html.match(/class="item-name"[^>]*>([\s\S]*?)<\/h2>/i) || [])[1] || slug)
    .replace(/<[^>]+>/g, "")
    .trim();
  const one = ((html.match(/class="item-one"[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "")
    .replace(/<[^>]+>/g, "")
    .trim();
  const meta = ((html.match(/class="item-meta"[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || owner)
    .replace(/<[^>]+>/g, "")
    .trim();
  const badge = ((html.match(/class="item-badge"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] || "")
    .replace(/<[^>]+>/g, "")
    .trim();
  return { href, owner, slug, name, one, meta, badge };
}

function renderCard(item, stars) {
  const n = Number(stars) || 0;
  const label = `${n} GitHub stars`;
  return `          <a class="item" href="${escapeHtml(item.href)}" data-name="${escapeHtml(
    item.name
  )}" data-owner="${escapeHtml(item.owner)}" data-stars="${n}">
            <div class="item-top">
              <span class="item-badge">${escapeHtml(item.badge || "plugin")}</span>
              <span class="item-stars" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${STAR_SVG}<span class="item-stars-n">${fmtStars(
    n
  )}</span></span>
            </div>
            <div class="item-body">
              <h2 class="item-name">${escapeHtml(item.name)}</h2>
              <p class="item-one">${escapeHtml(item.one)}</p>
              <p class="item-meta">${escapeHtml(item.meta || item.owner)}</p>
            </div>
          </a>`;
}

function ensureCatalogAssets(host) {
  const src = path.join(SITES, "_template", "catalog.js");
  const dest = path.join(SITES, host, "catalog.js");
  fs.copyFileSync(src, dest);
}

function injectChrome(html) {
  let out = html;
  if (!out.includes('id="catalog-q"')) {
    out = out.replace(
      /(<div class="wrap">\s*)((?:<p class="section-lead">[\s\S]*?<\/p>\s*)?)<div class="item-list">/,
      `$1$2${TOOLBAR}        <div class="item-list" data-catalog>`
    );
    // if replace failed (no section-lead), try plain item-list
    if (!out.includes('id="catalog-q"')) {
      out = out.replace(
        /<div class="item-list">/,
        `${TOOLBAR}        <div class="item-list" data-catalog>`
      );
    }
  } else if (!/item-list"[^>]*data-catalog/.test(out) && !/item-list data-catalog/.test(out)) {
    out = out.replace(/<div class="item-list"/, '<div class="item-list" data-catalog');
  }

  if (!out.includes("/catalog.js")) {
    out = out.replace(
      /<script src="\/theme\.js" defer><\/script>/,
      '<script src="/catalog.js" defer></script>\n    <script src="/theme.js" defer></script>'
    );
  }
  return out;
}

async function enrichFile(file, host) {
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes('class="item-list"') && !html.includes("class='item-list'")) return false;

  const cardRe = /<a class="item"[^>]*>[\s\S]*?<\/a>/gi;
  const cards = html.match(cardRe) || [];
  if (!cards.length) return false;

  const parsed = cards.map(parseItemCard);
  for (const it of parsed) {
    if (!it.owner || !it.slug) continue;
    it.stars = await fetchStars(it.owner, it.slug);
    console.log(`  ★ ${it.owner}/${it.slug} = ${it.stars}`);
  }

  let i = 0;
  html = html.replace(cardRe, () => {
    const it = parsed[i++];
    return renderCard(it, it.stars);
  });

  // Only full directory gets live search chrome (categories stay static-sorted with stars)
  const isDir = /[/\\]items[/\\]index\.html$/i.test(file);
  if (isDir) html = injectChrome(html);

  fs.writeFileSync(file, html, "utf8");
  return true;
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

async function main() {
  console.log(token ? "GitHub token: yes" : "GitHub token: no (slow / may rate-limit)");
  for (const host of HOSTS) {
    ensureCatalogAssets(host);
    console.log(`\n=== ${host} ===`);
    for (const file of walkCatalogPages(host)) {
      console.log(path.relative(ROOT, file));
      await enrichFile(file, host);
    }
  }
  console.log("\nDone. cache size", starCache.size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
