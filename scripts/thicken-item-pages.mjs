/**
 * Thicken host item detail pages to the skeleton in
 * docs/宿主插件详情页写作提示词.md
 *
 * Usage:
 *   node scripts/thicken-item-pages.mjs              # all hosts
 *   node scripts/thicken-item-pages.mjs kimi amp     # selected hosts
 *   node scripts/thicken-item-pages.mjs --dry
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("sites");
const DATE = "2026-11-06";
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const hosts = args.filter((a) => !a.startsWith("--"));
const TARGETS = hosts.length ? hosts : ["kimi", "amp", "orca", "droid"];

const HOST = {
  kimi: {
    shop: "Kimi Plugin Market",
    domain: "kimi.aiaaii.com",
    vendor: "Moonshot AI / Kimi",
    keyword: "Kimi plugin",
    navPlugins: "Plugins",
  },
  amp: {
    shop: "Amp Plugin Market",
    domain: "amp.aiaaii.com",
    vendor: "Amp / Sourcegraph",
    keyword: "Amp plugin",
    navPlugins: "Plugins",
  },
  orca: {
    shop: "Orca Plugin Market",
    domain: "orca.aiaaii.com",
    vendor: "Orca / Stably",
    keyword: "Orca plugin",
    navPlugins: "Plugins",
  },
  droid: {
    shop: "Droid Plugin Market",
    domain: "droid.aiaaii.com",
    vendor: "Factory / Droid",
    keyword: "Droid plugin",
    navPlugins: "Plugins",
  },
};

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

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const descCache = new Map();

async function fetchRepoDescription(owner, repo) {
  const key = `${owner}/${repo}`;
  if (descCache.has(key)) return descCache.get(key);
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "aiaaii-thicken",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!r.ok) {
      descCache.set(key, "");
      return "";
    }
    const j = await r.json();
    const d = (j.description || "").trim();
    descCache.set(key, d);
    await new Promise((res) => setTimeout(res, token ? 50 : 400));
    return d;
  } catch {
    descCache.set(key, "");
    return "";
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pick(html, re, fallback = "") {
  const m = html.match(re);
  return m ? m[1].trim() : fallback;
}

function pickAll(html, re) {
  const out = [];
  let m;
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = r.exec(html))) out.push({ label: (m[1] || "").trim(), code: (m[2] || "").trim() });
  return out;
}

function parseItem(filePath, host) {
  const html = fs.readFileSync(filePath, "utf8");
  const rel = path.relative(path.join(ROOT, host, "items"), path.dirname(filePath));
  const parts = rel.split(path.sep);
  const owner = parts[0];
  const slug = parts[1];
  const titleTag = pick(html, /<title>([^<]+)<\/title>/i);
  const name = pick(html, /<h1>([^<]+)<\/h1>/i, slug);
  const hero = pick(html, /<header class="page-hero">[\s\S]*?<p>([\s\S]*?)<\/p>/i).replace(/<[^>]+>/g, "").trim();
  const metaDesc = pick(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const category = pick(html, /href="\/categories\/([^/"]+)\/"/i, "plugins");
  const status = pick(html, /<dt>Status<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i, "listed").replace(/<[^>]+>/g, "").trim();
  const sourceHref = pick(html, /<dt>Source<\/dt>[\s\S]*?<a href="([^"]+)"/i, `https://github.com/${owner}/${slug}`);
  const installs = pickAll(
    html,
    /<div class="install-block">\s*<span class="label">([\s\S]*?)<\/span>\s*<code>([\s\S]*?)<\/code>\s*<\/div>/gi
  );
  const already =
    html.includes(`Updated ${DATE}`) &&
    (html.includes("Core capabilities") || html.includes("What is ") || html.includes("是什么"));
  return {
    filePath,
    host,
    owner,
    slug,
    name,
    hero: hero || metaDesc || `${name} for ${host}`,
    metaDesc,
    titleTag,
    category,
    status,
    sourceHref,
    installs,
    already,
    html,
  };
}

function defaultInstalls(host, owner, slug, sourceHref) {
  if (host === "kimi") {
    return [
      { label: "Install", code: `/plugins install ${sourceHref}` },
      { label: "Fresh session", code: "/new" },
    ];
  }
  if (host === "amp") {
    return [{ label: "Install", code: `amp plugins add ${sourceHref}` }];
  }
  if (host === "droid") {
    return [
      { label: "Add marketplace", code: `droid plugin marketplace add ${sourceHref}` },
      {
        label: "Then install (example)",
        code: `droid plugin install <plugin-id>@${slug} --scope user`,
      },
    ];
  }
  // orca
  return [
    {
      label: "Add marketplace / install",
      code: `Settings → Plugins → add source ${sourceHref} (pin a ref/tag when required)`,
    },
  ];
}

function roleFromHero(hero, name) {
  const t = hero.replace(/\s+/g, " ").trim();
  if (!t) return `${name} community listing`;
  return t.length > 70 ? t.slice(0, 67) + "…" : t;
}

function metaDescription(name, hero, keyword, domain) {
  let base = `${name}: ${hero}`.replace(/\s+/g, " ").trim();
  if (!base.toLowerCase().includes(keyword.split(" ")[0].toLowerCase())) {
    base = `${name} is a ${keyword}. ${hero}`;
  }
  base = base.replace(/\s+/g, " ").trim();
  if (base.length > 155) base = base.slice(0, 152) + "…";
  if (!/listing|install|market/i.test(base)) {
    const tail = ` Community listing on ${domain}.`;
    if (base.length + tail.length <= 160) base += tail;
  }
  return base.slice(0, 160);
}

function capabilities(host, name, hero, ghDesc) {
  const bits = [];
  const src = (ghDesc || hero || "").trim();
  if (src) bits.push(`<strong>Purpose</strong> — ${esc(src)}`);
  bits.push(
    `<strong>Installable on this host</strong> — documented for the ${esc(HOST[host].keyword)} flow on this market.`
  );
  bits.push(
    `<strong>Public source</strong> — review the GitHub repository before enabling third-party code.`
  );
  if (host === "orca" && /theme|icon|language|syntax/i.test(name + src)) {
    bits.push(`<strong>Editor contribution</strong> — typically themes, icons, languages, or layout packs for Orca.`);
  }
  if (host === "kimi") {
    bits.push(`<strong>Session apply</strong> — after install/update, start a fresh session with <code>/new</code> so skills load.`);
  }
  if (host === "droid") {
    bits.push(`<strong>Marketplace + install id</strong> — add the Git marketplace, then install <code>plugin@marketplace</code> with a scope.`);
  }
  if (host === "amp") {
    bits.push(`<strong>Amp add path</strong> — use <code>amp plugins add</code> with a URL or path the Amp CLI accepts.`);
  }
  return bits.slice(0, 6);
}

function faqs(item, cfg) {
  const { name, host, sourceHref } = item;
  const list = [
    {
      q: `Is this ${cfg.keyword} listing the official ${esc(name)} documentation?`,
      a: `<strong>No — this is a community page on ${esc(cfg.shop)} (Any AI).</strong> Prefer the upstream repository for authoritative APIs and release notes.`,
    },
    {
      q: `Where do install commands for ${esc(name)} come from?`,
      a: `<strong>From the public source and host plugin docs — not invented here.</strong> If a command fails, check the repository README and host CLI help for the current syntax.`,
    },
    {
      q: `Do I need to trust third-party code when installing ${esc(name)}?`,
      a: `<strong>Yes — review the GitHub source before enabling.</strong> This directory does not security-audit plugins; treat marketplace installs like any other third-party code.`,
    },
  ];
  if (host === "kimi") {
    list.push({
      q: `Why might ${esc(name)} skills or tools be missing after install on Kimi?`,
      a: `<strong>Start a new session with <code>/new</code> after install or update.</strong> Confirm the plugin is enabled in <code>/plugins</code>; Kimi applies many plugin changes on fresh sessions.`,
    });
  } else if (host === "droid") {
    list.push({
      q: `Why does Droid say the marketplace or plugin was not found for ${esc(name)}?`,
      a: `<strong>Add the marketplace Git URL first, then install with the correct plugin@marketplace id and scope.</strong> Run marketplace update if the catalog looks stale.`,
    });
  } else if (host === "orca") {
    list.push({
      q: `Do I need to pin a git ref when adding ${esc(name)} as an Orca marketplace source?`,
      a: `<strong>Often yes — pin a tag or commit when the host requires an explicit ref.</strong> Follow Orca’s marketplace source docs if install fails without a pin.`,
    });
  } else {
    list.push({
      q: `Can I install ${esc(name)} with a plain git clone instead of Amp’s plugin command?`,
      a: `<strong>Only if you then point <code>amp plugins add</code> at a path or URL Amp accepts.</strong> Cloning alone does not register the plugin inside Amp.`,
    });
  }
  list.push({
    q: `How do I correct a wrong one-liner or install path for ${esc(name)} on this market?`,
    a: `<strong>Open a listing request or issue on the Any AI repo, or comment via Submit.</strong> Source of truth remains ${esc(sourceHref.replace(/^https?:\/\//, ""))}.`,
  });
  return list.slice(0, 5);
}

function render(item, ghDesc, cfg) {
  const installs = item.installs.length ? item.installs : defaultInstalls(item.host, item.owner, item.slug, item.sourceHref);
  const role = roleFromHero(item.hero || ghDesc || item.name, item.name);
  const title = `${item.name} - ${role} | ${cfg.shop}`.slice(0, 70);
  const description = metaDescription(item.name, item.hero || ghDesc || role, cfg.keyword, cfg.domain);
  const caps = capabilities(item.host, item.name, item.hero, ghDesc);
  const faq = faqs(item, cfg);
  const whatLead =
    ghDesc ||
    item.hero ||
    `${item.name} is a community ${cfg.keyword} listed for discovery and install guidance.`;

  const installHtml = installs
    .map(
      (b) => `        <div class="install-block">
          <span class="label">${esc(b.label)}</span>
          <code>${b.code}</code>
        </div>`
    )
    .join("\n");

  const steps = installs
    .map((b, i) => {
      const expect =
        item.host === "kimi" && /new/i.test(b.code)
          ? "Expected: plugin changes apply in the new session."
          : item.host === "kimi" && /install/i.test(b.label + b.code)
            ? "Expected: plugin appears under Installed (confirm trust prompts)."
            : "Expected: command succeeds without inventing alternate flags.";
      return `          <li>
            ${esc(b.label)}.
            <div class="install-block"><span class="label">Step ${i + 1}</span><code>${b.code}</code></div>
            ${expect}
          </li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
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
            <a href="/items/" aria-current="page">${cfg.navPlugins}</a>
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
          <p>${esc(item.hero || ghDesc || role)}</p>
        </div>
      </header>
    </div>
    <main class="section">
      <div class="wrap prose">
        <p>
          <strong>${esc(item.name)}</strong> — ${esc(whatLead)}
          This page on <span class="acronym">${esc(cfg.shop)}</span> (Any AI) is an
          independent rewrite for install discovery. Not affiliated with ${esc(cfg.vendor)}.
        </p>

${installHtml}

        <dl class="meta-table">
          <dt>Author</dt>
          <dd>${esc(item.owner)}</dd>
          <dt>Category</dt>
          <dd><a href="/categories/${esc(item.category)}/">${esc(item.category)}</a></dd>
          <dt>Status</dt>
          <dd>${esc(item.status || "listed")}</dd>
          <dt>Source</dt>
          <dd>
            <a href="${esc(item.sourceHref)}" rel="noopener noreferrer"
              >${esc(item.sourceHref.replace(/^https?:\/\//, ""))}</a
            >
          </dd>
        </dl>

        <h2>What is ${esc(item.name)}?</h2>
        <p>
          <strong>${esc(item.name)} is a ${esc(cfg.keyword)} that ${esc(
    (ghDesc || item.hero || "extends the host with documented capabilities").replace(/\.$/, "")
  )}.</strong>
          Use this listing to copy a real install path and open the upstream source —
          not as a substitute for the repository README.
          (<a href="${esc(item.sourceHref)}" rel="noopener noreferrer">Source</a>)
        </p>

        <h2>Core capabilities</h2>
        <ul>
${caps.map((c) => `          <li>${c}</li>`).join("\n")}
        </ul>

        <h2>How to install and enable ${esc(item.name)}</h2>
        <ol>
${steps}
          <li>
            Open the upstream README if the host asks for a marketplace pin, plugin id,
            or extra enable step beyond the commands above.
          </li>
        </ol>
        <p>
          More host help:
          <a href="/guides/">Guides</a>
          ·
          <a href="/items/">All plugins</a>.
        </p>

        <h2>Typical usage</h2>
        <ol>
          <li>
            Install with the command block above, then confirm the plugin appears in the
            host’s installed / marketplace UI.
          </li>
          <li>
            Exercise one documented skill, theme, or tool from the README — do not assume
            undocumented slash commands.
          </li>
          <li>
            If nothing loads, re-check scope, marketplace pin, trust prompts, or start a
            fresh host session as the vendor docs require.
          </li>
        </ol>

        <h2>When to use it — and caveats</h2>
        <p>
          <strong>Use ${esc(item.name)} when its documented role matches your task.</strong>
          Skip third-party plugins you have not reviewed, and prefer official catalogs when
          they already cover the same job.
        </p>
        <ul>
          <li>Commands and manifests change — re-read the GitHub source after upgrades.</li>
          <li>This market does not vendor or sign the plugin; trust decisions are yours.</li>
          <li>Corrections welcome via <a href="/submit/">Submit</a> on this host market.</li>
        </ul>

        <div class="faq">
${faq
  .map(
    (f) => `          <details>
            <summary>${f.q}</summary>
            <p>${f.a}</p>
          </details>`
  )
  .join("\n")}
        </div>

        <p class="source-line">
          Independent rewrite · Updated ${DATE} · Not affiliated with ${esc(cfg.vendor)} ·
          <a href="${esc(item.sourceHref)}" rel="noopener noreferrer">Source repository</a>
        </p>
        <p>
          <a href="/items/">← All plugins</a>
          ·
          <a href="/categories/${esc(item.category)}/">${esc(item.category)}</a>
        </p>
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
            <a href="/items/">${cfg.navPlugins}</a>
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

function listItemFiles(host) {
  const base = path.join(ROOT, host, "items");
  const out = [];
  if (!fs.existsSync(base)) return out;
  for (const owner of fs.readdirSync(base, { withFileTypes: true })) {
    if (!owner.isDirectory() || owner.name.startsWith("_")) continue;
    const op = path.join(base, owner.name);
    for (const slug of fs.readdirSync(op, { withFileTypes: true })) {
      if (!slug.isDirectory()) continue;
      const index = path.join(op, slug.name, "index.html");
      if (fs.existsSync(index)) out.push(index);
    }
  }
  return out;
}

async function main() {
  let wrote = 0;
  let skipped = 0;
  for (const host of TARGETS) {
    if (!HOST[host]) {
      console.warn("unknown host", host);
      continue;
    }
    const cfg = HOST[host];
    const files = listItemFiles(host);
    console.log(`\n=== ${host}: ${files.length} items ===`);
    for (const file of files) {
      const item = parseItem(file, host);
      // Keep the hand-tuned superpowers sample
      if (host === "kimi" && item.owner === "obra" && item.slug === "superpowers") {
        console.log("skip hand-tuned", item.owner + "/" + item.slug);
        skipped++;
        continue;
      }
      if (item.already && !process.env.FORCE) {
        console.log("skip already", item.owner + "/" + item.slug);
        skipped++;
        continue;
      }
      const repoFromSource = item.sourceHref.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
      const owner = repoFromSource ? repoFromSource[1] : item.owner;
      const repo = repoFromSource ? repoFromSource[2] : item.slug;
      const ghDesc = await fetchRepoDescription(owner, repo);
      const html = render(item, ghDesc, cfg);
      if (dry) {
        console.log("dry", item.owner + "/" + item.slug, "desc=", (ghDesc || "").slice(0, 60));
      } else {
        fs.writeFileSync(file, html, "utf8");
        console.log("write", item.owner + "/" + item.slug);
      }
      wrote++;
    }
  }
  console.log(`\nDone. wrote=${wrote} skipped=${skipped} dry=${dry}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
