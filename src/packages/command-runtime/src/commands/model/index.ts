import type { Command } from '../../runtime.js'
import { shouldInferenceConfigCommandBeImmediate } from '@claude-code-how-works/shell/immediateCommand.js'
import { getMainLoopModel, renderModelName } from '@claude-code-how-works/provider/model.js'

export default {
  type: 'local-jsx',
  name: 'model',
  get description() {
    return `Set the AI model for Claude Code (currently ${renderModelName(getMainLoopModel())})`
  },
  argumentHint: '[model] | save',
  get immediate() {
    return shouldInferenceConfigCommandBeImmediate()
  },
  load: () => import('./model.js'),
} satisfies Command
