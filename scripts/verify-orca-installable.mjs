/**
 * Shallow Orca installability check (repo + orca-plugin.json).
 *
 * Does NOT prove: UI listing, runtime quality, or security.
 *
 * Usage:
 *   $env:GITHUB_TOKEN = (gh auth token)
 *   node scripts/verify-orca-installable.mjs
 *   node scripts/verify-orca-installable.mjs --only-unverified
 *   node scripts/verify-orca-installable.mjs --limit 40
 *   node scripts/verify-orca-installable.mjs --no-pages   # catalog/report only
 *
 * Writes:
 *   ops/discover/orca-verify.json
 *   updates sites/orca/catalog.json installVerified*
 *   stamps EN/ZH detail pages + directory cards
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ORCA = path.join(ROOT, "sites/orca");
const CATALOG = path.join(ORCA, "catalog.json");
const OUT = path.join(ROOT, "ops/discover/orca-verify.json");
const DEEP = path.join(ROOT, "ops/discover/orca-deep.json");

const args = process.argv.slice(2);
const ONLY_UNVERIFIED = args.includes("--only-unverified");
const NO_PAGES = args.includes("--no-pages");
const RESTAMP_ONLY = args.includes("--restamp");
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? Number(args[i + 1]) || 0 : 0;
})();

let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
if (!token) {
  try {
    token = execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch {
    /* optional */
  }
}

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "aiaaii-orca-installable-verify",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const CHECK_NOTE_EN =
  "Checks: GitHub repo exists (not archived) and a parseable orca-plugin.json is reachable. Does not guarantee in-app listing, runtime behavior, or security review.";
const CHECK_NOTE_ZH =
  "已验证：仓库存在且未归档，并能读到可解析的 orca-plugin.json。不保证：端内列表可见、运行正常、安全审核。";

const BADGE_EN = "Installable";
const BADGE_ZH = "可安装";
const TITLE_MARK_EN = " · installable";
const TITLE_MARK_ZH = " · 可安装";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRepo(url) {
  const m = String(url || "").match(/github\.com\/([^/]+)\/([^/.]+)/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}

function loadDeepPaths() {
  const map = new Map();
  if (!fs.existsSync(DEEP)) return map;
  try {
    const deep = JSON.parse(fs.readFileSync(DEEP, "utf8"));
    for (const c of deep.candidates || []) {
      if (c.repo && c.manifestPath) map.set(String(c.repo).toLowerCase(), c.manifestPath);
    }
  } catch {
    /* ignore */
  }
  return map;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) return { ok: false, status: res.status, json: null };
  try {
    return { ok: true, status: res.status, json: await res.json() };
  } catch {
    return { ok: false, status: res.status, json: null };
  }
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": headers["User-Agent"] },
  });
  if (!res.ok) return { ok: false, status: res.status, text: "" };
  return { ok: true, status: res.status, text: await res.text() };
}

