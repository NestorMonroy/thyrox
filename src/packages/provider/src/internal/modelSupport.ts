/**
 * Soporte interno consolidado para `model.ts` y `modelOptions.ts`. Reúne
 * sustitutos locales de módulos hermanos de `ccnmt` que esos dos SÍ
 * necesitan pero que NO están entre los 18 asignados a este pase:
 * `model/modelStrings.ts`, `model/configs.ts`, `model/bedrock.ts`,
 * `modelAliases.ts`, `model/modelAllowlist.ts`, `modelCost.ts`,
 * `model/check1mAccess.ts`, `antModels.ts`, `gatewayModelDiscovery.ts`, y
 * los lectores de `app-host/bootstrap/state.js` que usan (zona prohibida).
 *
 * `getModelStrings()` es la simplificación más grande: la fuente resuelve
 * IDs por-proveedor (Bedrock ARNs vía perfiles de inferencia, overrides de
 * `settings.json`) — aquí es una tabla fija con los IDs first-party
 * conocidos (mismos literales que `model-selection-subagents.md` cataloga
 * como catálogo verificado de este mismo árbol).
 */

import { isEnvTruthy } from '@thyrox/config/env/utils'

// ── ccnmt: packages/provider/src/modelAliases.ts — porte fiel completo ──
export const MODEL_ALIASES = [
  'sonnet',
  'opus',
  'haiku',
  'best',
  'sonnet[1m]',
  'opus[1m]',
  'opusplan',
] as const
export type ModelAlias = (typeof MODEL_ALIASES)[number]

export function isModelAlias(modelInput: string): modelInput is ModelAlias {
  return (MODEL_ALIASES as readonly string[]).includes(modelInput)
}

// ── ccnmt: packages/provider/src/model/modelStrings.ts (simplificado) ───
export type ModelStrings = {
  opus40: string
  opus41: string
  opus45: string
  opus46: string
  opus47: string
  opus48: string
  sonnet35: string
  sonnet37: string
  sonnet40: string
  sonnet45: string
  sonnet46: string
  haiku35: string
  haiku45: string
}

const BUILTIN_MODEL_STRINGS: ModelStrings = {
  opus40: 'claude-opus-4-0',
  opus41: 'claude-opus-4-1',
  opus45: 'claude-opus-4-5',
  opus46: 'claude-opus-4-6',
  opus47: 'claude-opus-4-7',
  opus48: 'claude-opus-4-8',
  sonnet35: 'claude-3-5-sonnet-20241022',
  sonnet37: 'claude-3-7-sonnet-20250219',
  sonnet40: 'claude-sonnet-4-0',
  sonnet45: 'claude-sonnet-4-5',
  sonnet46: 'claude-sonnet-4-6',
  haiku35: 'claude-3-5-haiku-20241022',
  haiku45: 'claude-haiku-4-5',
}

export function getModelStrings(): ModelStrings {
  return BUILTIN_MODEL_STRINGS
}

export function resolveOverriddenModel(modelId: string): string {
  return modelId
}

// ── ccnmt: packages/provider/src/model/modelAllowlist.ts (simplificado) ─
// La fuente filtra contra `getSettings().availableModels`
// (`@thyrox/config/settings`, no portado). Sin ese árbol, el default fiel
// a la fuente es "sin restricciones" — la propia fuente sólo restringe
// cuando `availableModels` está fijado.
export function isModelAllowed(_model: string): boolean {
  return true
}

// ── ccnmt: packages/provider/src/antModels.ts (ant-only, stub) ──────────
// Configuración interna de Anthropic; `process.env.USER_TYPE === 'ant'` es
// falso en este árbol, así que las tres funciones nunca se alcanzan en la
// práctica — se documentan como no-op fieles a ese camino frío.
export function resolveAntModel(_model: string): { model: string } | undefined {
  return undefined
}

export function getAntModelOverrideConfig(): { defaultModel?: string } | undefined {
  return undefined
}

export function getAntModels(): Array<{ alias: string; label: string; model: string; description?: string }> {
  return []
}

// ── ccnmt: packages/provider/src/gatewayModelDiscovery.ts (stub) ────────
export function isGatewayModelDiscoveryEnabled(): boolean {
  return isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY)
}

export function readCachedGatewayModels(): Array<{
  value: string
  label: string
  description: string
}> {
  return []
}

// ── ccnmt: packages/provider/src/model/check1mAccess.ts (simplificado) ──
// La fuente consulta `getGlobalConfig().cachedExtraUsageDisabledReason`
// (no portado). Camino no-suscriptor (API/PAYG) es idéntico a la fuente:
// siempre true salvo 1M deshabilitado. Camino suscriptor usa el default
// conservador de la fuente para "sin caché todavía" (false).
function checkGenericAccess(is1mContextDisabled: boolean, isSubscriber: boolean): boolean {
  if (is1mContextDisabled) return false
  if (isSubscriber) return false
  return true
}

export function checkOpus1mAccess(is1mContextDisabled: boolean, isSubscriber: boolean): boolean {
  return checkGenericAccess(is1mContextDisabled, isSubscriber)
}

export function checkSonnet1mAccess(is1mContextDisabled: boolean, isSubscriber: boolean): boolean {
  return checkGenericAccess(is1mContextDisabled, isSubscriber)
}

// ── ccnmt: packages/provider/src/modelCost.ts (simplificado) ────────────
export type ModelCosts = {
  inputTokens: number
  outputTokens: number
  promptCacheWriteTokens: number
  promptCacheReadTokens: number
  webSearchRequests: number
}

