// Picks the best locator per framework from a SelectorsHub result and turns it
// into ready-to-paste code (snippets and page objects).

export const FRAMEWORKS = [
  "selenium-java",
  "selenium-python",
  "selenium-csharp",
  "selenium-js",
  "playwright-js",
  "playwright-ts",
  "playwright-python",
  "playwright-java",
  "playwright-csharp",
  "cypress",
  "webdriverio",
];

// Attribute values that look auto-generated (change between builds/sessions).
const DYNAMIC_VALUE = /\d{4,}|[a-f0-9]{10,}|^:r[0-9a-z]+:$|[-_:]\d{3,}$|(^|[-_])(ember|ext-gen|mui-|mat-input-|react-select-|headlessui-|radix-)[\w-]*\d/i;

export function isDynamicValue(v) {
  return typeof v === "string" && DYNAMIC_VALUE.test(v);
}

/** Does this locator depend on an id/class/name value that looks auto-generated? */
export function looksDynamic(locator) {
  if (!locator) return false;
  const vals = [];
  const re = /@(?:id|class|name|for)\s*=\s*(['"])(.*?)\1|\[(?:id|class|name|for)\*?=\s*(['"]?)(.*?)\3\]|#([A-Za-z_][\w-]*)|getByTestId\((['"])(.*?)\6\)/g;
  let m;
  while ((m = re.exec(locator))) vals.push(m[2] || m[4] || m[5] || m[7]);
  return vals.some(isDynamicValue);
}

