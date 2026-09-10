/**
 * Porte de `ccnmt: packages/provider/src/modelOptions.ts` — sus 5
 * exportaciones públicas (`ModelOption`, `getDefaultOptionForUser`,
 * `getSonnet46_1MOption`, `getOpus48_1MOption`, `getMaxSonnet46_1MOption`,
 * `getMaxOpus48_1MOption`, `getModelOptions`), ninguna omitida.
 *
 * Mismas divergencias que `model.ts` (ver su cabecera):
 * `getModelStrings`/`getAntModels`/pricing/`checkOpus1mAccess`/
 * `isModelAllowed`/`isGatewayModelDiscoveryEnabled` vienen de
 * `internal/modelSupport.ts`. `getGlobalConfig`/`getSettings`
 * (`@thyrox/config`) → helpers de `internal/modelSupport.ts` con
 * `require()` diferido y fallback seguro.
 */

import { isClaudeAISubscriber, isMaxSubscriber, isTeamPremiumSubscriber } from './authAlias.ts'
import { has1mContext } from '@thyrox/agent/context'
import { readEnv } from '@thyrox/config/env/utils'
import { getAPIProvider, getEnabledConnections } from './providers.ts'
import { composeModelId, prettyModelLabel } from './connections.ts'
import {
  getCanonicalName,
  getClaudeAiUserDefaultModelDescription,
  getDefaultSonnetModel,
  getDefaultOpusModel,
  getDefaultHaikuModel,
  getDefaultMainLoopModelSetting,
  getMarketingNameForModel,
  getUserSpecifiedModelSetting,
  isOpus1mMergeEnabled,
  getOpusFastModePricingSuffix,
  renderDefaultModelSetting,
  type ModelSetting,
} from './model.ts'
import {
  getModelStrings,
  getAntModels,
  COST_TIER_3_15,
  COST_HAIKU_35,
  COST_HAIKU_45,
  formatModelPricing,
  isModelAllowed,
  checkOpus1mAccess,
  checkSonnet1mAccess,
  isGatewayModelDiscoveryEnabled,
  readCachedGatewayModels,
  getInitialMainLoopModel,
  getSettingsAvailableModels,
  getGlobalConfigAdditionalModelOptions,
} from './internal/modelSupport.ts'
import { is1mContextDisabled } from '@thyrox/agent/context'

export type ModelOption = {
  value: ModelSetting
  label: string
  description: string
  descriptionForModel?: string
}

export function getDefaultOptionForUser(fastMode = false): ModelOption {
  if (process.env.USER_TYPE === 'ant') {
    const currentModel = renderDefaultModelSetting(getDefaultMainLoopModelSetting())
    return {
      value: null,
      label: 'Default (recommended)',
      description: `Use the default model for Ants (currently ${currentModel})`,
      descriptionForModel: `Default model (currently ${currentModel})`,
    }
  }

  if (isClaudeAISubscriber()) {
    return {
      value: null,
      label: 'Default (recommended)',
      description: getClaudeAiUserDefaultModelDescription(fastMode),
    }
  }

  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: null,
    label: 'Default (recommended)',
    description: `Use the default model (currently ${renderDefaultModelSetting(getDefaultMainLoopModelSetting())})${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
  }
}

function customModelEnvOption(kind: 'OPUS' | 'SONNET' | 'HAIKU', value: ModelSetting): ModelOption | undefined {
  const is3P = getAPIProvider() !== 'firstParty'
  const provider = getAPIProvider()
  const envKey = (suffix: string) =>
    provider === 'openai'
      ? `OPENAI_DEFAULT_${kind}_MODEL${suffix}`
      : provider === 'gemini'
        ? `GEMINI_DEFAULT_${kind}_MODEL${suffix}`
        : `ANTHROPIC_DEFAULT_${kind}_MODEL${suffix}`
  const customModel = readEnv(envKey(''))
  if (is3P && customModel) {
    const is1m = has1mContext(customModel)
    const nameEnv = readEnv(envKey('_NAME'))
    const descEnv = readEnv(envKey('_DESCRIPTION'))
    const label = kind === 'OPUS' ? 'Opus' : kind === 'SONNET' ? 'Sonnet' : 'Haiku'
    return {
      value,
      label: nameEnv ?? customModel,
      description: descEnv ?? `Custom ${label} model${is1m ? ' (1M context)' : ''}`,
      descriptionForModel: `${descEnv ?? `Custom ${label} model${is1m ? ' with 1M context' : ''}`} (${customModel})`,
    }
  }
  return undefined
}

function getOpus41Option(): ModelOption {
  return {
    value: 'opus',
    label: 'Opus 4.1',
    description: `Opus 4.1 · Legacy`,
    descriptionForModel: 'Opus 4.1 - legacy version',
  }
}

function getSonnet46Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().sonnet46 : 'sonnet',
    label: 'Sonnet',
    description: `Sonnet 4.6 · Best for everyday tasks${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
    descriptionForModel: 'Sonnet 4.6 - best for everyday tasks. Generally recommended for most coding tasks',
  }
}

