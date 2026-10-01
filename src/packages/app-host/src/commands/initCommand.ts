/**
 * `/init` (`cWo`, 2.1.283): prompt builtin. El texto y la descripción los
 * eligen los selectores de `initPrompts.ts`, generado desde el ejecutable.
 */
import type { Command } from '@thyrox/command-runtime/runtime'
import { initCommandDescription, initPrompt } from './initPrompts.js'

const command = {
  type: 'prompt',
  name: 'init',
  get description() {
    return initCommandDescription()
  },
  contentLength: 0,
  progressMessage: 'analyzing your codebase',
  source: 'builtin',
  async getPromptForCommand() {
    return [{ type: 'text', text: initPrompt() }]
  },
} satisfies Command

export default command
