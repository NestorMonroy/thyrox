/**
 * Puerto fiel de `ccnmt: packages/bridge/src/pollConfigDefaults.ts`. Sin
 * dependencias — reimplementación completa.
 *
 * Valores por defecto del intervalo de polling del bridge. Separado de
 * `pollConfig.ts` para que los llamadores que no necesitan tuning en
 * vivo por GrowthBook (el daemon vía Agent SDK) eviten la cadena
 * transitiva growthbook.ts → config.ts → file.ts → sessionStorage.ts →
 * commands.ts.
 */

/**
 * Intervalo de poll cuando se busca trabajo activamente (sin transporte
 * o por debajo de maxSessions). Gobierna la latencia visible al usuario
 * de "conectando…" en la primera recogida de trabajo y la velocidad de
 * recuperación tras un re-despacho de un item de trabajo por el servidor.
 */
const POLL_INTERVAL_MS_NOT_AT_CAPACITY = 2000

/**
 * Intervalo de poll cuando el transporte está conectado. Corre de forma
 * independiente del heartbeat — cuando ambos están habilitados, el loop
 * de heartbeat sale para hacer poll a este intervalo. Fijar en 0 para
 * deshabilitar el polling en capacidad por completo.
 *
 * Restricciones del lado servidor que acotan este valor:
 * - BRIDGE_LAST_POLL_TTL = 4h (expiración de la clave Redis → el entorno
 *   se archiva automáticamente)
 * - max_poll_stale_seconds = 24h (gate de salud de creación de sesión,
 *   actualmente deshabilitado)
 *
 * 10 minutos da 24× de margen sobre el TTL de Redis, sin dejar de
 * recoger re-despachos de rotación de token iniciados por el servidor
 * dentro de un ciclo de poll. El transporte se reconecta automáticamente
 * durante 10 minutos ante fallos WS transitorios, así que el poll no es
 * la vía de recuperación — es estrictamente una señal de vida más un
 * respaldo para el cierre permanente.
 */
const POLL_INTERVAL_MS_AT_CAPACITY = 600_000

/**
 * Intervalos de poll del bridge multisesión (bridgeMain.ts). Los
 * defaults coinciden con los valores single-session para que las
 * configs de GrowthBook existentes sin estos campos preserven el
 * comportamiento actual. Ops puede ajustarlos de forma independiente
 * vía la bandera GB `tengu_bridge_poll_interval_config`.
 */
const MULTISESSION_POLL_INTERVAL_MS_NOT_AT_CAPACITY =
  POLL_INTERVAL_MS_NOT_AT_CAPACITY
const MULTISESSION_POLL_INTERVAL_MS_PARTIAL_CAPACITY =
  POLL_INTERVAL_MS_NOT_AT_CAPACITY
const MULTISESSION_POLL_INTERVAL_MS_AT_CAPACITY = POLL_INTERVAL_MS_AT_CAPACITY

export type PollIntervalConfig = {
  poll_interval_ms_not_at_capacity: number
  poll_interval_ms_at_capacity: number
  non_exclusive_heartbeat_interval_ms: number
  multisession_poll_interval_ms_not_at_capacity: number
  multisession_poll_interval_ms_partial_capacity: number
  multisession_poll_interval_ms_at_capacity: number
  reclaim_older_than_ms: number
  session_keepalive_interval_v2_ms: number
}

export const DEFAULT_POLL_CONFIG: PollIntervalConfig = {
  poll_interval_ms_not_at_capacity: POLL_INTERVAL_MS_NOT_AT_CAPACITY,
  poll_interval_ms_at_capacity: POLL_INTERVAL_MS_AT_CAPACITY,
  // 0 = deshabilitado. Cuando > 0, los loops en capacidad envían
  // heartbeats por item de trabajo a este intervalo. Independiente de
  // poll_interval_ms_at_capacity — ambos pueden correr (el heartbeat
  // cede periódicamente al poll). 60s da 5× de margen bajo el TTL de
  // heartbeat de 300s del servidor. Se llama non_exclusive para
  // distinguirlo del viejo campo heartbeat_interval_ms (semántica
  // either-or en clientes pre-#22145 — el heartbeat suprimía el poll).
  // Los clientes viejos ignoran esta clave; ops puede fijar ambos
  // campos durante el rollout.
  non_exclusive_heartbeat_interval_ms: 0,
  multisession_poll_interval_ms_not_at_capacity:
    MULTISESSION_POLL_INTERVAL_MS_NOT_AT_CAPACITY,
  multisession_poll_interval_ms_partial_capacity:
    MULTISESSION_POLL_INTERVAL_MS_PARTIAL_CAPACITY,
  multisession_poll_interval_ms_at_capacity:
    MULTISESSION_POLL_INTERVAL_MS_AT_CAPACITY,
  // Query param del poll: reclama items de trabajo no confirmados más
  // viejos que esto. Coincide con el DEFAULT_RECLAIM_OLDER_THAN_MS del
  // servidor (work_service.py:24). Permite recoger trabajo stale-pending
  // tras la expiración del JWT, cuando el ack previo falló porque el
  // session_ingress_token ya estaba obsoleto.
  reclaim_older_than_ms: 5000,
  // 0 = deshabilitado. Cuando > 0, envía un frame silencioso
  // {type:'keep_alive'} a session-ingress a este intervalo para que los
  // proxies upstream no recolecten como basura una sesión remote-control
  // ociosa. 2 min es el default. _v2: gate exclusivo del bridge (los
  // clientes pre-v2 leen la clave vieja, los nuevos la ignoran).
  session_keepalive_interval_v2_ms: 120_000,
}
