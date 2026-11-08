/**
 * Deep Orca plugin harvest — paginated code search + validate + rank.
 *
 * Usage:
 *   $env:GITHUB_TOKEN=(gh auth token)
 *   node scripts/discover/orca-deep.mjs
 *
 * Writes:
 *   ops/discover/orca-deep.json
 *   ops/discover/orca-deep.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "ops/discover");
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const UA = "aiaaii-orca-deep/1.0";

if (!TOKEN) {
  console.error("GITHUB_TOKEN required");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WEAK = new Set([
  "alepspizzetti/orca-plugins",
  "codeious/orca-plugins",
  "andoshin11/orca-plugins",
  "sn-kinos/just-orca",
]);

const SKIP_REPO = /\/(orca|orca-oss|orca-old|ash-ide|eddy|odin|keel|teamrun|fubuking|ripperos|builder-workbench|cubito)$/i;

function listed() {
  const base = path.join(ROOT, "sites/orca/items");
  const out = new Set();
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
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${j.message || url}`);
  return j;
}

async function searchCodeAll(q, maxPages = 10) {
  const repos = new Map(); // full_name -> { paths: [] }
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=100&page=${page}`;
    let j;
    try {
      j = await api(url);
    } catch (e) {
      console.warn("search fail", q, page, e.message);
      break;
    }
    const items = j.items || [];
    console.log(`  page ${page}: ${items.length} hits (total≈${j.total_count})`);
    for (const it of items) {
      const full = it.repository?.full_name;
      if (!full) continue;
      const prev = repos.get(full) || { paths: [] };
      if (it.path && !prev.paths.includes(it.path)) prev.paths.push(it.path);
      repos.set(full, prev);
    }
    if (items.length < 100) break;
    await sleep(1200);
  }
  return repos;
}

async function repoMeta(slug) {
  try {
    const j = await api(`https://api.github.com/repos/${slug}`);
    await sleep(40);
    return {
      stars: j.stargazers_count || 0,
      desc: (j.description || "").trim(),
      archived: !!j.archived,
      fork: !!j.fork,
      pushed: j.pushed_at || "",
      defaultBranch: j.default_branch || "main",
    };
  } catch {
    return null;
  }
}

async function rawJson(slug, filePath, ref = "HEAD") {
  const url = `https://raw.githubusercontent.com/${slug}/${ref}/${filePath}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const t = await res.text();
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function pickManifest(paths) {
  const prefer = paths.filter(
    (p) =>
      /(^|\/)orca-plugin\.json$/i.test(p) &&
      !/examples?\//i.test(p) &&
      !/resources\/plugins\/launch/i.test(p) &&
      !/template/i.test(p)
  );
  if (prefer.length) return prefer[0];
  const mp = paths.filter(
    (p) =>
      /(^|\/)orca-marketplace\.json$/i.test(p) &&
      !/resources\/plugins\/launch/i.test(p) &&
      !/examples?\//i.test(p)
  );
  if (mp.length) return mp[0];
  return paths.find((p) => /orca-plugin\.json$/i.test(p)) || paths[0] || null;
}

function score(row) {
  let s = 0;
  if (row.valid) s += 50;
  if (row.stars) s += Math.min(40, Math.log10(row.stars + 1) * 12);
  if (row.kind === "plugin") s += 12;
  if (row.kind === "marketplace") s += 6;
  if (row.archived) s -= 40;
  if (row.fork) s -= 12;
  if (/resources\/plugins\/launch/i.test(row.manifestPath || "")) s -= 25;
  if (/examples?\//i.test(row.manifestPath || "")) s -= 20;
  if (row.pushed) {
    const age = (Date.now() - Date.parse(row.pushed)) / 86400000;
    if (age < 30) s += 8;
    else if (age < 90) s += 3;
  }
  return Math.round(s * 10) / 10;
}

async function main() {
  const already = listed();
  console.log("listed", already.size);

  console.log("\n=== code search filename:orca-plugin.json ===");
  const pluginRepos = await searchCodeAll("filename:orca-plugin.json", 8);
  console.log("\n=== code search filename:orca-marketplace.json ===");
  const marketRepos = await searchCodeAll("filename:orca-marketplace.json", 4);

  const merged = new Map();
  for (const [full, info] of pluginRepos) {
    merged.set(full, { paths: [...info.paths], via: "plugin" });
  }
  for (const [full, info] of marketRepos) {
    const prev = merged.get(full) || { paths: [], via: "marketplace" };
    prev.paths = [...new Set([...prev.paths, ...info.paths])];
    if (!prev.via) prev.via = "marketplace";
    merged.set(full, prev);
  }

  console.log("\nunique repos", merged.size);

  const candidates = [];
  for (const [repo, info] of merged) {
    const key = repo.toLowerCase();
    if (already.has(key)) continue;
    if (WEAK.has(key)) continue;
    if (SKIP_REPO.test(repo) && info.paths.every((p) => /launch|examples?/i.test(p))) continue;
    if (repo.toLowerCase() === "stablyai/orca") continue;

    const manifestPath = pickManifest(info.paths);
    if (!manifestPath) continue;
    // Skip pure launch embeds unless they also have a root plugin
    if (
      /resources\/plugins\/launch/i.test(manifestPath) &&
      !info.paths.some((p) => /(^|\/)orca-plugin\.json$/i.test(p) && !/launch|examples?/i.test(p))
    ) {
      continue;
    }

    candidates.push({
      host: "orca",
      repo,
      paths: info.paths,
      manifestPath,
      via: info.via,
    });
  }

  console.log("fresh after filters", candidates.length);
  // Enrich + validate (cap to keep API sane)
  const CAP = Math.min(candidates.length, 80);
  const out = [];
  for (let i = 0; i < CAP; i++) {
    const c = candidates[i];
    process.stdout.write(`[${i + 1}/${CAP}] ${c.repo} … `);
    const meta = await repoMeta(c.repo);
    if (!meta) {
      console.log("meta fail");
      continue;
    }
    const manifest = await rawJson(c.repo, c.manifestPath, meta.defaultBranch);
    const kind = /marketplace\.json$/i.test(c.manifestPath) ? "marketplace" : "plugin";
    const valid = !!manifest && typeof manifest === "object";
    const row = {
      ...c,
      ...meta,
      valid,
      kind,
      pluginId: manifest?.id || manifest?.plugins?.[0]?.id || null,
      pluginName: manifest?.name || manifest?.plugins?.[0]?.name || null,
    };
    row.score = score(row);
    row.tier = row.valid && row.score >= 70 ? "P0" : row.valid && row.score >= 55 ? "P1" : "P2";
    out.push(row);
    console.log(`${row.tier} ★${row.stars} score=${row.score} ${c.manifestPath}`);
  }

  out.sort((a, b) => b.score - a.score || b.stars - a.stars);

  const payload = {
    generatedAt: new Date().toISOString(),
    listed: already.size,
    searchedRepos: merged.size,
    fresh: candidates.length,
    validated: out.length,
    candidates: out,
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "orca-deep.json"), JSON.stringify(payload, null, 2));

  const lines = [
    `# Orca deep discover`,
    ``,
    `Generated: ${payload.generatedAt}`,
    ``,
    `Listed=${payload.listed} · searchedRepos=${payload.searchedRepos} · fresh=${payload.fresh} · validated=${payload.validated}`,
    ``,
    `## P0`,
    ``,
    `| repo | ★ | score | kind | manifest | note |`,
    `| --- | ---: | ---: | --- | --- | --- |`,
  ];
  for (const c of out.filter((x) => x.tier === "P0")) {
    lines.push(
      `| \`${c.repo}\` | ${c.stars} | ${c.score} | ${c.kind} | ${c.manifestPath} | ${(c.desc || "").slice(0, 70)} |`
    );
  }
  lines.push(``, `## P1`, ``, `| repo | ★ | score | kind | manifest | note |`, `| --- | ---: | ---: | --- | --- | --- |`);
  for (const c of out.filter((x) => x.tier === "P1")) {
    lines.push(
      `| \`${c.repo}\` | ${c.stars} | ${c.score} | ${c.kind} | ${c.manifestPath} | ${(c.desc || "").slice(0, 70)} |`
    );
  }
  lines.push(``, `## Suggested next`, ``);
  for (const c of out.filter((x) => x.tier === "P0" || x.tier === "P1").slice(0, 20)) {
    lines.push(`- \`${c.repo}\` · ${c.stars}★ · ${c.tier} · ${c.kind}`);
  }
  lines.push(
    ``,
    `## After listing`,
    ``,
    `Run shallow installable verify so list/detail pages get the Installable mark:`,
    ``,
    "```powershell",
    `$env:GITHUB_TOKEN = (gh auth token)`,
    `npm run verify:orca:new`,
    "```",
    ``
  );
  fs.writeFileSync(path.join(OUT, "orca-deep.md"), lines.join("\n") + "\n");
  console.log("\nWrote ops/discover/orca-deep.md");
  console.log(
    "P0",
    out.filter((x) => x.tier === "P0").length,
    "P1",
    out.filter((x) => x.tier === "P1").length
  );
  console.log("Next: npm run verify:orca:new  (after listing fresh plugins)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
