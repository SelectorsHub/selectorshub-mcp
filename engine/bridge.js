// SelectorsHub MCP bridge.
// Runs in the same scope as the vendored SelectorsHub content scripts and
// exposes a small, read-only API on window.__shub that the MCP server calls
// through Playwright. It reuses the extension's own generator functions
// (onInspectElementClick, generatePlaywrightSelectors, createAxesXpathForElement,
// getSelectorMatches, errorInSelector, fullFixSelector ...) unchanged.

var __SHUB_DEFAULT_ATTRS = ["", "withid", "withclass", "withname", "withplaceholder", "withtext"];

var __SHUB_INTERACTIVE =
  "a[href], button, input:not([type='hidden']), select, textarea, summary, option, label, " +
  "[role='button'], [role='link'], [role='checkbox'], [role='radio'], [role='tab'], [role='menuitem'], " +
  "[role='option'], [role='switch'], [role='combobox'], [role='textbox'], [role='searchbox'], " +
  "[role='slider'], [role='spinbutton'], [role='treeitem'], [role='gridcell'], " +
  "[onclick], [contenteditable=''], [contenteditable='true'], [tabindex]:not([tabindex='-1'])";

var __SHUB_KEY_ATTRS = [
  "id", "name", "type", "placeholder", "aria-label", "title", "alt", "value", "href", "role",
  "data-testid", "data-test", "data-test-id", "data-qa", "data-cy", "data-automation-id", "for", "class",
];

function __shubChooseAttrs(opts) {
  opts = opts || {};
  var exclude = opts.exclude || [];
  var a = __SHUB_DEFAULT_ATTRS.slice();
  a[0] = opts.preferredAttribute || "";
  ["id", "class", "name", "placeholder", "text"].forEach(function (k, i) {
    if (exclude.indexOf(k) !== -1) a[i + 1] = "without" + k;
  });
  return a;
}

function __shubCollectDeep(root, selector, out) {
  try {
    root.querySelectorAll(selector).forEach(function (el) { out.push(el); });
  } catch (e) {}
  try {
    root.querySelectorAll("*").forEach(function (el) {
      if (el.shadowRoot) __shubCollectDeep(el.shadowRoot, selector, out);
    });
  } catch (e) {}
  return out;
}

var __SHUB_SKIP = /^(html|head|body|script|style|noscript|template|meta|link|title|base)$/i;
function __shubAllElements() {
  return __shubCollectDeep(document, "*", []).filter(function (el) { return !__SHUB_SKIP.test(el.nodeName); });
}

function __shubVisible(el) {
  try {
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    var cs = el.ownerDocument.defaultView.getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  } catch (e) {
    return false;
  }
}

