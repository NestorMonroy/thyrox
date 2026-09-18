import * as React from 'react'
import type { LocalJSXCommandContext } from '../../runtime.js'
import { SkillsMenu } from '@thyrox/repl/components/skills/SkillsMenu.js'
import type { LocalJSXCommandOnDone } from '@thyrox/agent/command.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
): Promise<React.ReactNode> {
  return <SkillsMenu onExit={onDone} commands={context.options.commands} />
}
