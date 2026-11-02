import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("sites/kimi");
const DOMAIN = "kimi.aiaaii.com";
const SHOP = "Kimi Plugin Market";
const VENDOR = "Moonshot AI / Kimi";
const DATE = "2026-11-02";

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

function header(active = "") {
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<div class="site-header">
          <a class="brand" href="/">
            <span class="brand-name">${SHOP}</span>
            <span class="brand-domain">${DOMAIN} · Any AI</span>
          </a>
          <div class="header-end">
            <nav class="nav" aria-label="Primary">
            ${link("/items/", "Plugins", "items")}
            ${link("/guides/", "Guides", "guides")}
            ${link("/submit/", "Submit", "submit")}
            ${link("/about/", "About", "about")}
          </nav>
            <button type="button" class="theme-toggle" data-theme-toggle aria-label="Switch color theme" title="Theme">
              <span class="theme-toggle-icon" aria-hidden="true"></span>
            </button>
          </div>
        </div>`;
}

function footer() {
  return `<footer class="site-footer">
      <div class="wrap-wide">
        <div class="brand">
          <span class="brand-name">${SHOP}</span>
          <span class="brand-domain">${DOMAIN} · Any AI (AI-AAII)</span>
        </div>
        <div class="footer-row">
          <div>
            <a href="/items/">Plugins</a>
            <a href="/guides/">Guides</a>
            <a href="/submit/">Submit</a>
            <a href="/about/">About</a>
            <a class="mall-link" href="https://aiaaii.com/">Any AI mall</a>
          </div>
          <p>Not affiliated with ${VENDOR}</p>
        </div>
      </div>
    </footer>
    <script src="/theme.js" defer></script>`;
}

function page({ title, description, canonical, active, heroTitle, heroSub, body }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonical}" />
${themeBoot}
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="page-shell">
      <div class="wrap-wide">
        ${header(active)}
      </div>
      <header class="page-hero">
        <div class="wrap">
          <h1>${heroTitle}</h1>
          <p>${heroSub}</p>
        </div>
      </header>
    </div>
    <main class="section">
      <div class="wrap prose">
${body}
      </div>
    </main>
    ${footer()}
  </body>
</html>
`;
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

const categories = [
  { slug: "official", name: "Official & curated", blurb: "Moonshot-maintained and partner-curated marketplace entries." },
  { slug: "workflows", name: "Workflows", blurb: "Planning, TDD, delivery, and engineering process packs." },
  { slug: "deployment", name: "Deployment", blurb: "Ship and operate apps on hosting platforms." },
  { slug: "data", name: "Data & memory", blurb: "Market data, memory, and knowledge connectors." },
  { slug: "web", name: "Web & browser", blurb: "Browser control, modern web guidance, SEO audits." },
  { slug: "productivity", name: "Productivity", blurb: "Review, safety nets, and day-to-day agent helpers." },
];

const items = [
  {
    owner: "MoonshotAI",
    slug: "kimi-code-plugins",
    name: "kimi-code plugins marketplace",
    one: "Default Official + Curated catalog shipped with Kimi Code.",
    body: "Thin default marketplace JSON (Official + Curated). Browse it with <code>/plugins marketplace</code>, or install individual Git sources when you outgrow the curated list.",
    category: "official",
    install: "/plugins marketplace",
    installLabel: "Browse default marketplace",
    source: "https://github.com/MoonshotAI/kimi-code/tree/main/plugins",
    status: "listed · official index",
  },
  {
    owner: "MoonshotAI",
    slug: "kimi-datasource",
    name: "kimi-datasource",
    one: "Official finance, macro, news, and literature data plugin.",
    body: "Moonshot-maintained Official plugin for natural-language queries over market data, news, macro indicators, corporate records, academic and legal sources.",
    category: "data",
    install: "/plugins install https://github.com/MoonshotAI/kimi-code",
    note: "Prefer Official tab in <code>/plugins</code> for the managed Datasource package when available.",
    source: "https://github.com/MoonshotAI/kimi-code/tree/main/plugins/official/kimi-datasource",
    status: "listed · official",
  },
  {
    owner: "MoonshotAI",
    slug: "kimi-webbridge",
    name: "kimi-webbridge",
    one: "Official browser-control plugin (Kimi Browser Extension).",
    body: "Lets Kimi drive your real browser. After install, complete the browser extension side of the setup from Official docs, then <code>/reload</code>.",
    category: "web",
    install: "/plugins",
    installLabel: "Open Official tab → install Browser Extension",
    source: "https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins",
    status: "listed · official",
  },
  {
    owner: "obra",
    slug: "superpowers",
    name: "superpowers",
    one: "Planning, TDD, debugging, and delivery workflows for coding agents.",
    body: "Curated in the default Kimi marketplace. Multi-harness skill pack focused on disciplined engineering loops.",
    category: "workflows",
    install: "/plugins install https://github.com/obra/superpowers",
    source: "https://github.com/obra/superpowers",
    status: "listed · curated",
  },
  {
    owner: "vercel",
    slug: "vercel-plugin",
    name: "vercel-plugin",
    one: "Vercel platform skills, agents, and conventions.",
    body: "Partner-curated ecosystem plugin for deployments, Next.js, and Vercel workflows. Also listed in Kimi's default Curated tab.",
    category: "deployment",
    install: "/plugins install https://github.com/vercel/vercel-plugin",
    source: "https://github.com/vercel/vercel-plugin",
    status: "listed · curated",
  },
  {
    owner: "GoogleChrome",
    slug: "modern-web-guidance",
    name: "modern-web-guidance",
    one: "Modern web platform guidance from the Chrome team.",
    body: "Browser compatibility and modern web best-practice skills for coding agents. Curated in the default Kimi marketplace.",
    category: "web",
    install: "/plugins install https://github.com/GoogleChrome/modern-web-guidance",
    source: "https://github.com/GoogleChrome/modern-web-guidance",
    status: "listed · curated",
  },
  {
    owner: "TencentCloudBase",
    slug: "CloudBase-AI-Toolkit",
    name: "CloudBase AI Toolkit",
    one: "Tencent CloudBase apps — DB, functions, storage, auth, hosting.",
    body: "Curated CloudBase plugin (zip release source in the official marketplace). Install from GitHub release zip or via Curated tab.",
    category: "deployment",
    install: "/plugins install https://github.com/TencentCloudBase/CloudBase-AI-Toolkit",
    source: "https://github.com/TencentCloudBase/CloudBase-AI-Toolkit",
    status: "listed · curated",
  },
  {
    owner: "EveryInc",
    slug: "compound-engineering-plugin",
    name: "compound-engineering",
    one: "Compound Engineering workflows with native Kimi manifest.",
    body: "Ships <code>.kimi-plugin/plugin.json</code> and a Kimi marketplace JSON. Install from GitHub, then <code>/reload</code>.",
    category: "workflows",
    install: "/plugins install https://github.com/EveryInc/compound-engineering-plugin",
    alt: "/plugins marketplace https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/.kimi-plugin/marketplace.json",
    altLabel: "Or add their marketplace JSON",
    source: "https://github.com/EveryInc/compound-engineering-plugin",
    status: "listed · community",
  },
  {
    owner: "mem0ai",
    slug: "mem0",
    name: "mem0 (Kimi integration)",
    one: "Memory layer integration packaged for Kimi Code.",
    body: "Community Kimi plugin path under the mem0 integrations tree. Useful when you want persistent agent memory beside the default session.",
    category: "data",
    install: "/plugins install https://github.com/mem0ai/mem0",
    source: "https://github.com/mem0ai/mem0",
    status: "listed · community",
  },
  {
    owner: "bentocodeing",
    slug: "kimi-seo",
    name: "kimi-seo",
    one: "SEO audit suite adapted for Kimi Code CLI.",
    body: "Community SEO skills and agents for site audits. Install, <code>/reload</code>, then follow the plugin's <code>/kimi-seo:seo</code> commands.",
    category: "web",
    install: "/plugins install https://github.com/bentocodeing/kimi-seo",
    source: "https://github.com/bentocodeing/kimi-seo",
    status: "listed · community",
  },
  {
    owner: "alibaba",
    slug: "open-code-review",
    name: "open-code-review",
    one: "Code review plugin with a native Kimi manifest.",
    body: "Alibaba open-code-review ships <code>.kimi-plugin/plugin.json</code> so Kimi can install the review workflows directly from GitHub.",
    category: "productivity",
    install: "/plugins install https://github.com/alibaba/open-code-review",
    source: "https://github.com/alibaba/open-code-review",
    status: "listed · community",
  },
  {
    owner: "DietrichGebert",
    slug: "ponytail",
    name: "ponytail",
    one: "Community plugin with Kimi-native manifest.",
    body: "Independent community pack that publishes <code>.kimi-plugin/plugin.json</code>. Review the repo before enabling MCP or hooks.",
    category: "productivity",
    install: "/plugins install https://github.com/DietrichGebert/ponytail",
    source: "https://github.com/DietrichGebert/ponytail",
    status: "listed · community",
  },
];

const guides = [
  {
    slug: "what-is-a-kimi-plugin",
    title: "What is a Kimi plugin?",
    one: "Skills, agents, MCP, and hooks in one installable package.",
    body: `<p>A Kimi Code plugin is a directory or zip with a manifest at <code>kimi.plugin.json</code> or <code>.kimi-plugin/plugin.json</code>. It can bundle skills, agents, slash commands, hooks, system-prompt contributions, and MCP servers.</p>
<p>Official and Curated entries appear in <code>/plugins</code>. Community plugins usually install from a GitHub URL.</p>
<p>See also: <a href="/guides/how-to-install-kimi-plugin/">install</a> · <a href="/items/">directory</a>.</p>`,
  },
  {
    slug: "how-to-install-kimi-plugin",
    title: "How to install a Kimi plugin",
    one: "Install from Official, Curated, or a GitHub URL.",
    body: `<ol class="steps">
<li>Open the manager: <div class="install-block"><span class="label">TUI</span><code>/plugins</code></div></li>
<li>Official / Curated: select an entry and press Enter.</li>
<li>Or install a GitHub source directly:<div class="install-block"><span class="label">Install</span><code>/plugins install https://github.com/obra/superpowers</code></div></li>
<li>Run <code>/reload</code> or start a new session so skills and agents load.</li>
</ol>
<p>Verify with <code>/plugins list</code>. Source: <a href="https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins" rel="noopener noreferrer">Kimi plugins docs</a>.</p>`,
  },
  {
    slug: "how-to-add-kimi-marketplace",
    title: "How to add a custom Kimi marketplace",
    one: "Point /plugins marketplace at a JSON catalog URL.",
    body: `<p>Kimi accepts a custom marketplace JSON (<code>version</code> + <code>plugins[]</code> with <code>id</code> and <code>source</code>).</p>
<div class="install-block"><span class="label">Browse custom catalog</span><code>/plugins marketplace https://example.com/marketplace.json</code></div>
<p>Or set <code>KIMI_CODE_PLUGIN_MARKETPLACE_URL</code> to override the default catalog for the process.</p>
<p>Example community marketplace: <a href="/items/EveryInc/compound-engineering-plugin/">compound-engineering</a>.</p>`,
  },
  {
    slug: "how-to-reload-after-plugin-install",
    title: "Reload after install, enable, or remove",
    one: "Plugin changes apply after /reload or a new session.",
    body: `<ol class="steps">
<li>Install, enable, disable, or remove a plugin from <code>/plugins</code>.</li>
<li><div class="install-block"><span class="label">Apply</span><code>/reload</code></div></li>
<li>Or run <code>/new</code> / start a fresh session if reload is unavailable.</li>
</ol>
<p>Without reload, skills and MCP from the plugin may stay invisible in the current session.</p>`,
  },
  {
    slug: "how-to-troubleshoot-kimi-plugins",
    title: "Troubleshoot Kimi plugin installs",
    one: "Missing skills, failed Git installs, and marketplace blanks.",
    body: `<ul>
<li><strong>Installed but no skills</strong> — run <code>/reload</code>; confirm the plugin is enabled in the Installed tab.</li>
<li><strong>GitHub install fails</strong> — use an HTTPS repo URL; pin with <code>/tree/&lt;ref&gt;</code> or a release tag when HEAD is broken.</li>
<li><strong>Empty Official/Curated</strong> — check network access to the default marketplace host; try <code>/plugins marketplace</code> without args.</li>
<li><strong>Wrong manifest</strong> — Kimi looks for <code>kimi.plugin.json</code> or <code>.kimi-plugin/plugin.json</code>; Claude-only trees need a Kimi manifest.</li>
</ul>
<p>Prefer upstream docs for API changes. This page is an independent community rewrite.</p>`,
  },
];

// remove sample stubs
for (const p of ["items/_sample", "categories/_sample", "guides/how-to-install", "guides/what-is-a-plugin"]) {
  const full = path.join(ROOT, p);
  fs.rmSync(full, { recursive: true, force: true });
}

// home
write(
  "index.html",
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kimi Plugins - Kimi Plugin Market Install | Any AI</title>
    <meta name="description" content="A Kimi plugin extends Kimi Code — browse Official, Curated, and community plugins. Install with /plugins install. Community directory on kimi.aiaaii.com. Not affiliated with Moonshot AI." />
    <link rel="canonical" href="https://${DOMAIN}/" />
${themeBoot}
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="hero">
      <div class="hero-bg" aria-hidden="true"></div>
      <div class="wrap-wide">
        ${header()}
        <div class="hero-main">
          <p class="hero-kicker">Community directory</p>
          <h1>Kimi plugin</h1>
          <p class="hero-sub">Find Official, Curated, and community plugins for Kimi Code.</p>
          <p class="hero-lead">
            A Kimi plugin extends Kimi Code — browse listings, then install with
            <span class="acronym">/plugins install</span> or the Official / Curated tabs.
          </p>
          <div class="cta-row">
            <a class="btn btn-primary" href="/items/">Browse plugins</a>
            <a class="btn btn-ghost" href="/guides/how-to-install-kimi-plugin/">How to install</a>
          </div>
          <p class="disclaimer">
            Community-maintained by Any AI (AI-AAII). Not affiliated with Moonshot AI or Kimi.
          </p>
        </div>
      </div>
    </header>
    <main>
      <section class="section section-center" aria-labelledby="stats-heading">
        <div class="wrap">
          <p class="section-label">Index</p>
          <h2 id="stats-heading">Built for install, not just bookmarks</h2>
          <ul class="stats">
            <li><strong>${items.length}</strong><span>curated listings</span></li>
            <li><strong>${categories.length}</strong><span>categories</span></li>
            <li><strong>${guides.length}</strong><span>guides</span></li>
          </ul>
        </div>
      </section>
      <section class="section section-alt">
        <div class="wrap">
          <p class="section-label">Why this market</p>
          <h2>Official catalog is thin. Discovery still matters.</h2>
          <ul class="feature-list">
            <li><strong>Directory</strong><span>Official, Curated, and community plugins with source links.</span></li>
            <li><strong>Real commands</strong><span>Copy <span class="acronym">/plugins install</span> and marketplace blocks.</span></li>
            <li><strong>Independent rewrites</strong><span>Detail pages explain role and install — not mirrored READMEs.</span></li>
            <li><strong>Guides</strong><span>Install, custom marketplace JSON, reload, and troubleshooting.</span></li>
          </ul>
        </div>
      </section>
      <section class="section" aria-labelledby="browse-heading">
        <div class="wrap">
          <p class="section-label">Browse</p>
          <h2 id="browse-heading">Featured listings</h2>
          <div class="item-list">
${items
  .slice(0, 6)
  .map(
    (it) => `            <a class="item" href="/items/${it.owner}/${it.slug}/">
              <div class="item-body">
                <h2 class="item-name">${it.name}</h2>
                <p class="item-one">${it.one}</p>
                <p class="item-meta">${it.owner} · ${it.status}</p>
              </div>
              <span class="item-badge">${it.category}</span>
            </a>`
  )
  .join("\n")}
          </div>
          <p style="margin-top:1.25rem"><a class="btn btn-ghost" href="/items/">All ${items.length} plugins →</a></p>
        </div>
      </section>
      <section class="section section-alt" aria-labelledby="cat-heading">
        <div class="wrap">
          <p class="section-label">Categories</p>
          <h2 id="cat-heading">Browse by intent</h2>
          <div class="item-list">
${categories
  .map(
    (c) => `            <a class="item" href="/categories/${c.slug}/">
              <div class="item-body">
                <h2 class="item-name">${c.name}</h2>
                <p class="item-one">${c.blurb}</p>
              </div>
              <span class="item-badge">${items.filter((i) => i.category === c.slug).length}</span>
            </a>`
  )
  .join("\n")}
          </div>
        </div>
      </section>
      <section class="section" aria-labelledby="guides-heading">
        <div class="wrap">
          <p class="section-label">Guides</p>
          <h2 id="guides-heading">Install with real commands</h2>
          <div class="item-list">
${guides
  .map(
    (g) => `            <a class="item" href="/guides/${g.slug}/">
              <div class="item-body">
                <h2 class="item-name">${g.title}</h2>
                <p class="item-one">${g.one}</p>
              </div>
            </a>`
  )
  .join("\n")}
          </div>
        </div>
      </section>
    </main>
    ${footer()}
  </body>
</html>
`
);

// items index
write(
  "items/index.html",
  page({
    title: `All Kimi plugins | ${SHOP}`,
    description: "Browse curated Kimi Code plugins with /plugins install commands.",
    canonical: `https://${DOMAIN}/items/`,
    active: "items",
    heroTitle: "All plugins",
    heroSub: `${items.length} curated listings for Kimi Code.`,
    body: `<div class="item-list">
${items
  .map(
    (it) => `            <a class="item" href="/items/${it.owner}/${it.slug}/">
              <div class="item-body">
                <h2 class="item-name">${it.name}</h2>
                <p class="item-one">${it.one}</p>
                <p class="item-meta">${it.owner} · ${it.status}</p>
              </div>
              <span class="item-badge">${it.category}</span>
            </a>`
  )
  .join("\n")}
          </div>`,
  }).replace('<div class="wrap prose">', '<div class="wrap">')
);

