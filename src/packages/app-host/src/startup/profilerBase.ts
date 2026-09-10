// Adaptación de @claude-code-how-works/app-host: src/startup/profilerBase.ts.
// Capa 1 (con cita a `perf_hooks`, nativo de Node — no es paquete hermano).
//
// Infraestructura compartida por los módulos profiler (aquí sólo
// `startupProfiler`; la fuente también la comparte con `queryProfiler` y
// `headlessProfiler`, que no están en el alcance de este porte). `formatMs`
// y `formatTimelineLine` se portan verbatim. `getPerformance` idéntico salvo
// que ya no citamos `@claude-code-how-works/output/formatters` para
// `formatFileSize`, que se reimplementaba aquí porque «ese paquete no
// existe en este árbol». Ese motivo caducó: `@thyrox/output` está portado
// y exporta el símbolo, así que se importa en vez de mantener una segunda
// copia. Se sigue REEXPORTANDO porque este módulo ya lo publicaba y hay
// un test que lo ejercita por este nombre.

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

import { formatFileSize } from '@thyrox/output/formatters'
// Se reexporta porque este módulo ya lo publicaba y hay test que lo
// ejercita por este nombre; el import es lo que lo trae al ámbito, que
// un `export ... from` NO hace — lo destapó el rojo de dos casos.
export { formatFileSize }


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
