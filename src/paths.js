import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

/** Where SelectorsHub MCP keeps its browser profile and settings. */
export function homeDir() {
  const dir = process.env.SELECTORSHUB_HOME || join(homedir(), ".selectorshub-mcp");
  mkdirSync(dir, { recursive: true });
  return dir;
}
