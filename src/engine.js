// Loads the SelectorsHub engine (the extension's own content scripts, vendored
// unchanged in engine/vendor) plus the chrome.* shim and the MCP bridge, and
// injects them into page frames on demand.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "engine");

// Same load order as the extension manifest's content_scripts.
const VENDOR_FILES = ["dom-inspector.js", "contentScript.js", "playwrightnew.js", "selector-tester.js"];

let bundle = null;

export function engineBundle() {
  if (bundle) return bundle;
  const parts = [
    readFileSync(join(ENGINE_DIR, "shim.js"), "utf8"),
    ...VENDOR_FILES.map((f) => readFileSync(join(ENGINE_DIR, "vendor", f), "utf8")),
    readFileSync(join(ENGINE_DIR, "bridge.js"), "utf8"),
  ];
  // One function scope: engine globals stay private to the engine and never
  // collide with the page's own variables. Only window.__shub is exposed.
  bundle =
    "(function(){\n" +
    "if (window.__shub) return;\n" +
    "var console = { log: function(){}, warn: function(){}, error: function(){}, info: function(){} };\n" +
    parts.join("\n;\n") +
    "\nwindow.__shub.token = Math.random().toString(36).slice(2);\n" +
    "})()";
  return bundle;
}

/** Make sure the engine is loaded in this frame; returns the engine instance token. */
export async function ensureEngine(frame) {
  const token = await frame.evaluate(() => (window.__shub ? window.__shub.token : null)).catch(() => null);
  if (token) return token;
  await frame.evaluate(engineBundle());
  return frame.evaluate(() => window.__shub.token);
}
