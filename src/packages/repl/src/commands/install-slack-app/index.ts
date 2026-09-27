import type { Command } from '@thyrox/command-runtime/runtime'
import { PRODUCT_NAME } from '@thyrox/config/product'

const installSlackApp = {
  type: 'local',
  name: 'install-slack-app',
  description: `Install the ${PRODUCT_NAME} Slack app`,
  availability: ['claude-ai'],
  supportsNonInteractive: false,
  load: () => import('./install-slack-app.js'),
} satisfies Command

export default installSlackApp
