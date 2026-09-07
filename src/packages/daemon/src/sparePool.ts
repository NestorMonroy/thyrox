/**
 * Pool de worker de repuesto — puerto completo de `ant 4644.js`.
 *
 * Diseño de un solo slot: a lo sumo un worker de repuesto pre-calentado
 * por daemon. En `dispatch`, se intenta reclamar → se manda una trama de
 * control 'claim' al socket PTY del repuesto con la intención del usuario
 * → se reescribe su state.json con la intención + cwd reales. Si el claim
 * falla, se cae al spawn nuevo.
 *
 * El scheduler de pre-calentamiento corre cuando el daemon está inactivo
 * (sin despachos pendientes en vuelo): genera un repuesto con la plantilla
 * `--bg-pty -- bg` + un sessionId placeholder, marca
 * `EKH = { jobId, sessionId, cwd, ready: false }`.
 *
 * Gate: CLAUDE_CODE_BG_SPARE_POOL=1 (default OFF — ahorra los recursos
 * inactivos del usuario a menos que opte explícitamente).
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/sparePool.ts`.
 */

import { logEvent } from './internal/pendingCrossPackageDeps.js'

interface SpareSlot {
  short: string
  cwd: string
  sessionId: string
  ptySocket: string
  spawnedAt: number
  ready: boolean
}

let slot: SpareSlot | null = null
let enabled = false
let prewarmInFlight = false

export function isSparePoolEnabled(): boolean {
  return enabled
}

export function enableSparePool(): void {
  if (enabled) return
  enabled = true
  logEvent('tengu_bg_spare_enable', { max_spare: '1' })
}

/**
 * Devuelve el snapshot del slot de repuesto actual (o null). Lo usa el
 * dispatch del daemon para decidir claim vs spawn nuevo.
 */
export function getSpareSlot(): SpareSlot | null {
  return slot ? { ...slot } : null
}

/**
 * Intenta reclamar el repuesto actual para `cwd`. Devuelve el `short` del
 * slot si el cwd coincide y el slot está listo, si no `{ ok:false, reason }`.
 *
 * Al reclamar con éxito: limpia el slot (diseño de un solo slot — el claim
 * consume el repuesto; el scheduler de pre-calentamiento generará el
 * siguiente al quedar inactivo).
 *
 * El envío real de la trama de control lo hace el op `sendclaim` del
 * daemon tras que esta función devuelva ok — esta función sólo reserva el
 * slot.
 */
export function claimSpare(cwd: string): { ok: false; reason: string } | { ok: true; short: string; sessionId: string; ptySocket: string } {
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
  const claimed = { short: slot.short, sessionId: slot.sessionId, ptySocket: slot.ptySocket }
  logEvent('tengu_bg_spare_claim', { short: slot.short, age_ms: String(Date.now() - slot.spawnedAt) })
  slot = null
  return { ok: true, ...claimed }
}

/**
 * Marca un worker de repuesto recién generado como el slot actual. El
 * llamador es el scheduler de pre-calentamiento del daemon. Devuelve false
 * si ya existe un repuesto.
 */
export function recordSpareSpawn(short: string, cwd: string, sessionId: string, ptySocket: string): boolean {
  if (!enabled) return false
  if (slot) return false
  slot = { short, cwd, sessionId, ptySocket, spawnedAt: Date.now(), ready: false }
  logEvent('tengu_bg_spare_spawn', { short, cwd, sessionId })
  return true
}

/**
 * Marca el repuesto como listo (se llama cuando la primera trama de
 * control 'hello' del worker vuelve, indicando que el REPL ya arrancó y
 * espera). Hasta estar listo, el claim devuelve 'not-ready' para no correr
 * contra un worker sin arrancar todavía.
 */
export function markSpareReady(short: string): void {
  if (slot && slot.short === short) {
    slot.ready = true
  }
}

/** Descarta el repuesto registrado sin claim (p. ej. al apagar). */
export function clearSpare(): void {
  slot = null
}

/**
 * Tick del scheduler de pre-calentamiento — llamar desde el loop de
 * inactividad del daemon (p. ej. cada 30s). Devuelve si un repuesto debería
 * generarse ahora.
 */
export function shouldPrewarm(): boolean {
  return enabled && !slot && !prewarmInFlight
}

export function setPrewarmInFlight(v: boolean): void {
  prewarmInFlight = v
}

/** Helper de test. */
export function _resetSparePoolForTest(): void {
  slot = null
  enabled = false
  prewarmInFlight = false
}
