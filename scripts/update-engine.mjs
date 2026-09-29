#!/usr/bin/env node
// Pull the locator engine from a SelectorsHub extension build into engine/vendor.
//
//   npm run engine:update -- /path/to/SelectorsHub            (unpacked extension folder)
//   npm run engine:update -- /path/to/SelectorsHub.zip        (zip from the store upload)
//
// Then run `npm test` before publishing.
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FILES = ["dom-inspector.js", "contentScript.js", "playwrightnew.js", "selector-tester.js"];
const VENDOR = join(dirname(fileURLToPath(import.meta.url)), "..", "engine", "vendor");

let src = process.argv[2];
if (!src) {
  console.error("Usage: npm run engine:update -- <extension folder or .zip>");
  process.exit(1);
}
src = resolve(src);
let tmp = null;
if (src.endsWith(".zip")) {
  tmp = mkdtempSync(join(tmpdir(), "shub-ext-"));
  try {
    execFileSync("unzip", ["-q", src, "-d", tmp]);
  } catch {
    execFileSync("tar", ["-xf", src, "-C", tmp]); // bsdtar (macOS, Windows 10+) reads zip
  }
  src = tmp;
}

function findManifest(dir, depth = 0) {
  if (existsSync(join(dir, "manifest.json")) && existsSync(join(dir, "content-script"))) return dir;
  if (depth > 3) return null;
  for (const d of readdirSync(dir)) {
    const p = join(dir, d);
    if (statSync(p).isDirectory()) {
      const f = findManifest(p, depth + 1);
      if (f) return f;
    }
  }
  return null;
}

const root = findManifest(src);
if (!root) {
  console.error("Could not find a SelectorsHub extension (manifest.json + content-script/) in " + src);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const listed = (manifest.content_scripts || []).flatMap((c) => c.js || []).map((f) => f.split("/").pop());
const extra = listed.filter((f) => !FILES.includes(f));
if (extra.length) console.warn(`Note: the manifest now also loads ${extra.join(", ")}; add it to VENDOR_FILES in src/engine.js if the engine needs it.`);
for (const f of FILES) {
  const from = join(root, "content-script", f);
  if (!existsSync(from)) {
    console.error(`Missing content-script/${f} in the extension build.`);
    process.exit(1);
  }
  cpSync(from, join(VENDOR, f));
}
writeFileSync(join(VENDOR, "VERSION.json"), JSON.stringify({ extension: manifest.name, extensionVersion: manifest.version, updatedAt: new Date().toISOString() }, null, 2) + "\n");
if (tmp) rmSync(tmp, { recursive: true, force: true });
console.log(`Engine updated from ${manifest.name} ${manifest.version}. Now run: npm test`);
