/**
 * LoopDynamic core — porte de
 * `ccnmt: packages/agent/internal/loopDynamicCore.ts` (port de ant
 * v2.1.123, resplit/2551.js, `VS1`).
 *
 * `scheduleLoopWakeup(delaySeconds, prompt, reason)` es el único punto
 * de entrada que invoca ScheduleWakeupTool. Cada llamada:
 *   1. Cancela cualquier cron de sesión existente con el mismo
 *      `prompt` (para que el modelo pueda re-espaciarse libremente sin
 *      acumular duplicados).
 *   2. Trackea la edad del loop por prompt en un reloj de cadena para
 *      que los loops no puedan correr para siempre — a
 *      `recurringMaxAgeMs` (default 7 días) se rehúsa y emite un
 *      evento de telemetría para que el modelo sepa que debe parar.
 *   3. Acota el retraso a [60, 3600] s, alinea la hora objetivo al
 *      próximo minuto entero, y la ajusta lejos de la marca de los 5
 *      minutos para mantener sana la ventana de pre-calentamiento de
 *      caché.
 *   4. Genera una expresión cron de 5 campos que hace match con el
 *      minuto objetivo y agrega una tarea de cron de sesión con
 *      `kind: 'loop'`.
 *
 * `cancelAllPendingLoopSessionCrons()` se invoca desde la ruta de
 * abort para que un loop interrumpido no siga disparando después de
 * que el usuario mata el turno.
 *
 * DIVERGENCIA DE ALCANCE, declarada, en dos ejes:
 *
 *   1. `logEvent` se importa de `./logging.ts` — porte ya existente en
 *      este árbol del `@claude-code-how-works/local-observability` de
 *      la fuente — en vez de importarlo directo de ese paquete
 *      ausente.
 *
 *   2. Las siete funciones de
 *      `@claude-code-how-works/app-host/bootstrap/state.js`
 *      (`addSessionCronTask`, `deleteLoopChainStartedAt`,
 *      `getLoopChainStartedAt`, `getSessionCronTasks`,
 *      `removeSessionCronTasks`, `setLoopChainStartedAt`,
 *      `setScheduledTasksEnabled`) no viven en este árbol (monorepo de
 *      32 paquetes, fuera de alcance) — se reproducen aquí, LOCALES y
 *      PRIVADAS, como un almacén en memoria con la misma forma
 *      (`SessionCronTask` con id/cron/prompt/createdAt/kind;
 *      `LoopChainState` con startedAt/lastScheduledFor/agedOut). No son
 *      no-ops: son una implementación real y acotada a esta sesión de
 *      proceso — lo que `scheduleLoopWakeup`/
 *      `cancelAllPendingLoopSessionCrons` necesitan para ser correctos,
 *      no sólo para existir. Ningún test portado las ejercita
 *      directamente (el test de origen sólo importa las dos
 *      constantes y fija el resto vía pines de fuente contra el texto
 *      del archivo), pero el módulo entero SÍ debe cargar para que ese
 *      import real resuelva.
 */

import { logEvent } from './logging.ts'
import { getCronJitterConfig } from '../misc/cronJitterConfig.ts'

export const MIN_LOOP_DELAY_SECONDS = 60
export const MAX_LOOP_DELAY_SECONDS = 3600
const FIVE_MINUTES_MS = 5 * 60 * 1000

export type ScheduleResult = {
  scheduledFor: number
  clampedDelaySeconds: number
  wasClamped: boolean
}

// ── Stand-in local de app-host/bootstrap/state.js (session cron store) ──

type SessionCronTask = {
  id: string
  cron: string
  prompt: string
  createdAt: number
  kind: string
  [key: string]: unknown
}

type LoopChainState = {
  startedAt: number
  lastScheduledFor: number
  agedOut?: boolean
}

const sessionCronTasks: SessionCronTask[] = []
const loopChainStartedAt = new Map<string, LoopChainState>()

function getSessionCronTasks(): SessionCronTask[] {
  return sessionCronTasks
}

