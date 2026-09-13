/**
 * Porte de `ccnmt: packages/agent/compaction/apiMicrocompact.ts`.
 *
 * Arma la config de `context_management` que la API de Anthropic acepta
 * para recortar server-side: limpiar bloques `thinking` viejos, y (sólo
 * para usuarios internos, `USER_TYPE=ant`) limpiar resultados o usos de
 * herramientas por volumen de tokens de entrada.
 *
 * DIVERGENCIA DE ESTRUCTURA, sin cambio de comportamiento: la fuente repite
 * el mismo bloque `parseInt(deps.getEnv(...))` cuatro veces (dos por rama);
 * aquí se extrae a `thresholdFrom`, misma lectura y mismo fallback.
 */
import type { ContextEditStrategy, ContextManagementConfig, ToolNameConstants } from './types.ts'

export interface ApiMicrocompactDeps {
  toolNames: ToolNameConstants
  getEnv(key: string): string | undefined
}

// Coincide con los valores de microcompact del lado cliente.
const DEFAULT_MAX_INPUT_TOKENS = 180_000
const DEFAULT_TARGET_INPUT_TOKENS = 40_000

export function getAPIContextManagement(
  deps: ApiMicrocompactDeps,
  options?: {
    hasThinking?: boolean
    isRedactThinkingActive?: boolean
    clearAllThinking?: boolean
  },
): ContextManagementConfig | undefined {
  const { hasThinking = false, isRedactThinkingActive = false, clearAllThinking = false } = options ?? {}

  const strategies: ContextEditStrategy[] = []

  const toolsClearableResults = [
    ...deps.toolNames.shellToolNames,
    deps.toolNames.glob,
    deps.toolNames.grep,
    deps.toolNames.fileRead,
    deps.toolNames.webFetch,
    deps.toolNames.webSearch,
  ]

  const toolsClearableUses = [deps.toolNames.fileEdit, deps.toolNames.fileWrite, deps.toolNames.notebookEdit]

  // Preserva los bloques thinking de turnos anteriores del assistant.
  if (hasThinking && !isRedactThinkingActive) {
    strategies.push({
      type: 'clear_thinking_20251015',
      keep: clearAllThinking ? { type: 'thinking_turns', value: 1 } : 'all',
    })
  }

  // Las estrategias de limpieza de herramientas son sólo para uso interno (ant).
  const userType = deps.getEnv('USER_TYPE')
  if (userType !== 'ant') {
    return strategies.length > 0 ? { edits: strategies } : undefined
  }

  const isEnvTruthy = (val: string | undefined): boolean => val === '1' || val === 'true'
  const useClearToolResults = isEnvTruthy(deps.getEnv('USE_API_CLEAR_TOOL_RESULTS'))
  const useClearToolUses = isEnvTruthy(deps.getEnv('USE_API_CLEAR_TOOL_USES'))

  if (!useClearToolResults && !useClearToolUses) {
    return strategies.length > 0 ? { edits: strategies } : undefined
  }

  const thresholdFrom = (key: string, fallback: number): number => {
    const raw = deps.getEnv(key)
    return raw ? parseInt(raw, 10) : fallback
  }

  if (useClearToolResults) {
    const triggerThreshold = thresholdFrom('API_MAX_INPUT_TOKENS', DEFAULT_MAX_INPUT_TOKENS)
    const keepTarget = thresholdFrom('API_TARGET_INPUT_TOKENS', DEFAULT_TARGET_INPUT_TOKENS)
    strategies.push({
      type: 'clear_tool_uses_20250919',
      trigger: { type: 'input_tokens', value: triggerThreshold },
      clear_at_least: { type: 'input_tokens', value: triggerThreshold - keepTarget },
      clear_tool_inputs: toolsClearableResults,
    })
  }

  if (useClearToolUses) {
    const triggerThreshold = thresholdFrom('API_MAX_INPUT_TOKENS', DEFAULT_MAX_INPUT_TOKENS)
    const keepTarget = thresholdFrom('API_TARGET_INPUT_TOKENS', DEFAULT_TARGET_INPUT_TOKENS)
    strategies.push({
      type: 'clear_tool_uses_20250919',
      trigger: { type: 'input_tokens', value: triggerThreshold },
      clear_at_least: { type: 'input_tokens', value: triggerThreshold - keepTarget },
      exclude_tools: toolsClearableUses,
    })
  }

  return strategies.length > 0 ? { edits: strategies } : undefined
}
