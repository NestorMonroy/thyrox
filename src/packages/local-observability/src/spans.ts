/**
 * Puerto de `ccnmt: packages/local-observability/src/spans.ts` (102
 * líneas fuente, 100 % portado). Fachada no-op de tracing por encima de
 * `core.ts` — cada `start*Span` abre un span real (no-op) vía
 * `startSpan`/`endSpan` de `core.ts`; nada de esto emite tracing de
 * verdad, es el mismo contrato que la fuente declara.
 */

import { endSpan as endObsSpan, startSpan as startObsSpan } from './core.js'
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

export function startToolSpan(_toolName: string, _input?: unknown): Span {
  const span = startObsSpan('tool')
  return { _obsSpan: span }
}

export function endToolSpan(span: Span | undefined, _output?: unknown): void {
  endObsSpan(span?._obsSpan)
}

export function startToolExecutionSpan(
  _toolName: string,
  _input?: unknown,
): Span {
  const span = startObsSpan('tool_execution')
  return { _obsSpan: span }
}

export function startToolBlockedOnUserSpan(_toolName: string): Span {
  const span = startObsSpan('tool_blocked_on_user')
  return { _obsSpan: span }
}

export function endToolExecutionSpan(
  span: Span | undefined,
  _output?: unknown,
): void {
  endObsSpan(span?._obsSpan)
}

export function endToolBlockedOnUserSpan(span: Span | undefined): void {
  endObsSpan(span?._obsSpan)
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
