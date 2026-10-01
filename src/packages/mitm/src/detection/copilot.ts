/**
 * Si GitHub Copilot está instalado: busca la carpeta de su extensión en el
 * directorio de extensiones de VS Code o de un derivado. Sólo mira el sistema
 * de archivos: no lanza un shell ni interpola rutas.
 *
 * Porte de `omniroute: src/mitm/detection/copilot.ts` (MIT).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DetectionResult } from "../types.ts";

const HOME = os.homedir();

const EXTENSIONS_DIRS = [
  path.join(HOME, ".vscode", "extensions"),
  path.join(HOME, ".vscode-insiders", "extensions"),
  path.join(HOME, ".cursor", "extensions"),
];

export function detectCopilot(): DetectionResult {
  for (const dir of EXTENSIONS_DIRS) {
    try {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir);
      for (const name of entries) {
        // Las extensiones se llaman `github.copilot-1.x.x`,
        // `github.copilot-chat-…`: basta el prefijo.
        const lower = name.toLowerCase();
        if (lower.startsWith("github.copilot")) {
          return { installed: true, path: path.join(dir, name) };
        }
      }
    } catch {
      // Sin permiso o un error pasajero: se salta este directorio.
    }
  }
  return { installed: false };
}
