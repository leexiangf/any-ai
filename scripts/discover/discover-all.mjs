#!/usr/bin/env node
/**
 * Unified multi-host plugin discovery (semi-auto).
 *
 * Auto: GitHub search + listed-diff + manifest smoke + score/rank
 * Human: review ops/discover/LATEST.md → pick → list-batch / 「上」
 *
 * Usage:
 *   $env:GITHUB_TOKEN=(gh auth token)   # PowerShell
 *   node scripts/discover/discover-all.mjs
 *   node scripts/discover/discover-all.mjs --hosts kimi,droid
 *   node scripts/discover/discover-all.mjs --skip-droid-discover
 *   node scripts/discover/discover-all.mjs --validate 20
 *
 * Output:
 *   ops/discover/latest.json
 *   ops/discover/LATEST.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "ops/discover");
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const UA = "aiaaii-discover-all/1.0 (+https://aiaaii.com)";

const args = process.argv.slice(2);
function flag(name) {
  return args.includes(name);
}
function opt(name, fallback) {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

const HOST_FILTER = new Set(
  (opt("--hosts", "kimi,orca,droid,amp") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
const VALIDATE_N = Number(opt("--validate", "24")) || 24;
const SKIP_DROID_DISCOVER = flag("--skip-droid-discover");

if (!TOKEN) {
  console.error("GITHUB_TOKEN / GH_TOKEN required");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HOST_CFG = {
  kimi: {
    codeQueries: ["filename:kimi.plugin.json", "filename:plugin.json path:.kimi-plugin"],
    repoQueries: ['kimi-plugin OR kimi.plugin.json OR "/plugins install" kimi pushed:>2026-08-01'],
    manifestPaths: [
      "kimi.plugin.json",
      ".kimi-plugin/plugin.json",
      "plugin/kimi.plugin.json",
      "kimi/kimi.plugin.json",
    ],
  },
  orca: {
    codeQueries: [
      "filename:orca-plugin.json",
      "filename:orca-marketplace.json",
      "orca-plugin.json NOT stablyai/orca",
      "path:/orca-plugin.json",
    ],
    repoQueries: [
      'orca-plugin OR orca-marketplace OR "orca plugin" pushed:>2026-08-01',
      'orca in:name plugin OR theme OR icons OR recipes pushed:>2026-09-01',
      "topic:orca-plugin OR topic:orca-plugins",
    ],
    manifestPaths: [
      "orca-plugin.json",
      "orca-marketplace.json",
      "marketplace/orca-marketplace.json",
      "plugins/orca-plugin.json",
    ],
  },
  amp: {
    codeQueries: [],
    repoQueries: [
      'ampcode plugin OR "amp plugins add" OR amp-plugin OR "bitfab-amp" pushed:>2026-08-01',
    ],
    // Amp is noisier; prefer package name / README install later
    manifestPaths: ["package.json"],
  },
  droid: {
    codeQueries: [
      "filename:marketplace.json path:.factory-plugin",
      "filename:marketplace.json path:.claude-plugin",
    ],
    repoQueries: [
      '".factory-plugin/marketplace.json" OR "droid plugin marketplace add" pushed:>2026-08-01',
    ],
    manifestPaths: [".factory-plugin/marketplace.json", ".claude-plugin/marketplace.json"],
  },
};

function listed(host) {
  const base = path.join(ROOT, "sites", host, "items");
  const out = new Set();
  if (!fs.existsSync(base)) return out;
  for (const o of fs.readdirSync(base, { withFileTypes: true })) {
    if (!o.isDirectory() || o.name.startsWith("_")) continue;
    for (const s of fs.readdirSync(path.join(base, o.name), { withFileTypes: true })) {
      if (s.isDirectory()) out.add(`${o.name}/${s.name}`.toLowerCase());
    }
  }
  return out;
}

async function api(url) {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": UA,
    },
  });
  const text = await r.text();
  let j = {};
  try {
    j = JSON.parse(text);
  } catch {
    j = { message: text.slice(0, 200) };
  }
  if (!r.ok) {
    return { ok: false, status: r.status, message: j.message || text.slice(0, 120), items: [], total: 0 };
  }
  return { ok: true, status: r.status, items: j.items || [], total: j.total_count || 0, raw: j };
}

async function searchCode(q, per = 40) {
  return api(`https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=${per}`);
}
async function searchRepos(q, per = 30) {
  return api(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=updated&per_page=${per}`
  );
}

async function repoMeta(slug) {
  const r = await api(`https://api.github.com/repos/${slug}`);
  if (!r.ok) return null;
  const j = r.raw;
  return {
    stars: j.stargazers_count || 0,
    desc: (j.description || "").trim(),
    archived: !!j.archived,
    fork: !!j.fork,
    pushed: j.pushed_at || "",
    defaultBranch: j.default_branch || "main",
  };
}

async function rawFile(slug, filePath, ref = "HEAD") {
  const url = `https://raw.githubusercontent.com/${slug}/${ref}/${filePath}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function uniqByRepo(rows) {
  const m = new Map();
  for (const row of rows) {
    if (!row?.repo) continue;
    const k = row.repo.toLowerCase();
    const prev = m.get(k);
    if (!prev) m.set(k, row);
    else {
      // merge paths / via
      const paths = new Set([...(prev.paths || []), ...(row.paths || [])]);
      if (prev.path) paths.add(prev.path);
      if (row.path) paths.add(row.path);
      m.set(k, {
        ...prev,
        ...row,
        paths: [...paths].filter(Boolean),
        via: [...new Set([...(prev.via ? [prev.via] : []), ...(row.via ? [row.via] : [])])].join("+"),
      });
    }
  }
  return [...m.values()];
}

const NOISE_OWNERS = new Set([
  "homebrew",
  "nixos",
  "amplitude",
  "amp-labs",
  "ampersandor",
]);
const NOISE_NAME_RE =
  /homebrew|nix|vst3?|guitar|spotify|screen.?reader|minecraft|amplitude|laravel-amp|rockchip|meteo|amplify-x|ampulheta/i;

function isNoise(host, row) {
  const [owner, name] = row.repo.split("/");
  if (NOISE_OWNERS.has(owner.toLowerCase())) return true;
  if (NOISE_NAME_RE.test(row.repo) || NOISE_NAME_RE.test(row.desc || "")) return true;
  if (host === "amp") {
    // Require some amp-agent signal unless path/via looks intentional
    const hit =
      /ampcode|amp-plugin|amp plugins|bitfab|sourcegraph/i.test(row.repo + " " + (row.desc || "")) ||
      (row.paths || []).some((p) => /amp|plugin/i.test(p));
    if (!hit) return true;
  }
  if (host === "orca") {
    // Skip obvious host forks that only ship embedded launch marketplace
    if (
      /\/orca(-oss|-old)?$/i.test(row.repo) &&
      (row.paths || []).some((p) => /resources\/plugins\/launch/.test(p))
    ) {
      return true;
    }
  }
  return false;
}

function installHints(host, slug, manifestPath, manifest) {
  const source = `https://github.com/${slug}`;
  if (host === "kimi") {
    return [
      { label: "Install", code: `/plugins install ${source}` },
      { label: "Fresh session", code: "/new" },
    ];
  }
  if (host === "amp") {
    return [{ label: "Install", code: `amp plugins add ${source}` }];
  }
  if (host === "droid") {
    const mpName = manifest?.name || path.basename(slug);
    const plugin = manifest?.plugins?.[0]?.name;
    const kind = String(manifestPath || "").includes(".factory-plugin")
      ? "native Factory"
      : "Claude-compatible";
    const out = [
      { label: "Add marketplace", code: `droid plugin marketplace add ${source}` },
      { label: "Or shorthand", code: `droid plugin marketplace add ${slug}` },
    ];
    if (plugin) {
      out.push({
        label: "Then install",
        code: `droid plugin install ${plugin}@${mpName} --scope user`,
      });
    }
    out.push({ label: "Kind", code: kind });
    return out;
  }
  // orca
  const plugin = manifest?.plugins?.[0];
  const id = plugin?.id || "";
  const ref = plugin?.source?.ref;
  const out = [
    {
      label: "Add marketplace source",
      code: `Settings → Plugins → Marketplace sources → add ${source}${ref ? ` (pin ref ${ref})` : ""}`,
    },
  ];
  if (id) out.push({ label: "Plugin id", code: id });
  return out;
}

function score(host, row) {
  let s = 0;
  if (row.valid) s += 50;
  if (row.stars) s += Math.min(40, Math.log10(row.stars + 1) * 12);
  if (row.nativeFactory) s += 15;
  if (row.paths?.some((p) => /example|template|hosts\//i.test(p))) s -= 8;
  if (row.archived) s -= 40;
  if (row.fork) s -= 10;
  if (host === "droid" && row.fromDiscover) s += 10;
  if (host === "kimi" && row.valid) s += 5;
  // Prefer recently pushed
  if (row.pushed) {
    const ageDays = (Date.now() - Date.parse(row.pushed)) / 86400000;
    if (ageDays < 30) s += 8;
    else if (ageDays < 90) s += 3;
  }
  return Math.round(s * 10) / 10;
}

function tier(scoreVal, valid) {
  if (valid && scoreVal >= 70) return "P0";
  if (valid && scoreVal >= 45) return "P1";
  if (scoreVal >= 35) return "P2";
  return "noise";
}

async function discoverHost(host, listedSet) {
  const cfg = HOST_CFG[host];
  const rows = [];
  const errors = [];

  for (const q of cfg.codeQueries) {
    const r = await searchCode(q, 50);
    await sleep(650);
    if (!r.ok) errors.push({ q, status: r.status, message: r.message });
    for (const it of r.items || []) {
      rows.push({
        repo: it.repository?.full_name,
        path: it.path,
        paths: it.path ? [it.path] : [],
        via: "code",
      });
    }
  }
  for (const q of cfg.repoQueries) {
    const r = await searchRepos(q, 35);
    await sleep(650);
    if (!r.ok) errors.push({ q, status: r.status, message: r.message });
    for (const it of r.items || []) {
      rows.push({
        repo: it.full_name,
        stars: it.stargazers_count,
        desc: it.description || "",
        pushed: it.pushed_at,
        via: "repo",
      });
    }
  }

  let merged = uniqByRepo(rows)
    .filter((r) => r.repo && !listedSet.has(r.repo.toLowerCase()))
    .filter((r) => !isNoise(host, r));

  return { merged, errors, searched: rows.length };
}

async function enrichAndValidate(host, candidates, limit) {
  const out = [];
  const slice = candidates.slice(0, limit);
  for (const c of slice) {
    const meta = await repoMeta(c.repo);
    await sleep(80);
    const row = {
      host,
      repo: c.repo,
      owner: c.repo.split("/")[0],
      slug: c.repo.split("/")[1],
      paths: c.paths || (c.path ? [c.path] : []),
      via: c.via || "",
      fromDiscover: !!c.fromDiscover,
      stars: meta?.stars ?? c.stars ?? 0,
      desc: meta?.desc || c.desc || "",
      archived: meta?.archived || false,
      fork: meta?.fork || false,
      pushed: meta?.pushed || c.pushed || "",
      defaultBranch: meta?.defaultBranch || "main",
      valid: false,
      manifestPath: null,
      pluginName: null,
      marketplaceName: null,
      installs: [],
      nativeFactory: false,
    };

    if (meta && !meta.archived) {
      const tryPaths = [...new Set([...(row.paths || []), ...(HOST_CFG[host].manifestPaths || [])])];
      for (const p of tryPaths) {
        if (!p || p.endsWith("/")) continue;
        // skip deep template noise for kimi unless no other path
        const txt = await rawFile(c.repo, p, meta.defaultBranch);
        await sleep(40);
        if (!txt) continue;
        let json = null;
        try {
          json = JSON.parse(txt);
        } catch {
          continue;
        }
        if (host === "amp" && p === "package.json") {
          const name = String(json?.name || "");
          if (/amp|bitfab/i.test(name + " " + row.desc)) {
            row.valid = true;
            row.manifestPath = p;
            row.pluginName = name;
            row.installs = installHints(host, c.repo, p, null);
            break;
          }
          continue;
        }
        if (host === "droid") {
          if (!json.plugins && !json.name) continue;
          row.valid = true;
          row.manifestPath = p;
          row.marketplaceName = json.name || null;
          row.pluginName = json.plugins?.[0]?.name || null;
          row.nativeFactory = p.includes(".factory-plugin");
          row.installs = installHints(host, c.repo, p, json);
          break;
        }
        if (host === "orca") {
          if (!json.plugins && !json.id) continue;
          row.valid = true;
          row.manifestPath = p;
          row.pluginName = json.plugins?.[0]?.id || json.id || json.name || null;
          row.installs = installHints(host, c.repo, p, json);
          break;
        }
        if (host === "kimi") {
          if (!json.name && !json.$schema) continue;
          row.valid = true;
          row.manifestPath = p;
          row.pluginName = json.name || null;
          row.installs = installHints(host, c.repo, p, json);
          break;
        }
      }
    }

    row.score = score(host, row);
    row.tier = tier(row.score, row.valid);
    out.push(row);
  }
  out.sort((a, b) => b.score - a.score || b.stars - a.stars);
  return out;
}

function mergeDroidDiscover(listedSet) {
  const p = path.join(ROOT, "scripts/droid-discover/out/candidates.json");
  if (!fs.existsSync(p)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const list = j.candidates || [];
    return list
      .filter((c) => c.alreadyListed === false)
      .filter((c) => c.slug && !listedSet.has(String(c.slug).toLowerCase()))
      .map((c) => ({
        repo: c.slug,
        stars: c.stars || 0,
        desc: c.description || "",
        paths: c.marketplacePath ? [c.marketplacePath] : [],
        via: "droid-discover",
        fromDiscover: true,
        pushed: "",
      }));
  } catch {
    return [];
  }
}

function runDroidDiscover() {
  if (SKIP_DROID_DISCOVER) {
    console.log("skip droid-discover (--skip-droid-discover)");
    return;
  }
  console.log("running droid-discover…");
  const r = spawnSync(process.execPath, ["scripts/droid-discover/discover.mjs"], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.stdout) process.stdout.write(r.stdout.slice(-800));
  if (r.status !== 0) {
    console.warn("droid-discover exited", r.status, (r.stderr || "").slice(0, 300));
  }
}

function toMd(report) {
  const lines = [];
  lines.push(`# Discover digest`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push(`Listed: ${Object.entries(report.listedCounts).map(([h, n]) => `${h}=${n}`).join(" · ")}`);
  lines.push("");
  lines.push(`## How to use`);
  lines.push("");
  lines.push(`1. Review **P0 / P1** below (auto-validated manifests preferred).`);
  lines.push(`2. Say 「上」+ host picks, or add to a list-batch script.`);
  lines.push(`3. Do **not** auto-list noise/P2 without a human pass.`);
  lines.push("");

  for (const host of ["droid", "kimi", "orca", "amp"]) {
    const bucket = report.hosts[host];
    if (!bucket) continue;
    lines.push(`## ${host}`);
    lines.push("");
    lines.push(`Searched≈${bucket.searched} · fresh after filters=${bucket.candidates.length} · errors=${bucket.errors.length}`);
    lines.push("");
    const p0 = bucket.candidates.filter((c) => c.tier === "P0");
    const p1 = bucket.candidates.filter((c) => c.tier === "P1");
    const p2 = bucket.candidates.filter((c) => c.tier === "P2").slice(0, 8);
    for (const [label, list] of [
      ["P0", p0],
      ["P1", p1],
      ["P2 (sample)", p2],
    ]) {
      if (!list.length) continue;
      lines.push(`### ${label}`);
      lines.push("");
      lines.push(`| repo | ★ | score | manifest | note |`);
      lines.push(`| --- | ---: | ---: | --- | --- |`);
      for (const c of list) {
        const note = (c.desc || "").replace(/\|/g, "/").slice(0, 72);
        lines.push(
          `| \`${c.repo}\` | ${c.stars} | ${c.score} | ${c.manifestPath || "—"} | ${note} |`
        );
      }
      lines.push("");
    }
  }

  lines.push(`## Suggested next 8 (cross-host)`);
  lines.push("");
  const flat = Object.values(report.hosts)
    .flatMap((h) => h.candidates || [])
    .filter((c) => c.tier === "P0" || c.tier === "P1")
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  for (const c of flat) {
    lines.push(`- **${c.host}** \`${c.repo}\` · ${c.stars}★ · ${c.tier} · ${c.pluginName || c.manifestPath || ""}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const listedCounts = {};
  const listedSets = {};
  for (const h of Object.keys(HOST_CFG)) {
    listedSets[h] = listed(h);
    listedCounts[h] = listedSets[h].size;
  }

  if (HOST_FILTER.has("droid")) runDroidDiscover();

  const report = {
    generatedAt: new Date().toISOString(),
    listedCounts,
    hosts: {},
  };

  for (const host of ["droid", "kimi", "orca", "amp"]) {
    if (!HOST_FILTER.has(host)) continue;
    console.log(`\n=== discover ${host} ===`);
    const { merged, errors, searched } = await discoverHost(host, listedSets[host]);
    let seed = merged;
    if (host === "droid") {
      seed = uniqByRepo([...mergeDroidDiscover(listedSets.droid), ...merged]);
    }
    console.log(`${host}: ${seed.length} fresh candidates (pre-validate), validating top ${VALIDATE_N}…`);
    const candidates = await enrichAndValidate(host, seed, VALIDATE_N);
    // Keep a few unvalidated leftovers as P2 for visibility
    const validatedRepos = new Set(candidates.map((c) => c.repo.toLowerCase()));
    for (const extra of seed.slice(VALIDATE_N, VALIDATE_N + 10)) {
      if (validatedRepos.has(extra.repo.toLowerCase())) continue;
      candidates.push({
        host,
        repo: extra.repo,
        owner: extra.repo.split("/")[0],
        slug: extra.repo.split("/")[1],
        stars: extra.stars || 0,
        desc: extra.desc || "",
        paths: extra.paths || [],
        via: extra.via || "",
        valid: false,
        score: score(host, { ...extra, valid: false }),
        tier: "P2",
        installs: [],
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    report.hosts[host] = {
      searched,
      errors,
      candidates,
      p0: candidates.filter((c) => c.tier === "P0").length,
      p1: candidates.filter((c) => c.tier === "P1").length,
    };
    console.log(
      `${host}: P0=${report.hosts[host].p0} P1=${report.hosts[host].p1} totalKept=${candidates.length}`
    );
  }

  const jsonPath = path.join(OUT_DIR, "latest.json");
  const mdPath = path.join(OUT_DIR, "LATEST.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, toMd(report));

  // also stamp dated copy
  const day = report.generatedAt.slice(0, 10);
  fs.writeFileSync(path.join(OUT_DIR, `${day}.json`), JSON.stringify(report, null, 2));

  console.log(`\nWrote ${path.relative(ROOT, jsonPath)}`);
  console.log(`Wrote ${path.relative(ROOT, mdPath)}`);

  // compact stdout summary
  const summary = {};
  for (const [h, b] of Object.entries(report.hosts)) {
    summary[h] = {
      p0: (b.candidates || []).filter((c) => c.tier === "P0").map((c) => c.repo),
      p1: (b.candidates || []).filter((c) => c.tier === "P1").map((c) => c.repo).slice(0, 8),
    };
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
