import * as React from 'react'
import { RemoteEnvironmentDialog } from '@thyrox/repl/components/RemoteEnvironmentDialog.js'
import type { LocalJSXCommandOnDone } from '@thyrox/agent/command.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
): Promise<React.ReactNode> {
  return <RemoteEnvironmentDialog onDone={onDone} />
}
