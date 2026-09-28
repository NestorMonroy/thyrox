/**
 * Si el IDE Antigravity está instalado. Sólo mira el sistema de archivos: no
 * lanza un shell ni interpola rutas.
 *
 * Porte de `omniroute: src/mitm/detection/antigravity.ts` (MIT).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DetectionResult } from "../types.ts";

const HOME = os.homedir();
const PATHS = [
  // macOS
  "/Applications/Antigravity.app",
  path.join(HOME, "Applications", "Antigravity.app"),
  // Linux (AppImage o instalación del sistema)
  "/usr/bin/antigravity",
  "/usr/local/bin/antigravity",
  path.join(HOME, ".local", "bin", "antigravity"),
  // Windows
  path.join(
    process.env.LOCALAPPDATA ?? path.join(HOME, "AppData", "Local"),
    "Programs",
    "Antigravity",
    "Antigravity.exe"
  ),
];

export function detectAntigravity(): DetectionResult {
  for (const p of PATHS) {
    if (fs.existsSync(p)) return { installed: true, path: p };
  }
  return { installed: false };
}
