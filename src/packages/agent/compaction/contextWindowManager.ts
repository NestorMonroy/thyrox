/**
 * Porte de `ccnmt: packages/agent/compaction/contextWindowManager.ts`.
 *
 * La ventana efectiva de un modelo, su umbral de auto-compactación y el
 * estado de aviso por consumo de tokens -- todo contra deps inyectadas
 * (`ContextWindowDeps`), sin tocar `MODELS` de este árbol directamente. Es
 * un diseño DISTINTO del ya existente `loop/context/autocompact.ts`: ese
 * lee `MODELS` sin inyección y no calcula `TokenWarningState`; éste es el
 * porte fiel de la fuente, con sus cuatro overrides por variable de entorno
 * (`CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`,
 * `CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE`) que `autocompact.ts` no porta.
 */
import type { TokenWarningState } from './types.ts'

const MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000

export const AUTOCOMPACT_BUFFER_TOKENS = 13_000
export const WARNING_THRESHOLD_BUFFER_TOKENS = 20_000
export const ERROR_THRESHOLD_BUFFER_TOKENS = 20_000
export const MANUAL_COMPACT_BUFFER_TOKENS = 3_000
export const MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3

export interface ContextWindowDeps {
  getContextWindowSize(model: string, betas: string[]): number
  getMaxOutputTokensForModel(model: string): number
  getSdkBetas(): string[]
  getEnv(key: string): string | undefined
}

/**
 * Ventana del modelo menos la reserva para el resumen de compactación
 * (tope `MAX_OUTPUT_TOKENS_FOR_SUMMARY`), con el override
 * `CLAUDE_CODE_AUTO_COMPACT_WINDOW` acotando la ventana por arriba.
 */
export function getEffectiveContextWindowSize(model: string, deps: ContextWindowDeps): number {
  const reservedTokensForSummary = Math.min(
    deps.getMaxOutputTokensForModel(model),
    MAX_OUTPUT_TOKENS_FOR_SUMMARY,
  )
  let contextWindow = deps.getContextWindowSize(model, deps.getSdkBetas())

  const autoCompactWindow = deps.getEnv('CLAUDE_CODE_AUTO_COMPACT_WINDOW')
  if (autoCompactWindow) {
    const parsed = parseInt(autoCompactWindow, 10)
    if (!isNaN(parsed) && parsed > 0) {
      contextWindow = Math.min(contextWindow, parsed)
    }
  }

  return contextWindow - reservedTokensForSummary
}

/**
 * El punto a partir del cual conviene auto-compactar: la ventana efectiva
 * menos `AUTOCOMPACT_BUFFER_TOKENS`, salvo que `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
 * (0-100] pida un porcentaje más estricto -- nunca uno más laxo que el
 * umbral por buffer (siempre gana el `Math.min` de los dos).
 */
export function getAutoCompactThreshold(model: string, deps: ContextWindowDeps): number {
  const effectiveContextWindow = getEffectiveContextWindowSize(model, deps)
  const autocompactThreshold = effectiveContextWindow - AUTOCOMPACT_BUFFER_TOKENS

  const envPercent = deps.getEnv('CLAUDE_AUTOCOMPACT_PCT_OVERRIDE')
  if (envPercent) {
    const parsed = parseFloat(envPercent)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      const percentageThreshold = Math.floor(effectiveContextWindow * (parsed / 100))
      return Math.min(percentageThreshold, autocompactThreshold)
    }
  }

  return autocompactThreshold
}

/**
 * Los cuatro flags que la barra de contexto necesita: cuánto queda (en
 * porcentaje), y si ya se cruzaron los umbrales de aviso, error,
 * auto-compact, y bloqueo manual (con su propio override).
 */
export function calculateTokenWarningState(
  tokenUsage: number,
  model: string,
  deps: ContextWindowDeps,
  autoCompactEnabled: boolean,
): TokenWarningState {
  const autoCompactThreshold = getAutoCompactThreshold(model, deps)
  const threshold = autoCompactEnabled
    ? autoCompactThreshold
    : getEffectiveContextWindowSize(model, deps)

  const percentLeft = Math.max(0, Math.round(((threshold - tokenUsage) / threshold) * 100))

  const warningThreshold = threshold - WARNING_THRESHOLD_BUFFER_TOKENS
  const errorThreshold = threshold - ERROR_THRESHOLD_BUFFER_TOKENS

  const isAboveWarningThreshold = tokenUsage >= warningThreshold
  const isAboveErrorThreshold = tokenUsage >= errorThreshold
  const isAboveAutoCompactThreshold = autoCompactEnabled && tokenUsage >= autoCompactThreshold

  const actualContextWindow = getEffectiveContextWindowSize(model, deps)
  const defaultBlockingLimit = actualContextWindow - MANUAL_COMPACT_BUFFER_TOKENS

  const blockingLimitOverride = deps.getEnv('CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE')
  const parsedOverride = blockingLimitOverride ? parseInt(blockingLimitOverride, 10) : NaN
  const blockingLimit =
    !isNaN(parsedOverride) && parsedOverride > 0 ? parsedOverride : defaultBlockingLimit

  const isAtBlockingLimit = tokenUsage >= blockingLimit

  return {
    percentLeft,
    isAboveWarningThreshold,
    isAboveErrorThreshold,
    isAboveAutoCompactThreshold,
    isAtBlockingLimit,
  }
}

/** El hilo principal es el que no trae `querySource`, o el que empieza con `repl_main_thread`. */
export function isMainThreadSource(querySource: string | undefined): boolean {
  return !querySource || querySource.startsWith('repl_main_thread')
}