function getOpus48Option(fastMode = false): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().opus48 : 'opus',
    label: 'Opus',
    description: `Opus 4.8 · Most capable for complex work${getOpusFastModePricingSuffix(fastMode)}`,
    descriptionForModel: 'Opus 4.8 - most capable for complex work',
  }
}

export function getSonnet46_1MOption(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().sonnet46 + '[1m]' : 'sonnet[1m]',
    label: 'Sonnet (1M context)',
    description: `Sonnet 4.6 for long sessions${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
    descriptionForModel: 'Sonnet 4.6 with 1M context window - for long sessions with large codebases',
  }
}

export function getOpus48_1MOption(fastMode = false): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().opus48 + '[1m]' : 'opus[1m]',
    label: 'Opus (1M context)',
    description: `Opus 4.8 for long sessions${getOpusFastModePricingSuffix(fastMode)}`,
    descriptionForModel: 'Opus 4.8 with 1M context window - for long sessions with large codebases',
  }
}

function getHaiku45Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: 'haiku',
    label: 'Haiku',
    description: `Haiku 4.5 · Fastest for quick answers${is3P ? '' : ` · ${formatModelPricing(COST_HAIKU_45)}`}`,
    descriptionForModel: 'Haiku 4.5 - fastest for quick answers. Lower cost but less capable than Sonnet 4.6.',
  }
}

function getHaiku35Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: 'haiku',
    label: 'Haiku',
    description: `Haiku 3.5 for simple tasks${is3P ? '' : ` · ${formatModelPricing(COST_HAIKU_35)}`}`,
    descriptionForModel: 'Haiku 3.5 - faster and lower cost, but less capable than Sonnet. Use for simple tasks.',
  }
}

function getHaikuOption(): ModelOption {
  const haikuModel = getDefaultHaikuModel()
  return haikuModel === getModelStrings().haiku45 ? getHaiku45Option() : getHaiku35Option()
}

function getMaxOpusOption(fastMode = false): ModelOption {
  return {
    value: 'opus',
    label: 'Opus',
    description: `Opus 4.8 · Most capable for complex work${fastMode ? getOpusFastModePricingSuffix(true) : ''}`,
  }
}

export function getMaxSonnet46_1MOption(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  const billingInfo = isClaudeAISubscriber() ? ' · Billed as extra usage' : ''
  return {
    value: 'sonnet[1m]',
    label: 'Sonnet (1M context)',
    description: `Sonnet 4.6 with 1M context${billingInfo}${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
  }
}

export function getMaxOpus48_1MOption(fastMode = false): ModelOption {
  const billingInfo = isClaudeAISubscriber() ? ' · Billed as extra usage' : ''
  return {
    value: 'opus[1m]',
    label: 'Opus (1M context)',
    description: `Opus 4.8 with 1M context${billingInfo}${getOpusFastModePricingSuffix(fastMode)}`,
  }
}

function getMergedOpus1MOption(fastMode = false): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().opus48 + '[1m]' : 'opus[1m]',
    label: 'Opus (1M context)',
    description: `Opus 4.8 with 1M context · Most capable for complex work${!is3P && fastMode ? getOpusFastModePricingSuffix(fastMode) : ''}`,
    descriptionForModel: 'Opus 4.8 with 1M context - most capable for complex work',
  }
}

const MaxSonnet46Option: ModelOption = {
  value: 'sonnet',
  label: 'Sonnet',
  description: 'Sonnet 4.6 · Best for everyday tasks',
}

const MaxHaiku45Option: ModelOption = {
  value: 'haiku',
  label: 'Haiku',
  description: 'Haiku 4.5 · Fastest for quick answers',
}

function getOpusPlanOption(): ModelOption {
  return {
    value: 'opusplan',
    label: 'Opus Plan Mode',
    description: 'Use Opus 4.8 in plan mode, Sonnet 4.6 otherwise',
  }
}

