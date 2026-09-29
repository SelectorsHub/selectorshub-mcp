# SelectorsHub MCP: launch guide (for Sanjay)

This folder is **not** published to npm. The `files` list in `package.json` ships only `bin/`, `src/`, `engine/`, `scripts/postinstall.js`, `README.md` and `LICENSE.md`.

## What is in this project

| Folder | What it is |
|---|---|
| `engine/vendor/` | Your 4 extension content scripts, **unchanged** (the SelectorsHub engine) |
| `engine/shim.js` | Fake `chrome.*` APIs so the content scripts run outside the extension |
| `engine/bridge.js` | Read-only API the MCP calls inside each page (`window.__shub`) |
| `src/` | The MCP server: tools, browser session, code generation |
| `scripts/postinstall.js` | Download counter: one anonymous ping to `admin.autotestdata.com/prog/install` on install |
| `test/` | End-to-end tests (`npm test`, 41 checks) |
| `scripts/update-engine.mjs` | Pulls a new extension version into `engine/vendor/` |

## Step 1: Try it on your own machine (10 min)

```bash
cd selectorshub-mcp
npm install
npm test                      # should end with "41 passed, 0 failed"
claude mcp add selectorshub -- node "$(pwd)/bin/selectorshub-mcp.js"
```

Then in Claude Code: *"Open https://selectorshub.com and give me Playwright locators for the main navigation links."*

## Step 2: Website pages to create

- `https://selectorshub.com/mcp`: landing page with the demo video and install snippets (copy them from the README)
- `https://selectorshub.com/mcp/license`: `LICENSE.md`, reviewed by your lawyer (the README links to it)

## Step 3: Publish

```bash
npm login
npm publish                    # package name: selectorshub-mcp
```

**Official MCP Registry.** It uses your domain as the namespace, `com.selectorshub/selectorshub-mcp`.

1. Install `mcp-publisher` from https://modelcontextprotocol.io/registry/quickstart
2. `mcp-publisher login dns --domain selectorshub.com --private-key <key>`, then add the TXT record it asks for to your DNS
3. `mcp-publisher publish` (it reads `server.json`; keep its version in sync with `package.json`)

Also list it on Smithery, Glama, mcp.so, PulseMCP, and the Cursor and VS Code MCP directories. Every listing is another place where AI agents and developers searching for "locators" find SelectorsHub.

**Claude Desktop one-click install (.mcpb):** run `npx @anthropic-ai/mcpb init` in this folder, answer the prompts (entry point `bin/selectorshub-mcp.js`; no user-config fields are needed), then run `npx @anthropic-ai/mcpb pack` and put the `.mcpb` file on the landing page.

## Step 4: When you release a new extension version

```bash
npm run engine:update -- /path/to/SelectorsHub.zip
npm test
# bump "version" in package.json and server.json, then publish again
```

## Things to know

- **Everything is free and unlimited.** There is no license key, no daily limit and no CI/CD restriction. The server never phones home while running.
- **Download counter:** `scripts/postinstall.js` runs on `npm install` and sends one GET to your tracking URL. It times out after 3 seconds and fails silently, so it never breaks an install. Note that `npm install --ignore-scripts` (and some CI setups) skip it, so the count is a floor, not an exact number. npm's own weekly download stats are a useful cross-check.
