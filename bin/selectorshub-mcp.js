#!/usr/bin/env node
import { main } from "../src/index.js";

main().catch((e) => {
  process.stderr.write(`SelectorsHub MCP failed to start: ${(e && e.stack) || e}\n`);
  process.exit(1);
});
