import * as React from 'react'
import type { LocalJSXCommandContext } from '@claude-code-how-works/command-runtime/runtime'
import { BackgroundTasksDialog } from '@claude-code-how-works/repl/components/tasks/BackgroundTasksDialog.js'
import type { LocalJSXCommandOnDone } from '../../command.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
): Promise<React.ReactNode> {
  return <BackgroundTasksDialog toolUseContext={context} onDone={onDone} />
}
