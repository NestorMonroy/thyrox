/**
 * Puerto de `ccnmt: packages/local-observability/src/core.ts` (103 líneas
 * fuente, 100 % portado). Módulo hoja: guarda el singleton de
 * observabilidad no-op, los accesores install/get, `logEvent`/
 * `logEventAsync`, `startSpan`/`endSpan` y `shutdownLocalObservability`.
 * Extraído de `index.ts` en la fuente para romper los ciclos
 * index ↔ {spans, compat} — ambos consumidores dependen de esta hoja sin
 * pasar por el barrel.
 */

import type {
  EventMetadata,
  HealthProbe,
  LocalObservability,
  Logger,
  MetricsRecorder,
  Span,
  Tracer,
} from './contracts.js'

const noOpLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  event: () => {},
}

const noOpTracer: Tracer = {
  startSpan(name, attributes): Span {
    return {
      name,
      startedAt: Date.now(),
      attributes,
    }
  },
  endSpan(span, attributes): void {
    span.endedAt = Date.now()
    if (attributes) {
      span.attributes = {
        ...(span.attributes ?? {}),
        ...attributes,
      }
    }
  },
}

const noOpMetrics: MetricsRecorder = {
  increment: () => {},
  timing: () => {},
}

const noOpHealth: HealthProbe = {
  report: () => {},
}

let observability: LocalObservability = {
  logger: noOpLogger,
  tracer: noOpTracer,
  metrics: noOpMetrics,
  health: noOpHealth,
}

export function installLocalObservability(
  runtime: Partial<LocalObservability>,
): void {
  observability = {
    logger: runtime.logger ?? observability.logger,
    tracer: runtime.tracer ?? observability.tracer,
    metrics: runtime.metrics ?? observability.metrics,
    health: runtime.health ?? observability.health,
  }
}

export function getLocalObservability(): LocalObservability {
  return observability
}

export function logEvent(name: string, metadata: EventMetadata = {}): void {
  observability.logger.event(name, metadata)
}

export async function logEventAsync(
  name: string,
  metadata: EventMetadata = {},
): Promise<void> {
  observability.logger.event(name, metadata)
}

export function startSpan(
  name: string,
  attributes?: Record<string, unknown>,
): Span {
  return observability.tracer.startSpan(name, attributes)
}

export function endSpan(
  span: Span | undefined,
  attributes?: Record<string, unknown>,
): void {
  if (!span) {
    return
  }
  observability.tracer.endSpan(span, attributes)
}

export async function shutdownLocalObservability(): Promise<void> {}