function addSessionCronTask(task: SessionCronTask): void {
  sessionCronTasks.push(task)
}

function removeSessionCronTasks(ids: readonly string[]): number {
  const idSet = new Set(ids)
  let removed = 0
  for (let i = sessionCronTasks.length - 1; i >= 0; i--) {
    if (idSet.has(sessionCronTasks[i]!.id)) {
      sessionCronTasks.splice(i, 1)
      removed++
    }
  }
  return removed
}

function getLoopChainStartedAt(prompt: string): LoopChainState | undefined {
  return loopChainStartedAt.get(prompt)
}

function setLoopChainStartedAt(prompt: string, state: LoopChainState): void {
  loopChainStartedAt.set(prompt, state)
}

function deleteLoopChainStartedAt(prompt: string): void {
  loopChainStartedAt.delete(prompt)
}

let scheduledTasksEnabled = false

function setScheduledTasksEnabled(enabled: boolean): void {
  scheduledTasksEnabled = enabled
}

/**
 * Redondea un Date hacia adelante al próximo minuto entero. Se usa para
 * que la cadena cron generada haga match con la hora de despertar que
 * el usuario espera.
 */
function alignToNextMinute(targetMs: number): number {
  const d = new Date(targetMs)
  if (d.getSeconds() > 0 || d.getMilliseconds() > 0) {
    d.setMinutes(d.getMinutes() + 1)
  }
  d.setSeconds(0, 0)
  return d.getTime()
}

/**
 * Calcula la hora real de despertar. Algoritmo idéntico al `VS1()` de
 * ant:
 *   - acota delaySeconds a [60, 3600]
 *   - target = ahora + acotado*1000
 *   - alinea al próximo minuto entero
 *   - si cacheLeadMs > 0 y seguimos dentro de la ventana de caché de 5
 *     minutos, retrocede el objetivo un minuto a la vez hasta salir de
 *     la zona de adelanto (sin bajar del piso de 60s). Esto evita
 *     agendar exactamente en la expiración de caché, donde cada
 *     despertar paga un cache miss fresco.
 */
function computeWakeupTarget(delaySeconds: number): {
  clamped: number
  wasClamped: boolean
  targetMs: number
  createdAt: number
  target: Date
} {
  let raw: number
  if (Number.isNaN(delaySeconds)) {
    raw = MIN_LOOP_DELAY_SECONDS
  } else if (delaySeconds === Infinity) {
    raw = MAX_LOOP_DELAY_SECONDS
  } else if (delaySeconds === -Infinity) {
    raw = MIN_LOOP_DELAY_SECONDS
  } else {
    raw = Math.round(delaySeconds)
  }
  const clamped = Math.max(
    MIN_LOOP_DELAY_SECONDS,
    Math.min(MAX_LOOP_DELAY_SECONDS, raw),
  )
  const wasClamped = !Number.isFinite(delaySeconds) || raw !== clamped
  const now = Date.now()
  const naiveTargetMs = now + clamped * 1000
  let alignedMs = alignToNextMinute(naiveTargetMs)
  const cacheLeadMs = getCronJitterConfig().cacheLeadMs ?? 0
  if (cacheLeadMs > 0 && clamped * 1000 <= FIVE_MINUTES_MS) {
    const safeWindow = FIVE_MINUTES_MS - cacheLeadMs
    while (
      alignedMs - now > safeWindow &&
      alignedMs - 60_000 >= now + MIN_LOOP_DELAY_SECONDS * 1000
    ) {
      alignedMs -= 60_000
    }
  }
  const target = new Date(alignedMs)
  // createdAt: justo antes del objetivo alineado para que el tick del
  // cron lo reconozca como una tarea nueva, nunca disparada, en su
  // primer barrido.
  const createdAt = naiveTargetMs < alignedMs ? naiveTargetMs : alignedMs - 1
  return {
    clamped,
    wasClamped,
    targetMs: alignedMs,
    createdAt,
    target,
  }
}

function makeLoopShortId(): string {
  return Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0')
}