const POSITIONAL = /\[\d+\]|\[position\(\)|\[last\(\)|^\/html|:nth-(child|of-type)|:(first|last)-child|\.(nth|first|last)\(/;
// ancestor::div[1] means "nearest container", not a position among siblings.
export const isPositional = (loc) => !!loc && POSITIONAL.test(loc.replace(/ancestor::[\w-]+\[1\]/g, "ancestor::_"));

// Unique AND verified to resolve to the inspected element itself.
const uniq = (p) => p && p.count === 1 && p.verified !== false && p.value;

const FRAME_PREFIX = /^page((?:\.frameLocator\((?:'[^']*'|"[^"]*"|`[^`]*`)\))+)/;

/** Normalise the iframe path of a Playwright locator to the given frame chain. */
export function withFrames(js, frames) {
  if (!js) return js;
  const bare = js.replace(FRAME_PREFIX, "page");
  if (!frames || !frames.length) return bare;
  return bare.replace(/^page/, "page" + frames.map((f) => `.frameLocator(${jsStr(f.css || "xpath=" + f.xpath)})`).join(""));
}

/**
 * Choose the most reliable locator for Selenium-style tools (By.*) and for Playwright.
 * Returns { selenium: {by, value}, playwright, css, xpath, warnings }.
 */
export function pickBest(g) {
  const warnings = [];
  const shadow = !!(g.shadowHosts && g.shadowHosts.length);
  const s = g.selenium || {};
  const x = g.xpath || {};
  let selenium = null;

  if (shadow) {
    if (uniq(g.css)) selenium = { by: "css", value: g.css.value };
    else if (g.css && g.css.value) {
      selenium = { by: "css", value: g.css.value };
      warnings.push(`CSS matches ${g.css.count} elements inside its shadow root.`);
    }
  } else {
    const st = g.stable || {};
    const cx = g.contextual || {};
    const order = [
      ["id", s.id && s.id.value, uniq(s.id)],
      ["xpath", x.relative && x.relative.value, uniq(x.relative)],
      ["css", g.css && g.css.value, uniq(g.css)],
      ["name", s.name && s.name.value, uniq(s.name)],
      ["linkText", s.linkText && s.linkText.value, uniq(s.linkText)],
      ["xpath", st.xpath && st.xpath.value, uniq(st.xpath)],
      ["css", st.css && st.css.value, uniq(st.css)],
      ["xpath", cx.xpath && cx.xpath.value, uniq(cx.xpath)],
      ["xpath", x.indexed && x.indexed.value, uniq(x.indexed)],
      ["xpath", st.indexedXpath && st.indexedXpath.value, uniq(st.indexedXpath)],
    ];
    const stableOk = ([by, value, ok]) => ok && !(by === "id" || by === "name" ? isDynamicValue(value) : looksDynamic(value));
    // First pass: stable and not positional. Second pass: stable but positional.
    let pick = order.find((o) => stableOk(o) && !isPositional(o[1])) || order.find(stableOk);
    if (pick) {
      selenium = { by: pick[0], value: pick[1] };
      if (isPositional(pick[1])) warnings.push("Best available Selenium locator depends on element position; it can break if items are added or reordered.");
    }
    if (!selenium) {
      const fallback = order.find((o) => o[2]);
      if (fallback) {
        selenium = { by: fallback[0], value: fallback[1] };
        warnings.push("Every unique locator depends on an id/class value that looks auto-generated; it may break between builds. Consider adding a data-testid.");
      } else if (x.absolute && x.absolute.value) {
        selenium = { by: "xpath", value: x.absolute.value };
        warnings.push("No unique relative locator found; falling back to absolute XPath, which breaks when the layout changes.");
      }
    }
  }

  // Playwright: a candidate already checked with real Playwright wins; otherwise the
  // first engine-verified candidate in preference order.
  let playwright = g.chosenPlaywright !== undefined ? g.chosenPlaywright : null;
  if (g.chosenPlaywright === undefined) {
    const c = playwrightCandidates(g, selenium);
    const engineOk = new Set((g.playwright || []).filter((p) => p.count === 1 && p.verified !== false).map((p) => withFrames(p.locator, g.frames)));
    playwright = c.find((l) => engineOk.has(l)) || c[0] || null;
  }

  if (!selenium && !playwright) warnings.push("SelectorsHub could not produce a verified unique locator for this element.");
  return {
    selenium,
    playwright: withFrames(playwright, g.frames),
    contextual: g.contextual ? { xpath: g.contextual.xpath && g.contextual.xpath.value, playwright: g.chosenContextual || undefined, anchorText: (g.contextual.xpath || {}).anchorText } : undefined,
    css: bestOf([g.css, (g.stable || {}).css]),
    xpath: shadow ? null : bestOf([x.relative, (g.stable || {}).xpath, (g.contextual || {}).xpath, x.indexed, (g.stable || {}).indexedXpath]),
    warnings,
  };
}

/**
 * Playwright locators to try, best first (frame prefixes applied):
 * stable engine locators, container-aware locator, positional engine locators,
 * then CSS/XPath fallbacks from the Selenium pick.
 */
export function playwrightCandidates(g, selenium) {
  const all = g.playwright || [];
  const stable = (p) => !looksDynamic(p.locator) && !isPositional(p.locator);
  // Engine-unique first; then the container-aware locator; then the other stable
  // suggestions (the engine's count can be off for chained locators).
  const good = all.filter((p) => stable(p) && p.count === 1).map((p) => p.locator);
  const rest = all.filter((p) => stable(p) && p.count !== 1).map((p) => p.locator);
  const positional = all.filter((p) => !looksDynamic(p.locator) && isPositional(p.locator)).map((p) => p.locator);
  const dynamic = all.filter((p) => looksDynamic(p.locator)).map((p) => p.locator);
  const out = [...good];
  if (g.contextual && g.contextual.playwright) out.push(g.contextual.playwright.locator);
  out.push(...rest.slice(0, 3), ...positional);
  const fb = [];
  const addXpath = (v) => v && fb.push(`page.locator(${jsStr((v.startsWith("(") ? "xpath=" : "") + v)})`);
  if (g.contextual && g.contextual.xpath) addXpath(g.contextual.xpath.value);
  if (selenium && selenium.by === "css") fb.push(`page.locator(${jsStr(selenium.value)})`);
  if (selenium && selenium.by === "xpath") addXpath(selenium.value);
  if (selenium && selenium.by === "id") fb.push(`page.locator(${jsStr("#" + cssIdent(selenium.value))})`);
  if (selenium && selenium.by === "name") fb.push(`page.locator(${jsStr(`[name="${selenium.value}"]`)})`);
  out.push(...fb, ...dynamic);
  return [...new Set(out)].map((l) => withFrames(l, g.frames));
}

/** First unique+verified locator, preferring stable and non-positional ones. */
function bestOf(pairs) {
  const ok = pairs.filter((p) => uniq(p));
  const pick = ok.find((p) => !looksDynamic(p.value) && !isPositional(p.value)) || ok.find((p) => !looksDynamic(p.value)) || ok[0];
  return pick ? pick.value : null;
}

// ---------- string helpers ----------
function jsStr(s) {
  if (!s.includes("'")) return `'${s}'`;
  if (!s.includes('"')) return `"${s}"`;
  return "`" + s.replace(/`/g, "\\`") + "`";
}
function dq(s) {
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
function csVerbatim(s) {
  return '@"' + String(s).replace(/"/g, '""') + '"';
}
function pyStr(s) {
  s = String(s);
  if (!s.includes('"')) return `"${s}"`;
  if (!s.includes("'")) return `'${s}'`;
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
function cssIdent(s) {
  return String(s).replace(/([^\w-])/g, "\\$1");
}

// ---------- Selenium ----------
const BY = {
  java: { id: "id", name: "name", css: "cssSelector", xpath: "xpath", linkText: "linkText" },
  js: { id: "id", name: "name", css: "css", xpath: "xpath", linkText: "linkText" },
  python: { id: "ID", name: "NAME", css: "CSS_SELECTOR", xpath: "XPATH", linkText: "LINK_TEXT" },
  csharp: { id: "Id", name: "Name", css: "CssSelector", xpath: "XPath", linkText: "LinkText" },
};

function seleniumBy(lang, sel) {
  const m = BY[lang][sel.by];
  if (lang === "python") return `By.${m}, ${pyStr(sel.value)}`;
  if (lang === "csharp") return `By.${m}(${sel.by === "xpath" || sel.by === "css" ? csVerbatim(sel.value) : dq(sel.value)})`;
  return `By.${m}(${dq(sel.value)})`;
}

function seleniumFind(lang, sel, root) {
  const r = root || "driver";
  if (lang === "java") return `${r}.findElement(${seleniumBy(lang, sel)})`;
  if (lang === "js") return `await ${r}.findElement(${seleniumBy(lang, sel)})`;
  if (lang === "python") return `${r}.find_element(${seleniumBy(lang, sel)})`;
  return `${r}.FindElement(${seleniumBy(lang, sel)})`;
}

function shadowRootOf(lang, expr) {
  if (lang === "java") return `${expr}.getShadowRoot()`;
  if (lang === "js") return `await (${expr}).getShadowRoot()`;
  if (lang === "python") return `${expr}.shadow_root`;
  return `${expr}.GetShadowRoot()`;
}

/** Full Selenium expression for an element, including iframe switches and shadow-root hops. */
function seleniumSnippet(lang, g, best) {
  const lines = [];
  if ((g.frames || []).length) {
    // Always start from the top document so repeated calls work.
    lines.push({ java: "driver.switchTo().defaultContent();", js: "await driver.switchTo().defaultContent();", python: "driver.switch_to.default_content()", csharp: "driver.SwitchTo().DefaultContent();" }[lang]);
  }
  for (const f of g.frames || []) {
    const fsel = f.xpath ? { by: "xpath", value: f.xpath } : { by: "css", value: f.css };
    if (lang === "java") lines.push(`driver.switchTo().frame(${seleniumFind(lang, fsel)});`);
    else if (lang === "js") lines.push(`await driver.switchTo().frame(${seleniumFind(lang, fsel)});`);
    else if (lang === "python") lines.push(`driver.switch_to.frame(${seleniumFind(lang, fsel)})`);
    else lines.push(`driver.SwitchTo().Frame(${seleniumFind(lang, fsel)});`);
  }
  let expr;
  if (g.shadowHosts && g.shadowHosts.length) {
    let root = "driver";
    for (const host of g.shadowHosts) {
      root = shadowRootOf(lang, seleniumFind(lang, { by: "css", value: host }, root));
    }
    expr = seleniumFind(lang, best.selenium, root);
  } else {
    expr = seleniumFind(lang, best.selenium);
  }
  lines.push(lang === "python" ? `element = ${expr}` : lang === "csharp" ? `var element = ${expr};` : lang === "java" ? `WebElement element = ${expr};` : `const element = ${expr};`);
  return lines.join("\n");
}

// ---------- Playwright (JS source -> other languages) ----------

/** Parse "page.a(x).b(y, {k: v})..." into [{name, args}] with simple JS literal args. */
export function parsePwChain(src) {
  let i = 0;
  const s = src.trim();
  const calls = [];
  const ws = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };
  const ident = () => {
    const m = /^[A-Za-z_$][\w$]*/.exec(s.slice(i));
    if (!m) throw new Error("ident");
    i += m[0].length;
    return m[0];
  };
  const str = () => {
    const q = s[i++];
    let out = "";
    while (i < s.length && s[i] !== q) {
      if (s[i] === "\\" && i + 1 < s.length) {
        out += s[i + 1];
        i += 2;
      } else out += s[i++];
    }
    if (s[i] !== q) throw new Error("unterminated string");
    i++;
    return { t: "str", v: out };
  };
  const regex = () => {
    i++;
    let out = "";
    while (i < s.length && s[i] !== "/") {
      if (s[i] === "\\") {
        out += s[i] + s[i + 1];
        i += 2;
      } else out += s[i++];
    }
    i++;
    const fm = /^[gimsuy]*/.exec(s.slice(i))[0];
    i += fm.length;
    return { t: "re", v: out, flags: fm };
  };
  const value = () => {
    ws();
    const c = s[i];
    if (c === "'" || c === '"' || c === "`") return str();
    if (c === "/") return regex();
    if (c === "{") return obj();
    const m = /^(true|false|-?\d+(\.\d+)?)/.exec(s.slice(i));
    if (m) {
      i += m[0].length;
      return m[1] === "true" || m[1] === "false" ? { t: "bool", v: m[1] === "true" } : { t: "num", v: Number(m[0]) };
    }
    throw new Error("value");
  };
  const obj = () => {
    i++;
    const o = {};
    ws();
    while (s[i] !== "}") {
      ws();
      const k = s[i] === "'" || s[i] === '"' ? str().v : ident();
      ws();
      if (s[i++] !== ":") throw new Error("colon");
      o[k] = value();
      ws();
      if (s[i] === ",") i++;
      ws();
    }
    i++;
    return { t: "obj", v: o };
  };
  ws();
  const root = ident();
  if (root !== "page") throw new Error("root");
  while (i < s.length) {
    ws();
    if (i >= s.length) break;
    if (s[i] !== ".") throw new Error("dot");
    i++;
    const name = ident();
    ws();
    const args = [];
    if (s[i] === "(") {
      i++;
      ws();
      while (s[i] !== ")") {
        args.push(value());
        ws();
        if (s[i] === ",") i++;
        ws();
      }
      i++;
      calls.push({ name, args, call: true });
    } else {
      calls.push({ name, args, call: false });
    }
  }
  return calls;
}

const snake = (n) => n.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const pascal = (n) => n[0].toUpperCase() + n.slice(1);

function pyVal(a) {
  if (a.t === "str") return pyStr(a.v);
  if (a.t === "bool") return a.v ? "True" : "False";
  if (a.t === "num") return String(a.v);
  if (a.t === "re") return `re.compile(${pyStr(a.v)}${a.flags.includes("i") ? ", re.IGNORECASE" : ""})`;
  throw new Error("pyVal");
}

export function pwToPython(src) {
  const calls = parsePwChain(src);
  let out = "page";
  for (const c of calls) {
    if (!c.call || ((c.name === "first" || c.name === "last") && c.args.length === 0)) {
      out += "." + snake(c.name);
      continue;
    }
    const args = [];
    for (const a of c.args) {
      if (a.t === "obj") for (const [k, v] of Object.entries(a.v)) args.push(`${snake(k)}=${pyVal(v)}`);
      else args.push(pyVal(a));
    }
    out += `.${snake(c.name)}(${args.join(", ")})`;
  }
  return out;
}

function javaVal(a) {
  if (a.t === "str") return dq(a.v);
  if (a.t === "bool") return String(a.v);
  if (a.t === "num") return String(a.v);
  if (a.t === "re") return `Pattern.compile(${dq(a.v)}${a.flags.includes("i") ? ", Pattern.CASE_INSENSITIVE" : ""})`;
  throw new Error("javaVal");
}

export function pwToJava(src) {
  const calls = parsePwChain(src);
  let out = "page";
  let recv = "Page";
  for (const c of calls) {
    if (!c.call) throw new Error("property");
    const args = [];
    let optsCls = null;
    c.args.forEach((a, idx) => {
      if (a.t === "obj") {
        optsCls = c.name === "filter" ? "Locator.FilterOptions" : `${recv}.${pascal(c.name)}Options`;
        let o = `new ${optsCls}()`;
        for (const [k, v] of Object.entries(a.v)) o += `.set${pascal(k)}(${javaVal(v)})`;
        args.push(o);
      } else if (c.name === "getByRole" && idx === 0 && a.t === "str") {
        args.push(`AriaRole.${a.v.toUpperCase()}`);
      } else args.push(javaVal(a));
    });
    out += `.${c.name}(${args.join(", ")})`;
    recv = c.name === "frameLocator" ? "FrameLocator" : "Locator";
  }
  return out;
}

function csVal(a) {
  if (a.t === "str") return dq(a.v);
  if (a.t === "bool") return a.v ? "true" : "false";
  if (a.t === "num") return String(a.v);
  if (a.t === "re") return `new Regex(${dq(a.v)}${a.flags.includes("i") ? ", RegexOptions.IgnoreCase" : ""})`;
  throw new Error("csVal");
}

export function pwToCSharp(src) {
  const calls = parsePwChain(src);
  let out = "page";
  for (const c of calls) {
    if (!c.call || ((c.name === "first" || c.name === "last") && c.args.length === 0)) {
      out += "." + pascal(c.name);
      continue;
    }
    const args = [];
    c.args.forEach((a, idx) => {
      if (a.t === "obj") {
        const parts = Object.entries(a.v).map(([k, v]) => {
          const key = pascal(k);
          if (k === "name" && v.t === "re") return `NameRegex = ${csVal(v)}`;
          if (k === "hasText" && v.t === "re") return `HasTextRegex = ${csVal(v)}`;
          return `${key} = ${csVal(v)}`;
        });
        args.push(`new() { ${parts.join(", ")} }`);
      } else if (c.name === "getByRole" && idx === 0 && a.t === "str") {
        args.push(`AriaRole.${pascal(a.v)}`);
      } else args.push(csVal(a));
    });
    out += `.${pascal(c.name)}(${args.join(", ")})`;
  }
  return out;
}

/** Playwright locator (JS form, frames included) converted to a target language; falls back to CSS/XPath. */
function playwrightIn(lang, g, best) {
  const js = withFrames(best.playwright, g.frames);
  if (lang === "js") return js;
  const convert = { python: pwToPython, java: pwToJava, csharp: pwToCSharp }[lang];
  try {
    return convert(js);
  } catch {
    const raw = best.css || (best.xpath ? "xpath=" + best.xpath : null);
    if (!raw) return null;
    const frames = (g.frames || []).map((f) => f.css || "xpath=" + f.xpath);
    const fl = { python: "frame_locator", java: "frameLocator", csharp: "FrameLocator" }[lang];
    const loc = { python: "locator", java: "locator", csharp: "Locator" }[lang];
    return "page" + frames.map((f) => `.${fl}(${dq(f)})`).join("") + `.${loc}(${dq(raw)})`;
  }
}

// ---------- Cypress / WebdriverIO ----------
function cypressSnippet(g, best) {
  const hosts = g.shadowHosts || [];
  const frames = g.frames || [];
  let prefix = "";
  if (frames.length) {
    // Cypress has no native iframe API; this is the common pattern (see cypress-iframe for a plugin).
    prefix = frames
      .map((f, i) => (i === 0 ? `cy.get(${jsStr(f.css || f.xpath)})` : `.find(${jsStr(f.css)})`) + `.its('0.contentDocument.body').should('not.be.empty').then(cy.wrap)`)
      .join("");
  }
  if (hosts.length) {
    const chain = hosts.map((h, i) => (i === 0 && !prefix ? `cy.get(${jsStr(h)})` : `.find(${jsStr(h)})`) + ".shadow()").join("");
    return `${prefix}${chain}.find(${jsStr(best.css || best.selenium.value)})`;
  }
  if (best.css) return prefix ? `${prefix}.find(${jsStr(best.css)})` : `cy.get(${jsStr(best.css)})`;
  if (best.xpath) return `${prefix || "cy"}.xpath(${jsStr(best.xpath)}) // requires the cypress-xpath plugin`;
  return `cy.get(${jsStr(best.selenium.value)})`;
}

function wdioSnippet(g, best) {
  const hosts = g.shadowHosts || [];
  const lines = [];
  if ((g.frames || []).length) lines.push("await browser.switchToFrame(null);");
  for (const f of g.frames || []) lines.push(`await browser.switchToFrame(await $(${jsStr(f.css || f.xpath)}));`);
  let expr;
  if (hosts.length) {
    expr = hosts.map((h, i) => (i === 0 ? `$(${jsStr(h)})` : `.shadow$(${jsStr(h)})`)).join("") + `.shadow$(${jsStr(best.css || best.selenium.value)})`;
  } else {
    const v = best.css || best.xpath || (best.selenium.by === "id" ? "#" + cssIdent(best.selenium.value) : best.selenium.value);
    expr = `$(${jsStr(v)})`;
  }
  lines.push(`const element = await ${expr};`);
  return lines.join("\n");
}

/** One ready-to-paste line (or a few) for the given framework. */
export function snippet(framework, g, best) {
  if (!best || (!best.selenium && !best.playwright)) return null;
  const [tool, lang] = framework.split("-");
  if (tool === "selenium") return best.selenium ? seleniumSnippet(lang, g, best) : null;
  if (tool === "playwright") {
    const l = lang === "ts" ? "js" : lang;
    const loc = best.playwright ? playwrightIn(l, g, best) : null;
    if (!loc) return null;
    if (l === "js") return `const element = ${loc};`;
    if (l === "python") return `element = ${loc}`;
    if (l === "java") return `Locator element = ${loc};`;
    return `var element = ${loc};`;
  }
  if (framework === "cypress") return cypressSnippet(g, best);
  if (framework === "webdriverio") return wdioSnippet(g, best);
  return null;
}

// ---------- Page objects ----------

function words(s) {
  return String(s || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
}

const SUFFIX = {
  button: "Button",
  a: "Link",
  input: "Input",
  textarea: "Input",
  select: "Dropdown",
  checkbox: "Checkbox",
  radio: "Radio",
  option: "Option",
  label: "Label",
  img: "Image",
};

/** Human-friendly member name for an element, e.g. "emailInput", "signInButton". */
export function memberName(g, taken) {
  const el = g.element || {};
  const a = el.attributes || {};
  const type = (a.type || "").toLowerCase();
  let suffix = SUFFIX[type === "checkbox" || type === "radio" ? type : el.tag] || (el.role ? pascal(el.role) : "Element");
  if (el.role === "button" && el.tag !== "button") suffix = "Button";
  if (el.role === "link") suffix = "Link";
  const source = el.name || a["aria-label"] || a.placeholder || el.text || a["data-testid"] || a.name || a.id || a.title || el.tag;
  let w = words(source).map((x) => x.toLowerCase());
  if (w.length && w[w.length - 1] === suffix.toLowerCase()) w.pop();
  if (!w.length) w = [el.tag || "element"];
  let base = w[0] + w.slice(1).map(pascal).join("") + suffix;
  if (/^\d/.test(base)) base = "el" + pascal(base);
  let name = base;
  let n = 2;
  while (taken.has(name)) name = base + n++;
  taken.add(name);
  return name;
}

const constName = (n) => n.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

export function pageObject(framework, className, items, meta = {}) {
  const taken = new Set();
  const members = items
    .map((g) => ({ g, best: g.best || pickBest(g) }))
    .filter((m) => m.best && (m.best.selenium || m.best.playwright))
    .map((m) => ({ ...m, name: memberName(m.g, taken) }));
  const header = `Generated by SelectorsHub MCP from ${meta.url || "the current page"}`;
  const [tool, lang] = framework.split("-");

  if (tool === "playwright") {
    const l = lang === "ts" ? "js" : lang;
    const loc = (m) => playwrightIn(l, m.g, m.best);
    if (lang === "ts") {
      return [
        `// ${header}`,
        `import { type Page, type Locator } from '@playwright/test';`,
        ``,
        `export class ${className} {`,
        `  readonly page: Page;`,
        ...members.map((m) => `  readonly ${m.name}: Locator;`),
        ``,
        `  constructor(page: Page) {`,
        `    this.page = page;`,
        ...members.map((m) => `    this.${m.name} = ${loc(m)};`),
        `  }`,
        `}`,
      ].join("\n");
    }
    if (lang === "js") {
      return [
        `// ${header}`,
        `export class ${className} {`,
        `  /** @param {import('@playwright/test').Page} page */`,
        `  constructor(page) {`,
        `    this.page = page;`,
        ...members.map((m) => `    this.${m.name} = ${loc(m)};`),
        `  }`,
        `}`,
      ].join("\n");
    }
    if (lang === "python") {
      const usesRe = members.some((m) => /re\.compile/.test(loc(m) || ""));
      return [
        `# ${header}`,
        ...(usesRe ? ["import re"] : []),
        `from playwright.sync_api import Page`,
        ``,
        ``,
        `class ${className}:`,
        `    def __init__(self, page: Page):`,
        `        self.page = page`,
        ...members.map((m) => `        self.${snake(m.name)} = ${loc(m)}`),
      ].join("\n");
    }
    if (lang === "java") {
      return [
        `// ${header}`,
        `import com.microsoft.playwright.*;`,
        `import com.microsoft.playwright.options.AriaRole;`,
        `import java.util.regex.Pattern;`,
        ``,
        `public class ${className} {`,
        `    private final Page page;`,
        ...members.map((m) => `    public final Locator ${m.name};`),
        ``,
        `    public ${className}(Page page) {`,
        `        this.page = page;`,
        ...members.map((m) => `        this.${m.name} = ${loc(m)};`),
        `    }`,
        `}`,
      ].join("\n");
    }
    return [
      `// ${header}`,
      `using Microsoft.Playwright;`,
      `using System.Text.RegularExpressions;`,
      ``,
      `public class ${className}`,
      `{`,
      `    private readonly IPage page;`,
      ...members.map((m) => `    public ILocator ${pascal(m.name)} => ${loc(m)};`),
      ``,
      `    public ${className}(IPage page) => this.page = page;`,
      `}`,
    ].join("\n");
  }

  if (tool === "selenium") {
    const simple = members.filter((m) => m.best.selenium && !(m.g.frames || []).length && !(m.g.shadowHosts || []).length);
    const complex = members.filter((m) => m.best.selenium && !simple.includes(m));
    const note = complex.length
      ? `Elements inside iframes or shadow DOM need a frame switch / shadow-root hop first; see the getter methods below.`
      : null;
    if (lang === "java") {
      return [
        `// ${header}`,
        `import org.openqa.selenium.*;`,
        ``,
        `public class ${className} {`,
        `    private final WebDriver driver;`,
        ``,
        ...simple.map((m) => `    public static final By ${constName(m.name)} = ${seleniumBy("java", m.best.selenium)};`),
        ``,
        `    public ${className}(WebDriver driver) {`,
        `        this.driver = driver;`,
        `    }`,
        ...simple.map((m) => `\n    public WebElement ${m.name}() {\n        return driver.findElement(${constName(m.name)});\n    }`),
        ...(note ? [`\n    // ${note}`] : []),
        ...complex.map((m) => {
          const body = seleniumSnippet("java", m.g, m.best).replace(/^WebElement element = /m, "return ");
          return `\n    public WebElement ${m.name}() {\n${indent(body, 8)}\n    }`;
        }),
        `}`,
      ].join("\n");
    }
    if (lang === "python") {
      return [
        `# ${header}`,
        `from selenium.webdriver.common.by import By`,
        ``,
        ``,
        `class ${className}:`,
        ...simple.map((m) => `    ${constName(m.name)} = (${seleniumBy("python", m.best.selenium)})`),
        ``,
        `    def __init__(self, driver):`,
        `        self.driver = driver`,
        ...simple.map((m) => `\n    def ${snake(m.name)}(self):\n        return self.driver.find_element(*self.${constName(m.name)})`),
        ...(note ? [`\n    # ${note}`] : []),
        ...complex.map((m) => {
          const body = seleniumSnippet("python", m.g, m.best).replace(/\bdriver\b/g, "self.driver").replace(/^element = /m, "return ");
          return `\n    def ${snake(m.name)}(self):\n${indent(body, 8)}`;
        }),
      ].join("\n");
    }
    if (lang === "csharp") {
      return [
        `// ${header}`,
        `using OpenQA.Selenium;`,
        ``,
        `public class ${className}`,
        `{`,
        `    private readonly IWebDriver driver;`,
        ``,
        ...simple.map((m) => `    public static readonly By ${pascal(m.name)}Locator = ${seleniumBy("csharp", m.best.selenium)};`),
        ``,
        `    public ${className}(IWebDriver driver) => this.driver = driver;`,
        ``,
        ...simple.map((m) => `    public IWebElement ${pascal(m.name)} => driver.FindElement(${pascal(m.name)}Locator);`),
        ...(note ? [`\n    // ${note}`] : []),
        ...complex.map((m) => {
          const body = seleniumSnippet("csharp", m.g, m.best).replace(/^var element = /m, "return ");
          return `\n    public IWebElement Get${pascal(m.name)}()\n    {\n${indent(body, 8)}\n    }`;
        }),
        `}`,
      ].join("\n");
    }
    // selenium-js
    return [
      `// ${header}`,
      `const { By } = require('selenium-webdriver');`,
      ``,
      `class ${className} {`,
      `  constructor(driver) {`,
      `    this.driver = driver;`,
      `  }`,
      ...simple.map((m) => `\n  static ${constName(m.name)} = ${seleniumBy("js", m.best.selenium)};\n  async ${m.name}() {\n    return this.driver.findElement(${className}.${constName(m.name)});\n  }`),
      ...(note ? [`\n  // ${note}`] : []),
      ...complex.map((m) => {
        const body = seleniumSnippet("js", m.g, m.best).replace(/\bdriver\b/g, "this.driver").replace(/^const element = /m, "return ");
        return `\n  async ${m.name}() {\n${indent(body, 4)}\n  }`;
      }),
      `}`,
      ``,
      `module.exports = { ${className} };`,
    ].join("\n");
  }

  if (framework === "cypress") {
    return [
      `// ${header}`,
      `export class ${className} {`,
      ...members.map((m) => `  ${m.name}() {\n    return ${cypressSnippet(m.g, m.best)};\n  }`),
      `}`,
    ].join("\n");
  }

  // webdriverio
  return [
    `// ${header}`,
    `export class ${className} {`,
    ...members.map((m) => {
      const s = wdioSnippet(m.g, m.best);
      const lines = s.split("\n");
      const last = lines.pop().replace(/^const element = await /, "return ").replace(/;$/, ";");
      return `  async ${m.name}() {\n${[...lines, last].map((l) => "    " + l).join("\n")}\n  }`;
    }),
    `}`,
  ].join("\n");
}

function indent(s, n) {
  const pad = " ".repeat(n);
  return s
    .split("\n")
    .map((l) => pad + l)
    .join("\n");
}
