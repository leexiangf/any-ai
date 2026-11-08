/**
 * Orca P2: screenshots/cover, Featured rail, Official/Community filter, install counts.
 *
 * Installs: scraped from https://www.onorca.dev/plugins (no public API).
 * Media: from orca-plugin.json cover + screenshots → raw.githubusercontent.com
 *
 * Usage: node scripts/orca-p2-enrich.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ORCA = path.join(ROOT, "sites/orca");
const ITEMS = path.join(ORCA, "items");
const OUT_INSTALLS = path.join(ROOT, "ops/discover/orca-installs.json");

const UA = "aiaaii-orca-p2/1.0";
const STAR_SVG = `<svg class="item-star-icon" viewBox="0 0 16 16" aria-hidden="true" width="12" height="12"><path fill="currentColor" d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.92L8 10.77l-3.52 1.85.67-3.92L2.3 5.64l3.94-.57L8 1.5z"/></svg>`;

const CAT_LABEL = {
  themes: "Themes",
  languages: "Languages",
  icons: "Icons",
  editors: "Editors",
  marketplaces: "Marketplaces",
  "commands-panels": "Commands & panels",
  "remote-vms": "Remote/VMs",
};

function unesc(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function esc(s) {
  return unesc(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pick(html, re, fb = "") {
  const m = html.match(re);
  return m ? m[1].trim() : fb;
}

function parseInstallLabel(s) {
  const t = String(s || "").trim().toLowerCase();
  const m = t.match(/^([\d.]+)\s*k\s*installs?$/);
  if (m) return Math.round(parseFloat(m[1]) * 1000);
  const n = t.match(/^([\d,]+)\s*installs?$/);
  if (n) return Number(n[1].replace(/,/g, ""));
  return 0;
}

function formatInstalls(n) {
  if (!n || n < 1) return "";
  if (n >= 1000) {
    const k = n / 1000;
    const s = k >= 10 ? String(Math.round(k)) : k.toFixed(1).replace(/\.0$/, "");
    return `${s}k installs`;
  }
  return `${n} installs`;
}

async function scrapeInstalls() {
  const r = await fetch("https://www.onorca.dev/plugins", { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`onorca plugins HTTP ${r.status}`);
  const html = await r.text();

  /** @type {Map<string, number>} */
  const byName = new Map();
  /** @type {Map<string, number>} */
  const byId = new Map();

  // Prefer structured JSON embedded in Next/RSC payloads when present
  const jsonHits = [...html.matchAll(/"name"\s*:\s*"([^"]+)"[^,]{0,200}?"install(?:Count|s)"\s*:\s*(\d+)/gi)];
  for (const m of jsonHits) byName.set(m[1].toLowerCase(), Number(m[2]));

  const idHits = [
    ...html.matchAll(
      /"id"\s*:\s*"([^"]+)"[^,]{0,240}?"install(?:Count|s)"\s*:\s*(\d+)/gi
    ),
  ];
  for (const m of idHits) byId.set(m[1].toLowerCase(), Number(m[2]));

  // Fallback: visible "N installs" / "1.6k installs" near headings
  if (byName.size < 20) {
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<[^>]+>/g, "\n");
    const lines = text
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const n = parseInstallLabel(lines[i]);
      if (!n) continue;
      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        const cand = lines[j];
        if (
          cand.length >= 3 &&
          cand.length <= 90 &&
          !/content only|opens and|adds |theme|editor|language|icon|official|community|stablyai|installs|commands|panels|remote|vm/i.test(
            cand
          )
        ) {
          const key = cand.toLowerCase();
          if (!byName.has(key) || byName.get(key) < n) byName.set(key, n);
          break;
        }
      }
    }
  }

  return { byName, byId, scrapedAt: new Date().toISOString() };
}

