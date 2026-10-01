/**
 * Si el IDE Cursor está instalado. Sólo mira el sistema de archivos: no
 * lanza un shell ni interpola rutas.
 *
 * Porte de `omniroute: src/mitm/detection/cursor.ts` (MIT).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DetectionResult } from "../types.ts";

const HOME = os.homedir();
const PATHS = [
  "/Applications/Cursor.app",
  path.join(HOME, "Applications", "Cursor.app"),
  "/usr/bin/cursor",
  "/usr/local/bin/cursor",
  path.join(HOME, ".local", "bin", "cursor"),
  path.join(HOME, ".cursor"),
  path.join(
    process.env.LOCALAPPDATA ?? path.join(HOME, "AppData", "Local"),
    "Programs",
    "cursor",
    "Cursor.exe"
  ),
];

export function detectCursor(): DetectionResult {
  for (const p of PATHS) {
    if (fs.existsSync(p)) return { installed: true, path: p };
  }
  return { installed: false };
}