function getModelOptionsBase(fastMode = false): ModelOption[] {
  if (process.env.USER_TYPE === 'ant') {
    const antModelOptions: ModelOption[] = getAntModels().map(m => ({
      value: m.alias,
      label: m.label,
      description: m.description ?? `[ANT-ONLY] ${m.label} (${m.model})`,
    }))
    return [
      getDefaultOptionForUser(),
      ...antModelOptions,
      getMergedOpus1MOption(fastMode),
      getSonnet46Option(),
      getSonnet46_1MOption(),
      getHaiku45Option(),
    ]
  }

  const disabled1m = is1mContextDisabled()

  if (isClaudeAISubscriber()) {
    if (isMaxSubscriber() || isTeamPremiumSubscriber()) {
      const premiumOptions = [getDefaultOptionForUser(fastMode)]
      if (!isOpus1mMergeEnabled() && checkOpus1mAccess(disabled1m, true)) {
        premiumOptions.push(getMaxOpus48_1MOption(fastMode))
      }
      premiumOptions.push(MaxSonnet46Option)
      if (checkSonnet1mAccess(disabled1m, true)) {
        premiumOptions.push(getMaxSonnet46_1MOption())
      }
      premiumOptions.push(MaxHaiku45Option)
      return premiumOptions
    }

    const standardOptions = [getDefaultOptionForUser(fastMode)]
    if (checkSonnet1mAccess(disabled1m, true)) {
      standardOptions.push(getMaxSonnet46_1MOption())
    }
    if (isOpus1mMergeEnabled()) {
      standardOptions.push(getMergedOpus1MOption(fastMode))
    } else {
      standardOptions.push(getMaxOpusOption(fastMode))
      if (checkOpus1mAccess(disabled1m, true)) {
        standardOptions.push(getMaxOpus48_1MOption(fastMode))
      }
    }
    standardOptions.push(MaxHaiku45Option)
    return standardOptions
  }

  if (getAPIProvider() === 'firstParty') {
    const payg1POptions = [getDefaultOptionForUser(fastMode)]
    if (checkSonnet1mAccess(disabled1m, false)) {
      payg1POptions.push(getSonnet46_1MOption())
    }
    if (isOpus1mMergeEnabled()) {
      payg1POptions.push(getMergedOpus1MOption(fastMode))
    } else {
      payg1POptions.push(getOpus48Option(fastMode))
      if (checkOpus1mAccess(disabled1m, false)) {
        payg1POptions.push(getOpus48_1MOption(fastMode))
      }
    }
    payg1POptions.push(getHaiku45Option())
    return payg1POptions
  }

  // PAYG 3P: Default + Sonnet (custom por env, o Sonnet 4.6 + 1M) + Opus
  // (custom por env, o Opus 4.1 + Opus 4.8 + 1M) + Haiku (custom o default).
  const payg3pOptions = [getDefaultOptionForUser(fastMode)]

  const customSonnet = customModelEnvOption('SONNET', 'sonnet')
  if (customSonnet !== undefined) {
    payg3pOptions.push(customSonnet)
  } else {
    payg3pOptions.push(getSonnet46Option())
    if (checkSonnet1mAccess(disabled1m, false)) {
      payg3pOptions.push(getSonnet46_1MOption())
    }
  }

  const customOpus = customModelEnvOption('OPUS', 'opus')
  if (customOpus !== undefined) {
    payg3pOptions.push(customOpus)
  } else {
    payg3pOptions.push(getOpus41Option())
    payg3pOptions.push(getOpus48Option(fastMode))
    if (checkOpus1mAccess(disabled1m, false)) {
      payg3pOptions.push(getOpus48_1MOption(fastMode))
    }
  }

  const customHaiku = customModelEnvOption('HAIKU', 'haiku')
  if (customHaiku !== undefined) {
    payg3pOptions.push(customHaiku)
  } else {
    payg3pOptions.push(getHaikuOption())
  }
  return payg3pOptions
}

/**
 * Mapea un modelo completo a su alias de familia y el nombre de marketing
 * de la versión a la que el alias resuelve hoy — para detectar cuándo hay
 * una versión más nueva disponible que la que el usuario tiene fijada.
 */
function getModelFamilyInfo(model: string): { alias: string; currentVersionName: string } | null {
  const canonical = getCanonicalName(model)

  if (
    canonical.includes('claude-sonnet-4-6') ||
    canonical.includes('claude-sonnet-4-5') ||
    canonical.includes('claude-sonnet-4-') ||
    canonical.includes('claude-3-7-sonnet') ||
    canonical.includes('claude-3-5-sonnet')
  ) {
    const currentName = getMarketingNameForModel(getDefaultSonnetModel())
    if (currentName) return { alias: 'Sonnet', currentVersionName: currentName }
  }

  if (canonical.includes('claude-opus-4')) {
    const currentName = getMarketingNameForModel(getDefaultOpusModel())
    if (currentName) return { alias: 'Opus', currentVersionName: currentName }
  }

  if (canonical.includes('claude-haiku') || canonical.includes('claude-3-5-haiku')) {
    const currentName = getMarketingNameForModel(getDefaultHaikuModel())
    if (currentName) return { alias: 'Haiku', currentVersionName: currentName }
  }

  return null
}

/**
 * `ModelOption` para un modelo Anthropic conocido, con hint de upgrade si
 * el alias de su familia resuelve hoy a una versión más nueva.
 */
