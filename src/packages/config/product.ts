/**
 * Puerto de `ccnmt: packages/config/product.ts` (76 líneas fuente).
 * Reimplementación fiel VERBATIM, salvo el `require()` de `getRemoteSessionUrl`
 * (ver su docstring abajo).
 *
 * El literal `claude-code-how-works-how-works` de `PRODUCT_URL` proviene tal
 * cual de la fuente — es consistente con `remote/index.ts` de este mismo
 * paquete, ya portado por un agente anterior con el mismo literal. Se
 * conserva por fidelidad y coherencia con lo ya comprometido (ver el
 * informe de esta tarea).
 *
 * `@thyrox/bridge` YA tiene un sustituto propio de estos símbolos —
 * `bridge/src/internal/pendingCrossPackageDeps.ts` (`getClaudeAiBaseUrl`,
 * `isRemoteSessionLocal`, `isRemoteSessionStaging`) y
 * `bridge/src/internal/getRemoteSessionUrl.ts`— declarados explícitamente
 * como "hasta que `@thyrox/config` los porte". Con este archivo ya
 * existiendo, el sustituto de `bridge` queda redundante (se retira solo
 * cuando `workspaces` los enlace); no se toca `bridge` desde aquí.
 */

export const PRODUCT_URL = 'https://claude.com/claude-code-how-works-how-works'

// URLs de sesión de Claude Code Remote.
export const CLAUDE_AI_BASE_URL = 'https://claude.ai'
export const CLAUDE_AI_STAGING_BASE_URL = 'https://claude-ai.staging.ant.dev'
export const CLAUDE_AI_LOCAL_BASE_URL = 'http://localhost:4000'

/**
 * Determina si estamos en un entorno de staging para sesiones remotas.
 * Comprueba el formato del ID de sesión y la URL de ingress.
 */
export function isRemoteSessionStaging(
  sessionId?: string,
  ingressUrl?: string,
): boolean {
  return (
    sessionId?.includes('_staging_') === true ||
    ingressUrl?.includes('staging') === true
  )
}

/**
 * Determina si estamos en un entorno de desarrollo local para sesiones
 * remotas. Comprueba el formato del ID de sesión (p. ej.
 * `session_local_...`) y la URL de ingress.
 */
export function isRemoteSessionLocal(
  sessionId?: string,
  ingressUrl?: string,
): boolean {
  return (
    sessionId?.includes('_local_') === true ||
    ingressUrl?.includes('localhost') === true
  )
}

/**
 * Obtiene la URL base de Claude AI según el entorno.
 */
export function getClaudeAiBaseUrl(
  sessionId?: string,
  ingressUrl?: string,
): string {
  if (isRemoteSessionLocal(sessionId, ingressUrl)) {
    return CLAUDE_AI_LOCAL_BASE_URL
  }
  if (isRemoteSessionStaging(sessionId, ingressUrl)) {
    return CLAUDE_AI_STAGING_BASE_URL
  }
  return CLAUDE_AI_BASE_URL
}

/**
 * Obtiene la URL completa de sesión para una sesión remota.
 *
 * La traducción cse_→session_ es un shim temporal gateado por
 * `tengu_bridge_repl_v2_cse_shim_enabled` (ver `isCseShimEnabled`). Los
 * endpoints worker (`/v1/code/sessions/{id}/worker/*`) quieren `cse_*` pero
 * el frontend de claude.ai hoy enruta sobre `session_*`
 * (`compat/convert.go:27` valida `TagSession`). Mismo cuerpo UUID, prefijo
 * de tag distinto. Cuando el servidor etiquete por `environment_kind` y el
 * frontend acepte `cse_*` directamente, este gate se retira. No-op para IDs
 * ya en forma `session_*`.
 *
 * `toCompatSessionId` se resuelve por `require()` diferido —
 * `@thyrox/bridge` no está en las dependencias de `package.json` de este
 * paquete (evitar el ciclo `config→bridge→config` es exactamente la razón
 * que la fuente da para su propio `require()` perezoso), y hoy no hay
 * symlink de workspace que lo resuelva de forma estática. Ver
 * `internal/pendingCrossPackageDeps.ts`.
 */
export function getRemoteSessionUrl(
  sessionId: string,
  ingressUrl?: string,
): string {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { toCompatSessionId } =
    require('@thyrox/bridge/sessionIdCompat.js') as typeof import('@thyrox/bridge/sessionIdCompat.js')
  /* eslint-enable @typescript-eslint/no-require-imports */
  const compatId = toCompatSessionId(sessionId)
  const baseUrl = getClaudeAiBaseUrl(compatId, ingressUrl)
  return `${baseUrl}/code/${compatId}`
}
