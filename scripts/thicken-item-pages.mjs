/**
 * Thicken host item detail pages to the skeleton in
 * docs/宿主插件详情页写作提示词.md
 *
 * Usage:
 *   node scripts/thicken-item-pages.mjs              # all hosts (skip already-thick)
 *   node scripts/thicken-item-pages.mjs kimi amp     # selected hosts
 *   node scripts/thicken-item-pages.mjs --seo-only   # title + related + desc (no GH fetch)
 *   node scripts/thicken-item-pages.mjs --force      # full rewrite even if thick
 *   node scripts/thicken-item-pages.mjs --dry
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("sites");
const REPO_ROOT = path.resolve(".");
const DATE = new Date().toISOString().slice(0, 10);
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const force = args.includes("--force");
const seoOnly = args.includes("--seo-only");
const hosts = args.filter((a) => !a.startsWith("--"));
const TARGETS = hosts.length ? hosts : ["kimi", "amp", "orca", "droid"];

const CONTENT_CONTRIB_KEYS = new Set([
  "themes",
  "iconThemes",
  "icons",
  "languages",
  "syntaxes",
  "grammars",
  "translations",
  "terminalThemes",
]);

const HOST = {
  kimi: {
    shop: "Kimi Plugin Market",
    domain: "kimi.aiaaii.com",
    vendor: "Moonshot AI / Kimi",
    keyword: "Kimi plugin",
    navPlugins: "Plugins",
    guides: [
      { href: "/guides/how-to-install-kimi-plugin/", title: "How to install a Kimi plugin" },
      { href: "/guides/how-to-add-kimi-marketplace/", title: "How to add a custom Kimi marketplace" },
      { href: "/guides/how-to-reload-after-plugin-install/", title: "Reload after install" },
      { href: "/guides/fix-kimi-skills-missing-after-install/", title: "Fix: skills missing after install" },
      { href: "/guides/how-to-troubleshoot-kimi-plugins/", title: "Troubleshoot Kimi plugins" },
    ],
  },
  amp: {
    shop: "Amp Plugin Market",
    domain: "amp.aiaaii.com",
    vendor: "Amp / Sourcegraph",
    keyword: "Amp plugin",
    navPlugins: "Plugins",
    guides: [
      { href: "/guides/amp-plugins-add/", title: "amp plugins add" },
      { href: "/guides/how-to-install-amp-plugin/", title: "How to install an Amp plugin" },
      { href: "/guides/fix-amp-plugins-add-failed/", title: "Fix: amp plugins add failed" },
      { href: "/guides/how-to-troubleshoot-amp-plugins/", title: "Troubleshoot Amp plugins" },
    ],
  },
  orca: {
    shop: "Orca Plugin Market",
    domain: "orca.aiaaii.com",
    vendor: "Orca / Stably",
    keyword: "Orca plugin",
    navPlugins: "Plugins",
    guides: [
      { href: "/guides/how-to-install-orca-plugin/", title: "How to install an Orca plugin" },
      { href: "/guides/how-to-add-marketplace-source/", title: "How to add a marketplace source" },
      { href: "/guides/fix-add-an-explicit-ref/", title: "Fix: add an explicit #ref" },
      { href: "/guides/fix-orca-plugin-not-showing/", title: "Fix: plugin not showing" },
      { href: "/guides/how-to-troubleshoot-orca-plugins/", title: "Troubleshoot Orca plugins" },
    ],
  },
  droid: {
    shop: "Droid Plugin Market",
    domain: "droid.aiaaii.com",
    vendor: "Factory / Droid",
    keyword: "Droid plugin",
    navPlugins: "Plugins",
    guides: [
      { href: "/guides/droid-plugin-install/", title: "droid plugin install" },
      { href: "/guides/droid-plugin-marketplace-add/", title: "droid plugin marketplace add" },
      { href: "/guides/fix-droid-plugin-not-found/", title: "Fix: plugin not found" },
      { href: "/guides/how-to-troubleshoot-droid-plugins/", title: "Troubleshoot Droid plugins" },
    ],
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
const manifestCache = new Map();
const orcaManifestPaths = loadOrcaManifestPaths();

function loadOrcaManifestPaths() {
  const map = new Map();
  const files = [
    "ops/discover/orca-deep.json",
    "ops/discover/latest.json",
    "ops/discover/last-listed.json",
    "ops/discover/picks-batch.json",
  ];
  for (const rel of files) {
    const full = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(full)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(full, "utf8"));
      const rows = Array.isArray(raw)
        ? raw
        : [...(raw.candidates || []), ...(raw.items || []), ...(raw.hosts?.orca?.candidates || [])];
      for (const c of rows) {
        const repo = c.repo || (c.owner && c.slug ? `${c.owner}/${c.slug}` : null);
        const mp = c.manifestPath || c.paths?.[0];
        if (repo && mp && !map.has(repo)) map.set(repo, mp);
      }
    } catch {
      /* ignore */
    }
  }
  return map;
}

