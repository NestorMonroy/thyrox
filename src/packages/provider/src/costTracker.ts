/**
 * Porte de `ccnmt: packages/provider/src/costTracker.ts` — sus 21
 * exportaciones (18 re-exportadas desde el estado de sesión + 3 propias:
 * `getStoredSessionCosts`, `restoreCostStateForSession`,
 * `saveCurrentSessionCosts`, `formatTotalCost`, `addToTotalSessionCost`),
 * ninguna omitida.
 *
 * El acumulador real (`app-host/bootstrap/state.js`) es zona prohibida —
 * la escribe otro agente en paralelo esta sesión, y de todas formas no
 * está asignada a este pase. Se accede vía UN único `require()` diferido
 * (`requireBootstrapState`), mismo patrón de indirección que
 * `claudeLegacy.ts`'s `getLegacyRuntime()`. `./advisor.js` → sólo se porta
 * la función pura que se consume (`getAdvisorUsage`, en
 * `internal/pendingCrossPackageDeps.ts`). `./fastMode.js` → ídem
 * (`isFastModeEnabled`). `./modelCost.js` (`calculateUSDCost`) NO está
 * asignado a este pase → `require()` diferido relativo (nunca resolverá
 * hasta que se porte, igual que los demás "declarados colgantes" de este
 * árbol). `getModelMaxOutputTokens` (`@thyrox/agent/context.ts`) no está
 * portado ahí todavía → `require()` diferido sobre el mismo subpath;
 * `getContextWindowForModel` SÍ resuelve y se importa estático.
 */

import type { BetaUsage as Usage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import chalk from 'chalk'
import type { ModelUsage } from '@thyrox/headless-sdk/agentSdkTypes.ts'
import { getAdvisorUsage, isFastModeEnabled } from './internal/pendingCrossPackageDeps.ts'
import { getContextWindowForModel } from '@thyrox/agent/context.ts'
import { formatDuration, formatNumber } from '@thyrox/output/formatters.ts'
import type { FpsMetrics } from '@thyrox/output/fpsTracker.js'
import { getCanonicalName } from './model.ts'

type StoredCostState = {
  totalCostUSD: number
  totalAPIDuration: number
  totalAPIDurationWithoutRetries: number
  totalToolDuration: number
  totalLinesAdded: number
  totalLinesRemoved: number
  lastDuration: number | undefined
  modelUsage: { [modelName: string]: ModelUsage } | undefined
}

type BootstrapState = {
  addToTotalCostState: (cost: number, usage: ModelUsage, model: string) => void
  addToTotalLinesChanged: (added: number, removed: number) => void
  getCostCounter: () => { add: (v: number, attrs: Record<string, unknown>) => void } | undefined
  getModelUsage: () => { [modelName: string]: ModelUsage }
  getSdkBetas: () => string[]
  getSessionId: () => string
  getTokenCounter: () => { add: (v: number, attrs: Record<string, unknown>) => void } | undefined
  getTotalAPIDuration: () => number
  getTotalAPIDurationWithoutRetries: () => number
  getTotalCacheCreationInputTokens: () => number
  getTotalCacheReadInputTokens: () => number
  getTotalCostUSD: () => number
  getTotalDuration: () => number
  getTotalInputTokens: () => number
  getTotalLinesAdded: () => number
  getTotalLinesRemoved: () => number
  getTotalOutputTokens: () => number
  getTotalToolDuration: () => number
  getTotalWebSearchRequests: () => number
  getUsageForModel: (model: string) => ModelUsage | undefined
  hasUnknownModelCost: () => boolean
  resetCostState: () => void
  resetStateForTests: () => void
  setCostStateForRestore: (data: StoredCostState) => void
  setHasUnknownModelCost: (v: boolean) => void
  getCurrentProjectConfig: () => Record<string, unknown> & {
    lastSessionId?: string
    lastModelUsage?: Record<string, ModelUsage>
    lastCost?: number
    lastAPIDuration?: number
    lastAPIDurationWithoutRetries?: number
    lastToolDuration?: number
    lastLinesAdded?: number
    lastLinesRemoved?: number
    lastDuration?: number
  }
  saveCurrentProjectConfig: (
    updater: (current: ReturnType<BootstrapState['getCurrentProjectConfig']>) => Record<string, unknown>,
  ) => void
}

function requireBootstrapState(): BootstrapState {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const state = require('@thyrox/app-host/bootstrap/state.js') as Partial<BootstrapState>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const config = require('@thyrox/config') as {
    getCurrentProjectConfig?: BootstrapState['getCurrentProjectConfig']
    saveCurrentProjectConfig?: BootstrapState['saveCurrentProjectConfig']
  }
  return { ...state, ...config } as BootstrapState
}

function requireModelCost(): { calculateUSDCost: (model: string, usage: Usage) => number } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./modelCost.ts')
}

