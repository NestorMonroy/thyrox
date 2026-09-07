/**
 * Puerto de `ccnmt: packages/local-observability/src/index.ts` (26 líneas
 * fuente, 100 % portado). El barrel principal del paquete — el subpath
 * `.` que, medido en el censo de futuros consumidores
 * (memory/swarm/mcp-runtime/output/repl/…), es el más citado: 108 líneas
 * de import contra este barrel.
 */

export type {
  EventMetadata,
  HealthProbe,
  LocalObservability,
  Logger,
  MetricsRecorder,
  Span,
  Tracer,
} from './contracts.js'

export {
  installLocalObservability,
  getLocalObservability,
  logEvent,
  logEventAsync,
  startSpan,
  endSpan,
  shutdownLocalObservability,
} from './core.js'

export * from './spans.js'
export * from './errors.js'
export type {
  AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AnalyticsMetadata_I_VERIFIED_THIS_IS_PII_TAGGED,
} from './compat.js'