for (const it of items) {
  const blocks = [
    `<p>${it.body}</p>`,
    it.note ? `<p>${it.note}</p>` : "",
    `<div class="install-block"><span class="label">${it.installLabel || "Install"}</span><code>${it.install}</code></div>`,
    it.alt ? `<div class="install-block"><span class="label">${it.altLabel || "Alt"}</span><code>${it.alt}</code></div>` : "",
    `<div class="install-block"><span class="label">Then</span><code>/reload</code></div>`,
    `<dl class="meta-table">
          <dt>Author</dt><dd>${it.owner}</dd>
          <dt>Category</dt><dd><a href="/categories/${it.category}/">${it.category}</a></dd>
          <dt>Status</dt><dd>${it.status}</dd>
          <dt>Source</dt><dd><a href="${it.source}" rel="noopener noreferrer">${it.source.replace(/^https?:\/\//, "")}</a></dd>
        </dl>`,
    `<p class="source-line">Independent rewrite · Updated ${DATE} · Not affiliated with ${VENDOR}</p>`,
    `<p><a href="/items/">← All plugins</a></p>`,
  ]
    .filter(Boolean)
    .join("\n        ");

  write(
    `items/${it.owner}/${it.slug}/index.html`,
    page({
      title: `${it.name} - Kimi plugin | ${SHOP}`,
      description: `${it.one} Community listing on ${DOMAIN}.`,
      canonical: `https://${DOMAIN}/items/${it.owner}/${it.slug}/`,
      active: "items",
      heroTitle: it.name,
      heroSub: it.one,
      body: blocks,
    })
  );
}

