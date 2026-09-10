/**
 * Puerto de `ccnmt: packages/local-observability/src/aggregates/queryProfiler.ts`
 * (301 líneas fuente, 100 % portado). Utilidad de perfilado de query para
 * medir y reportar el tiempo en el pipeline de query desde el input del
 * usuario hasta la llegada del primer token. Habilitar con
 * `CLAUDE_CODE_PROFILE_QUERY=1`.
 *
 * Sustituidos localmente (`internal/pendingCrossPackageDeps.ts`):
 * `getPerformance`/`formatMs`/`formatTimelineLine` — de
 * `app-host/startup/profilerBase.js`, subpath no exportado.
 */

import { logForDebugging } from '../debug.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import {
  formatMs,
  formatTimelineLine,
  getPerformance,
} from '../internal/pendingCrossPackageDeps.js'

// Estado a nivel de módulo — inicializado una vez al cargar el módulo.
const ENABLED = isEnvTruthy(process.env.CLAUDE_CODE_PROFILE_QUERY)

// Rastrea snapshots de memoria por separado (perf_hooks no rastrea memoria).
const memorySnapshots = new Map<string, NodeJS.MemoryUsage>()

// Rastrea el conteo de queries para el reporte.
let queryCount = 0

// Rastrea el tiempo del primer token recibido, por separado, para el resumen.
let firstTokenTime: number | null = null

/** Inicia el perfilado de una nueva sesión de query. */
export function startQueryProfile(): void {
  if (!ENABLED) return

  const perf = getPerformance()

  perf.clearMarks()
  memorySnapshots.clear()
  firstTokenTime = null

  queryCount++

  queryCheckpoint('query_user_input_received')
}

/** Registra un checkpoint con el nombre dado. */
export function queryCheckpoint(name: string): void {
  if (!ENABLED) return

  const perf = getPerformance()
  perf.mark(name)
  memorySnapshots.set(name, process.memoryUsage())

  // Rastrea el primer token especialmente.
  if (name === 'query_first_chunk_received' && firstTokenTime === null) {
    const marks = perf.getEntriesByType('mark')
    if (marks.length > 0) {
      const lastMark = marks[marks.length - 1]
      firstTokenTime = lastMark?.startTime ?? 0
    }
  }
}

/** Termina la sesión de perfilado de query actual. */
export function endQueryProfile(): void {
  if (!ENABLED) return

  queryCheckpoint('query_profile_end')
}

/** Identifica operaciones lentas (> 100ms de delta). */
function getSlowWarning(deltaMs: number, name: string): string {
  // No marca el primer checkpoint como lento — mide el tiempo desde el
  // inicio del proceso, no overhead de procesamiento real.
  if (name === 'query_user_input_received') {
    return ''
  }

  if (deltaMs > 1000) {
    return ` ⚠️  VERY SLOW`
  }
  if (deltaMs > 100) {
    return ` ⚠️  SLOW`
  }

  // Advertencias específicas para cuellos de botella conocidos.
  if (name.includes('git_status') && deltaMs > 50) {
    return ' ⚠️  git status'
  }
  if (name.includes('tool_schema') && deltaMs > 50) {
    return ' ⚠️  tool schemas'
  }
  if (name.includes('client_creation') && deltaMs > 50) {
    return ' ⚠️  client creation'
  }

  return ''
}

