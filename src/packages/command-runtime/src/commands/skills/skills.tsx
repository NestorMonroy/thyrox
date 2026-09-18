import * as React from 'react'
import type { LocalJSXCommandContext } from '../../runtime.js'
import { SkillsMenu } from '@claude-code-how-works/repl/components/skills/SkillsMenu.js'
import type { LocalJSXCommandOnDone } from '@claude-code-how-works/agent/command.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
): Promise<React.ReactNode> {
  return <SkillsMenu onExit={onDone} commands={context.options.commands} />
}
