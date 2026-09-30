/**
 * Si el agente `claude-code` (la CLI de Anthropic) está instalado. Sólo mira
 * el sistema de archivos: no lanza un shell ni interpola rutas.
 *
 * Porte de `omniroute: src/mitm/detection/claudeCode.ts` (MIT).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DetectionResult } from "../types.ts";

const HOME = os.homedir();
const PATHS = [
  "/usr/local/bin/claude",
  "/usr/bin/claude",
  path.join(HOME, ".local", "bin", "claude"),
  path.join(HOME, ".npm-global", "bin", "claude"),
  path.join(HOME, ".claude"),
  path.join(process.env.APPDATA ?? path.join(HOME, "AppData", "Roaming"), "npm", "claude.cmd"),
];

export function detectAnthropicCli(): DetectionResult {
  for (const p of PATHS) {
    if (fs.existsSync(p)) return { installed: true, path: p };
  }
  return { installed: false };
}
