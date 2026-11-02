import fs from "node:fs";
import path from "node:path";

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name === "index.html") acc.push(p);
  }
  return acc;
}

const listedSlugs = new Set();
const listedOwners = new Set();
for (const f of walk(path.join("sites", "orca", "items"))) {
  const norm = f.replace(/\\/g, "/");
  if (norm.endsWith("/items/index.html")) continue;
  const rel = norm.split("/items/")[1]?.replace("/index.html", "");
  if (!rel) continue;
  const [owner, slug] = rel.split("/");
  listedSlugs.add(slug.toLowerCase());
  listedOwners.add(`${owner}/${slug}`.toLowerCase());
}

const cat = JSON.parse(fs.readFileSync("_orca_community_catalog.json", "utf8"));
const missing = [];
for (const p of cat.plugins || []) {
  const id = p.id || "";
  const afterDot = id.includes(".") ? id.split(".").slice(1).join("-") : id;
  const variants = [
    afterDot.toLowerCase(),
    afterDot.toLowerCase().replace(/_/g, "-"),
    id.toLowerCase().replace(".", "-"),
  ];
  const found = variants.some((v) => listedSlugs.has(v) || [...listedSlugs].some((s) => s.includes(v) || v.includes(s)));
  if (!found) {
    missing.push({
      id,
      name: p.releases?.[0]?.name || id,
      cats: (p.categories || []).join(","),
      source: p.source?.url || "",
      slugGuess: afterDot,
    });
  }
}

console.log(`listed_slugs=${listedSlugs.size} catalog=${(cat.plugins || []).length} missing≈${missing.length}`);
for (const m of missing.slice(0, 30)) {
  console.log(`- ${m.id} | ${m.name} | ${m.cats}`);
}
fs.writeFileSync(
  path.join("ops", "badge-outreach", "orca-catalog-gaps.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), missing }, null, 2)
);
