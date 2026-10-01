import * as React from 'react'
import { Box, Text } from '@anthropic/ink'
import { PromptInputHelpMenu } from '../PromptInput/PromptInputHelpMenu.js'
import { PRODUCT_NAME } from '@thyrox/config/product'

export function General(): React.ReactNode {
  return (
    <Box flexDirection="column" paddingY={1} gap={1}>
      <Box>
        <Text>
          {PRODUCT_NAME} understands your codebase, makes edits with your permission,
          and executes commands — right from your terminal.
        </Text>
      </Box>
      <Box flexDirection="column">
        <Box>
          <Text bold>Shortcuts</Text>
        </Box>
        <PromptInputHelpMenu gap={2} fixedWidth={true} />
      </Box>
    </Box>
  )
}
