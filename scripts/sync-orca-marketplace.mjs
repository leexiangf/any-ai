/**
 * Build + push marketplaces/aiaaii-orca → leexiangf/aiaaii-orca-marketplace
 *
 * Usage:
 *   node scripts/sync-orca-marketplace.mjs
 *   node scripts/sync-orca-marketplace.mjs --resolve-tags
 *   node scripts/sync-orca-marketplace.mjs --dry-run
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "marketplaces", "aiaaii-orca");
const REMOTE = "https://github.com/leexiangf/aiaaii-orca-marketplace.git";
const DRY = process.argv.includes("--dry-run");
const EXTRA = process.argv.filter((a) => a === "--resolve-tags");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || "").trim();
    throw new Error(`${cmd} ${args.join(" ")} failed: ${err}`);
  }
  return (r.stdout || "").trim();
}

function runNode(script, args = []) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

runNode(path.join(__dirname, "build-orca-marketplace.mjs"), EXTRA);

const required = ["orca-marketplace.json", "README.md"];
for (const f of required) {
  const p = path.join(SRC, f);
  if (!fs.existsSync(p)) {
    console.error("Missing", p);
    process.exit(1);
  }
}

if (DRY) {
  const mp = JSON.parse(fs.readFileSync(path.join(SRC, "orca-marketplace.json"), "utf8"));
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        remote: REMOTE,
        plugins: mp.plugins?.length ?? 0,
        files: fs.readdirSync(SRC),
      },
      null,
      2
    )
  );
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiaaii-orca-mp-"));
try {
  // Empty GitHub repos have no commits — clone may fail; fall back to init + remote.
  const clone = spawnSync("git", ["clone", "--depth", "1", REMOTE, tmp], {
    encoding: "utf8",
  });
  if (clone.status !== 0) {
    fs.mkdirSync(tmp, { recursive: true });
    run("git", ["-C", tmp, "init", "-b", "main"]);
    run("git", ["-C", tmp, "remote", "add", "origin", REMOTE]);
  }

  for (const name of ["README.md", "orca-marketplace.json", "pins-cache.json"]) {
    const from = path.join(SRC, name);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(tmp, name));
  }

  run("git", ["-C", tmp, "add", "README.md", "orca-marketplace.json"]);
  if (fs.existsSync(path.join(tmp, "pins-cache.json"))) {
    run("git", ["-C", tmp, "add", "pins-cache.json"]);
  }

  const status = run("git", ["-C", tmp, "status", "--porcelain"]);
  if (!status) {
    console.log(JSON.stringify({ ok: true, pushed: false, reason: "no changes" }, null, 2));
    process.exit(0);
  }

  const mp = JSON.parse(fs.readFileSync(path.join(SRC, "orca-marketplace.json"), "utf8"));
  const msg = `Update marketplace index (${mp.plugins?.length ?? 0} plugins)`;

  run("git", ["-C", tmp, "config", "user.email", "423078974@qq.com"]);
  run("git", ["-C", tmp, "config", "user.name", "leexiangf"]);
  run("git", ["-C", tmp, "commit", "-m", msg]);

  const branch = run("git", ["-C", tmp, "rev-parse", "--abbrev-ref", "HEAD"]) || "main";
  run("git", ["-C", tmp, "push", "-u", "origin", branch]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        pushed: true,
        remote: REMOTE,
        branch,
        plugins: mp.plugins?.length ?? 0,
      },
      null,
      2
    )
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