function listItems() {
  const out = [];
  for (const owner of fs.readdirSync(ITEMS, { withFileTypes: true })) {
    if (!owner.isDirectory() || owner.name.startsWith("_")) continue;
    for (const slug of fs.readdirSync(path.join(ITEMS, owner.name), { withFileTypes: true })) {
      if (!slug.isDirectory()) continue;
      const file = path.join(ITEMS, owner.name, slug.name, "index.html");
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf8");
      const name = unesc(pick(html, /<h1>([^<]+)<\/h1>/i, slug.name));
      const hero = unesc(
        pick(html, /<header class="page-hero">[\s\S]*?<p>([\s\S]*?)<\/p>/i)
          .replace(/<[^>]+>/g, "")
          .trim()
      );
      const category = pick(html, /href="\/categories\/([^/"]+)\//i, "commands-panels");
      const listingId = pick(html, /<dt>Plugin id<\/dt>\s*<dd><code>([^<]+)<\/code>/i, "");
      const pluginId = listingId.includes(".") ? listingId.split(".").slice(1).join(".") : listingId;
      const catalog = /plugin-badge">Official</.test(html) || owner.name === "stablyai" ? "Official" : "Community";
      const source = pick(html, /<dt>Source<\/dt>[\s\S]*?<a href="([^"]+)"/i, "");
      const starsM = html.match(/data-stars="(\d+)"/);
      out.push({
        owner: owner.name,
        slug: slug.name,
        name,
        hero,
        category,
        listingId,
        pluginId,
        catalog,
        source,
        stars: starsM ? Number(starsM[1]) : 0,
        file,
        html,
      });
    }
  }
  // pull stars from items index when missing
  const idx = fs.readFileSync(path.join(ITEMS, "index.html"), "utf8");
  const re = /href="\/items\/([^/]+)\/([^/]+)\/"[^>]*data-stars="(\d+)"/gi;
  let m;
  const starMap = new Map();
  while ((m = re.exec(idx))) starMap.set(`${m[1]}/${m[2]}`, Number(m[3]));
  for (const it of out) {
    const s = starMap.get(`${it.owner}/${it.slug}`);
    if (s != null) it.stars = s;
  }
  return out;
}

function deriveFolder(slug, source) {
  const fromSrc = String(source).match(/\/plugins\/([^/]+)/i);
  if (fromSrc) return fromSrc[1];
  return slug.startsWith("orca-") ? slug.slice(5) : slug;
}

async function fetchJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.status === 404) return null;
      if (!r.ok) {
        await new Promise((res) => setTimeout(res, 200 * (i + 1)));
        continue;
      }
      return await r.json();
    } catch {
      await new Promise((res) => setTimeout(res, 300 * (i + 1)));
    }
  }
  return null;
}

