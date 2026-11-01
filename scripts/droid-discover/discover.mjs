#!/usr/bin/env node
/**
 * Discover Droid-installable marketplaces from:
 * 1) Open PRs on Factory-AI/factory-plugins (external url / git-subdir sources)
 * 2) seeds.json
 * 3) Validation: .factory-plugin/marketplace.json then .claude-plugin/marketplace.json
 *
 * Usage:
 *   node scripts/droid-discover/discover.mjs
 *   node scripts/droid-discover/discover.mjs --seeds-only
 *   set GITHUB_TOKEN=ghp_xxx && node scripts/droid-discover/discover.mjs
 *
 * Output:
 *   scripts/droid-discover/out/candidates.json
 *   scripts/droid-discover/out/rejected.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(__dirname, "out");
const ITEMS_DIR = path.join(ROOT, "sites/droid/items");
const SEEDS_PATH = path.join(__dirname, "seeds.json");

const UA = "aiaaii-droid-discover/1.0 (+https://droid.aiaaii.com)";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const SEEDS_ONLY = process.argv.includes("--seeds-only");
const SKIP_PRS = SEEDS_ONLY || process.argv.includes("--skip-prs");

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": UA,
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, init = {}, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(400 * (i + 1) * (i + 1));
    }
  }
  throw lastErr;
}

async function ghJson(url) {
  const res = await fetchWithRetry(url, { headers });
  if (res.status === 403 || res.status === 429) {
    const msg = await res.text();
    throw new Error(
      `GitHub rate limited (${res.status}). Set GITHUB_TOKEN. ${msg.slice(0, 180)}`
    );
  }
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`GitHub ${res.status} ${url}: ${msg.slice(0, 180)}`);
  }
  return res.json();
}

async function rawText(url) {
  try {
    const res = await fetchWithRetry(url, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

function parseGithubRepo(urlOrSlug) {
  if (!urlOrSlug) return null;
  let s = String(urlOrSlug).trim();
  s = s.replace(/\.git$/i, "");
  const m = s.match(/github\.com[/:]([^/]+)\/([^/#?\s]+)/i);
  if (m) return { owner: m[1], repo: m[2], slug: `${m[1]}/${m[2]}` };
  const short = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (short)
    return {
      owner: short[1],
      repo: short[2],
      slug: `${short[1]}/${short[2]}`,
    };
  return null;
}

function listedSlugs() {
  const set = new Set();
  if (!fs.existsSync(ITEMS_DIR)) return set;
  for (const owner of fs.readdirSync(ITEMS_DIR, { withFileTypes: true })) {
    if (!owner.isDirectory()) continue;
    const ownerDir = path.join(ITEMS_DIR, owner.name);
    for (const slug of fs.readdirSync(ownerDir, { withFileTypes: true })) {
      if (!slug.isDirectory()) continue;
      set.add(`${owner.name}/${slug.name}`.toLowerCase());
      set.add(slug.name.toLowerCase());
    }
    set.add(owner.name.toLowerCase());
  }
  return set;
}

function isAlreadyListed(listed, owner, repo, mpName, pluginNames) {
  const keys = [`${owner}/${repo}`, repo, mpName, ...(pluginNames || [])]
    .filter(Boolean)
    .map((k) => String(k).toLowerCase());
  return keys.some((k) => listed.has(k));
}

async function fetchMarketplace(owner, repo, refHint) {
  const refs = [refHint, "main", "master"].filter(Boolean);
  const paths = [
    ".factory-plugin/marketplace.json",
    ".claude-plugin/marketplace.json",
  ];
  for (const ref of [...new Set(refs)]) {
    for (const p of paths) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${p}`;
      const text = await rawText(url);
      if (!text) continue;
      try {
        const json = JSON.parse(text);
        return {
          path: p,
          ref,
          kind: p.startsWith(".factory") ? "factory" : "claude-compat",
          json,
          rawUrl: url,
        };
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

function summarizeMarketplace(mp) {
  const plugins = Array.isArray(mp.json?.plugins) ? mp.json.plugins : [];
  return {
    marketplaceName: mp.json?.name || null,
    description:
      mp.json?.description || mp.json?.metadata?.description || null,
    pluginCount: plugins.length,
    plugins: plugins.map((p) => ({
      name: p.name,
      description: p.description || null,
      category: p.category || null,
    })),
  };
}

function installDraft(owner, repo, summary, kind) {
  const mpId = summary.marketplaceName || repo;
  const first = summary.plugins[0]?.name;
  return {
    add: `droid plugin marketplace add https://github.com/${owner}/${repo}`,
    install: first
      ? `droid plugin install ${first}@${mpId} --scope user`
      : null,
    note:
      kind === "claude-compat"
        ? "Uses .claude-plugin/marketplace.json — Droid falls back when .factory-plugin is absent."
        : "Native .factory-plugin/marketplace.json",
  };
}

async function collectFromOfficialPrs() {
  const found = new Map();
  const prs = await ghJson(
    "https://api.github.com/repos/Factory-AI/factory-plugins/pulls?state=open&per_page=40"
  );
  for (const pr of prs) {
    await sleep(TOKEN ? 60 : 220);
    let files;
    try {
      files = await ghJson(
        `https://api.github.com/repos/Factory-AI/factory-plugins/pulls/${pr.number}/files?per_page=100`
      );
    } catch (e) {
      console.warn(`PR #${pr.number} files skipped: ${e.message}`);
      continue;
    }
    const urls = new Set();
    for (const f of files) {
      const patch = f.patch || "";
      for (const m of patch.matchAll(
        /https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?/g
      )) {
        urls.add(m[0].replace(/\.git$/i, ""));
      }
      for (const m of patch.matchAll(
        /"url"\s*:\s*"(https:\/\/github\.com\/[^"]+)"/g
      )) {
        urls.add(m[1].replace(/\.git$/i, ""));
      }
    }
    for (const u of urls) {
      const parsed = parseGithubRepo(u);
      if (!parsed) continue;
      if (parsed.slug.toLowerCase() === "factory-ai/factory-plugins") continue;
      if (!found.has(parsed.slug)) {
        found.set(parsed.slug, {
          owner: parsed.owner,
          repo: parsed.repo,
          slug: parsed.slug,
          sources: [],
        });
      }
      found.get(parsed.slug).sources.push({
        type: "factory-plugins-pr",
        pr: pr.number,
        title: pr.title,
        url: pr.html_url,
      });
    }
  }
  return [...found.values()];
}

function loadSeeds() {
  if (!fs.existsSync(SEEDS_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
  const list = Array.isArray(raw) ? raw : raw.repos || [];
  return list
    .map((entry) => {
      if (typeof entry === "string") return parseGithubRepo(entry);
      if (entry?.owner && entry?.repo)
        return {
          owner: entry.owner,
          repo: entry.repo,
          slug: `${entry.owner}/${entry.repo}`,
          note: entry.note || null,
        };
      return parseGithubRepo(entry?.slug || entry?.url);
    })
    .filter(Boolean)
    .map((p) => ({
      owner: p.owner,
      repo: p.repo,
      slug: p.slug,
      sources: [{ type: "seed", note: p.note || null }],
    }));
}

async function validateRow(row, listed) {
  let repoMeta = null;
  try {
    repoMeta = await ghJson(
      `https://api.github.com/repos/${row.owner}/${row.repo}`
    );
    await sleep(TOKEN ? 80 : 200);
  } catch (e) {
    // Still try raw marketplace without API metadata
    repoMeta = {
      html_url: `https://github.com/${row.slug}`,
      stargazers_count: null,
      description: null,
      default_branch: "main",
      _metaError: e.message,
    };
  }

  const mp = await fetchMarketplace(
    row.owner,
    row.repo,
    repoMeta.default_branch
  );
  if (!mp) {
    return {
      reject: true,
      entry: {
        slug: row.slug,
        reason: "no_marketplace_json",
        default_branch: repoMeta.default_branch,
        stars: repoMeta.stargazers_count,
        description: repoMeta.description,
        sources: row.sources,
        error: repoMeta._metaError || null,
      },
    };
  }

  const summary = summarizeMarketplace(mp);
  const already = isAlreadyListed(
    listed,
    row.owner,
    row.repo,
    summary.marketplaceName,
    summary.plugins.map((p) => p.name)
  );
  const draft = installDraft(row.owner, row.repo, summary, mp.kind);
  const entry = {
    slug: row.slug,
    owner: row.owner,
    repo: row.repo,
    html_url: repoMeta.html_url,
    stars: repoMeta.stargazers_count,
    description: repoMeta.description,
    default_branch: repoMeta.default_branch,
    marketplaceKind: mp.kind,
    marketplacePath: mp.path,
    marketplaceRef: mp.ref,
    ...summary,
    install: draft,
    alreadyListed: already,
    suggestedListingPaths: [
      `/items/${row.owner}/${row.repo}/`,
      ...(summary.plugins[0]
        ? [`/items/${row.owner}/${summary.plugins[0].name}/`]
        : []),
    ],
    sources: row.sources,
  };

  if (already) {
    return { reject: true, entry: { ...entry, reason: "already_listed" } };
  }
  return { reject: false, entry };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const listed = listedSlugs();
  console.log(`Listed keys: ${listed.size}`);
  console.log(TOKEN ? "Auth: GITHUB_TOKEN set" : "Auth: anonymous (low rate limit)");
  if (SKIP_PRS) console.log("Mode: seeds-only (skip PR scan)");

  const bySlug = new Map();
  const merge = (row) => {
    if (!bySlug.has(row.slug)) {
      bySlug.set(row.slug, row);
      return;
    }
    bySlug.get(row.slug).sources.push(...row.sources);
  };

  for (const s of loadSeeds()) merge(s);

  if (!SKIP_PRS) {
    try {
      console.log("Scanning Factory-AI/factory-plugins open PRs…");
      const fromPrs = await collectFromOfficialPrs();
      console.log(`PR-linked repos: ${fromPrs.length}`);
      for (const r of fromPrs) merge(r);
    } catch (e) {
      console.warn(`PR scan failed: ${e.message}`);
    }
  }

  const candidates = [];
  const rejected = [];

  for (const row of bySlug.values()) {
    process.stdout.write(`Validate ${row.slug}… `);
    try {
      const result = await validateRow(row, listed);
      if (result.reject) {
        console.log(result.entry.reason || "rejected");
        rejected.push(result.entry);
      } else {
        console.log(
          `${result.entry.marketplaceKind} · ${result.entry.pluginCount} plugins`
        );
        candidates.push(result.entry);
      }
    } catch (e) {
      console.log(`error: ${e.message}`);
      rejected.push({
        slug: row.slug,
        reason: "validate_error",
        error: e.message,
        sources: row.sources,
      });
    }
    await sleep(TOKEN ? 60 : 180);
  }

  candidates.sort((a, b) => (b.stars || 0) - (a.stars || 0));

  const payload = {
    generatedAt: new Date().toISOString(),
    host: "droid",
    mode: SKIP_PRS ? "seeds-only" : "prs+seeds",
    counts: {
      candidates: candidates.length,
      rejected: rejected.length,
      scanned: bySlug.size,
    },
    candidates,
  };

  const candPath = path.join(OUT_DIR, "candidates.json");
  const rejPath = path.join(OUT_DIR, "rejected.json");
  fs.writeFileSync(candPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(
    rejPath,
    JSON.stringify({ generatedAt: payload.generatedAt, rejected }, null, 2)
  );

  console.log(`\nWrote ${candPath}`);
  console.log(`Wrote ${rejPath}`);
  console.log(`New candidates: ${candidates.length}`);
  for (const c of candidates.slice(0, 20)) {
    console.log(
      `  - ${c.slug} ★${c.stars ?? "?"} [${c.marketplaceKind}] ${c.marketplaceName} (${c.pluginCount})`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
