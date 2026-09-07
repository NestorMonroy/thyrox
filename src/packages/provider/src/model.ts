/**
 * Porte de `ccnmt: packages/provider/src/model.ts` — sus 25 exportaciones,
 * ninguna omitida.
 *
 * Divergencias medidas: `./antModels.js`, `./model/modelStrings.js`,
 * `./modelCost.js`, `./model/modelAllowlist.js`, `./modelAliases.js`
 * NO están asignados a este pase → sustitutos locales fieles en
 * `internal/modelSupport.ts` (ver su cabecera; `getModelStrings()` es la
 * simplificación mayor: tabla fija de IDs first-party en vez de resolución
 * por-proveedor con overrides de Bedrock). `has1mContext`/
 * `is1mContextDisabled`/`modelSupports1M` (`@thyrox/agent/context.ts`) SÍ
 * resuelven — import estático. `getMainLoopModelOverride`
 * (`app-host/bootstrap/state.js`, zona prohibida) y `getSettings`
 * (`@thyrox/config/settings`, no portado) → `require()` diferido con
 * fallback seguro. `./connections.js` es uno de los 18 — import relativo
 * normal salvo donde la propia fuente ya usaba `require()` diferido para
 * romper un ciclo (`connections.ts` importa de `providers.ts`, que
 * `model.ts` también importa).
 */

import {
  isClaudeAISubscriber,
  isMaxSubscriber,
  isProSubscriber,
  isTeamPremiumSubscriber,
  getSubscriptionType,
} from './authAlias.ts'
import { has1mContext, is1mContextDisabled, modelSupports1M } from '@thyrox/agent/context'
import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'
import { getAPIProvider, isFirstPartyAnthropicBaseUrl, resolveConnectionForModel } from './providers.ts'
import { LIGHTNING_BOLT } from '@thyrox/output/constants/figures'
import { capitalize } from '@thyrox/output/utils/stringUtils'
import {
  getModelStrings,
  resolveOverriddenModel,
  isModelAllowed,
  type ModelAlias,
  isModelAlias,
  resolveAntModel,
  getAntModelOverrideConfig,
  formatModelPricing,
  getOpus46CostTier,
  getMainLoopModelOverride,
  getSettingsAvailableModels,
} from './internal/modelSupport.ts'
import { isFastModeEnabled } from './internal/pendingCrossPackageDeps.ts'

export type ModelShortName = string
export type ModelName = string
export type ModelSetting = ModelName | ModelAlias | null

/**
 * Modelo rápido/pequeño para clasificadores en background. Sólo devuelve un
 * id Haiku de Claude cuando Haiku es GENUINAMENTE alcanzable; si no, cae al
 * modelo del bucle principal.
 */
export function getSmallFastModel(): ModelName {
  const provider = getAPIProvider()
  if (provider === 'openai' && readEnv('OPENAI_SMALL_FAST_MODEL')) {
    return readEnv('OPENAI_SMALL_FAST_MODEL')!
  }
  if (provider === 'gemini' && readEnv('GEMINI_SMALL_FAST_MODEL')) {
    return readEnv('GEMINI_SMALL_FAST_MODEL')!
  }
  if (readEnv('ANTHROPIC_SMALL_FAST_MODEL')) {
    return readEnv('ANTHROPIC_SMALL_FAST_MODEL')!
  }
  if (readEnv('ANTHROPIC_DEFAULT_HAIKU_MODEL')) {
    return readEnv('ANTHROPIC_DEFAULT_HAIKU_MODEL')!
  }
  const mainLoopModel = getMainLoopModel()
  const haikuReachableViaConnection = (() => {
    const conn = resolveConnectionForModel(mainLoopModel)
    if (!conn) return false
    return conn.protocol === 'anthropic' && conn.models.some(m => m.id.toLowerCase().includes('haiku'))
  })()
  const haikuReachableViaEnv =
    (provider === 'firstParty' && isFirstPartyAnthropicBaseUrl()) ||
    provider === 'bedrock' ||
    provider === 'vertex' ||
    provider === 'foundry'
  if (haikuReachableViaConnection || haikuReachableViaEnv) {
    return getDefaultHaikuModel()
  }
  return mainLoopModel
}

export function isNonCustomOpusModel(model: ModelName): boolean {
  const s = getModelStrings()
  return model === s.opus40 || model === s.opus41 || model === s.opus45 || model === s.opus46 || model === s.opus47 || model === s.opus48
}

