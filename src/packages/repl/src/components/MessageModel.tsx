import React from 'react'
import { Box, Text, stringWidth } from '@anthropic/ink'
import type { NormalizedMessage } from '@thyrox/agent/messageShapes'

type Props = {
  message: NormalizedMessage
  isTranscriptMode: boolean
}

export function MessageModel({
  message,
  isTranscriptMode,
}: Props): React.ReactNode {
  if (message.type !== 'assistant') {
    return null
  }

  const model = message.message.model
  const shouldShowModel =
    isTranscriptMode &&
    typeof model === 'string' &&
    message.message.content.some((c: { type: string }) => c.type === 'text')

  if (!shouldShowModel) {
    return null
  }

  return (
    <Box minWidth={stringWidth(model) + 8}>
      <Text dimColor>{model}</Text>
    </Box>
  )
}
