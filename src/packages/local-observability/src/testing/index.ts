/**
 * Puerto de `ccnmt: packages/local-observability/src/testing/index.ts`
 * (161 líneas fuente, 100 % portado). Fakes en memoria para pruebas de
 * consumidores de `local-observability` — `NullObservability` (no-op
 * silencioso) y `RecordingObservability` (captura cada llamada). Estos
 * exports NO deben importar de `../internal/` (regla dura de la fuente:
 * este paquete no tiene `internal/` en el sentido que la fuente usa esa
 * palabra — aquí `internal/` es el hogar de los sustitutos de paquete
 * hermano; `testing/index.ts` tampoco los importa, consistente con la
 * regla original).
 */

import type {
  EventMetadata,
  HealthProbe,
  LocalObservability,
  Logger,
  MetricsRecorder,
  Span,
  Tracer,
} from '../contracts.js'

// Re-exporta los contratos para que las pruebas necesiten un solo import.
export type {
  EventMetadata,
  HealthProbe,
  LocalObservability,
  Logger,
  MetricsRecorder,
  Span,
  Tracer,
}

// ---------------------------------------------------------------------------
// NullObservability
// ---------------------------------------------------------------------------

const _nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  event: () => {},
}

const _nullTracer: Tracer = {
  startSpan(name, attributes): Span {
    return { name, startedAt: Date.now(), attributes }
  },
  endSpan(span, attributes): void {
    span.endedAt = Date.now()
    if (attributes)
      span.attributes = { ...(span.attributes ?? {}), ...attributes }
  },
}

const _nullMetrics: MetricsRecorder = {
  increment: () => {},
  timing: () => {},
}

const _nullHealth: HealthProbe = {
  report: () => {},
}

/**
 * `NullObservability` — una implementación de `LocalObservability` cuyos
 * métodos son no-op silenciosos. Apta para pruebas que no necesitan
 * verificar comportamiento de observabilidad.
 */
export const NullObservability: LocalObservability = {
  logger: _nullLogger,
  tracer: _nullTracer,
  metrics: _nullMetrics,
  health: _nullHealth,
}

// ---------------------------------------------------------------------------
// RecordingObservability
// ---------------------------------------------------------------------------

export type LogRecord = {
  level: 'debug' | 'info' | 'warn' | 'error' | 'event'
  message: string
  metadata?: EventMetadata
}

export type MetricRecord =
  | { kind: 'increment'; name: string; value: number }
  | { kind: 'timing'; name: string; durationMs: number }

export type HealthRecord = {
  name: string
  status: 'ok' | 'warn' | 'error'
  details?: unknown
}

/**
 * `RecordingObservability` — captura cada llamada de observabilidad en
 * arrays tipados. Las pruebas pueden inspeccionar `.logs`, `.spans`,
 * `.metrics` y `.health` tras ejercitar el sistema bajo prueba.
 */
export class RecordingObservability {
  readonly logs: LogRecord[] = []
  readonly spans: Span[] = []
  readonly metrics: MetricRecord[] = []
  readonly health: HealthRecord[] = []

  private readonly _logger: Logger = {
    debug: (msg, meta) =>
      this.logs.push({ level: 'debug', message: msg, metadata: meta }),
    info: (msg, meta) =>
      this.logs.push({ level: 'info', message: msg, metadata: meta }),
    warn: (msg, meta) =>
      this.logs.push({ level: 'warn', message: msg, metadata: meta }),
    error: (msg, meta) =>
      this.logs.push({ level: 'error', message: msg, metadata: meta }),
    event: (name, meta) =>
      this.logs.push({ level: 'event', message: name, metadata: meta }),
  }

  private readonly _tracer: Tracer = {
    startSpan: (name, attributes): Span => {
      const span: Span = { name, startedAt: Date.now(), attributes }
      this.spans.push(span)
      return span
    },
    endSpan: (span, attributes): void => {
      span.endedAt = Date.now()
      if (attributes)
        span.attributes = { ...(span.attributes ?? {}), ...attributes }
    },
  }

  private readonly _metrics: MetricsRecorder = {
    increment: (name, value = 1) =>
      this.metrics.push({ kind: 'increment', name, value }),
    timing: (name, durationMs) =>
      this.metrics.push({ kind: 'timing', name, durationMs }),
  }

  private readonly _health: HealthProbe = {
    report: (name, status, details) =>
      this.health.push({ name, status, details }),
  }

  /** El objeto `LocalObservability` a pasar a `installLocalObservability()`. */
  readonly observability: LocalObservability = {
    logger: this._logger,
    tracer: this._tracer,
    metrics: this._metrics,
    health: this._health,
  }

  /** Limpia todo lo capturado. Útil entre casos de prueba. */
  reset(): void {
    this.logs.length = 0
    this.spans.length = 0
    this.metrics.length = 0
    this.health.length = 0
  }
}
