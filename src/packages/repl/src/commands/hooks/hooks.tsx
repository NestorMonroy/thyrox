import { HooksConfigMenu } from '../../components/hooks/HooksConfigMenu.js'
import { logEvent } from '@thyrox/local-observability'
import { getTools } from '@thyrox/tool-registry/runtime'
import type { LocalJSXCommandCall } from '@thyrox/agent/command.js'

export const call: LocalJSXCommandCall = async (onDone, context) => {
  logEvent('tengu_hooks_command', {})
  const appState = context.getAppState()
  const permissionContext = appState.toolPermissionContext
  const toolNames = getTools(permissionContext).map(tool => tool.name)
  return <HooksConfigMenu toolNames={toolNames} onExit={onDone} />
}
