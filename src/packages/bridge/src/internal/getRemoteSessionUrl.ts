/**
 * `getRemoteSessionUrl` — de `@claude-code-how-works/config/product`.
 * En la fuente rompe un ciclo config→bridge→config con un `require()`
 * perezoso de `@claude-code-how-works/bridge/sessionIdCompat.js`. Aquí
 * NO hace falta: es nuestro propio `../sessionIdCompat.js` hermano, así
 * que se importa estático (nunca hay ciclo real desde este lado — es
 * exactamente el caso "el especificador SÍ resuelve" que hace innecesaria
 * la excepción de lazy import). `getClaudeAiBaseUrl` es sustituto — ver
 * `pendingCrossPackageDeps.ts`.
 */
import { getClaudeAiBaseUrl } from './pendingCrossPackageDeps.js'
import { toCompatSessionId } from '../sessionIdCompat.js'

/**
 * Obtiene la URL completa de sesión para una sesión remota.
 *
 * La traducción cse_→session_ es un shim temporal gateado por
 * tengu_bridge_repl_v2_cse_shim_enabled (ver isCseShimEnabled). Los
 * endpoints worker (/v1/code/sessions/{id}/worker/*) quieren `cse_*` pero
 * el frontend de claude.ai hoy enruta sobre `session_*`
 * (compat/convert.go:27 valida TagSession). Mismo cuerpo UUID, prefijo de
 * tag distinto. Una vez que el servidor etiquete por environment_kind,
 * este shim se retira.
 */
export function getRemoteSessionUrl(
  sessionId: string,
  ingressUrl?: string,
): string {
  const compatId = toCompatSessionId(sessionId)
  const baseUrl = getClaudeAiBaseUrl(compatId, ingressUrl)
  return `${baseUrl}/code/${compatId}`
}
