/**
 * El barrido del refresco proactivo: recorre las conexiones OAuth y de cookie
 * por lotes concurrentes, con una pausa entre lotes para no disparar ráfagas
 * contra los proveedores, y nunca dos barridos a la vez. Arranca diez segundos
 * después de pedirlo y se repite cada minuto; los temporizadores no retienen
 * el proceso.
 *
 * Porte de `sweep`, `initTokenHealthCheck`, `stopTokenHealthCheck`,
 * `isHealthCheckDisabled` y `getHealthCheckSkipProviders` de
 * `omniroute: src/lib/tokenHealthCheck.ts` (MIT).
 */
import type { Environment } from '../../oauth/flows/clientId.ts'
import type { RefreshLogger } from '../refreshErrors.ts'

const TICK_MS = 60 * 1000
const START_DELAY_MS = 10_000
const DEFAULT_BATCH_SIZE = 20
const DEFAULT_STAGGER_MS = 3000
const DEFAULT_JITTER_MIN_MS = 500
const DEFAULT_JITTER_MAX_MS = 5000
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const LOG_TAG = 'HEALTH_CHECK'

type Row = Record<string, unknown>
type TimerHandle = unknown

export interface SchedulerTimers {
  setTimeout: (fn: () => void, ms: number) => TimerHandle
  setInterval: (fn: () => void, ms: number) => TimerHandle
  clear: (handle: TimerHandle) => void
}

export interface HealthCheckSchedulerDeps {
  /** Las conexiones de un tipo de autenticación: `oauth` o `cookie`. */
  listConnections: (authType: 'oauth' | 'cookie') => Row[] | Promise<Row[]>
  checkConnection: (connection: Row) => Promise<void>
  env?: Environment
  sleep?: (ms: number) => Promise<void>
  random?: () => number
  timers?: SchedulerTimers
  log?: RefreshLogger
}

export function envFlagEnabled(env: Environment, name: string): boolean {
  const value = env[name]
  return Boolean(value) && TRUE_VALUES.has(String(value).trim().toLowerCase())
}

export function healthCheckDisabled(env: Environment): boolean {
  return envFlagEnabled(env, 'THYROX_DISABLE_TOKEN_HEALTHCHECK')
}

/** Proveedores fuera del barrido: su token sigue el camino reactivo de la petición. */
export function healthCheckSkipProviders(env: Environment): Set<string> {
  return new Set((env.THYROX_HEALTHCHECK_SKIP_PROVIDERS ?? '').split(',').map(entry => entry.trim().toLowerCase()).filter(Boolean))
}

const intFrom = (raw: string | undefined, fallback: number) => {
  const value = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(value) ? value : fallback
}

const unref = (handle: TimerHandle) => (handle as { unref?: () => void } | null)?.unref?.()

const defaultTimers: SchedulerTimers = {
  setTimeout: (fn, ms) => {
    const handle = setTimeout(fn, ms)
    unref(handle)
    return handle
  },
  setInterval: (fn, ms) => {
    const handle = setInterval(fn, ms)
    unref(handle)
    return handle
  },
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export function createHealthCheckScheduler(deps: HealthCheckSchedulerDeps) {
  const env = deps.env ?? process.env
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const random = deps.random ?? Math.random
  const timers = deps.timers ?? defaultTimers
  const { log } = deps
  let sweeping = false
  let startTimer: TimerHandle | null = null
  let interval: TimerHandle | null = null
  let running = false

  const batchSize = () => {
    const configured = intFrom(env.THYROX_HEALTHCHECK_BATCH_SIZE, 0)
    return configured > 0 ? configured : DEFAULT_BATCH_SIZE
  }

  /** Cuántas conexiones se recorrieron; cero si otro barrido seguía en curso o el listado falló. */
  async function sweep(): Promise<number> {
    if (sweeping) {
      log?.info?.(LOG_TAG, 'Sweep skipped — previous sweep still in progress')
      return 0
    }
    sweeping = true
    try {
      const connections = [...(await deps.listConnections('oauth')), ...(await deps.listConnections('cookie'))]
      const total = connections.length
      if (total === 0) return 0
      const stagger = intFrom(env.THYROX_HEALTHCHECK_STAGGER_MS, DEFAULT_STAGGER_MS)
      const size = Math.min(batchSize(), total)
      for (let offset = 0; offset < total; offset += size) {
        const end = Math.min(offset + size, total)
        await Promise.all(
          connections.slice(offset, end).map(connection =>
            deps.checkConnection(connection).catch((error: unknown) => {
              log?.error?.(LOG_TAG, `Error checking ${String(connection.name || connection.id)}: ${error instanceof Error ? error.message : String(error)}`)
            }),
          ),
        )
        if (end < total) {
          if (stagger > 0) {
            const jitterMin = intFrom(env.THYROX_HEALTHCHECK_JITTER_MIN_MS, DEFAULT_JITTER_MIN_MS)
            const jitterMax = intFrom(env.THYROX_HEALTHCHECK_JITTER_MAX_MS, DEFAULT_JITTER_MAX_MS)
            await sleep(stagger + jitterMin + random() * Math.max(0, jitterMax - jitterMin))
          }
          // Cede el bucle de eventos antes del lote siguiente.
          await sleep(0)
        }
      }
      return total
    } catch (error) {
      log?.error?.(LOG_TAG, `Sweep error: ${error instanceof Error ? error.message : String(error)}`)
      return 0
    } finally {
      sweeping = false
    }
  }

  function start(): void {
    if (running || healthCheckDisabled(env)) return
    running = true
    log?.info?.(LOG_TAG, `Starting proactive token health-check (tick every ${TICK_MS / 1000}s)`)
    startTimer = timers.setTimeout(() => {
      startTimer = null
      void sweep()
      interval = timers.setInterval(() => void sweep(), TICK_MS)
    }, START_DELAY_MS)
  }

  function stop(): void {
    if (startTimer !== null) timers.clear(startTimer)
    if (interval !== null) timers.clear(interval)
    startTimer = null
    interval = null
    running = false
  }

  return { sweep, start, stop, isRunning: () => running }
}
