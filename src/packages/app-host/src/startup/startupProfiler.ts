// Adaptación de @claude-code-how-works/app-host: src/startup/startupProfiler.ts.
// Capa 1 (con cita a `node:path`, `node:os`, `node:fs`, `node:perf_hooks` —
// no son paquete hermano) — porte PARCIAL declarado.
//
// Tres dependencias de la fuente citan paquetes hermanos que no existen en
// este árbol, y se resuelven así:
//
// 1. `getSessionId()` (de `../bootstrap/state.js`) — ese símbolo no está
//    exportado todavía por nuestro `bootstrap/state.ts` (medido:
//    `grep -n getSessionId bootstrap/state.ts` → sin resultados). Se
//    parametriza: `getStartupPerfLogPath`/`profileReport` reciben el id de
//    sesión como argumento en vez de resolverlo internamente. Cuando
//    `bootstrap/state.ts` exporte `getSessionId`, el llamador lo provee.
// 2. `logEvent`/`AnalyticsMetadata_*` (de
//    `@claude-code-how-works/local-observability`) — paquete ausente
//    entero. El sumidero de telemetría se recibe como colaborador
//    inyectable (`TelemetrySink`), con un default no-op documentado. La
//    forma del cálculo (parear checkpoints, medir duraciones de fase) es
//    la misma; lo que cambia es a dónde se emite.
// 3. `getFsImplementation()`/`writeFileSync` (de
//    `@claude-code-how-works/storage/fsOperations.js` y
//    `.../local-observability/slowOperations.js`) — se usa `node:fs`
//    directo (`mkdirSync` + `writeFileSync`), que es lo que esos wrappers
//    hacen por debajo para el caso simple de escribir un reporte de texto.
// 4. `logForDebugging` (de `.../local-observability/debug.js`) — se recibe
//    como colaborador inyectable (`DebugSink`), default no-op.
// 5. `isEnvTruthy`/`getClaudeConfigHomeDir` (de
//    `@claude-code-how-works/config/env/utils`) se reimplementan
//    localmente, verbatim de
//    `ccnmt: packages/config/env/utils.ts:20-27,43-48` — salvo que
//    `getClaudeConfigHomeDir` pierde el memoize de `lodash-es/memoize`
//    (paquete no confirmado en este árbol); a este costo (una
//    normalización NFC por llamada) no le compensa fabricar un cache.
//
// `resetProfilerStateForTests` es nuevo: no existe en la fuente. Las tres
// banderas de módulo (`DETAILED_PROFILING`, `STATSIG_LOGGING_SAMPLED`,
// `reported`) son "decididas una vez al cargar el módulo" por diseño — la
// fuente lo declara así explícitamente — y sin un reset ningún test
// posterior al primero puede ejercitar una configuración distinta.

import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { mkdirSync, writeFileSync as writeFileSyncNode } from 'node:fs'
import { formatMs, formatTimelineLine, getPerformance } from './profilerBase.js'

function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

