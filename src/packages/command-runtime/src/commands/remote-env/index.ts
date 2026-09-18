import type { Command } from '../../runtime.js'
import { isPolicyAllowed } from '@thyrox/provider/policyLimits/index.js'
import { isClaudeAISubscriber } from '@thyrox/provider/authAlias.js'

export default {
  type: 'local-jsx',
  name: 'remote-env',
  description: 'Configure the default remote environment for teleport sessions',
  isEnabled: () =>
    isClaudeAISubscriber() && isPolicyAllowed('allow_remote_sessions'),
  get isHidden() {
    return !isClaudeAISubscriber() || !isPolicyAllowed('allow_remote_sessions')
  },
  load: () => import('./remote-env.js'),
} satisfies Command
