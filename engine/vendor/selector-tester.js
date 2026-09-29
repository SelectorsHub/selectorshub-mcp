/**
 * SelectorsHub - Locator Tester (content-script side)
 * -------------------------------------------------------------
 * Runs in the extension's isolated content-script world, alongside
 * contentScript.js / playwrightnew.js, so it can reuse the existing
 * element-resolution engine (getSelectorMatches, querySelectorAllDeep).
 *
 * Responsibility:
 *   1. Resolve the real DOM element that a given locator points to.
 *   2. Perform a real "click" or "type / sendKeys" on that element so the
 *      user can validate the locator upfront before using it in a script.
 *
 * Entry points:
 *   - shubTestLocatorFromPanel(b64)  -> called by the DevTools panel through
 *        inspectedWindow.eval(...); returns a JSON string result.
 *   - shubHandleTestLocatorMessage(message) -> called by contentScript.js
 *        message router for the Side Panel; replies via runtime message.
 */

/* ------------------------------------------------------------------ *
 * Small utilities
 * ------------------------------------------------------------------ */

function shubTest_b64Decode(b64) {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch (e) {
    try { return atob(b64); } catch (_) { return ""; }
  }
}

function shubTest_cssEscapeValue(v) {
  return String(v == null ? "" : v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function shubTest_cssEscapeIdent(v) {
  if (window.CSS && typeof CSS.escape === "function") return CSS.escape(v);
  return String(v).replace(/([^a-zA-Z0-9_\-])/g, "\\$1");
}

/**
 * Build a valid XPath string literal, handling values that contain quotes.
 */
function shubTest_xpathLiteral(s) {
  s = String(s == null ? "" : s);
  if (s.indexOf('"') === -1) return '"' + s + '"';
  if (s.indexOf("'") === -1) return "'" + s + "'";
  var parts = s.split('"');
  var out = "concat(";
  for (var i = 0; i < parts.length; i++) {
    out += '"' + parts[i] + '"';
    if (i < parts.length - 1) out += ",'\"',";
  }
  return out + ")";
}

/**
 * Many rows show the locator wrapped in a driver/code command, e.g.
 *   By.xpath("//a[@id='x']")   document.querySelector("div.x")   $("div.x")
 *   driver.find_element(By.XPATH, "//...")   cy.get("div")
 * Extract the actual selector argument from such a wrapper. Raw locators
 * (that do not look like a function call) are returned unchanged.
 */
function shubTest_extractInner(value) {
  if (!value) return value;
  value = String(value).trim();

  var looksLikeCall = /^[A-Za-z_$][\w.$]*\s*\(/.test(value) && /\)\s*$/.test(value);
  if (!looksLikeCall) return value;

  var re = /(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  var last = null, m;
  while ((m = re.exec(value)) !== null) last = m;
  if (last) return last[2].replace(/\\(['"`])/g, "$1");
  return value;
}

/* ------------------------------------------------------------------ *
 * Element finders (deep: pierce open shadow DOM + same-origin frames)
 * ------------------------------------------------------------------ */

function shubTest_firstByCss(sel, allowFrameHop) {
  if (!sel) return null;
  try {
    if (typeof querySelectorAllDeep === "function") {
      var deep = querySelectorAllDeep(sel);
      if (deep && deep.length) return deep[0];
    } else {
      var el = document.querySelector(sel);
      if (el) return el;
    }
  } catch (e) {}
  // Only reach into child iframes for the single-frame (DevTools eval) path.
  // In the Side Panel path the message hits every frame, so each frame must
  // resolve against its own document to avoid duplicate matches/actions.
  if (allowFrameHop) return shubTest_searchFramesCss(sel);
  return null;
}

function shubTest_firstByXPath(xp, allowFrameHop) {
  if (!xp) return null;
  try {
    var r = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    if (r && r.singleNodeValue) return r.singleNodeValue;
  } catch (e) {}
  if (allowFrameHop) return shubTest_searchFramesXPath(xp);
  return null;
}

function shubTest_searchFramesCss(sel) {
  var frames = document.querySelectorAll("iframe, frame");
  for (var i = 0; i < frames.length; i++) {
    try {
      var d = frames[i].contentDocument;
      if (!d) continue;
      var el = d.querySelector(sel);
      if (el) return el;
    } catch (e) { /* cross-origin - skip */ }
  }
  return null;
}

function shubTest_searchFramesXPath(xp) {
  var frames = document.querySelectorAll("iframe, frame");
  for (var i = 0; i < frames.length; i++) {
    try {
      var d = frames[i].contentDocument;
      if (!d) continue;
      var r = d.evaluate(xp, d, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (r && r.singleNodeValue) return r.singleNodeValue;
    } catch (e) { /* cross-origin - skip */ }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Resolve a locator (by command type) to a single DOM element
 * ------------------------------------------------------------------ */

function shubResolveTestElement(command, value, allowFrameHop) {
  command = String(command || "").toLowerCase();

  // Search-box locator: the user typed a raw XPath / Playwright / CSS selector.
  // Mirror SelectorsHub's own detection (see contentScript.js search handling):
  //   starts with "/"      -> XPath
  //   starts with "page."  -> Playwright
  //   otherwise            -> CSS, with a Playwright-wrapped fallback (shadow DOM)
  if (command === "searchbox" || command === "auto") {
    var v = String(value == null ? "" : value).trim().replace(/^await\s+/i, "");
    if (!v) return null;

    if (v.charAt(0) === "/") return shubTest_firstByXPath(v, allowFrameHop);

    if (v.slice(0, 5).toLowerCase() === "page.") {
      // Playwright's page context is the top frame - resolve only there.
      if (window.top !== window.self) return null;
      try {
        var pwEls = (typeof getSelectorMatches === "function") ? getSelectorMatches(v) : [];
        return (Array.isArray(pwEls) && pwEls.length) ? pwEls[0] : null;
      } catch (e) { return null; }
    }

    var cssEl = shubTest_firstByCss(v, allowFrameHop);
    if (cssEl) return cssEl;
    try {
      var wrapped = 'page.locator("' + v.replace(/"/g, "'") + '")';
      var els = (typeof getSelectorMatches === "function") ? getSelectorMatches(wrapped) : [];
      return (Array.isArray(els) && els.length) ? els[0] : null;
    } catch (e) { return null; }
  }

  var raw = shubTest_extractInner(value);

  // Playwright locators go through the existing Playwright engine. Playwright's
  // page context is the top frame (frameLocator steps into child frames from
  // there), so resolve only in the top frame to avoid duplicate matches/actions
  // when the message is delivered to every frame (Side Panel path).
  if (command === "playwright" || command === "pwselector") {
    if (window.top !== window.self) return null;
    try {
      var els = (typeof getSelectorMatches === "function") ? getSelectorMatches(value) : [];
      return (Array.isArray(els) && els.length) ? els[0] : null;
    } catch (e) { return null; }
  }

  // XPath family
  if (command.indexOf("xpath") !== -1) {
    return shubTest_firstByXPath(raw, allowFrameHop);
  }

  switch (command) {
    case "cssselector":
    case "css":
    case "jspath":
    case "jquery":
      return shubTest_firstByCss(raw, allowFrameHop);

    case "id":
      return shubTest_firstByCss('[id="' + shubTest_cssEscapeValue(raw) + '"]', allowFrameHop) ||
             (document.getElementById ? document.getElementById(raw) : null);

    case "name":
      return shubTest_firstByCss('[name="' + shubTest_cssEscapeValue(raw) + '"]', allowFrameHop);

    case "classname": {
      var parts = String(raw).trim().split(/\s+/).filter(Boolean).map(shubTest_cssEscapeIdent);
      return parts.length ? shubTest_firstByCss("." + parts.join("."), allowFrameHop) : null;
    }

    case "tagname":
      return shubTest_firstByCss(String(raw).trim(), allowFrameHop);

    case "linktext":
      return shubTest_firstByXPath("//*[normalize-space(.)=" + shubTest_xpathLiteral(raw) + "]", allowFrameHop);

    case "partiallinktext":
      return shubTest_firstByXPath("//*[contains(normalize-space(.)," + shubTest_xpathLiteral(raw) + ")]", allowFrameHop);

    case "testrigorpath":
      return "__UNSUPPORTED__";

    default:
      // Best-effort: if it starts like an xpath, treat as xpath, else css.
      if (/^\.?\/\/?/.test(raw)) return shubTest_firstByXPath(raw, allowFrameHop);
      return shubTest_firstByCss(raw, allowFrameHop);
  }
}

/* ------------------------------------------------------------------ *
 * Field classification + value setting
 * ------------------------------------------------------------------ */

function shubTest_isDesignModeEditable(el) {
  try {
    var doc = el && el.ownerDocument;
    return !!(doc && typeof doc.designMode === "string" && doc.designMode.toLowerCase() === "on");
  } catch (e) {
    return false;
  }
}

function shubTest_classifyField(el) {
  var tag = (el.tagName || "").toLowerCase();

  if (tag === "textarea") return { typable: true, numeric: false, kind: "textarea" };
  if (el.isContentEditable) return { typable: true, numeric: false, kind: "contenteditable" };

  if (tag === "input") {
    var type = (el.getAttribute("type") || "text").toLowerCase();
    var nonTypable = ["button", "submit", "reset", "checkbox", "radio", "file", "image", "range", "color", "hidden"];
    if (nonTypable.indexOf(type) !== -1) return { typable: false, numeric: false, kind: type };

    var numeric = (type === "number" || type === "tel");
    var im = (el.getAttribute("inputmode") || "").toLowerCase();
    if (im === "numeric" || im === "decimal" || im === "tel") numeric = true;
    return { typable: true, numeric: numeric, kind: type };
  }

  // Not an <input>/<textarea>/isContentEditable element, but still typable:
  //   - role="textbox" widgets (ARIA text inputs built on a div/span)
  //   - documents put into designMode "on" (classic WYSIWYG editor iframes),
  //     which don't reliably report isContentEditable on their body.
  var role = "";
  try { role = (el.getAttribute("role") || "").toLowerCase(); } catch (e) {}
  var designMode = shubTest_isDesignModeEditable(el);
  if (role === "textbox" || designMode) {
    return { typable: true, numeric: false, kind: "editable", designMode: designMode };
  }

  return { typable: false, numeric: false, kind: tag };
}

function shubTest_fireInput(el) {
  try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {}
  try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {}
  try { el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true })); } catch (e) {}
}

/**
 * Set the field value using the native prototype setter so frameworks
 * such as React (which track the value descriptor) still register it.
 */
function shubTest_setValue(el, text, info) {
  if (info.kind === "contenteditable" || info.kind === "editable") {
    try { el.focus({ preventScroll: true }); } catch (e) {}

    var done = false;
    // For designMode WYSIWYG iframes, insertText through the document command
    // API registers the change with the editor model; textContent alone often
    // won't. Plain contenteditable/role="textbox" fall back to textContent.
    if (info.designMode) {
      try {
        var doc = el.ownerDocument || document;
        if (doc && typeof doc.execCommand === "function") {
          try { doc.execCommand("selectAll", false, null); } catch (e) {}
          done = doc.execCommand("insertText", false, text);
        }
      } catch (e) { done = false; }
    }

    if (!done) {
      try { el.textContent = text; } catch (e) {}
    }
    shubTest_fireInput(el);
    return;
  }

  try { el.focus({ preventScroll: true }); } catch (e) {}

  var proto = (info.kind === "textarea")
    ? (window.HTMLTextAreaElement && HTMLTextAreaElement.prototype)
    : (window.HTMLInputElement && HTMLInputElement.prototype);

  var setter = null;
  try { setter = Object.getOwnPropertyDescriptor(proto, "value").set; } catch (e) {}

  try {
    if (setter) setter.call(el, text);
    else el.value = text;
  } catch (e) {
    try { el.value = text; } catch (_) {}
  }

  shubTest_fireInput(el);
}

/* ------------------------------------------------------------------ *
 * Visual feedback on the target element
 * ------------------------------------------------------------------ */

function shubTest_flash(el) {
  try {
    var prevOutline = el.style.outline;
    var prevOffset = el.style.outlineOffset;
    var prevTransition = el.style.transition;
    el.style.transition = "outline 0.1s ease";
    el.style.outline = "2px solid #f29a00";
    el.style.outlineOffset = "1px";
    setTimeout(function () {
      try {
        el.style.outline = prevOutline;
        el.style.outlineOffset = prevOffset;
        el.style.transition = prevTransition;
      } catch (e) {}
    }, 1200);
  } catch (e) {}
}

function shubTest_fireMouse(el) {
  ["mouseover", "mousedown", "mouseup"].forEach(function (t) {
    try {
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
    } catch (e) {}
  });
}

/**
 * Dispatch a realistic hover sequence. Note: synthetic events cannot trigger
 * the CSS :hover pseudo-class, so pure-CSS dropdowns won't visually open, but
 * JS-driven hover handlers (onMouseEnter, jQuery .hover(), etc.) will fire.
 */
function shubTest_fireHover(el) {
  var seq = [
    ["pointerover", true],
    ["mouseover", true],
    ["pointerenter", false],
    ["mouseenter", false],
    ["pointermove", true],
    ["mousemove", true]
  ];
  seq.forEach(function (pair) {
    var type = pair[0];
    var opts = { bubbles: pair[1], cancelable: true, view: window };
    try {
      var usePointer = type.indexOf("pointer") === 0 && window.PointerEvent;
      var ev = usePointer ? new PointerEvent(type, opts) : new MouseEvent(type, opts);
      el.dispatchEvent(ev);
    } catch (e) {}
  });
}

/* ------------------------------------------------------------------ *
 * Perform the requested action
 * ------------------------------------------------------------------ */

/**
 * Human-readable element name, reusing SelectorsHub's own createSelectorName()
 * (defined in contentScript.js, same isolated world). Falls back to the tag
 * name. Kept short and single-line for the feedback toast.
 */
function shubTest_friendlyName(el, tag) {
  var name = "";
  try {
    if (typeof createSelectorName === "function") {
      name = createSelectorName(el);
    }
  } catch (e) {}
  name = (name == null ? "" : String(name)).replace(/\s+/g, " ").trim();
  if (!name) return tag || "element";
  if (name.length > 40) name = name.slice(0, 40).trim() + "\u2026";
  return name;
}

function shubPerformTestAction(el, actionType) {
  var tag = (el.tagName || "").toLowerCase();
  var name = shubTest_friendlyName(el, tag);

  try { el.scrollIntoView({ block: "center", inline: "center" }); } catch (e) {}
  shubTest_flash(el);

  if (actionType === "click") {
    try { if (typeof el.focus === "function") el.focus({ preventScroll: true }); } catch (e) {}
    shubTest_fireMouse(el);
    try { if (typeof el.click === "function") el.click(); } catch (e) {}
    return { status: "clicked", tag: tag, name: name };
  }

  if (actionType === "hover") {
    shubTest_fireHover(el);
    return { status: "hovered", tag: tag, name: name };
  }

  // type / sendKeys
  var info = shubTest_classifyField(el);
  if (!info.typable) {
    return { status: "nottypable", tag: tag, name: name, fieldKind: info.kind };
  }
  var text = info.numeric ? "123456" : "selectorshub";
  shubTest_setValue(el, text, info);
  return { status: "typed", tag: tag, name: name, value: text, numeric: info.numeric };
}

/* ------------------------------------------------------------------ *
 * Core runner + entry points
 * ------------------------------------------------------------------ */

function shubRunLocatorTest(payload) {
  payload = payload || {};
  var command = payload.command;
  var value = payload.value;
  var actionType = (payload.actionType === "type" || payload.actionType === "hover")
    ? payload.actionType : "click";
  // Default true keeps the DevTools eval path able to reach same-origin frames.
  var allowFrameHop = payload.frameHop !== false;

  var el;
  try {
    el = shubResolveTestElement(command, value, allowFrameHop);
  } catch (e) {
    return { status: "error", message: "resolve failed" };
  }

  if (el === "__UNSUPPORTED__") {
    return { status: "unsupported", command: command };
  }
  if (!el) {
    return { status: "notfound", command: command };
  }

  try {
    return shubPerformTestAction(el, actionType);
  } catch (e) {
    return { status: "error", message: "action failed" };
  }
}

/**
 * DevTools panel entry point (called via inspectedWindow.eval).
 * Receives a base64-encoded JSON payload, returns a JSON string result.
 */
function shubTestLocatorFromPanel(b64) {
  var payload;
  try {
    payload = JSON.parse(shubTest_b64Decode(b64));
  } catch (e) {
    return JSON.stringify({ status: "error", message: "bad payload" });
  }
  return JSON.stringify(shubRunLocatorTest(payload));
}

/**
 * Side Panel entry point (called by contentScript.js message router).
 * The payload is passed as a structured-cloned object; the result is sent
 * back to the panel via a runtime message.
 */
function shubHandleTestLocatorMessage(message) {
  var payload = (message && message.payload) || {};
  var result = shubRunLocatorTest(payload);
  try {
    chrome.runtime.sendMessage({
      name: "shub-test-locator-result",
      result: result,
      reqId: payload.reqId
    });
  } catch (e) {}
  return result;
}