/**
 * Cancela cualquier cron de loop existente con el mismo prompt. El
 * scheduler de cron no soporta edición in-place, así que re-agendar
 * significa cancelar + re-agregar.
 */
function cancelLoopCronsForPrompt(prompt: string): void {
  const existing = getSessionCronTasks()
    .filter(t => t.kind === 'loop' && t.prompt === prompt)
    .map(t => t.id)
  if (existing.length > 0) removeSessionCronTasks(existing)
}

export function scheduleLoopWakeup(
  delaySeconds: number,
  prompt: string,
  reason: string | undefined,
): ScheduleResult | null {
  cancelLoopCronsForPrompt(prompt)

  const now = Date.now()
  const existing = getLoopChainStartedAt(prompt)
  // Si la cadena estuvo en silencio más allá de MAX_LOOP_DELAY_SECONDS,
  // se trata como un arranque fresco. Si no, se conserva el startedAt
  // original para que el tope de edad se honre a través de los
  // re-agendados.
  const isStaleChain =
    existing !== undefined &&
    now > existing.lastScheduledFor + MAX_LOOP_DELAY_SECONDS * 1000
  const startedAt =
    existing === undefined || isStaleChain ? now : existing.startedAt

  const { recurringMaxAgeMs } = getCronJitterConfig()
  if (recurringMaxAgeMs > 0 && now - startedAt >= recurringMaxAgeMs) {
    if (!existing?.agedOut) {
      setLoopChainStartedAt(prompt, {
        startedAt,
        lastScheduledFor:
          now - (MAX_LOOP_DELAY_SECONDS - MIN_LOOP_DELAY_SECONDS) * 1000,
        agedOut: true,
      })
      logEvent('tengu_loop_dynamic_wakeup_aged_out', {
        loop_age_ms: now - startedAt,
        max_age_ms: recurringMaxAgeMs,
      })
    }
    return null
  }

  const { clamped, wasClamped, targetMs, createdAt, target } =
    computeWakeupTarget(delaySeconds)
  const cron = `${target.getMinutes()} ${target.getHours()} * * *`

  addSessionCronTask({
    id: makeLoopShortId(),
    cron,
    prompt,
    createdAt,
    kind: 'loop',
  })
  setLoopChainStartedAt(prompt, { startedAt, lastScheduledFor: targetMs })
  setScheduledTasksEnabled(true)

  logEvent('tengu_loop_dynamic_wakeup_scheduled', {
    chosen_delay_seconds: Number.isFinite(delaySeconds) ? delaySeconds : 0,
    clamped_delay_seconds: clamped,
    was_clamped: wasClamped,
    reason: reason !== undefined ? reason.slice(0, 200) : undefined,
  })

  return {
    scheduledFor: targetMs,
    clampedDelaySeconds: clamped,
    wasClamped,
  }
}

/**
 * Elimina toda tarea de cron de sesión pendiente con `kind: 'loop'`.
 * Conectada a la ruta de abort para que un turno cancelado no siga
 * disparando el loop. También limpia las entradas de
 * loopChainStartedAt para que un loop re-armado arranque fresco.
 */
export function cancelAllPendingLoopSessionCrons(): number {
  const loopCrons = getSessionCronTasks().filter(t => t.kind === 'loop')
  if (loopCrons.length === 0) return 0
  removeSessionCronTasks(loopCrons.map(t => t.id))
  for (const t of loopCrons) deleteLoopChainStartedAt(t.prompt)
  return loopCrons.length
}

export function isLoopDynamicEnabled(): boolean {
  // Importado de forma perezosa para evitar una dependencia top-level
  // en feature-flags desde el barrel del paquete `agent` — feature-flags
  // trae growthbook + schemas zod, pesado en relación a este módulo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFeatureValue_CACHED_MAY_BE_STALE } = require(
    '@claude-code-how-works/config/feature-flags',
  ) as typeof import('@claude-code-how-works/config/feature-flags')
  return getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_kairos_loop_dynamic',
    false,
  )
}
