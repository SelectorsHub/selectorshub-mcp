// Browser session: one long-lived browser + context shared by every tool call,
// so pages, logins and element refs survive between calls.
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ensureEngine } from "./engine.js";
import { homeDir } from "./paths.js";

export class Session {
  constructor(config) {
    this.config = config;
    this.context = null;
    this.browser = null;
    this.page = null;
    this.frameIds = new WeakMap();
    this.nextFrameId = 1;
    this.refs = new Map(); // "e12" -> { frame, i, token }
    this.refKeys = new Map(); // "fid:token:i" -> "e12"
    this.nextRef = 1;
  }

  async launchOptions() {
    const c = this.config;
    const opts = {
      headless: c.headless,
      bypassCSP: true,
      viewport: c.viewport || { width: 1366, height: 900 },
      ignoreHTTPSErrors: c.ignoreHttpsErrors,
    };
    if (c.executablePath) opts.executablePath = c.executablePath;
    else if (c.browser && c.browser !== "chromium") opts.channel = c.browser;
    return opts;
  }

  async start() {
    if (this.context) return;
    const opts = await this.launchOptions();
    const attempts = [];
    // Try the configured browser first, then fall back to whatever Chromium-family browser is installed.
    const channels = opts.executablePath ? [null] : [opts.channel, "chrome", "msedge", "chromium"].filter((v, i, a) => a.indexOf(v) === i);
    let lastErr;
    for (const ch of channels) {
      const o = { ...opts };
      if (ch && ch !== "chromium") o.channel = ch;
      else delete o.channel;
      try {
        if (this.config.isolated) {
          const { viewport, bypassCSP, ignoreHTTPSErrors, ...launch } = o;
          this.browser = await chromium.launch(launch);
          this.context = await this.browser.newContext({
            viewport,
            bypassCSP,
            ignoreHTTPSErrors,
            storageState: this.config.storageState && existsSync(this.config.storageState) ? this.config.storageState : undefined,
          });
        } else {
          const dir = this.config.userDataDir || join(homeDir(), "browser-profile");
          mkdirSync(dir, { recursive: true });
          this.context = await chromium.launchPersistentContext(dir, o);
        }
        break;
      } catch (e) {
        attempts.push(`${ch || o.executablePath}: ${String(e.message).split("\n")[0]}`);
        lastErr = e;
      }
    }
    if (!this.context) {
      const err = new Error(
        "Could not start a browser. Install Google Chrome or Microsoft Edge, or run `npx playwright install chromium`, " +
          "or point SELECTORSHUB_BROWSER_PATH at a Chromium-based browser.\n" + attempts.join("\n")
      );
      err.cause = lastErr;
      throw err;
    }
    this.context.on("page", (p) => {
      // Follow popups / new tabs the page opens.
      this.page = p;
    });
    this.context.on("close", () => {
      this.context = null;
      this.browser = null;
      this.page = null;
    });
    const pages = this.context.pages();
    this.page = pages[0] || (await this.context.newPage());
  }

  async getPage() {
    await this.start();
    if (!this.page || this.page.isClosed()) {
      const open = this.context.pages().filter((p) => !p.isClosed());
      this.page = open[open.length - 1] || (await this.context.newPage());
    }
    return this.page;
  }

  async navigate(url, waitUntil = "load") {
    const page = await this.getPage();
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = "https://" + url;
    const resp = await page.goto(url, { waitUntil, timeout: this.config.navigationTimeout });
    this.clearRefs();
    // Give client-side frameworks a moment to render.
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
    return resp;
  }

  frameId(frame) {
    let id = this.frameIds.get(frame);
    if (!id) {
      id = this.nextFrameId++;
      this.frameIds.set(frame, id);
    }
    return id;
  }

  /** Attached frames of the current page, main frame first. */
  async frames() {
    const page = await this.getPage();
    return page.frames().filter((f) => !f.isDetached());
  }

  async engine(frame) {
    return ensureEngine(frame);
  }

  makeRef(frame, i, token) {
    const key = `${this.frameId(frame)}:${token}:${i}`;
    let ref = this.refKeys.get(key);
    if (!ref) {
      ref = `e${this.nextRef++}`;
      this.refKeys.set(key, ref);
      this.refs.set(ref, { frame, i, token });
    }
    return ref;
  }

  clearRefs() {
    this.refs.clear();
    this.refKeys.clear();
  }

  /** Resolve a ref to its frame + in-page index, checking it is still valid. */
  async resolveRef(ref) {
    const r = this.refs.get(String(ref).trim());
    if (!r) throw new UserError(`Unknown element ref "${ref}". Call list_elements (or find the element with a locator) to get fresh refs.`);
    if (r.frame.isDetached()) throw new UserError(`Element ref "${ref}" belongs to a frame that no longer exists. Call list_elements again.`);
    const ok = await r.frame
      .evaluate(([t, i]) => !!(window.__shub && window.__shub.token === t && window.__shub.el(i)), [r.token, r.i])
      .catch(() => false);
    if (!ok) throw new UserError(`Element ref "${ref}" is stale (the page changed or reloaded). Call list_elements again.`);
    return r;
  }

  async close() {
    const ctx = this.context;
    const br = this.browser;
    this.context = null;
    this.browser = null;
    this.page = null;
    this.clearRefs();
    if (ctx) await ctx.close().catch(() => {});
    if (br) await br.close().catch(() => {});
  }
}

export class UserError extends Error {}