for (const c of categories) {
  const list = items.filter((i) => i.category === c.slug);
  write(
    `categories/${c.slug}/index.html`,
    page({
      title: `${c.name} - Kimi plugins | ${SHOP}`,
      description: c.blurb,
      canonical: `https://${DOMAIN}/categories/${c.slug}/`,
      active: "items",
      heroTitle: c.name,
      heroSub: c.blurb,
      body: `<div class="item-list">
${list
  .map(
    (it) => `            <a class="item" href="/items/${it.owner}/${it.slug}/">
              <div class="item-body">
                <h2 class="item-name">${it.name}</h2>
                <p class="item-one">${it.one}</p>
              </div>
            </a>`
  )
  .join("\n")}
          </div>
        <p><a href="/items/">← All plugins</a></p>`,
    }).replace('<div class="wrap prose">', '<div class="wrap">')
  );
}

write(
  "guides/index.html",
  page({
    title: `Kimi plugin guides | ${SHOP}`,
    description: "How to install, add marketplaces, reload, and troubleshoot Kimi plugins.",
    canonical: `https://${DOMAIN}/guides/`,
    active: "guides",
    heroTitle: "Guides",
    heroSub: "Real /plugins commands for Kimi Code.",
    body: `<div class="item-list">
${guides
  .map(
    (g) => `            <a class="item" href="/guides/${g.slug}/">
              <div class="item-body">
                <h2 class="item-name">${g.title}</h2>
                <p class="item-one">${g.one}</p>
              </div>
            </a>`
  )
  .join("\n")}
          </div>`,
  }).replace('<div class="wrap prose">', '<div class="wrap">')
);

