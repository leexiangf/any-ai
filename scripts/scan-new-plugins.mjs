import fs from "node:fs";
import path from "node:path";

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
if (!token) {
  console.error("GITHUB_TOKEN required");
  process.exit(1);
}

function listed(host) {
  const base = path.join("sites", host, "items");
  const out = new Set();
  for (const o of fs.readdirSync(base, { withFileTypes: true })) {
    if (!o.isDirectory() || o.name.startsWith("_")) continue;
    for (const s of fs.readdirSync(path.join(base, o.name), { withFileTypes: true })) {
      if (s.isDirectory()) out.add(`${o.name}/${s.name}`.toLowerCase());
    }
  }
  return out;
}

const hosts = {
  kimi: listed("kimi"),
  amp: listed("amp"),
  orca: listed("orca"),
  droid: listed("droid"),
};

async function api(url) {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "aiaaii-scan",
    },
  });
  const text = await r.text();
  let j = {};
  try {
    j = JSON.parse(text);
  } catch {
    j = { message: text.slice(0, 200) };
  }
  if (!r.ok) return { ok: false, status: r.status, message: j.message, items: [], total: 0 };
  return { ok: true, status: r.status, items: j.items || [], total: j.total_count || 0 };
}

async function searchCode(q, per = 40) {
  const u = `https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=${per}`;
  return api(u);
}

async function searchRepos(q, per = 30) {
  const u = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=updated&per_page=${per}`;
  return api(u);
}

function uniqRepos(items, mapFn) {
  const m = new Map();
  for (const it of items) {
    const row = mapFn(it);
    if (!row?.repo) continue;
    const k = row.repo.toLowerCase();
    if (!m.has(k)) m.set(k, row);
  }
  return [...m.values()];
}

function fresh(rows, set) {
  return rows.filter((r) => !set.has(r.repo.toLowerCase()));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = { generatedAt: new Date().toISOString(), listedCounts: Object.fromEntries(Object.entries(hosts).map(([k, v]) => [k, v.size])), buckets: {} };

// Kimi
{
  const a = await searchCode("filename:kimi.plugin.json", 50);
  await sleep(700);
  const b = await searchCode("filename:plugin.json path:.kimi-plugin", 50);
  await sleep(700);
  const c = await searchRepos("kimi-plugin OR kimi.plugin.json OR \"/plugins install\" kimi pushed:>2026-08-01", 30);
  const codeRows = uniqRepos([...(a.items || []), ...(b.items || [])], (i) => ({
    repo: i.repository?.full_name,
    path: i.path,
    via: "code",
  }));
  const repoRows = uniqRepos(c.items || [], (i) => ({
    repo: i.full_name,
    stars: i.stargazers_count,
    desc: i.description || "",
    updated: i.updated_at,
    via: "repo",
  }));
  report.buckets.kimi = {
    totals: { code_manifest: a.total, code_dir: b.total, repos: c.total, errors: [a.status, b.status, c.status].filter((s) => s >= 400) },
    fresh: fresh([...codeRows, ...repoRows], hosts.kimi).slice(0, 40),
  };
}

// Orca
{
  const a = await searchCode("filename:orca-marketplace.json", 50);
  await sleep(700);
  const b = await searchCode("filename:orca-plugin.json", 50);
  await sleep(700);
  const c = await searchRepos("orca-marketplace OR orca-plugin OR \"orca plugin\" pushed:>2026-09-01", 30);
  const codeRows = uniqRepos([...(a.items || []), ...(b.items || [])], (i) => ({
    repo: i.repository?.full_name,
    path: i.path,
    via: "code",
  }));
  const repoRows = uniqRepos(c.items || [], (i) => ({
    repo: i.full_name,
    stars: i.stargazers_count,
    desc: i.description || "",
    updated: i.updated_at,
    via: "repo",
  }));
  report.buckets.orca = {
    totals: { marketplace: a.total, plugin_json: b.total, repos: c.total, errors: [a.status, b.status, c.status].filter((s) => s >= 400) },
    fresh: fresh([...codeRows, ...repoRows], hosts.orca).slice(0, 40),
  };
}

// Amp
{
  const a = await searchRepos("ampcode plugin OR \"amp plugins add\" OR amp-plugin pushed:>2026-08-01", 40);
  await sleep(700);
  const b = await searchCode("\"amp plugins add\" extension:md", 30);
  const repoRows = uniqRepos(a.items || [], (i) => ({
    repo: i.full_name,
    stars: i.stargazers_count,
    desc: i.description || "",
    updated: i.updated_at,
    via: "repo",
  }));
  const codeRows = uniqRepos(b.items || [], (i) => ({
    repo: i.repository?.full_name,
    path: i.path,
    via: "code",
  }));
  report.buckets.amp = {
    totals: { repos: a.total, code: b.total, errors: [a.status, b.status].filter((s) => s >= 400) },
    fresh: fresh([...repoRows, ...codeRows], hosts.amp).slice(0, 40),
  };
}

// Droid candidates from discover output if present
try {
  const cand = JSON.parse(fs.readFileSync("scripts/droid-discover/out/candidates.json", "utf8"));
  report.buckets.droid = {
    fromDiscover: (cand.candidates || cand || []).filter?.((c) => c.alreadyListed === false) ||
      (Array.isArray(cand) ? cand.filter((c) => !c.alreadyListed) : []),
  };
} catch {
  report.buckets.droid = { fromDiscover: [] };
}

fs.writeFileSync("_new_plugin_scan.json", JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      listedCounts: report.listedCounts,
      kimi: report.buckets.kimi.fresh.length,
      orca: report.buckets.orca.fresh.length,
      amp: report.buckets.amp.fresh.length,
      droidDiscover: (report.buckets.droid.fromDiscover || []).length,
      kimiSample: report.buckets.kimi.fresh.slice(0, 12).map((x) => x.repo),
      orcaSample: report.buckets.orca.fresh.slice(0, 12).map((x) => x.repo),
      ampSample: report.buckets.amp.fresh.slice(0, 12).map((x) => x.repo),
    },
    null,
    2
  )
);