function requireModelMaxOutputTokens(): (model: string) => { default: number } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@thyrox/agent/context.ts') as { getModelMaxOutputTokens: (model: string) => { default: number } }).getModelMaxOutputTokens
}

export const getTotalCost = () => requireBootstrapState().getTotalCostUSD()
export const getTotalDuration = () => requireBootstrapState().getTotalDuration()
export const getTotalAPIDuration = () => requireBootstrapState().getTotalAPIDuration()
export const getTotalAPIDurationWithoutRetries = () =>
  requireBootstrapState().getTotalAPIDurationWithoutRetries()
export const addToTotalLinesChanged = (added: number, removed: number) =>
  requireBootstrapState().addToTotalLinesChanged(added, removed)
export const getTotalLinesAdded = () => requireBootstrapState().getTotalLinesAdded()
export const getTotalLinesRemoved = () => requireBootstrapState().getTotalLinesRemoved()
export const getTotalInputTokens = () => requireBootstrapState().getTotalInputTokens()
export const getTotalOutputTokens = () => requireBootstrapState().getTotalOutputTokens()
export const getTotalCacheReadInputTokens = () => requireBootstrapState().getTotalCacheReadInputTokens()
export const getTotalCacheCreationInputTokens = () =>
  requireBootstrapState().getTotalCacheCreationInputTokens()
export const getTotalWebSearchRequests = () => requireBootstrapState().getTotalWebSearchRequests()
export const hasUnknownModelCost = () => requireBootstrapState().hasUnknownModelCost()
export const resetStateForTests = () => requireBootstrapState().resetStateForTests()
export const resetCostState = () => requireBootstrapState().resetCostState()
export const setHasUnknownModelCost = (v: boolean) => requireBootstrapState().setHasUnknownModelCost(v)
export const getModelUsage = () => requireBootstrapState().getModelUsage()
export const getUsageForModel = (model: string) => requireBootstrapState().getUsageForModel(model)

/**
 * Lee el costo de sesión guardado en el project config. Sólo devuelve datos
 * si el sessionId coincide con el último guardado.
 */
export function getStoredSessionCosts(sessionId: string): StoredCostState | undefined {
  const projectConfig = requireBootstrapState().getCurrentProjectConfig()

  if (projectConfig.lastSessionId !== sessionId) {
    return undefined
  }

  let modelUsage: { [modelName: string]: ModelUsage } | undefined
  if (projectConfig.lastModelUsage) {
    const getModelMaxOutputTokens = requireModelMaxOutputTokens()
    modelUsage = Object.fromEntries(
      Object.entries(projectConfig.lastModelUsage).map(([model, usage]) => [
        model,
        {
          ...usage,
          contextWindow: getContextWindowForModel(model, requireBootstrapState().getSdkBetas()),
          maxOutputTokens: getModelMaxOutputTokens(model).default,
        },
      ]),
    )
  }

  return {
    totalCostUSD: projectConfig.lastCost ?? 0,
    totalAPIDuration: projectConfig.lastAPIDuration ?? 0,
    totalAPIDurationWithoutRetries: projectConfig.lastAPIDurationWithoutRetries ?? 0,
    totalToolDuration: projectConfig.lastToolDuration ?? 0,
    totalLinesAdded: projectConfig.lastLinesAdded ?? 0,
    totalLinesRemoved: projectConfig.lastLinesRemoved ?? 0,
    lastDuration: projectConfig.lastDuration,
    modelUsage,
  }
}

