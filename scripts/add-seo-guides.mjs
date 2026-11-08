/**
 * Add Kimi + Orca SEO guides (fix-* / how-to), wire indexes + troubleshoot hubs.
 * Usage: node scripts/add-seo-guides.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("sites");
const DATE = "2026-11-07";

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

function guidePage({ host, shop, domain, vendor, slug, title, h1, hero, description, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} | ${shop}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="https://${domain}/guides/${slug}/" />
${themeBoot}
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="page-shell">
      <div class="wrap-wide">
        <div class="site-header">
          <a class="brand" href="/">
            <span class="brand-name">${shop}</span>
            <span class="brand-domain">${domain} · Any AI</span>
          </a>
          <div class="header-end">
            <nav class="nav" aria-label="Primary">
            <a href="/items/">Plugins</a>
            <a href="/guides/" aria-current="page">Guides</a>
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
          <h1>${h1}</h1>
          <p>${hero}</p>
        </div>
      </header>
    </div>
    <main class="section">
      <div class="wrap prose">
${bodyHtml}
        <p class="source-line">Independent rewrite · Updated ${DATE} · Not affiliated with ${vendor}</p>
        <p><a href="/guides/">← Guides</a> · <a href="/guides/how-to-troubleshoot-${host}-plugins/">Troubleshoot hub</a></p>
      </div>
    </main>
    <footer class="site-footer">
      <div class="wrap-wide">
        <div class="brand">
          <span class="brand-name">${shop}</span>
          <span class="brand-domain">${domain} · Any AI (AI-AAII)</span>
        </div>
        <div class="footer-row">
          <div>
            <a href="/items/">Plugins</a>
            <a href="/guides/">Guides</a>
            <a href="/submit/">Submit</a>
            <a href="/about/">About</a>
            <a class="mall-link" href="https://aiaaii.com/">Any AI mall</a>
          </div>
          <p>Not affiliated with ${vendor}</p>
        </div>
      </div>
    </footer>
    <script src="/theme.js" defer></script>
  </body>
</html>
`;
}

const kimi = { host: "kimi", shop: "Kimi Plugin Market", domain: "kimi.aiaaii.com", vendor: "Moonshot AI / Kimi" };
const orca = { host: "orca", shop: "Orca Plugin Market", domain: "orca.aiaaii.com", vendor: "Orca / Stably" };

const GUIDES = [
  {
    ...kimi,
    slug: "fix-kimi-skills-missing-after-install",
    title: "Fix: Kimi skills missing after /plugins install",
    h1: "Skills missing after install",
    hero: "Plugin shows Installed, but skills or agents do not appear.",
    description:
      "Fix Kimi plugins that install but leave skills missing: /reload, enable in /plugins, then /new for a fresh session.",
    bodyHtml: `<p>Kimi often registers a plugin before the current session loads its skills. Treat this as a session-apply issue first.</p>
<ol class="steps">
<li>Open <code>/plugins</code> and confirm the plugin is <strong>enabled</strong> (not only listed).</li>
<li>Run reload:<div class="install-block"><span class="label">Reload</span><code>/reload</code></div></li>
<li>Start a fresh session so skills bind:<div class="install-block"><span class="label">New session</span><code>/new</code></div></li>
<li>If still empty, re-check the repo for <code>kimi.plugin.json</code> or <code>.kimi-plugin/plugin.json</code> — Claude-only trees need a Kimi manifest.</li>
<li>Still stuck → <a href="/guides/how-to-troubleshoot-kimi-plugins/">troubleshoot hub</a>.</li>
</ol>`,
  },
  {
    ...kimi,
    slug: "fix-plugins-install-github-failed",
    title: "Fix: /plugins install GitHub URL failed",
    h1: "/plugins install failed (GitHub)",
    hero: "HTTPS Git install returns an error or never finishes.",
    description:
      "Fix failed Kimi /plugins install from GitHub: use HTTPS, pin a ref with /tree/<ref>, and confirm the Kimi manifest path.",
    bodyHtml: `<p>Use a real HTTPS repository URL — not a clone path and not an SSH remote.</p>
<ol class="steps">
<li>Retry with HTTPS:<div class="install-block"><span class="label">Install</span><code>/plugins install https://github.com/OWNER/REPO</code></div></li>
<li>If <code>main</code> is broken, pin a tag or commit:<div class="install-block"><span class="label">Pinned ref</span><code>/plugins install https://github.com/OWNER/REPO/tree/v1.0.0</code></div></li>
<li>Confirm the tree contains a Kimi plugin manifest at the documented path.</li>
<li>Private repos need credentials the CLI can use; prefer a public release for install tests.</li>
<li>After a successful install, apply with <a href="/guides/how-to-reload-after-plugin-install/">/reload or /new</a>.</li>
</ol>`,
  },
  {
    ...kimi,
    slug: "fix-kimi-marketplace-empty",
    title: "Fix: empty Official or Curated Kimi marketplace",
    h1: "Empty Official / Curated marketplace",
    hero: "Official or Curated tabs show no plugins.",
    description:
      "Fix empty Kimi Official/Curated marketplace tabs: check network, reset marketplace view, and verify custom catalog JSON.",
    bodyHtml: `<p>Empty catalogs are usually network, catalog URL, or custom marketplace JSON — not a missing install command.</p>
<ol class="steps">
<li>Open the manager:<div class="install-block"><span class="label">TUI</span><code>/plugins</code></div></li>
<li>Inspect marketplace config:<div class="install-block"><span class="label">Marketplace</span><code>/plugins marketplace</code></div></li>
<li>If you added a custom catalog, verify the JSON URL returns a valid marketplace index (HTTPS, reachable).</li>
<li>Remove a bad custom source, then re-add with <a href="/guides/how-to-add-kimi-marketplace/">how to add a marketplace</a>.</li>
<li>Still blank → see <a href="/guides/how-to-troubleshoot-kimi-plugins/">troubleshoot</a>.</li>
</ol>`,
  },
  {
    ...kimi,
    slug: "how-to-enable-disable-kimi-plugin",
    title: "How to enable or disable a Kimi plugin",
    h1: "Enable or disable a Kimi plugin",
    hero: "Toggle Installed plugins without uninstalling.",
    description:
      "Enable or disable Kimi plugins from /plugins Installed, then /reload or /new so skills apply.",
    bodyHtml: `<ol class="steps">
<li>Open <code>/plugins</code> and switch to the <strong>Installed</strong> tab.</li>
<li>Select the plugin and toggle enable / disable (wording follows the current TUI).</li>
<li>Apply the change:<div class="install-block"><span class="label">Reload</span><code>/reload</code></div>or start <code>/new</code>.</li>
<li>Confirm skills appear (enabled) or disappear (disabled) in the new session.</li>
<li>To remove entirely, uninstall from the same manager, then reload — see <a href="/guides/how-to-reload-after-plugin-install/">reload guide</a>.</li>
</ol>`,
  },
  {
    ...orca,
    slug: "fix-orca-plugin-not-showing",
    title: "Fix: Orca plugin not showing after install",
    h1: "Plugin not showing after install",
    hero: "Source added or install succeeded, but All / Discover stays empty.",
    description:
      "Fix Orca plugins that do not appear after install: enable Plugins, refresh marketplace source, check reserved ids and category filters.",
    bodyHtml: `<ol class="steps">
<li>Confirm Plugins is enabled: <a href="/guides/how-to-enable-orca-plugins/">enable Orca plugins</a>.</li>
<li>Refresh the marketplace source row; clear last error if present.</li>
<li>Confirm the index was added under <strong>Marketplace sources</strong>, not pasted into Install plugin (<a href="/guides/fix-add-an-explicit-ref/">#ref fix</a>).</li>
<li>Open the pack JSON — publisher/id must match <code>orca-plugin.json</code> and avoid reserved <code>stablyai</code> / <code>orca-</code> ids.</li>
<li>If themes or skills vanish from All, your build may hide those categories — see <a href="/guides/fix-orca-categories-hidden/">hidden categories</a>.</li>
</ol>`,
  },
  {
    ...orca,
    slug: "fix-marketplace-source-error",
    title: "Fix: Orca marketplace source error",
    h1: "Marketplace source error",
    hero: "Source row shows an error after you paste a Git URL.",
    description:
      "Fix Orca marketplace source errors: use a Git index URL, pin when required, and verify orca-marketplace.json shape.",
    bodyHtml: `<ol class="steps">
<li>Use a Git repository URL that contains a marketplace index (not a random single-file gist).</li>
<li>Re-add under Settings → Plugins → Marketplace sources:<div class="install-block"><span class="label">Example</span><code>https://github.com/smwbev/orca-plugins.git</code></div></li>
<li>If the host asks for a pin, use a tag or commit — see <a href="/guides/how-to-add-marketplace-source/">add marketplace source</a>.</li>
<li>Open the index JSON and confirm entries point at valid plugin packs.</li>
<li>Reserved publisher/id failures → <a href="/guides/fix-reserved-plugin-id/">reserved plugin id</a>.</li>
</ol>`,
  },
  {
    ...orca,
    slug: "how-to-update-orca-plugins",
    title: "How to update Orca plugins and marketplace sources",
    h1: "Update Orca plugins",
    hero: "Refresh marketplace pins and installed packs after upstream releases.",
    description:
      "Update Orca marketplace sources and installed plugins: refresh the source pin, then reinstall or update packs from All.",
    bodyHtml: `<ol class="steps">
<li>Open Settings → Plugins → Marketplace sources.</li>
<li>Refresh / update the source so Orca re-fetches the index pin.</li>
<li>Browse <strong>All</strong> / Discover and reinstall or update the pack you need.</li>
<li>For a single plugin Git URL, pin a newer <code>#tag</code> or commit when Install plugin requires an explicit ref.</li>
<li>If the catalog looks stale after refresh → <a href="/guides/how-to-troubleshoot-orca-plugins/">troubleshoot</a>.</li>
</ol>`,
  },
  {
    ...orca,
    slug: "fix-orca-categories-hidden",
    title: "Fix: Orca themes or skills missing from All",
    h1: "Themes / skills missing from All",
    hero: "Marketplace lists packs, but theme or skill categories look empty.",
    description:
      "Fix Orca builds that hide theme or skill categories from All: refresh sources, check pack types, and confirm experimental Plugins is on.",
    bodyHtml: `<p>Some Orca builds filter theme, icon, or skill categories in Discover/All even when the marketplace JSON lists them.</p>
<ol class="steps">
<li>Confirm <a href="/guides/how-to-enable-orca-plugins/">Plugins is enabled</a>.</li>
<li>Refresh the marketplace source; open a pack and verify its declared type matches themes/skills/languages.</li>
<li>Install from the pack detail when category chips are hidden — search by pack name if the UI allows.</li>
<li>Upgrade Orca if your build notes mention experimental category filters.</li>
<li>Community indexes must not use reserved ids — <a href="/guides/fix-reserved-plugin-id/">reserved plugin id</a>.</li>
</ol>`,
  },
];

function writeGuide(g) {
  const dir = path.join(ROOT, g.host, "guides", g.slug);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "index.html");
  fs.writeFileSync(file, guidePage(g), "utf8");
  console.log("write", file);
}

function insertBefore(file, marker, html) {
  let s = fs.readFileSync(file, "utf8");
  if (s.includes(marker.split("\n")[0]) && html.split("\n").some((l) => l && s.includes(l.trim()))) {
    // already has first unique href from html
  }
  const tip = html.match(/href="([^"]+)"/);
  if (tip && s.includes(tip[1])) {
    console.log("skip already linked", tip[1]);
    return;
  }
  if (!s.includes(marker)) throw new Error(`marker missing in ${file}`);
  s = s.replace(marker, html + marker);
  fs.writeFileSync(file, s, "utf8");
  console.log("wire", file);
}

for (const g of GUIDES) writeGuide(g);

// Kimi guides index — insert cards before closing item-list
insertBefore(
  path.join(ROOT, "kimi/guides/index.html"),
  `            <a class="item" href="/guides/how-to-troubleshoot-kimi-plugins/">`,
  `            <a class="item" href="/guides/fix-kimi-skills-missing-after-install/">
              <div class="item-body">
                <h2 class="item-name">Fix: skills missing after install</h2>
                <p class="item-one">/reload, enable, then /new so skills bind.</p>
              </div>
            </a>
            <a class="item" href="/guides/fix-plugins-install-github-failed/">
              <div class="item-body">
                <h2 class="item-name">Fix: /plugins install GitHub failed</h2>
                <p class="item-one">HTTPS URL, pin /tree/ref, check Kimi manifest.</p>
              </div>
            </a>
            <a class="item" href="/guides/fix-kimi-marketplace-empty/">
              <div class="item-body">
                <h2 class="item-name">Fix: empty Official / Curated</h2>
                <p class="item-one">Network, marketplace config, custom JSON.</p>
              </div>
            </a>
            <a class="item" href="/guides/how-to-enable-disable-kimi-plugin/">
              <div class="item-body">
                <h2 class="item-name">Enable or disable a Kimi plugin</h2>
                <p class="item-one">Toggle Installed, then /reload or /new.</p>
              </div>
            </a>
`
);

// Kimi troubleshoot hub links
{
  const f = path.join(ROOT, "kimi/guides/how-to-troubleshoot-kimi-plugins/index.html");
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("fix-kimi-skills-missing-after-install")) {
    s = s.replace(
      `<p>Prefer upstream docs for API changes. This page is an independent community rewrite.</p>`,
      `<h2>Error pages</h2>
<ul>
<li><a href="/guides/fix-kimi-skills-missing-after-install/">Skills missing after install</a></li>
<li><a href="/guides/fix-plugins-install-github-failed/">/plugins install GitHub failed</a></li>
<li><a href="/guides/fix-kimi-marketplace-empty/">Empty Official / Curated</a></li>
<li><a href="/guides/how-to-enable-disable-kimi-plugin/">Enable or disable a plugin</a></li>
</ul>
<p>Prefer upstream docs for API changes. This page is an independent community rewrite.</p>`
    );
    fs.writeFileSync(f, s, "utf8");
    console.log("wire troubleshoot kimi");
  }
}

// Orca guides index
insertBefore(
  path.join(ROOT, "orca/guides/index.html"),
  `        <a href="/guides/how-to-troubleshoot-orca-plugins/">How to troubleshoot Orca plugins<span>Hidden categories, reserved ids, pins</span></a>`,
  `        <a href="/guides/how-to-update-orca-plugins/">How to update Orca plugins<span>Refresh sources and packs</span></a>
`
);

insertBefore(
  path.join(ROOT, "orca/guides/index.html"),
  `        <a href="/guides/fix-reserved-plugin-id/">Reserved plugin id<span>stablyai / orca- identity blocked</span></a>`,
  `        <a href="/guides/fix-orca-plugin-not-showing/">Plugin not showing<span>Empty All after install</span></a>
        <a href="/guides/fix-marketplace-source-error/">Marketplace source error<span>Bad Git index or pin</span></a>
        <a href="/guides/fix-orca-categories-hidden/">Themes / skills missing<span>Category filters in All</span></a>
`
);

// Orca troubleshoot hub
{
  const f = path.join(ROOT, "orca/guides/how-to-troubleshoot-orca-plugins/index.html");
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("fix-orca-plugin-not-showing")) {
    s = s.replace(
      `<li><a href="/guides/fix-reserved-plugin-id/">Reserved plugin id</a></li>
        </ul>`,
      `<li><a href="/guides/fix-reserved-plugin-id/">Reserved plugin id</a></li>
          <li><a href="/guides/fix-orca-plugin-not-showing/">Plugin not showing</a></li>
          <li><a href="/guides/fix-marketplace-source-error/">Marketplace source error</a></li>
          <li><a href="/guides/fix-orca-categories-hidden/">Themes / skills missing from All</a></li>
          <li><a href="/guides/how-to-update-orca-plugins/">Update plugins and sources</a></li>
        </ul>`
    );
    fs.writeFileSync(f, s, "utf8");
    console.log("wire troubleshoot orca");
  }
}

console.log("Done guides.");
