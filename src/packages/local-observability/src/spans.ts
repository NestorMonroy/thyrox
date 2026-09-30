import {
  endSpan as endObsSpan,
  startSpan as startObsSpan,
} from './core.js'
import type { Span as ObsSpan } from './contracts.js'

export type Span = {
  spanContext?: () => { spanId?: string }
  _obsSpan?: ObsSpan
}

export type LLMRequestNewContext = {
  totalInputTokens?: number
  totalOutputTokens?: number
  totalCacheCreationInputTokens?: number
  totalCacheReadInputTokens?: number
}

export function isBetaTracingEnabled(): boolean {
  return false
}

export function isEnhancedTelemetryEnabled(): boolean {
  return false
}

export function startInteractionSpan(_userPrompt: string): Span {
  const span = startObsSpan('interaction')
  return { _obsSpan: span }
}

export function endInteractionSpan(): void {}

export function startLLMRequestSpan(
  _model: string,
  _messages: unknown[],
  _systemPrompt: string,
  _toolNames?: string[],
): Span {
  const span = startObsSpan('llm_request')
  return { _obsSpan: span }
}

export function endLLMRequestSpan(
  span: Span | undefined,
  _response?: unknown,
): void {
  endObsSpan(span?._obsSpan)
}

// Los spans de herramienta siguen el contrato de sesión que usa
// toolExecution.ts (el del binario, `sessionTracing`): el llamador abre y
// cierra sin guardar el span —`startToolBlockedOnUserSpan()`,
// `endToolSpan(resultado)`—, y el módulo recuerda cuál está abierto. La
// versión anterior, como la fuente, pedía el span por argumento, y cada
// llamada era TS2554. Una ranura por clase de span: dos herramientas
// concurrentes compartirían ranura, que el binario resuelve con contexto
// asíncrono; aquí el trazado está apagado (isBetaTracingEnabled() es false).
let openToolSpan: ObsSpan | undefined
let openToolExecutionSpan: ObsSpan | undefined
let openBlockedOnUserSpan: ObsSpan | undefined

export function startToolSpan(
  _toolName: string,
  _attributes?: Record<string, unknown>,
  _input?: unknown,
): Span {
  openToolSpan = startObsSpan('tool')
  return { _obsSpan: openToolSpan }
}

export function endToolSpan(_output?: unknown): void {
  endObsSpan(openToolSpan)
  openToolSpan = undefined
}

export function startToolExecutionSpan(): Span {
  openToolExecutionSpan = startObsSpan('tool_execution')
  return { _obsSpan: openToolExecutionSpan }
}

export function startToolBlockedOnUserSpan(): Span {
  openBlockedOnUserSpan = startObsSpan('tool_blocked_on_user')
  return { _obsSpan: openBlockedOnUserSpan }
}

export function endToolExecutionSpan(_metadata?: unknown): void {
  endObsSpan(openToolExecutionSpan)
  openToolExecutionSpan = undefined
}

export function endToolBlockedOnUserSpan(_decision?: string, _source?: string): void {
  endObsSpan(openBlockedOnUserSpan)
  openBlockedOnUserSpan = undefined
}

export function startHookSpan(_hookName: string, _eventName: string): Span {
  const span = startObsSpan('hook')
  return { _obsSpan: span }
}

export function endHookSpan(span: Span | undefined): void {
  endObsSpan(span?._obsSpan)
}

export function addToolContentEvent(
  _span: Span | undefined,
  _content: unknown,
): void {}
