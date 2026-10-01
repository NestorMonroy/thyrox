import { getIsNonInteractiveSession } from '@thyrox/app-host/bootstrap/state.js'
import type { Command } from '../../runtime.js'
import { PRODUCT_NAME } from '@thyrox/config/product'

const command: Command = {
  name: 'chrome',
  description: `${PRODUCT_NAME} in Chrome (Beta) settings`,
  availability: [],
  isEnabled: () => !getIsNonInteractiveSession(),
  type: 'local-jsx',
  load: () => import('./chrome.js'),
}

export default command