async function verifyOne(item, deepPaths) {
  const pr = parseRepo(item.gitUrl);
  if (!pr) {
    return {
      ok: false,
      reason: "bad-git-url",
      owner: item.owner,
      slug: item.slug,
      id: item.id,
    };
  }
  const key = `${pr.owner}/${pr.repo}`;
  const repoRes = await fetchJson(`https://api.github.com/repos/${pr.owner}/${pr.repo}`);
  if (!repoRes.ok) {
    return {
      ok: false,
      reason: `repo-${repoRes.status}`,
      repo: key,
      id: item.id,
      owner: item.owner,
      slug: item.slug,
    };
  }
  const meta = repoRes.json;
  if (meta.archived) {
    return {
      ok: false,
      reason: "archived",
      repo: key,
      id: item.id,
      owner: item.owner,
      slug: item.slug,
    };
  }

  const branch = meta.default_branch || "main";
  const pin = typeof item.recommendedPin === "string" ? item.recommendedPin : null;
  const refs = [...new Set([pin, "main", "master", branch].filter(Boolean))];
  const paths = [
    deepPaths.get(key.toLowerCase()),
    "orca-plugin.json",
    "plugin/orca-plugin.json",
    "orca/orca-plugin.json",
    "orca-plugin/orca-plugin.json",
  ].filter(Boolean);

  for (const manifestPath of paths) {
    for (const ref of refs) {
      const raw = `https://raw.githubusercontent.com/${pr.owner}/${pr.repo}/${ref}/${manifestPath}`;
      const got = await fetchText(raw);
      if (!got.ok) continue;
      try {
        const j = JSON.parse(got.text);
        if (j && (j.id || j.name || j.publisher || Array.isArray(j.plugins))) {
          return {
            ok: true,
            reason: "repo+orca-plugin.json",
            repo: key,
            id: item.id,
            owner: item.owner,
            slug: item.slug,
            ref,
            manifestPath,
            pluginId: j.id || j.plugins?.[0]?.id || null,
            pluginName: j.name || j.plugins?.[0]?.name || null,
            defaultBranch: branch,
            stars: meta.stargazers_count || 0,
          };
        }
      } catch {
        return {
          ok: false,
          reason: "bad-manifest-json",
          repo: key,
          id: item.id,
          owner: item.owner,
          slug: item.slug,
          ref,
          manifestPath,
        };
      }
    }
  }

  // marketplace index repos: accept orca-marketplace.json
  for (const ref of refs) {
    const raw = `https://raw.githubusercontent.com/${pr.owner}/${pr.repo}/${ref}/orca-marketplace.json`;
    const got = await fetchText(raw);
    if (!got.ok) continue;
    try {
      const j = JSON.parse(got.text);
      if (j && (Array.isArray(j.plugins) || j.name)) {
        return {
          ok: true,
          reason: "repo+orca-marketplace.json",
          repo: key,
          id: item.id,
          owner: item.owner,
          slug: item.slug,
          ref,
          manifestPath: "orca-marketplace.json",
          pluginId: null,
          pluginName: j.name || null,
          defaultBranch: branch,
          stars: meta.stargazers_count || 0,
          kind: "marketplace",
        };
      }
    } catch {
      /* continue */
    }
  }

  return {
    ok: false,
    reason: "no-manifest",
    repo: key,
    id: item.id,
    owner: item.owner,
    slug: item.slug,
    defaultBranch: branch,
  };
}

function noteHtml(lang) {
  const note = lang === "zh" ? CHECK_NOTE_ZH : CHECK_NOTE_EN;
  const label = lang === "zh" ? "可安装校验" : "Installable check";
  return `<aside class="verify-note" data-verify="installable">
          <p><strong>${label}</strong> — ${note}</p>
        </aside>`;
}

function stampDetail(file, ok, lang) {
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, "utf8");
  const badge = lang === "zh" ? BADGE_ZH : BADGE_EN;
  const titleMark = lang === "zh" ? TITLE_MARK_ZH : TITLE_MARK_EN;

  // strip prior verify stamps
  html = html.replace(/\s*<span class="plugin-badge plugin-badge-verified"[^>]*>[\s\S]*?<\/span>/gi, "");
  html = html.replace(/\s*<aside class="verify-note"[^>]*>[\s\S]*?<\/aside>/gi, "");
  html = html.replace(/\s*<dt>Installable<\/dt>\s*<dd>[\s\S]*?<\/dd>/gi, "");
  html = html.replace(/\s*<dt>可安装<\/dt>\s*<dd>[\s\S]*?<\/dd>/gi, "");
  // clean prior title suffix we may have added
  html = html.replace(
    /(<h1>)([^<]+?)(?:\s*·\s*(?:installable|可安装))?(<\/h1>)/i,
    (_, a, name, c) => `${a}${name.trim()}${c}`
  );
  html = html.replace(
    /(<title>)([^<]+?)(?:\s*·\s*(?:installable|可安装))?(\s*[—|][^<]*<\/title>)/i,
    (_, a, name, c) => `${a}${name.trim()}${c}`
  );

  if (!ok) {
    fs.writeFileSync(file, html, "utf8");
    return true;
  }

  // h1 + document title mark
  html = html.replace(/(<h1>)([^<]+)(<\/h1>)/i, `$1$2${titleMark}$3`);
  html = html.replace(/(<title>)([^<]+?)(\s*[—|][^<]*<\/title>)/i, `$1$2${titleMark}$3`);

  // badge in plugin-badges
  if (/class="plugin-badges"/i.test(html)) {
    html = html.replace(
      /(<p class="plugin-badges"[^>]*>)/i,
      `$1\n          <span class="plugin-badge plugin-badge-verified" title="${lang === "zh" ? CHECK_NOTE_ZH : CHECK_NOTE_EN}">${badge}</span>`
    );
  } else {
    html = html.replace(
      /(<\/header>)/i,
      `        <p class="plugin-badges" aria-label="Plugin badges">
          <span class="plugin-badge plugin-badge-verified">${badge}</span>
        </p>
      $1`
    );
  }

  // note after first prose intro paragraph block / before first install-block
  if (!/class="verify-note"/i.test(html)) {
    if (/<div class="install-block">/i.test(html)) {
      html = html.replace(
        /(<div class="install-block">)/i,
        `${noteHtml(lang)}\n\n        $1`
      );
    } else if (/<dl class="meta-table">/i.test(html)) {
      html = html.replace(/(<dl class="meta-table">)/i, `${noteHtml(lang)}\n\n        $1`);
    }
  }

  // meta row
  const dt = lang === "zh" ? "可安装" : "Installable";
  const dd =
    lang === "zh"
      ? "已校验（仓库 + orca-plugin.json；不保证运行与安全）"
      : "verified (repo + orca-plugin.json; not runtime/security)";
  const row = `\n          <dt>${dt}</dt>\n          <dd>${dd}</dd>`;
  if (/<dt>Status<\/dt>/i.test(html)) {
    html = html.replace(/<dt>Status<\/dt>/i, `${row}\n          <dt>Status</dt>`);
  } else if (/<dt>Source<\/dt>/i.test(html)) {
    html = html.replace(/<dt>Source<\/dt>/i, `${row}\n          <dt>Source</dt>`);
  }

  fs.writeFileSync(file, html, "utf8");
  return true;
}

