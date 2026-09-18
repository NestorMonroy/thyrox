import * as React from 'react'
import { RemoteEnvironmentDialog } from '@claude-code-how-works/repl/components/RemoteEnvironmentDialog.js'
import type { LocalJSXCommandOnDone } from '@claude-code-how-works/agent/command.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
): Promise<React.ReactNode> {
  return <RemoteEnvironmentDialog onDone={onDone} />
}
