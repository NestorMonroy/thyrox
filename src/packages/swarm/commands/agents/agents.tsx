import * as React from 'react'
import { AgentsMenu } from '@thyrox/repl/components/agents/AgentsMenu.js'
import type { ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import { getTools } from '@thyrox/tool-registry/runtime'
import type { LocalJSXCommandOnDone } from '@thyrox/agent/command.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: ToolUseContext,
): Promise<React.ReactNode> {
  const appState = context.getAppState()
  const permissionContext = appState.toolPermissionContext
  const tools = getTools(permissionContext)

  return <AgentsMenu tools={tools} onExit={onDone} />
}
