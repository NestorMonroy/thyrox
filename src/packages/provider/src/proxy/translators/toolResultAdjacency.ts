/**
 * Porte literal de
 * `omniroute: open-sse/translator/request/openai-to-claude/toolResultAdjacency.ts`
 * (entero, 113 líneas).
 *
 * Anthropic exige que el turno `tool_result` de un usuario siga
 * INMEDIATAMENTE al turno del asistente que contiene el `tool_use` que
 * responde. Un cliente con forma OpenAI puede intercalar texto de usuario
 * antes de un `tool_result` tardío; esta función repara ese orden.
 */

type MessagesContentBlock = Record<string, unknown>
type MessagesApiMessage = {
  role: string
  content: MessagesContentBlock[]
}

export function enforceToolResultAdjacency(messages: MessagesApiMessage[]): MessagesApiMessage[] {
  const assistantByToolUseId = indexAssistantToolUses(messages)
  const resultsByAssistant = new Map<MessagesApiMessage, MessagesContentBlock[]>()
  const strippedMessages: MessagesApiMessage[] = []

  for (const msg of messages) {
    stripAndCollectToolResults(msg, assistantByToolUseId, resultsByAssistant, strippedMessages)
  }

  return insertAdjacentToolResults(strippedMessages, resultsByAssistant)
}

function indexAssistantToolUses(messages: MessagesApiMessage[]): Map<string, MessagesApiMessage> {
  const assistantByToolUseId = new Map<string, MessagesApiMessage>()
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) continue
    for (const block of msg.content) {
      if (block.type === 'tool_use' && block.id && !assistantByToolUseId.has(String(block.id))) {
        assistantByToolUseId.set(String(block.id), msg)
      }
    }
  }
  return assistantByToolUseId
}

function stripAndCollectToolResults(
  msg: MessagesApiMessage,
  assistantByToolUseId: Map<string, MessagesApiMessage>,
  resultsByAssistant: Map<MessagesApiMessage, MessagesContentBlock[]>,
  strippedMessages: MessagesApiMessage[]
): void {
  if (msg.role !== 'user' || !Array.isArray(msg.content)) {
    strippedMessages.push(msg)
    return
  }

  const remainingBlocks: MessagesContentBlock[] = []
  for (const block of msg.content) {
    if (block.type !== 'tool_result') {
      remainingBlocks.push(block)
      continue
    }

    if (!collectMatchedToolResult(block, assistantByToolUseId, resultsByAssistant)) {
      const toolUseId = typeof block.tool_use_id === 'string' ? block.tool_use_id : ''
      const serialized =
        typeof block.content === 'string'
          ? block.content
          : JSON.stringify(block.content ?? '') ?? ''
      remainingBlocks.push({
        type: 'text',
        text: `[Unpaired tool result ${toolUseId || 'unknown'}]\n${serialized}`,
      })
    }
  }

  if (remainingBlocks.length > 0) {
    strippedMessages.push({ ...msg, content: remainingBlocks })
  }
}

function collectMatchedToolResult(
  block: MessagesContentBlock,
  assistantByToolUseId: Map<string, MessagesApiMessage>,
  resultsByAssistant: Map<MessagesApiMessage, MessagesContentBlock[]>
): boolean {
  const toolUseId = typeof block.tool_use_id === 'string' ? block.tool_use_id : ''
  const assistant = toolUseId ? assistantByToolUseId.get(toolUseId) : undefined
  if (!assistant) return false

  const grouped = resultsByAssistant.get(assistant) ?? []
  if (grouped.some((toolResult) => toolResult.tool_use_id === toolUseId)) return false

  grouped.push(block)
  resultsByAssistant.set(assistant, grouped)
  return true
}

function insertAdjacentToolResults(
  messages: MessagesApiMessage[],
  resultsByAssistant: Map<MessagesApiMessage, MessagesContentBlock[]>
): MessagesApiMessage[] {
  const reordered: MessagesApiMessage[] = []
  for (const msg of messages) {
    reordered.push(msg)
    const adjacentResults = orderedResultsForAssistant(msg, resultsByAssistant)
    if (adjacentResults.length > 0) reordered.push({ role: 'user', content: adjacentResults })
  }
  return reordered
}

function orderedResultsForAssistant(
  msg: MessagesApiMessage,
  resultsByAssistant: Map<MessagesApiMessage, MessagesContentBlock[]>
): MessagesContentBlock[] {
  if (msg.role !== 'assistant' || !Array.isArray(msg.content)) return []

  const grouped = resultsByAssistant.get(msg) ?? []
  return msg.content.flatMap((block) => {
    if (block.type !== 'tool_use' || !block.id) return []
    return grouped.filter((toolResult) => toolResult.tool_use_id === String(block.id))
  })
}
