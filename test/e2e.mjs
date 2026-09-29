// End-to-end test: runs the real MCP server over stdio with the official MCP
// client, against a local test app (shadow DOM, same-origin + cross-origin
// iframes, SVG, tables, dynamic ids).
//
//   npm test                 run all checks
//   VERBOSE=1 npm test       also print every tool result
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createServer } from "node:http";
import { readFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "test", "fixtures");
const VERBOSE = process.env.VERBOSE === "1";

function serve(host, rewrite) {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      const f = join(fixtures, (req.url.split("?")[0] || "/").replace(/^\//, "") || "app.html");
      if (!existsSync(f)) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(rewrite(readFileSync(f, "utf8")));
    });
    srv.listen(0, host, () => resolve(srv));
  });
}

const widgetSrv = await serve("127.0.0.1", (s) => s);
const XPORT = widgetSrv.address().port;
const appSrv = await serve("localhost", (s) => s.replace("__XPORT__", XPORT));
const APP = `http://localhost:${appSrv.address().port}/app.html`;

const browserPath = process.env.SELECTORSHUB_BROWSER_PATH || (existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined);

async function startClient(extraEnv = {}) {
  const home = mkdtempSync(join(tmpdir(), "shub-mcp-"));
  const env = { ...process.env, SELECTORSHUB_HOME: home, SELECTORSHUB_HEADLESS: "1", SELECTORSHUB_ISOLATED: "1", ...extraEnv };
  for (const k of ["CI", "GITHUB_ACTIONS", "GITLAB_CI", "JENKINS_URL", "BUILDKITE", "CIRCLECI", "TF_BUILD"]) if (!(k in extraEnv)) delete env[k];
  if (browserPath) env.SELECTORSHUB_BROWSER_PATH = browserPath;
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(root, "bin", "selectorshub-mcp.js")], env, stderr: VERBOSE ? "inherit" : "pipe" });
  const client = new Client({ name: "shub-e2e", version: "1.0.0" });
  await client.connect(transport);
  const call = async (name, args = {}) => {
    const r = await client.callTool({ name, arguments: args });
    const t = r.content.map((c) => (c.type === "text" ? c.text : `[${c.type} ${c.mimeType} ${c.data.length}b]`)).join("\n");
    if (VERBOSE) console.log(`\n### ${name} ${JSON.stringify(args)}${r.isError ? "  (isError)" : ""}\n${t}`);
    let json = null;
    try {
      json = JSON.parse(t);
    } catch {}
    return { r, t, json, isError: !!r.isError };
  };
  return { client, call, home, close: async () => { await client.close(); rmSync(home, { recursive: true, force: true }); } };
}

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n      ${String(e.message).split("\n").join("\n      ")}`);
  }
}

console.log("SelectorsHub MCP end-to-end tests\n");
const A = await startClient();
const { call } = A;

await check("server lists all tools", async () => {
  const { tools } = await A.client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["close_browser", "fix_locator", "generate_locators", "generate_page_object", "list_elements", "open_page", "page_action", "screenshot", "validate_locator"]);
});

await check("open_page loads the app", async () => {
  const { json, isError } = await call("open_page", { url: APP });
  assert.ok(!isError);
  assert.equal(json.title, "SHub MCP Test App");
  assert.equal(json.iframes, 2);
});

let list;
await check("list_elements covers main page, shadow DOM and both iframes", async () => {
  const res = await call("list_elements");
  list = res.t;
  assert.match(list, /button "Sign in"/);
  assert.match(list, /getByTestId\('login-submit'\)/);
  assert.match(list, /"Message".*\(shadow DOM\)/);
  assert.match(list, /inside iframe "payment"/);
  assert.match(list, /frameLocator\('#payment-frame'\)/);
  assert.match(list, /textarea "Type a message"|textarea.*chat-msg/);
  assert.match(list, /frameLocator\('#chat-frame'\)/);
  assert.doesNotMatch(list, /frameLocator\([^)]*\)\.frameLocator\('#payment-frame'\)/, "frame prefix must not be doubled");
  assert.doesNotMatch(list, /button "Edit"\n\s+playwright: .*\n\s+selenium:\s+By\.xpath: \/html/, "table buttons should not fall back to absolute XPath");
});

const refOf = (re) => {
  const line = list.split("\n").find((l) => re.test(l));
  assert.ok(line, `no list line matching ${re}`);
  return line.trim().split(/\s+/)[0];
};

await check("generate_locators by ref: full SelectorsHub set + code", async () => {
  const { json } = await call("generate_locators", { ref: refOf(/button "Sign in"/), frameworks: ["selenium-java", "playwright-python", "cypress"] });
  assert.equal(json.recommended.playwright, "page.getByTestId('login-submit')");
  assert.equal(json.xpath.relative.value, "//button[normalize-space()='Sign in']");
  assert.equal(json.xpath.relative.count, 1);
  assert.ok(json.xpath.absolute.value.startsWith("/html[1]/body[1]"));
  assert.ok(json.playwright.length >= 3);
  assert.match(json.code["selenium-java"], /driver\.findElement\(By\.xpath\("\/\/button\[normalize-space\(\)='Sign in'\]"\)\)/);
  assert.equal(json.code["playwright-python"], `element = page.get_by_test_id("login-submit")`);
  assert.match(json.code.cypress, /cy\.get\(/);
});

await check("dynamic id is avoided for Selenium (uses name instead)", async () => {
  const { json } = await call("generate_locators", { text: "Password", frameworks: ["selenium-python"] });
  assert.equal(json.element.attributes.id, "pwd-38291");
  assert.deepEqual(json.recommended.selenium, { by: "name", value: "password" });
  assert.equal(json.code["selenium-python"], `element = driver.find_element(By.NAME, "password")`);
});

await check("exclude option + preferred attribute", async () => {
  const { json } = await call("generate_locators", { locator: "#email", exclude: ["id"] });
  assert.ok(!/@id|#email/.test(json.xpath.relative.value), json.xpath.relative.value);
  const p = await call("generate_locators", { locator: "button.btn-primary", preferred_attribute: "data-testid" });
  assert.match(p.json.xpath.relative.value, /data-testid/);
});

await check("smart table locators for row button", async () => {
  const { json } = await call("generate_locators", { locator: "//tr[2]/td[3]/button" });
  assert.ok(json.playwright.some((p) => /Ravi/.test(p.locator) && p.count === 1), JSON.stringify(json.playwright.slice(0, 3)));
});

await check("nested shadow DOM: host chain + Selenium getShadowRoot code", async () => {
  const { json } = await call("generate_locators", { text: "Message", frameworks: ["selenium-java", "webdriverio", "playwright-ts"] });
  assert.deepEqual(json.shadowHosts, ["#profile-card", "inner-actions"]);
  assert.ok(!json.xpath, "no XPath for shadow elements");
  assert.match(json.code["selenium-java"], /findElement\(By\.cssSelector\("#profile-card"\)\)\.getShadowRoot\(\)\.findElement\(By\.cssSelector\("inner-actions"\)\)\.getShadowRoot\(\)/);
  assert.match(json.code.webdriverio, /\$\('#profile-card'\)\.shadow\$\('inner-actions'\)\.shadow\$\(/);
});

await check("same-origin iframe: frame chain + switchTo code", async () => {
  const { json } = await call("generate_locators", { text: "Pay now", frameworks: ["selenium-java", "playwright-ts"] });
  assert.equal(json.frames.length, 1);
  assert.equal(json.frames[0].css, "#payment-frame");
  assert.match(json.code["selenium-java"], /switchTo\(\)\.frame\(/);
  assert.match(json.code["playwright-ts"], /page\.frameLocator\('#payment-frame'\)\./);
});

await check("cross-origin iframe works", async () => {
  const { json, isError, t } = await call("generate_locators", { ref: refOf(/textarea/), frameworks: ["playwright-ts"] });
  assert.ok(!isError, t);
  assert.equal(json.frames[0].css, "#chat-frame");
  assert.match(json.code["playwright-ts"], /frameLocator\('#chat-frame'\)\.getByPlaceholder\('Type a message'\)|frameLocator\('#chat-frame'\)\./);
});

await check("generation is order-independent and every recommendation is verified", async () => {
  const refs = list.split("\n").filter((l) => /^e\d+\s/.test(l)).map((l) => l.split(/\s+/)[0]);
  const first = {};
  for (const ref of refs) first[ref] = (await call("generate_locators", { ref })).json;
  for (const ref of [...refs].reverse()) {
    const again = (await call("generate_locators", { ref })).json;
    assert.deepEqual(again.recommended, first[ref].recommended, `${ref} changed when inspected in a different order`);
    assert.deepEqual(again.xpath, first[ref].xpath, `${ref} xpath changed`);
  }
  const unverified = [];
  for (const ref of refs) {
    const g = first[ref];
    for (const p of g.playwright) if (p.count === 1 && p.verified === false) unverified.push(`${ref} ${g.element.tag}: ${p.locator}`);
    assert.ok(![...Object.values(g.recommended)].includes(undefined));
    const rec = g.recommended.playwright;
    if (rec) {
      const v = (await call("validate_locator", { locator: rec })).json;
      assert.equal(v.matchCount, 1, `${ref}: recommended ${rec} matched ${v.matchCount}`);
    }
  }
  // Engine suggestions with count 1 that resolve to a *different* element are
  // flagged verified:false and never recommended (e.g. getByLabel on a <label>).
  if (unverified.length) console.log(`      (caught ${unverified.length} engine suggestion(s) pointing at another element: ${unverified.join("; ")})`);
});

await check("SVG element", async () => {
  const { json } = await call("generate_locators", { locator: "circle" });
  assert.match(json.xpath.relative.value, /name\(\)='circle'/);
});

await check("axes XPath relative to an anchor", async () => {
  const { json } = await call("generate_locators", { locator: "//tr[2]/td[3]/button", relative_to: { text: "Ravi" } });
  assert.ok(json.xpath.axes && json.xpath.axes.count === 1, JSON.stringify(json.xpath.axes));
  assert.match(json.xpath.axes.value, /Ravi/);
});

await check("validate_locator: unique XPath", async () => {
  const { json } = await call("validate_locator", { locator: "//input[@name='email']" });
  assert.equal(json.type, "xpath");
  assert.equal(json.matchCount, 1);
  assert.equal(json.unique, true);
});

await check("validate_locator: Selenium, Python and Cypress syntaxes", async () => {
  for (const loc of [`driver.findElement(By.id("email"))`, `driver.find_element(By.NAME, "password")`, `cy.get('[data-testid="login-submit"]')`, `page.get_by_role("button", name="Sign in")`]) {
    const { json, t } = await call("validate_locator", { locator: loc });
    assert.equal(json.matchCount, 1, `${loc}: ${t}`);
  }
});

await check("validate_locator: not unique -> unique alternative", async () => {
  const { json } = await call("validate_locator", { locator: "button.btn" });
  assert.ok(json.matchCount > 1);
  assert.ok(json.uniqueAlternativeForFirstMatch && json.uniqueAlternativeForFirstMatch.playwright);
});

await check("validate_locator: fragile/absolute warnings", async () => {
  const { json } = await call("validate_locator", { locator: "#pwd-38291" });
  assert.ok(json.notes.some((n) => /auto-generated/.test(n)));
  const abs = await call("validate_locator", { locator: "/html[1]/body[1]/main[1]/form[1]/input[1]" });
  assert.ok(abs.json.notes.some((n) => /Absolute XPath/.test(n)));
});

await check("validate_locator: syntax error with SelectorsHub auto-fix", async () => {
  const { json } = await call("validate_locator", { locator: "//input[@name=’email’]" });
  assert.equal(json.valid, false);
  assert.match(json.error, /quote/i);
  assert.equal(json.autoFixed, "//input[@name='email']");
  assert.equal(json.autoFixedMatchCount, 1);
});

await check("validate_locator: CSS pierces shadow DOM with note", async () => {
  const { json } = await call("validate_locator", { locator: ".follow-btn" });
  assert.equal(json.matchCount, 1);
  assert.ok(json.notes.some((n) => /shadow/i.test(n)));
});

await check("fix_locator: renamed element after a UI change", async () => {
  const { json } = await call("fix_locator", { locator: "//button[@id='signInBtn']", hint: "sign in button", frameworks: ["playwright-ts"] });
  assert.equal(json.status, "replaced");
  assert.match(json.candidates[0].element, /Sign in/);
  assert.equal(json.fixed, "page.getByTestId('login-submit')");
});

await check("fix_locator: syntax fix", async () => {
  const { json } = await call("fix_locator", { locator: "//input[@name=“email”]" });
  assert.equal(json.status, "syntax_fixed");
  assert.equal(json.fixed, `//input[@name="email"]`);
});

