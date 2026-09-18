import * as React from 'react'
import { useTerminalSize } from '@thyrox/ink'
import { useTheme } from '@thyrox/ink'
import {
  filterToolProgressMessages,
  type Tool,
  type Tools,
} from '@thyrox/tool-registry/Tool.js'
import type { ProgressMessage } from '@thyrox/agent/messageShapes'
import type { buildMessageLookups } from '@thyrox/agent/messages.js'
import { FallbackToolUseRejectedMessage } from '../../FallbackToolUseRejectedMessage.js'

type Props = {
  input: { [key: string]: unknown }
  progressMessagesForMessage: ProgressMessage[]
  style?: 'condensed'
  tool?: Tool
  tools: Tools
  lookups: ReturnType<typeof buildMessageLookups>
  verbose: boolean
  isTranscriptMode?: boolean
}

export function UserToolRejectMessage({
  input,
  progressMessagesForMessage,
  style,
  tool,
  tools,
  verbose,
  isTranscriptMode,
}: Props): React.ReactNode {
  const { columns } = useTerminalSize()
  const [theme] = useTheme()

  if (!tool || !tool.renderToolUseRejectedMessage) {
    return <FallbackToolUseRejectedMessage />
  }

  const parsedInput = tool.inputSchema.safeParse(input)
  if (!parsedInput.success) {
    return <FallbackToolUseRejectedMessage />
  }

  return (
    tool.renderToolUseRejectedMessage(parsedInput.data, {
      columns,
      messages: [],
      tools,
      verbose,
      progressMessagesForMessage: filterToolProgressMessages(
        progressMessagesForMessage,
      ),
      style,
      theme,
      isTranscriptMode,
    }) ?? <FallbackToolUseRejectedMessage />
  )
}
