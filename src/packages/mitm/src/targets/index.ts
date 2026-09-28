/**
 * Registro de los destinos MITM del AgentBridge.
 *
 *   - `ALL_TARGETS`: la lista ordenada, una entrada por agente.
 *   - `resolveTarget(hostname)`: el destino que declara ese host (igualdad
 *     exacta sin distinguir mayúsculas), o `null`.
 *   - `routeConnection(hostname, userBypass)`: la decisión exclusión > destino
 *     > paso directo.
 *
 * Porte de `omniroute: src/mitm/targets/index.ts` (MIT).
 */
import { shouldBypass } from "../passthrough.ts";
import type { MitmTarget } from "../types.ts";
import { ANTIGRAVITY_TARGET } from "./antigravity.ts";
import { KIRO_TARGET } from "./kiro.ts";
import { COPILOT_TARGET } from "./copilot.ts";
import { GHE_COPILOT_TARGET } from "./gheCopilot.ts";
import { CODEX_TARGET } from "./codex.ts";
import { CURSOR_TARGET } from "./cursor.ts";
import { ZED_TARGET } from "./zed.ts";
import { CLAUDE_CODE_TARGET } from "./claudeCode.ts";
import { OPEN_CODE_TARGET } from "./openCode.ts";
import { TRAE_TARGET } from "./trae.ts";

export { GHE_COPILOT_TARGET } from "./gheCopilot.ts";

export const ALL_TARGETS: MitmTarget[] = [
  ANTIGRAVITY_TARGET,
  KIRO_TARGET,
  COPILOT_TARGET,
  GHE_COPILOT_TARGET,
  CODEX_TARGET,
  CURSOR_TARGET,
  ZED_TARGET,
  CLAUDE_CODE_TARGET,
  OPEN_CODE_TARGET,
  TRAE_TARGET,
];

/**
 * El destino cuya lista `hosts` contiene el host: igualdad exacta, sin comodines
 * y sin distinguir mayúsculas.
 */
export function resolveTarget(hostname: string): MitmTarget | null {
  if (!hostname) return null;
  const h = hostname.toLowerCase();
  for (const target of ALL_TARGETS) {
    if (target.hosts.some((host) => host.toLowerCase() === h)) {
      return target;
    }
  }
  return null;
}

export type ConnectionRoute =
  | { kind: "bypass"; reason: "bypass" }
  | { kind: "target"; target: MitmTarget }
  | { kind: "passthrough" };

/**
 * Qué hacer con una conexión CONNECT/TLS a ese host, en este orden:
 *   1. lista de exclusión (por defecto y del usuario): nunca se descifra;
 *   2. host de un destino conocido: se descifra y va a su handler;
 *   3. cualquier otro: paso directo (reenvío TCP transparente).
 */
export function routeConnection(
  hostname: string,
  userBypass: string[] = []
): ConnectionRoute {
  if (shouldBypass(hostname, userBypass)) {
    return { kind: "bypass", reason: "bypass" };
  }
  const target = resolveTarget(hostname);
  if (target) {
    return { kind: "target", target };
  }
  return { kind: "passthrough" };
}
