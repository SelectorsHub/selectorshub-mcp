# SelectorsHub MCP

**SelectorsHub for AI agents.** Your AI coding assistant writes the test; SelectorsHub gives it the locators.

AI agents such as Claude Code, Cursor and Copilot guess locators, and guessed locators break. SelectorsHub MCP lets the agent use the real SelectorsHub engine, the one inside the extension used by 2M+ testers, against the live page. The agent gets locators that are verified to match exactly the right element.

- **Every locator type:** relative, indexed and absolute XPath, CSS, id, name, className, linkText, Playwright locators, testRigor paths, and SelectorsHub axes XPath
- **Hard cases handled:** nested shadow DOM, same-origin and cross-origin iframes, SVG, dynamic tables, and repeated elements such as ten "Add to cart" buttons
- **Verified:** each recommended locator is checked to resolve to that exact element, and Playwright locators are checked with Playwright itself
- **Stable:** avoids auto-generated ids and hashed classes, and anchors positional locators to nearby text (`page.locator('div.card').filter({ hasText: 'Backpack' }).getByRole('button', { name: 'Add to cart' })`)
- **Ready-to-paste code** for Selenium (Java, Python, C#, JS), Playwright (JS/TS, Python, Java, C#), Cypress and WebdriverIO, including iframe switches and shadow-root hops
- **Repairs broken locators** after UI changes
- **Generates full page objects**

Built for testers, by a tester.

---

## Install (about 1 minute)

Requirements: **Node.js 18+** and **Google Chrome** or **Microsoft Edge**.

### Claude Code

```bash
claude mcp add selectorshub -- npx -y selectorshub-mcp
```

### Claude Desktop

Settings → Developer → Edit Config, then add:

```json
{
  "mcpServers": {
    "selectorshub": {
      "command": "npx",
      "args": ["-y", "selectorshub-mcp"]
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "selectorshub": {
      "command": "npx",
      "args": ["-y", "selectorshub-mcp"]
    }
  }
}
```

### VS Code (GitHub Copilot agent mode)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "selectorshub": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "selectorshub-mcp"]
    }
  }
}
```

### Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "selectorshub": {
      "command": "npx",
      "args": ["-y", "selectorshub-mcp"]
    }
  }
}
```

On Windows, if `npx` isn't found, use `"command": "cmd"` and `"args": ["/c", "npx", "-y", "selectorshub-mcp"]`.

---

## Use it

Just ask your AI assistant as usual:

> Write a Playwright test for the login page of https://myapp.com

> My Selenium test fails: `//button[@id='submitBtn']` no longer works. Fix it.

> Create a Java page object for the checkout page.

> Is `//div[@class='row']//a` unique on this page?

> Give me the locator for the "Edit" button in the row for Ravi.

The assistant opens the page in the SelectorsHub browser, finds the elements, and uses verified locators in the code it writes.

**Pages behind a login:** the browser keeps its logins between sessions. Log in once in the SelectorsHub browser window, or ask the assistant to do it with `page_action`, and it stays logged in.

---

## Tools

| Tool | What it does |
|---|---|
| `open_page` | Open a URL in the SelectorsHub browser |
| `list_elements` | Interactive elements (including shadow DOM and iframes) with refs and their best Playwright and Selenium locators |
| `generate_locators` | The full SelectorsHub locator set for one element (by ref, locator or visible text), with match counts, a recommended pick and code |
| `validate_locator` | Match count, uniqueness, syntax errors with auto-fix, and fragility warnings. Accepts XPath, CSS, Playwright (any language), Selenium `By.*`, Cypress and WebdriverIO |
| `fix_locator` | Repairs broken, ambiguous or outdated locators |
| `generate_page_object` | A page object class for 11 framework and language combinations |
| `page_action` | Click, fill, select, press and so on, to reach the state you need |
| `screenshot` | The page, or one element highlighted, to confirm a match |
| `close_browser` | Close the browser |

Frameworks: `selenium-java`, `selenium-python`, `selenium-csharp`, `selenium-js`, `playwright-js`, `playwright-ts`, `playwright-python`, `playwright-java`, `playwright-csharp`, `cypress`, `webdriverio`.

---

## Free for everyone

Every feature is free, with **no license key and no daily limit**. That includes companies of any size and CI/CD pipelines.

---

## Options

Pass options as arguments (`"args": ["-y", "selectorshub-mcp", "--headless"]`) or as environment variables:

| Option | Environment variable | Meaning |
|---|---|---|
| `--headless` | `SELECTORSHUB_HEADLESS=1` | Run without a browser window |
| `--browser <name>` | `SELECTORSHUB_BROWSER` | `chrome` (default), `msedge`, `chromium` |
| `--executable-path <path>` | `SELECTORSHUB_BROWSER_PATH` | Any Chromium-based browser |
| `--user-data-dir <dir>` | `SELECTORSHUB_USER_DATA_DIR` | Browser profile (logins are kept here) |
| `--isolated` | `SELECTORSHUB_ISOLATED=1` | Fresh profile each session |
| `--storage-state <file>` | `SELECTORSHUB_STORAGE_STATE` | Load a Playwright storage state (cookies and localStorage) |
| `--viewport 1366x900` | `SELECTORSHUB_VIEWPORT` | Viewport size |
| `--ignore-https-errors` | | Accept self-signed certificates |

---

## Privacy

Everything runs on your computer. Page content, screenshots and locators never leave your machine. The server makes no network requests of its own. When the package is installed, it sends one anonymous ping to count downloads; it contains no personal data or page content.

## Troubleshooting

- **"Could not start a browser":** install Chrome or Edge, or run `npx playwright install chromium`.
- **Stale refs:** refs are valid until the page changes. Run `list_elements` again after navigating.
- **Closed shadow roots** are unreachable by design, for every tool.

---

© SelectorsHub Tech Private Limited. SelectorsHub is patented (Indian Patent #573401). See [LICENSE.md](LICENSE.md).
