/**
 * Spare worker pool — full ant 4644.js port.
 *
 * Single-slot design: at most one pre-warmed spare worker per daemon.
 * On `dispatch`, try claim → send 'claim' ctrl-frame to the spare's PTY
 * socket carrying the user's intent → re-write its state.json with the
 * real intent + cwd. If claim fails, fall through to fresh spawn.
 *
 * Pre-warm scheduler runs on daemon idle (no pending dispatches in
 * flight): spawns a spare with `--bg-pty -- bg` template + placeholder
 * sessionId, marks `EKH = { jobId, sessionId, cwd, ready: false }`.
 *
 * Gate: THYROX_CODE_BG_SPARE_POOL=1 (default OFF — saves user's idle
 * resources unless they opt in).
 *
 * @dynamicRequire
 */

import { randomBytes } from 'node:crypto'

import { logEvent } from '@thyrox/local-observability'

/**
 * Umbrales de sintonía del pool de workers "spare" — `chunk-92tvramn.js`
 * DECL `ar,Je,yt,sr,xe,dr,lr,cr,Et` (ant 4644.js `Dt`, el manager general
 * de dispatch/sweep). La referencia los consume dentro de `Dt`, que NO es
 * el alcance de este archivo (protocolo de claim, no el sweep general de
 * retiro/adopción) — se declaran aquí con sus valores fieles porque es la
 * única forma que este porte tiene hoy de nombrarlos. Sólo
 * `SPARE_REFILL_MIN_GAP_MS` se usa en este archivo; el resto queda
 * pendiente de que el sweep de `Dt` se porte (otra tarea) y los consuma.
 */
/** ant `ar` — edad de retiro (ms) de un worker asentado en el sweep normal (1h). */
export const WORKER_RETIRE_AGE_MS = 3_600_000
/** ant `Je` — edad de retiro (ms) bajo presión de memoria (1m). */
export const WORKER_RETIRE_AGE_LOW_MEM_MS = 60_000
/** ant `yt` — edad de retiro (ms) del paso "sólo monitoreo" bajo presión sostenida (8h). */
export const WORKER_RETIRE_MONITOR_ONLY_AGE_MS = 28_800_000
/** ant `sr` — umbral "duro" de retiro en el sweep normal (8h). */
export const WORKER_RETIRE_HARD_AGE_MS = 28_800_000
/** ant `xe` — cadencia del sweep general (ms) y timeout base de los probes de cwd (1m). */
export const DISPATCH_SWEEP_INTERVAL_MS = 60_000
/** ant `dr` — pausa (ms) entre reintentos del burst de prewarm tras un takeover (2s). */
export const PREWARM_BURST_STEP_DELAY_MS = 2_000
/** ant `lr` — ventana total (ms) del burst de prewarm tras un takeover (5m). */
export const PREWARM_BURST_WINDOW_MS = 300_000
/**
 * ant `cr` — pausa mínima (ms) antes de reintentar un refill de repuesto
 * tras un exit sin claim, cuando no hay lanzador propio configurado (2s).
 * Wired: `shouldPrewarm()` la exige contra `recordSpareExit()`.
 */
export const SPARE_REFILL_MIN_GAP_MS = 2_000
/** ant `Et` — timeout (ms) del probe de cwd al iniciar un dispatch (1s). */
export const CWD_PROBE_TIMEOUT_MS = 1_000

interface SpareSlot {
  short: string
  cwd: string
  sessionId: string
  ptySocket: string
  spawnedAt: number
  ready: boolean
  /** ant 4644.js I9n `p=Re(16).toString('hex')` — secreto que el claim entrante tiene que traer. */
  claimAuth: string
}

let slot: SpareSlot | null = null
let enabled = false
let prewarmInFlight = false
/** ant 4644.js `ne()` — instante del último exit de un repuesto sin claim; gate de `SPARE_REFILL_MIN_GAP_MS`. */
let lastExitAt = 0

export function isSparePoolEnabled(): boolean {
  return enabled
}

export function enableSparePool(): void {
  if (enabled) return
  enabled = true
  logEvent('tengu_bg_spare_enable', { max_spare: '1' })
}

/**
 * Returns the current spare slot snapshot (or null). Used by daemon
 * dispatch to decide claim vs fresh spawn.
 */
