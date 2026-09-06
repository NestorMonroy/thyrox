// Adaptación de @claude-code-how-works/app-host: src/startup/profilerBase.ts.
// Capa 1 (con cita a `perf_hooks`, nativo de Node — no es paquete hermano).
//
// Infraestructura compartida por los módulos profiler (aquí sólo
// `startupProfiler`; la fuente también la comparte con `queryProfiler` y
// `headlessProfiler`, que no están en el alcance de este porte). `formatMs`
// y `formatTimelineLine` se portan verbatim. `getPerformance` idéntico salvo
// que ya no citamos `@claude-code-how-works/output/formatters` para
// `formatFileSize` — ese paquete no existe en este árbol — así que se
// reimplementa localmente, verbatim contra
// `ccnmt: packages/output/src/formatters/format.ts:10-24`.

import type { performance as PerformanceType } from 'node:perf_hooks'

// Carga perezosa de la API de perf_hooks — sólo si el profiling está
// habilitado. Compartida entre profilers: perf_hooks.performance es un
// singleton de proceso.
let performance: typeof PerformanceType | null = null

export function getPerformance(): typeof PerformanceType {
  if (!performance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    performance = require('node:perf_hooks').performance
  }
  return performance!
}

export function formatMs(ms: number): string {
  return ms.toFixed(3)
}

/**
 * Formatea un tamaño en bytes a la unidad más legible (bytes/KB/MB/GB),
 * con un decimal salvo que sea entero. Porte verbatim de
 * `ccnmt: packages/output/src/formatters/format.ts:10-24`.
 */
export function formatFileSize(sizeInBytes: number): string {
  const kb = sizeInBytes / 1024
  if (kb < 1) {
    return `${sizeInBytes} bytes`
  }
  if (kb < 1024) {
    return `${kb.toFixed(1).replace(/\.0$/, '')}KB`
  }
  const mb = kb / 1024
  if (mb < 1024) {
    return `${mb.toFixed(1).replace(/\.0$/, '')}MB`
  }
  const gb = mb / 1024
  return `${gb.toFixed(1).replace(/\.0$/, '')}GB`
}

/**
 * Renderiza una línea de la línea de tiempo compartida por los profilers:
 *   [+  total.ms] (+  delta.ms) name [extra] [| RSS: .., Heap: ..]
 *
 * totalPad/deltaPad controlan el ancho de padStart para que cada llamador
 * alinee columnas según su magnitud esperada (startup usa 8/7).
 */
export function formatTimelineLine(
  totalMs: number,
  deltaMs: number,
  name: string,
  memory: NodeJS.MemoryUsage | undefined,
  totalPad: number,
  deltaPad: number,
  extra = '',
): string {
  const memInfo = memory
    ? ` | RSS: ${formatFileSize(memory.rss)}, Heap: ${formatFileSize(memory.heapUsed)}`
    : ''
  return `[+${formatMs(totalMs).padStart(totalPad)}ms] (+${formatMs(deltaMs).padStart(deltaPad)}ms) ${name}${extra}${memInfo}`
}
