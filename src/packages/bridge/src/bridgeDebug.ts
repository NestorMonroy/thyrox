/**
 * Inyección de fallas sólo-ant para probar manualmente los caminos de
 * recuperación del bridge.
 *
 * Modos de fallo real que esto apunta (BQ 2026-03-12, ventana de 7 días):
 *   poll 404 not_found_error   — 147K sesiones/semana, gate onEnvironmentLost muerto
 *   ws_closed 1002/1006        —  22K sesiones/semana, poll zombie tras el cierre
 *   register transient failure —  residual: parpadeos de red durante doReconnect
 *
 * Uso: /bridge-kick <subcommand> desde el REPL mientras Remote Control
 * está conectado, luego tail debug.log para ver reaccionar la maquinaria
 * de recuperación.
 *
 * El estado a nivel de módulo es intencional aquí: un bridge por proceso
 * REPL, el slash command /bridge-kick no tiene otra forma de alcanzar los
 * closures de initBridgeCore, y teardown limpia el slot.
 *
 * Puerto fiel de `ccnmt: packages/bridge/src/bridgeDebug.ts`.
 * `logForDebugging` es sustituto — ver
 * `internal/pendingCrossPackageDeps.ts`.
 */
import { logForDebugging } from './internal/pendingCrossPackageDeps.js'
import { BridgeFatalError } from './bridgeApi.js'
import type { BridgeApiClient } from './types.js'

/** Falla de una sola vez para inyectar en la próxima llamada api coincidente. */
type BridgeFault = {
  method:
    | 'pollForWork'
    | 'registerBridgeEnvironment'
    | 'reconnectSession'
    | 'heartbeatWork'
  /** Los errores fatales pasan por handleErrorStatus → BridgeFatalError. Los
   *  transitorios salen como rechazos axios planos (5xx / red). El código
   *  de recuperación distingue los dos: fatal → teardown, transitorio →
   *  retry/backoff. */
  kind: 'fatal' | 'transient'
  status: number
  errorType?: string
  /** Inyecciones restantes. Se decrementa al consumir; se elimina en 0. */
  count: number
}

export type BridgeDebugHandle = {
  /** Invoca el handler de cierre permanente del transporte directamente.
   *  Prueba la escalada ws_closed → reconnectEnvironmentWithSession (#22148). */
  fireClose: (code: number) => void
  /** Llama reconnectEnvironmentWithSession() — igual que SIGUSR2 pero
   *  alcanzable desde el slash command. */
  forceReconnect: () => void
  /** Encola una falla para las próximas N llamadas al método api nombrado. */
  injectFault: (fault: BridgeFault) => void
  /** Aborta el sleep en-capacidad para que una falla de poll inyectada
   *  llegue de inmediato en vez de hasta 10min después. */
  wakePollLoop: () => void
  /** IDs de entorno/sesión para el grep de debug.log. */
  describe: () => string
}

let debugHandle: BridgeDebugHandle | null = null
const faultQueue: BridgeFault[] = []

export function registerBridgeDebugHandle(h: BridgeDebugHandle): void {
  debugHandle = h
}

export function clearBridgeDebugHandle(): void {
  debugHandle = null
  faultQueue.length = 0
}

export function getBridgeDebugHandle(): BridgeDebugHandle | null {
  return debugHandle
}

export function injectBridgeFault(fault: BridgeFault): void {
  faultQueue.push(fault)
  logForDebugging(
    `[bridge:debug] Queued fault: ${fault.method} ${fault.kind}/${fault.status}${fault.errorType ? `/${fault.errorType}` : ''} ×${fault.count}`,
  )
}

/**
 * Envuelve un BridgeApiClient para que cada llamada primero revise la
 * cola de fallas. Si hay una falla coincidente encolada, lanza el error
 * especificado en vez de delegar. Delega todo lo demás al cliente real.
 *
 * Sólo se llama cuando USER_TYPE === 'ant' — cero overhead en builds
 * externos.
 */
export function wrapApiForFaultInjection(
  api: BridgeApiClient,
): BridgeApiClient {
  function consume(method: BridgeFault['method']): BridgeFault | null {
    const idx = faultQueue.findIndex(f => f.method === method)
    if (idx === -1) return null
    const fault = faultQueue[idx]!
    fault.count--
    if (fault.count <= 0) faultQueue.splice(idx, 1)
    return fault
  }

  function throwFault(fault: BridgeFault, context: string): never {
    logForDebugging(
      `[bridge:debug] Injecting ${fault.kind} fault into ${context}: status=${fault.status} errorType=${fault.errorType ?? 'none'}`,
    )
    if (fault.kind === 'fatal') {
      throw new BridgeFatalError(
        `[injected] ${context} ${fault.status}`,
        fault.status,
        fault.errorType,
      )
    }
    // Transitorio: imita un rechazo de axios (5xx / red). Sin .status en
    // el propio error — así lo distinguen los catch blocks.
    throw new Error(`[injected transient] ${context} ${fault.status}`)
  }

  return {
    ...api,
    async pollForWork(envId, secret, signal, reclaimMs) {
      const f = consume('pollForWork')
      if (f) throwFault(f, 'Poll')
      return api.pollForWork(envId, secret, signal, reclaimMs)
    },
    async registerBridgeEnvironment(config) {
      const f = consume('registerBridgeEnvironment')
      if (f) throwFault(f, 'Registration')
      return api.registerBridgeEnvironment(config)
    },
    async reconnectSession(envId, sessionId) {
      const f = consume('reconnectSession')
      if (f) throwFault(f, 'ReconnectSession')
      return api.reconnectSession(envId, sessionId)
    },
    async heartbeatWork(envId, workId, token) {
      const f = consume('heartbeatWork')
      if (f) throwFault(f, 'Heartbeat')
      return api.heartbeatWork(envId, workId, token)
    },
  }
}
