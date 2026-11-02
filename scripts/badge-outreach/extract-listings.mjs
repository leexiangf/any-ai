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

const hosts = ["amp", "orca", "droid"];
const rows = [];

for (const host of hosts) {
  const root = path.join("sites", host, "items");
  for (const file of walk(root)) {
    const norm = file.replace(/\\/g, "/");
    if (norm.endsWith(`/items/index.html`)) continue;
    const rel = norm.split("/items/")[1].replace("/index.html", "");
    const [owner, slug] = rel.split("/");
    const html = fs.readFileSync(file, "utf8");
    const title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/) || [])[1]?.trim() || slug;
    const one =
      (html.match(/page-hero[\s\S]*?<p>([^<]+)<\/p>/) || [])[1]?.trim() || "";
    const listing =
      (html.match(/rel="canonical" href="([^"]+)"/) || [])[1] ||
      `https://${host}.aiaaii.com/items/${owner}/${slug}/`;
    let source = (html.match(/href="(https:\/\/github\.com\/[^"]+)"/) || [])[1] || "";
    source = source.replace(/\/tree\/.*$/, "").replace(/\/$/, "");
    const badge = `[![Listed on ${host}.aiaaii.com](https://${host}.aiaaii.com/badges/listed.svg)](${listing})`;
    rows.push({ host, owner, slug, title, one, listing, source, badge });
  }
}

const outDir = path.join("ops", "badge-outreach");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "listings.json"), JSON.stringify(rows, null, 2));
console.log(`wrote ${rows.length} listings`);