async function resolveMedia(item) {
  const folder = deriveFolder(item.slug, item.source);
  const candidates = [];

  const tree = String(item.source).match(
    /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+?)\/?$/i
  );
  if (tree) {
    const [, o, repo, branch, dir] = tree;
    candidates.push({
      owner: o,
      repo: repo.replace(/\.git$/, ""),
      branch,
      dir: dir.replace(/\/$/, ""),
    });
  }

  // standalone repo root
  candidates.push({ owner: item.owner, repo: item.slug, branch: "main", dir: "" });
  candidates.push({ owner: item.owner, repo: item.slug, branch: "master", dir: "" });

  if (item.owner === "stablyai" || /stablyai\/orca-plugins/i.test(item.source)) {
    candidates.push({
      owner: "stablyai",
      repo: "orca-plugins",
      branch: "main",
      dir: `plugins/${folder}`,
    });
  }

  for (const c of candidates) {
    const base = c.dir ? `${c.dir}/` : "";
    const url = `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${c.branch}/${base}orca-plugin.json`;
    const m = await fetchJson(url);
    if (!m || !(m.id || m.name)) continue;
    const mediaBase = `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${c.branch}/${base}`;
    const cover = m.cover?.path
      ? {
          src: /^https?:/i.test(m.cover.path) ? m.cover.path : mediaBase + m.cover.path.replace(/^\.\//, ""),
          alt: m.cover.alt || m.name || item.name,
        }
      : null;
    const shots = Array.isArray(m.screenshots)
      ? m.screenshots
          .map((s) => ({
            src: /^https?:/i.test(s.path) ? s.path : mediaBase + String(s.path || "").replace(/^\.\//, ""),
            alt: s.alt || s.caption || m.name || item.name,
            caption: s.caption || "",
          }))
          .filter((s) => s.src)
      : [];
    if (cover || shots.length) {
      return { cover, shots, version: m.version || "", from: url };
    }
  }
  return null;
}

function galleryHtml(media) {
  if (!media || (!media.cover && !media.shots?.length)) return "";
  const figs = [];
  if (media.cover) {
    figs.push(`          <figure class="plugin-shot plugin-shot-cover">
            <img src="${esc(media.cover.src)}" alt="${esc(media.cover.alt)}" loading="lazy" decoding="async" />
            <figcaption>Cover</figcaption>
          </figure>`);
  }
  for (const s of (media.shots || []).slice(0, 4)) {
    figs.push(`          <figure class="plugin-shot">
            <img src="${esc(s.src)}" alt="${esc(s.alt)}" loading="lazy" decoding="async" />
            ${s.caption ? `<figcaption>${esc(s.caption)}</figcaption>` : ""}
          </figure>`);
  }
  return `
        <h2>Screenshots</h2>
        <div class="plugin-gallery">
${figs.join("\n")}
        </div>`;
}

function lookupInstalls(item, scrapes) {
  if (item.pluginId && scrapes.byId.has(item.pluginId.toLowerCase())) {
    return scrapes.byId.get(item.pluginId.toLowerCase());
  }
  if (item.listingId && scrapes.byId.has(item.listingId.toLowerCase())) {
    return scrapes.byId.get(item.listingId.toLowerCase());
  }
  // Name-based counts come from the official onorca directory; only attach to Official listings
  // so community forks with the same display name don't inherit official install volume.
  if (item.catalog !== "Official") return 0;
  const nameKey = item.name.toLowerCase().trim();
  if (scrapes.byName.has(nameKey)) return scrapes.byName.get(nameKey);
  const soft = nameKey.replace(/\s+for\s+orca$/i, "").trim();
  const candidates = [soft, `${soft} for orca`, nameKey.replace(/^orca\s+/i, "")];
  for (const c of candidates) {
    if (c && scrapes.byName.has(c)) return scrapes.byName.get(c);
  }
  return 0;
}

function patchDetail(item, { installs, media }) {
  let html = item.html;
  const keepGallery = media && media.keep;
  if (!keepGallery) {
    html = html.replace(/\s*<h2>Screenshots<\/h2>\s*<div class="plugin-gallery">[\s\S]*?<\/div>/i, "\n");
  }

  const gal = keepGallery ? "" : galleryHtml(media);
  if (gal) {
    if (/<h2>Access<\/h2>/i.test(html)) {
      html = html.replace(/<h2>Access<\/h2>/i, `${gal}\n        <h2>Access</h2>`);
    } else if (/<h2>What is /i.test(html)) {
      html = html.replace(/<h2>What is /i, `${gal}\n        <h2>What is `);
    } else {
      html = html.replace(/<\/dl>/i, `</dl>${gal}`);
    }
  }

  // installs meta row
  html = html.replace(/\s*<dt>Installs<\/dt>\s*<dd>[^<]*<\/dd>/i, "");
  if (installs > 0) {
    const row = `\n          <dt>Installs</dt>\n          <dd>${esc(formatInstalls(installs))}</dd>`;
    if (/<dt>Catalog<\/dt>/i.test(html)) {
      html = html.replace(/<dt>Catalog<\/dt>/i, `${row.trim()}\n          <dt>Catalog</dt>`);
    } else if (/<dt>Status<\/dt>/i.test(html)) {
      html = html.replace(/<dt>Status<\/dt>/i, `${row.trim()}\n          <dt>Status</dt>`);
    }
  }

  // hero micro-stat
  html = html.replace(/\s*<p class="plugin-installs">[^<]*<\/p>/i, "");
  if (installs > 0) {
    html = html.replace(
      /(<p class="plugin-badges"[\s\S]*?<\/p>)/i,
      `$1\n        <p class="plugin-installs">${esc(formatInstalls(installs))}</p>`
    );
  }

  fs.writeFileSync(item.file, html, "utf8");
}

function card(item) {
  const stars = item.stars || 0;
  const installs = item.installs || 0;
  const access = item.access || "";
  return `          <a class="item" href="/items/${esc(item.owner)}/${esc(item.slug)}/" data-name="${esc(
    item.name
  )}" data-owner="${esc(item.owner)}" data-stars="${stars}" data-installs="${installs}" data-catalog-kind="${esc(
    item.catalog.toLowerCase()
  )}" data-access="${esc(access)}"><div class="item-top"><span class="item-badge">${esc(
    CAT_LABEL[item.category] || item.category
  )}</span><span class="item-stars" title="${stars} GitHub stars" aria-label="${stars} GitHub stars">${STAR_SVG}<span class="item-stars-n">${stars}</span></span></div><div class="item-body"><h2 class="item-name">${esc(
    item.name
  )}</h2><p class="item-one">${esc((item.hero || "").slice(0, 160))}</p><p class="item-meta">${esc(item.owner)}${
    installs ? ` · ${esc(formatInstalls(installs))}` : ""
  }</p></div></a>`;
}

function featuredCard(item) {
  const installs = item.installs || 0;
  return `            <a class="item featured-item" href="/items/${esc(item.owner)}/${esc(item.slug)}/">
              <div class="item-body">
                <h3 class="item-name">${esc(item.name)}</h3>
                <p class="item-one">${esc((item.hero || "").slice(0, 120))}</p>
                <p class="item-meta">${esc(item.owner)}${installs ? ` · ${esc(formatInstalls(installs))}` : ""}</p>
              </div>
              <span class="item-badge">${esc(CAT_LABEL[item.category] || item.category)}</span>
            </a>`;
}

function rebuildItemsIndex(items) {
  const file = path.join(ITEMS, "index.html");
  let html = fs.readFileSync(file, "utf8");

  const featured = [];
  const seenNames = new Set();
  for (const i of items
    .filter((x) => x.catalog === "Official" && x.installs > 0)
    .sort((a, b) => b.installs - a.installs || b.stars - a.stars)) {
    const k = i.name.toLowerCase();
    if (seenNames.has(k)) continue;
    seenNames.add(k);
    featured.push(i);
    if (featured.length >= 8) break;
  }
  const featuredFinal =
    featured.length >= 4
      ? featured
      : items
          .filter((i) => i.catalog === "Official")
          .sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name))
          .slice(0, 8);

  const featuredBlock = `
        <section class="featured-rail" aria-labelledby="featured-heading">
          <div class="featured-head">
            <h2 id="featured-heading">Featured</h2>
            <p>High-traffic official listings from the Orca catalog.</p>
          </div>
          <div class="item-list featured-list">
${featuredFinal.map(featuredCard).join("\n")}
          </div>
        </section>
`;

  // toolbar: add catalog filter + installs sort
  const toolbar = `        <div class="catalog-toolbar">
          <label class="catalog-search">
            <span class="visually-hidden">Search plugins by name</span>
            <input type="search" id="catalog-q" name="q" placeholder="Search by name…" autocomplete="off" enterkeyhint="search" />
          </label>
          <label class="catalog-filter">
            <span class="visually-hidden">Catalog</span>
            <select id="catalog-kind" name="kind">
              <option value="all" selected>All catalogs</option>
              <option value="official">Official</option>
              <option value="community">Community</option>
            </select>
          </label>
          <label class="catalog-sort">
            <span class="visually-hidden">Sort plugins</span>
            <select id="catalog-sort" name="sort">
              <option value="installs-desc">Installs · high to low</option>
              <option value="stars-desc" selected>Stars · high to low</option>
              <option value="stars-asc">Stars · low to high</option>
              <option value="name-asc">Name · A–Z</option>
              <option value="name-desc">Name · Z–A</option>
            </select>
          </label>
        </div>`;

  html = html.replace(/<div class="catalog-toolbar">[\s\S]*?<\/div>/i, toolbar);

  // inject featured before toolbar (once)
  html = html.replace(/\s*<section class="featured-rail"[\s\S]*?<\/section>\s*/i, "\n");
  html = html.replace(/(<p class="section-lead">[\s\S]*?<\/p>)/i, `$1\n${featuredBlock}`);

  // rebuild cards inside data-catalog
  const cards = items
    .slice()
    .sort((a, b) => (b.stars || 0) - (a.stars || 0) || a.name.localeCompare(b.name))
    .map(card)
    .join("\n");
  if (/<div class="item-list" data-catalog>[\s\S]*?<\/div>/i.test(html)) {
    html = html.replace(
      /<div class="item-list" data-catalog>[\s\S]*?<\/div>/i,
      `<div class="item-list" data-catalog>\n${cards}\n        </div>`
    );
  } else {
    console.warn("items index: data-catalog list not found");
  }

  // ensure empty + count nodes exist
  if (!/id="catalog-count"/.test(html)) {
    html = html.replace(
      /<div class="item-list" data-catalog>/,
      `<p class="catalog-count" id="catalog-count" hidden></p>\n        <p class="catalog-empty" id="catalog-empty" hidden>No plugins match that search.</p>\n        <div class="item-list" data-catalog>`
    );
  }

  fs.writeFileSync(file, html, "utf8");
}

