import type { Command } from '../../runtime.js'
import { hasAnthropicApiKeyAuth } from '@thyrox/provider/authAlias.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { readEnv } from '@thyrox/config/env'

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
