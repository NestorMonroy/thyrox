import * as React from 'react'
import { AgentsMenu } from '@claude-code-how-works/repl/components/agents/AgentsMenu.js'
import type { ToolUseContext } from '@claude-code-how-works/tool-registry/Tool.js'
import { getTools } from '@claude-code-how-works/tool-registry/runtime'
import type { LocalJSXCommandOnDone } from '@claude-code-how-works/agent/command.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: ToolUseContext,
): Promise<React.ReactNode> {
  const appState = context.getAppState()
  const permissionContext = appState.toolPermissionContext
  const tools = getTools(permissionContext)

  return <AgentsMenu tools={tools} onExit={onDone} />
}
