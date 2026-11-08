/**
 * Rebuild host + www sitemaps with lastmod from file mtime.
 * Usage: node scripts/rebuild-sitemaps.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("sites");
const HOSTS = {
  amp: "amp.aiaaii.com",
  orca: "orca.aiaaii.com",
  droid: "droid.aiaaii.com",
  kimi: "kimi.aiaaii.com",
  www: "aiaaii.com",
};

function priorityFor(urlPath) {
  if (urlPath === "/") return 1.0;
  if (urlPath === "/items/" || urlPath === "/guides/") return 0.9;
  if (urlPath.startsWith("/items/")) return 0.8;
  if (urlPath.startsWith("/guides/") || urlPath.startsWith("/categories/")) return 0.7;
  if (urlPath.startsWith("/compare/")) return 0.8;
  return 0.6;
}

function collect(host) {
  const hostRoot = path.join(ROOT, host);
  const domain = HOSTS[host];
  const out = [];

  function add(filePath, urlPath) {
    const st = fs.statSync(filePath);
    out.push({
      loc: `https://${domain}${urlPath}`,
      lastmod: st.mtime.toISOString().slice(0, 10),
      priority: priorityFor(urlPath),
    });
  }

  function walk(dir, urlPrefix) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith(".")) continue;
      const full = path.join(dir, ent.name);
      if (!ent.isDirectory()) continue;
      const index = path.join(full, "index.html");
      if (fs.existsSync(index)) add(index, `${urlPrefix}${ent.name}/`);
      walk(full, `${urlPrefix}${ent.name}/`);
    }
  }

  const home = path.join(hostRoot, "index.html");
  if (fs.existsSync(home)) add(home, "/");
  walk(hostRoot, "/");

  const seen = new Map();
  for (const u of out) seen.set(u.loc, u);
  return [...seen.values()].sort((a, b) => a.loc.localeCompare(b.loc));
}

function writeSitemap(host, urls) {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls.map(
      (u) =>
        `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`
    ),
    `</urlset>`,
    ``,
  ];
  const file = path.join(ROOT, host, "sitemap.xml");
  fs.writeFileSync(file, lines.join("\n"), "utf8");
  console.log(`${host}: ${urls.length} urls → ${file}`);
}

for (const host of Object.keys(HOSTS)) {
  writeSitemap(host, collect(host));
}
