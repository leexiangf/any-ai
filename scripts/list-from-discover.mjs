#!/usr/bin/env node
/**
 * List high-confidence picks from ops/discover/latest.json (or picks-batch.json).
 *
 * Default filters:
 *   - skip amp (low confidence heuristic)
 *   - require valid manifest
 *   - skip kimi template/example paths
 *   - skip orca launch-path forks + empty weak marketplaces
 *
 * Usage:
 *   node scripts/list-from-discover.mjs
 *   node scripts/list-from-discover.mjs --from ops/discover/picks-batch.json
 *   node scripts/thicken-item-pages.mjs droid orca kimi
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITES = path.join(ROOT, "sites");
const DATE = new Date().toISOString().slice(0, 10);
const args = process.argv.slice(2);
const fromArg = args.includes("--from") ? args[args.indexOf("--from") + 1] : null;

const themeBoot = `        <script>
      (function () {
        try {
          var k = "aiaaii-theme";
          var t = localStorage.getItem(k);
          if (t !== "light" && t !== "dark") {
            var m = document.cookie.match(/(?:^|; )aiaaii-theme=(light|dark)/);
            t = m ? m[1] : null;
          }
          if (t !== "light" && t !== "dark") {
            t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
          }
          document.documentElement.setAttribute("data-theme", t);
        } catch (e) {}
      })();
    </script>`;

const HOST = {
  droid: {
    shop: "Droid Plugin Market",
    domain: "droid.aiaaii.com",
    vendor: "Factory / Droid",
    keyword: "Droid plugin",
  },
  orca: {
    shop: "Orca Plugin Market",
    domain: "orca.aiaaii.com",
    vendor: "Orca / Stably",
    keyword: "Orca plugin",
  },
  kimi: {
    shop: "Kimi Plugin Market",
    domain: "kimi.aiaaii.com",
    vendor: "Moonshot AI / Kimi",
    keyword: "Kimi plugin",
  },
  amp: {
    shop: "Amp Plugin Market",
    domain: "amp.aiaaii.com",
    vendor: "Amp / Sourcegraph",
    keyword: "Amp plugin",
  },
};

function itemPageTitle(name, cfg) {
  const base = `${name} — ${cfg.keyword} install`;
  const withShop = `${base} | ${cfg.shop}`;
  return withShop.length <= 65 ? withShop : base.length <= 65 ? base : `${name.slice(0, 33)}… — ${cfg.keyword} install`;
}

const WEAK_ORCA = new Set([
  "alepspizzetti/orca-plugins",
  "codeious/orca-plugins",
  "andoshin11/orca-plugins",
  "sn-kinos/just-orca",
]);

function listedCount(host) {
  const base = path.join(SITES, host, "items");
  let n = 0;
  for (const o of fs.readdirSync(base, { withFileTypes: true })) {
    if (!o.isDirectory() || o.name.startsWith("_")) continue;
    for (const s of fs.readdirSync(path.join(base, o.name), { withFileTypes: true })) {
      if (s.isDirectory() && fs.existsSync(path.join(base, o.name, s.name, "index.html"))) n++;
    }
  }
  return n;
}

function alreadyListed(host, owner, slug) {
  return fs.existsSync(path.join(SITES, host, "items", owner, slug, "index.html"));
}

function loadPicks() {
  if (fromArg) {
    return JSON.parse(fs.readFileSync(path.resolve(ROOT, fromArg), "utf8"));
  }
  const latest = JSON.parse(fs.readFileSync(path.join(ROOT, "ops/discover/latest.json"), "utf8"));
  const out = [];
  for (const host of ["droid", "kimi", "orca"]) {
    for (const c of latest.hosts[host]?.candidates || []) {
      if (!c.valid) continue;
      if (host === "kimi" && /template|examples?\//i.test(c.manifestPath || "")) continue;
      if (host === "orca" && /resources\/plugins\/launch/i.test(c.manifestPath || "")) continue;
      if (host === "orca" && WEAK_ORCA.has(String(c.repo).toLowerCase())) continue;
      if (!(c.tier === "P0" || c.tier === "P1")) continue;
      out.push(c);
    }
  }
  return out;
}

function guessCategory(host, row) {
  const blob = `${row.repo} ${row.desc || ""} ${row.pluginName || ""}`.toLowerCase();
  if (host === "droid") {
    if (row.manifestPath?.includes("marketplace") || row.marketplaceName) return "marketplaces";
    if (/secur|vulnerab|secret|guard|lagune/.test(blob)) return "security";
    if (/diagram|design|ui|infographic|humanize/.test(blob)) return "quality";
    return "marketplaces";
  }
  if (host === "kimi") {
    if (/memory|postgres|neon|viking|context|basemind|superlocal/.test(blob)) return "data";
    if (/workflow|aegis|novel|game|superior|pstack/.test(blob)) return "workflows";
    return "productivity";
  }
  // orca — align with official taxonomy
  if (/marketplace|orca-catalog|community-plugins/.test(blob)) return "marketplaces";
  if (/\bicon/.test(blob)) return "icons";
  if (/theme|catppuccin|dracula|nord|oled|midnight|monokai|gruvbox|tokyonight|pastel|solarized|cobalt/.test(blob))
    return "themes";
  if (/vm|recipe|multipass|lima|sprites|sandbox|sbx|tenki|boat/.test(blob)) return "remote-vms";
  if (/editor|docx|xlsx|spreadsheet|excalidraw|drawio|sqlite|parquet|graphiql|milko|asciidoc|pptx|markup/.test(blob))
    return "editors";
  if (
    /syntax|highlight|grammar|prisma|haskell|julia|ocaml|erlang|qml|vhdl|language|locale|i18n|russian|czech|turkish|vietnamese|portuguese|pt-br|zh-tw|zh-hant|chinese/.test(
      blob
    )
  )
    return "languages";
  return "commands-panels";
}

function defaultInstalls(host, repo, row) {
  if (row.installs?.length) return row.installs.filter((x) => x.label !== "Kind");
  const source = `https://github.com/${repo}`;
  if (host === "kimi") {
    return [
      { label: "Install", code: `/plugins install ${source}` },
      { label: "Fresh session", code: "/new" },
    ];
  }
  if (host === "droid") {
    const mp = row.marketplaceName || repo.split("/")[1];
    const plugin = row.pluginName;
    const out = [
      { label: "Add marketplace", code: `droid plugin marketplace add ${source}` },
      { label: "Or shorthand", code: `droid plugin marketplace add ${repo}` },
    ];
    if (plugin) out.push({ label: "Then install", code: `droid plugin install ${plugin}@${mp} --scope user` });
    return out;
  }
  // orca — dual path: in-app search when possible + marketplace source fallback
  if (host === "orca") {
    const name = row.pluginName || repo.split("/")[1];
    const publisher = row.publisher || repo.split("/")[0];
    const pluginId = row.pluginId || "";
    const listingId = publisher && pluginId ? `${publisher}.${pluginId}` : pluginId;
    const official = String(publisher).toLowerCase() === "stablyai" || /official/i.test(row.tier || "");
    const out = [];
    if (official) {
      out.push({
        label: "In Orca (catalog search)",
        code: `Settings → Plugins → search “${name}” → Install`,
      });
    } else {
      out.push({
        label: "In Orca (marketplace source)",
        code: `Settings → Plugins → Marketplace sources → add ${source} (pin a tag/commit when required)`,
      });
    }
    if (listingId) out.push({ label: "Plugin id", code: listingId });
    if (official && pluginId) {
      out.push({
        label: "Official catalog page",
        code: `https://www.onorca.dev/plugins/stablyai/orca-plugins/${pluginId}`,
      });
    }
    out.push({ label: "Git source", code: source });
    return out;
  }
  return [
    {
      label: "Add marketplace source",
      code: `Settings → Plugins → Marketplace sources → add ${source}`,
    },
  ];
}

function statusFor(host, row) {
  if (host === "droid") {
    return row.nativeFactory || String(row.manifestPath || "").includes(".factory-plugin")
      ? "listed · native Factory marketplace"
      : "listed · Claude-compatible marketplace";
  }
  if (host === "orca") {
    const pub = String(row.publisher || row.repo?.split("/")[0] || "").toLowerCase();
    return pub === "stablyai" ? "listed · official catalog" : "listed · community";
  }
  return "listed · community";
}

function toItem(row) {
  const host = row.host;
  const repo = row.repo;
  const [owner, slug] = repo.split("/");
  const name = row.pluginName || slug;
  const hero = (row.desc || `${name} community plugin`).replace(/\s+/g, " ").trim();
  return {
    host,
    owner,
    slug,
    name,
    hero: hero.slice(0, 160),
    category: guessCategory(host, row),
    status: statusFor(host, row),
    source: `https://github.com/${repo}`,
    installs: defaultInstalls(host, repo, row),
    stars: Number(row.stars) || 0,
  };
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function card(item) {
  const stars = Number(item.stars) || 0;
  const starSvg = `<svg class="item-star-icon" viewBox="0 0 16 16" aria-hidden="true" width="12" height="12"><path fill="currentColor" d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.92L8 10.77l-3.52 1.85.67-3.92L2.3 5.64l3.94-.57L8 1.5z"/></svg>`;
  return `          <a class="item" href="/items/${item.owner}/${item.slug}/" data-name="${esc(item.name)}" data-owner="${esc(item.owner)}" data-stars="${stars}"><div class="item-top"><span class="item-badge">${esc(item.category)}</span><span class="item-stars" title="${stars} GitHub stars" aria-label="${stars} GitHub stars">${starSvg}<span class="item-stars-n">${stars}</span></span></div><div class="item-body"><h2 class="item-name">${esc(item.name)}</h2><p class="item-one">${esc(item.hero)}</p><p class="item-meta">${esc(item.owner)}</p></div></a>`;
}

function thinPage(item) {
  const cfg = HOST[item.host];
  const installs = item.installs
    .map(
      (b) => `        <div class="install-block">
          <span class="label">${esc(b.label)}</span>
          <code>${esc(b.code)}</code>
        </div>`
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(itemPageTitle(item.name, cfg))}</title>
    <meta name="description" content="${esc(`${item.name}: ${item.hero}`.slice(0, 140))} Install via host plugin commands." />
    <link rel="canonical" href="https://${cfg.domain}/items/${item.owner}/${item.slug}/" />
${themeBoot}
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="page-shell">
      <div class="wrap-wide">
        <div class="site-header">
          <a class="brand" href="/">
            <span class="brand-name">${esc(cfg.shop)}</span>
            <span class="brand-domain">${cfg.domain} · Any AI</span>
          </a>
          <div class="header-end">
            <nav class="nav" aria-label="Primary">
            <a href="/items/" aria-current="page">Plugins</a>
            <a href="/guides/">Guides</a>
            <a href="/submit/">Submit</a>
            <a href="/about/">About</a>
          </nav>
            <button type="button" class="theme-toggle" data-theme-toggle aria-label="Switch color theme" title="Theme">
              <span class="theme-toggle-icon" aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </div>
      <header class="page-hero">
        <div class="wrap">
          <h1>${esc(item.name)}</h1>
          <p>${esc(item.hero)}</p>
        </div>
      </header>
    </div>
    <main class="section">
      <div class="wrap prose">
        <p><strong>${esc(item.name)}</strong> — ${esc(item.hero)}</p>
${installs}
        <dl class="meta-table">
          <dt>Author</dt>
          <dd>${esc(item.owner)}</dd>
          <dt>Category</dt>
          <dd><a href="/categories/${esc(item.category)}/">${esc(item.category)}</a></dd>
          <dt>Status</dt>
          <dd>${esc(item.status)}</dd>
          <dt>Source</dt>
          <dd><a href="${esc(item.source)}" rel="noopener noreferrer">${esc(item.source.replace(/^https?:\/\//, ""))}</a></dd>
        </dl>
        <p class="source-line">Independent rewrite · Updated ${DATE} · Not affiliated with ${esc(cfg.vendor)}</p>
        <p><a href="/items/">← All plugins</a></p>
      </div>
    </main>
    <footer class="site-footer">
      <div class="wrap-wide">
        <div class="brand">
          <span class="brand-name">${esc(cfg.shop)}</span>
          <span class="brand-domain">${cfg.domain} · Any AI (AI-AAII)</span>
        </div>
        <div class="footer-row">
          <div>
            <a href="/items/">Plugins</a>
            <a href="/guides/">Guides</a>
            <a href="/submit/">Submit</a>
            <a href="/about/">About</a>
            <a class="mall-link" href="https://aiaaii.com/">Any AI mall</a>
          </div>
          <p>Not affiliated with ${esc(cfg.vendor)}</p>
        </div>
      </div>
    </footer>
    <script src="/theme.js" defer></script>
  </body>
</html>
`;
}

function appendItemCards(file, items) {
  if (!items.length || !fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  const marker = items.map(card).join("\n") + "\n";
  const patterns = [
    "</div></div></main>",
    "</div>\n</div></main>",
    '</div><p style="margin-top:2rem">',
    "</div>\n<p style=\"margin-top:2rem\">",
    "</div>\n        <p style=\"margin-top:2rem\">",
    "</div>\n        <p><a href=\"/items/\">← All plugins</a></p>",
    "</div>\n        <p><a href=\"/items/\">All plugins</a></p>",
    "</div>\n<p><a href=\"/items/\">← All plugins</a></p>",
  ];
  let done = false;
  for (const p of patterns) {
    if (html.includes(p)) {
      html = html.replace(p, marker + p);
      done = true;
      break;
    }
  }
  if (!done) {
    const listOpen = html.match(/<div class="item-list"[^>]*>/i);
    const idx = listOpen ? html.lastIndexOf(listOpen[0]) : -1;
    if (idx < 0) throw new Error(`no item-list in ${file}`);
    const endList = html.indexOf("</div>", html.lastIndexOf("</a>", html.indexOf("</main>", idx)));
    html = html.slice(0, endList) + "\n" + marker + html.slice(endList);
  }
  fs.writeFileSync(file, html, "utf8");
}

function bumpExact(file, replacements) {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  for (const [from, to] of replacements) {
    if (!html.includes(from)) {
      console.warn("missing bump", file, from);
      continue;
    }
    html = html.split(from).join(to);
  }
  fs.writeFileSync(file, html, "utf8");
}

function appendSitemap(host, items) {
  const file = path.join(SITES, host, "sitemap.xml");
  let xml = fs.readFileSync(file, "utf8");
  const urls = items
    .map(
      (it) =>
        `  <url><loc>https://${HOST[host].domain}/items/${it.owner}/${it.slug}/</loc><lastmod>${DATE}</lastmod><priority>0.8</priority></url>`
    )
    .join("\n");
  xml = xml.replace("</urlset>", `${urls}\n</urlset>`);
  fs.writeFileSync(file, xml, "utf8");
}

function categoryFiles(host, category) {
  const p = path.join(SITES, host, "categories", category, "index.html");
  return fs.existsSync(p) ? p : null;
}

const raw = loadPicks();
const items = [];
const skipped = [];
for (const row of raw) {
  const host = row.host;
  if (host === "amp") {
    skipped.push({ repo: row.repo, reason: "amp-low-confidence" });
    continue;
  }
  const [owner, slug] = row.repo.split("/");
  if (alreadyListed(host, owner, slug)) {
    skipped.push({ repo: row.repo, reason: "already-listed" });
    continue;
  }
  items.push(toItem(row));
}

fs.mkdirSync(path.join(ROOT, "ops/discover"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "ops/discover/last-listed.json"),
  JSON.stringify({ at: new Date().toISOString(), count: items.length, skipped, items }, null, 2)
);

const before = {
  droid: listedCount("droid"),
  kimi: listedCount("kimi"),
  orca: listedCount("orca"),
  amp: listedCount("amp"),
};

for (const item of items) {
  const rel = path.join(item.host, "items", item.owner, item.slug, "index.html");
  const full = path.join(SITES, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, thinPage(item), "utf8");
  console.log("page", item.host, `${item.owner}/${item.slug}`);
}

const byHost = Object.groupBy(items, (x) => x.host);

for (const [host, list] of Object.entries(byHost)) {
  const from = before[host];
  const to = from + list.length;
  appendItemCards(path.join(SITES, host, "items/index.html"), list);
  // categories
  const byCat = Object.groupBy(list, (x) => x.category);
  for (const [cat, catItems] of Object.entries(byCat)) {
    const f = categoryFiles(host, cat);
    if (f) appendItemCards(f, catItems);
  }
  appendSitemap(host, list);

  if (host === "droid") {
    bumpExact(path.join(SITES, "droid/items/index.html"), [
      [`${from} Droid Plugins`, `${to} Droid Plugins`],
      [`Browse ${from} Droid plugins`, `Browse ${to} Droid plugins`],
      [`${from} Droid plugins`, `${to} Droid plugins`],
    ]);
    bumpExact(path.join(SITES, "droid/index.html"), [[`<strong>${from}</strong>`, `<strong>${to}</strong>`]]);
  } else if (host === "orca") {
    bumpExact(path.join(SITES, "orca/items/index.html"), [
      [`${from} Orca Plugins`, `${to} Orca Plugins`],
      [`Browse ${from} community`, `Browse ${to} community`],
      [`${from} Orca plugins`, `${to} Orca plugins`],
    ]);
    bumpExact(path.join(SITES, "orca/index.html"), [[`<strong>${from}</strong>`, `<strong>${to}</strong>`]]);
  } else if (host === "kimi") {
    bumpExact(path.join(SITES, "kimi/items/index.html"), [
      [`${from} curated listings`, `${to} curated listings`],
    ]);
    bumpExact(path.join(SITES, "kimi/index.html"), [
      [`<strong>${from}</strong>`, `<strong>${to}</strong>`],
      [`All ${from} plugins`, `All ${to} plugins`],
    ]);
  }
}

{
  const www = path.join(SITES, "www/index.html");
  let html = fs.readFileSync(www, "utf8");
  const map = {
    droid: [before.droid, before.droid + (byHost.droid?.length || 0)],
    orca: [before.orca, before.orca + (byHost.orca?.length || 0)],
    kimi: [before.kimi, before.kimi + (byHost.kimi?.length || 0)],
  };
  html = html
    .replace(
      `Plugin market · <strong>${map.droid[0]}</strong> listings · <span class="acronym">droid plugin install</span>`,
      `Plugin market · <strong>${map.droid[1]}</strong> listings · <span class="acronym">droid plugin install</span>`
    )
    .replace(
      `Plugin market · <strong>${map.orca[0]}</strong> listings · marketplace sources`,
      `Plugin market · <strong>${map.orca[1]}</strong> listings · marketplace sources`
    )
    .replace(
      `Plugin market · <strong>${map.kimi[0]}</strong> listings · <span class="acronym">/plugins install</span>`,
      `Plugin market · <strong>${map.kimi[1]}</strong> listings · <span class="acronym">/plugins install</span>`
    );
  fs.writeFileSync(www, html, "utf8");
}

console.log(
  JSON.stringify(
    {
      listed: items.length,
      skipped: skipped.length,
      byHost: Object.fromEntries(Object.entries(byHost).map(([h, v]) => [h, v.length])),
      before,
      after: {
        droid: before.droid + (byHost.droid?.length || 0),
        kimi: before.kimi + (byHost.kimi?.length || 0),
        orca: before.orca + (byHost.orca?.length || 0),
        amp: before.amp,
      },
    },
    null,
    2
  )
);

// After new Orca listings: shallow installable verify (repo + orca-plugin.json)
if ((byHost.orca?.length || 0) > 0) {
  console.log("\nRunning verify:orca:new for fresh Orca listings…");
  const v = spawnSync(
    process.execPath,
    [path.join(ROOT, "scripts/verify-orca-installable.mjs"), "--only-unverified"],
    { cwd: ROOT, stdio: "inherit", env: process.env }
  );
  if (v.status) {
    console.warn("verify-orca-installable exited", v.status);
  }
}
