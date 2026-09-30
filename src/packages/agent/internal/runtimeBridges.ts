import type { ClientOptions } from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import type { UUID } from 'crypto'
import type { AgentMessage } from '../internalTypes.js'
import type {
  CompactMetadata,
  SystemCompactBoundaryMessage,
} from '../messageShapes.js'
import { getAgentHostBindings } from '../host.js'

type DumpPromptsFetch = NonNullable<ClientOptions['fetch']>

/**
 * `messageShapes.SystemCompactBoundaryMessage` declara `compactMetadata`
 * con firma de índice abierta; lo que `messages.ts::createCompactBoundaryMessage`
 * escribe de verdad es `CompactMetadata` (trigger, preTokens, ...). Se
 * estrecha aquí, en el único punto que construye el mensaje, hasta que el
 * tipo se corrija en su origen. Local a propósito: fuera de este módulo se
 * lee por `ReturnType<typeof createCompactBoundaryMessage>`.
 */
type CompactBoundaryMessage = SystemCompactBoundaryMessage & {
  compactMetadata: CompactMetadata
}

export function createCompactBoundaryMessage(
  trigger: 'manual' | 'auto',
  preTokens: number,
  lastPreCompactMessageUuid?: UUID,
  userContext?: string,
  messagesSummarized?: number,
): CompactBoundaryMessage {
  const created = getAgentHostBindings().createCompactBoundaryMessage?.(
    trigger,
    preTokens,
    lastPreCompactMessageUuid,
    userContext,
    messagesSummarized,
  )
  if (created) {
    return created as CompactBoundaryMessage
  }

  return {
    type: 'system',
    subtype: 'compact_boundary',
    content: 'Conversation compacted',
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    level: 'info',
    compactMetadata: {
      trigger,
      preTokens,
      userContext,
      messagesSummarized,
    },
    ...(lastPreCompactMessageUuid
      ? { logicalParentUuid: lastPreCompactMessageUuid }
      : {}),
  }
}

export async function recordTranscript(
  messages: AgentMessage[],
  teamInfo?: unknown,
  startingParentUuidHint?: string,
  allMessages?: readonly AgentMessage[],
): Promise<string | null> {
  const record = getAgentHostBindings().recordTranscript
  if (!record) {
    return null
  }
  return record(messages, teamInfo, startingParentUuidHint, allMessages)
}

export async function flushSessionStorage(): Promise<void> {
  await getAgentHostBindings().flushSessionStorage?.()
}

export async function recordContentReplacement(
  replacements: unknown[],
  agentId?: string,
): Promise<void> {
  await getAgentHostBindings().recordContentReplacement?.(
    replacements,
    agentId,
  )
}

export function createDumpPromptsFetch(
  agentIdOrSessionId: string,
): DumpPromptsFetch {
  return (
    getAgentHostBindings().createDumpPromptsFetch?.(agentIdOrSessionId) ??
    ((input, init) => globalThis.fetch(input, init))
  )
}
