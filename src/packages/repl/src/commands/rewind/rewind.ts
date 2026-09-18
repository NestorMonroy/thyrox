import type { LocalCommandResult } from '@thyrox/command-runtime/runtime'
import type { ToolUseContext } from '@thyrox/tool-registry/Tool.js'

export async function call(
  _args: string,
  context: ToolUseContext,
): Promise<LocalCommandResult> {
  if (context.openMessageSelector) {
    context.openMessageSelector()
  }
  // Return a skip message to not append any messages.
  return { type: 'skip' }
}