function walkListPages() {
  const files = [];
  const addDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const f = path.join(dir, ent.name, "index.html");
      if (fs.existsSync(f)) files.push(f);
    }
  };
  const itemsIndex = path.join(ORCA, "items/index.html");
  if (fs.existsSync(itemsIndex)) files.push(itemsIndex);
  addDir(path.join(ORCA, "categories"));
  const zhItems = path.join(ORCA, "zh/items/index.html");
  if (fs.existsSync(zhItems)) files.push(zhItems);
  addDir(path.join(ORCA, "zh/categories"));
  return files;
}

function stampCardsInFile(listFile, catalogItems, byKey) {
  let html = fs.readFileSync(listFile, "utf8");
  const isZh = /[/\\]zh[/\\]/.test(listFile);
  const prefix = isZh ? "/zh/items/" : "/items/";
  const badge = isZh ? BADGE_ZH : BADGE_EN;
  const titleAttr = isZh ? CHECK_NOTE_ZH : CHECK_NOTE_EN;

  for (const it of catalogItems) {
    const r = byKey.get(`${it.owner}/${it.slug}`.toLowerCase());
    if (!r) continue;
    const href = `${prefix}${it.owner}/${it.slug}/`;
    const hrefRe = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cardRe = new RegExp(
      `(<a class="item" href="${hrefRe}"[^>]*>)([\\s\\S]*?)(<\\/a>)`,
      "i"
    );
    html = html.replace(cardRe, (full, open, body, close) => {
      let o = open
        .replace(/\sdata-install-verified="[^"]*"/i, "")
        .replace(/\s*>\s*$/, "");
      o += r.ok
        ? ` data-install-verified="true">`
        : ` data-install-verified="false">`;
      let b = body.replace(/\s*<span class="item-verified"[^>]*>[\s\S]*?<\/span>/gi, "");
      // also clean accidental attribute text that leaked into body from older bug
      b = b.replace(/^\s*data-install-verified="(?:true|false)"\s*/i, "");
      b = b.replace(
        /(<h2 class="item-name">)([^<]+?)(?:\s*·\s*(?:installable|可安装))?(<\/h2>)/i,
        (_, a, name, c) => `${a}${name.trim()}${c}`
      );
      if (r.ok) {
        b = b.replace(
          /(<h2 class="item-name">)([^<]+)(<\/h2>)/i,
          `$1$2 <span class="item-verified" title="${titleAttr}">${badge}</span>$3`
        );
      }
      return o + b + close;
    });
  }
  // clean any leftover leaked attributes outside tags
  html = html.replace(/>\s*data-install-verified="(?:true|false)"/gi, ">");
  fs.writeFileSync(listFile, html, "utf8");
}