function ghHeaders(extra = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "aiaaii-thicken",
    ...extra,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchRepoMeta(owner, repo) {
  const key = `${owner}/${repo}`;
  if (descCache.has(key)) return descCache.get(key);
  const empty = { description: "", defaultBranch: "main" };
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders() });
    if (!r.ok) {
      descCache.set(key, empty);
      return empty;
    }
    const j = await r.json();
    const meta = {
      description: (j.description || "").trim(),
      defaultBranch: j.default_branch || "main",
    };
    descCache.set(key, meta);
    await new Promise((res) => setTimeout(res, token ? 50 : 400));
    return meta;
  } catch {
    descCache.set(key, empty);
    return empty;
  }
}

async function fetchRepoDescription(owner, repo) {
  return (await fetchRepoMeta(owner, repo)).description;
}

async function fetchJsonRaw(owner, repo, branch, filePath) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath.replace(/^\/+/, "")}`;
  const r = await fetch(url, { headers: { "User-Agent": "aiaaii-thicken" } });
  if (!r.ok) return null;
  try {
    return await r.json();
  } catch {
    return null;
  }
}

function deriveOrcaPluginFolder(listingSlug, sourceHref = "") {
  const fromSrc = String(sourceHref).match(/\/plugins\/([^/]+)\/?$/i) || String(sourceHref).match(/\/plugins\/([^/]+)\//i);
  if (fromSrc) return fromSrc[1];
  const slug = String(listingSlug || "");
  return slug.startsWith("orca-") ? slug.slice("orca-".length) : slug;
}

async function fetchOrcaManifest(owner, repo, defaultBranch = "main", opts = {}) {
  const listingSlug = opts.listingSlug || repo;
  const sourceHref = opts.sourceHref || "";
  const key = `${owner}/${listingSlug}`;
  if (manifestCache.has(key)) return manifestCache.get(key);

  const folder = deriveOrcaPluginFolder(listingSlug, sourceHref);
  const treeMatch = String(sourceHref).match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+?)\/?$/i);

  /** @type {{ owner: string, repo: string, branch: string, paths: string[] }[]} */
  const searches = [];

  // 1) Path inside the linked tree (monorepo source URLs)
  if (treeMatch) {
    const [, tOwner, tRepo, tBranch, tPath] = treeMatch;
    searches.push({
      owner: tOwner,
      repo: tRepo.replace(/\.git$/, ""),
      branch: tBranch,
      paths: [`${tPath.replace(/\/$/, "")}/orca-plugin.json`, `${tPath.replace(/\/$/, "")}/plugin/orca-plugin.json`],
    });
  }

  // 2) Listing repo itself
  const known = orcaManifestPaths.get(`${owner}/${listingSlug}`) || orcaManifestPaths.get(`${owner}/${repo}`);
  searches.push({
    owner,
    repo,
    branch: defaultBranch,
    paths: [
      known,
      "orca-plugin.json",
      "plugin/orca-plugin.json",
      "orca-plugin/orca-plugin.json",
      folder ? `plugins/${folder}/orca-plugin.json` : null,
      `plugins/${listingSlug}/orca-plugin.json`,
      `plugins/${listingSlug.replace(/^orca-/, "")}/orca-plugin.json`,
    ].filter(Boolean),
  });

  // 3) Official stablyai monorepo fallback
  if (owner === "stablyai" || /stablyai\/orca-plugins/i.test(sourceHref)) {
    searches.push({
      owner: "stablyai",
      repo: "orca-plugins",
      branch: "main",
      paths: [
        folder ? `plugins/${folder}/orca-plugin.json` : null,
        `plugins/${listingSlug}/orca-plugin.json`,
        `plugins/${listingSlug.replace(/^orca-/, "")}/orca-plugin.json`,
      ].filter(Boolean),
    });
  }

  const tried = new Set();
  for (const search of searches) {
    for (const filePath of search.paths) {
      const tryKey = `${search.owner}/${search.repo}@${search.branch}:${filePath}`;
      if (!filePath || tried.has(tryKey)) continue;
      tried.add(tryKey);
      const json = await fetchJsonRaw(search.owner, search.repo, search.branch, filePath);
      if (json && (json.id || json.name || json.manifestVersion)) {
        const hit = {
          manifest: json,
          manifestPath: filePath,
          branch: search.branch,
          fromRepo: `${search.owner}/${search.repo}`,
        };
        manifestCache.set(key, hit);
        await new Promise((res) => setTimeout(res, token ? 40 : 250));
        return hit;
      }
    }
  }
  manifestCache.set(key, null);
  return null;
}

function accessFromManifest(manifest, category = "") {
  const exec = String(manifest?.execution || "").toLowerCase();
  if (exec === "data" || exec === "content" || exec === "content-only") {
    return {
      label: "Content only",
      detail: "Only themes, icons, syntaxes or translations. No plugin code runs; installs in one click.",
    };
  }
  const contrib = manifest?.contributes && typeof manifest.contributes === "object" ? manifest.contributes : {};
  const keys = Object.keys(contrib).filter((k) => Array.isArray(contrib[k]) && contrib[k].length);
  const onlyContent =
    keys.length > 0 &&
    keys.every((k) => CONTENT_CONTRIB_KEYS.has(k)) &&
    !(Array.isArray(manifest?.capabilities) && manifest.capabilities.length);
  if (onlyContent || /theme|icon|syntax|language/i.test(category)) {
    if (onlyContent || exec === "") {
      // Prefer Content only when contributes are purely decorative/content.
      if (onlyContent) {
        return {
          label: "Content only",
          detail: "Only themes, icons, syntaxes or translations. No plugin code runs; installs in one click.",
        };
      }
    }
  }
  if (/vm|recipe|remote/i.test(category) || keys.includes("vmRecipes") || keys.includes("recipes")) {
    return {
      label: "Adds VM recipes",
      detail: "Contributes remote/VM recipes. Review the repository before enabling.",
    };
  }
  if (keys.some((k) => /editor|customEditor/i.test(k))) {
    return {
      label: "Opens and edits files",
      detail: "Contributes editors or file openers. Plugin code may run inside Orca.",
    };
  }
  return {
    label: "Runs plugin code",
    detail: "May add panels, commands, or other runtime behavior. Review the GitHub source before enabling.",
  };
}

function contributesSummary(manifest) {
  const contrib = manifest?.contributes;
  if (!contrib || typeof contrib !== "object") return [];
  const out = [];
  for (const [key, val] of Object.entries(contrib)) {
    if (!Array.isArray(val) || !val.length) continue;
    const labels = val
      .map((x) => x?.label || x?.title || x?.name || x?.id)
      .filter(Boolean)
      .slice(0, 6);
    const nice = key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    out.push({ key: nice, labels: labels.length ? labels : [`${val.length} item(s)`] });
  }
  return out.slice(0, 8);
}

function orcaOfficialCatalogUrl(publisher, pluginId, owner) {
  if (!publisher || !pluginId) return "";
  // Official stablyai listings are served under the orca-plugins marketplace path.
  if (publisher === "stablyai" || owner === "stablyai") {
    return `https://www.onorca.dev/plugins/stablyai/orca-plugins/${encodeURIComponent(pluginId)}`;
  }
  return `https://www.onorca.dev/plugins/${encodeURIComponent(publisher)}/${encodeURIComponent(owner || publisher)}/${encodeURIComponent(pluginId)}`;
}