/**
 * Modelo especificado por el usuario (/model, --model, ANTHROPIC_MODEL o
 * settings), en orden de prioridad. `undefined` si no hay nada configurado.
 */
export function getUserSpecifiedModelSetting(): ModelSetting | undefined {
  let specifiedModel: ModelSetting | undefined

  const modelOverride = getMainLoopModelOverride()
  if (modelOverride !== undefined) {
    specifiedModel = modelOverride
  } else {
    const settings = getSettingsAvailableModels() as { model?: ModelSetting }
    specifiedModel = readEnv('ANTHROPIC_MODEL') || settings.model || undefined
  }

  if (specifiedModel && !isModelAllowed(specifiedModel)) {
    return undefined
  }

  if (typeof specifiedModel === 'string') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inflateModelSetting } = require('./connections.ts') as typeof import('./connections.ts')
    const inflated = inflateModelSetting(specifiedModel)
    if (typeof inflated === 'string') return inflated
  }

  return specifiedModel
}

/** Modelo del bucle principal para la sesión actual. */
export function getMainLoopModel(): ModelName {
  const model = getUserSpecifiedModelSetting()
  if (model !== undefined && model !== null) {
    return parseUserSpecifiedModel(model)
  }
  return getDefaultMainLoopModel()
}

export function getBestModel(): ModelName {
  return getDefaultOpusModel()
}

export function getDefaultOpusModel(): ModelName {
  const provider = getAPIProvider()
  if (provider === 'openai' && readEnv('OPENAI_DEFAULT_OPUS_MODEL')) {
    return readEnv('OPENAI_DEFAULT_OPUS_MODEL')!
  }
  if (provider === 'gemini' && readEnv('GEMINI_DEFAULT_OPUS_MODEL')) {
    return readEnv('GEMINI_DEFAULT_OPUS_MODEL')!
  }
  if (readEnv('ANTHROPIC_DEFAULT_OPUS_MODEL')) {
    return readEnv('ANTHROPIC_DEFAULT_OPUS_MODEL')!
  }
  if (provider === 'bedrock' || provider === 'vertex' || provider === 'foundry') {
    return getModelStrings().opus46
  }
  return getModelStrings().opus48
}

export function getDefaultSonnetModel(): ModelName {
  const provider = getAPIProvider()
  if (provider === 'openai' && readEnv('OPENAI_DEFAULT_SONNET_MODEL')) {
    return readEnv('OPENAI_DEFAULT_SONNET_MODEL')!
  }
  if (provider === 'gemini' && readEnv('GEMINI_DEFAULT_SONNET_MODEL')) {
    return readEnv('GEMINI_DEFAULT_SONNET_MODEL')!
  }
  if (readEnv('ANTHROPIC_DEFAULT_SONNET_MODEL')) {
    return readEnv('ANTHROPIC_DEFAULT_SONNET_MODEL')!
  }
  if (provider !== 'firstParty') {
    return getModelStrings().sonnet45
  }
  return getModelStrings().sonnet46
}

export function getDefaultHaikuModel(): ModelName {
  const provider = getAPIProvider()
  if (provider === 'openai' && readEnv('OPENAI_DEFAULT_HAIKU_MODEL')) {
    return readEnv('OPENAI_DEFAULT_HAIKU_MODEL')!
  }
  if (provider === 'gemini' && readEnv('GEMINI_DEFAULT_HAIKU_MODEL')) {
    return readEnv('GEMINI_DEFAULT_HAIKU_MODEL')!
  }
  if (readEnv('ANTHROPIC_DEFAULT_HAIKU_MODEL')) {
    return readEnv('ANTHROPIC_DEFAULT_HAIKU_MODEL')!
  }
  return getModelStrings().haiku45
}

/** Modelo para runtime según el contexto (permission mode, tamaño de contexto). */
export function getRuntimeMainLoopModel(params: {
  permissionMode: string
  mainLoopModel: string
  exceeds200kTokens?: boolean
}): ModelName {
  const { permissionMode, mainLoopModel, exceeds200kTokens = false } = params

  if (getUserSpecifiedModelSetting() === 'opusplan' && permissionMode === 'plan' && !exceeds200kTokens) {
    return getDefaultOpusModel()
  }
  if (getUserSpecifiedModelSetting() === 'haiku' && permissionMode === 'plan') {
    return getDefaultSonnetModel()
  }
  return mainLoopModel
}