await check("fix_locator: ambiguous locator gets per-match unique locators", async () => {
  const { json } = await call("fix_locator", { locator: "//button[text()='Edit']" });
  assert.equal(json.status, "ambiguous");
  assert.equal(json.candidates.length, 2);
  assert.notEqual(json.candidates[0].recommended.playwright, json.candidates[1].recommended.playwright);
});

for (const fw of ["playwright-ts", "playwright-python", "playwright-java", "playwright-csharp", "selenium-java", "selenium-python", "selenium-csharp", "selenium-js", "cypress", "webdriverio"]) {
  await check(`generate_page_object: ${fw}`, async () => {
    const { t, isError } = await call("generate_page_object", { framework: fw, class_name: "LoginPage" });
    assert.ok(!isError, t);
    assert.match(t, /LoginPage/);
    assert.match(t, /signIn|sign_in|SignIn|SIGN_IN/);
    if (fw === "playwright-java") assert.match(t, /AriaRole\./);
    if (fw === "playwright-python") assert.match(t, /get_by_/);
    if (fw.startsWith("selenium")) assert.match(t, /[Ss]hadow[Rr]oot|shadow_root/);
  });
}

await check("page_action: fill + click, then list reflects new state", async () => {
  let r = await call("page_action", { action: "fill", text: "Email address", value: "tester@selectorshub.com" });
  assert.ok(!r.isError, r.t);
  r = await call("validate_locator", { locator: "#email" });
  assert.equal(r.json.matchCount, 1);
  r = await call("page_action", { action: "click", locator: "//a[normalize-space()='Pricing']" });
  assert.ok(!r.isError, r.t);
  const after = await call("list_elements");
  assert.doesNotMatch(after.t, /Sign in/, "should have navigated away");
  const stale = await call("generate_locators", { ref: "e1" });
  assert.ok(stale.isError && /stale|Unknown/.test(stale.t), stale.t);
});

