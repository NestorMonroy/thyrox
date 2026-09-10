/**
 * Puerto COMPLETO de `ccnmt: packages/storage/src/sessionActivity.ts`
 * (134 líneas fuente). Tracking de actividad de sesión con un timer de
 * heartbeat basado en refcount.
 *
 * El transporte registra su callback de keep-alive vía
 * registerSessionActivityCallback(). Quien llama (streaming de la API,
 * ejecución de herramientas) delimita su trabajo con
 * startSessionActivity() / stopSessionActivity(). Cuando el refcount es
 * >0, un timer periódico dispara el callback registrado cada 30 segundos
 * para mantener el contenedor vivo.
 *
 * El envío de keep-alives está gateado por
 * CLAUDE_CODE_REMOTE_SEND_KEEPALIVES. El logging de diagnóstico dispara
 * siempre, para ayudar a diagnosticar huecos de inactividad.
 *
 * Tres dependencias hermanas ausentes, reimplementadas PRIVADAMENTE con
 * inyección de dependencias (setter `setXFn`):
 *
 *  - `registerCleanup` (`app-host/bootstrap/cleanupRegistry.js`) — el
 *    módulo real YA existe, portado fielmente, en
 *    `@thyrox/app-host: src/bootstrap/cleanupRegistry.ts` (un `Set` +
 *    add/delete). No se importa cruzando de paquete (ningún archivo de
 *    `storage` importa `@thyrox/*` por nombre todavía — mismo criterio
 *    que documentan `path.ts`, `git.ts`, `file.ts`, `detectRepository.ts`
 *    y `toolResultStorage.ts` de este mismo paquete). Se reimplementa
 *    aquí con el MISMO contrato exacto (un `Set`, `add`/devuelve
 *    `delete`).
 *  - `logForDiagnosticsNoPII` (`local-observability/logging`) — no-op con
 *    setter `setLogForDiagnosticsNoPIIFn`.
 *  - `isEnvTruthy` (`@thyrox/config: env/utils.ts`, que sí existe de
 *    verdad en este monorepo) — no se importa por el mismo motivo de
 *    aislamiento de paquete; se reimplementa fiel a esa fuente real
 *    (`1`/`true`/`yes`/`on`, sin distinguir mayúsculas).
 *
 * `readEnv` SÍ se reusa de verdad: se importa de
 * `./internal/pendingCrossPackageDeps.js`, sustituto ya presente en este
 * paquete.
 */
import { readEnv } from './internal/pendingCrossPackageDeps.js'

// ---------------------------------------------------------------------------
// Sustitutos — ver docstring del archivo.
// ---------------------------------------------------------------------------

const cleanupFunctions = new Set<() => Promise<void>>()
function registerCleanup(cleanupFn: () => Promise<void>): () => void {
  cleanupFunctions.add(cleanupFn)
  return () => cleanupFunctions.delete(cleanupFn)
}
/** Sólo para test — la fuente real corre estas al apagarse el proceso. */
export function runRegisteredCleanupsForTest(): Promise<unknown> {
  return Promise.all(Array.from(cleanupFunctions).map(fn => fn()))
}

let _logForDiagnosticsNoPII: (
  level: 'debug' | 'info',
  event: string,
  payload?: Record<string, unknown>,
) => void = () => {}
export function setLogForDiagnosticsNoPIIFn(
  fn: typeof _logForDiagnosticsNoPII,
): void {
  _logForDiagnosticsNoPII = fn
}

/** Fiel a `@thyrox/config: env/utils.ts::isEnvTruthy` — ver docstring. */
function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalized = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

// ---------------------------------------------------------------------------
// El módulo real — porte fiel.
// ---------------------------------------------------------------------------

const SESSION_ACTIVITY_INTERVAL_MS = 30_000

export type SessionActivityReason = 'api_call' | 'tool_exec'

let activityCallback: (() => void) | null = null
let refcount = 0
const activeReasons = new Map<SessionActivityReason, number>()
let oldestActivityStartedAt: number | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null
let cleanupRegistered = false

function startHeartbeatTimer(): void {
  clearIdleTimer()
  heartbeatTimer = setInterval(() => {
    _logForDiagnosticsNoPII('debug', 'session_keepalive_heartbeat', {
      refcount,
    })
    if (isEnvTruthy(readEnv('CLAUDE_CODE_REMOTE_SEND_KEEPALIVES'))) {
      activityCallback?.()
    }
  }, SESSION_ACTIVITY_INTERVAL_MS)
}

function startIdleTimer(): void {
  clearIdleTimer()
  if (activityCallback === null) {
    return
  }
  idleTimer = setTimeout(() => {
    _logForDiagnosticsNoPII('info', 'session_idle_30s')
    idleTimer = null
  }, SESSION_ACTIVITY_INTERVAL_MS)
}

function clearIdleTimer(): void {
  if (idleTimer !== null) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

export function registerSessionActivityCallback(cb: () => void): void {
  activityCallback = cb
  // Reinicia el timer si ya hay trabajo en curso (p. ej. reconexión durante streaming)
  if (refcount > 0 && heartbeatTimer === null) {
    startHeartbeatTimer()
  }
}

export function unregisterSessionActivityCallback(): void {
  activityCallback = null
  // Detiene el timer si se quita el callback
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  clearIdleTimer()
}

export function sendSessionActivitySignal(): void {
  if (isEnvTruthy(readEnv('CLAUDE_CODE_REMOTE_SEND_KEEPALIVES'))) {
    activityCallback?.()
  }
}

export function isSessionActivityTrackingActive(): boolean {
  return activityCallback !== null
}

/**
 * Incrementa el refcount de actividad. Cuando pasa de 0→1 y hay un
 * callback registrado, arranca un timer periódico de heartbeat.
 */
export function startSessionActivity(reason: SessionActivityReason): void {
  refcount++
  activeReasons.set(reason, (activeReasons.get(reason) ?? 0) + 1)
  if (refcount === 1) {
    oldestActivityStartedAt = Date.now()
    if (activityCallback !== null && heartbeatTimer === null) {
      startHeartbeatTimer()
    }
  }
  if (!cleanupRegistered) {
    cleanupRegistered = true
    registerCleanup(async () => {
      _logForDiagnosticsNoPII('info', 'session_activity_at_shutdown', {
        refcount,
        active: Object.fromEntries(activeReasons),
        // Sólo tiene sentido mientras hay trabajo en curso; stale en otro caso.
        oldest_activity_ms:
          refcount > 0 && oldestActivityStartedAt !== null
            ? Date.now() - oldestActivityStartedAt
            : null,
      })
    })
  }
}

/**
 * Decrementa el refcount de actividad. Cuando llega a 0, detiene el timer
 * de heartbeat y arranca un timer de idle que loguea tras 30s de
 * inactividad.
 */
export function stopSessionActivity(reason: SessionActivityReason): void {
  if (refcount > 0) {
    refcount--
  }
  const n = (activeReasons.get(reason) ?? 0) - 1
  if (n > 0) activeReasons.set(reason, n)
  else activeReasons.delete(reason)
  if (refcount === 0 && heartbeatTimer !== null) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
    startIdleTimer()
  }
}

/** Sólo para test — restablece todo el estado de módulo entre casos. */
export function resetSessionActivityForTest(): void {
  activityCallback = null
  refcount = 0
  activeReasons.clear()
  oldestActivityStartedAt = null
  if (heartbeatTimer !== null) clearInterval(heartbeatTimer)
  heartbeatTimer = null
  if (idleTimer !== null) clearTimeout(idleTimer)
  idleTimer = null
  cleanupRegistered = false
  cleanupFunctions.clear()
}