export function getSpareSlot(): SpareSlot | null {
  return slot ? { ...slot } : null
}

/**
 * Try to claim the current spare for `cwd`. Returns the slot's
 * `short` if cwd matches and slot is ready, else { ok:false, reason }.
 *
 * On successful claim: clear slot (single-slot design — claim consumes
 * the spare; pre-warm scheduler will spawn the next on idle).
 *
 * The actual ctrl-frame send is done by the daemon's `sendclaim` op
 * after this returns ok — this fn just reserves the slot.
 */
export function claimSpare(cwd: string): { ok: false; reason: string } | { ok: true; short: string; sessionId: string; ptySocket: string; claimAuth: string } {
  if (!enabled || !slot) {
    logEvent('tengu_bg_spare_claim_fail', { reason: 'no-spare' })
    return { ok: false, reason: 'no-spare' }
  }
  if (!slot.ready) {
    logEvent('tengu_bg_spare_claim_fail', { reason: 'not-ready', short: slot.short })
    return { ok: false, reason: 'not-ready' }
  }
  if (slot.cwd !== cwd) {
    logEvent('tengu_bg_spare_claim_fail', { reason: 'cwd-mismatch', spare_cwd: slot.cwd, want_cwd: cwd })
    return { ok: false, reason: 'cwd-mismatch' }
  }
  const claimed = { short: slot.short, sessionId: slot.sessionId, ptySocket: slot.ptySocket, claimAuth: slot.claimAuth }
  logEvent('tengu_bg_spare_claim', { short: slot.short, age_ms: String(Date.now() - slot.spawnedAt) })
  slot = null
  return { ok: true, ...claimed }
}

/**
 * Mark a freshly-spawned spare worker as the current slot. Caller is
 * the daemon's pre-warm scheduler. Returns false if a spare already
 * exists.
 */
export function recordSpareSpawn(
  short: string,
  cwd: string,
  sessionId: string,
  ptySocket: string,
  claimAuth: string = randomBytes(16).toString('hex'),
): boolean {
  if (!enabled) return false
  if (slot) return false
  slot = { short, cwd, sessionId, ptySocket, spawnedAt: Date.now(), ready: false, claimAuth }
  logEvent('tengu_bg_spare_spawn', { short, cwd, sessionId })
  return true
}

/**
 * Mark the spare ready (called when worker's first 'hello' ctrl-frame
 * comes back, indicating REPL is bootstrapped and waiting). Until ready,
 * claim returns 'not-ready' so we don't race against an unbooted worker.
 */
export function markSpareReady(short: string): void {
  if (slot && slot.short === short) {
    slot.ready = true
  }
}

/** Drop the recorded spare without claim (e.g. on shutdown). */
export function clearSpare(): void {
  slot = null
}

/**
 * Pre-warm scheduler tick — call from daemon idle loop (e.g. every 30s).
 * Returns whether a spare should be spawned now. `now` es inyectable para
 * pruebas deterministas del hueco mínimo de `SPARE_REFILL_MIN_GAP_MS`.
 */
export function shouldPrewarm(now: number = Date.now()): boolean {
  return enabled && !slot && !prewarmInFlight && now - lastExitAt >= SPARE_REFILL_MIN_GAP_MS
}

export function setPrewarmInFlight(v: boolean): void {
  prewarmInFlight = v
}

/**
 * ant 4644.js `ne()` — registra que un repuesto salió sin ser reclamado
 * (spawn fallido o proceso muerto), para que `shouldPrewarm` no reintente
 * en tight-loop antes de `SPARE_REFILL_MIN_GAP_MS`. La referencia usa
 * `zNe` (12s) en vez de `cr` cuando hay un lanzador propio configurado
 * (`lu().length>0`) — pendiente: `@thyrox/daemon` no tiene hoy el
 * concepto de lanzador de repuesto configurable, así que siempre se usa
 * `SPARE_REFILL_MIN_GAP_MS`.
 */
export function recordSpareExit(now: number = Date.now()): void {
  lastExitAt = now
}

/** Test helper. */
export function _resetSparePoolForTest(): void {
  slot = null
  enabled = false
  prewarmInFlight = false
  lastExitAt = 0
}
