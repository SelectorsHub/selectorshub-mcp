// Evaluate Playwright locator strings with real Playwright, so match counts and
// verification follow exactly the semantics users' tests will run with.
import { parsePwChain } from "./codegen.js";

const ALLOWED = new Set([
  "locator",
  "getByRole",
  "getByText",
  "getByLabel",
  "getByPlaceholder",
  "getByAltText",
  "getByTitle",
  "getByTestId",
  "frameLocator",
  "contentFrame",
  "owner",
  "nth",
  "first",
  "last",
  "filter",
  "and",
  "or",
]);

function toArg(a) {
  if (a.t === "str" || a.t === "bool" || a.t === "num") return a.v;
  if (a.t === "re") return new RegExp(a.v, a.flags);
  if (a.t === "obj") {
    const o = {};
    for (const [k, v] of Object.entries(a.v)) o[k] = toArg(v);
    return o;
  }
  throw new Error("unsupported argument");
}

/** Build a Playwright Locator from its JS source text, e.g. "page.getByRole('button', { name: 'Save' })". */
export function buildLocator(page, js) {
  const calls = parsePwChain(js);
  let obj = page;
  for (const c of calls) {
    if (!ALLOWED.has(c.name)) throw new Error(`unsupported call .${c.name}()`);
    const fn = obj[c.name];
    if (typeof fn !== "function") throw new Error(`.${c.name}() is not available here`);
    obj = fn.apply(obj, c.args.map(toArg));
  }
  if (!obj || typeof obj.count !== "function") throw new Error("locator does not resolve to elements (it ends at a frame)");
  return obj;
}

/**
 * Count matches for a JS Playwright locator. Returns { count, handles } (first `max` element handles),
 * { unsupported: true } if the text cannot be parsed, or { error } for invalid selectors.
 */
export async function pwMatch(page, js, max = 5) {
  let loc;
  try {
    loc = buildLocator(page, js);
  } catch (e) {
    return { unsupported: true, reason: e.message };
  }
  try {
    const count = await loc.count();
    const handles = [];
    for (let i = 0; i < Math.min(count, max); i++) {
      const h = await loc.nth(i).elementHandle({ timeout: 2000 }).catch(() => null);
      if (h) handles.push(h);
    }
    return { count, handles };
  } catch (e) {
    return { error: String(e.message).split("\n")[0].replace(/^locator\.count: /, "") };
  }
}

export async function sameElement(a, b) {
  try {
    const [fa, fb] = await Promise.all([a.ownerFrame(), b.ownerFrame()]);
    if (fa !== fb) return false;
    return await a.evaluate((x, y) => x === y, b);
  } catch {
    return false;
  }
}

/** Does the Playwright locator match exactly one element, and is it `target`? */
export async function pwPointsTo(page, js, target) {
  const r = await pwMatch(page, js, 2);
  if (r.unsupported || r.error) return { count: null, verified: false, error: r.error || r.reason };
  let verified = false;
  if (r.count === 1 && r.handles[0]) verified = await sameElement(r.handles[0], target);
  for (const h of r.handles) await h.dispose().catch(() => {});
  return { count: r.count, verified };
}
