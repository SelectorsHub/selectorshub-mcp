// Runtime configuration from CLI flags and environment variables.
const HELP = `SelectorsHub MCP server

Usage: npx selectorshub-mcp [options]

Options (each also settable by the environment variable shown):
  --headless                SELECTORSHUB_HEADLESS=1     Run the browser without a window
  --headed                                              Force a visible browser window
  --browser <name>          SELECTORSHUB_BROWSER        chrome (default), msedge, chromium
  --executable-path <path>  SELECTORSHUB_BROWSER_PATH   Use a specific Chromium-based browser
  --user-data-dir <dir>     SELECTORSHUB_USER_DATA_DIR  Browser profile dir (logins persist here)
  --isolated                SELECTORSHUB_ISOLATED=1     Fresh profile every session (no saved logins)
  --storage-state <file>    SELECTORSHUB_STORAGE_STATE  Playwright storage state to load (with --isolated)
  --viewport <WxH>          SELECTORSHUB_VIEWPORT       Viewport size, default 1366x900
  --ignore-https-errors                                 Accept self-signed certificates
  -v, --version                                         Print version
  -h, --help                                            Print this help
`;

export function parseConfig(argv = process.argv.slice(2), env = process.env) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("-")) continue;
    const [k, inline] = a.replace(/^--?/, "").split("=");
    const next = argv[i + 1];
    const takesValue = ["browser", "executable-path", "user-data-dir", "storage-state", "viewport"].includes(k);
    if (takesValue) {
      flags[k] = inline !== undefined ? inline : next;
      if (inline === undefined) i++;
    } else flags[k] = true;
  }
  const truthy = (v) => v !== undefined && v !== "" && v !== "0" && v !== "false";
  const noDisplay = process.platform === "linux" && !env.DISPLAY && !env.WAYLAND_DISPLAY;
  let headless = truthy(env.SELECTORSHUB_HEADLESS) || !!flags.headless || noDisplay || truthy(env.CI);
  if (flags.headed) headless = false;
  const vp = String(flags.viewport || env.SELECTORSHUB_VIEWPORT || "1366x900").split("x").map(Number);
  return {
    help: !!(flags.h || flags.help),
    version: !!(flags.v || flags.version),
    headless,
    browser: flags.browser || env.SELECTORSHUB_BROWSER || "chrome",
    executablePath: flags["executable-path"] || env.SELECTORSHUB_BROWSER_PATH || undefined,
    userDataDir: flags["user-data-dir"] || env.SELECTORSHUB_USER_DATA_DIR || undefined,
    // A storage-state file only applies to a fresh (isolated) context.
    isolated: !!flags.isolated || truthy(env.SELECTORSHUB_ISOLATED) || !!(flags["storage-state"] || env.SELECTORSHUB_STORAGE_STATE),
    storageState: flags["storage-state"] || env.SELECTORSHUB_STORAGE_STATE || undefined,
    viewport: vp[0] && vp[1] ? { width: vp[0], height: vp[1] } : undefined,
    ignoreHttpsErrors: !!flags["ignore-https-errors"],
    navigationTimeout: 45000,
  };
}

export { HELP };
