import { relative } from 'path'
import type { ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import type { LocalCommandResult } from '@thyrox/agent/command.js'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { cacheKeys } from '@thyrox/tool-registry/fileStateCache'

export async function call(
  _args: string,
  context: ToolUseContext,
): Promise<LocalCommandResult> {
  const files = context.readFileState ? cacheKeys(context.readFileState) : []

  if (files.length === 0) {
    return { type: 'text' as const, value: 'No files in context' }
  }

  const fileList = files.map(file => relative(getCwd(), file)).join('\n')
  return { type: 'text' as const, value: `Files in context:\n${fileList}` }
}
