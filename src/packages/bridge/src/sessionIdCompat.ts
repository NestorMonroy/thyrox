/**
 * Helpers de traducción de etiqueta del session ID para la capa de
 * compat de CCR v2.
 *
 * Vive en su propio archivo (en vez de workSecret.ts) para que
 * sessionHandle.ts y replBridgeTransport.ts (puntos de entrada de
 * bridge.mjs) puedan importar de workSecret.ts sin traer estas funciones
 * de re-etiquetado.
 *
 * El interruptor de apagado isCseShimEnabled se inyecta vía
 * setCseShimGate() para evitar un import estático de
 * bridgeEnabled.ts → growthbook.ts → config.ts — todos vetados del
 * bundle sdk.mjs (scripts/build-agent-sdk.sh). Los llamadores que ya
 * importan bridgeEnabled.ts registran el gate; la ruta del SDK nunca lo
 * hace, así que el shim queda activo por default (coincidiendo con el
 * default propio de isCseShimEnabled()).
 *
 * Puerto fiel de `ccnmt: packages/bridge/src/sessionIdCompat.ts`.
 */

let _isCseShimEnabled: (() => boolean) | undefined

/**
 * Registra el gate de GrowthBook para el shim cse_. Se llama desde el
 * código de init del bridge que ya importa bridgeEnabled.ts.
 */
export function setCseShimGate(gate: () => boolean): void {
  _isCseShimEnabled = gate
}

/**
 * Re-etiqueta un session ID `cse_*` a `session_*` para usarlo con la API
 * de compat v1.
 *
 * Los endpoints de worker (/v1/code/sessions/{id}/worker/*) quieren
 * `cse_*`; eso es lo que entrega el poll de trabajo. Los endpoints de
 * compat de cara al cliente (/v1/sessions/{id}, /v1/sessions/{id}/archive,
 * /v1/sessions/{id}/events) quieren `session_*` —
 * compat/convert.go:27 valida TagSession. Mismo UUID, disfraz distinto.
 * No-op para IDs que no son `cse_*`.
 *
 * bridgeMain mantiene una sola variable sessionId tanto para el registro
 * de worker como para las llamadas de gestión de sesión. Llega como
 * `cse_*` del poll de trabajo bajo el gate de compat, así que
 * archiveSession/fetchSessionTitle necesitan este re-etiquetado.
 */
export function toCompatSessionId(id: string): string {
  if (!id.startsWith('cse_')) return id
  if (_isCseShimEnabled && !_isCseShimEnabled()) return id
  return 'session_' + id.slice('cse_'.length)
}

/**
 * Re-etiqueta un session ID `session_*` a `cse_*` para llamadas de la
 * capa de infraestructura.
 *
 * Inverso de toCompatSessionId. POST /v1/environments/{id}/bridge/reconnect
 * vive debajo de la capa de compat: una vez que ccr_v2_compat_enabled
 * está activo del lado servidor, busca sesiones por su etiqueta de infra
 * (`cse_*`). createBridgeSession sigue devolviendo `session_*`
 * (compat/convert.go:41) y eso es lo que guarda bridge-pointer — así que
 * el reconnect perpetuo pasa el disfraz equivocado y recibe "Session not
 * found" de vuelta. Mismo UUID, etiqueta equivocada. No-op para IDs que
 * no son `session_*`.
 */
export function toInfraSessionId(id: string): string {
  if (!id.startsWith('session_')) return id
  return 'cse_' + id.slice('session_'.length)
}
