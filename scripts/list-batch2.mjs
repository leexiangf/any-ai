/**
 * List second-batch plugins (thin skeletons) + wire indexes/sitemaps/counts.
 * Run: node scripts/list-batch2.mjs && node scripts/thicken-item-pages.mjs droid orca kimi
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
  droid: { shop: "Droid Plugin Market", domain: "droid.aiaaii.com", vendor: "Factory / Droid" },
  orca: { shop: "Orca Plugin Market", domain: "orca.aiaaii.com", vendor: "Orca / Stably" },
  kimi: { shop: "Kimi Plugin Market", domain: "kimi.aiaaii.com", vendor: "Moonshot AI / Kimi" },
  amp: { shop: "Amp Plugin Market", domain: "amp.aiaaii.com", vendor: "Amp / Sourcegraph" },
};

const BATCH = [
  {
    host: "droid",
    owner: "anthropics",
    slug: "skills",
    name: "anthropic-agent-skills",
    hero: "Anthropic example skills marketplace — documents, Claude API, and agent skill demos (Claude-compatible).",
    category: "marketplaces",
    status: "listed · Claude-compatible marketplace",
    source: "https://github.com/anthropics/skills",
    installs: [
      { label: "Add marketplace", code: "droid plugin marketplace add https://github.com/anthropics/skills" },
      { label: "Or shorthand", code: "droid plugin marketplace add anthropics/skills" },
      { label: "Example install", code: "droid plugin install document-skills@anthropic-agent-skills --scope user" },
    ],
  },
  {
    host: "kimi",
    owner: "GanyuanRan",
    slug: "Aegis",
    name: "aegis",
    hero: "Architecture-aware method pack — planning, debugging, review, verification, and delivery.",
    category: "workflows",
    status: "listed · community",
    source: "https://github.com/GanyuanRan/Aegis",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/GanyuanRan/Aegis" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "kimi",
    owner: "vshulcz",
    slug: "deja-vu",
    name: "deja (deja-vu)",
    hero: "Cross-agent memory for Kimi — recall sessions written by Claude Code, Codex, Cursor, and more.",
    category: "data",
    status: "listed · community",
    source: "https://github.com/vshulcz/deja-vu",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/vshulcz/deja-vu" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "kimi",
    owner: "volcengine",
    slug: "OpenViking",
    name: "openviking-memory",
    hero: "Long-term semantic memory for Kimi Code CLI, powered by OpenViking.",
    category: "data",
    status: "listed · community",
    source: "https://github.com/volcengine/OpenViking",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/volcengine/OpenViking" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "kimi",
    owner: "oceanbase",
    slug: "powercontext",
    name: "powercontext",
    hero: "Project memory backed by PowerContext Server — long-term memory and agent handoff.",
    category: "data",
    status: "listed · community",
    source: "https://github.com/oceanbase/powercontext",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/oceanbase/powercontext" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "kimi",
    owner: "neondatabase",
    slug: "agent-skills",
    name: "neon-postgres",
    hero: "Neon serverless Postgres agent skills and MCP — Lakebase, auth, and backend ops.",
    category: "data",
    status: "listed · community",
    source: "https://github.com/neondatabase/agent-skills",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/neondatabase/agent-skills" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "kimi",
    owner: "yikart",
    slug: "AiToEarn",
    name: "aitoearn-growth",
    hero: "AI content growth plugin — publish and grow across social platforms with AiToEarn.",
    category: "workflows",
    status: "listed · community",
    source: "https://github.com/yikart/AiToEarn",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/yikart/AiToEarn" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "kimi",
    owner: "salemalem",
    slug: "npmscan-mcp-plugin",
    name: "npmscan",
    hero: "Detect malicious, vulnerable, or typosquatted npm packages from a conversation.",
    category: "productivity",
    status: "listed · community (also on Droid)",
    source: "https://github.com/salemalem/npmscan-mcp-plugin",
    installs: [
      { label: "Install", code: "/plugins install https://github.com/salemalem/npmscan-mcp-plugin" },
      { label: "Fresh session", code: "/new" },
    ],
  },
  {
    host: "orca",
    owner: "a-lang",
    slug: "orca-traditional-chinese",
    name: "orca-traditional-chinese",
    hero: "Traditional Chinese (zh-TW) UI language pack for Orca.",
    category: "languages",
    status: "listed · community language pack",
    source: "https://github.com/a-lang/orca-traditional-chinese",
    installs: [
      {
        label: "Add marketplace source",
        code: "Settings → Plugins → Marketplace sources → add https://github.com/a-lang/orca-traditional-chinese",
      },
      { label: "Plugin id", code: "a-lang.traditional-chinese" },
    ],
  },
  {
    host: "orca",
    owner: "mark22013333",
    slug: "orca-zh-tw",
    name: "orca-zh-tw",
    hero: "Traditional Chinese (Taiwan) UI translation pack for Orca.",
    category: "languages",
    status: "listed · community language pack",
    source: "https://github.com/mark22013333/orca-zh-tw",
    installs: [
      {
        label: "Add marketplace source",
        code: "Settings → Plugins → Marketplace sources → add https://github.com/mark22013333/orca-zh-tw",
      },
      { label: "Plugin id", code: "mark22013333.zh-tw" },
    ],
  },
  {
    host: "orca",
    owner: "luckury",
    slug: "orca-backlog-md",
    name: "orca-backlog-md",
    hero: "Backlog.md as an Orca task source — experimental (needs upstream Tasks API support).",
    category: "content-packs",
    status: "listed · experimental",
    source: "https://github.com/luckury/orca-backlog-md",
    installs: [
      {
        label: "Add marketplace source",
        code: "Settings → Plugins → Marketplace sources → add https://github.com/luckury/orca-backlog-md",
      },
      { label: "Plugin id", code: "luckury.backlog-md" },
    ],
  },
  {
    host: "orca",
    owner: "coseto6125",
    slug: "ecp-orca-plugin",
    name: "ecp",
    hero: "Symbol-level code graph for agents — warm index per worktree, impact on a keystroke.",
    category: "content-packs",
    status: "listed · community",
    source: "https://github.com/coseto6125/ecp-orca-plugin",
    installs: [
      {
        label: "Add marketplace source",
        code: "Settings → Plugins → Marketplace sources → add https://github.com/coseto6125/ecp-orca-plugin (pin ref v0.1.2)",
      },
      { label: "Plugin id", code: "coseto6125.ecp" },
    ],
  },
  {
    host: "orca",
    owner: "first-fluke",
    slug: "oh-my-agent",
    name: "oh-my-agent (OMA)",
    hero: "OMA project skills — review, debugging, and verification inside Orca agent terminals.",
    category: "content-packs",
    status: "listed · community",
    source: "https://github.com/first-fluke/oh-my-agent",
    installs: [
      {
        label: "Add marketplace source",
        code: "Settings → Plugins → Marketplace sources → add https://github.com/first-fluke/oh-my-agent (pin ref orca-v0.1.0)",
      },
      { label: "Plugin id", code: "first-fluke.oma" },
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
    <title>${esc(`${item.name} — ${cfg.keyword || cfg.shop.replace(" Market", "").toLowerCase()} install | ${cfg.shop}`.slice(0, 65))}</title>
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

function writeFile(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function appendItemCards(file, items) {
  if (!items.length) return;
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
    const idx = html.lastIndexOf('<div class="item-list">');
    if (idx < 0) throw new Error(`no item-list in ${file}`);
    const endList = html.indexOf("</div>", html.lastIndexOf("</a>", html.indexOf("</main>", idx)));
    html = html.slice(0, endList) + "\n" + marker + html.slice(endList);
  }
  fs.writeFileSync(file, html, "utf8");
}

function bumpExact(file, replacements) {
  let html = fs.readFileSync(file, "utf8");
  for (const [from, to] of replacements) {
    if (!html.includes(from)) {
      console.warn("missing bump pattern in", file, JSON.stringify(from));
      continue;
    }
    html = html.split(from).join(to);
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
  xml = xml.replace("</urlset>", `${urls}\n</urlset>`);
  fs.writeFileSync(file, xml, "utf8");
}

for (const item of BATCH) {
  writeFile(path.join(item.host, "items", item.owner, item.slug, "index.html"), thinPage(item));
  console.log("page", item.host, `${item.owner}/${item.slug}`);
}

const byHost = Object.groupBy(BATCH, (x) => x.host);

// Droid 36 -> 37
{
  const items = byHost.droid;
  appendItemCards(path.join(ROOT, "droid/items/index.html"), items);
  appendItemCards(path.join(ROOT, "droid/categories/marketplaces/index.html"), items);
  bumpExact(path.join(ROOT, "droid/items/index.html"), [
    ["36 Droid Plugins", "37 Droid Plugins"],
    ["Browse 36 Droid plugins", "Browse 37 Droid plugins"],
    ["36 Droid plugins", "37 Droid plugins"],
  ]);
  bumpExact(path.join(ROOT, "droid/index.html"), [["<strong>36</strong>", "<strong>37</strong>"]]);
  appendSitemap("droid", items);
}

// Orca 59 -> 64
{
  const items = byHost.orca;
  appendItemCards(path.join(ROOT, "orca/items/index.html"), items);
  appendItemCards(
    path.join(ROOT, "orca/categories/languages/index.html"),
    items.filter((i) => i.category === "languages")
  );
  appendItemCards(
    path.join(ROOT, "orca/categories/content-packs/index.html"),
    items.filter((i) => i.category === "content-packs")
  );
  bumpExact(path.join(ROOT, "orca/items/index.html"), [
    ["59 Orca Plugins", "64 Orca Plugins"],
    ["Browse 59 community", "Browse 64 community"],
    ["59 Orca plugins", "64 Orca plugins"],
  ]);
  bumpExact(path.join(ROOT, "orca/index.html"), [["<strong>59</strong>", "<strong>64</strong>"]]);
  appendSitemap("orca", items);
}

// Kimi 16 -> 23
{
  const items = byHost.kimi;
  appendItemCards(path.join(ROOT, "kimi/items/index.html"), items);
  appendItemCards(
    path.join(ROOT, "kimi/categories/workflows/index.html"),
    items.filter((i) => i.category === "workflows")
  );
  appendItemCards(
    path.join(ROOT, "kimi/categories/data/index.html"),
    items.filter((i) => i.category === "data")
  );
  appendItemCards(
    path.join(ROOT, "kimi/categories/productivity/index.html"),
    items.filter((i) => i.category === "productivity")
  );
  bumpExact(path.join(ROOT, "kimi/items/index.html"), [["16 curated listings", "23 curated listings"]]);
  bumpExact(path.join(ROOT, "kimi/index.html"), [
    ["<strong>16</strong>", "<strong>23</strong>"],
    ["All 16 plugins", "All 23 plugins"],
  ]);
  appendSitemap("kimi", items);
}

{
  const www = path.join(ROOT, "www/index.html");
  bumpExact(www, [
    [
      'Plugin market · <strong>36</strong> listings · <span class="acronym">droid plugin install</span>',
      'Plugin market · <strong>37</strong> listings · <span class="acronym">droid plugin install</span>',
    ],
    [
      "Plugin market · <strong>59</strong> listings · marketplace sources",
      "Plugin market · <strong>64</strong> listings · marketplace sources",
    ],
    [
      'Plugin market · <strong>16</strong> listings · <span class="acronym">/plugins install</span>',
      'Plugin market · <strong>23</strong> listings · <span class="acronym">/plugins install</span>',
    ],
  ]);
}

console.log(`\nListed ${BATCH.length} thin pages. Next: thicken.`);