for (const g of guides) {
  write(
    `guides/${g.slug}/index.html`,
    page({
      title: `${g.title} | ${SHOP}`,
      description: g.one,
      canonical: `https://${DOMAIN}/guides/${g.slug}/`,
      active: "guides",
      heroTitle: g.title,
      heroSub: g.one,
      body: `${g.body}
        <p class="source-line">Updated ${DATE}</p>
        <p><a href="/guides/">← Guides</a></p>`,
    })
  );
}

write(
  "about/index.html",
  page({
    title: `About | ${SHOP}`,
    description: "Community Kimi Code plugin directory on Any AI (AI-AAII).",
    canonical: `https://${DOMAIN}/about/`,
    active: "about",
    heroTitle: "About this market",
    heroSub: "Community directory for Kimi Code plugins.",
    body: `<p><strong>${SHOP}</strong> is a community-maintained install index on Any AI (AI-AAII). We list Official, Curated, and community plugins with real <code>/plugins</code> commands.</p>
<p>Data comes from the public Kimi marketplace JSON, GitHub manifests (<code>kimi.plugin.json</code> / <code>.kimi-plugin/</code>), and Submit requests. Detail pages are independent rewrites — not mirrored READMEs.</p>
<p><strong>Not affiliated</strong> with Moonshot AI, Kimi, or any listed vendor. Prefer <a href="https://www.kimi.com/code/docs/" rel="noopener noreferrer">official docs</a> for authoritative APIs.</p>
<p><a href="https://aiaaii.com/">Any AI mall</a> · <a href="/submit/">Submit a listing</a></p>`,
  })
);

