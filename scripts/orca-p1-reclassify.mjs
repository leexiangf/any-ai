/**
 * Orca P1: align categories with official taxonomy, rebuild category grids,
 * fix mojibake on cards, refresh items index badges.
 *
 * Official-ish buckets:
 *   themes · languages · icons · editors · commands-panels · remote-vms
 * Kept extras:
 *   marketplaces
 *
 * Legacy URLs redirect:
 *   content-packs → commands-panels
 *   vm-recipes → remote-vms
 *   syntax → languages
 *   terminal-themes → themes
 *   keybindings → commands-panels
 *
 * Usage: node scripts/orca-p1-reclassify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ORCA = path.join(ROOT, "sites/orca");
const ITEMS = path.join(ORCA, "items");
const CATS = path.join(ORCA, "categories");

const LABELS = {
  themes: { title: "Themes", blurb: "App chrome and terminal color themes." },
  languages: { title: "Languages", blurb: "Syntax grammars and UI locale packs." },
  icons: { title: "Icons", blurb: "File and folder icon themes." },
  editors: { title: "Editors", blurb: "Custom editors, viewers, and diagram tools." },
  "commands-panels": {
    title: "Commands & panels",
    blurb: "Sidebar panels, commands, skills, games, and shortcuts.",
  },
  "remote-vms": { title: "Remote/VMs", blurb: "VM recipes, sandboxes, and remote workspaces." },
  marketplaces: { title: "Marketplaces", blurb: "Catalog and marketplace index sources." },
};

const ACTIVE = Object.keys(LABELS);
const LEGACY_REDIRECT = {
  "content-packs": "commands-panels",
  "vm-recipes": "remote-vms",
  syntax: "languages",
  "terminal-themes": "themes",
  keybindings: "commands-panels",
};

const STAR_SVG = `<svg class="item-star-icon" viewBox="0 0 16 16" aria-hidden="true" width="12" height="12"><path fill="currentColor" d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.92L8 10.77l-3.52 1.85.67-3.92L2.3 5.64l3.94-.57L8 1.5z"/></svg>`;

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

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fixMojibake(s) {
  return String(s || "")
    .replace(/鈥檚/g, "'s")
    .replace(/鈥檛/g, "'t")
    .replace(/鈥檝e/g, "'ve")
    .replace(/鈥檇/g, "'d")
    .replace(/鈥檙e/g, "'re")
    .replace(/鈥檌l/g, "'ll")
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€”/g, "—")
    .replace(/â€“/g, "–")
    .replace(/&amp;amp;apos;/g, "'")
    .replace(/&amp;apos;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\uFFFD/g, "'");
}

function pick(html, re, fb = "") {
  const m = html.match(re);
  return m ? m[1].trim() : fb;
}

function guessCategory({ slug, name, hero, source, current }) {
  const blob = `${slug} ${name} ${hero} ${source} ${current}`.toLowerCase();
  if (/marketplace|orca-catalog|community-plugins|\/orca-plugins\/?$/.test(blob) || /marketplace/.test(current)) {
    return "marketplaces";
  }
  if (/\bicon/.test(blob)) return "icons";
  if (
    /terminal[- ]?theme|solarized.terminal/.test(blob) ||
    current === "terminal-themes"
  ) {
    return "themes";
  }
  if (
    /theme|catppuccin|dracula|nord|oled|midnight|monokai|gruvbox|tokyonight|pastel|solarized|cobalt|github.dark|github.light|matrix.theme|spacedown|moonlit|quiet.pastel|signature.themes|grok.theme|moss_theme/.test(
      blob
    ) ||
    current === "themes"
  ) {
    return "themes";
  }
  if (
    /vm|recipe|multipass|lima|sprites|boat.sandbox|docker.vm|sbx|tenki|sandbox|remote/.test(blob) ||
    current === "vm-recipes"
  ) {
    return "remote-vms";
  }
  if (
    /editor|docx|xlsx|spreadsheet|excalidraw|drawio|sqlite|asciidoc|pptx|image.markup|parquet|latex.preview|graphiql|milko|markdown edit|word document|custom editor/.test(
      blob
    ) ||
    current === "editors"
  ) {
    return "editors";
  }
  if (
    /syntax|highlighting|grammar|prisma|haskell|julia|ocaml|erlang|qml|vhdl|vcl|gdscript|matlab|godot|jsp|nix syntax|http request|systemd|taxi|rego|latex syntax|gleam|language pack|locale|i18n|russian|czech|turkish|vietnamese|portuguese|pt-br|ptbr|zh-tw|zh-hant|traditional chinese|tradu/.test(
      blob
    ) ||
    current === "syntax" ||
    current === "languages"
  ) {
    return "languages";
  }
  if (current === "keybindings" || /keybind|tmux.keys|navigation.shortcut|shortcut/.test(blob)) {
    return "commands-panels";
  }
  if (current === "content-packs" || current === "commands-panels") return "commands-panels";
  return "commands-panels";
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
      const name = fixMojibake(pick(html, /<h1>([^<]+)<\/h1>/i, slug.name));
      const hero = fixMojibake(
        pick(html, /<header class="page-hero">[\s\S]*?<p>([\s\S]*?)<\/p>/i).replace(/<[^>]+>/g, "")
      );
      const current = pick(html, /href="\/categories\/([^/"]+)\/"/i, "commands-panels");
      const source = pick(html, /<dt>Source<\/dt>[\s\S]*?<a href="([^"]+)"/i, "");
      const stars = Number(pick(html, /data-stars="(\d+)"/i, "0")) || 0;
      // stars often only on cards; try meta or leave 0 — enrich later from items index
      const category = guessCategory({
        slug: slug.name,
        name,
        hero,
        source,
        current,
      });
      out.push({
        owner: owner.name,
        slug: slug.name,
        name,
        hero,
        source,
        current,
        category,
        stars,
        file,
        html,
      });
    }
  }
  return out;
}

function starsFromItemsIndex() {
  const file = path.join(ITEMS, "index.html");
  const html = fs.readFileSync(file, "utf8");
  const map = new Map();
  const re =
    /href="\/items\/([^/]+)\/([^/]+)\/"[^>]*data-stars="(\d+)"|href="\/items\/([^/]+)\/([^/]+)\/"[\s\S]*?data-stars="(\d+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    const owner = m[1] || m[4];
    const slug = m[2] || m[5];
    const stars = Number(m[3] || m[6] || 0);
    map.set(`${owner}/${slug}`, stars);
  }
  // simpler parse
  const re2 = /<a class="item" href="\/items\/([^/]+)\/([^/]+)\/"[^>]*data-stars="(\d+)"/gi;
  while ((m = re2.exec(html))) map.set(`${m[1]}/${m[2]}`, Number(m[3]));
  return map;
}

function patchItemPage(item) {
  let html = item.html;
  const from = item.current;
  const to = item.category;
  // category hrefs
  html = html.replaceAll(`/categories/${from}/`, `/categories/${to}/`);
  html = html.replaceAll(`>${from}</a>`, `>${to}</a>`);
  html = html.replaceAll(`>${from}</`, `>${to}</`);
  // badge text in hero
  html = html.replace(
    new RegExp(`(<span class="plugin-badge">)${from.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}(</span>)`, "g"),
    `$1${to}$2`
  );
  // mojibake in page text (heroes already rewritten via thicken mostly)
  html = fixMojibake(html);
  // grammar: is a Orca → is an Orca
  html = html.replace(/\bis a Orca\b/g, "is an Orca");
  html = html.replace(/\bA Orca plugin\b/g, "An Orca plugin");
  // awkward "is an Orca plugin — Description." keep but trim duplicate trailing period before .
  html = html.replace(/plugin — ([^.<][^.]*?)\.<\/strong>/g, "plugin — $1.</strong>");
  if (html !== item.html) fs.writeFileSync(item.file, html, "utf8");
}

function card(item) {
  const stars = item.stars || 0;
  return `          <a class="item" href="/items/${esc(item.owner)}/${esc(item.slug)}/" data-name="${esc(
    item.name
  )}" data-owner="${esc(item.owner)}" data-stars="${stars}"><div class="item-top"><span class="item-badge">${esc(
    item.category
  )}</span><span class="item-stars" title="${stars} GitHub stars" aria-label="${stars} GitHub stars">${STAR_SVG}<span class="item-stars-n">${stars}</span></span></div><div class="item-body"><h2 class="item-name">${esc(
    item.name
  )}</h2><p class="item-one">${esc(fixMojibake(item.hero).slice(0, 180))}</p><p class="item-meta">${esc(
    item.owner
  )}</p></div></a>`;
}

function categoryPage(slug, items) {
  const meta = LABELS[slug];
  const cards = items
    .slice()
    .sort((a, b) => (b.stars || 0) - (a.stars || 0) || a.name.localeCompare(b.name))
    .map(card)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(meta.title)} | Orca Plugin Market</title>
    <meta name="description" content="${esc(meta.blurb)} Browse Orca plugins on orca.aiaaii.com." />
    <link rel="canonical" href="https://orca.aiaaii.com/categories/${slug}/" />
${themeBoot}
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="page-shell">
      <div class="wrap-wide">
        <div class="site-header">
          <a class="brand" href="/"><span class="brand-name">Orca Plugin Market</span><span class="brand-domain">orca.aiaaii.com</span></a>
          <div class="header-end">
            <nav class="nav"><a href="https://aiaaii.com/">Home</a><a href="/items/">Plugins</a><a href="/guides/">Guides</a></nav>
            <button type="button" class="theme-toggle" data-theme-toggle aria-label="Switch color theme" title="Theme"><span class="theme-toggle-icon" aria-hidden="true"></span></button>
          </div>
        </div>
      </div>
      <header class="page-hero">
        <div class="wrap">
          <h1>${esc(meta.title)}</h1>
          <p>${esc(meta.blurb)}</p>
        </div>
      </header>
    </div>
    <main class="section">
      <div class="wrap">
        <div class="catalog-toolbar">
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
        <div class="item-list" data-catalog>
${cards}
        </div>
        <p style="margin-top:2rem"><a href="/items/">← All plugins</a></p>
      </div>
    </main>
    <footer class="site-footer">
      <div class="wrap-wide">
        <div class="brand">
          <span class="brand-name">Orca Plugin Market</span>
          <span class="brand-domain">orca.aiaaii.com · Any AI (AI-AAII)</span>
        </div>
        <div class="footer-row">
          <div>
            <a href="/items/">Plugins</a>
            <a href="/guides/">Guides</a>
            <a href="/submit/">Submit</a>
            <a href="/about/">About</a>
            <a class="mall-link" href="https://aiaaii.com/">Any AI mall</a>
          </div>
          <p>Not affiliated with Orca / Stably</p>
        </div>
      </div>
    </footer>
    <script src="/theme.js" defer></script>
    <script src="/catalog.js" defer></script>
  </body>
</html>
`;
}

function redirectPage(from, to) {
  const label = LABELS[to]?.title || to;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(from)} → ${esc(label)} | Orca Plugin Market</title>
    <meta http-equiv="refresh" content="0; url=/categories/${to}/" />
    <link rel="canonical" href="https://orca.aiaaii.com/categories/${to}/" />
    <meta name="robots" content="noindex" />
    <script>location.replace("/categories/${to}/");</script>
  </head>
  <body>
    <p>This category moved to <a href="/categories/${to}/">${esc(label)}</a>.</p>
  </body>
</html>
`;
}

function rebuildItemsIndex(items) {
  const file = path.join(ITEMS, "index.html");
  let html = fs.readFileSync(file, "utf8");
  const lead = ACTIVE.map((c) => `<a href="/categories/${c}/">${LABELS[c].title}</a>`).join(" · ");
  html = html.replace(
    /<p class="section-lead">[\s\S]*?<\/p>/i,
    `<p class="section-lead">${lead}</p>`
  );

  // Replace each card badge + name + one-liner when we know the item
  const byKey = new Map(items.map((i) => [`${i.owner}/${i.slug}`, i]));
  html = html.replace(
    /<a class="item" href="\/items\/([^/]+)\/([^/]+)\/"([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, owner, slug, attrs, body) => {
      const it = byKey.get(`${owner}/${slug}`);
      if (!it) return fixMojibake(full);
      const starsM = attrs.match(/data-stars="(\d+)"/);
      const stars = starsM ? starsM[1] : String(it.stars || 0);
      return card({ ...it, stars: Number(stars) }).replace(/^\s+/, "");
    }
  );
  html = fixMojibake(html);
  fs.writeFileSync(file, html, "utf8");
}

function updateHome(items) {
  const file = path.join(ORCA, "index.html");
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(/\bA Orca plugin\b/g, "An Orca plugin");
  html = html.replace(/\bis a Orca\b/g, "is an Orca");
  const catCount = ACTIVE.length;
  html = html.replace(/<strong>\d+<\/strong><span>categories<\/span>/, `<strong>${catCount}</strong><span>categories</span>`);
  const grid = ACTIVE.map(
    (c) =>
      `            <a href="/categories/${c}/">${esc(LABELS[c].title)} <small>${esc(
        LABELS[c].blurb
      )}</small></a>`
  ).join("\n");
  html = html.replace(
    /<div class="category-grid">[\s\S]*?<\/div>/i,
    `<div class="category-grid">\n${grid}\n          </div>`
  );
  html = fixMojibake(html);
  fs.writeFileSync(file, html, "utf8");
}

const starMap = starsFromItemsIndex();
const items = listItems();
for (const it of items) {
  if (starMap.has(`${it.owner}/${it.slug}`)) it.stars = starMap.get(`${it.owner}/${it.slug}`);
}

const moved = items.filter((i) => i.current !== i.category);
for (const it of items) patchItemPage(it);

const byCat = Object.fromEntries(ACTIVE.map((c) => [c, []]));
for (const it of items) byCat[it.category].push(it);

for (const slug of ACTIVE) {
  const dir = path.join(CATS, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), categoryPage(slug, byCat[slug]), "utf8");
}
for (const [from, to] of Object.entries(LEGACY_REDIRECT)) {
  const dir = path.join(CATS, from);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), redirectPage(from, to), "utf8");
}

rebuildItemsIndex(items);
updateHome(items);

const counts = Object.fromEntries(ACTIVE.map((c) => [c, byCat[c].length]));
console.log(
  JSON.stringify(
    {
      total: items.length,
      moved: moved.length,
      counts,
      sampleMoves: moved.slice(0, 15).map((m) => `${m.owner}/${m.slug}: ${m.current}→${m.category}`),
    },
    null,
    2
  )
);
