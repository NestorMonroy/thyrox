/**
 * Porte de `ccnmt: packages/agent/compaction/compactUtils.ts`.
 *
 * Las piezas de forma libre alrededor de una compactación con resumen:
 * los tipos del resultado, las constantes de presupuesto post-compact, los
 * mensajes de error fijos, y cinco funciones -- desde despojar imágenes
 * antes de mandar a resumir, hasta recortar la cabeza cuando la API
 * rechaza el prompt por demasiado largo (`truncateHeadForPTLRetry`).
 */

export type CompactableMessage = {
  type: string
  isMeta?: boolean
  isCompactSummary?: boolean
  isApiErrorMessage?: boolean
  uuid?: string
  message?: {
    content?: unknown
    usage?: unknown
    id?: string
    [key: string]: unknown
  }
  attachment?: {
    type: string
    [key: string]: unknown
  }
  compactMetadata?: {
    preCompactDiscoveredTools?: string[]
    preservedSegment?: {
      headUuid: string
      anchorUuid: string
      tailUuid: string
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type CompactBoundaryMessage = CompactableMessage & {
  type: 'system'
  subtype?: string
  compactMetadata?: {
    trigger: string
    preTokens: number
    preCompactDiscoveredTools?: string[]
    preservedSegment?: {
      headUuid: string
      anchorUuid: string
      tailUuid: string
    }
    [key: string]: unknown
  }
}

export type CompactionResult = {
  boundaryMarker: CompactBoundaryMessage
  summaryMessages: CompactableMessage[]
  attachments: CompactableMessage[]
  hookResults: CompactableMessage[]
  messagesToKeep?: CompactableMessage[]
  userDisplayMessage?: string
  preCompactTokenCount?: number
  postCompactTokenCount?: number
  truePostCompactTokenCount?: number
  compactionUsage?: unknown
}

export type RecompactionInfo = {
  isRecompactionInChain: boolean
  turnsSincePreviousCompact: number
  previousCompactTurnId?: string
  autoCompactThreshold: number
  querySource?: string
}

export const POST_COMPACT_MAX_FILES_TO_RESTORE = 5
export const POST_COMPACT_TOKEN_BUDGET = 50_000
export const POST_COMPACT_MAX_TOKENS_PER_FILE = 5_000
export const POST_COMPACT_MAX_TOKENS_PER_SKILL = 5_000
export const POST_COMPACT_SKILLS_TOKEN_BUDGET = 25_000
export const MAX_COMPACT_STREAMING_RETRIES = 2

export const ERROR_MESSAGE_NOT_ENOUGH_MESSAGES = 'Not enough messages to compact.'
export const ERROR_MESSAGE_PROMPT_TOO_LONG =
  'Conversation too long. Press esc twice to go up a few messages and try again.'
export const ERROR_MESSAGE_USER_ABORT = 'API Error: Request was aborted.'
export const ERROR_MESSAGE_INCOMPLETE_RESPONSE =
  'Compaction interrupted · This may be due to network issues — please try again.'

const PTL_RETRY_MARKER = '[earlier conversation truncated for compaction retry]'

/** Reemplaza bloques `image`/`document` (sueltos o dentro de un `tool_result`) por marcadores de texto, antes de mandar a resumir. */
export function stripImagesFromMessages(messages: CompactableMessage[]): CompactableMessage[] {
  return messages.map((message) => {
    if (message.type !== 'user') return message

    const content = message.message?.content
    if (!Array.isArray(content)) return message

    let hasMediaBlock = false
    const newContent = content.flatMap((block: Record<string, unknown>) => {
      if (block.type === 'image') {
        hasMediaBlock = true
        return [{ type: 'text' as const, text: '[image]' }]
      }
      if (block.type === 'document') {
        hasMediaBlock = true
        return [{ type: 'text' as const, text: '[document]' }]
      }
      if (block.type === 'tool_result' && Array.isArray(block.content)) {
        let toolHasMedia = false
        const newToolContent = (block.content as Record<string, unknown>[]).map((item) => {
          if (item.type === 'image') {
            toolHasMedia = true
            return { type: 'text' as const, text: '[image]' }
          }
          if (item.type === 'document') {
            toolHasMedia = true
            return { type: 'text' as const, text: '[document]' }
          }
          return item
        })
        if (toolHasMedia) {
          hasMediaBlock = true
          return [{ ...block, content: newToolContent }]
        }
      }
      return [block]
    })

    if (!hasMediaBlock) return message

    return {
      ...message,
      message: { ...(message.message as Record<string, unknown>), content: newContent },
    }
  })
}

/** Orden fijo: frontera, resumen, mensajes conservados, adjuntos, resultados de hook. */
export function buildPostCompactMessages(result: CompactionResult): CompactableMessage[] {
  return [
    result.boundaryMarker,
    ...result.summaryMessages,
    ...(result.messagesToKeep ?? []),
    ...result.attachments,
    ...result.hookResults,
  ]
}

/**
 * Sin mensajes conservados, no hay segmento que enlazar -- la frontera se
 * devuelve sin tocar.
 *
 * DIVERGENCIA DE TIPO, sin cambio de comportamiento: bajo `strict`, esparcir
 * `boundary.compactMetadata` (campo OPCIONAL de `CompactBoundaryMessage`)
 * hace que TS infiera `trigger`/`preTokens` como opcionales en el resultado
 * -aunque su forma interna los declare obligatorios- porque el objeto
 * esparcido podría ser `undefined`. La fuente tiene el mismo defecto de tipo
 * y no lo declara; aquí se corrige con una aserción sobre el objeto ya
 * construido, sin relajar el tipo de la función.
 */
export function annotateBoundaryWithPreservedSegment(
  boundary: CompactBoundaryMessage,
  anchorUuid: string,
  messagesToKeep: readonly CompactableMessage[] | undefined,
): CompactBoundaryMessage {
  const keep = messagesToKeep ?? []
  if (keep.length === 0) return boundary
  const compactMetadata = {
    ...boundary.compactMetadata,
    preservedSegment: {
      headUuid: keep[0]!.uuid!,
      anchorUuid,
      tailUuid: keep.at(-1)!.uuid!,
    },
  } as CompactBoundaryMessage['compactMetadata']
  return { ...boundary, compactMetadata }
}

export function mergeHookInstructions(
  userInstructions: string | undefined,
  hookInstructions: string | undefined,
): string | undefined {
  if (!hookInstructions) return userInstructions || undefined
  if (!userInstructions) return hookInstructions
  return `${userInstructions}\n\n${hookInstructions}`
}

export function isCompactBoundaryMessage(message: CompactableMessage): boolean {
  return message.type === 'system' && (message as Record<string, unknown>).subtype === 'compact_boundary'
}

/**
 * Descarta rondas completas de la cabeza hasta cubrir `tokenGap` (o el 20%
 * de las rondas si el gap no se pudo parsear), y -si la primera ronda
 * conservada empieza con un `assistant` huérfano- antepone un mensaje de
 * usuario que documenta el recorte, para no romper la alternancia
 * user/assistant que la API exige.
 */
export function truncateHeadForPTLRetry(
  messages: CompactableMessage[],
  tokenGap: number | undefined,
  deps: {
    groupByRound: (msgs: CompactableMessage[]) => CompactableMessage[][]
    estimateTokens: (msgs: CompactableMessage[]) => number
    prependUserMessage: (content: string, isMeta: boolean) => CompactableMessage
  },
): CompactableMessage[] | null {
  const input =
    messages[0]?.type === 'user' &&
    messages[0].isMeta &&
    (messages[0].message?.content as string) === PTL_RETRY_MARKER
      ? messages.slice(1)
      : messages

  const groups = deps.groupByRound(input)
  if (groups.length < 2) return null

  let dropCount: number
  if (tokenGap !== undefined) {
    let acc = 0
    dropCount = 0
    for (const g of groups) {
      acc += deps.estimateTokens(g)
      dropCount++
      if (acc >= tokenGap) break
    }
  } else {
    dropCount = Math.max(1, Math.floor(groups.length * 0.2))
  }

  dropCount = Math.min(dropCount, groups.length - 1)
  if (dropCount < 1) return null

  const sliced = groups.slice(dropCount).flat()
  if (sliced[0]?.type === 'assistant') {
    return [deps.prependUserMessage(PTL_RETRY_MARKER, true), ...sliced]
  }
  return sliced
}
