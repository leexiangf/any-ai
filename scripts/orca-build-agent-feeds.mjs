/**
 * Build Agent-readable feeds + stamp visibility badges on known listings.
 *
 *   node scripts/orca-build-agent-feeds.mjs
 *
 * Writes:
 *   sites/orca/catalog.json
 *   sites/orca/llms.txt
 * Patches detail pages listed in ops/discover/orca-visibility.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ORCA = path.join(ROOT, "sites/orca");
const ITEMS = path.join(ORCA, "items");
const VIS = JSON.parse(fs.readFileSync(path.join(ROOT, "ops/discover/orca-visibility.json"), "utf8"));

function pick(html, re, fb = "") {
  const m = html.match(re);
  return m ? m[1].trim() : fb;
}

function listItems() {
  const out = [];
  for (const owner of fs.readdirSync(ITEMS, { withFileTypes: true })) {
    if (!owner.isDirectory() || owner.name.startsWith("_")) continue;
    for (const slug of fs.readdirSync(path.join(ITEMS, owner.name), { withFileTypes: true })) {
      if (!slug.isDirectory()) continue;
      const file = path.join(ITEMS, owner.name, slug.name, "index.html");
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf8");
      const name = pick(html, /<h1>([^<]+)<\/h1>/i, slug.name);
      const hero = pick(html, /<header class="page-hero">[\s\S]*?<p>([\s\S]*?)<\/p>/i)
        .replace(/<[^>]+>/g, "")
        .trim();
      const category = pick(html, /href="\/categories\/([^/"]+)\//i, "commands-panels");
      const listingId = pick(html, /<dt>Plugin id<\/dt>\s*<dd><code>([^<]+)<\/code>/i, "");
      const source = pick(html, /<dt>Source<\/dt>[\s\S]*?<a href="([^"]+)"/i, `https://github.com/${owner.name}/${slug.name}`);
      const key = `${owner.name}/${slug.name}`;
      const meta = VIS.statuses[key] || {
        visibility: "unknown",
        review: "unreviewed",
        install: "unknown",
      };
      out.push({
        id: listingId || key,
        owner: owner.name,
        slug: slug.name,
        name,
        description: hero,
        category,
        source,
        url: `https://orca.aiaaii.com/items/${owner.name}/${slug.name}/`,
        visibility: meta.visibility,
        review: meta.review || "unreviewed",
        install: meta.install || "unknown",
        recommendedPin: meta.recommendedPin || null,
        verifiedOrca: meta.verifiedOrca || null,
        hiddenInUiHint: meta.visibility === "web-ref" || /theme/i.test(category),
        file,
        html,
        stamped: Boolean(VIS.statuses[key]),
      });
    }
  }
  return out;
}

function stampHtml(item) {
  if (!item.stamped) return;
  let html = item.html;
  const vis = item.visibility;
  const label =
    vis === "in-app"
      ? "in-app"
      : vis === "web-ref"
        ? "web/#ref"
        : vis === "retired"
          ? "retired"
          : "unknown";
  html = html.replace(/\s*<span class="visibility-badge"[^>]*>[\s\S]*?<\/span>/g, "");
  html = html.replace(
    /(<h1>[^<]+<\/h1>)/i,
    `$1\n          <span class="visibility-badge" data-vis="${vis}">${label}</span>`
  );

  // quality meta rows
  html = html.replace(/\s*<dt>Visibility<\/dt>\s*<dd>[^<]*<\/dd>/i, "");
  html = html.replace(/\s*<dt>Review<\/dt>\s*<dd>[^<]*<\/dd>/i, "");
  html = html.replace(/\s*<dt>Verified Orca<\/dt>\s*<dd>[^<]*<\/dd>/i, "");
  html = html.replace(/\s*<dt>Recommended pin<\/dt>\s*<dd>[^<]*<\/dd>/i, "");

  const extra = [
    `\n          <dt>Visibility</dt>\n          <dd>${label}</dd>`,
    `\n          <dt>Review</dt>\n          <dd>${item.review}</dd>`,
  ];
  if (item.verifiedOrca) {
    extra.push(`\n          <dt>Verified Orca</dt>\n          <dd>${item.verifiedOrca}</dd>`);
  }
  if (item.recommendedPin) {
    extra.push(`\n          <dt>Recommended pin</dt>\n          <dd>${item.recommendedPin}</dd>`);
  }
  if (/<dt>Status<\/dt>/i.test(html)) {
    html = html.replace(/<dt>Status<\/dt>/i, `${extra.join("")}\n          <dt>Status</dt>`);
  }

  fs.writeFileSync(item.file, html, "utf8");
}

const items = listItems();
for (const it of items) stampHtml(it);

const catalog = {
  generatedAt: new Date().toISOString(),
  host: "orca",
  domain: "orca.aiaaii.com",
  count: items.length,
  guides: {
    troubleshoot: "https://orca.aiaaii.com/guides/how-to-troubleshoot-orca-plugins/",
    addSource: "https://orca.aiaaii.com/guides/how-to-add-marketplace-source/",
    explicitRef: "https://orca.aiaaii.com/guides/fix-add-an-explicit-ref/",
    hiddenCategories: "https://orca.aiaaii.com/guides/fix-orca-categories-hidden/",
    zh: "https://orca.aiaaii.com/zh/",
  },
  items: items.map((i) => ({
    id: i.id,
    owner: i.owner,
    slug: i.slug,
    name: i.name,
    description: i.description,
    category: i.category,
    gitUrl: i.source,
    url: i.url,
    visibility: i.visibility,
    review: i.review,
    install: i.install,
    recommendedPin: i.recommendedPin,
    verifiedOrca: i.verifiedOrca,
    hiddenInUiHint: i.hiddenInUiHint,
    installSteps:
      i.install === "catalog-search"
        ? ["Settings → Plugins → search display name → Install"]
        : i.install === "marketplace-source"
          ? ["Settings → Plugins → Marketplace sources → add git URL"]
          : [
              "Prefer catalog search if listed on onorca.dev",
              "Else Marketplace sources or plugin git URL#ref",
            ],
  })),
};

fs.writeFileSync(path.join(ORCA, "catalog.json"), JSON.stringify(catalog, null, 2));

const llms = `# Orca Plugin Market (orca.aiaaii.com)

> Community install index for Orca (Stably ADE) plugins. Not affiliated with Stably / onorca.dev. Not Orca Note.

## What this site is for
- Web discovery + real install paths when the host All list hides a pack
- Marketplace Git sources vs plugin URL#ref
- Fix tree for #ref / source errors / reserved ids / hidden categories

## Key URLs
- Home: https://orca.aiaaii.com/
- zh-CN hub: https://orca.aiaaii.com/zh/
- Guides: https://orca.aiaaii.com/guides/
- Troubleshoot map: https://orca.aiaaii.com/guides/how-to-troubleshoot-orca-plugins/#error-map
- Changelog: https://orca.aiaaii.com/changelog/
- Machine catalog: https://orca.aiaaii.com/catalog.json

## Error → guide
- "Add an explicit #ref" → https://orca.aiaaii.com/guides/fix-add-an-explicit-ref/
- Marketplace source error → https://orca.aiaaii.com/guides/fix-marketplace-source-error/
- Reserved stablyai/orca- id → https://orca.aiaaii.com/guides/fix-reserved-plugin-id/
- Themes/skills missing from All → https://orca.aiaaii.com/guides/fix-orca-categories-hidden/
- Plugin not showing → https://orca.aiaaii.com/guides/fix-orca-plugin-not-showing/

## Catalog fields
Each catalog.json item includes: id, gitUrl, recommendedPin, category, visibility (in-app|web-ref|retired|unknown), review (default unreviewed), installSteps, hiddenInUiHint.

## Sister markets (same install-index idea)
- https://amp.aiaaii.com/
- https://droid.aiaaii.com/
- https://kimi.aiaaii.com/
- Glossary: https://orca.aiaaii.com/glossary/
`;

fs.writeFileSync(path.join(ORCA, "llms.txt"), llms);

// Stamp data-visibility on directory cards when known
{
  const indexFile = path.join(ITEMS, "index.html");
  let idx = fs.readFileSync(indexFile, "utf8");
  for (const it of items) {
    if (!it.stamped) continue;
    const href = `/items/${it.owner}/${it.slug}/`;
    const re = new RegExp(
      `(<a class="item" href="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*)(>)`,
      "i"
    );
    idx = idx.replace(re, (full, open, close) => {
      let o = open.replace(/\sdata-visibility="[^"]*"/i, "");
      return `${o} data-visibility="${it.visibility}"${close}`;
    });
  }
  fs.writeFileSync(indexFile, idx, "utf8");
}

console.log(
  JSON.stringify(
    {
      catalogItems: catalog.count,
      stamped: items.filter((i) => i.stamped).length,
      wrote: ["catalog.json", "llms.txt"],
    },
    null,
    2
  )
);
