/**
 * Máquina de fases del worker: guarda de transición, etiqueta de fase para
 * logs, y el clasificador de trabajo pendiente que la refina en adopción.
 *
 * Puerto fiel de `ant chunk-ygx717jg.js` (clase `g7`): `Pt` (guarda de
 * transición, invocada como `transitionTo`), `Qe` (etiqueta de fase), `Dt`
 * (settled/active/inflight/null), `Ze` (refinamiento en adopción) y `ye`
 * (trabajo en vuelo). `Hi`/`GR`/`ry` (`ant chunk-mxz6ht5b.js`) se inlinean
 * en `isSettledState`, que es lo único que `Dt`/`Ze`/`ye` necesitan de ese
 * chunk.
 *
 * `WorkerVm` es el único llamador de `isLegalPhaseTransition`/
 * `formatPhaseLabel` en este árbol: TODA asignación a `this.phase` pasa
 * por `WorkerVm#transitionTo`, que es la única asignación directa —
 * exactamente como en la referencia, donde `this.phase=e` vive UNA sola
 * vez, dentro de `transitionTo`.
 */

import type { WorkerPhase } from './bgWorkerRegistry.js'

/**
 * Tabla de transiciones legales. `ant chunk-ygx717jg.js` función `Pt`.
 * `retired` es un sumidero: ninguna transición sale de él, ni siquiera
 * hacia `retiring`/`retired` de nuevo — de ahí la guarda temprana antes
 * del switch, que por sí sola aceptaría cualquier destino `retiring`/
 * `retired` sin mirar el origen.
 */
export function isLegalPhaseTransition(current: WorkerPhase, next: WorkerPhase): boolean {
  if (current.kind === 'retired') return false
  switch (next.kind) {
    case 'spawning':
      return current.kind === 'upgrading' || current.kind === 'running'
    case 'running':
      return current.kind === 'spawning'
    case 'upgrading':
      return current.kind === 'running'
    case 'retiring':
    case 'retired':
      return true
  }
}

/**
 * Etiqueta de fase legible para logs — `ant chunk-ygx717jg.js` función
 * `Qe`. `retiring`/`retired` llevan su motivo/desenlace; el resto es el
 * `kind` tal cual.
 */
export function formatPhaseLabel(phase: WorkerPhase): string {
  if (phase.kind === 'retiring') return `retiring:${phase.reason}`
  if (phase.kind === 'retired') return `retired:${phase.outcome}`
  return phase.kind
}

/**
 * Subconjunto mínimo del `WorkerStateFile` (`./classifier/state.ts`) que
 * el clasificador de trabajo pendiente necesita — `ant chunk-ygx717jg.js`,
 * parámetro `e` de `Dt`/`Ze`/`ye`. `inFlight` no existe hoy en
 * `WorkerStateFile` de este árbol: ningún llamador de este árbol produce
 * todavía esta forma completa — ver "pendiente" al final del archivo.
 */
export interface WorkerWorkState {
  state: string
  tempo: string
  inFlight?: {
    kinds?: readonly string[]
    queued?: number
    tasks?: number
    drainableMonitors?: number
  }
}

/**
 * Tipos de tarea que no cuentan como trabajo bloqueante en pie una vez el
 * worker está asentado. `ant chunk-ygx717jg.js` variable `tt`.
 */
export const DRAINABLE_TASK_KINDS: readonly string[] = [
  'local_bash',
  'in_process_teammate',
  'dream',
  'auto_mode_scan',
]

/**
 * True si el registro está en un estado terminal (done/failed/stopped) Y
 * su tempo no es activo. `ant chunk-mxz6ht5b.js`: `ry` mapea el estado a
 * un desenlace terminal o `null`, `GR` es `ry(e)!==null`, `Hi` añade el
 * descarte de tempo activo. Las tres se inlinean aquí porque `Dt`/`Ze`/`ye`
 * sólo consumen el resultado booleano de `Hi`.
 *
 * Nota: `crashed` — estado terminal de `WorkerState` en este árbol
 * (`classifier/state.ts` `TERMINAL_STATES`) — NO es terminal para `ry`;
 * la referencia sólo reconoce `done`/`failed`/`stopped`. Se porta tal cual,
 * sin ampliarlo: no es a esta pieza a la que le toca decidir si esa
 * divergencia entre `TERMINAL_STATES` y `ry` es intencional.
 */
export function isSettledState(e: WorkerWorkState): boolean {
  const terminal = e.state === 'done' || e.state === 'failed' || e.state === 'stopped'
  return terminal && e.tempo !== 'active'
}

/**
 * True si el worker tiene trabajo "en vuelo": cola no vacía, o tareas
 * activas no drenables (descontando monitores de `artifact_watch`) sin
 * estar asentado, o el tipo incluye `session_cron`. `ant
 * chunk-ygx717jg.js` función `ye`.
 */
