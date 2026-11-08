/**
 * Resume index/sitemap/count wiring after list-from-discover wrote pages
 * but crashed on append (e.g. item-list data-catalog).
 *
 * Usage: node scripts/wire-last-listed.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITES = path.join(ROOT, "sites");
const DATE = new Date().toISOString().slice(0, 10);

const HOST = {
  droid: { domain: "droid.aiaaii.com" },
  orca: { domain: "orca.aiaaii.com" },
  kimi: { domain: "kimi.aiaaii.com" },
  amp: { domain: "amp.aiaaii.com" },
};

const listed = JSON.parse(fs.readFileSync(path.join(ROOT, "ops/discover/last-listed.json"), "utf8"));
const items = listed.items || [];

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function card(item) {
  const stars = Number(item.stars) || 0;
  const starSvg =
    '<svg class="item-star-icon" viewBox="0 0 16 16" aria-hidden="true" width="12" height="12"><path fill="currentColor" d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.92L8 10.77l-3.52 1.85.67-3.92L2.3 5.64l3.94-.57L8 1.5z"/></svg>';
  return `          <a class="item" href="/items/${item.owner}/${item.slug}/" data-name="${esc(
    item.name
  )}" data-owner="${esc(item.owner)}" data-stars="${stars}"><div class="item-top"><span class="item-badge">${esc(
    item.category
  )}</span><span class="item-stars" title="${stars} GitHub stars" aria-label="${stars} GitHub stars">${starSvg}<span class="item-stars-n">${stars}</span></span></div><div class="item-body"><h2 class="item-name">${esc(
    item.name
  )}</h2><p class="item-one">${esc(item.hero)}</p><p class="item-meta">${esc(item.owner)}</p></div></a>`;
}

function appendItemCards(file, list) {
  if (!list.length || !fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  const first = list[0];
  if (html.includes(`/items/${first.owner}/${first.slug}/`)) {
    console.log("skip already in", path.relative(ROOT, file));
    return;
  }
  const marker = list.map(card).join("\n") + "\n";
  const listOpen = html.match(/<div class="item-list"[^>]*>/i);
  const idx = listOpen ? html.lastIndexOf(listOpen[0]) : -1;
  if (idx < 0) throw new Error(`no item-list in ${file}`);
  const endList = html.indexOf("</div>", html.lastIndexOf("</a>", html.indexOf("</main>", idx)));
  html = html.slice(0, endList) + "\n" + marker + html.slice(endList);
  fs.writeFileSync(file, html, "utf8");
  console.log("wired", path.relative(ROOT, file), list.length);
}

function bumpExact(file, replacements) {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  for (const [from, to] of replacements) {
    if (!html.includes(from)) {
      console.warn("missing bump", path.relative(ROOT, file), from);
      continue;
    }
    html = html.split(from).join(to);
  }
  fs.writeFileSync(file, html, "utf8");
}

function listedCount(host) {
  const base = path.join(SITES, host, "items");
  let n = 0;
  for (const o of fs.readdirSync(base, { withFileTypes: true })) {
    if (!o.isDirectory() || o.name.startsWith("_")) continue;
    for (const s of fs.readdirSync(path.join(base, o.name), { withFileTypes: true })) {
      if (s.isDirectory() && fs.existsSync(path.join(base, o.name, s.name, "index.html"))) n++;
    }
  }
  return n;
}

function appendSitemap(host, list) {
  const file = path.join(SITES, host, "sitemap.xml");
  let xml = fs.readFileSync(file, "utf8");
  const fresh = list.filter((it) => !xml.includes(`/items/${it.owner}/${it.slug}/`));
  if (!fresh.length) {
    console.log("sitemap skip", host);
    return;
  }
  const urls = fresh
    .map(
      (it) =>
        `  <url><loc>https://${HOST[host].domain}/items/${it.owner}/${it.slug}/</loc><lastmod>${DATE}</lastmod><priority>0.8</priority></url>`
    )
    .join("\n");
  xml = xml.replace("</urlset>", `${urls}\n</urlset>`);
  fs.writeFileSync(file, xml, "utf8");
  console.log("sitemap", host, fresh.length);
}

const before = { droid: 65, kimi: 54, orca: 76, amp: 38 };
const byHost = Object.groupBy(items, (x) => x.host);

for (const [host, list] of Object.entries(byHost)) {
  const from = before[host];
  const to = listedCount(host);
  appendItemCards(path.join(SITES, host, "items/index.html"), list);
  const byCat = Object.groupBy(list, (x) => x.category);
  for (const [cat, catItems] of Object.entries(byCat)) {
    const f = path.join(SITES, host, "categories", cat, "index.html");
    if (fs.existsSync(f)) appendItemCards(f, catItems);
  }
  appendSitemap(host, list);
  if (host === "droid") {
    bumpExact(path.join(SITES, "droid/items/index.html"), [
      [`${from} Droid Plugins`, `${to} Droid Plugins`],
      [`Browse ${from} Droid plugins`, `Browse ${to} Droid plugins`],
      [`${from} Droid plugins`, `${to} Droid plugins`],
    ]);
    bumpExact(path.join(SITES, "droid/index.html"), [[`<strong>${from}</strong>`, `<strong>${to}</strong>`]]);
  } else if (host === "orca") {
    bumpExact(path.join(SITES, "orca/items/index.html"), [
      [`${from} Orca Plugins`, `${to} Orca Plugins`],
      [`Browse ${from} community`, `Browse ${to} community`],
      [`${from} Orca plugins`, `${to} Orca plugins`],
    ]);
    bumpExact(path.join(SITES, "orca/index.html"), [[`<strong>${from}</strong>`, `<strong>${to}</strong>`]]);
  } else if (host === "kimi") {
    bumpExact(path.join(SITES, "kimi/items/index.html"), [
      [`${from} curated listings`, `${to} curated listings`],
    ]);
    bumpExact(path.join(SITES, "kimi/index.html"), [
      [`<strong>${from}</strong>`, `<strong>${to}</strong>`],
      [`All ${from} plugins`, `All ${to} plugins`],
    ]);
  }
}

const counts = {
  droid: listedCount("droid"),
  kimi: listedCount("kimi"),
  orca: listedCount("orca"),
  amp: listedCount("amp"),
};
counts.total = counts.droid + counts.kimi + counts.orca + counts.amp;

let www = fs.readFileSync(path.join(SITES, "www/index.html"), "utf8");
www = www
  .replace(
    /Plugin market · <strong>\d+<\/strong> listings · <span class="acronym">droid plugin install<\/span>/,
    `Plugin market · <strong>${counts.droid}</strong> listings · <span class="acronym">droid plugin install</span>`
  )
  .replace(
    /Plugin market · <strong>\d+<\/strong> listings · marketplace sources/,
    `Plugin market · <strong>${counts.orca}</strong> listings · marketplace sources`
  )
  .replace(
    /Plugin market · <strong>\d+<\/strong> listings · <span class="acronym">\/plugins install<\/span>/,
    `Plugin market · <strong>${counts.kimi}</strong> listings · <span class="acronym">/plugins install</span>`
  )
  .replace(/<strong>\d+<\/strong>\s*\n\s*<span>curated listings<\/span>/, `<strong>${counts.total}</strong>\n              <span>curated listings</span>`);
fs.writeFileSync(path.join(SITES, "www/index.html"), www, "utf8");
console.log("counts", counts);
