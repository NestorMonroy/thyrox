/**
 * Puerto de `ccnmt: packages/local-observability/src/aggregates/headlessProfiler.ts`
 * (178 líneas fuente, 100 % portado). Utilidad de perfilado en modo
 * headless para medir latencia por turno en modo -p (print).
 *
 * Sustituidos localmente (`internal/pendingCrossPackageDeps.ts`):
 * `getIsNonInteractiveSession` (app-host/bootstrap/state, subpath no
 * exportado — default `false`), `getPerformance` (app-host/startup/
 * profilerBase, ídem — sustituto usa `node:perf_hooks` directo, sin el
 * lazy-require que la fuente usaba para evitar el costo de CJS).
 */

import {
  getIsNonInteractiveSession,
  getPerformance,
} from '../internal/pendingCrossPackageDeps.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '../index.js'
import { logForDebugging } from '../debug.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { jsonStringify } from '../slowOperations.js'

// Modo de perfilado detallado — misma variable de entorno que startupProfiler.
const DETAILED_PROFILING = isEnvTruthy(process.env.CLAUDE_CODE_PROFILE_STARTUP)

// Muestreo para logging a Statsig: 100% ant, 5% externo.
// Decisión tomada una vez al cargar el módulo — usuarios no muestreados
// no pagan costo de perfilado.
const STATSIG_SAMPLE_RATE = 0.05
const STATSIG_LOGGING_SAMPLED =
  process.env.USER_TYPE === 'ant' || Math.random() < STATSIG_SAMPLE_RATE

// Habilita el perfilado si detallado O muestreado para Statsig.
const SHOULD_PROFILE = DETAILED_PROFILING || STATSIG_LOGGING_SAMPLED

// Prefijo único para no chocar con otros marcadores de perfilado.
const MARK_PREFIX = 'headless_'

// Rastrea el número de turno actual (autoincrementado por headlessProfilerStartTurn).
let currentTurnNumber = -1

/** Limpia todos los marcadores del perfilador headless de la línea de tiempo. */
function clearHeadlessMarks(): void {
  const perf = getPerformance()
  const allMarks = perf.getEntriesByType('mark')
  for (const mark of allMarks) {
    if (mark.name.startsWith(MARK_PREFIX)) {
      perf.clearMarks(mark.name)
    }
  }
}

/**
 * Inicia un nuevo turno para perfilado. Limpia marcadores previos,
 * incrementa el número de turno, y registra turn_start. Llamar al
 * comienzo de cada procesamiento de mensaje de usuario.
 */
export function headlessProfilerStartTurn(): void {
  if (!getIsNonInteractiveSession()) return
  if (!SHOULD_PROFILE) return

  currentTurnNumber++
  clearHeadlessMarks()

  const perf = getPerformance()
  perf.mark(`${MARK_PREFIX}turn_start`)

  if (DETAILED_PROFILING) {
    logForDebugging(`[headlessProfiler] Started turn ${currentTurnNumber}`)
  }
}

/**
 * Registra un checkpoint con el nombre dado.
 * Sólo registra si está en modo headless y el perfilado está habilitado.
 */
export function headlessProfilerCheckpoint(name: string): void {
  if (!getIsNonInteractiveSession()) return
  if (!SHOULD_PROFILE) return

  const perf = getPerformance()
  perf.mark(`${MARK_PREFIX}${name}`)

  if (DETAILED_PROFILING) {
    logForDebugging(
      `[headlessProfiler] Checkpoint: ${name} at ${perf.now().toFixed(1)}ms`,
    )
  }
}

/**
 * Loguea métricas de latencia headless del turno actual a Statsig.
 * Llamar al final de cada turno (antes de procesar el siguiente mensaje
 * de usuario).
 */
export function logHeadlessProfilerTurn(): void {
  if (!getIsNonInteractiveSession()) return
  if (!SHOULD_PROFILE) return

  const perf = getPerformance()
  const allMarks = perf.getEntriesByType('mark')

  const marks = allMarks.filter(mark => mark.name.startsWith(MARK_PREFIX))
  if (marks.length === 0) return

  const checkpointTimes = new Map<string, number>()
  for (const mark of marks) {
    const name = mark.name.slice(MARK_PREFIX.length)
    checkpointTimes.set(name, mark.startTime)
  }

  const turnStart = checkpointTimes.get('turn_start')
  if (turnStart === undefined) return

  const metadata: Record<string, number | string | undefined> = {
    turn_number: currentTurnNumber,
  }

  // Tiempo hasta el mensaje de sistema desde el inicio del proceso (sólo
  // significativo para el turno 0). Usa tiempo absoluto porque el
  // startTime de perf_hooks es relativo al inicio del proceso.
  const systemMessageTime = checkpointTimes.get('system_message_yielded')
  if (systemMessageTime !== undefined && currentTurnNumber === 0) {
    metadata.time_to_system_message_ms = Math.round(systemMessageTime)
  }

  // Tiempo hasta el inicio del query.
  const queryStartTime = checkpointTimes.get('query_started')
  if (queryStartTime !== undefined) {
    metadata.time_to_query_start_ms = Math.round(queryStartTime - turnStart)
  }

  // Tiempo hasta la primera respuesta (primer chunk de la API).
  const firstChunkTime = checkpointTimes.get('first_chunk')
  if (firstChunkTime !== undefined) {
    metadata.time_to_first_response_ms = Math.round(firstChunkTime - turnStart)
  }

  // Overhead del query (tiempo entre el inicio del query y el request enviado a la API).
  const apiRequestTime = checkpointTimes.get('api_request_sent')
  if (queryStartTime !== undefined && apiRequestTime !== undefined) {
    metadata.query_overhead_ms = Math.round(apiRequestTime - queryStartTime)
  }

  // Conteo de checkpoints, para debugging.
  metadata.checkpoint_count = marks.length

  // Entrypoint para segmentación (sdk-ts, sdk-py, sdk-cli, o undefined).
  if (process.env.CLAUDE_CODE_ENTRYPOINT) {
    metadata.entrypoint = process.env.CLAUDE_CODE_ENTRYPOINT
  }

  if (STATSIG_LOGGING_SAMPLED) {
    logEvent(
      'tengu_headless_latency',
      metadata as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    )
  }

  if (DETAILED_PROFILING) {
    logForDebugging(
      `[headlessProfiler] Turn ${currentTurnNumber} metrics: ${jsonStringify(metadata)}`,
    )
  }
}
