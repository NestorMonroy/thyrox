/**
 * Puerto de `ccnmt: packages/local-observability/src/telemetry/perfettoTracing.ts`
 * (31 líneas fuente, 100 % portado). Fachada "V7 §10.3" — re-exporta el
 * tracing de Perfetto (`./perfetto.js`, en este árbol reducido a su
 * comportamiento no-op real — ver el docstring de ese archivo).
 */

export type { TraceEvent, TraceEventPhase } from './perfetto.js'
export {
  MAX_EVENTS_FOR_TESTING,
  emitPerfettoCounter,
  emitPerfettoInstant,
  endInteractionPerfettoSpan,
  endLLMRequestPerfettoSpan,
  endToolPerfettoSpan,
  endUserInputPerfettoSpan,
  evictOldestEventsForTesting,
  evictStaleSpansForTesting,
  getPerfettoEvents,
  initializePerfettoTracing,
  isPerfettoTracingEnabled,
  registerAgent,
  resetPerfettoTracer,
  startInteractionPerfettoSpan,
  startLLMRequestPerfettoSpan,
  startToolPerfettoSpan,
  startUserInputPerfettoSpan,
  triggerPeriodicWriteForTesting,
  unregisterAgent,
} from './perfetto.js'
