/**
 * Porte de `ccnmt: packages/agent/internal/messageFactories.ts`.
 *
 * Cada tipo de mensaje que el runtime persiste al transcript JSONL pasa
 * por una de estas factories. `NO_CONTENT_MESSAGE` reemplaza contenido de
 * longitud cero (inc-4586: cadenas vacías rompen la deduplicación de
 * `recordTranscript` al reanudar y disparan un bug de límite de turno en
 * algunos modelos).
 *
 * DIVERGENCIA DE ALCANCE, declarada. La fuente tipa el contenido de
 * `createUserMessage` con `ToolResultBlockParam` de
 * `@anthropic-ai/sdk/resources/index.mjs`, paquete que no es dependencia
 * de este workspace (mismo criterio que `messageShapes.ts`: no se importa
 * el SDK completo por un solo tipo estructural). Se declara aquí un tipo
 * local mínimo con la única clave que el test de origen ejercita
 * (`tool_use_id`), y el resto de claves del bloque real quedan bajo
 * `[key: string]: unknown`.
 */

import { randomUUID } from 'crypto'
import { NO_CONTENT_MESSAGE } from '../constants/messages.js'
import { logForDebugging } from './logging.js'

/** Porte MÍNIMO de `ToolResultBlockParam` — ver divergencia arriba. */
export type ToolResultBlockParam = {
  type: 'tool_result'
  tool_use_id: string
  [key: string]: unknown
}

const INTERRUPT_MESSAGE = '[Request interrupted by user]'
const INTERRUPT_MESSAGE_FOR_TOOL_USE =
  '[Request interrupted by user for tool use]'

export function createUserMessage({
  content,
  isMeta,
  toolUseResult,
  sourceToolAssistantUUID,
}: {
  content: string | ToolResultBlockParam[]
  isMeta?: true
  toolUseResult?: unknown
  sourceToolAssistantUUID?: string
}): {
  type: 'user'
  message: {
    role: 'user'
    content: string | ToolResultBlockParam[]
  }
  isMeta?: true
  toolUseResult?: unknown
  sourceToolAssistantUUID?: string
  uuid: string
  timestamp: string
} {
  return {
    type: 'user',
    message: {
      role: 'user',
      content: content || NO_CONTENT_MESSAGE,
    },
    isMeta,
    toolUseResult,
    sourceToolAssistantUUID,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  }
}

export function createUserInterruptionMessage({
  toolUse = false,
}: {
  toolUse?: boolean
}) {
  return createUserMessage({
    content: [
      {
        type: 'text',
        text: toolUse ? INTERRUPT_MESSAGE_FOR_TOOL_USE : INTERRUPT_MESSAGE,
      } as unknown as ToolResultBlockParam,
    ],
  })
}

export function createSystemMessage(
  content: string,
  level: string,
  toolUseID?: string,
  preventContinuation?: boolean,
): {
  type: 'system'
  subtype: 'informational'
  content: string
  isMeta: false
  timestamp: string
  uuid: string
  level: string
  toolUseID?: string
  preventContinuation?: true
} {
  return {
    type: 'system',
    subtype: 'informational',
    content,
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    level,
    ...(toolUseID ? { toolUseID } : {}),
    ...(preventContinuation ? { preventContinuation: true as const } : {}),
  }
}

export function createAssistantAPIErrorMessage({
  content,
  apiError,
  error,
  errorDetails,
}: {
  content: string
  apiError?: unknown
  error?: unknown
  errorDetails?: string
}) {
  return {
    type: 'assistant' as const,
    message: {
      role: 'assistant',
      content: [
        {
          type: 'text' as const,
          text: content === '' ? NO_CONTENT_MESSAGE : content,
        },
      ],
      stop_reason: 'end_turn' as const,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
      },
    },
    isApiErrorMessage: true,
    apiError,
    error,
    errorDetails,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  }
}

export function createToolUseSummaryMessage(
  summary: string,
  precedingToolUseIds: string[],
) {
  return {
    type: 'tool_use_summary' as const,
    summary,
    precedingToolUseIds,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  }
}

export function createMicrocompactBoundaryMessage(
  trigger: 'auto',
  preTokens: number,
  tokensSaved: number,
  compactedToolIds: string[],
  clearedAttachmentUUIDs: string[],
) {
  logForDebugging(
    `[microcompact] saved ~${tokensSaved.toLocaleString()} tokens (cleared ${compactedToolIds.length} tool results)`,
  )
  return {
    type: 'system' as const,
    subtype: 'microcompact_boundary' as const,
    content: 'Context microcompacted',
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    level: 'info',
    microcompactMetadata: {
      trigger,
      preTokens,
      tokensSaved,
      compactedToolIds,
      clearedAttachmentUUIDs,
    },
  }
}
