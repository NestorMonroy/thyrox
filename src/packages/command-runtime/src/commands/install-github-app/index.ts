import type { Command } from '../../runtime.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { readEnv } from '@thyrox/config/env/utils'

const installGitHubApp = {
  type: 'local-jsx',
  name: 'install-github-app',
  description: 'Set up Claude GitHub Actions for a repository',
  availability: ['claude-ai', 'console'],
  isEnabled: () => !isEnvTruthy(readEnv('DISABLE_INSTALL_GITHUB_APP_COMMAND')),
  load: () => import('./install-github-app.js'),
} satisfies Command

export default installGitHubApp