function getClaudeConfigHomeDir(): string {
  return (process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')).normalize('NFC')
}

export type TelemetrySink = (event: string, metadata: Record<string, unknown>) => void
export type DebugSink = (message: string) => void

const noopTelemetrySink: TelemetrySink = () => {}
const noopDebugSink: DebugSink = () => {}

// Estado a nivel de módulo — decidido una vez al cargar, igual que la
// fuente. `resetProfilerStateForTests` lo re-evalúa para tests.
// eslint-disable-next-line custom-rules/no-process-env-top-level
let DETAILED_PROFILING = isEnvTruthy(process.env.CLAUDE_CODE_PROFILE_STARTUP)

const STATSIG_SAMPLE_RATE = 0.005
// eslint-disable-next-line custom-rules/no-process-env-top-level
let STATSIG_LOGGING_SAMPLED =
  process.env.USER_TYPE === 'ant' || Math.random() < STATSIG_SAMPLE_RATE

function shouldProfile(): boolean {
  return DETAILED_PROFILING || STATSIG_LOGGING_SAMPLED
}

// Snapshots de memoria por separado (perf_hooks no rastrea memoria). Sólo
// se usa cuando DETAILED_PROFILING está habilitado. Es un arreglo que se
// apenda en el mismo orden que las llamadas a perf.mark(), de modo que
// memorySnapshots[i] corresponde a getEntriesByType('mark')[i]. Un Map por
// nombre de checkpoint sería incorrecto porque algunos checkpoints
// disparan más de una vez.
let memorySnapshots: NodeJS.MemoryUsage[] = []

// Definiciones de fase para el log de Statsig: [checkpointInicio, checkpointFin]
const PHASE_DEFINITIONS = {
  import_time: ['cli_entry', 'main_tsx_imports_loaded'],
  init_time: ['init_function_start', 'init_function_end'],
  settings_time: ['eagerLoadSettings_start', 'eagerLoadSettings_end'],
  total_time: ['cli_entry', 'main_after_run'],
} as const

if (shouldProfile()) {
  profileCheckpoint('profiler_initialized')
}

/** Registra un checkpoint con el nombre dado. */
export function profileCheckpoint(name: string): void {
  if (!shouldProfile()) return

  const perf = getPerformance()
  perf.mark(name)

  if (DETAILED_PROFILING) {
    memorySnapshots.push(process.memoryUsage())
  }
}

/**
 * Reporte formateado de todos los checkpoints. Sólo disponible cuando
 * DETAILED_PROFILING está habilitado.
 */
function getReport(): string {
  if (!DETAILED_PROFILING) {
    return 'Startup profiling not enabled'
  }

  const perf = getPerformance()
  const marks = perf.getEntriesByType('mark')
  if (marks.length === 0) {
    return 'No profiling checkpoints recorded'
  }

  const lines: string[] = []
  lines.push('='.repeat(80))
  lines.push('STARTUP PROFILING REPORT')
  lines.push('='.repeat(80))
  lines.push('')

  let prevTime = 0
  for (const [i, mark] of marks.entries()) {
    lines.push(
      formatTimelineLine(mark.startTime, mark.startTime - prevTime, mark.name, memorySnapshots[i], 8, 7),
    )
    prevTime = mark.startTime
  }

  const lastMark = marks[marks.length - 1]
  lines.push('')
  lines.push(`Total startup time: ${formatMs(lastMark?.startTime ?? 0)}ms`)
  lines.push('='.repeat(80))

  return lines.join('\n')
}

let reported = false

export type ProfileReportOptions = {
  /** Divergencia: la fuente resuelve esto con `getSessionId()`. */
  sessionId: string
  telemetrySink?: TelemetrySink
  debugSink?: DebugSink
}

export function profileReport(options: ProfileReportOptions): void {
  if (reported) return
  reported = true

  // Log a Statsig (muestreado: 100% ant, 0.5% externo)
  logStartupPerf(options.telemetrySink ?? noopTelemetrySink)

  // Reporte detallado si CLAUDE_CODE_PROFILE_STARTUP=1
  if (DETAILED_PROFILING) {
    const debugSink = options.debugSink ?? noopDebugSink
    const path = getStartupPerfLogPath(options.sessionId)
    const dir = dirname(path)
    mkdirSync(dir, { recursive: true })
    writeFileSyncNode(path, getReport(), { encoding: 'utf8', flush: true })

    debugSink('Startup profiling report:')
    debugSink(getReport())
  }
}

export function isDetailedProfilingEnabled(): boolean {
  return DETAILED_PROFILING
}

/** Divergencia: recibe `sessionId` — ver docstring del módulo, punto 1. */
export function getStartupPerfLogPath(sessionId: string): string {
  return join(getClaudeConfigHomeDir(), 'startup-perf', `${sessionId}.txt`)
}

/**
 * Registra las fases de rendimiento de arranque en el sumidero de
 * telemetría dado. Sólo registra si esta sesión fue muestreada al
 * arrancar. Divergencia: la fuente llama a `logEvent` directo; aquí se
 * recibe como colaborador inyectable (ver docstring del módulo, punto 2).
 */
export function logStartupPerf(telemetrySink: TelemetrySink = noopTelemetrySink): void {
  if (!STATSIG_LOGGING_SAMPLED) return

  const perf = getPerformance()
  const marks = perf.getEntriesByType('mark')
  if (marks.length === 0) return

  const checkpointTimes = new Map<string, number>()
  for (const mark of marks) {
    checkpointTimes.set(mark.name, mark.startTime)
  }

  const metadata: Record<string, number | undefined> = {}

  for (const [phaseName, [startCheckpoint, endCheckpoint]] of Object.entries(PHASE_DEFINITIONS)) {
    const startTime = checkpointTimes.get(startCheckpoint)
    const endTime = checkpointTimes.get(endCheckpoint)

    if (startTime !== undefined && endTime !== undefined) {
      metadata[`${phaseName}_ms`] = Math.round(endTime - startTime)
    }
  }

  metadata.checkpoint_count = marks.length

  telemetrySink('tengu_startup_perf', metadata)
}

/**
 * Reinicia el estado de módulo (banderas y snapshots). No existe en la
 * fuente — necesario porque `DETAILED_PROFILING`/`STATSIG_LOGGING_SAMPLED`/
 * `reported` son singletons de proceso (ver docstring del módulo).
 */
export function resetProfilerStateForTests(): void {
  // eslint-disable-next-line custom-rules/no-process-env-top-level
  DETAILED_PROFILING = isEnvTruthy(process.env.CLAUDE_CODE_PROFILE_STARTUP)
  // Sin el sorteo aleatorio de la fuente (Math.random() < STATSIG_SAMPLE_RATE):
  // un reset determinista no puede depender de un dado de 0.5%.
  STATSIG_LOGGING_SAMPLED = process.env.USER_TYPE === 'ant'
  reported = false
  memorySnapshots = []
  // `performance` es un singleton de todo el proceso (comentario propio de
  // la fuente) — sin limpiar sus marks, un test posterior heredaría los
  // checkpoints de los anteriores.
  getPerformance().clearMarks()
}
