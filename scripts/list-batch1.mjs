/**
 * List first-batch plugins (thin skeletons) + wire indexes/sitemaps/counts.
 * Run: node scripts/list-batch1.mjs
 * Then: node scripts/thicken-item-pages.mjs droid orca kimi amp
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("sites");
const DATE = "2026-11-06";

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
  },
  orca: {
    shop: "Orca Plugin Market",
    domain: "orca.aiaaii.com",
    vendor: "Orca / Stably",
  },
  kimi: {
    shop: "Kimi Plugin Market",
    domain: "kimi.aiaaii.com",
    vendor: "Moonshot AI / Kimi",
  },
  amp: {
    shop: "Amp Plugin Market",
    domain: "amp.aiaaii.com",
    vendor: "Amp / Sourcegraph",
  },
};

/** @type {Array<{
 *  host: string, owner: string, slug: string, name: string, hero: string,
 *  category: string, status: string, source: string,
 *  installs: Array<{label:string, code:string}>
 * }>} */
const BATCH = [
  {
    host: "droid",
    owner: "superfly",
    slug: "fly-droid-plugin",
    name: "fly-droid-plugin",
    hero: "Fly.io marketplace for Droid — deploy apps, Machines, volumes, and Managed Postgres.",
    category: "marketplaces",
    status: "listed · native Factory marketplace",
    source: "https://github.com/superfly/fly-droid-plugin",
    installs: [
      { label: "Add marketplace", code: "droid plugin marketplace add https://github.com/superfly/fly-droid-plugin" },
      { label: "Or shorthand", code: "droid plugin marketplace add superfly/fly-droid-plugin" },
      { label: "Then install", code: "droid plugin install fly@fly-droid-plugin --scope user" },
    ],
  },
  {
    host: "droid",
    owner: "ilyautov",
    slug: "humanizer-ru",
    name: "humanizer-ru",
    hero: "Russian text quality editor — strip AI clichés and bureaucratese without changing facts.",
    category: "marketplaces",
    status: "listed · Claude-compatible marketplace",
    source: "https://github.com/ilyautov/humanizer-ru",
    installs: [
      { label: "Add marketplace", code: "droid plugin marketplace add https://github.com/ilyautov/humanizer-ru" },
      { label: "Or shorthand", code: "droid plugin marketplace add ilyautov/humanizer-ru" },
      { label: "Then install", code: "droid plugin install humanizer-ru@ilyautov-plugins --scope user" },
    ],
  },
  {
    host: "kimi",
    owner: "ayghri",
    slug: "i-have-adhd",
    name: "i-have-adhd",
    hero: "ADHD-friendly agent output — lead with the next action, number steps, restate state.",
    category: "productivity",
    status: "listed · community",
    source: "https://github.com/ayghri/i-have-adhd",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/ayghri/i-have-adhd" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "kimi",
    owner: "kenryu42",
    slug: "cc-safety-net",
    name: "cc-safety-net",
    hero: "Pre-execution guard — block destructive git/fs commands and secret-file access.",
    category: "productivity",
    status: "listed · community",
    source: "https://github.com/kenryu42/cc-safety-net",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/kenryu42/cc-safety-net" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "kimi",
    owner: "Asymptote-Labs",
    slug: "agent-beacon",
    name: "beacon (agent-beacon)",
    hero: "Cross-harness memory from Beacon traces — recall reviewed lessons across agents.",
    category: "data",
    status: "listed · community",
    source: "https://github.com/Asymptote-Labs/agent-beacon",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/Asymptote-Labs/agent-beacon" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "kimi",
    owner: "ChatCut-Inc",
    slug: "agent-plugin",
    name: "chatcut-kimi-work",
    hero: "ChatCut video editor for Kimi Work — captions, silence removal, motion graphics.",
    category: "workflows",
    status: "listed · community",
    source: "https://github.com/ChatCut-Inc/agent-plugin",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/ChatCut-Inc/agent-plugin" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "orca",
    owner: "taranttoola-create",
    slug: "orca-russian",
    name: "orca-russian",
    hero: "Full Russian UI language pack for Orca (15k+ strings; pin marketplace ref).",
    category: "languages",
    status: "listed · community language pack",
    source: "https://github.com/taranttoola-create/orca-russian",
    installs: [
      {
        label: "Add marketplace source",
        code: "Settings → Plugins → Marketplace sources → add https://github.com/taranttoola-create/orca-russian (pin ref v1.3.6)",
      },
      { label: "Plugin id", code: "taranttoola-create.russian" },
    ],
  },
  {
    host: "orca",
    owner: "imgusev",
    slug: "orca-plugins",
    name: "orca-plugins (imgusev)",
    hero: "imgusev Orca marketplace — Russian language pack and related community plugins.",
    category: "marketplaces",
    status: "listed · community marketplace",
    source: "https://github.com/imgusev/orca-plugins",
    installs: [
      {
        label: "Add marketplace source",
        code: "Settings → Plugins → Marketplace sources → add https://github.com/imgusev/orca-plugins",
      },
      { label: "Example plugin id", code: "imgusev.russian-language-pack" },
    ],
  },
  {
    host: "orca",
    owner: "xinnyu",
    slug: "orca-notify",
    name: "orca-notify",
    hero: "Webhook notifications when Orca agents finish, block, or wait (macOS, unofficial).",
    category: "content-packs",
    status: "listed · community",
    source: "https://github.com/xinnyu/orca-notify",
    installs: [
      {
        label: "Add marketplace source",
        code: "Settings → Plugins → Marketplace sources → add https://github.com/xinnyu/orca-notify (pin ref v1.3.0)",
      },
      { label: "Plugin id", code: "xinnyu.agent-notify" },
    ],
  },
  {
    host: "orca",
    owner: "LuticaCANARD",
    slug: "orca-discord-presence",
    name: "orca-discord-presence",
    hero: "Publish Orca agent fleet activity to Discord Rich Presence.",
    category: "content-packs",
    status: "listed · community",
    source: "https://github.com/LuticaCANARD/orca-discord-presence",
    installs: [
      {
        label: "Add marketplace source",
        code: "Settings → Plugins → Marketplace sources → add https://github.com/LuticaCANARD/orca-discord-presence (pin ref v0.3.1)",
      },
      { label: "Plugin id", code: "lutica-canard.discord-presence" },
    ],
  },
  {
    host: "amp",
    owner: "Project-White-Rabbit",
    slug: "bitfab-amp-plugin",
    name: "bitfab-amp-plugin",
    hero: "Bitfab Amp skills — instrument, replay, and diagnose AI workflow traces.",
    category: "tools",
    status: "listed · community (alpha)",
    source: "https://github.com/Project-White-Rabbit/bitfab-amp-plugin",
    installs: [
      { label: "Recommended", code: "npx bitfab-cli init --editor amp" },
      { label: "Plugin only", code: "npx bitfab-cli plugin-install --editor amp" },
      {
        label: "Manual clone",
        code: "git clone --depth 1 https://github.com/Project-White-Rabbit/bitfab-amp-plugin.git ~/.config/amp/plugins/bitfab",
      },
      { label: "Then", code: "plugins: reload  (command palette) or restart Amp" },
    ],
  },
];

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function card(item) {
  return `          <a class="item" href="/items/${item.owner}/${item.slug}/"><div class="item-body"><h2 class="item-name">${esc(item.name)}</h2><p class="item-one">${esc(item.hero)}</p><p class="item-meta">${esc(item.owner)}</p></div><span class="item-badge">${esc(item.category)}</span></a>`;
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
    <title>${esc(item.name)} - ${esc(item.hero.slice(0, 48))} | ${esc(cfg.shop)}</title>
    <meta name="description" content="${esc(`${item.name}: ${item.hero}`.slice(0, 155))}" />
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

function writeFile(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function insertBefore(hay, needle, insert) {
  const i = hay.indexOf(needle);
  if (i < 0) throw new Error(`needle not found: ${needle.slice(0, 60)}`);
  return hay.slice(0, i) + insert + hay.slice(i);
}

function replaceCount(html, fromN, toN) {
  return html
    .replaceAll(String(fromN), (m, offset, s) => {
      // only replace standalone count contexts — handled by explicit pairs below
      return m;
    });
}

function bumpHtmlCounts(file, pairs) {
  let html = fs.readFileSync(file, "utf8");
  for (const [from, to] of pairs) {
    html = html.split(String(from)).join(String(to));
  }
  fs.writeFileSync(file, html, "utf8");
}

function appendItemCards(file, items, closeNeedle = "</div>") {
  let html = fs.readFileSync(file, "utf8");
  // insert before the last closing of item-list: find `</div>` after item-list
  const marker = items.map(card).join("\n") + "\n";
  // Prefer inserting before `</div></div></main>` or `</div><p` patterns common in indexes
  const patterns = [
    "</div></div></main>",
    "</div>\n</div></main>",
    '</div><p style="margin-top:2rem">',
    "</div>\n<p style=\"margin-top:2rem\">",
    "</div>\n        <p style=\"margin-top:2rem\">",
    "</div>\n        <p><a href=\"/items/\">← All plugins</a></p>",
    "</div>\n        <p><a href=\"/items/\">All plugins</a></p>",
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
    // fallback: before last </div> inside item-list — insert before `</div></div></main>`-like
    const idx = html.lastIndexOf('<div class="item-list">');
    if (idx < 0) throw new Error(`no item-list in ${file}`);
    const close = html.indexOf("</div>", idx + 20);
    // find matching close of item-list: walk to the close after last item
    const endList = html.indexOf("</div>", html.lastIndexOf("</a>", html.indexOf("</main>", idx)));
    html = html.slice(0, endList) + "\n" + marker + html.slice(endList);
  }
  fs.writeFileSync(file, html, "utf8");
}

function appendSitemap(host, items) {
  const file = path.join(ROOT, host, "sitemap.xml");
  let xml = fs.readFileSync(file, "utf8");
  const urls = items
    .map(
      (it) =>
        `  <url><loc>https://${HOST[host].domain}/items/${it.owner}/${it.slug}/</loc><priority>0.8</priority></url>`
    )
    .join("\n");
  if (!xml.includes("</urlset>")) throw new Error(`bad sitemap ${file}`);
  xml = xml.replace("</urlset>", `${urls}\n</urlset>`);
  fs.writeFileSync(file, xml, "utf8");
}

// --- write thin pages ---
for (const item of BATCH) {
  const rel = path.join(item.host, "items", item.owner, item.slug, "index.html");
  writeFile(rel, thinPage(item));
  console.log("page", item.host, item.owner + "/" + item.slug);
}

// --- per-host index / category / counts ---
const byHost = Object.groupBy(BATCH, (x) => x.host);

// Droid 34 -> 36
{
  const items = byHost.droid;
  appendItemCards(path.join(ROOT, "droid/items/index.html"), items, null);
  appendItemCards(path.join(ROOT, "droid/categories/marketplaces/index.html"), items);
  bumpHtmlCounts(path.join(ROOT, "droid/items/index.html"), [
    [34, 36],
  ]);
  bumpHtmlCounts(path.join(ROOT, "droid/index.html"), [[34, 36]]);
  appendSitemap("droid", items);
}

// Orca 55 -> 59
{
  const items = byHost.orca;
  appendItemCards(path.join(ROOT, "orca/items/index.html"), items);
  const lang = items.filter((i) => i.category === "languages");
  const mp = items.filter((i) => i.category === "marketplaces");
  const cp = items.filter((i) => i.category === "content-packs");
  if (lang.length) appendItemCards(path.join(ROOT, "orca/categories/languages/index.html"), lang);
  if (mp.length) appendItemCards(path.join(ROOT, "orca/categories/marketplaces/index.html"), mp);
  if (cp.length) appendItemCards(path.join(ROOT, "orca/categories/content-packs/index.html"), cp);
  bumpHtmlCounts(path.join(ROOT, "orca/items/index.html"), [[55, 59]]);
  bumpHtmlCounts(path.join(ROOT, "orca/index.html"), [[55, 59]]);
  appendSitemap("orca", items);
}

// Kimi 12 -> 16
{
  const items = byHost.kimi;
  appendItemCards(path.join(ROOT, "kimi/items/index.html"), items);
  const prod = items.filter((i) => i.category === "productivity");
  const data = items.filter((i) => i.category === "data");
  const wf = items.filter((i) => i.category === "workflows");
  if (prod.length) appendItemCards(path.join(ROOT, "kimi/categories/productivity/index.html"), prod);
  if (data.length) appendItemCards(path.join(ROOT, "kimi/categories/data/index.html"), data);
  if (wf.length) {
    const wfPath = path.join(ROOT, "kimi/categories/workflows/index.html");
    if (fs.existsSync(wfPath)) appendItemCards(wfPath, wf);
  }
  bumpHtmlCounts(path.join(ROOT, "kimi/items/index.html"), [[12, 16]]);
  bumpHtmlCounts(path.join(ROOT, "kimi/index.html"), [[12, 16]]);
  appendSitemap("kimi", items);
}

// Amp 31 -> 32
{
  const items = byHost.amp;
  appendItemCards(path.join(ROOT, "amp/items/index.html"), items);
  appendItemCards(path.join(ROOT, "amp/categories/tools/index.html"), items);
  bumpHtmlCounts(path.join(ROOT, "amp/items/index.html"), [[31, 32]]);
  bumpHtmlCounts(path.join(ROOT, "amp/index.html"), [[31, 32]]);
  appendSitemap("amp", items);
}

// www mall counts
{
  const www = path.join(ROOT, "www/index.html");
  let html = fs.readFileSync(www, "utf8");
  html = html
    .replace(
      "Plugin market · <strong>34</strong> listings · <span class=\"acronym\">droid plugin install</span>",
      "Plugin market · <strong>36</strong> listings · <span class=\"acronym\">droid plugin install</span>"
    )
    .replace(
      "Plugin market · <strong>55</strong> listings · marketplace sources",
      "Plugin market · <strong>59</strong> listings · marketplace sources"
    )
    .replace(
      "Plugin market · <strong>12</strong> listings · <span class=\"acronym\">/plugins install</span>",
      "Plugin market · <strong>16</strong> listings · <span class=\"acronym\">/plugins install</span>"
    )
    .replace(
      "Plugin market · <strong>31</strong> listings · <span class=\"acronym\">amp plugins add</span>",
      "Plugin market · <strong>32</strong> listings · <span class=\"acronym\">amp plugins add</span>"
    );
  fs.writeFileSync(www, html, "utf8");
  console.log("www counts updated");
}

console.log(`\nListed ${BATCH.length} thin pages. Next: thicken.`);