/** Restaura el estado de costo desde el project config, sólo si el sessionId coincide. */
export function restoreCostStateForSession(sessionId: string): boolean {
  const data = getStoredSessionCosts(sessionId)
  if (!data) return false
  requireBootstrapState().setCostStateForRestore(data)
  return true
}

/** Guarda los costos de la sesión actual al project config. */
export function saveCurrentSessionCosts(fpsMetrics?: FpsMetrics): void {
  const state = requireBootstrapState()
  state.saveCurrentProjectConfig(current => ({
    ...current,
    lastCost: state.getTotalCostUSD(),
    lastAPIDuration: state.getTotalAPIDuration(),
    lastAPIDurationWithoutRetries: state.getTotalAPIDurationWithoutRetries(),
    lastToolDuration: state.getTotalToolDuration(),
    lastDuration: state.getTotalDuration(),
    lastLinesAdded: state.getTotalLinesAdded(),
    lastLinesRemoved: state.getTotalLinesRemoved(),
    lastTotalInputTokens: state.getTotalInputTokens(),
    lastTotalOutputTokens: state.getTotalOutputTokens(),
    lastTotalCacheCreationInputTokens: state.getTotalCacheCreationInputTokens(),
    lastTotalCacheReadInputTokens: state.getTotalCacheReadInputTokens(),
    lastTotalWebSearchRequests: state.getTotalWebSearchRequests(),
    lastFpsAverage: fpsMetrics?.averageFps,
    lastFpsLow1Pct: fpsMetrics?.low1PctFps,
    lastModelUsage: Object.fromEntries(
      Object.entries(state.getModelUsage()).map(([model, usage]) => [
        model,
        {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadInputTokens: usage.cacheReadInputTokens,
          cacheCreationInputTokens: usage.cacheCreationInputTokens,
          webSearchRequests: usage.webSearchRequests,
          costUSD: usage.costUSD,
        },
      ]),
    ),
    lastSessionId: state.getSessionId(),
  }))
}

function formatCost(cost: number, maxDecimalPlaces: number = 4): string {
  return `$${cost > 0.5 ? round(cost, 100).toFixed(2) : cost.toFixed(maxDecimalPlaces)}`
}

function formatModelUsage(): string {
  const modelUsageMap = requireBootstrapState().getModelUsage()
  if (Object.keys(modelUsageMap).length === 0) {
    return 'Usage:                 0 input, 0 output, 0 cache read, 0 cache write'
  }

  const usageByShortName: { [shortName: string]: ModelUsage } = {}
  for (const [model, usage] of Object.entries(modelUsageMap)) {
    const shortName = getCanonicalName(model)
    if (!usageByShortName[shortName]) {
      usageByShortName[shortName] = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0,
        contextWindow: 0,
        maxOutputTokens: 0,
      }
    }
    const accumulated = usageByShortName[shortName]!
    accumulated.inputTokens += usage.inputTokens
    accumulated.outputTokens += usage.outputTokens
    accumulated.cacheReadInputTokens += usage.cacheReadInputTokens
    accumulated.cacheCreationInputTokens += usage.cacheCreationInputTokens
    accumulated.webSearchRequests += usage.webSearchRequests
    accumulated.costUSD += usage.costUSD
  }

  let result = 'Usage by model:'
  for (const [shortName, usage] of Object.entries(usageByShortName)) {
    const usageString =
      `  ${formatNumber(usage.inputTokens)} input, ` +
      `${formatNumber(usage.outputTokens)} output, ` +
      `${formatNumber(usage.cacheReadInputTokens)} cache read, ` +
      `${formatNumber(usage.cacheCreationInputTokens)} cache write` +
      (usage.webSearchRequests > 0 ? `, ${formatNumber(usage.webSearchRequests)} web search` : '') +
      ` (${formatCost(usage.costUSD)})`
    result += `\n` + `${shortName}:`.padStart(21) + usageString
  }
  return result
}

