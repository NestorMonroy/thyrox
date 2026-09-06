/**
 * Cinco puentes hacia bindings del host que rodean el flujo de
 * compactación, transcript y red — porte de
 * `ccnmt: packages/agent/internal/runtimeBridges.ts`.
 *
 * `createCompactBoundaryMessage` es el más elaborado: delega primero al
 * host, y si el host no dispara nada construye el mensaje de frontera en
 * proceso, con la MISMA forma exacta — para que el stream de compactación
 * siga siendo visible aun sin host instalado (el caso de tests). El
 * `logicalParentUuid` se añade por spread condicional, no por `?? undefined`,
 * porque las dos formas serializan distinto en JSON: la primera omite la
 * clave, la segunda la deja presente con valor `undefined`.
 *
 * DIVERGENCIA DE ALCANCE, declarada (ver también `../host.ts`):
 *  - La fuente tipa `CompactBoundaryMessage` como `AgentMessage & {...}`,
 *    importando `AgentMessage` de `../internalTypes.js` (147 líneas, sin
 *    portar). Aquí se usa `AgentMessageLike` — el tipo estructural abierto
 *    ya declarado en `../host.ts` para el mismo propósito.
 *  - `DumpPromptsFetch` en la fuente es
 *    `NonNullable<ClientOptions['fetch']>`, importado de `@anthropic-ai/sdk`
 *    (paquete ausente de las dependencias de este árbol). Aquí se usa el
 *    tipo `DumpPromptsFetch` ya declarado en `../host.ts`, con la misma
 *    firma exacta que `contracts.ts` fija para `createDumpPromptsFetch`.
 */
import { randomUUID } from 'crypto'
import {
  getAgentHostBindings,
  type AgentMessageLike,
  type DumpPromptsFetch,
} from '../host.ts'

type CompactBoundaryMessage = AgentMessageLike & {
  type: 'system'
  subtype: 'compact_boundary'
  content: string
  isMeta: false
  timestamp: string
  uuid: string
  level: 'info'
  compactMetadata: {
    trigger: 'manual' | 'auto'
    preTokens: number
    userContext?: string
    messagesSummarized?: number
  }
  logicalParentUuid?: string
}

export function createCompactBoundaryMessage(
  trigger: 'manual' | 'auto',
  preTokens: number,
  lastPreCompactMessageUuid?: string,
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
  messages: AgentMessageLike[],
  teamInfo?: unknown,
  startingParentUuidHint?: string,
  allMessages?: readonly AgentMessageLike[],
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