/** Setting de modelo por defecto del bucle principal (Opus para Max/Team Premium, Sonnet 4.6 el resto). */
export function getDefaultMainLoopModelSetting(): ModelName | ModelAlias {
  if (process.env.USER_TYPE === 'ant') {
    return (getAntModelOverrideConfig()?.defaultModel as string) ?? getDefaultOpusModel() + '[1m]'
  }
  if (isMaxSubscriber()) {
    return getDefaultOpusModel() + (isOpus1mMergeEnabled() ? '[1m]' : '')
  }
  if (isTeamPremiumSubscriber()) {
    return getDefaultOpusModel() + (isOpus1mMergeEnabled() ? '[1m]' : '')
  }
  return getDefaultSonnetModel()
}

/** Modelo por defecto del bucle principal, ya inflado a la forma compuesta con conexión. */
export function getDefaultMainLoopModel(): ModelName {
  const bare = parseUserSpecifiedModel(getDefaultMainLoopModelSetting())
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { inflateModelSetting } = require('./connections.ts') as typeof import('./connections.ts')
  const inflated = inflateModelSetting(bare)
  return typeof inflated === 'string' ? inflated : bare
}

/** Match puro de string: recorta sufijos de fecha/proveedor de un id 1P. */
export function firstPartyNameToCanonical(name: ModelName): ModelShortName {
  name = name.toLowerCase()
  if (name.includes('claude-opus-4-8')) return 'claude-opus-4-8'
  if (name.includes('claude-opus-4-7')) return 'claude-opus-4-7'
  if (name.includes('claude-opus-4-6')) return 'claude-opus-4-6'
  if (name.includes('claude-opus-4-5')) return 'claude-opus-4-5'
  if (name.includes('claude-opus-4-1')) return 'claude-opus-4-1'
  if (name.includes('claude-opus-4')) return 'claude-opus-4'
  if (name.includes('claude-sonnet-4-6')) return 'claude-sonnet-4-6'
  if (name.includes('claude-sonnet-4-5')) return 'claude-sonnet-4-5'
  if (name.includes('claude-sonnet-4')) return 'claude-sonnet-4'
  if (name.includes('claude-haiku-4-5')) return 'claude-haiku-4-5'
  if (name.includes('claude-3-7-sonnet')) return 'claude-3-7-sonnet'
  if (name.includes('claude-3-5-sonnet')) return 'claude-3-5-sonnet'
  if (name.includes('claude-3-5-haiku')) return 'claude-3-5-haiku'
  if (name.includes('claude-3-opus')) return 'claude-3-opus'
  if (name.includes('claude-3-sonnet')) return 'claude-3-sonnet'
  if (name.includes('claude-3-haiku')) return 'claude-3-haiku'
  const match = name.match(/(claude-(\d+-\d+-)?\w+)/)
  if (match && match[1]) return match[1]
  return name
}

/** Mapea un nombre de modelo completo a su forma canónica corta, unificada entre 1P y 3P. */
export function getCanonicalName(fullModelName: ModelName): ModelShortName {
  return firstPartyNameToCanonical(resolveOverriddenModel(fullModelName))
}

export function getClaudeAiUserDefaultModelDescription(fastMode = false): string {
  if (isMaxSubscriber() || isTeamPremiumSubscriber()) {
    if (isOpus1mMergeEnabled()) {
      return `Opus 4.8 with 1M context · Most capable for complex work${fastMode ? getOpusFastModePricingSuffix(true) : ''}`
    }
    return `Opus 4.8 · Most capable for complex work${fastMode ? getOpusFastModePricingSuffix(true) : ''}`
  }
  return 'Sonnet 4.6 · Best for everyday tasks'
}

export function renderDefaultModelSetting(setting: ModelName | ModelAlias): string {
  if (setting === 'opusplan') {
    return 'Opus 4.8 in plan mode, else Sonnet 4.6'
  }
  return renderModelName(parseUserSpecifiedModel(setting))
}

export function getOpusFastModePricingSuffix(fastMode: boolean): string {
  if (getAPIProvider() !== 'firstParty') return ''
  const pricing = formatModelPricing(getOpus46CostTier(fastMode, isFastModeEnabled()))
  const fastModeIndicator = fastMode ? ` (${LIGHTNING_BOLT})` : ''
  return ` ·${fastModeIndicator} ${pricing}`
}

export const getOpus46PricingSuffix = getOpusFastModePricingSuffix

export function isOpus1mMergeEnabled(): boolean {
  if (is1mContextDisabled() || isProSubscriber() || getAPIProvider() !== 'firstParty') {
    return false
  }
  if (isClaudeAISubscriber() && getSubscriptionType() === null) {
    return false
  }
  return true
}