export function formatTotalCost(): string {
  const state = requireBootstrapState()
  const costDisplay =
    formatCost(state.getTotalCostUSD()) +
    (state.hasUnknownModelCost() ? ' (costs may be inaccurate due to usage of unknown models)' : '')

  const modelUsageDisplay = formatModelUsage()

  return chalk.dim(
    `Total cost:            ${costDisplay}\n` +
      `Total duration (API):  ${formatDuration(state.getTotalAPIDuration())}
Total duration (wall): ${formatDuration(state.getTotalDuration())}
Total code changes:    ${state.getTotalLinesAdded()} ${state.getTotalLinesAdded() === 1 ? 'line' : 'lines'} added, ${state.getTotalLinesRemoved()} ${state.getTotalLinesRemoved() === 1 ? 'line' : 'lines'} removed
${modelUsageDisplay}`,
  )
}

function round(number: number, precision: number): number {
  return Math.round(number * precision) / precision
}

function addToTotalModelUsage(cost: number, usage: Usage, model: string): ModelUsage {
  const state = requireBootstrapState()
  const getModelMaxOutputTokens = requireModelMaxOutputTokens()
  const modelUsage = state.getUsageForModel(model) ?? {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    webSearchRequests: 0,
    costUSD: 0,
    contextWindow: 0,
    maxOutputTokens: 0,
  }

  modelUsage.inputTokens += usage.input_tokens
  modelUsage.outputTokens += usage.output_tokens
  modelUsage.cacheReadInputTokens += usage.cache_read_input_tokens ?? 0
  modelUsage.cacheCreationInputTokens += usage.cache_creation_input_tokens ?? 0
  modelUsage.webSearchRequests += usage.server_tool_use?.web_search_requests ?? 0
  modelUsage.costUSD += cost
  modelUsage.contextWindow = getContextWindowForModel(model, state.getSdkBetas())
  modelUsage.maxOutputTokens = getModelMaxOutputTokens(model).default
  return modelUsage
}

export function addToTotalSessionCost(cost: number, usage: Usage, model: string): number {
  const state = requireBootstrapState()
  const modelUsage = addToTotalModelUsage(cost, usage, model)
  state.addToTotalCostState(cost, modelUsage, model)

  const attrs =
    isFastModeEnabled() && (usage as Usage & { speed?: string }).speed === 'fast'
      ? { model, speed: 'fast' }
      : { model }

  state.getCostCounter()?.add(cost, attrs)
  state.getTokenCounter()?.add(usage.input_tokens, { ...attrs, type: 'input' })
  state.getTokenCounter()?.add(usage.output_tokens, { ...attrs, type: 'output' })
  state.getTokenCounter()?.add(usage.cache_read_input_tokens ?? 0, { ...attrs, type: 'cacheRead' })
  state.getTokenCounter()?.add(usage.cache_creation_input_tokens ?? 0, { ...attrs, type: 'cacheCreation' })

  let totalCost = cost
  const { calculateUSDCost } = requireModelCost()
  for (const advisorUsage of getAdvisorUsage(usage as Usage & { iterations?: unknown })) {
    const advisorCost = calculateUSDCost(advisorUsage.model, advisorUsage)
    totalCost += addToTotalSessionCost(advisorCost, advisorUsage, advisorUsage.model)
  }
  return totalCost
}
