import fs from "node:fs";
import path from "node:path";

const listings = JSON.parse(
  fs.readFileSync(path.join("ops", "badge-outreach", "listings.json"), "utf8")
);

/** Prefer marketplace/index listing when several share one source. */
function pickPrimary(group) {
  const repoName = (r) => {
    const m = (r.source || "").match(/github\.com\/[^/]+\/([^/#?]+)/i);
    return (m ? m[1] : "").toLowerCase();
  };
  const rank = (r) => {
    const slug = r.slug.toLowerCase();
    const repo = repoName(r);
    if (repo && slug === repo) return 0; // listing id matches GitHub repo
    if (/(marketplace|factory-plugin|mcp-plugin|-plugins$|-guide$)/.test(slug)) return 1;
    if (/-plugin$/.test(slug) && slug !== repo) return 3; // child plugin page
    return 2;
  };
  return [...group].sort((a, b) => rank(a) - rank(b) || a.slug.localeCompare(b.slug))[0];
}

const bySource = new Map();
for (const row of listings) {
  if (!row.source) continue;
  const key = row.source.toLowerCase();
  if (!bySource.has(key)) bySource.set(key, []);
  bySource.get(key).push(row);
}

const OFFICIAL_SKIP = new Set([
  "factory-ai",
  "stablyai",
]);

function wave(owner) {
  const o = owner.toLowerCase();
  if (OFFICIAL_SKIP.has(o)) return 3; // optional later
  if (["lambdatest", "cursor", "apify", "sonarsource", "salemalem", "rohitg00", "dodopayments", "loootai", "shaisolaris"].includes(o))
    return 1;
  if (["lox", "sourcegraph"].includes(o)) return 1;
  return 2;
}

const drafts = [];
for (const [, group] of bySource) {
  const primary = pickPrimary(group);
  const related = group.filter((g) => g !== primary);
  drafts.push({
    wave: wave(primary.owner),
    primary,
    related,
    issueUrl: `${primary.source}/issues/new`,
  });
}

drafts.sort((a, b) => a.wave - b.wave || a.primary.host.localeCompare(b.primary.host) || a.primary.owner.localeCompare(b.primary.owner));

function issueBody(d) {
  const p = d.primary;
  const domain = `${p.host}.aiaaii.com`;
  const relatedLines = d.related.length
    ? `\nAlso indexed on this market:\n${d.related.map((r) => `- ${r.title}: ${r.listing}`).join("\n")}\n`
    : "";
  return `## Context

Hi! We independently listed **${p.title}** on the community **${p.host === "droid" ? "Droid" : p.host === "amp" ? "Amp" : "Orca"} Plugin Market** (Any AI / AI-AAII — not affiliated with the host vendor).

Listing: ${p.listing}
${relatedLines}
## Ask

If this looks correct, would you consider adding a README badge that links back to the listing? Optional — no obligation.

\`\`\`md
${p.badge}
\`\`\`

Preview: https://${domain}/badges/listed.svg

## Notes

- Community directory only; install commands point at your public source.
- Corrections welcome (wrong one-liner, install path, or prefer noindex) — comment here or open https://github.com/leexiangf/any-ai/issues
- Mall: https://aiaaii.com/

Thanks for shipping public installable plugins.
`;
}

function emailBody(d) {
  const p = d.primary;
  const hostName = p.host === "droid" ? "Droid" : p.host === "amp" ? "Amp" : "Orca";
  return `Subject: Listed ${p.title} on ${p.host}.aiaaii.com — optional README badge

Hi ${p.owner} team,

We published an independent community listing for **${p.title}** on ${hostName} Plugin Market (Any AI / AI-AAII; not affiliated with ${hostName}'s vendor):

${p.listing}

If accurate, you're welcome to drop this badge in the README (optional):

${p.badge}

Happy to fix anything that looks wrong. Reply here or file https://github.com/leexiangf/any-ai/issues

Thanks,
Any AI (aiaaii.com)
`;
}

const outDir = path.join("ops", "badge-outreach");
const lines = [];
lines.push("# Badge outreach drafts");
lines.push("");
lines.push(`Generated ${new Date().toISOString().slice(0, 10)} · ${drafts.length} unique GitHub sources (from ${listings.length} listings).`);
lines.push("");
lines.push("| Wave | Meaning |");
lines.push("| --- | --- |");
lines.push("| 1 | Priority this week — community / new Droid packs |");
lines.push("| 2 | Remaining community sources |");
lines.push("| 3 | Host-vendor / official orgs — optional, lower urgency |");
lines.push("");
lines.push("How to send: open `issueUrl` → paste **GitHub Issue body** · or email paste **Email body**. Track status in `TRACKING.csv`.");
lines.push("");

const csv = ["wave,host,owner,slug,source,listing,issue_url,status,sent_at,notes"];

for (const d of drafts) {
  const p = d.primary;
  lines.push(`## W${d.wave} · ${p.owner}/${p.slug} (${p.host})`);
  lines.push("");
  lines.push(`- Source: ${p.source}`);
  lines.push(`- Open issue: ${d.issueUrl}`);
  lines.push(`- Listing: ${p.listing}`);
  if (d.related.length) {
    lines.push(`- Related listings: ${d.related.map((r) => r.slug).join(", ")}`);
  }
  lines.push("");
  lines.push("### GitHub Issue title");
  lines.push("");
  lines.push("```");
  lines.push(`Optional: Listed on ${p.host}.aiaaii.com badge for README`);
  lines.push("```");
  lines.push("");
  lines.push("### GitHub Issue body");
  lines.push("");
  lines.push("```md");
  lines.push(issueBody(d).trimEnd());
  lines.push("```");
  lines.push("");
  lines.push("### Email body");
  lines.push("");
  lines.push("```");
  lines.push(emailBody(d).trimEnd());
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");

  csv.push(
    [
      d.wave,
      p.host,
      p.owner,
      p.slug,
      p.source,
      p.listing,
      d.issueUrl,
      "todo",
      "",
      d.related.map((r) => r.slug).join("|"),
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(",")
  );
}

fs.writeFileSync(path.join(outDir, "DRAFTS.md"), lines.join("\n"));
fs.writeFileSync(path.join(outDir, "TRACKING.csv"), csv.join("\n") + "\n");
fs.writeFileSync(
  path.join(outDir, "drafts.json"),
  JSON.stringify(
    drafts.map((d) => ({
      wave: d.wave,
      issueUrl: d.issueUrl,
      primary: d.primary,
      related: d.related.map((r) => ({ slug: r.slug, listing: r.listing })),
      issueTitle: `Optional: Listed on ${d.primary.host}.aiaaii.com badge for README`,
      issueBody: issueBody(d),
      emailBody: emailBody(d),
    })),
    null,
    2
  )
);

const w1 = drafts.filter((d) => d.wave === 1).length;
const w2 = drafts.filter((d) => d.wave === 2).length;
const w3 = drafts.filter((d) => d.wave === 3).length;
console.log(`drafts: ${drafts.length} (W1=${w1} W2=${w2} W3=${w3})`);
