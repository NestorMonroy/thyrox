import * as React from 'react'
import type { LocalJSXCommandOnDone } from '@claude-code-how-works/agent/command.js'
import { PluginSettings } from './PluginSettings.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: unknown,
  args?: string,
): Promise<React.ReactNode> {
  return <PluginSettings onComplete={onDone} args={args} />
}