export function renderModelSetting(setting: ModelName | ModelAlias): string {
  if (setting === 'opusplan') return 'Opus Plan'
  if (isModelAlias(setting)) return capitalize(setting)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { unpackModelId, getConnections, prettyModelLabel } = require('./connections.ts') as typeof import('./connections.ts')
  const { connectionId, modelId } = unpackModelId(setting)
  if (connectionId) {
    const conn = getConnections().find(c => c.id === connectionId)
    if (conn) {
      const m = conn.models.find(mm => mm.id === modelId)
      if (m) return prettyModelLabel(m)
      return renderModelName(modelId as ModelName)
    }
    return renderModelName(modelId as ModelName)
  }
  return renderModelName(setting)
}

/** Nombre de display para modelos públicos conocidos, o null si no se reconoce. */
export function getPublicModelDisplayName(model: ModelName): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { unpackModelId } = require('./connections.ts') as typeof import('./connections.ts')
  const { modelId } = unpackModelId(model)
  if (modelId !== model) model = modelId as ModelName
  const s = getModelStrings()
  switch (model) {
    case s.opus48:
      return 'Opus 4.8'
    case s.opus48 + '[1m]':
      return 'Opus 4.8 (1M context)'
    case s.opus47:
      return 'Opus 4.7'
    case s.opus47 + '[1m]':
      return 'Opus 4.7 (1M context)'
    case s.opus46:
      return 'Opus 4.6'
    case s.opus46 + '[1m]':
      return 'Opus 4.6 (1M context)'
    case s.opus45:
      return 'Opus 4.5'
    case s.opus41:
      return 'Opus 4.1'
    case s.opus40:
      return 'Opus 4'
    case s.sonnet46 + '[1m]':
      return 'Sonnet 4.6 (1M context)'
    case s.sonnet46:
      return 'Sonnet 4.6'
    case s.sonnet45 + '[1m]':
      return 'Sonnet 4.5 (1M context)'
    case s.sonnet45:
      return 'Sonnet 4.5'
    case s.sonnet40:
      return 'Sonnet 4'
    case s.sonnet40 + '[1m]':
      return 'Sonnet 4 (1M context)'
    case s.sonnet37:
      return 'Sonnet 3.7'
    case s.sonnet35:
      return 'Sonnet 3.5'
    case s.haiku45:
      return 'Haiku 4.5'
    case s.haiku35:
      return 'Haiku 3.5'
    default:
      return null
  }
}

function maskModelCodename(baseName: string): string {
  const [codename = '', ...rest] = baseName.split('-')
  const masked = codename.slice(0, 3) + '*'.repeat(Math.max(0, codename.length - 3))
  return [masked, ...rest].join('-')
}

export function renderModelName(model: ModelName): string {
  const publicName = getPublicModelDisplayName(model)
  if (publicName) return publicName
  if (process.env.USER_TYPE === 'ant') {
    const resolved = parseUserSpecifiedModel(model)
    const antModel = resolveAntModel(model)
    if (antModel) {
      const baseName = antModel.model.replace(/\[1m\]$/i, '')
      const masked = maskModelCodename(baseName)
      const suffix = has1mContext(resolved) ? '[1m]' : ''
      return masked + suffix
    }
    if (resolved !== model) return `${model} (${resolved})`
    return resolved
  }
  return model
}

/** Nombre de autor seguro para display público (ej. trailers de commit). */
export function getPublicModelName(model: ModelName): string {
  const publicName = getPublicModelDisplayName(model)
  if (publicName) return `Claude ${publicName}`
  return `Claude (${model})`
}