await check("screenshot of an element returns an image", async () => {
  await call("open_page", { url: APP });
  const { r } = await call("screenshot", { text: "Sign in" });
  assert.equal(r.content[0].type, "image");
});

// ---------- real-world patterns ----------
const SHOP = APP.replace("app.html", "shop.html");

await check("real-world: repeated 'Add to cart' buttons get unique product-specific locators", async () => {
  await call("open_page", { url: SHOP });
  const { json, t } = await call("fix_locator", { locator: "//button[text()='Add to cart']" });
  assert.equal(json.status, "ambiguous", t);
  const recs = json.candidates.map((c) => c.recommended.playwright || c.recommended.selenium.value);
  assert.match(recs[1], /filter\(\{ hasText: 'Bike Light' \}\)/, "container-aware Playwright locator expected: " + recs[1]);
  assert.match(json.candidates[1].recommended.selenium.value, /Bike Light/, "anchored XPath expected: " + json.candidates[1].recommended.selenium.value);
  assert.equal(new Set(recs).size, recs.length, "each candidate needs its own locator");
  for (const r of recs) {
    const v = (await call("validate_locator", { locator: r })).json;
    assert.equal(v.matchCount, 1, `${r} -> ${v.matchCount}`);
  }
});

await check("real-world: generated ids / hashed classes are not recommended", async () => {
  const { json } = await call("generate_locators", { text: "Search", frameworks: ["selenium-java"] });
  const sel = json.recommended.selenium.value;
  assert.doesNotMatch(sel, /mui-4821|css-19bb58m/, sel);
  const s2 = (await call("generate_locators", { locator: "input[aria-label='Search']" })).json;
  assert.doesNotMatch(JSON.stringify(s2.recommended), /:r3:/);
});