write(
  "submit/index.html",
  page({
    title: `Submit a Kimi plugin | ${SHOP}`,
    description: "Request a listing on the Kimi Plugin Market.",
    canonical: `https://${DOMAIN}/submit/`,
    active: "submit",
    heroTitle: "Submit a listing",
    heroSub: "Public Git source + a clear /plugins install path.",
    body: `<ol class="steps">
<li>Publish a repo with <code>kimi.plugin.json</code> or <code>.kimi-plugin/plugin.json</code> (or a documented Official/Curated path).</li>
<li>Open a <a href="https://github.com/leexiangf/any-ai/issues/new?template=listing-request.yml">Listing request</a> and mention host <strong>kimi</strong>.</li>
<li>After listing, optional README badge:</li>
</ol>
<pre><code>[![Listed on ${DOMAIN}](https://${DOMAIN}/badges/listed.svg)](https://${DOMAIN}/items/{owner}/{slug}/)</code></pre>
<p><img src="/badges/listed.svg" alt="Listed on ${DOMAIN}" width="184" height="20" /></p>`,
  })
);

write(
  "badges/listed.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="176" height="20" role="img" aria-label="Listed on ${DOMAIN}">
  <title>Listed on ${DOMAIN}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="176" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="68" height="20" fill="#555"/>
    <rect x="68" width="108" height="20" fill="#0071e3"/>
    <rect width="176" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="34" y="14">Listed on</text>
    <text x="122" y="14">${DOMAIN}</text>
  </g>
</svg>
`
);

write(
  "robots.txt",
  `User-agent: *
Allow: /

Sitemap: https://${DOMAIN}/sitemap.xml
`
);

write(
  "_headers",
  `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`
);

const urls = [
  "/",
  "/items/",
  "/guides/",
  "/submit/",
  "/about/",
  ...categories.map((c) => `/categories/${c.slug}/`),
  ...items.map((i) => `/items/${i.owner}/${i.slug}/`),
  ...guides.map((g) => `/guides/${g.slug}/`),
];

write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const pri = u === "/" ? "1.0" : u.startsWith("/items/") && u !== "/items/" ? "0.8" : "0.7";
    return `  <url><loc>https://${DOMAIN}${u}</loc><priority>${pri}</priority></url>`;
  })
  .join("\n")}
</urlset>
`
);

write(
  "wrangler.toml",
  `name = "kimi-aiaaii"
compatibility_date = "2025-10-31"
workers_dev = true

[assets]
directory = "."
html_handling = "auto-trailing-slash"
not_found_handling = "404-page"

[[routes]]
pattern = "kimi.aiaaii.com"
custom_domain = true
`
);

console.log(`Scaffolded ${items.length} items, ${categories.length} categories, ${guides.length} guides → ${ROOT}`);