function applyPageStamps(catalog, byKey) {
  let detailN = 0;
  for (const [key, r] of byKey) {
    const [owner, slug] = key.split("/");
    const it = catalog.items.find(
      (x) => `${x.owner}/${x.slug}`.toLowerCase() === key
    );
    const o = it?.owner || owner;
    const s = it?.slug || slug;
    if (stampDetail(path.join(ORCA, "items", o, s, "index.html"), r.ok, "en")) detailN++;
    const zh = path.join(ORCA, "zh/items", o, s, "index.html");
    if (fs.existsSync(zh)) {
      stampDetail(zh, r.ok, "zh");
      detailN++;
    }
  }
  for (const listFile of walkListPages()) {
    stampCardsInFile(listFile, catalog.items, byKey);
  }
  return detailN;
}

async function main() {
  if (!fs.existsSync(CATALOG)) {
    console.error("Missing", CATALOG);
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const items = Array.isArray(catalog.items) ? catalog.items : [];

  if (RESTAMP_ONLY) {
    const byKey = new Map();
    for (const it of items) {
      if (typeof it.installVerified !== "boolean") continue;
      byKey.set(`${it.owner}/${it.slug}`.toLowerCase(), {
        ok: it.installVerified,
        reason: it.installVerifiedReason || (it.installVerified ? "restamp" : "failed"),
        owner: it.owner,
        slug: it.slug,
        id: it.id,
      });
    }
    const detailN = applyPageStamps(catalog, byKey);
    console.log(
      JSON.stringify({ ok: true, restamp: true, stampedKeys: byKey.size, detailN }, null, 2)
    );
    return;
  }

  const deepPaths = loadDeepPaths();

  let work = items.filter((it) => it?.gitUrl);
  if (ONLY_UNVERIFIED) {
    work = work.filter((it) => it.installVerified !== true);
  }
  if (LIMIT > 0) work = work.slice(0, LIMIT);

  console.log(
    `verify ${work.length}/${items.length} (token=${Boolean(token)} onlyUnverified=${ONLY_UNVERIFIED})`
  );

  const results = [];
  const byKey = new Map();

  for (let i = 0; i < work.length; i++) {
    const it = work[i];
    process.stdout.write(`[${i + 1}/${work.length}] ${it.owner}/${it.slug} … `);
    try {
      const r = await verifyOne(it, deepPaths);
      results.push(r);
      byKey.set(`${it.owner}/${it.slug}`.toLowerCase(), r);
      console.log(r.ok ? `OK ${r.manifestPath}` : `FAIL ${r.reason}`);
    } catch (e) {
      const r = {
        ok: false,
        reason: `error:${e.message || e}`,
        id: it.id,
        owner: it.owner,
        slug: it.slug,
      };
      results.push(r);
      byKey.set(`${it.owner}/${it.slug}`.toLowerCase(), r);
      console.log("ERR", e.message || e);
    }
    await sleep(token ? 80 : 250);
  }

  const now = new Date().toISOString();
  for (const it of catalog.items) {
    const r = byKey.get(`${it.owner}/${it.slug}`.toLowerCase());
    if (!r) continue;
    it.installVerified = r.ok;
    it.installVerifiedAt = now;
    it.installVerifiedReason = r.reason;
    if (r.manifestPath) it.manifestPath = r.manifestPath;
    if (r.ref) it.installVerifiedRef = r.ref;
    if (r.ok) {
      it.install =
        r.kind === "marketplace" ? "marketplace-source" : it.install || "marketplace-or-ref";
    }
  }

  catalog.generatedAt = now;
  catalog.installVerify = {
    checkedAt: now,
    checked: results.length,
    passed: results.filter((x) => x.ok).length,
    failed: results.filter((x) => !x.ok).length,
    scope: CHECK_NOTE_EN,
  };
  fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n", "utf8");

  const report = {
    generatedAt: now,
    scope: {
      checks: [
        "GitHub repository exists",
        "Repository not archived",
        "Parseable orca-plugin.json (or orca-marketplace.json) reachable on a known path/ref",
      ],
      notGuaranteed: [
        "Appears under Orca All / category filters",
        "Loads without runtime errors",
        "Security or code review",
        "Compatible with every Orca version",
      ],
    },
    summary: catalog.installVerify,
    results,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n", "utf8");

  if (!NO_PAGES) {
    const detailN = applyPageStamps(catalog, byKey);
    console.log("stamped detail pages ~", detailN);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        passed: report.summary.passed,
        failed: report.summary.failed,
        out: OUT,
        catalog: CATALOG,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
