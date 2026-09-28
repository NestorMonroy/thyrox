/**
 * `detectAgent(id)` dice si el agente de ese destino está instalado en esta
 * máquina. Toda detección mira sólo el sistema de archivos: nunca lanzan un
 * shell ni interpolan rutas.
 *
 * Trae devuelve `{ installed: false }` a propósito mientras su viabilidad siga
 * en investigación (ver `targets/trae.ts`).
 *
 * Porte de `omniroute: src/mitm/detection/index.ts` (MIT).
 */
import type { AgentId, DetectionResult } from "../types.ts";
import { detectAntigravity } from "./antigravity.ts";
import { detectKiro } from "./kiro.ts";
import { detectCopilot } from "./copilot.ts";
import { detectCodex } from "./codex.ts";
import { detectCursor } from "./cursor.ts";
import { detectZed } from "./zed.ts";
import { detectAnthropicCli } from "./claudeCode.ts";
import { detectOpenCode } from "./openCode.ts";

export const DETECTORS: Record<AgentId, () => DetectionResult> = {
  antigravity: detectAntigravity,
  kiro: detectKiro,
  copilot: detectCopilot,
  codex: detectCodex,
  cursor: detectCursor,
  zed: detectZed,
  "claude-code": detectAnthropicCli,
  "open-code": detectOpenCode,
  trae: () => ({ installed: false }),
  // GHE Copilot no tiene detección propia: es una conexión a un dominio de empresa,
  // no una instalación. La referencia la omite y cae en el mismo `false`.
  "ghe-copilot": () => ({ installed: false }),
};

export function detectAgent(id: AgentId): DetectionResult {
  const fn = DETECTORS[id];
  if (!fn) return { installed: false };
  try {
    return fn();
  } catch {
    return { installed: false };
  }
}

export {
  detectAntigravity,
  detectKiro,
  detectCopilot,
  detectCodex,
  detectCursor,
  detectZed,
  detectAnthropicCli,
  detectOpenCode,
};
