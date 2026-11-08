#!/usr/bin/env node
/**
 * List Amp plugins that passed manual verification (real Amp install paths).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("sites");
const DATE = "2026-11-07";
const before = 32; // current amp listing count expected; computed below

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
  shop: "Amp Plugin Market",
  domain: "amp.aiaaii.com",
  vendor: "Amp / Sourcegraph",
};

/** Verified Amp-usable only */
const BATCH = [
  {
    owner: "WonderInventions",
    slug: "roam-amp-plugin",
    name: "roam",
    hero: "Official Roam plugin for Amp — see agent activity on the map.",
    category: "tools",
    status: "listed · verified amp plugins add",
    source: "https://github.com/WonderInventions/roam-amp-plugin",
    installs: [
      {
        label: "Install",
        code: "amp plugins add https://raw.githubusercontent.com/WonderInventions/roam-amp-plugin/main/roam.ts --auto-update",
      },
      { label: "Then", code: "plugins: reload  (command palette) or restart Amp" },
    ],
  },
  {
    owner: "bnomei",
    slug: "amp-provider-usage",
    name: "provider-usage",
    hero: "Show remaining quota, reset timing, plan details, and credits for Amp / Codex / Grok.",
    category: "tools",
    status: "listed · verified amp plugins add",
    source: "https://github.com/bnomei/amp-provider-usage",
    installs: [
      {
        label: "Install",
        code: "amp plugins add https://raw.githubusercontent.com/bnomei/amp-provider-usage/main/provider-usage.ts --auto-update",
      },
      { label: "Then", code: "plugins: reload  (command palette) or restart Amp" },
    ],
  },
  {
    owner: "Zolplay-Labs",
    slug: "deep-sol",
    name: "deep-sol",
    hero: "Custom Amp agent mode for DeepSeek via Vercel AI Gateway.",
    category: "modes",
    status: "listed · verified amp plugins add",
    source: "https://github.com/Zolplay-Labs/deep-sol",
    installs: [
      {
        label: "Pinned release",
        code: "amp plugins add https://raw.githubusercontent.com/Zolplay-Labs/deep-sol/v0.1.0/deep-sol.ts",
      },
      {
        label: "Follow main",
        code: "amp plugins add https://raw.githubusercontent.com/Zolplay-Labs/deep-sol/main/deep-sol.ts --auto-update",
      },
      { label: "Then", code: "plugins: reload · start a new thread · pick deep-sol mode" },
    ],
  },
  {
    owner: "nguyenphutrong",
    slug: "amp-plugins",
    name: "markdown-commands",
    hero: "Amp plugin that turns markdown into slash commands (from nguyenphutrong/amp-plugins).",
    category: "tools",
    status: "listed · verified amp plugins add",
    source: "https://github.com/nguyenphutrong/amp-plugins",
    installs: [
      {
        label: "Install markdown-commands",
        code: "amp plugins add --auto-update https://raw.githubusercontent.com/nguyenphutrong/amp-plugins/main/plugins/markdown-commands/dist/index.ts",
      },
      { label: "Then", code: "plugins: reload  (command palette) or restart Amp" },
    ],
  },
  {
    owner: "thesammykins",
    slug: "jev_ampcode",
    name: "jev",
    hero: "Native Amp Jev decision plugin — jev_evaluate via Amp AI decide APIs.",
    category: "tools",
    status: "listed · verified Amp plugin (prompt install)",
    source: "https://github.com/thesammykins/jev_ampcode",
    installs: [
      {
        label: "Install (paste into Amp)",
        code: "Install the native Jev plugin from https://github.com/thesammykins/jev_ampcode for this project only. Copy index.ts, decision.ts, and history.ts into .amp/plugins/jev/, then reload plugins.",
      },
      { label: "Confirm", code: "amp plugins list  ·  expect jev_evaluate tool" },
    ],
  },
  {
    owner: "dallenpyrah",
    slug: "semantic-search",
    name: "semantic-search",
    hero: "Semantic + hybrid code search tool for Amp (bundled plugin + searching-code skill).",
    category: "tools",
    status: "listed · verified Amp adapter (local installer)",
    source: "https://github.com/dallenpyrah/semantic-search",
    installs: [
      { label: "Build + install", code: "bun install && bun run amp:build && bun run amp:install" },
      {
        label: "Update URL (bundled)",
        code: "https://raw.githubusercontent.com/dallenpyrah/semantic-search/main/dist/amp/semantic-search.ts",
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
    <title>${esc(`${item.name} — Amp plugin install | ${HOST.shop}`.length <= 65 ? `${item.name} — Amp plugin install | ${HOST.shop}` : `${item.name} — Amp plugin install`)}</title>
    <meta name="description" content="${esc(`${item.name}: ${item.hero}`.slice(0, 140))} Install via amp plugins add." />
    <link rel="canonical" href="https://${HOST.domain}/items/${item.owner}/${item.slug}/" />
${themeBoot}
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="page-shell">
      <div class="wrap-wide">
        <div class="site-header">
          <a class="brand" href="/">
            <span class="brand-name">${esc(HOST.shop)}</span>
            <span class="brand-domain">${HOST.domain} · Any AI</span>
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
        <p class="source-line">Independent rewrite · Updated ${DATE} · Not affiliated with ${esc(HOST.vendor)}</p>
        <p><a href="/items/">← All plugins</a></p>
      </div>
    </main>
    <footer class="site-footer">
      <div class="wrap-wide">
        <div class="brand">
          <span class="brand-name">${esc(HOST.shop)}</span>
          <span class="brand-domain">${HOST.domain} · Any AI (AI-AAII)</span>
        </div>
        <div class="footer-row">
          <div>
            <a href="/items/">Plugins</a>
            <a href="/guides/">Guides</a>
            <a href="/submit/">Submit</a>
            <a href="/about/">About</a>
            <a class="mall-link" href="https://aiaaii.com/">Any AI mall</a>
          </div>
          <p>Not affiliated with ${esc(HOST.vendor)}</p>
        </div>
      </div>
    </footer>
    <script src="/theme.js" defer></script>
  </body>
</html>
`;
}

function countAmp() {
  let n = 0;
  const base = path.join(ROOT, "amp/items");
  for (const o of fs.readdirSync(base, { withFileTypes: true })) {
    if (!o.isDirectory() || o.name.startsWith("_")) continue;
    for (const s of fs.readdirSync(path.join(base, o.name), { withFileTypes: true })) {
      if (s.isDirectory() && fs.existsSync(path.join(base, o.name, s.name, "index.html"))) n++;
    }
  }
  return n;
}

function appendCards(file, items) {
  let html = fs.readFileSync(file, "utf8");
  const marker = items.map(card).join("\n") + "\n";
  const patterns = [
    "</div></div></main>",
    "</div>\n</div></main>",
    '</div><p style="margin-top:2rem">',
    "</div>\n        <p style=\"margin-top:2rem\">",
    "</div>\n<p style=\"margin-top:2rem\">",
  ];
  for (const p of patterns) {
    if (html.includes(p)) {
      fs.writeFileSync(file, html.replace(p, marker + p), "utf8");
      return;
    }
  }
  throw new Error("append failed " + file);
}

function bump(file, from, to) {
  let html = fs.readFileSync(file, "utf8");
  html = html.split(String(from)).join(String(to));
  fs.writeFileSync(file, html, "utf8");
}

const from = countAmp();
const fresh = BATCH.filter((b) => !fs.existsSync(path.join(ROOT, "amp/items", b.owner, b.slug, "index.html")));
for (const item of fresh) {
  const full = path.join(ROOT, "amp/items", item.owner, item.slug, "index.html");
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, thinPage(item), "utf8");
  console.log("page", item.owner + "/" + item.slug);
}
const to = from + fresh.length;

appendCards(path.join(ROOT, "amp/items/index.html"), fresh);
const tools = fresh.filter((i) => i.category === "tools");
const modes = fresh.filter((i) => i.category === "modes");
if (tools.length) appendCards(path.join(ROOT, "amp/categories/tools/index.html"), tools);
if (modes.length && fs.existsSync(path.join(ROOT, "amp/categories/modes/index.html"))) {
  appendCards(path.join(ROOT, "amp/categories/modes/index.html"), modes);
}

// sitemap
{
  const sm = path.join(ROOT, "amp/sitemap.xml");
  let xml = fs.readFileSync(sm, "utf8");
  const urls = fresh
    .map((it) => `  <url><loc>https://amp.aiaaii.com/items/${it.owner}/${it.slug}/</loc><priority>0.8</priority></url>`)
    .join("\n");
  fs.writeFileSync(sm, xml.replace("</urlset>", urls + "\n</urlset>"), "utf8");
}

bump(path.join(ROOT, "amp/items/index.html"), `${from} Amp Plugins`, `${to} Amp Plugins`);
bump(path.join(ROOT, "amp/items/index.html"), `Browse ${from} community`, `Browse ${to} community`);
bump(path.join(ROOT, "amp/items/index.html"), `${from} Amp plugins`, `${to} Amp plugins`);
bump(path.join(ROOT, "amp/index.html"), `<strong>${from}</strong>`, `<strong>${to}</strong>`);

{
  const www = path.join(ROOT, "www/index.html");
  let html = fs.readFileSync(www, "utf8");
  html = html.replace(
    `Plugin market · <strong>${from}</strong> listings · <span class="acronym">amp plugins add</span>`,
    `Plugin market · <strong>${to}</strong> listings · <span class="acronym">amp plugins add</span>`
  );
  fs.writeFileSync(www, html, "utf8");
}

console.log(JSON.stringify({ from, to, added: fresh.length, skippedExisting: BATCH.length - fresh.length }, null, 2));
