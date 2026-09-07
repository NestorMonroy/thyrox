/**
 * Porte de `ccnmt: packages/provider/src/claudeLegacy.ts` — proxy delgado
 * hacia el "legacy runtime" instalado vía `getProviderHostBindings().legacy`
 * (`providerHostSetup.ts`, uno de los 18). Todas sus 21 exportaciones,
 * ninguna omitida.
 *
 * Los tipos `Provider*` (`ProviderAgentDefinition`, `ProviderMessage`, …)
 * viven en `ccnmt: packages/provider/src/contracts.ts`, NO asignado a este
 * pase. Se aproximan localmente como estructuras mínimas suficientes para
 * el contrato de este archivo — el comportamiento real (delegar en
 * `legacy`) no depende de su forma exacta.
 */

import type {
  BetaJSONOutputFormat,
  BetaMessageDeltaUsage,
  BetaMessageStreamParams,
  BetaRawMessageStreamEvent,
  BetaToolChoiceAuto,
  BetaToolChoiceTool,
  BetaToolUnion,
  BetaUsage,
  BetaMessageParam as MessageParam,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { Stream } from '@anthropic-ai/sdk/streaming.mjs'
import type { ClientOptions } from '@anthropic-ai/sdk'
import { getProviderHostBindings } from './providerHostSetup.ts'
import type { ProviderHostBindings } from './providerHostSetup.ts'
import type { ProviderRequestOptions } from './internal/providerTypes.ts'

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[]
type JsonObject = { [key: string]: JsonValue }

type OptionsTaskBudget = { total: number; remaining?: number }

export type Options = ProviderRequestOptions & {
  getToolPermissionContext: () => Promise<unknown>
  toolChoice?: BetaToolChoiceTool | BetaToolChoiceAuto | undefined
  extraToolSchemas?: BetaToolUnion[]
  querySource: string
  agents: unknown[]
  effortValue?: string
  mcpTools: unknown
  queryTracking?: unknown
  agentId?: string
  outputFormat?: BetaJSONOutputFormat
  addNotification?: (notif: unknown) => void
  fetchOverride?: ClientOptions['fetch']
  taskBudget?: OptionsTaskBudget
}

type ClaudeLegacyRuntime = {
  getExtraBodyParams: (betaHeaders?: string[]) => JsonObject
  getPromptCachingEnabled: (model: string) => boolean
  getCacheControl: (args?: { scope?: string; querySource?: string }) => {
    type: 'ephemeral'
    ttl?: '1h'
    scope?: string
  }
  configureTaskBudgetParams: (
    taskBudget: Options['taskBudget'],
    outputConfig: BetaMessageStreamParams['output'] & {
      task_budget?: { type: 'tokens'; total: number; remaining?: number }
    },
    betas: string[],
  ) => void
  getAPIMetadata: () => Record<string, unknown>
  verifyApiKey: (...args: unknown[]) => Promise<unknown>
  userMessageToMessageParam: (...args: unknown[]) => MessageParam
  assistantMessageToMessageParam: (...args: unknown[]) => MessageParam
  queryModelWithoutStreaming: (args: {
    messages: unknown[]
    systemPrompt: unknown
    thinkingConfig: unknown
    tools: unknown
    signal: AbortSignal
    options: Options
  }) => Promise<unknown>
  queryModelWithStreaming: (args: {
    messages: unknown[]
    systemPrompt: unknown
    thinkingConfig: unknown
    tools: unknown
    signal: AbortSignal
    options: Options
  }) => AsyncGenerator<unknown, void>
  executeNonStreamingRequest: (...args: unknown[]) => AsyncGenerator<unknown, unknown>
  stripExcessMediaItems: (...args: unknown[]) => unknown
  cleanupStream: (stream: Stream<BetaRawMessageStreamEvent>) => void
  updateUsage: (usage: BetaUsage, delta?: BetaMessageDeltaUsage) => BetaUsage
  accumulateUsage: (...args: unknown[]) => unknown
  addCacheBreakpoints: (...args: unknown[]) => unknown
  buildSystemPromptBlocks: (
    systemPrompt: unknown,
    enablePromptCaching: boolean,
    options?: { skipGlobalCacheForSystemPrompt?: boolean; querySource?: string },
  ) => TextBlockParam[]
  queryHaiku: (...args: unknown[]) => Promise<unknown>
  queryWithModel: (...args: unknown[]) => Promise<unknown>
  adjustParamsForNonStreaming: <
    T extends { max_tokens: number; thinking?: BetaMessageStreamParams['thinking'] },
  >(
    params: T,
    maxTokensCap: number,
  ) => T
  getMaxOutputTokensForModel: (model: string) => number
  MAX_NON_STREAMING_TOKENS?: number
}

class HostBindingsError extends Error {
  readonly code = 'PROVIDER_HOST_BINDINGS_NOT_INSTALLED'
}

function getLegacyRuntime(): ClaudeLegacyRuntime {
  const legacy = (getProviderHostBindings() as ProviderHostBindings).legacy
  if (!legacy) {
    throw new HostBindingsError('Provider claudeLegacy runtime bindings have not been installed.')
  }
  return legacy as ClaudeLegacyRuntime
}

export function getExtraBodyParams(betaHeaders?: string[]): JsonObject {
  return getLegacyRuntime().getExtraBodyParams(betaHeaders)
}

export function getPromptCachingEnabled(model: string): boolean {
  return getLegacyRuntime().getPromptCachingEnabled(model)
}

export function getCacheControl(args?: {
  scope?: string
  querySource?: string
}): { type: 'ephemeral'; ttl?: '1h'; scope?: string } {
  return getLegacyRuntime().getCacheControl(args)
}

export function configureTaskBudgetParams(
  taskBudget: Options['taskBudget'],
  outputConfig: BetaMessageStreamParams['output'] & {
    task_budget?: { type: 'tokens'; total: number; remaining?: number }
  },
  betas: string[],
): void {
  return getLegacyRuntime().configureTaskBudgetParams(taskBudget, outputConfig, betas)
}

export function getAPIMetadata(): Record<string, unknown> {
  return getLegacyRuntime().getAPIMetadata()
}

export async function verifyApiKey(...args: unknown[]): Promise<unknown> {
  return getLegacyRuntime().verifyApiKey(...args)
}

export function userMessageToMessageParam(...args: unknown[]): MessageParam {
  return getLegacyRuntime().userMessageToMessageParam(...args)
}

export function assistantMessageToMessageParam(...args: unknown[]): MessageParam {
  return getLegacyRuntime().assistantMessageToMessageParam(...args)
}

export async function queryModelWithoutStreaming(args: {
  messages: unknown[]
  systemPrompt: unknown
  thinkingConfig: unknown
  tools: unknown
  signal: AbortSignal
  options: Options
}): Promise<unknown> {
  return getLegacyRuntime().queryModelWithoutStreaming(args)
}

export async function* queryModelWithStreaming(args: {
  messages: unknown[]
  systemPrompt: unknown
  thinkingConfig: unknown
  tools: unknown
  signal: AbortSignal
  options: Options
}): AsyncGenerator<unknown, void> {
  yield* getLegacyRuntime().queryModelWithStreaming(args)
}

export async function* executeNonStreamingRequest(...args: unknown[]): AsyncGenerator<unknown, unknown> {
  yield* getLegacyRuntime().executeNonStreamingRequest(...args)
}

export function stripExcessMediaItems(...args: unknown[]): unknown {
  return getLegacyRuntime().stripExcessMediaItems(...args)
}

export function cleanupStream(stream: Stream<BetaRawMessageStreamEvent>): void {
  return getLegacyRuntime().cleanupStream(stream)
}

export function updateUsage(usage: BetaUsage, delta?: BetaMessageDeltaUsage): BetaUsage {
  return getLegacyRuntime().updateUsage(usage, delta)
}

export function accumulateUsage(...args: unknown[]): unknown {
  return getLegacyRuntime().accumulateUsage(...args)
}

export function addCacheBreakpoints(...args: unknown[]): unknown {
  return getLegacyRuntime().addCacheBreakpoints(...args)
}

export function buildSystemPromptBlocks(
  systemPrompt: unknown,
  enablePromptCaching: boolean,
  options?: { skipGlobalCacheForSystemPrompt?: boolean; querySource?: string },
): TextBlockParam[] {
  return getLegacyRuntime().buildSystemPromptBlocks(systemPrompt, enablePromptCaching, options)
}

export async function queryHaiku(...args: unknown[]): Promise<unknown> {
  return getLegacyRuntime().queryHaiku(...args)
}

export async function queryWithModel(...args: unknown[]): Promise<unknown> {
  return getLegacyRuntime().queryWithModel(...args)
}

export const MAX_NON_STREAMING_TOKENS = 64_000

export function adjustParamsForNonStreaming<
  T extends { max_tokens: number; thinking?: BetaMessageStreamParams['thinking'] },
>(params: T, maxTokensCap: number): T {
  return getLegacyRuntime().adjustParamsForNonStreaming(params, maxTokensCap)
}

export function getMaxOutputTokensForModel(model: string): number {
  return getLegacyRuntime().getMaxOutputTokensForModel(model)
}