function loadOrcaInstallsCache() {
  const full = path.join(REPO_ROOT, "ops/discover/orca-installs.json");
  if (!fs.existsSync(full)) return { byName: {}, byId: {} };
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return { byName: {}, byId: {} };
  }
}

const ORCA_INSTALLS = loadOrcaInstallsCache();

function lookupCachedInstalls(displayName, pluginId, listingId) {
  const byId = ORCA_INSTALLS.byId || {};
  const byName = ORCA_INSTALLS.byName || {};
  if (pluginId && byId[pluginId.toLowerCase()] != null) return Number(byId[pluginId.toLowerCase()]);
  if (listingId && byId[listingId.toLowerCase()] != null) return Number(byId[listingId.toLowerCase()]);
  const key = String(displayName || "").toLowerCase();
  if (byName[key] != null) return Number(byName[key]);
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

function mediaFromManifestHit(hit, fallbackName = "") {
  const m = hit?.manifest;
  if (!m || !hit.fromRepo) return { cover: null, shots: [] };
  const dir = hit.manifestPath.includes("/")
    ? hit.manifestPath.replace(/\/[^/]+$/, "")
    : "";
  const base = `https://raw.githubusercontent.com/${hit.fromRepo}/${hit.branch || "main"}/${
    dir ? dir + "/" : ""
  }`;
  const abs = (p) => {
    if (!p) return "";
    if (/^https?:/i.test(p)) return p;
    return base + String(p).replace(/^\.\//, "");
  };
  const cover = m.cover?.path
    ? { src: abs(m.cover.path), alt: m.cover.alt || m.name || fallbackName }
    : null;
  const shots = Array.isArray(m.screenshots)
    ? m.screenshots
        .map((s) => ({
          src: abs(s.path),
          alt: s.alt || s.caption || m.name || fallbackName,
          caption: s.caption || "",
        }))
        .filter((s) => s.src)
    : [];
  return { cover, shots };
}

function enrichOrca(item, manifestHit, repoMeta) {
  const m = manifestHit?.manifest || null;
  if (!m) {
    const displayName = item.name && item.name !== item.slug ? item.name : item.slug;
    return {
      displayName,
      pluginId: "",
      publisher: item.owner,
      version: "",
      requires: "",
      license: "",
      access: accessFromManifest(null, item.category),
      catalog: /official/i.test(item.status || "") || item.owner === "stablyai" ? "Official" : "Community",
      contributes: [],
      description: repoMeta?.description || item.hero || "",
      catalogUrl: "",
      listingId: "",
      installs: lookupCachedInstalls(displayName, "", ""),
      media: { cover: null, shots: [] },
    };
  }
  const publisher = m.publisher || item.owner;
  const pluginId = m.id || "";
  const listingId = publisher && pluginId ? `${publisher}.${pluginId}` : pluginId;
  const engines = m.engines?.orca || m.engines?.Orca || "";
  const displayName = (m.name || item.name || item.slug).trim();
  const catalog =
    item.owner === "stablyai" || /official/i.test(item.status || "") ? "Official" : "Community";
  return {
    displayName,
    pluginId,
    publisher,
    version: m.version || "",
    requires: engines ? `Orca ${engines}` : "",
    license: m.license || "",
    access: accessFromManifest(m, item.category),
    catalog,
    contributes: contributesSummary(m),
    description: (m.description || repoMeta?.description || item.hero || "").trim(),
    catalogUrl: orcaOfficialCatalogUrl(publisher, pluginId, item.owner),
    listingId,
    installs: lookupCachedInstalls(displayName, pluginId, listingId),
    media: mediaFromManifestHit(manifestHit, displayName),
  };
}

function orcaInstallBlocks(item, meta) {
  const source = item.sourceHref || `https://github.com/${item.owner}/${item.slug}`;
  const blocks = [];
  if (meta.catalog === "Official" || meta.catalogUrl) {
    blocks.push({
      label: "In Orca (catalog search)",
      code: `Settings → Plugins → search “${meta.displayName}” → Install`,
    });
  } else {
    blocks.push({
      label: "In Orca (marketplace source)",
      code: `Settings → Plugins → Marketplace sources → add ${source} (pin a tag/commit when required)`,
    });
  }
  if (meta.listingId) {
    blocks.push({ label: "Plugin id", code: meta.listingId });
  }
  if (meta.catalogUrl) {
    blocks.push({ label: "Official catalog page", code: meta.catalogUrl });
  }
  if (meta.catalog === "Official") {
    blocks.push({
      label: "Git source (pin when required)",
      code: source,
    });
  } else if (!blocks.some((b) => /marketplace source/i.test(b.label))) {
    blocks.push({
      label: "Marketplace source",
      code: `Settings → Plugins → Marketplace sources → add ${source}`,
    });
  }
  return blocks;
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

/** SERP title: `{name} — {host} plugin install | {Market}` */
function pageTitle(name, cfg) {
  const base = `${name} — ${cfg.keyword} install`;
  const withShop = `${base} | ${cfg.shop}`;
  if (withShop.length <= 65) return withShop;
  if (base.length <= 65) return base;
  const shortName = name.length > 36 ? name.slice(0, 33) + "…" : name;
  return `${shortName} — ${cfg.keyword} install`;
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
    /Updated 20\d{2}-\d{2}-\d{2}/.test(html) &&
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

function articleFor(keyword) {
  return /^[aeiou]/i.test(String(keyword || "").trim()) ? "an" : "a";
}

function metaDescription(name, hero, keyword, domain) {
  let base = `${name}: ${hero}`.replace(/\s+/g, " ").trim();
  if (!base.toLowerCase().includes(keyword.split(" ")[0].toLowerCase())) {
    base = `${name} is ${articleFor(keyword)} ${keyword}. ${hero}`;
  }
  base = base.replace(/\bis a Orca\b/g, "is an Orca").replace(/\bA Orca\b/g, "An Orca");
  if (!/\binstall\b/i.test(base)) {
    base = `${base.replace(/\.$/, "")}. Install via host plugin commands.`;
  }
  base = base.replace(/\s+/g, " ").trim();
  if (base.length > 155) base = base.slice(0, 152) + "…";
  if (!/listing|market/i.test(base)) {
    const tail = ` Community listing on ${domain}.`;
    if (base.length + tail.length <= 160) base += tail;
  }
  return base.slice(0, 160);
}

function categoryLabel(slug) {
  const map = {
    themes: "Themes",
    languages: "Languages",
    icons: "Icons",
    editors: "Editors",
    marketplaces: "Marketplaces",
    "commands-panels": "Commands & panels",
    "remote-vms": "Remote/VMs",
    "terminal-themes": "Themes",
    "content-packs": "Commands & panels",
    "vm-recipes": "Remote/VMs",
    syntax: "Languages",
    keybindings: "Commands & panels",
  };
  if (map[slug]) return map[slug];
  return String(slug || "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function tokens(s) {
  return new Set(
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function relatedScore(item, peer) {
  let score = 0;
  if (peer.category === item.category) score += 50;
  if (peer.owner === item.owner) score += 12;
  if (peer.owner === "stablyai") score += 8;
  const a = tokens(`${item.name} ${item.hero} ${item.slug}`);
  const b = tokens(`${peer.name} ${peer.hero} ${peer.slug}`);
  let overlap = 0;
  for (const t of a) if (b.has(t)) overlap++;
  score += Math.min(24, overlap * 3);
  score += Math.min(10, Math.log2((Number(peer.stars) || 0) + 1));
  return score;
}

function capabilities(host, name, hero, ghDesc, orcaMeta = null) {
  const bits = [];
  const src = (ghDesc || hero || "").trim();
  if (src) bits.push(`<strong>Purpose</strong> — ${esc(src)}`);
  if (host === "orca" && orcaMeta) {
    bits.push(`<strong>Access</strong> — ${esc(orcaMeta.access.label)}. ${esc(orcaMeta.access.detail)}`);
    for (const c of orcaMeta.contributes.slice(0, 4)) {
      bits.push(`<strong>${esc(c.key)}</strong> — ${esc(c.labels.join(", "))}`);
    }
    if (orcaMeta.listingId) {
      bits.push(`<strong>Plugin id</strong> — <code>${esc(orcaMeta.listingId)}</code>`);
    }
  } else {
    bits.push(
      `<strong>Installable on this host</strong> — documented for the ${esc(HOST[host].keyword)} flow on this market.`
    );
    bits.push(
      `<strong>Public source</strong> — review the GitHub repository before enabling third-party code.`
    );
    if (host === "orca" && /theme|icon|language|syntax/i.test(name + src)) {
      bits.push(`<strong>Editor contribution</strong> — typically themes, icons, languages, or layout packs for Orca.`);
    }
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
  return bits.slice(0, 8);
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
      q: `How should I install ${esc(name)} in Orca — catalog search or marketplace source?`,
      a: `<strong>Prefer Settings → Plugins search when the plugin is in the official catalog; otherwise add the GitHub marketplace source and pin a ref when required.</strong> This page lists both paths when known.`,
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

function relatedPluginsHtml(item, catalog) {
  const peers = catalog
    .filter((x) => !(x.owner === item.owner && x.slug === item.slug))
    .map((p) => ({ p, score: relatedScore(item, p) }))
    .filter((x) => x.score >= 50 || x.p.category === item.category)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .slice(0, 4)
    .map((x) => x.p);
  if (!peers.length) return "";
  const label = categoryLabel(item.category);
  const lis = peers
    .map(
      (p) =>
        `          <li><a href="/items/${esc(p.owner)}/${esc(p.slug)}/">${esc(p.name)}</a> — ${esc(
          (p.hero || "").replace(/\s+/g, " ").trim().slice(0, 90)
        )}</li>`
    )
    .join("\n");
  return `
        <h2>Related plugins</h2>
        <p>More in <a href="/categories/${esc(item.category)}/">${esc(label)}</a>:</p>
        <ul>
${lis}
        </ul>`;
}

function relatedGuidesHtml(cfg) {
  const picks = (cfg.guides || []).slice(0, 3);
  if (!picks.length) return "";
  const lis = picks
    .map((g) => `          <li><a href="${esc(g.href)}">${esc(g.title)}</a></li>`)
    .join("\n");
  return `
        <h2>Related guides</h2>
        <ul>
${lis}
        </ul>`;
}

function relatedBlock(item, cfg, catalog) {
  return `${relatedPluginsHtml(item, catalog)}${relatedGuidesHtml(cfg)}`;
}

function render(item, ghDesc, cfg, catalog, orcaMeta = null) {
  const displayName =
    item.host === "orca" && orcaMeta?.displayName ? orcaMeta.displayName : item.name;
  const heroText =
    (item.host === "orca" && orcaMeta?.description) || item.hero || ghDesc || displayName;
  const installs =
    item.host === "orca" && orcaMeta
      ? orcaInstallBlocks(item, orcaMeta)
      : item.installs.length
        ? item.installs
        : defaultInstalls(item.host, item.owner, item.slug, item.sourceHref);
  const role = roleFromHero(heroText, displayName);
  const title = pageTitle(displayName, cfg);
  const description = metaDescription(displayName, heroText || role, cfg.keyword, cfg.domain);
  const caps = capabilities(item.host, displayName, heroText, ghDesc, orcaMeta);
  const faqItem = { ...item, name: displayName };
  const faq = faqs(faqItem, cfg);
  const whatLead =
    heroText ||
    `${displayName} is a community ${cfg.keyword} listed for discovery and install guidance.`;

  const badgeHtml =
    item.host === "orca" && orcaMeta
      ? `        <p class="plugin-badges" aria-label="Plugin badges">
          <span class="plugin-badge">${esc(orcaMeta.catalog)}</span>
          <span class="plugin-badge">${esc(orcaMeta.access.label)}</span>
          <span class="plugin-badge">${esc(categoryLabel(item.category))}</span>${
            orcaMeta.version ? `\n          <span class="plugin-badge">v${esc(orcaMeta.version)}</span>` : ""
          }
        </p>`
      : "";

  const accessNote =
    item.host === "orca" && orcaMeta
      ? `
        <h2>Access</h2>
        <p><strong>${esc(orcaMeta.access.label)}</strong> — ${esc(orcaMeta.access.detail)}</p>`
      : "";

  const whatAdds =
    item.host === "orca" && orcaMeta?.contributes?.length
      ? `
        <h2>What it adds</h2>
        <ul>
${orcaMeta.contributes
  .map((c) => `          <li><strong>${esc(c.key)}</strong> — ${esc(c.labels.join(", "))}</li>`)
  .join("\n")}
        </ul>`
      : "";

  let galleryNote = "";
  if (item.host === "orca" && orcaMeta?.media && (orcaMeta.media.cover || orcaMeta.media.shots?.length)) {
    const figs = [];
    if (orcaMeta.media.cover) {
      figs.push(`          <figure class="plugin-shot plugin-shot-cover">
            <img src="${esc(orcaMeta.media.cover.src)}" alt="${esc(orcaMeta.media.cover.alt)}" loading="lazy" decoding="async" />
            <figcaption>Cover</figcaption>
          </figure>`);
    }
    for (const s of (orcaMeta.media.shots || []).slice(0, 4)) {
      figs.push(`          <figure class="plugin-shot">
            <img src="${esc(s.src)}" alt="${esc(s.alt)}" loading="lazy" decoding="async" />
            ${s.caption ? `<figcaption>${esc(s.caption)}</figcaption>` : ""}
          </figure>`);
    }
    galleryNote = `
        <h2>Screenshots</h2>
        <div class="plugin-gallery">
${figs.join("\n")}
        </div>`;
  }

  const installLine =
    item.host === "orca" && orcaMeta?.installs
      ? `\n        <p class="plugin-installs">${esc(formatInstalls(orcaMeta.installs))}</p>`
      : "";

  const metaRows = [
    ["Author", esc(item.owner)],
    [
      "Category",
      `<a href="/categories/${esc(item.category)}/">${esc(categoryLabel(item.category))}</a>`,
    ],
  ];
  if (item.host === "orca" && orcaMeta) {
    if (orcaMeta.publisher && orcaMeta.publisher !== item.owner) {
      metaRows.push(["Publisher", esc(orcaMeta.publisher)]);
    }
    if (orcaMeta.listingId) metaRows.push(["Plugin id", `<code>${esc(orcaMeta.listingId)}</code>`]);
    if (orcaMeta.version) metaRows.push(["Version", esc(orcaMeta.version)]);
    if (orcaMeta.requires) metaRows.push(["Requires", esc(orcaMeta.requires)]);
    metaRows.push(["Access", esc(orcaMeta.access.label)]);
    if (orcaMeta.license) metaRows.push(["License", esc(orcaMeta.license)]);
    if (orcaMeta.installs) metaRows.push(["Installs", esc(formatInstalls(orcaMeta.installs))]);
    metaRows.push(["Catalog", esc(orcaMeta.catalog)]);
    if (orcaMeta.catalogUrl) {
      metaRows.push([
        "Official page",
        `<a href="${esc(orcaMeta.catalogUrl)}" rel="noopener noreferrer">onorca.dev listing</a>`,
      ]);
    }
  }
  metaRows.push(["Status", esc(item.status || "listed")]);
  metaRows.push([
    "Source",
    `<a href="${esc(item.sourceHref)}" rel="noopener noreferrer">${esc(
      item.sourceHref.replace(/^https?:\/\//, "")
    )}</a>`,
  ]);

  const installHtml = installs
    .map(
      (b) => `        <div class="install-block">
          <span class="label">${esc(b.label)}</span>
          <code>${esc(b.code)}</code>
        </div>`
    )
    .join("\n");

  const steps = installs
    .map((b, i) => {
      let expect = "Expected: command succeeds without inventing alternate flags.";
      if (item.host === "kimi" && /new/i.test(b.code)) {
        expect = "Expected: plugin changes apply in the new session.";
      } else if (item.host === "kimi" && /install/i.test(b.label + b.code)) {
        expect = "Expected: plugin appears under Installed (confirm trust prompts).";
      } else if (item.host === "orca" && /catalog search|Plugins → search/i.test(b.label + b.code)) {
        expect = "Expected: the plugin appears under Installed after one-click install.";
      } else if (item.host === "orca" && /marketplace source/i.test(b.label)) {
        expect = "Expected: source is added; pin a tag/commit if Orca asks for an explicit ref.";
      } else if (item.host === "orca" && /Plugin id/i.test(b.label)) {
        expect = "Expected: use this id when the host or docs ask for publisher.plugin-id.";
      }
      return `          <li>
            ${esc(b.label)}.
            <div class="install-block"><span class="label">Step ${i + 1}</span><code>${esc(b.code)}</code></div>
            ${expect}
          </li>`;
    })
    .join("\n");

  const relatedItem = { ...item, name: displayName, hero: heroText };

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
          <h1>${esc(displayName)}</h1>
          <p>${esc(heroText)}</p>
${badgeHtml}${installLine}
        </div>
      </header>
    </div>
    <main class="section">
      <div class="wrap prose">
        <p>
          <strong>${esc(displayName)}</strong> — ${esc(whatLead)}
        </p>

${installHtml}

        <dl class="meta-table">
${metaRows.map(([dt, dd]) => `          <dt>${dt}</dt>\n          <dd>${dd}</dd>`).join("\n")}
        </dl>
${galleryNote}${accessNote}${whatAdds}
        <h2>What is ${esc(displayName)}?</h2>
        <p>
          <strong>${esc(displayName)} is ${articleFor(cfg.keyword)} ${esc(cfg.keyword)}.</strong>
          ${esc((heroText || "It extends the host with documented capabilities.").replace(/\s+/g, " ").trim())}
          Use this listing to copy a real install path and open the upstream source —
          not as a substitute for the repository README.
          (<a href="${esc(item.sourceHref)}" rel="noopener noreferrer">Source</a>)
        </p>

        <h2>Core capabilities</h2>
        <ul>
${caps.map((c) => `          <li>${c}</li>`).join("\n")}
        </ul>

        <h2>How to install and enable ${esc(displayName)}</h2>
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
            Install with the path above, then confirm the plugin appears in Orca’s
            Plugins / installed UI.
          </li>
          <li>
            Exercise one documented theme, editor, panel, or command from the README —
            do not assume undocumented slash commands.
          </li>
          <li>
            If nothing loads, re-check Access type, marketplace pin, trust prompts, or
            Orca version requirements.
          </li>
        </ol>

        <h2>When to use it — and caveats</h2>
        <p>
          <strong>Use ${esc(displayName)} when its documented role matches your task.</strong>
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
${relatedBlock(relatedItem, cfg, catalog)}
        <p class="source-line">
          Independent rewrite · Updated ${DATE} · Not affiliated with ${esc(cfg.vendor)} ·
          <a href="${esc(item.sourceHref)}" rel="noopener noreferrer">Source repository</a>
        </p>
        <p>
          <a href="/items/">← All plugins</a>
          ·
          <a href="/categories/${esc(item.category)}/">${esc(categoryLabel(item.category))}</a>
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

/** Patch title/description/related without destroying hand-tuned body copy. */
function patchSeo(item, cfg, catalog) {
  let html = item.html;
  const title = pageTitle(item.name, cfg);
  const description = metaDescription(
    item.name,
    item.hero || item.metaDesc || item.name,
    cfg.keyword,
    cfg.domain
  );

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`);
  if (/<meta\s+name="description"\s+content="/i.test(html)) {
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${esc(description)}" />`
    );
  }

  const block = relatedBlock(item, cfg, catalog).trim();
  // Remove prior related sections (idempotent)
  html = html.replace(
    /\s*<h2>Related plugins<\/h2>[\s\S]*?(?=<p class="source-line">|<p>\s*<a href="\/items\/">)/i,
    "\n"
  );
  html = html.replace(
    /\s*<h2>Related guides<\/h2>[\s\S]*?(?=<p class="source-line">|<p>\s*<a href="\/items\/">)/i,
    "\n"
  );

  if (block) {
    if (/<p class="source-line">/i.test(html)) {
      html = html.replace(/<p class="source-line">/i, `${block}\n\n        <p class="source-line">`);
    } else if (/<p>\s*<a href="\/items\/">/i.test(html)) {
      html = html.replace(/<p>\s*<a href="\/items\/">/i, `${block}\n\n        <p>\n          <a href="/items/">`);
    } else {
      html = html.replace(/<\/div>\s*<\/main>/i, `${block}\n      </div>\n    </main>`);
    }
  }

  // Bump Updated date when present
  html = html.replace(/Updated 20\d{2}-\d{2}-\d{2}/g, `Updated ${DATE}`);

  return html;
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

function buildCatalog(host) {
  return listItemFiles(host).map((f) => parseItem(f, host));
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
    const catalog = buildCatalog(host);
    console.log(`\n=== ${host}: ${catalog.length} items (${seoOnly ? "seo-only" : "thicken"}) ===`);
    for (const item of catalog) {
      const handTuned = host === "kimi" && item.owner === "obra" && item.slug === "superpowers";

      if (seoOnly || (handTuned && !force)) {
        const html = patchSeo(item, cfg, catalog);
        if (dry) {
          console.log("dry-seo", item.owner + "/" + item.slug, "→", pageTitle(item.name, cfg));
        } else {
          fs.writeFileSync(item.filePath, html, "utf8");
          console.log("seo", item.owner + "/" + item.slug);
        }
        wrote++;
        continue;
      }

      if (handTuned) {
        console.log("skip hand-tuned", item.owner + "/" + item.slug);
        skipped++;
        continue;
      }
      if (item.already && !force) {
        console.log("skip already", item.owner + "/" + item.slug);
        skipped++;
        continue;
      }
      const repoFromSource = item.sourceHref.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
      const owner = repoFromSource ? repoFromSource[1] : item.owner;
      const repo = repoFromSource ? repoFromSource[2].replace(/\.git$/, "") : item.slug;
      const repoMeta = await fetchRepoMeta(owner, repo);
      const ghDesc = repoMeta.description;
      let orcaMeta = null;
      if (host === "orca") {
        const hit = await fetchOrcaManifest(owner, repo, repoMeta.defaultBranch, {
          listingSlug: item.slug,
          sourceHref: item.sourceHref,
        });
        orcaMeta = enrichOrca(item, hit, repoMeta);
        item.name = orcaMeta.displayName;
        if (orcaMeta.description) item.hero = orcaMeta.description;
        // Always rebuild Orca install blocks from manifest (ignore stale thin-page codes).
        item.installs = [];
        console.log(
          hit
            ? `manifest ${item.owner}/${item.slug} ← ${hit.fromRepo || owner + "/" + repo}:${hit.manifestPath}`
            : `manifest-miss ${item.owner}/${item.slug}`
        );
      }
      const html = render(item, ghDesc, cfg, catalog, orcaMeta);
      if (dry) {
        console.log("dry", item.owner + "/" + item.slug, "desc=", (ghDesc || "").slice(0, 60));
      } else {
        fs.writeFileSync(item.filePath, html, "utf8");
        console.log("write", item.owner + "/" + item.slug);
      }
      wrote++;
    }
  }
  console.log(`\nDone. wrote=${wrote} skipped=${skipped} dry=${dry} seoOnly=${seoOnly}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
