/**
 * Copy shared favicon into each host site and inject <link rel="icon"> into HTML heads.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "sites/_template/favicon.svg");
const HOSTS = ["www", "amp", "orca", "droid", "kimi", "_template"];

const LINK_BLOCK = [
  `    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
  `    <link rel="alternate icon" href="/favicon.svg" />`,
].join("\n");

function walkHtml(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".wrangler") continue;
      walkHtml(p, out);
    } else if (name.isFile() && name.name.endsWith(".html")) {
      out.push(p);
    }
  }
  return out;
}

const svg = fs.readFileSync(SRC, "utf8");
let copied = 0;
let patched = 0;
let skipped = 0;

for (const host of HOSTS) {
  const dest = path.join(ROOT, "sites", host, "favicon.svg");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, svg, "utf8");
  copied++;

  const htmlFiles = walkHtml(path.join(ROOT, "sites", host));
  for (const file of htmlFiles) {
    let html = fs.readFileSync(file, "utf8");
    if (/rel=["']icon["']/i.test(html)) {
      skipped++;
      continue;
    }
    // Prefer after canonical, else after viewport/charset block, else after <head>
    let next;
    if (/<link rel="canonical"[^>]*>/i.test(html)) {
      next = html.replace(
        /(<link rel="canonical"[^>]*>)/i,
        `$1\n${LINK_BLOCK}`
      );
    } else if (/<meta name="viewport"[^>]*>/i.test(html)) {
      next = html.replace(
        /(<meta name="viewport"[^>]*>)/i,
        `$1\n${LINK_BLOCK}`
      );
    } else if (/<head[^>]*>/i.test(html)) {
      next = html.replace(/(<head[^>]*>)/i, `$1\n${LINK_BLOCK}`);
    } else {
      continue;
    }
    if (next !== html) {
      fs.writeFileSync(file, next, "utf8");
      patched++;
    }
  }
}

console.log(JSON.stringify({ copied, patched, skipped }, null, 2));
