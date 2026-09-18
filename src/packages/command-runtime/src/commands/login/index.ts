import type { Command } from '../../runtime.js'
import { hasAnthropicApiKeyAuth } from '@claude-code-how-works/provider/authAlias.js'
import { isEnvTruthy } from '@claude-code-how-works/config/env/utils'
import { readEnv } from '@claude-code-how-works/config/env'

export default () =>
  ({
    type: 'local-jsx',
    name: 'login',
    description: hasAnthropicApiKeyAuth()
      ? 'Switch Anthropic accounts'
      : 'Sign in with your Anthropic account',
    isEnabled: () => !isEnvTruthy(readEnv('DISABLE_LOGIN_COMMAND')),
    load: () => import('./login.js'),
  }) satisfies Command