await check("real-world: nested iframes (iframe inside iframe)", async () => {
  const { json, t } = await call("generate_locators", { text: "Deep action", frameworks: ["selenium-python", "playwright-ts"] });
  assert.equal(json.frames.length, 2, t);
  assert.match(json.code["playwright-ts"], /frameLocator\('#outer-frame'\)\.frameLocator\('#inner-frame'\)/);
  assert.match(json.code["selenium-python"], /default_content\(\)[\s\S]*switch_to\.frame[\s\S]*switch_to\.frame/);
  const v = (await call("validate_locator", { locator: json.recommended.playwright })).json;
  assert.equal(v.matchCount, 1);
});

await check("real-world: 300-row table lists fast and View links are row-specific", async () => {
  const t0 = Date.now();
  const res = await call("list_elements", { filter: "View", limit: 20 });
  const ms = Date.now() - t0;
  assert.ok(ms < 15000, `list took ${ms}ms`);
  const locs = res.t.split("\n").filter((l) => /playwright:/.test(l));
  assert.equal(new Set(locs).size, locs.length, "View links must have distinct locators");
  console.log(`      (list_elements with locators on a 300-row page: ${ms}ms)`);
});

await check("real-world: closed shadow root content is reported as unreachable, not crashed", async () => {
  const { isError, t } = await call("generate_locators", { text: "Secret" });
  assert.ok(isError && /No element found/.test(t), t);
});

await A.close();

// ---------- free and unlimited ----------

await check("no license and no daily limit: 60+ locator calls, no usage messages", async () => {
  const B = await startClient();
  await B.call("open_page", { url: APP });
  for (let i = 0; i < 60; i++) {
    const r = await B.call("validate_locator", { locator: "#email" });
    assert.ok(!r.isError, `call ${i + 1} failed: ${r.t}`);
    assert.doesNotMatch(r.t, /licen|daily limit|free plan|calls used/i, r.t);
  }
  await B.close();
});

await check("works in CI/CD without any key", async () => {
  const F = await startClient({ GITHUB_ACTIONS: "true", CI: "true" });
  await F.call("open_page", { url: APP });
  const r = await F.call("list_elements");
  assert.ok(!r.isError, r.t);
  await F.close();
});

widgetSrv.close();
appSrv.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