/** Resuelve un alias o nombre de modelo dado por el usuario a un nombre completo. */
export function parseUserSpecifiedModel(modelInput: ModelName | ModelAlias): ModelName {
  const modelInputTrimmed = modelInput.trim()
  const normalizedModel = modelInputTrimmed.toLowerCase()

  const has1mTag = has1mContext(normalizedModel)
  const modelString = has1mTag ? normalizedModel.replace(/\[1m]$/i, '').trim() : normalizedModel

  if (isModelAlias(modelString)) {
    switch (modelString) {
      case 'opusplan':
        return getDefaultSonnetModel() + (has1mTag ? '[1m]' : '')
      case 'sonnet':
        return getDefaultSonnetModel() + (has1mTag ? '[1m]' : '')
      case 'haiku':
        return getDefaultHaikuModel() + (has1mTag ? '[1m]' : '')
      case 'opus':
        return getDefaultOpusModel() + (has1mTag ? '[1m]' : '')
      case 'best':
        return getBestModel()
      default:
    }
  }

  if (getAPIProvider() === 'firstParty' && isLegacyOpusFirstParty(modelString) && isLegacyModelRemapEnabled()) {
    return getDefaultOpusModel() + (has1mTag ? '[1m]' : '')
  }

  if (process.env.USER_TYPE === 'ant') {
    const has1mAntTag = has1mContext(normalizedModel)
    const baseAntModel = normalizedModel.replace(/\[1m]$/i, '').trim()
    const antModel = resolveAntModel(baseAntModel)
    if (antModel) {
      const suffix = has1mAntTag ? '[1m]' : ''
      return antModel.model + suffix
    }
  }

  if (has1mTag) {
    return modelInputTrimmed.replace(/\[1m\]$/i, '').trim() + '[1m]'
  }
  return modelInputTrimmed
}

/**
 * Resuelve el `model:` frontmatter de un skill contra el modelo actual,
 * heredando el sufijo `[1m]` cuando la familia destino lo soporta.
 */
export function resolveSkillModelOverride(skillModel: string, currentModel: string): string {
  if (has1mContext(skillModel) || !has1mContext(currentModel)) {
    return skillModel
  }
  if (modelSupports1M(parseUserSpecifiedModel(skillModel))) {
    return skillModel + '[1m]'
  }
  return skillModel
}

const LEGACY_OPUS_FIRSTPARTY = [
  'claude-opus-4-20250514',
  'claude-opus-4-1-20250805',
  'claude-opus-4-0',
  'claude-opus-4-1',
]

function isLegacyOpusFirstParty(model: string): boolean {
  return LEGACY_OPUS_FIRSTPARTY.includes(model)
}

export function isLegacyModelRemapEnabled(): boolean {
  return !isEnvTruthy(readEnv('CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP'))
}

export function modelDisplayString(model: ModelSetting): string {
  if (model === null) {
    if (process.env.USER_TYPE === 'ant') {
      return `Default for Ants (${renderDefaultModelSetting(getDefaultMainLoopModelSetting())})`
    } else if (isClaudeAISubscriber()) {
      return `Default (${getClaudeAiUserDefaultModelDescription()})`
    }
    return `Default (${renderModelSetting(getDefaultMainLoopModel())})`
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { unpackModelId } = require('./connections.ts') as typeof import('./connections.ts')
  if (unpackModelId(model).connectionId) {
    return renderModelSetting(model as ModelName)
  }
  const resolvedModel = parseUserSpecifiedModel(model)
  return model === resolvedModel ? resolvedModel : `${model} (${resolvedModel})`
}

export function getMarketingNameForModel(modelId: string): string | undefined {
  if (getAPIProvider() === 'foundry') return undefined

  const has1m = modelId.toLowerCase().includes('[1m]')
  const canonical = getCanonicalName(modelId)

  if (canonical.includes('claude-opus-4-8')) return has1m ? 'Opus 4.8 (with 1M context)' : 'Opus 4.8'
  if (canonical.includes('claude-opus-4-7')) return has1m ? 'Opus 4.7 (with 1M context)' : 'Opus 4.7'
  if (canonical.includes('claude-opus-4-6')) return has1m ? 'Opus 4.6 (with 1M context)' : 'Opus 4.6'
  if (canonical.includes('claude-opus-4-5')) return 'Opus 4.5'
  if (canonical.includes('claude-opus-4-1')) return 'Opus 4.1'
  if (canonical.includes('claude-opus-4')) return 'Opus 4'
  if (canonical.includes('claude-sonnet-4-6')) return has1m ? 'Sonnet 4.6 (with 1M context)' : 'Sonnet 4.6'
  if (canonical.includes('claude-sonnet-4-5')) return has1m ? 'Sonnet 4.5 (with 1M context)' : 'Sonnet 4.5'
  if (canonical.includes('claude-sonnet-4')) return has1m ? 'Sonnet 4 (with 1M context)' : 'Sonnet 4'
  if (canonical.includes('claude-3-7-sonnet')) return 'Claude 3.7 Sonnet'
  if (canonical.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet'
  if (canonical.includes('claude-haiku-4-5')) return 'Haiku 4.5'
  if (canonical.includes('claude-3-5-haiku')) return 'Claude 3.5 Haiku'

  return undefined
}

export function normalizeModelStringForAPI(model: string): string {
  return model.replace(/\[(1|2)m\]/gi, '')
}
