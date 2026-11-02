import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const LIMIT = Number(process.env.WAVE2_LIMIT || 10);
const drafts = JSON.parse(
  fs.readFileSync(path.join("ops", "badge-outreach", "drafts.json"), "utf8")
).filter((d) => d.wave === 2);

const trackingPath = path.join("ops", "badge-outreach", "TRACKING.csv");
const tracking = fs.readFileSync(trackingPath, "utf8");

function isCleanRepoUrl(url) {
  // only https://github.com/owner/repo — no blob/tree/extra path
  return /^https:\/\/github\.com\/[^/]+\/[^/#?]+\/?$/i.test(url || "");
}

function alreadySent(source) {
  return tracking.toLowerCase().includes(`"${source.toLowerCase()}"`) &&
    tracking.split(/\r?\n/).some((line) => {
      if (!line.toLowerCase().includes(source.toLowerCase())) return false;
      return /,"sent",|"failed"|"skipped"/.test(line) && line.includes(source);
    });
}

const gh =
  process.env.GH_BIN ||
  (process.platform === "win32"
    ? "C:\\Program Files\\GitHub CLI\\gh.exe"
    : "gh");

const candidates = drafts.filter((d) => {
  const src = d.primary.source;
  if (!isCleanRepoUrl(src)) return false;
  // skip if tracking already marked sent for this source
  const row = tracking.split(/\r?\n/).find((l) => l.includes(src));
  if (row && /,"sent",/.test(row)) return false;
  return true;
});

const batch = candidates.slice(0, LIMIT);
const results = [];

console.log(`Wave2 candidates clean=${candidates.length}; opening ${batch.length}`);

for (const d of batch) {
  const src = d.primary.source.replace(/\/$/, "");
  const repo = src.replace(/^https:\/\/github\.com\//i, "");
  const bodyFile = path.join(
    "ops",
    "badge-outreach",
    `_issue_body_w2_${d.primary.owner}_${d.primary.slug}.md`
  );
  fs.writeFileSync(bodyFile, d.issueBody);

  const r = spawnSync(
    gh,
    ["issue", "create", "--repo", repo, "--title", d.issueTitle, "--body-file", bodyFile],
    { encoding: "utf8" }
  );
  const out = ((r.stdout || "") + (r.stderr || "")).trim();
  try {
    fs.unlinkSync(bodyFile);
  } catch {}

  if (r.status === 0 && /issues\/\d+/.test(out)) {
    const url = out.match(/https:\/\/github\.com\/[^\s]+\/issues\/\d+/)?.[0] || out;
    results.push({ repo, status: "sent", url, source: src });
    console.log(`OK  ${repo} → ${url}`);
  } else {
    results.push({ repo, status: "failed", note: out.slice(0, 500), source: src });
    console.log(`FAIL ${repo}\n${out.slice(0, 300)}`);
  }
}

const now = new Date().toISOString().slice(0, 10);
const lines = tracking.split(/\r?\n/);
const header = lines[0];
const bySource = new Map(results.map((r) => [r.source.toLowerCase(), r]));
const next = [header];
for (const line of lines.slice(1)) {
  if (!line.trim()) continue;
  const cols = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
  const unq = (s) => (s || "").replace(/^"/, "").replace(/"$/, "").replace(/""/g, '"');
  const source = unq(cols[4] || "").replace(/\/$/, "");
  const hit = bySource.get(source.toLowerCase());
  if (hit) {
    cols[7] = `"${hit.status}"`;
    cols[8] = `"${now}"`;
    cols[9] = `"${(hit.url || hit.note || "").replace(/"/g, '""')}"`;
  }
  next.push(cols.join(","));
}
fs.writeFileSync(trackingPath, next.join("\n") + "\n");
fs.writeFileSync(
  path.join("ops", "badge-outreach", "wave2-batch-results.json"),
  JSON.stringify(results, null, 2)
);
console.log(
  `\nDone: sent=${results.filter((r) => r.status === "sent").length} failed=${results.filter((r) => r.status === "failed").length}`
);