export function hasInflightWork(e: WorkerWorkState): boolean {
  const drainableMonitors = e.inFlight?.drainableMonitors ?? 0
  const kinds = (e.inFlight?.kinds ?? []).filter(k => k !== 'artifact_watch' || !drainableMonitors)
  const allDrainable =
    isSettledState(e) && kinds.length > 0 && kinds.every(k => DRAINABLE_TASK_KINDS.includes(k))
  const netTasks = (e.inFlight?.tasks ?? 0) - drainableMonitors
  return (
    (e.inFlight?.queued ?? 0) > 0 ||
    (netTasks > 0 && !allDrainable) ||
    kinds.includes('session_cron')
  )
}

export type WorkerWorkStatus = 'settled' | 'active' | 'inflight' | null

/**
 * Clasifica el ciclo de vida del trabajo de un worker: `'settled'` si
 * `isSettledState`, `'active'` si `tempo==='active'`, `'inflight'` si
 * `hasInflightWork`, si no `null`. `ant chunk-ygx717jg.js` función `Dt`.
 */
export function classifyWorkerWork(e: WorkerWorkState | null | undefined): WorkerWorkStatus {
  if (!e) return null
  if (isSettledState(e)) return 'settled'
  if (e.tempo === 'active') return 'active'
  if (hasInflightWork(e)) return 'inflight'
  return null
}

/**
 * Refina `classifyWorkerWork` en el momento de adopción: si el registro
 * llegó `'settled'` pero la razón de adopción no fue `'missing-at-adopt'`
 * (el worker no estaba ausente cuando se adoptó), se recalcula por si
 * sigue habiendo trabajo en vuelo. `ant chunk-ygx717jg.js` función `Ze`.
 */
export function refineWorkerWorkOnAdopt(
  e: WorkerWorkState | null | undefined,
  adoptReason: string,
): WorkerWorkStatus {
  const status = classifyWorkerWork(e)
  if (status === 'settled' && adoptReason !== 'missing-at-adopt') {
    return e && hasInflightWork(e) ? 'inflight' : null
  }
  return status
}

/**
 * Ventana tras adoptar durante la que `retireIfSettled`/
 * `respawnIfIdleStale` no actúan sobre un worker recién adoptado. `ant
 * chunk-ygx717jg.js` variable `ze` = 120000.
 */
export const RECENT_ADOPT_GRACE_MS = 120_000

/**
 * Gracia antes de retirar un worker "vacío" (sin nombre/intent/
 * worktreePath) e inactivo. `ant chunk-ygx717jg.js` variable `bt` =
 * 300000.
 */
export const EMPTY_IDLE_GRACE_MS = 300_000

/**
 * Umbral de input reciente que impide respawnear un worker por versión
 * stale. `ant chunk-ygx717jg.js` variable `Ct` = 3600000.
 */
export const RECENT_INPUT_BUSY_MS = 3_600_000

// pendiente: `retireIfSettled`/`respawnIfIdleStale` (`ant
// chunk-ygx717jg.js`, clase `g7`) no se portan completos en esta tarea —
// dependen de `storageV5`/`Pr`/`Ir` (lectura async del WorkerStateFile por
// short), el objeto `dispatch` (source/launch.mode/worktreePath/
// createdAt/interactiveLineage), el spare pool, comparación de semver de
// `cliVersion` (`uJe`/`W1e`/`vQn`) e `isParkedIdleFork` — ninguno existe
// hoy en `WorkerVm`/`bgAdopt.ts`, y no es de esta tarea inventarlos (fuera
// de `src/packages/daemon/src/workerVm.ts` y `workerPhase.ts`, que son los
// dos únicos archivos que le pertenecen). Los tres timers fijos que SÍ
// usan esas dos funciones quedan portados arriba (RECENT_ADOPT_GRACE_MS,
// EMPTY_IDLE_GRACE_MS, RECENT_INPUT_BUSY_MS) para cuando esa tarea exista;
// el cuarto timer que aparece en la cola de `retireIfSettled` (`Fot` =
// 172800000, gracia de versión stale) vive en OTRO chunk
// (`chunk-mxz6ht5b.js`) y depende de la misma rama de semver no portada,
// así que no se declara aquí.
//
// pendiente: `refineWorkerWorkOnAdopt` (Ze) no tiene llamador en este
// árbol — sus dos sitios de uso reales en la referencia son el re-key de
// auth por mismatch (`rekeyForAuthMismatch`, offsets 30619 y 49596 de
// `chunk-ygx717jg.js`), no la adopción en `bgAdopt.ts` pese a lo que
// sugiere su nombre de tarea; ese re-key no está portado y `bgAdopt.ts` no
// es un archivo de esta tarea. `classifyWorkerWork`/`hasInflightWork`
// quedan como funciones puras listas para esa integración, con su propia
// cobertura de test directa.
