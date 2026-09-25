import { getAgentHostBindings } from '../host.js'
import type { AgentMessage } from '../internalTypes.js'
import type { Message } from '../messageShapes.js'
import type { SetAppState } from '../messageQueueManager.js'
import type { Tools } from '@thyrox/tool-registry/Tool.js'
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'

export function registerStructuredOutputEnforcement(
  setAppState: SetAppState,
  sessionId: string,
): void {
  getAgentHostBindings().registerStructuredOutputEnforcement?.(
    setAppState,
    sessionId,
  )
}

export function getMainLoopModel(): string {
  return getAgentHostBindings().getMainLoopModel?.() ?? ''
}

export function parseUserSpecifiedModel(model: string): string {
  return getAgentHostBindings().parseUserSpecifiedModel?.(model) ?? model
}

export async function loadAllPluginsCacheOnly(): Promise<{
  enabled: unknown[]
  [key: string]: unknown
}> {
  return (
    (await getAgentHostBindings().loadAllPluginsCacheOnly?.()) ?? {
      enabled: [],
    }
  )
}

export async function processUserInput(params: unknown): Promise<{
  messages: Message[]
  shouldQuery: boolean
  allowedTools?: string[]
  model?: string
  resultText?: string
  [key: string]: unknown
}> {
  const result = await getAgentHostBindings().processUserInput?.(params)
  return (
    result ?? {
      messages: [],
      shouldQuery: false,
      allowedTools: undefined,
    }
  )
}

export async function fetchSystemPromptParts(params: unknown): Promise<{
  defaultSystemPrompt: string[]
  userContext: Record<string, string>
  systemContext: Record<string, string>
}> {
  return (
    (await getAgentHostBindings().fetchSystemPromptParts?.(params)) ?? {
      defaultSystemPrompt: [],
      userContext: {},
      systemContext: {},
    }
  )
}

export function shouldEnableThinkingByDefault(): boolean | undefined {
  return getAgentHostBindings().shouldEnableThinkingByDefault?.()
}

export function buildSystemInitMessage(params: unknown): SDKMessage | undefined {
  return getAgentHostBindings().buildSystemInitMessage?.(params)
}

export function sdkCompatToolName(toolName: string): string {
  return getAgentHostBindings().sdkCompatToolName?.(toolName) ?? toolName
}

export async function* handleOrphanedPermission(
  orphanedPermission: unknown,
  tools: Tools,
  messages: AgentMessage[],
  context: unknown,
): AsyncGenerator<SDKMessage> {
  const handler = getAgentHostBindings().handleOrphanedPermission
  if (!handler) {
    return
  }
  yield* handler(orphanedPermission, tools, messages, context)
}

export function isResultSuccessful(
  result: AgentMessage | undefined,
  lastStopReason: string | null,
): boolean {
  return (
    getAgentHostBindings().isResultSuccessful?.(result, lastStopReason) ?? false
  )
}

export async function* normalizeMessage(
  message: AgentMessage,
): AsyncGenerator<SDKMessage> {
  const normalizer = getAgentHostBindings().normalizeMessage
  if (!normalizer) {
    return
  }
  yield* normalizer(message)
}

export function selectableUserMessagesFilter(message: AgentMessage): boolean {
  return getAgentHostBindings().selectableUserMessagesFilter?.(message) ?? true
}

export function getCoordinatorUserContext(
  mcpClients: ReadonlyArray<{ name: string }>,
  scratchpadDir?: string,
): Record<string, string> {
  return (
    getAgentHostBindings().getCoordinatorUserContext?.(
      mcpClients,
      scratchpadDir,
    ) ?? {}
  )
}

export function isSnipBoundaryMessage(message: AgentMessage): boolean {
  return getAgentHostBindings().isSnipBoundaryMessage?.(message) ?? false
}

export function snipCompactIfNeeded(
  messages: AgentMessage[],
  options?: { force?: boolean },
): { messages: Message[]; executed: boolean } | undefined {
  return getAgentHostBindings().snipCompactIfNeeded?.(messages, options)
}
