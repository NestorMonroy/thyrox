/**
 * Porte fiel de `ccnmt: packages/provider/src/requestOptions.ts` (paquete
 * `provider`, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO — un único tipo (`ProviderRequestOptions`). Sin divergencias:
 * `./contracts.js` ya está portado en este mismo pase (hermano); los
 * demás imports son type-only de `@anthropic-ai/sdk` (se borran al
 * transpilar).
 */
import type { ClientOptions } from '@anthropic-ai/sdk'
import type {
  ProviderAgentDefinition,
  ProviderAgentId,
  ProviderEffortValue,
  ProviderNotification,
  ProviderQueryChainTracking,
  ProviderQuerySource,
  ProviderToolPermissionContext,
  ProviderTools,
} from './contracts.js'

export type ProviderRequestOptions = {
  getToolPermissionContext?: () => Promise<ProviderToolPermissionContext>
  model: string
  toolChoice?: import('@anthropic-ai/sdk/resources/beta/messages/messages.mjs').BetaToolChoiceTool | import('@anthropic-ai/sdk/resources/beta/messages/messages.mjs').BetaToolChoiceAuto | undefined
  isNonInteractiveSession: boolean
  extraToolSchemas?: import('@anthropic-ai/sdk/resources/beta/messages/messages.mjs').BetaToolUnion[]
  maxOutputTokensOverride?: number
  fallbackModel?: string
  onStreamingFallback?: () => void
  querySource: ProviderQuerySource
  /** Propagado desde el override de `runAgent` cuando lo dispara un skill. */
  spawnedBySkill?: string
  /** Lo fija el `SkillTool` o el path de submit del REPL. */
  activeSkill?: string
  agents?: readonly ProviderAgentDefinition[]
  allowedAgentTypes?: string[]
  hasAppendSystemPrompt: boolean
  fetchOverride?: ClientOptions['fetch']
  enablePromptCaching?: boolean
  skipCacheWrite?: boolean
  temperatureOverride?: number
  effortValue?: ProviderEffortValue
  mcpTools: ProviderTools
  hasPendingMcpServers?: boolean
  queryTracking?: ProviderQueryChainTracking
  agentId?: ProviderAgentId
  outputFormat?: import('@anthropic-ai/sdk/resources/beta/messages/messages.mjs').BetaJSONOutputFormat
  fastMode?: boolean
  advisorModel?: string
  addNotification?: (notif: ProviderNotification) => void
  taskBudget?: { total: number; remaining?: number }
}
