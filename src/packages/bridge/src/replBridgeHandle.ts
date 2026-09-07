/**
 * Puntero global al handle activo del bridge REPL, para que llamadores
 * fuera del árbol de React de useReplBridge (herramientas, comandos
 * slash) puedan invocar métodos del handle como subscribePR. Misma
 * justificación de un-bridge-por-proceso que bridgeDebug.ts — la clausura
 * del handle captura el sessionId y el getAccessToken que crearon la
 * sesión, y re-derivarlos independientemente (patrón BriefTool/upload.ts)
 * arriesga divergencia de token entre staging/prod.
 *
 * Se fija desde useReplBridge.tsx cuando termina el init; se limpia al
 * desmontar.
 *
 * Puerto fiel de `ccnmt: packages/bridge/src/replBridgeHandle.ts`.
 */

import { updateSessionBridgeId } from './internal/pendingCrossPackageDeps.js'
import type { ReplBridgeHandle } from './replBridge.js'
import { toCompatSessionId } from './sessionIdCompat.js'

let handle: ReplBridgeHandle | null = null

export function setReplBridgeHandle(h: ReplBridgeHandle | null): void {
  handle = h
  // Publica (o limpia) nuestro bridge session ID en el registro de
  // sesión para que otros peers locales puedan deduplicarnos de su lista
  // de bridge — se prefiere lo local.
  void updateSessionBridgeId(getSelfBridgeCompatId() ?? null).catch(() => {})
}

export function getReplBridgeHandle(): ReplBridgeHandle | null {
  return handle
}

/**
 * Nuestro propio bridge session ID en el formato de compat session_* que
 * la API devuelve en las respuestas de /v1/sessions — o undefined si el
 * bridge no está conectado.
 */
export function getSelfBridgeCompatId(): string | undefined {
  const h = getReplBridgeHandle()
  return h ? toCompatSessionId(h.bridgeSessionId) : undefined
}
