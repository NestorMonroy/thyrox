/**
 * Pure predicate extracted from Messages.tsx to break the
 * MessageRow ↔ Messages cycle. MessageRow needs to know whether a
 * message should render statically (skip animation/streaming UI), but
 * Messages owned the function and also imported MessageRow — a 2-file
 * SCC. Hoist the predicate to a leaf module that neither side owns.
 */

import { every } from '@thyrox/output/setUtils.js'
import {
  buildMessageLookups,
  getToolUseID,
  hasUnresolvedHooksFromLookup,
} from '@thyrox/agent/messages.js'
import type { RenderableMessage } from '@thyrox/agent/messageShapes'
import type { Screen } from '../screens/REPL.js'

export function shouldRenderStatically(
  message: RenderableMessage,
  streamingToolUseIDs: Set<string>,
  inProgressToolUseIDs: Set<string>,
  siblingToolUseIDs: ReadonlySet<string>,
  screen: Screen,
  lookups: ReturnType<typeof buildMessageLookups>,
): boolean {
  if (screen === 'transcript') {
    return true
  }
  switch (message.type) {
    case 'attachment': {
      // Un `attachment` nunca resuelve toolUseID: getToolUseID cae a su
      // `default: return null`, y `!toolUseID` ya siempre daba `return true`.
      return true
    }
    case 'user':
    case 'assistant': {
      if (message.type === 'assistant') {
        const block = message.message.content[0]
        if (block?.type === 'server_tool_use') {
          return lookups.resolvedToolUseIDs.has(block.id)
        }
      }
      const toolUseID = getToolUseID(message)
      if (!toolUseID) {
        return true
      }
      if (streamingToolUseIDs.has(toolUseID)) {
        return false
      }
      if (inProgressToolUseIDs.has(toolUseID)) {
        return false
      }
      if (hasUnresolvedHooksFromLookup(toolUseID, 'PostToolUse', lookups)) {
        return false
      }
      return every(siblingToolUseIDs, lookups.resolvedToolUseIDs)
    }
    case 'system': {
      return message.subtype !== 'api_error'
    }
    case 'grouped_tool_use': {
      const allResolved = message.messages.every(msg => {
        const content = msg.message.content[0]
        return (
          content?.type === 'tool_use' &&
          lookups.resolvedToolUseIDs.has(content.id)
        )
      })
      return allResolved
    }
    case 'collapsed_read_search': {
      return false
    }
    case 'progress': {
      // `progress` se filtra antes de llegar aqui (Messages.tsx lo excluye
      // del listado renderizable); rama inalcanzable que sólo cierra la
      // exhaustividad del switch sobre `RenderableMessage`.
      return false
    }
  }
}