// ——— main ———
const scrapes = await scrapeInstalls();
fs.mkdirSync(path.dirname(OUT_INSTALLS), { recursive: true });
fs.writeFileSync(
  OUT_INSTALLS,
  JSON.stringify(
    {
      scrapedAt: scrapes.scrapedAt,
      byName: Object.fromEntries(scrapes.byName),
      byId: Object.fromEntries(scrapes.byId),
      nameCount: scrapes.byName.size,
      idCount: scrapes.byId.size,
    },
    null,
    2
  )
);

const items = listItems();
let mediaHits = 0;
let installHits = 0;

// Prefer media for Official themes/editors/icons (+ any with screenshots in manifest)
const mediaTargets = items.filter(
  (i) =>
    i.catalog === "Official" ||
    /themes|editors|icons/.test(i.category) ||
    /theme|editor|icon/i.test(i.slug)
);

for (const it of items) {
  it.installs = lookupInstalls(it, scrapes);
  if (it.installs) installHits++;
}

if (!process.env.ORCA_P2_SKIP_MEDIA) {
  for (const it of mediaTargets) {
    try {
      const media = await resolveMedia(it);
      if (media) {
        mediaHits++;
        it.media = media;
        process.stdout.write(`media ${it.owner}/${it.slug}\n`);
      }
    } catch (e) {
      console.warn("media-fail", it.owner + "/" + it.slug, e.message);
    }
    await new Promise((r) => setTimeout(r, 80));
  }
} else {
  // Keep existing galleries; only refresh installs + index cards.
  for (const it of items) {
    if (/plugin-gallery/i.test(it.html)) it.media = { keep: true };
  }
}

for (const it of items) {
  // refresh html from disk if we may have stale
  it.html = fs.readFileSync(it.file, "utf8");
  const access =
    pick(it.html, /<dt>Access<\/dt>\s*<dd>([^<]+)<\/dd>/i, "") ||
    pick(
      it.html,
      /plugin-badge">(Content only|Opens and edits files|Runs plugin code|Adds VM recipes)</i,
      ""
    );
  it.access = access.trim();
  patchDetail(it, { installs: it.installs || 0, media: it.media || null });
}

rebuildItemsIndex(items);

console.log(
  JSON.stringify(
    {
      items: items.length,
      installNameKeys: scrapes.byName.size,
      installIdKeys: scrapes.byId.size,
      installHits,
      mediaHits,
      featuredSample: items
        .filter((i) => i.installs > 0)
        .sort((a, b) => b.installs - a.installs)
        .slice(0, 8)
        .map((i) => `${i.name} (${formatInstalls(i.installs)})`),
    },
    null,
    2
  )
);
