import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const drafts = JSON.parse(
  fs.readFileSync(path.join("ops", "badge-outreach", "drafts.json"), "utf8")
).filter((d) => d.wave === 1);

/** One LambdaTest issue is enough; siblings get skipped to avoid spam. */
const SKIP_SOURCES = new Set([
  "https://github.com/LambdaTest/kane-cli",
  "https://github.com/LambdaTest/rook-claude-plugin",
]);

const gh =
  process.env.GH_BIN ||
  (process.platform === "win32"
    ? "C:\\Program Files\\GitHub CLI\\gh.exe"
    : "gh");

const results = [];

for (const d of drafts) {
  const src = d.primary.source;
  const repo = src.replace(/^https:\/\/github\.com\//i, "");
  if (SKIP_SOURCES.has(src)) {
    results.push({ repo, status: "skipped", note: "bundled under mcp-server-guide" });
    continue;
  }

  const bodyFile = path.join("ops", "badge-outreach", `_issue_body_${d.primary.owner}_${d.primary.slug}.md`);
  fs.writeFileSync(bodyFile, d.issueBody);

  const r = spawnSync(
    gh,
    ["issue", "create", "--repo", repo, "--title", d.issueTitle, "--body-file", bodyFile],
    { encoding: "utf8" }
  );

  const out = ((r.stdout || "") + (r.stderr || "")).trim();
  if (r.status === 0 && /github\.com\/.+\/issues\/\d+/.test(out)) {
    const url = out.match(/https:\/\/github\.com\/[^\s]+\/issues\/\d+/)?.[0] || out;
    results.push({ repo, status: "sent", url });
    console.log(`OK  ${repo} → ${url}`);
  } else {
    results.push({ repo, status: "failed", note: out.slice(0, 500) });
    console.log(`FAIL ${repo}\n${out.slice(0, 400)}`);
  }

  try {
    fs.unlinkSync(bodyFile);
  } catch {}
}

const trackingPath = path.join("ops", "badge-outreach", "TRACKING.csv");
const lines = fs.readFileSync(trackingPath, "utf8").split(/\r?\n/);
const header = lines[0];
const now = new Date().toISOString().slice(0, 10);
const byRepo = new Map(results.map((r) => [r.repo.toLowerCase(), r]));

const next = [header];
for (const line of lines.slice(1)) {
  if (!line.trim()) continue;
  // naive CSV split for our quoted fields
  const cols = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
  const unq = (s) => (s || "").replace(/^"/, "").replace(/"$/, "").replace(/""/g, '"');
  const source = unq(cols[4] || "");
  const repo = source.replace(/^https:\/\/github\.com\//i, "").toLowerCase();
  const hit = byRepo.get(repo);
  if (hit) {
    cols[7] = `"${hit.status}"`;
    cols[8] = `"${now}"`;
    cols[9] = `"${(hit.url || hit.note || "").replace(/"/g, '""')}"`;
  }
  next.push(cols.join(","));
}
fs.writeFileSync(trackingPath, next.join("\n") + "\n");
fs.writeFileSync(
  path.join("ops", "badge-outreach", "wave1-results.json"),
  JSON.stringify(results, null, 2)
);

const sent = results.filter((r) => r.status === "sent").length;
const failed = results.filter((r) => r.status === "failed").length;
const skipped = results.filter((r) => r.status === "skipped").length;
console.log(`\nDone: sent=${sent} failed=${failed} skipped=${skipped}`);