export const COST_TIER_3_15: ModelCosts = {
  inputTokens: 3,
  outputTokens: 15,
  promptCacheWriteTokens: 3.75,
  promptCacheReadTokens: 0.3,
  webSearchRequests: 0.01,
}

export const COST_TIER_15_75: ModelCosts = {
  inputTokens: 15,
  outputTokens: 75,
  promptCacheWriteTokens: 18.75,
  promptCacheReadTokens: 1.5,
  webSearchRequests: 0.01,
}

export const COST_TIER_5_25: ModelCosts = {
  inputTokens: 5,
  outputTokens: 25,
  promptCacheWriteTokens: 6.25,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
}

export const COST_TIER_30_150: ModelCosts = {
  inputTokens: 30,
  outputTokens: 150,
  promptCacheWriteTokens: 37.5,
  promptCacheReadTokens: 3,
  webSearchRequests: 0.01,
}

export const COST_HAIKU_35: ModelCosts = {
  inputTokens: 0.8,
  outputTokens: 4,
  promptCacheWriteTokens: 1,
  promptCacheReadTokens: 0.08,
  webSearchRequests: 0.01,
}

export const COST_HAIKU_45: ModelCosts = {
  inputTokens: 1,
  outputTokens: 5,
  promptCacheWriteTokens: 1.25,
  promptCacheReadTokens: 0.1,
  webSearchRequests: 0.01,
}

const MODEL_COSTS_BY_CANONICAL: Record<string, ModelCosts> = {
  'claude-3-5-haiku': COST_HAIKU_35,
  'claude-haiku-4-5': COST_HAIKU_45,
  'claude-3-5-sonnet': COST_TIER_3_15,
  'claude-3-7-sonnet': COST_TIER_3_15,
  'claude-sonnet-4': COST_TIER_3_15,
  'claude-sonnet-4-5': COST_TIER_3_15,
  'claude-sonnet-4-6': COST_TIER_3_15,
  'claude-opus-4': COST_TIER_15_75,
  'claude-opus-4-1': COST_TIER_15_75,
  'claude-opus-4-5': COST_TIER_5_25,
  'claude-opus-4-6': COST_TIER_5_25,
  'claude-opus-4-7': COST_TIER_5_25,
  'claude-opus-4-8': COST_TIER_5_25,
}

export function getOpus46CostTier(fastMode: boolean, isFastModeEnabled: boolean): ModelCosts {
  if (isFastModeEnabled && fastMode) return COST_TIER_30_150
  return COST_TIER_5_25
}

function formatPrice(price: number): string {
  if (Number.isInteger(price)) return `$${price}`
  return `$${price.toFixed(2)}`
}

export function formatModelPricing(costs: ModelCosts): string {
  return `${formatPrice(costs.inputTokens)}/${formatPrice(costs.outputTokens)} per Mtok`
}

function tokensToUSDCost(
  modelCosts: ModelCosts,
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
    server_tool_use?: { web_search_requests?: number }
  },
): number {
  return (
    (usage.input_tokens / 1_000_000) * modelCosts.inputTokens +
    (usage.output_tokens / 1_000_000) * modelCosts.outputTokens +
    ((usage.cache_read_input_tokens ?? 0) / 1_000_000) * modelCosts.promptCacheReadTokens +
    ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) * modelCosts.promptCacheWriteTokens +
    (usage.server_tool_use?.web_search_requests ?? 0) * modelCosts.webSearchRequests
  )
}

export function calculateUSDCost(
  canonicalModel: string,
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
    server_tool_use?: { web_search_requests?: number }
    speed?: string
  },
): number {
  if (
    (canonicalModel === 'claude-opus-4-8' ||
      canonicalModel === 'claude-opus-4-7' ||
      canonicalModel === 'claude-opus-4-6') &&
    usage.speed === 'fast'
  ) {
    return tokensToUSDCost(COST_TIER_30_150, usage)
  }
  const costs = MODEL_COSTS_BY_CANONICAL[canonicalModel] ?? COST_TIER_5_25
  return tokensToUSDCost(costs, usage)
}

// ── ccnmt: app-host/bootstrap/state.js → getMainLoopModelOverride /
// getInitialMainLoopModel. Zona prohibida; `require()` diferido con
// fallback seguro (indica "sin override") si el símbolo aún no existe.
export function getMainLoopModelOverride(): string | null | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/app-host/bootstrap/state.js') as {
      getMainLoopModelOverride: () => string | null | undefined
    }).getMainLoopModelOverride()
  } catch {
    return undefined
  }
}

export function getInitialMainLoopModel(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/app-host/bootstrap/state.js') as {
      getInitialMainLoopModel: () => string | null
    }).getInitialMainLoopModel()
  } catch {
    return null
  }
}

export function getSettingsAvailableModels(): { availableModels?: string[] } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/config/settings') as { getSettings: () => { availableModels?: string[] } }).getSettings()
  } catch {
    return {}
  }
}

export function getGlobalConfigAdditionalModelOptions(): Array<{
  value: string
  label: string
  description: string
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (
      (require('@thyrox/config') as {
        getGlobalConfig: () => {
          additionalModelOptionsCache?: Array<{ value: string; label: string; description: string }>
        }
      }).getGlobalConfig().additionalModelOptionsCache ?? []
    )
  } catch {
    return []
  }
}
