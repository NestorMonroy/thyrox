/**
 * Porte de `ccnmt: packages/agent/compaction/snipCompactCore.ts`.
 *
 * El "snip": a diferencia de una compactación con resumen, corta rondas
 * completas de la mitad de la conversación (deja la primera y las dos
 * últimas) sin pedirle nada al modelo -- es el recorte barato antes de que
 * haga falta gastar un turno en resumir. `snipCompact.ts` (ya presente en
 * este árbol) es su punto de entrada stub; éste es el núcleo con lógica
 * real, hermano de `snipProjection.ts`.
 */

export type SnipMessage = {
  type: string
  subtype?: string
  isMeta?: boolean
  uuid?: string
  content?: string
  level?: string
  timestamp?: string
  message?: {
    id?: string
    content?: unknown
    [key: string]: unknown
  }
  compactMetadata?: {
    trigger?: string
    preTokens?: number
    snipGroupsRemoved?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

export const SNIP_MARKER_SUBTYPE = 'snip_marker'
export const SNIP_BOUNDARY_SUBTYPE = 'snip_boundary'

export const SNIP_NUDGE_TEXT =
  'Your conversation is getting long. Consider using /compact to summarize earlier context.'

export const MIN_KEEP_GROUPS = 2

export interface SnipCompactDeps {
  groupMessagesByApiRound: (messages: SnipMessage[]) => SnipMessage[][]
  tokenCountWithEstimation: (messages: SnipMessage[]) => number
  getAutoCompactThreshold: (model: string) => number
  randomUUID: () => string
  getEnv: (key: string) => string | undefined
}

export type SnipCompactResult = {
  messages: SnipMessage[]
  executed: boolean
  tokensFreed: number
  boundaryMessage?: SnipMessage
}

export function isSnipMarkerMessage(message: SnipMessage): boolean {
  return message.type === 'system' && message.subtype === SNIP_MARKER_SUBTYPE
}

export function createSnipBoundaryMessage(
  tokensFreed: number,
  groupsRemoved: number,
  randomUUID: () => string,
): SnipMessage {
  return {
    type: 'system',
    subtype: SNIP_BOUNDARY_SUBTYPE,
    content: `History snipped: ${groupsRemoved} round(s) removed (~${tokensFreed} tokens freed)`,
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    level: 'info',
    compactMetadata: {
      trigger: 'auto',
      preTokens: tokensFreed,
      snipGroupsRemoved: groupsRemoved,
    },
  }
}

/**
 * Quita marcadores de snip previos, agrupa por ronda de API, y --si no hay
 * suficientes rondas para dejar cabeza + `MIN_KEEP_GROUPS` de cola, o si el
 * uso está por debajo del 90% del umbral de auto-compact (salvo `force`)--
 * no ejecuta nada. Cuando sí ejecuta, conserva la primera ronda y las
 * últimas `MIN_KEEP_GROUPS`, y reemplaza lo de en medio por una frontera.
 */
export function snipCompactCore(
  messages: SnipMessage[],
  options: { force?: boolean } | undefined,
  deps: SnipCompactDeps,
): SnipCompactResult {
  const cleaned = messages.filter((m) => !isSnipMarkerMessage(m))
  const groups = deps.groupMessagesByApiRound(cleaned)

  if (groups.length < MIN_KEEP_GROUPS + 1) {
    return { messages: cleaned, executed: false, tokensFreed: 0 }
  }

  if (!options?.force) {
    const tokenCount = deps.tokenCountWithEstimation(cleaned)
    const threshold = deps.getAutoCompactThreshold(deps.getEnv('CLAUDE_CODE_MODEL') ?? 'claude-sonnet-4-6')
    if (tokenCount < threshold * 0.9) {
      return { messages: cleaned, executed: false, tokensFreed: 0 }
    }
  }

  const keepHeadGroups = 1
  const keepTailGroups = MIN_KEEP_GROUPS
  const removableGroups = groups.slice(keepHeadGroups, -keepTailGroups)

  if (removableGroups.length === 0) {
    return { messages: cleaned, executed: false, tokensFreed: 0 }
  }

  const removedMessages = removableGroups.flat()
  const tokensFreed = deps.tokenCountWithEstimation(removedMessages)

  const headGroups = groups.slice(0, keepHeadGroups)
  const tailGroups = groups.slice(-keepTailGroups)

  const boundaryMessage = createSnipBoundaryMessage(tokensFreed, removableGroups.length, deps.randomUUID)

  return {
    messages: [...headGroups.flat(), boundaryMessage, ...tailGroups.flat()],
    executed: true,
    tokensFreed,
    boundaryMessage,
  }
}

/** El "nudge" en el UI aparece antes que el snip mismo: 80% del umbral, contra el 90% que dispara `snipCompactCore`. */
export function shouldNudgeForSnips(
  messages: SnipMessage[],
  deps: Pick<SnipCompactDeps, 'tokenCountWithEstimation' | 'getAutoCompactThreshold' | 'getEnv'>,
): boolean {
  const tokenCount = deps.tokenCountWithEstimation(messages)
  const threshold = deps.getAutoCompactThreshold(deps.getEnv('CLAUDE_CODE_MODEL') ?? 'claude-sonnet-4-6')
  return tokenCount >= threshold * 0.8
}
