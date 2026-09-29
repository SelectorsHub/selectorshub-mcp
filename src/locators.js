// High-level locator operations used by the MCP tools.
import { pickBest, snippet, pageObject, looksDynamic, withFrames, playwrightCandidates } from "./codegen.js";
import { pwMatch, pwPointsTo } from "./pw-eval.js";
import { UserError } from "./session.js";

const call = (frame, fn, arg) => frame.evaluate(fn, arg);

// Leading iframe hops of a Playwright locator in any language binding:
// page.frameLocator('#a').frame_locator("#b").FrameLocator(...)...
const PW_FRAME_HOP = /^\.(?:frameLocator|frame_locator|FrameLocator)\(\s*(['"`])((?:(?!\1).)*)\1\s*\)/;

function splitPlaywrightFrames(locator) {
  let s = String(locator).trim().replace(/^await\s+/, "");
  const m = /^(page|this\.page|self\.page|Page)\b/.exec(s);
  if (!m) return null;
  s = s.slice(m[0].length);
  const hops = [];
  let h;
  while ((h = PW_FRAME_HOP.exec(s))) {
    hops.push(h[2]);
    s = s.slice(h[0].length);
  }
  if (!hops.length) return null;
  return { hops, rest: "page" + s };
}

/** Follow frameLocator hops from the main frame (works for cross-origin frames too). */
async function followFrameHops(session, hops) {
  let frame = (await session.frames())[0];
  for (const sel of hops) {
    let next = null;
    for (const child of frame.childFrames()) {
      if (child.isDetached()) continue;
      const handle = await child.frameElement().catch(() => null);
      if (!handle) continue;
      const ok = await handle
        .evaluate((el, sel) => {
          try {
            if (sel.startsWith("xpath=") || sel.startsWith("//") || sel.startsWith("(")) {
              const x = sel.replace(/^xpath=/, "");
              const r = el.ownerDocument.evaluate(x, el.ownerDocument, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
              for (let i = 0; i < r.snapshotLength; i++) if (r.snapshotItem(i) === el) return true;
              return false;
            }
            return el.matches(sel.replace(/^css=/, ""));
          } catch (e) {
            return false;
          }
        }, sel)
        .catch(() => false);
      await handle.dispose().catch(() => {});
      if (ok) {
        next = child;
        break;
      }
    }
    if (!next) return null;
    frame = next;
  }
  return frame;
}

/** Frames to evaluate a locator in, and the locator text to use in each. */
async function locatorPlan(session, locator) {
  const split = splitPlaywrightFrames(locator);
  if (split) {
    const frame = await followFrameHops(session, split.hops);
    if (!frame) return { plan: [], missingFrame: split.hops };
    return { plan: [{ frame, locator: split.rest }], explicitFrames: true };
  }
  return { plan: (await session.frames()).map((frame) => ({ frame, locator })) };
}

function frameLabel(session, frame, main) {
  if (frame === main) return "main";
  const name = frame.name();
  return `iframe ${name ? `"${name}" ` : ""}(${frame.url().slice(0, 100)})`;
}

/** Locators for the <iframe> elements that lead to `frame`, outermost first. */
async function frameChain(session, frame) {
  const chain = [];
  let f = frame;
  while (f.parentFrame()) {
    const parent = f.parentFrame();
    const handle = await f.frameElement();
    await session.engine(parent);
    const g = await parent.evaluate((el) => window.__shub.generate(el, {}), handle);
    await handle.dispose().catch(() => {});
    const best = pickBest(g);
    chain.unshift({
      css: best.css,
      xpath: best.xpath || (g.xpath.absolute && g.xpath.absolute.value) || null,
      playwright: best.playwright,
      name: f.name() || undefined,
      url: f.url(),
    });
    f = parent;
  }
  return chain;
}

/**
 * Resolve { ref | locator | text } to a single element: { frame, i, token, ref, alternatives }.
 */
const PW_LIKE = /^(await\s+)?(page|this\.page|self\.page|Page)\s*\.|^(getBy\w+|get_by_\w+|locator|frameLocator|frame_locator)\(/;

/** Match a locator with the SelectorsHub engine in every frame it could apply to. */
async function engineFind(session, locator, max) {
  const frames = await session.frames();
  const main = frames[0];
  const out = { kind: undefined, total: 0, hits: [], perFrame: new Map() };
  const { plan, missingFrame, explicitFrames } = await locatorPlan(session, locator);
  if (missingFrame) {
    out.kind = "playwright";
    out.missingFrame = missingFrame;
    return out;
  }
  for (const { frame, locator: loc } of plan) {
    const token = await session.engine(frame).catch(() => null);
    if (!token) continue;
    const res = await call(frame, ([l, m]) => window.__shub.match(l, { maxMatches: m }), [loc, max]).catch((e) => ({ error: e.message }));
    out.kind = out.kind || res.kind;
    if (res.error) {
      if (frame === main || explicitFrames) {
        out.error = res.error;
        out.autoFixed = res.autoFixed;
        break;
      }
      continue;
    }
    if (res.piercedShadowDom) out.piercedShadowDom = true;
    if (res.count > 0) {
      out.total += res.count;
      out.perFrame.set(frame, res.count);
      for (const m of res.matches) if (m.ref !== undefined) out.hits.push({ frame, token, i: m.ref, summary: m });
    }
    if (out.kind === "playwright" && frame === main) break; // Playwright locators address frames themselves
  }
  return out;
}

/** Match a Playwright locator (any language binding) with real Playwright. Returns null if it cannot be parsed. */
async function playwrightFind(session, locator, max) {
  const page = await session.getPage();
  const main = (await session.frames())[0];
  await session.engine(main);
  let js = await call(main, ([l]) => window.__shub.toJs(l), [locator]);
  if (!/^page\./.test(js)) js = "page." + js.replace(/^(this|self)\.page\./, "");
  const r = await pwMatch(page, js, max);
  if (r.unsupported) return null;
  const out = { kind: "playwright", normalized: js, total: 0, hits: [], perFrame: new Map() };
  if (r.error) {
    out.error = r.error;
    return out;
  }
  out.total = r.count;
  for (const h of r.handles) {
    const frame = await h.ownerFrame();
    const token = frame ? await session.engine(frame).catch(() => null) : null;
    if (token) {
      const info = await frame.evaluate((el) => ({ s: window.__shub.summary(el), i: window.__shub.remember(el) }), h);
      out.hits.push({ frame, token, i: info.i, summary: info.s });
      out.perFrame.set(frame, (out.perFrame.get(frame) || 0) + 1);
    }
    await h.dispose().catch(() => {});
  }
  if (r.count > out.hits.length && out.hits.length) {
    // Attribute the rest to the frame of the first hit (Playwright counts within one frame).
    const f = out.hits[0].frame;
    out.perFrame.set(f, out.perFrame.get(f) + (r.count - out.hits.length));
  }
  return out;
}

async function findAll(session, locator, max = 5) {
  if (PW_LIKE.test(String(locator).trim())) {
    const r = await playwrightFind(session, locator, max);
    if (r) return r;
  }
  return engineFind(session, locator, max);
}

/**
 * Resolve { ref | locator | text } to a single element: { frame, i, token, ref, alternatives }.
 */
export async function resolveTarget(session, target) {
  if (target.ref) {
    const r = await session.resolveRef(target.ref);
    return { ...r, ref: target.ref, alternatives: [] };
  }
  const frames = await session.frames();
  const main = frames[0];
  if (target.locator) {
    const res = await findAll(session, target.locator, 10);
    if (res.missingFrame) throw new UserError(`No iframe matches ${res.missingFrame.map((f) => `frameLocator('${f}')`).join(".")} on the current page.`);
    if (res.error) throw new UserError(`Invalid locator: ${res.error}${res.autoFixed ? `\nDid you mean: ${res.autoFixed}` : ""}`);
    const hits = res.hits;
    if (!hits.length) throw new UserError(`Locator matched no elements: ${target.locator}\nTip: use fix_locator to find what it should point to now.`);
    const nth = target.nth ? Number(target.nth) : null;
    if (res.total > 1 && !nth) {
      const list = hits.slice(0, 10).map((h, k) => {
        const ref = session.makeRef(h.frame, h.i, h.token);
        return `  ${k + 1}. ${ref}  ${describe(h.summary)}${h.frame !== main ? "  [" + frameLabel(session, h.frame, main) + "]" : ""}`;
      });
      throw new UserError(`Locator matched ${res.total} elements. Pass "nth" (1-based) or use one of these refs:\n${list.join("\n")}`);
    }
    const h = hits[(nth || 1) - 1];
    if (!h) throw new UserError(`nth=${nth} is out of range; the locator matched ${res.total} elements (showing up to 10).`);
    return { frame: h.frame, i: h.i, token: h.token, ref: session.makeRef(h.frame, h.i, h.token), alternatives: [] };
  }
  if (target.text) {
    for (const frame of frames) {
      const token = await session.engine(frame).catch(() => null);
      if (!token) continue;
      const found = await call(frame, ([t]) => window.__shub.findByText(t, { limit: 6 }), [target.text]).catch(() => []);
      if (found.length) {
        const first = found[0];
        return {
          frame,
          i: first.ref,
          token,
          ref: session.makeRef(frame, first.ref, token),
          alternatives: found.slice(1).map((f) => ({ ref: session.makeRef(frame, f.ref, token), element: describe(f) })),
        };
      }
    }
    throw new UserError(`No element found with text, label, placeholder, aria-label or title matching "${target.text}".`);
  }
  throw new UserError('Specify the element with "ref" (from list_elements), "locator" (any XPath/CSS/Playwright/Selenium locator) or "text" (visible text or label).');
}

export function describe(s) {
  if (!s) return "";
  const a = s.attributes || {};
  const bits = [s.role && s.role !== s.tag ? `${s.tag}[${s.role}]` : s.tag];
  const label = s.name || s.text || a.placeholder || a["aria-label"] || a.title || a.alt;
  if (label) bits.push(JSON.stringify(label.length > 60 ? label.slice(0, 59) + "…" : label));
  for (const k of ["id", "name", "type", "data-testid", "href"]) if (a[k]) bits.push(`${k}=${a[k].length > 50 ? a[k].slice(0, 49) + "…" : a[k]}`);
  if (s.inShadowDom) bits.push("(shadow DOM)");
  if (s.isSvg) bits.push("(svg)");
  if (s.visible === false) bits.push("(hidden)");
  if (s.disabled) bits.push("(disabled)");
  return bits.join(" ");
}

async function generateAt(session, frame, i, opts) {
  const g = await call(frame, ([i, o]) => window.__shub.generate(window.__shub.el(i), o), [i, opts]);
  if (!g || g.error) throw new UserError(g ? g.error : "Element not found.");
  return g;
}

const elementHandle = (frame, i) => frame.evaluateHandle(([i]) => window.__shub.el(i), [i]);

/**
 * Check Playwright candidates with real Playwright and record the first one that
 * uniquely resolves to the element (g.chosenPlaywright). With `showN`, also
 * re-checks the first N engine suggestions so their counts are exact.
 */
async function verifyPlaywright(session, g, frame, i, { maxChecks = 6, showN = 0 } = {}) {
  const page = await session.getPage();
  const handle = await elementHandle(frame, i);
  try {
    const sel = pickBest({ ...g, chosenPlaywright: null }).selenium;
    g.chosenPlaywright = null;
    let checks = 0;
    for (const cand of playwrightCandidates(g, sel)) {
      if (checks++ >= maxChecks) break;
      const r = await pwPointsTo(page, cand, handle);
      if (r.verified) {
        g.chosenPlaywright = cand;
        break;
      }
    }
    if (g.contextual && g.contextual.playwright) {
      const c = withFrames(g.contextual.playwright.locator, g.frames);
      const r = c === g.chosenPlaywright ? { verified: true } : await pwPointsTo(page, c, handle);
      if (r.verified) g.chosenContextual = c;
    }
    for (const p of (g.playwright || []).slice(0, showN)) {
      const r = await pwPointsTo(page, withFrames(p.locator, g.frames), handle);
      if (r.count !== null) {
        p.count = r.count;
        p.verified = r.verified;
      }
    }
  } finally {
    await handle.dispose().catch(() => {});
  }
}

/** Full SelectorsHub locator set for one element. */
export async function generateLocators(session, target, opts = {}) {
  const r = await resolveTarget(session, target);
  const genOpts = { preferredAttribute: opts.preferredAttribute, exclude: opts.exclude };
  if (opts.anchor) {
    const a = await resolveTarget(session, opts.anchor);
    if (a.frame !== r.frame) throw new UserError("The anchor element must be in the same frame as the target element.");
    genOpts.anchorIndex = a.i;
  }
  let g;
  if (genOpts.anchorIndex !== undefined) {
    g = await call(
      r.frame,
      ([i, ai, o]) => {
        o.anchor = window.__shub.el(ai);
        return window.__shub.generate(window.__shub.el(i), o);
      },
      [r.i, genOpts.anchorIndex, genOpts]
    );
  } else {
    g = await generateAt(session, r.frame, r.i, genOpts);
  }
  g.ref = r.ref;
  g.frames = await frameChain(session, r.frame);
  await verifyPlaywright(session, g, r.frame, r.i, { maxChecks: 12, showN: opts.maxPlaywright ?? 8 });
  const best = pickBest(g);
  g.best = best;
  const out = shape(g, opts);
  if (r.alternatives && r.alternatives.length) out.otherMatchesForText = r.alternatives;
  return out;
}

function shape(g, opts = {}) {
  const best = g.best;
  const recommended = {};
  if (best.selenium) recommended.selenium = best.selenium;
  if (best.playwright) recommended.playwright = best.playwright;
  if (best.css) recommended.css = best.css;
  if (best.xpath) recommended.xpath = best.xpath;
  const notes = [...(g.notes || []), ...best.warnings];
  if (g.frames.length) {
    notes.push(`Element is inside ${g.frames.length === 1 ? "an iframe" : `${g.frames.length} nested iframes`}; switch into the frame(s) listed under "frames" first (the snippets already do this).`);
  }
  const out = {
    ref: g.ref,
    element: g.element,
    recommended,
    notes: notes.length ? notes : undefined,
    frames: g.frames.length ? g.frames : undefined,
    shadowHosts: g.shadowHosts && g.shadowHosts.length ? g.shadowHosts : undefined,
    contextual: best.contextual && (best.contextual.xpath || best.contextual.playwright) ? best.contextual : undefined,
    xpath: Object.keys(g.xpath || {}).length ? g.xpath : undefined,
    css: g.css || undefined,
    withoutGeneratedIds: g.stable || undefined,
    selenium: Object.keys(g.selenium || {}).length ? g.selenium : undefined,
    playwright: (g.playwright || []).slice(0, opts.maxPlaywright ?? 8).map((p) => ({ ...p, locator: withFrames(p.locator, g.frames) })),
    testRigor: g.testRigor || undefined,
  };
  const fws = opts.frameworks && opts.frameworks.length ? opts.frameworks : [];
  if (fws.length) {
    out.code = {};
    for (const fw of fws) {
      const s = snippet(fw, g, best);
      if (s) out.code[fw] = s;
    }
  }
  return out;
}

/** Interactive elements on the page (all frames, open shadow roots), each with a ref and best locators. */
export async function listElements(session, opts = {}) {
  const page = await session.getPage();
  const frames = await session.frames();
  const main = frames[0];
  const limit = opts.limit || 150;
  const rows = [];
  const skipped = [];
  for (const frame of frames) {
    if (rows.length >= limit) break;
    const token = await session.engine(frame).catch((e) => {
      skipped.push(`${frameLabel(session, frame, main)}: ${String(e.message).split("\n")[0]}`);
      return null;
    });
    if (!token) continue;
    const items = await call(
      frame,
      ([o]) => {
        const list = window.__shub.scan(o);
        if (!o.withLocators) return list.map((s) => ({ s }));
        return list.map((s) => {
          let g = null;
          try {
            g = window.__shub.generate(window.__shub.el(s.i), {});
          } catch (e) {}
          return { s, g };
        });
      },
      [{ filter: opts.filter, includeHidden: !!opts.includeHidden, includeText: !!opts.includeText, limit: limit - rows.length, withLocators: opts.withLocators !== false }]
    );
    const chain = frame === main || !items.length ? [] : await frameChain(session, frame);
    for (const it of items) {
      const ref = session.makeRef(frame, it.s.i, token);
      const row = { ref, element: it.s, frame: frame === main ? undefined : frameLabel(session, frame, main) };
      if (it.g && !it.g.error) {
        it.g.frames = chain;
        await verifyPlaywright(session, it.g, frame, it.s.i, { maxChecks: 4 }).catch(() => {});
        const best = pickBest(it.g);
        row.playwright = best.playwright;
        row.selenium = best.selenium;
        row.dynamic = best.warnings.length ? true : undefined;
      }
      rows.push(row);
    }
  }
  return { title: await page.title().catch(() => ""), url: page.url(), rows, skipped };
}

export function formatList(res) {
  const lines = [`Page: ${res.title || "(untitled)"} — ${res.url}`, `${res.rows.length} elements. Use a ref with generate_locators, validate_locator, page_action or generate_page_object.`, ""];
  let lastFrame;
  for (const r of res.rows) {
    if (r.frame !== lastFrame) {
      if (r.frame) lines.push(`--- inside ${r.frame} ---`);
      lastFrame = r.frame;
    }
    lines.push(`${r.ref}  ${describe(r.element)}`);
    if (r.playwright) lines.push(`      playwright: ${r.playwright}`);
    if (r.selenium) lines.push(`      selenium:   By.${r.selenium.by}: ${r.selenium.value}${r.dynamic ? "  ⚠ may be unstable" : ""}`);
  }
  if (res.skipped.length) lines.push("", "Frames that could not be read:", ...res.skipped.map((s) => "  " + s));
  return lines.join("\n");
}

/** Count matches for a locator in every frame and explain the result. */
export async function validateLocator(session, locator, opts = {}) {
  const main = (await session.frames())[0];
  const res = await findAll(session, locator, 5);
  const out = { locator, type: res.kind, matchCount: res.total, unique: res.total === 1 };
  if (res.normalized && res.normalized !== locator) out.normalized = res.normalized;
  if (res.missingFrame) {
    out.valid = true;
    out.notes = [`No iframe on the current page matches ${res.missingFrame.map((f) => `frameLocator('${f}')`).join(".")}.`];
    return out;
  }
  if (res.error) {
    out.valid = false;
    out.error = res.error;
    if (res.autoFixed) {
      out.autoFixed = res.autoFixed;
      const again = await validateLocator(session, res.autoFixed, opts);
      out.autoFixedMatchCount = again.matchCount;
    }
    return out;
  }
  out.valid = true;
  const groups = new Map();
  for (const h of res.hits) {
    if (!groups.has(h.frame)) groups.set(h.frame, []);
    groups.get(h.frame).push(h);
  }
  out.frames = [...res.perFrame.entries()].map(([frame, count]) => ({
    frame: frameLabel(session, frame, main),
    count,
    matches: (groups.get(frame) || []).map((h) => ({ ref: session.makeRef(h.frame, h.i, h.token), element: describe(h.summary) })),
  }));
  const notes = [];
  if (out.frames.some((f) => f.frame !== "main")) notes.push("Match is inside an iframe: Selenium must switch to that frame first; Playwright needs frameLocator().");
  if (res.piercedShadowDom) notes.push("Matched only by piercing shadow DOM. Works in Playwright and WebdriverIO, but Selenium needs getShadowRoot() on each host (use generate_locators for the full chain).");
  if (looksDynamic(locator)) notes.push("This locator uses an id/class value that looks auto-generated and may change between builds.");
  if (/^\/html(\[1\])?\/body/.test(locator)) notes.push("Absolute XPath breaks whenever the page layout changes; prefer a relative locator.");
  if (res.total === 0) notes.push("No matches. Use fix_locator to find the element this locator was meant for.");
  if (res.total > 1) notes.push("Not unique. generate_locators on the intended match (by ref) returns a unique locator.");
  if (notes.length) out.notes = notes;
  if (res.total > 1 && opts.suggest !== false && res.hits[0]) {
    const h = res.hits[0];
    const g = await generateLocators(session, { ref: session.makeRef(h.frame, h.i, h.token) }, { maxPlaywright: 0 }).catch(() => null);
    if (g) out.uniqueAlternativeForFirstMatch = { playwright: g.recommended.playwright, selenium: g.recommended.selenium };
  }
  return out;
}

function tokensFrom(locator, hint) {
  const toks = new Set();
  const add = (t) => {
    t = String(t || "").trim();
    if (t.length > 1 && t.length < 80) toks.add(t);
  };
  const s = String(locator || "");
  let m;
  const q = /(['"`])((?:(?!\1).)+)\1/g;
  while ((m = q.exec(s))) {
    const v = m[2];
    // A quoted XPath/CSS inside a Playwright or Selenium call: mine it recursively.
    if (/^(xpath=|css=|\/\/|\.\/\/|\()/.test(v) || /[\[\]#>]/.test(v)) {
      for (const t of tokensFrom(v.replace(/^(xpath=|css=)/, ""), "")) add(t);
    } else add(v);
  }
  const noQuotes = s.replace(q, " ");
  (noQuotes.match(/#[\w-]+/g) || []).forEach((x) => add(x.slice(1)));
  (noQuotes.match(/\.[A-Za-z_][\w-]*/g) || []).forEach((x) => {
    if (!/^\.(locator|getBy\w+|nth|first|last|filter|and|or|frameLocator|find_element|findElement|xpath|cssSelector|id|name|className)$/.test(x)) add(x.slice(1));
  });
  (noQuotes.match(/(^|\/|\s|\()([a-z][a-z0-9]*)(?=\[|$|\s|\/|\.|#|:)/gi) || []).forEach((x) => {
    const t = x.replace(/^[\/\s(]/, "");
    if (/^(input|button|a|select|textarea|span|div|label|li|td|img|svg|h[1-6])$/i.test(t)) add(t.toLowerCase());
  });
  if (hint) {
    add(hint);
    hint.split(/\s+/).filter((w) => w.length > 2).forEach(add);
  }
  return [...toks];
}

/** Repair a broken locator: fix syntax, disambiguate, or find where the element went. */
export async function fixLocator(session, locator, opts = {}) {
  const v = await validateLocator(session, locator, { suggest: false });
  const out = { locator, status: "", before: { valid: v.valid, matchCount: v.matchCount, error: v.error } };

  if (!v.valid) {
    if (v.autoFixed && v.autoFixedMatchCount > 0) {
      out.status = "syntax_fixed";
      out.fixed = v.autoFixed;
      out.explanation = `Syntax error: ${v.error}. Corrected locator matches ${v.autoFixedMatchCount} element(s).`;
      if (v.autoFixedMatchCount === 1) return out;
      locator = v.autoFixed;
    } else {
      out.status = "invalid";
      out.explanation = `Syntax error: ${v.error}${v.autoFixed ? `. Auto-correction gives ${v.autoFixed} but it matches nothing.` : ""}`;
    }
  }

  if (v.valid && v.matchCount === 1 && !opts.hint) {
    const f = v.frames[0];
    out.status = "ok";
    out.explanation = "Locator already matches exactly one element.";
    const g = await generateLocators(session, { ref: f.matches[0].ref }, { frameworks: opts.frameworks, maxPlaywright: 3 });
    if (looksDynamic(locator)) {
      out.status = "fragile";
      out.explanation = "Locator works today but depends on an auto-generated-looking value. Use the recommended locator instead.";
    }
    out.recommended = g.recommended;
    if (g.code) out.code = g.code;
    return out;
  }

  if (v.valid && v.matchCount > 1) {
    out.status = "ambiguous";
    out.explanation = `Locator matches ${v.matchCount} elements. Unique locators for each match are below; pick the one you meant.`;
    out.candidates = [];
    for (const f of v.frames) {
      for (const m of f.matches) {
        if (!m.ref) continue;
        const g = await generateLocators(session, { ref: m.ref }, { frameworks: opts.frameworks, maxPlaywright: 3 }).catch(() => null);
        if (g) out.candidates.push({ ref: g.ref, element: describe(g.element), recommended: g.recommended, code: g.code });
      }
    }
    return out;
  }

  // Zero matches (or unfixable syntax): look for the element by what the locator was targeting.
  const tokens = tokensFrom(locator, opts.hint);
  const frames = await session.frames();
  const found = [];
  for (const frame of frames) {
    const token = await session.engine(frame).catch(() => null);
    if (!token) continue;
    const c = await call(frame, ([t]) => window.__shub.candidates(t, { limit: 5 }), [tokens]).catch(() => []);
    for (const x of c) found.push({ frame, token, x });
  }
  found.sort((a, b) => b.x.score - a.x.score);
  out.searchedFor = tokens;
  if (!found.length) {
    out.status = out.status || "not_found";
    out.explanation = (out.explanation ? out.explanation + " " : "") + "No element on the current page resembles what this locator was targeting. Make sure you are on the right page/state (use open_page / page_action), or pass a hint describing the element.";
    return out;
  }
  out.status = out.status === "invalid" ? "invalid_replaced" : "replaced";
  out.explanation =
    (out.explanation ? out.explanation + " " : "Locator matches nothing on the current page. ") +
    "These elements best match what it was targeting (highest score first). Confirm the right one, then use its recommended locator.";
  out.candidates = [];
  for (const f of found.slice(0, opts.maxCandidates || 3)) {
    const ref = session.makeRef(f.frame, f.x.ref, f.token);
    const g = await generateLocators(session, { ref }, { frameworks: opts.frameworks, maxPlaywright: 3 }).catch(() => null);
    if (g) out.candidates.push({ ref, score: f.x.score, element: describe(g.element), recommended: g.recommended, code: g.code, notes: g.notes });
  }
  if (out.candidates[0]) out.fixed = out.candidates[0].recommended.playwright || (out.candidates[0].recommended.selenium || {}).value;
  return out;
}

/** Page object class for the page (all visible interactive elements, or the given refs). */
export async function generatePageObject(session, opts) {
  const page = await session.getPage();
  let refs = opts.refs && opts.refs.length ? opts.refs : null;
  if (!refs) {
    const list = await listElements(session, { filter: opts.filter, limit: opts.limit || 60, withLocators: false });
    refs = list.rows.filter((r) => r.element.tag !== "option" && r.element.tag !== "label").map((r) => r.ref);
  }
  const items = [];
  const chains = new Map();
  for (const ref of refs) {
    const r = await session.resolveRef(ref);
    const g = await generateAt(session, r.frame, r.i, { preferredAttribute: opts.preferredAttribute });
    if (!chains.has(r.frame)) chains.set(r.frame, await frameChain(session, r.frame));
    g.frames = chains.get(r.frame);
    await verifyPlaywright(session, g, r.frame, r.i, { maxChecks: 6 }).catch(() => {});
    g.best = pickBest(g);
    items.push(g);
  }
  const title = await page.title().catch(() => "");
  const className = opts.className || pageClassName(title, page.url());
  return { className, code: pageObject(opts.framework, className, items, { url: page.url() }), count: items.length };
}

function pageClassName(title, url) {
  let base = (title || "").split(/[|\-–—:]/)[0];
  if (!base.trim()) {
    try {
      base = new URL(url).pathname.split("/").filter(Boolean).pop() || new URL(url).hostname.split(".")[0];
    } catch {
      base = "";
    }
  }
  const w = base.replace(/[^A-Za-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 4);
  const name = w.map((x) => x[0].toUpperCase() + x.slice(1).toLowerCase()).join("") || "Home";
  return (/^\d/.test(name) ? "P" + name : name).replace(/Page$/, "") + "Page";
}

/** Perform a user action so the agent can reach the state it needs locators for. */
export async function pageAction(session, target, action, value) {
  const page = await session.getPage();
  if (action === "press" && !target) {
    await page.keyboard.press(value);
  } else if (action === "wait") {
    await page.waitForTimeout(Math.min(Number(value) || 1000, 30000));
  } else if (action === "back") {
    await page.goBack();
  } else if (action === "reload") {
    await page.reload();
  } else {
    const r = await resolveTarget(session, target);
    const handle = await r.frame.evaluateHandle(([i]) => window.__shub.el(i), [r.i]);
    const el = handle.asElement();
    if (!el) throw new UserError("Element is no longer on the page.");
    const t = { timeout: 10000 };
    if (action === "click") await el.click(t);
    else if (action === "dblclick") await el.dblclick(t);
    else if (action === "hover") await el.hover(t);
    else if (action === "fill") await el.fill(String(value ?? ""), t);
    else if (action === "type") await el.pressSequentially(String(value ?? ""), t);
    else if (action === "press") await el.press(String(value), t);
    else if (action === "check") await el.check(t);
    else if (action === "uncheck") await el.uncheck(t);
    else if (action === "select") await el.selectOption(String(value), t);
    else if (action === "focus") await el.focus();
    else throw new UserError(`Unknown action "${action}".`);
    await handle.dispose().catch(() => {});
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  return { url: page.url(), title: await page.title().catch(() => "") };
}

export async function screenshot(session, target) {
  const page = await session.getPage();
  if (!target) return page.screenshot({ type: "png" });
  const r = await resolveTarget(session, target);
  const handle = await r.frame.evaluateHandle(([i]) => window.__shub.el(i), [r.i]);
  const el = handle.asElement();
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.evaluate((e) => {
    e.__shubPrevOutline = e.style.outline;
    e.style.outline = "3px solid #f29a00";
    e.style.outlineOffset = "2px";
  });
  const box = await el.boundingBox();
  let buf;
  if (box) {
    const pad = 60;
    const vp = page.viewportSize() || { width: 1366, height: 900 };
    const clip = {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: Math.min(vp.width, box.width + pad * 2),
      height: Math.min(vp.height, box.height + pad * 2),
    };
    buf = await page.screenshot({ type: "png", clip }).catch(() => page.screenshot({ type: "png" }));
  } else {
    buf = await page.screenshot({ type: "png" });
  }
  await el.evaluate((e) => {
    e.style.outline = e.__shubPrevOutline || "";
    e.style.outlineOffset = "";
  });
  await handle.dispose().catch(() => {});
  return buf;
}
