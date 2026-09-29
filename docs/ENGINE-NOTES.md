# Engine notes: extension bugs found while building the MCP

The MCP verifies every locator by checking that it resolves to the exact inspected element. Running that check across test pages found these issues in the extension's content scripts (v5.8.5). The MCP works around all of them, but they also affect extension users.

## 1. `getByLabel` suggested for `<label>` elements (playwrightnew.js)

When the inspected element is a `<label>`, the generator suggests `page.getByLabel('Email address')` with count 1. `getByLabel` returns the **input the label points to**, not the label, so the locator selects a different element. The count is right, but the element is wrong.

**Fix:** in `generateAllSelectors`, skip `getByLabel` when `el.tagName === 'LABEL'`. Use `getByText(..., { exact: true })` or `locator('label', { hasText })` instead.

## 2. The verifier rejects backtick locators the generator produces (playwrightnew.js)

Smart-table suggestions are emitted with backticks:

```js
page.locator(`//tr[td[contains(., 'Ravi')]]//button`)
```

Pasting that into the extension's own Playwright verifier (`getSelectorMatches`) returns **"Invalid Playwright Locator: Could not parse XPath"**. The same locator in single or double quotes works.

**Fix:** accept `` ` `` as a string delimiter in the locator parser, or emit double quotes when the XPath has no `"`.

## 3. Chains after `.filter()` are ignored by the verifier (playwrightnew.js)

```js
page.locator('div.card').filter({ hasText: 'Bike Light' }).getByRole('button', { name: 'Add to cart' })
// verifier returns all 6 buttons; real Playwright returns 1
page.locator('div.card').filter({ hasText: 'Bike Light' }).locator('button')
// verifier returns the <div>, not the button
```

**Fix:** after applying `filter`, keep evaluating the rest of the chain relative to the filtered elements.

## 4. `xpath=` prefix and `(//x)[n]` not supported by the verifier (playwrightnew.js)

`page.locator('xpath=//div')` and `page.locator('(//button)[2]')` are valid Playwright but rejected by `getSelectorMatches` as invalid CSS.

**Fix:** strip an `xpath=` / `css=` prefix, and treat selectors starting with `(` + `/` as XPath.

## 5. Generator state leaks between inspections (contentScript.js)

`tempXpath`, `indexes` and `matchIndex` are globals that `createRelXpath` relies on being empty. The DevTools panel path resets them in `dom-inspector.js`'s message listener (`this.tempXpath = ""` ...). Any other entry point that calls `onInspectElementClick` without that reset gets the previous element's XPath. For example, the second "Edit" button in a table received row 1's `//tbody/tr[1]/td[3]/button[1]`.

**Fix:** reset these at the start of `onInspectElementClick` (or make them locals).

## 6. Minor

- `iframeOfFrame()` uses `=` instead of `===` (`alliframes[i].contentWindow.document = element.ownerDocument`) and indexes `alliframes` in the `frame` loop.
- `createCssSelector` sometimes returns a leading space (`" tbody tr:nth-child(2) ..."`).

## What the MCP adds on top of the engine

- **Verification:** each locator carries `verified: true/false`, and only verified locators are recommended. Playwright locators are verified with real Playwright.
- **Stable retry:** when every locator depends on a generated id or hashed class (`:r3:`, `mui-4821`, `css-19bb58m`), the engine is re-run with its own "without id / without class" options.
- **Container-aware locators:** when the best locator is positional, it's anchored to unique nearby text: `//h3[normalize-space()='Backpack']/ancestor::div[1]//button[normalize-space()='Add to cart']` and `page.locator('div.card').filter({ hasText: 'Backpack' }).getByRole('button', { name: 'Add to cart', exact: true })`.

Items 3 and 4 could also be features in the extension.
