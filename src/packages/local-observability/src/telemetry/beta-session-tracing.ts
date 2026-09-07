/**
 * Puerto de `ccnmt: packages/local-observability/src/telemetry/beta-session-tracing.ts`
 * (53 líneas fuente, 100 % portado). Implementaciones stub usadas por
 * otro código de telemetría — en el build externo esta característica
 * está eliminada; los stubs mantienen honestos los call sites sin costo
 * en runtime. Sin dependencias externas.
 */

export type LLMRequestNewContext = {
  totalInputTokens?: number
  totalOutputTokens?: number
  totalCacheCreationInputTokens?: number
  totalCacheReadInputTokens?: number
}

export function isBetaTracingEnabled(): boolean {
  return false
}

export function clearBetaTracingState(): void {}

export function addBetaInteractionAttributes(
  _span: unknown,
  _userPrompt: string,
): void {}

export function addBetaLLMRequestAttributes(
  _span: unknown,
  _messages: unknown[],
  _systemPrompt: string,
  _toolNames?: string[],
): void {}

export function addBetaLLMResponseAttributes(
  _span: unknown,
  _response?: unknown,
): void {}

export function addBetaToolInputAttributes(
  _span: unknown,
  _toolName: string,
  _input?: unknown,
): void {}

export function addBetaToolResultAttributes(
  _span: unknown,
  _output?: unknown,
): void {}

export function truncateContent(content: string, limit = 200): string {
  return content.length > limit ? `${content.slice(0, limit)}...` : content
}
