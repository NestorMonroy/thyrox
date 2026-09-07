/**
 * Puerto de `ccnmt: packages/local-observability/src/contracts.ts` (37
 * líneas fuente, 100 % portado — sin dependencias externas). Declara los
 * tipos de la fachada no-op de observabilidad: `Logger`, `Tracer`,
 * `MetricsRecorder`, `HealthProbe` y el agregado `LocalObservability` que
 * `core.ts` instala/lee.
 */

export type EventMetadata = Record<string, unknown>

export type Logger = {
  debug(message: string, metadata?: EventMetadata): void
  info(message: string, metadata?: EventMetadata): void
  warn(message: string, metadata?: EventMetadata): void
  error(message: string, metadata?: EventMetadata): void
  event(name: string, metadata?: EventMetadata): void
}

export type Span = {
  name: string
  startedAt: number
  endedAt?: number
  attributes?: Record<string, unknown>
}

export type Tracer = {
  startSpan(name: string, attributes?: Record<string, unknown>): Span
  endSpan(span: Span, attributes?: Record<string, unknown>): void
}

export type MetricsRecorder = {
  increment(name: string, value?: number): void
  timing(name: string, durationMs: number): void
}

export type HealthProbe = {
  report(name: string, status: 'ok' | 'warn' | 'error', details?: unknown): void
}

export type LocalObservability = {
  logger: Logger
  tracer: Tracer
  metrics: MetricsRecorder
  health: HealthProbe
}