function getKnownModelOption(model: ModelSetting): ModelOption | undefined {
  if (model === null) return undefined
  const marketingName = getMarketingNameForModel(model)
  if (!marketingName) return undefined

  const familyInfo = getModelFamilyInfo(model)
  if (!familyInfo) {
    return { value: model, label: marketingName, description: model }
  }
  if (marketingName !== familyInfo.currentVersionName) {
    return {
      value: model,
      label: marketingName,
      description: `Newer version available · select ${familyInfo.alias} for ${familyInfo.currentVersionName}`,
    }
  }
  return { value: model, label: marketingName, description: model }
}

function getConnectionModelOptions(): ModelOption[] {
  const options: ModelOption[] = []
  for (const conn of getEnabledConnections()) {
    const byId = new Map<string, { first: (typeof conn.models)[number]; descriptions: string[] }>()
    for (const model of conn.models) {
      const existing = byId.get(model.id)
      const desc = model.description?.trim()
      if (existing) {
        if (desc && !existing.descriptions.includes(desc)) {
          existing.descriptions.push(desc)
        }
        continue
      }
      byId.set(model.id, { first: model, descriptions: desc ? [desc] : [] })
    }
    for (const { first, descriptions } of byId.values()) {
      const joinedDescription = descriptions.length > 0 ? descriptions.join(' / ') : `${conn.name} · ${conn.protocol}`
      options.push({
        value: composeModelId(conn.id, first.id),
        label: `[${conn.name}] ${prettyModelLabel(first)}`,
        description: joinedDescription,
        descriptionForModel: `${conn.name} · ${first.id}`,
      })
    }
  }
  return options
}

/** Filtra opciones por el allowlist de `availableModels`, preservando "Default". */
function filterModelOptionsByAllowlist(options: ModelOption[]): ModelOption[] {
  const settings = getSettingsAvailableModels()
  if (!settings.availableModels) return options
  return options.filter(opt => opt.value === null || (opt.value !== null && isModelAllowed(opt.value)))
}

export function getModelOptions(fastMode = false, opts?: { includeDefaultOption?: boolean }): ModelOption[] {
  const connectionOptions = getConnectionModelOptions()
  if (connectionOptions.length > 0) {
    const options = filterModelOptionsByAllowlist(connectionOptions)
    if (opts?.includeDefaultOption) {
      options.unshift({
        value: null,
        label: "Default (leader's model)",
        description: "Use the same model as the leader. Teammates follow the leader's model choice.",
      })
    }
    return options
  }

  const options = getModelOptionsBase(fastMode)

  const envCustomModel = readEnv('ANTHROPIC_CUSTOM_MODEL_OPTION')
  if (envCustomModel && !options.some(existing => existing.value === envCustomModel)) {
    options.push({
      value: envCustomModel,
      label: readEnv('ANTHROPIC_CUSTOM_MODEL_OPTION_NAME') ?? envCustomModel,
      description: readEnv('ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION') ?? `Custom model (${envCustomModel})`,
    })
  }

  for (const opt of getGlobalConfigAdditionalModelOptions()) {
    if (!options.some(existing => existing.value === opt.value)) {
      options.push(opt)
    }
  }

  try {
    if (isGatewayModelDiscoveryEnabled()) {
      for (const opt of readCachedGatewayModels()) {
        if (!options.some(existing => existing.value === opt.value)) {
          options.push(opt)
        }
      }
    }
  } catch {
    // gateway discovery no disponible — el picker sigue con la lista estática
  }

  let customModel: ModelSetting = null
  const currentMainLoopModel = getUserSpecifiedModelSetting()
  const initialMainLoopModel = getInitialMainLoopModel()
  if (currentMainLoopModel !== undefined && currentMainLoopModel !== null) {
    customModel = currentMainLoopModel
  } else if (initialMainLoopModel !== null) {
    customModel = initialMainLoopModel
  }
  if (customModel === null || options.some(opt => opt.value === customModel)) {
    return filterModelOptionsByAllowlist(options)
  } else if (customModel === 'opusplan') {
    return filterModelOptionsByAllowlist([...options, getOpusPlanOption()])
  } else if (customModel === 'opus' && getAPIProvider() === 'firstParty') {
    return filterModelOptionsByAllowlist([...options, getMaxOpusOption(fastMode)])
  } else if (customModel === 'opus[1m]' && getAPIProvider() === 'firstParty') {
    return filterModelOptionsByAllowlist([...options, getMergedOpus1MOption(fastMode)])
  } else {
    const knownOption = getKnownModelOption(customModel)
    if (knownOption) {
      options.push(knownOption)
    } else {
      options.push({ value: customModel, label: customModel, description: 'Custom model' })
    }
    return filterModelOptionsByAllowlist(options)
  }
}