/** Obtiene un reporte formateado de todos los checkpoints del query actual/último. */
function getQueryProfileReport(): string {
  if (!ENABLED) {
    return 'Query profiling not enabled (set CLAUDE_CODE_PROFILE_QUERY=1)'
  }

  const perf = getPerformance()
  const marks = perf.getEntriesByType('mark')
  if (marks.length === 0) {
    return 'No query profiling checkpoints recorded'
  }

  const lines: string[] = []
  lines.push('='.repeat(80))
  lines.push(`QUERY PROFILING REPORT - Query #${queryCount}`)
  lines.push('='.repeat(80))
  lines.push('')

  // Usa el primer marcador como línea base (tiempo de inicio del query)
  // para mostrar tiempos relativos.
  const baselineTime = marks[0]?.startTime ?? 0
  let prevTime = baselineTime
  let apiRequestSentTime = 0
  let firstChunkTime = 0

  for (const mark of marks) {
    const relativeTime = mark.startTime - baselineTime
    const deltaMs = mark.startTime - prevTime
    lines.push(
      formatTimelineLine(
        relativeTime,
        deltaMs,
        mark.name,
        memorySnapshots.get(mark.name),
        10,
        9,
        getSlowWarning(deltaMs, mark.name),
      ),
    )

    if (mark.name === 'query_api_request_sent') {
      apiRequestSentTime = relativeTime
    }
    if (mark.name === 'query_first_chunk_received') {
      firstChunkTime = relativeTime
    }

    prevTime = mark.startTime
  }

  const lastMark = marks[marks.length - 1]
  const totalTime = lastMark ? lastMark.startTime - baselineTime : 0

  lines.push('')
  lines.push('-'.repeat(80))

  if (firstChunkTime > 0) {
    const preRequestOverhead = apiRequestSentTime
    const networkLatency = firstChunkTime - apiRequestSentTime
    const preRequestPercent = (
      (preRequestOverhead / firstChunkTime) *
      100
    ).toFixed(1)
    const networkPercent = ((networkLatency / firstChunkTime) * 100).toFixed(1)

    lines.push(`Total TTFT: ${formatMs(firstChunkTime)}ms`)
    lines.push(
      `  - Pre-request overhead: ${formatMs(preRequestOverhead)}ms (${preRequestPercent}%)`,
    )
    lines.push(
      `  - Network latency: ${formatMs(networkLatency)}ms (${networkPercent}%)`,
    )
  } else {
    lines.push(`Total time: ${formatMs(totalTime)}ms`)
  }

  lines.push(getPhaseSummary(marks, baselineTime))

  lines.push('='.repeat(80))

  return lines.join('\n')
}

/** Obtiene el resumen por fases mostrando el tiempo en cada fase principal. */
function getPhaseSummary(
  marks: Array<{ name: string; startTime: number }>,
  baselineTime: number,
): string {
  const phases: Array<{ name: string; start: string; end: string }> = [
    {
      name: 'Context loading',
      start: 'query_context_loading_start',
      end: 'query_context_loading_end',
    },
    {
      name: 'Microcompact',
      start: 'query_microcompact_start',
      end: 'query_microcompact_end',
    },
    {
      name: 'Autocompact',
      start: 'query_autocompact_start',
      end: 'query_autocompact_end',
    },
    { name: 'Query setup', start: 'query_setup_start', end: 'query_setup_end' },
    {
      name: 'Tool schemas',
      start: 'query_tool_schema_build_start',
      end: 'query_tool_schema_build_end',
    },
    {
      name: 'Message normalization',
      start: 'query_message_normalization_start',
      end: 'query_message_normalization_end',
    },
    {
      name: 'Client creation',
      start: 'query_client_creation_start',
      end: 'query_client_creation_end',
    },
    {
      name: 'Network TTFB',
      start: 'query_api_request_sent',
      end: 'query_first_chunk_received',
    },
    {
      name: 'Tool execution',
      start: 'query_tool_execution_start',
      end: 'query_tool_execution_end',
    },
  ]

  const markMap = new Map(marks.map(m => [m.name, m.startTime - baselineTime]))

  const lines: string[] = []
  lines.push('')
  lines.push('PHASE BREAKDOWN:')

  for (const phase of phases) {
    const startTime = markMap.get(phase.start)
    const endTime = markMap.get(phase.end)

    if (startTime !== undefined && endTime !== undefined) {
      const duration = endTime - startTime
      const bar = '█'.repeat(Math.min(Math.ceil(duration / 10), 50))
      lines.push(
        `  ${phase.name.padEnd(22)} ${formatMs(duration).padStart(10)}ms ${bar}`,
      )
    }
  }

  const apiRequestSent = markMap.get('query_api_request_sent')
  if (apiRequestSent !== undefined) {
    lines.push('')
    lines.push(
      `  ${'Total pre-API overhead'.padEnd(22)} ${formatMs(apiRequestSent).padStart(10)}ms`,
    )
  }

  return lines.join('\n')
}

/** Loguea el reporte de perfilado de query a la salida de debug. */
export function logQueryProfileReport(): void {
  if (!ENABLED) return
  logForDebugging(getQueryProfileReport())
}
