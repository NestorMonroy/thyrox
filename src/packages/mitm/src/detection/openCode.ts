/**
 * Si OpenCode está instalado. Sólo mira el sistema de archivos: no
 * lanza un shell ni interpola rutas.
 *
 * Porte de `omniroute: src/mitm/detection/openCode.ts` (MIT).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DetectionResult } from "../types.ts";

const HOME = os.homedir();
const PATHS = [
  "/Applications/OpenCode.app",
  path.join(HOME, "Applications", "OpenCode.app"),
  "/usr/bin/opencode",
  "/usr/local/bin/opencode",
  path.join(HOME, ".local", "bin", "opencode"),
  path.join(HOME, ".opencode"),
  path.join(HOME, ".config", "opencode"),
  path.join(
    process.env.LOCALAPPDATA ?? path.join(HOME, "AppData", "Local"),
    "Programs",
    "OpenCode",
    "OpenCode.exe"
  ),
];

export function detectOpenCode(): DetectionResult {
  for (const p of PATHS) {
    if (fs.existsSync(p)) return { installed: true, path: p };
  }
  return { installed: false };
}
