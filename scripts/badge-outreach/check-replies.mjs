import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const gh =
  process.env.GH_BIN ||
  (process.platform === "win32"
    ? "C:\\Program Files\\GitHub CLI\\gh.exe"
    : "gh");

/** Prefer TRACKING.csv (all waves); fall back to result JSON files. */
function loadSent() {
  const fromCsv = [];
  const csv = fs.readFileSync(path.join("ops", "badge-outreach", "TRACKING.csv"), "utf8");
  for (const line of csv.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const cols = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
    const unq = (s) => (s || "").replace(/^"/, "").replace(/"$/, "").replace(/""/g, '"');
    if (unq(cols[7]) !== "sent") continue;
    const note = unq(cols[9] || "");
    const url = note.match(/https:\/\/github\.com\/[^\s"]+\/issues\/\d+/)?.[0];
    if (url) fromCsv.push({ url, status: "sent" });
  }
  if (fromCsv.length) return fromCsv;
  return [
    ...JSON.parse(fs.readFileSync(path.join("ops", "badge-outreach", "wave1-results.json"), "utf8")),
    ...JSON.parse(fs.readFileSync(path.join("ops", "badge-outreach", "wave2-batch-results.json"), "utf8")),
  ].filter((r) => r.status === "sent" && r.url);
}
const results = loadSent();

const items = [];
for (const r of results) {
  const m = r.url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!m) continue;
  const [, owner, repo, num] = m;
  const full = `${owner}/${repo}`;
  const view = spawnSync(
    gh,
    ["issue", "view", num, "-R", full, "--json", "title,state,comments,url,updatedAt"],
    { encoding: "utf8" }
  );
  if (view.status !== 0) {
    items.push({ repo: full, num, error: (view.stderr || view.stdout || "").slice(0, 160) });
    continue;
  }
  const j = JSON.parse(view.stdout);
  const comments = spawnSync(gh, ["api", `repos/${full}/issues/${num}/comments`], {
    encoding: "utf8",
  });
  let replies = [];
  if (comments.status === 0) {
    try {
      replies = JSON.parse(comments.stdout)
        .filter((c) => c.user?.login && c.user.login !== "leexiangf")
        .map((c) => ({
          user: c.user.login,
          at: (c.created_at || "").slice(0, 10),
          preview: (c.body || "").replace(/\s+/g, " ").slice(0, 100),
        }));
    } catch {
      /* ignore */
    }
  }
  items.push({
    issue: `${full}#${num}`,
    state: j.state,
    commentCount: j.comments,
    replies,
    updatedAt: (j.updatedAt || "").slice(0, 10),
    url: j.url,
  });
}

const withReply = items.filter((x) => x.replies?.length);
const closed = items.filter((x) => x.state === "CLOSED");
fs.writeFileSync(
  path.join("ops", "badge-outreach", "issue-replies-snapshot.json"),
  JSON.stringify({ checkedAt: new Date().toISOString(), total: items.length, withReply: withReply.length, closed: closed.length, items }, null, 2)
);

console.log(`Checked ${items.length} issues · replies=${withReply.length} · closed=${closed.length}`);
if (withReply.length) {
  console.log("\nWith replies from others:");
  for (const x of withReply) {
    console.log(`- ${x.issue} (${x.state}) ${x.url}`);
    for (const r of x.replies) console.log(`    ${r.at} @${r.user}: ${r.preview}`);
  }
} else {
  console.log("\nNo replies from other users yet.");
}
if (closed.length) {
  console.log("\nClosed:");
  for (const x of closed) console.log(`- ${x.issue} ${x.url}`);
}