function __shubText(el, max) {
  var t = "";
  try {
    t = (el.innerText !== undefined ? el.innerText : el.textContent) || "";
  } catch (e) {}
  t = t.replace(/\s+/g, " ").trim();
  max = max || 80;
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function __shubSummary(el) {
  if (!el || el.nodeType !== 1) {
    return { tag: "#text", text: el ? String(el.textContent || "").trim().slice(0, 80) : "" };
  }
  var attrs = {};
  __SHUB_KEY_ATTRS.forEach(function (k) {
    var v = el.getAttribute(k);
    if (v !== null && v !== "") attrs[k] = v.length > 120 ? v.slice(0, 119) + "…" : v;
  });
  var role = "";
  var name = "";
  try { role = el.getAttribute("role") || getImplicitRole(el) || ""; } catch (e) {}
  try { name = getAccessibleName(el) || ""; } catch (e) {}
  var s = {
    tag: el.nodeName.toLowerCase(),
    role: role || undefined,
    name: name ? (name.length > 80 ? name.slice(0, 79) + "…" : name) : undefined,
    text: __shubText(el) || undefined,
    attributes: attrs,
    visible: __shubVisible(el),
  };
  if (el.disabled) s.disabled = true;
  if (isInShadow(el)) s.inShadowDom = true;
  if (el.nodeName.toLowerCase() === "svg" || isSVGChild(el)) s.isSvg = true;
  return s;
}

// The extension panel resets these before every inspection (dom-inspector.js
// onMessage listener); the generator relies on it.
function __shubResetState() {
  try { removePreviousInspectedElement(); } catch (e) {}
  try { referenceElement = ""; } catch (e) {}
  tempXpath = "";
  indexes = [];
  matchIndex = [];
}

// Does `locator` resolve (first match) to exactly `el`? Guards every generated
// locator so a recommendation can never point at a different element.
function __shubPointsTo(kind, locator, el) {
  try {
    var doc = el.ownerDocument;
    if (kind === "xpath") {
      var snap = doc.evaluate(locator, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return snap.snapshotLength === 1 && snap.snapshotItem(0) === el;
    }
    if (kind === "css") {
      var root = el.getRootNode();
      var list = root.querySelectorAll(locator.trim());
      return list.length === 1 && list[0] === el;
    }
    if (kind === "playwright") {
      // Verification runs inside the element's own frame, so drop iframe hops.
      var m = getSelectorMatches(__shubNormalizePw(locator).replace(/^page((?:\.frameLocator\((?:'[^']*'|"[^"]*"|`[^`]*`)\))+)/, "page"));
      return Array.isArray(m) && m.length === 1 && m[0] === el;
    }
  } catch (e) {}
  return false;
}

// Keep in sync with DYNAMIC_VALUE in src/codegen.js
var __SHUB_DYNAMIC = /\d{4,}|[a-f0-9]{10,}|^:r[0-9a-z]+:$|[-_:]\d{3,}$|(^|[-_])(ember|ext-gen|mui-|mat-input-|react-select-|headlessui-|radix-)[\w-]*\d/i;
var __SHUB_POSITIONAL = /\[\d+\]|\[position\(\)|\[last\(\)|^\/html|:nth-(child|of-type)|:(first|last)-child/;

function __shubDynamicLocator(loc) {
  if (!loc) return false;
  var re = /@(?:id|class|name|for)\s*=\s*(['"])(.*?)\1|\[(?:id|class|name|for)\*?=\s*(['"]?)(.*?)\3\]|#([A-Za-z_:][\w:-]*)/g;
  var m;
  while ((m = re.exec(loc))) {
    if (__SHUB_DYNAMIC.test(m[2] || m[4] || m[5] || "")) return true;
  }
  return false;
}

function __shubOwnText(el) {
  return Array.prototype.map.call(el.childNodes, function (n) { return n.nodeType === 3 ? n.textContent : ""; }).join(" ").replace(/\s+/g, " ").trim();
}

function __shubCssQuote(s) {
  return s.indexOf("'") === -1 ? "'" + s + "'" : '"' + s.replace(/"/g, '\\"') + '"';
}

// Container-aware locators: anchor the element to unique text in its nearest
// container (a product card, a table row, a form group), instead of position.
function __shubContextual(el) {
  if (!el || isInShadow(el)) return null;
  var doc = el.ownerDocument;
  var tag = el.nodeName.toLowerCase();
  if (tag === "svg" || isSVGChild(el)) return null;
  var text = __shubOwnText(el);
  var targetStep = "//" + tag;
  if (text && text.length <= 60) targetStep += "[normalize-space()=" + __shubXLit(text) + "]";
  else if (el.getAttribute("aria-label")) targetStep += "[@aria-label=" + __shubXLit(el.getAttribute("aria-label")) + "]";
  else if (el.getAttribute("type")) targetStep += "[@type=" + __shubXLit(el.getAttribute("type")) + "]";
  var role = "";
  var name = "";
  try { role = el.getAttribute("role") || getImplicitRole(el) || ""; } catch (e) {}
  try { name = getAccessibleName(el) || ""; } catch (e) {}
  var p = el.parentElement;
  for (var depth = 0; p && depth < 6 && p !== doc.body && p !== doc.documentElement; depth++, p = p.parentElement) {
    var cands = p.querySelectorAll("h1,h2,h3,h4,h5,h6,label,legend,strong,b,th,td,dt,a,span,p,div");
    for (var i = 0; i < cands.length && i < 60; i++) {
      var c = cands[i];
      if (c === el || c.contains(el) || el.contains(c)) continue;
      var t = __shubOwnText(c);
      if (t.length < 2 || t.length > 60 || t === text) continue;
      var anchor = "//" + c.nodeName.toLowerCase() + "[normalize-space()=" + __shubXLit(t) + "]";
      var n = 0;
      try { n = doc.evaluate(anchor, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength; } catch (e) {}
      if (n !== 1) continue;
      var out = {};
      var x = anchor + "/ancestor::" + p.nodeName.toLowerCase() + "[1]" + targetStep;
      if (__shubPointsTo("xpath", x, el)) out.xpath = { value: x, count: 1, verified: true, anchorText: t };
      // Playwright: container filtered by the anchor text, then the target by role/name.
      var cls = Array.prototype.filter.call(p.classList, function (k) { return !__SHUB_DYNAMIC.test(k) && !/^(css|sc|jsx|emotion)-/.test(k); })[0];
      var container = p.nodeName.toLowerCase() + (cls ? "." + cls.replace(/([^\w-])/g, "\\$1") : "");
      var inner = role && name && name.length <= 60
        ? ".getByRole(" + __shubCssQuote(role) + ", { name: " + __shubCssQuote(name) + ", exact: true })"
        : ".locator(" + __shubCssQuote(tag) + ")";
      out.playwright = { locator: "page.locator(" + __shubCssQuote(container) + ").filter({ hasText: " + __shubCssQuote(t) + " })" + inner, anchorText: t };
      if (out.xpath) return out;
    }
  }
  return null;
}

// The engine's Playwright parser rejects `backtick` strings that its own
// generator emits (e.g. smart-table XPath locators); requote them.
function __shubNormalizePw(s) {
  return String(s).replace(/`([^`]*)`/g, function (all, inner) {
    if (inner.indexOf('"') === -1) return '"' + inner + '"';
    if (inner.indexOf("'") === -1) return "'" + inner + "'";
    return all;
  });
}

function __shubVerify(pair, kind, el) {
  if (!pair) return pair;
  pair.verified = pair.count === 1 && __shubPointsTo(kind, pair.value, el);
  return pair;
}

function __shubPair(v) {
  if (!v || !Array.isArray(v) || v[0] === undefined || v[0] === "") return null;
  return { value: String(v[0]), count: Number(v[1]) || 0 };
}

function __shubClean(msg) {
  if (!msg) return "";
  return String(msg).replace(/^elementInfo-/, "").replace(/<[^>]+>/g, "").replace(/\s*Learn more\.\.\.\s*$/, "").trim();
}

function __shubKind(locator) {
  var s = String(locator).trim();
  var m;
  // Selenium Java/JS/C#: By.xpath("..."), By.cssSelector("..."), By.Id("..")
  m = s.match(/By\.(\w+)\(\s*(["'`])([\s\S]*)\2\s*\)\s*\)?\s*;?\s*$/);
  if (m) return __shubFromBy(m[1], m[3]);
  // Selenium Python: (By.XPATH, "...") / find_element(By.ID, "...")
  m = s.match(/By\.(\w+)\s*,\s*(r?["'])([\s\S]*)["']\s*\)?\s*;?\s*$/);
  if (m) return __shubFromBy(m[1], m[3]);
  // Cypress
  m = s.match(/^cy\.(get|xpath|contains)\(\s*(["'`])([\s\S]*)\2\s*\)/);
  if (m) {
    if (m[1] === "xpath") return { kind: "xpath", selector: m[3] };
    if (m[1] === "contains") return { kind: "text", selector: m[3] };
    return { kind: "css", selector: m[3] };
  }
  // WebdriverIO: $('...') / $$('...')
  m = s.match(/^\$\$?\(\s*(["'`])([\s\S]*)\1\s*\)$/);
  if (m) return __shubKind(m[2]);
  // Playwright (JS/TS/Python/Java/C#)
  if (/^(await\s+)?page\s*\./.test(s) || /^(frame|this\.page)\s*\./.test(s)) {
    return { kind: "playwright", selector: s.replace(/^await\s+/, "").replace(/^this\.page/, "page").replace(/;\s*$/, "") };
  }
  if (/^(getBy\w+|locator|frameLocator|get_by_\w+)\(/.test(s)) {
    return { kind: "playwright", selector: "page." + s.replace(/;\s*$/, "") };
  }
  if (/^(xpath=|\/\/|\/|\(|\.\/)/.test(s)) {
    return { kind: "xpath", selector: s.replace(/^xpath=/, "") };
  }
  if (/^css=/.test(s)) return { kind: "css", selector: s.slice(4) };
  if (/^text=/.test(s)) return { kind: "text", selector: s.slice(5) };
  return { kind: "css", selector: s };
}

function __shubFromBy(by, v) {
  var b = by.toLowerCase().replace(/_/g, "");
  if (b === "xpath") return { kind: "xpath", selector: v };
  if (b === "cssselector" || b === "css") return { kind: "css", selector: v };
  if (b === "id") return { kind: "css", selector: "[id=" + JSON.stringify(v) + "]", original: "id" };
  if (b === "name") return { kind: "css", selector: "[name=" + JSON.stringify(v) + "]", original: "name" };
  if (b === "classname") return { kind: "css", selector: "." + v.trim().split(/\s+/).join("."), original: "className" };
  if (b === "tagname") return { kind: "css", selector: v, original: "tagName" };
  if (b === "linktext") return { kind: "xpath", selector: "//a[normalize-space()=" + __shubXLit(v) + "]", original: "linkText" };
  if (b === "partiallinktext") return { kind: "xpath", selector: "//a[contains(normalize-space()," + __shubXLit(v) + ")]", original: "partialLinkText" };
  return { kind: "css", selector: v };
}

function __shubXLit(s) {
  if (s.indexOf("'") === -1) return "'" + s + "'";
  if (s.indexOf('"') === -1) return '"' + s + '"';
  return "concat('" + s.split("'").join("', \"'\", '") + "')";
}

window.__shub = {
  version: "1",
  refs: [],
  lastMatches: [],

  // List elements (interactive by default) across the document and open shadow roots.
  scan: function (opts) {
    opts = opts || {};
    var found = __shubCollectDeep(document, opts.selector || __SHUB_INTERACTIVE, []);
    if (opts.includeText) {
      __shubCollectDeep(document, "h1,h2,h3,h4,h5,h6,th,td,li,p,span,div,dt,dd", []).forEach(function (el) {
        var own = Array.prototype.some.call(el.childNodes, function (n) {
          return n.nodeType === 3 && n.textContent.trim().length > 1;
        });
        if (own) found.push(el);
      });
    }
    var seen = new Set();
    var out = [];
    var filter = (opts.filter || "").toLowerCase();
    for (var i = 0; i < found.length; i++) {
      var el = found[i];
      if (seen.has(el)) continue;
      seen.add(el);
      if (el.closest && el.closest("label") && el.nodeName === "LABEL" && el.querySelector("input,select,textarea")) {
        // keep: label wrapping an input is still a useful target
      }
      var s = __shubSummary(el);
      if (!opts.includeHidden && !s.visible && el.nodeName !== "OPTION") continue;
      if (filter) {
        var hay = [s.tag, s.role, s.name, s.text, JSON.stringify(s.attributes)].join(" ").toLowerCase();
        if (hay.indexOf(filter) === -1) continue;
      }
      var idx = this.refs.indexOf(el);
      if (idx === -1) { this.refs.push(el); idx = this.refs.length - 1; }
      s.i = idx;
      out.push(s);
      if (opts.limit && out.length >= opts.limit) break;
    }
    return out;
  },

  el: function (i) {
    var el = this.refs[i];
    return el && el.isConnected ? el : null;
  },

  remember: function (el) {
    var idx = this.refs.indexOf(el);
    if (idx === -1) { this.refs.push(el); idx = this.refs.length - 1; }
    return idx;
  },

  // Full SelectorsHub locator generation plus two refinements:
  //  - stable: if every locator leans on an auto-generated id/class, re-run the
  //    engine with its own "without id / without class" options;
  //  - contextual: if the best XPath is positional, anchor it to unique nearby text.
  generate: function (el, opts) {
    opts = opts || {};
    var res = this._generate(el, opts);
    if (res.error || res.shadowHosts.length) return res;
    var rel = res.xpath.relative;
    var relOk = rel && rel.verified;
    var cssOk = res.css && res.css.verified;
    var dyn = (!relOk || __shubDynamicLocator(rel.value)) && (!cssOk || __shubDynamicLocator(res.css.value));
    if (dyn && opts.stable !== false && !(opts.exclude || []).length) {
      var s2 = this._generate(el, { preferredAttribute: opts.preferredAttribute, exclude: ["id", "class"] });
      if (!s2.error) {
        res.stable = { xpath: s2.xpath.relative, indexedXpath: s2.xpath.indexed, css: s2.css };
      }
    }
    var best = (res.stable && res.stable.xpath && res.stable.xpath.verified && !__shubDynamicLocator(res.stable.xpath.value)) ? res.stable.xpath : relOk && !__shubDynamicLocator(rel.value) ? rel : null;
    if ((!best || __SHUB_POSITIONAL.test(best.value)) && opts.contextual !== false) {
      var c = __shubContextual(el);
      if (c) res.contextual = c;
    }
    return res;
  },

  _generate: function (el, opts) {
    opts = opts || {};
    if (!el || el.nodeType !== 1) return { error: "Element not found or no longer attached to the page." };
    __shubResetState();
    var chooseAttrs = __shubChooseAttrs(opts);
    _document = el.ownerDocument;
    el.setAttribute("sh-att", "1");
    el.setAttribute("shub-ins", "1");
    var info = {};
    var r;
    try {
      prepareListOfAttrText(el);
      info = elementTypeAndInfo(el) || {};
      r = onInspectElementClick(el, chooseAttrs, "generatorAndEditor");
    } finally {
      __shubResetState();
      el.removeAttribute("sh-att");
      el.removeAttribute("shub-ins");
    }
    r = r || [];
    var shadow = isInShadow(el);
    var res = {
      ref: this.remember(el),
      element: __shubSummary(el),
      elementType: info.elementType || "",
      notes: [],
      xpath: {},
      css: __shubPair(r[1]),
      selenium: {},
      playwright: [],
      testRigor: __shubPair(r[12]),
      shadowHosts: [],
    };
    var note = __shubClean(info.elementInfo);
    if (note) res.notes.push(note);
    if (shadow) {
      res.notes.push("Element is inside shadow DOM. XPath cannot pierce shadow roots; use CSS with the shadowHosts chain (Selenium) or Playwright locators (they pierce open shadow roots automatically).");
    } else {
      res.xpath.relative = __shubVerify(__shubPair(r[0]), "xpath", el);
      res.xpath.indexed = __shubVerify(__shubPair(r[2]), "xpath", el);
      res.xpath.absolute = __shubVerify(__shubPair(r[8]), "xpath", el);
    }
    if (res.css) res.css.value = res.css.value.trim();
    __shubVerify(res.css, "css", el);
    var sel = { id: r[3], name: r[4], className: r[5], linkText: r[6], partialLinkText: r[7], tagName: r[9] };
    var asCss = {
      id: function (v) { return "[id=" + JSON.stringify(v) + "]"; },
      name: function (v) { return "[name=" + JSON.stringify(v) + "]"; },
    };
    for (var k in sel) {
      var p = __shubPair(sel[k]);
      if (!p) continue;
      if (asCss[k] && p.count === 1) p.verified = __shubPointsTo("css", asCss[k](p.value), el);
      if (k === "linkText" && p.count === 1) p.verified = __shubPointsTo("xpath", "//a[normalize-space()=" + __shubXLit(p.value) + "]", el);
      res.selenium[k] = p;
    }
    if (Array.isArray(r[11]) && r[11].length) res.shadowHosts = r[11].slice().reverse();
    if (Array.isArray(r[13])) {
      res.playwright = r[13].map(function (x) {
        var o = { locator: x.selector, count: x.count };
        if (x.count === 1) o.verified = __shubPointsTo("playwright", x.selector, el);
        if (x.description) o.description = x.description;
        return o;
      });
    }
    if (opts.anchor) {
      res.xpath.axes = this.axes(opts.anchor, el, opts);
    }
    return res;
  },

  // SelectorsHub axes XPath: locate `target` relative to a stable `anchor` element.
  axes: function (anchor, target, opts) {
    if (!anchor || !target) return null;
    var chooseAttrs = __shubChooseAttrs(opts);
    _document = target.ownerDocument;
    chooseAttrsForXpath = chooseAttrs.toString().split(",");
    try {
      __shubResetState();
      assignParentElement(anchor);
      return __shubVerify(__shubPair(createAxesXpathForElement(target)), "xpath", target);
    } catch (e) {
      return { value: "", count: 0, error: String(e && e.message || e) };
    }
  },

  // Evaluate any locator (XPath, CSS, Playwright JS/Python/Java/C#, Selenium By.*, Cypress) and count matches.
  match: function (locator, opts) {
    opts = opts || {};
    var k = __shubKind(locator);
    var out = { kind: k.kind, normalized: k.selector, count: 0, matches: [] };
    if (k.original) out.seleniumStrategy = k.original;
    var els = [];
    _document = document;
    try {
      if (k.kind === "xpath") {
        var snap = document.evaluate(k.selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (var i = 0; i < snap.snapshotLength; i++) els.push(snap.snapshotItem(i));
      } else if (k.kind === "playwright") {
        var pw = getSelectorMatches(__shubNormalizePw(k.selector));
        if (typeof pw === "string") {
          out.error = pw.replace(/^Invalid Playwright Locator:\s*/, "Invalid Playwright locator: ");
          return out;
        }
        els = Array.from(pw || []);
      } else if (k.kind === "text") {
        var needle = k.selector.trim().toLowerCase();
        __shubAllElements().forEach(function (el) {
          var own = Array.prototype.map.call(el.childNodes, function (n) { return n.nodeType === 3 ? n.textContent : ""; }).join("").replace(/\s+/g, " ").trim().toLowerCase();
          if (own && own.indexOf(needle) !== -1) els.push(el);
        });
      } else {
        els = Array.from(document.querySelectorAll(k.selector));
        if (els.length === 0) {
          var deep = __shubCollectDeep(document, k.selector, []);
          if (deep.length) {
            els = deep;
            out.piercedShadowDom = true;
          }
        }
      }
    } catch (e) {
      var err = errorInSelector(k.kind === "css" ? "css" : "xpath", k.selector);
      out.error = (err && err.message) || (typeof err === "string" && err.trim() ? err : "") || String(e && e.message || e);
      try {
        var fixed = fullFixSelector(k.kind === "css" ? "css" : "xpath", k.selector);
        if (fixed && fixed !== k.selector) out.autoFixed = fixed;
      } catch (e2) {}
      return out;
    }
    // Deduplicate while preserving order
    els = els.filter(function (e, i) { return els.indexOf(e) === i; });
    this.lastMatches = els;
    out.count = els.length;
    var max = opts.maxMatches || 5;
    var self = this;
    out.matches = els.slice(0, max).map(function (e) {
      var s = __shubSummary(e);
      if (e && e.nodeType === 1) s.ref = self.remember(e);
      return s;
    });
    return out;
  },

  // Candidate elements for a broken locator: score every element on the page
  // against the attribute values / text fragments the old locator was using.
  candidates: function (tokens, opts) {
    opts = opts || {};
    var all = __shubAllElements();
    var scored = [];
    var toks = (tokens || []).map(function (t) { return String(t).toLowerCase(); }).filter(Boolean);
    if (!toks.length) return [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (/^(script|style|noscript|template|head|meta|link)$/i.test(el.nodeName)) continue;
      var own = Array.prototype.map.call(el.childNodes, function (n) { return n.nodeType === 3 ? n.textContent : ""; }).join(" ").replace(/\s+/g, " ").trim().toLowerCase();
      var attrStr = Array.prototype.map.call(el.attributes, function (a) { return a.name + "=" + a.value; }).join(" ").toLowerCase();
      var tag = el.nodeName.toLowerCase();
      var score = 0;
      toks.forEach(function (t) {
        if (t === tag) score += 1;
        else if (own && own === t) score += 6;
        else if (own && own.indexOf(t) !== -1) score += 3;
        else if (attrStr.indexOf("=" + t) !== -1 || attrStr.indexOf(" " + t) !== -1) score += 4;
        else if (attrStr.indexOf(t) !== -1) score += 2;
        else {
          // partial token overlap for renamed ids/classes like "submitBtn" -> "submit-button"
          var parts = t.split(/[^a-z0-9]+|(?=[A-Z])/).filter(function (p) { return p.length > 2; });
          parts.forEach(function (p) { if (attrStr.indexOf(p) !== -1 || own.indexOf(p) !== -1) score += 1; });
        }
      });
      if (score > 0) {
        if (!__shubVisible(el)) score -= 2;
        if (el.matches && el.matches(__SHUB_INTERACTIVE)) score += 1;
        scored.push({ el: el, score: score });
      }
    }
    // Prefer the deepest element when parent and child tie (text bubbles up).
    scored.sort(function (a, b) { return b.score - a.score; });
    var picked = [];
    for (var j = 0; j < scored.length && picked.length < (opts.limit || 5); j++) {
      var c = scored[j];
      var dominated = picked.some(function (p) { return p.el.contains(c.el) || c.el.contains(p.el); });
      if (dominated) {
        // replace an ancestor with a same-score descendant
        for (var q = 0; q < picked.length; q++) {
          if (picked[q].el.contains(c.el) && picked[q].score <= c.score) picked[q] = c;
        }
        continue;
      }
      picked.push(c);
    }
    var self = this;
    return picked.map(function (p) {
      var s = __shubSummary(p.el);
      s.ref = self.remember(p.el);
      s.score = p.score;
      return s;
    });
  },

  // Find elements by visible text, label, placeholder, aria-label, title or alt.
  findByText: function (text, opts) {
    opts = opts || {};
    var needle = String(text).replace(/\s+/g, " ").trim().toLowerCase();
    var exact = [];
    var partial = [];
    var all = __shubAllElements();
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (/^(script|style|noscript|template|option)$/i.test(el.nodeName)) continue;
      var vals = [];
      try { vals.push(getAccessibleName(el) || ""); } catch (e) {}
      ["placeholder", "aria-label", "title", "alt", "value", "data-testid"].forEach(function (a) {
        var v = el.getAttribute(a);
        if (v) vals.push(v);
      });
      var own = Array.prototype.map.call(el.childNodes, function (n) { return n.nodeType === 3 ? n.textContent : ""; }).join(" ");
      vals.push(own);
      vals = vals.map(function (v) { return String(v).replace(/\s+/g, " ").trim().toLowerCase(); }).filter(Boolean);
      if (vals.indexOf(needle) !== -1) exact.push(el);
      else if (vals.some(function (v) { return v.indexOf(needle) !== -1; })) partial.push(el);
    }
    var pick = function (list) {
      // Prefer interactive + visible, drop ancestors of other matches
      list = list.filter(function (e) { return !list.some(function (o) { return o !== e && e.contains(o); }); });
      list.sort(function (a, b) {
        var sa = (__shubVisible(a) ? 2 : 0) + (a.matches(__SHUB_INTERACTIVE) ? 1 : 0);
        var sb = (__shubVisible(b) ? 2 : 0) + (b.matches(__SHUB_INTERACTIVE) ? 1 : 0);
        return sb - sa;
      });
      return list;
    };
    var res = exact.length ? pick(exact) : pick(partial);
    // A <label> usually means "the field it labels"
    res = res.map(function (e) {
      if (e.nodeName === "LABEL") {
        var ctl = e.control || (e.htmlFor ? document.getElementById(e.htmlFor) : null) || e.querySelector("input,select,textarea");
        if (ctl) return ctl;
      }
      return e;
    });
    res = res.filter(function (e, i) { return res.indexOf(e) === i; });
    var self = this;
    return res.slice(0, opts.limit || 5).map(function (e) {
      var s = __shubSummary(e);
      s.ref = self.remember(e);
      return s;
    });
  },

  summary: function (el) {
    return __shubSummary(el);
  },

  // Convert Playwright locators written in Python/Java/C# (or legacy >> syntax) to JS.
  toJs: function (loc) {
    var s = String(loc).trim().replace(/^await\s+/, "").replace(/;\s*$/, "");
    try { s = convertCSharpToJavaScript(s); } catch (e) {}
    try { s = convertPythonToJavaScript(s); } catch (e) {}
    try { s = convertJavaToJavaScript(s); } catch (e) {}
    try { s = normalizeLegacyOperators(s); } catch (e) {}
    return __shubNormalizePw(s);
  },
};
