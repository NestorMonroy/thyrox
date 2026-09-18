import type { LocalCommandCall } from '@claude-code-how-works/agent/command.js'
import { clearConversation } from './conversation.js'

export const call: LocalCommandCall = async (_, context) => {
  await clearConversation(context)
  return { type: 'text', value: '' }
}
