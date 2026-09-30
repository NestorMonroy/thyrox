import type { Command } from '../../runtime.js'
import { PRODUCT_NAME } from '@thyrox/config/product'

const plugin = {
  type: 'local-jsx',
  name: 'plugin',
  aliases: ['plugins', 'marketplace'],
  description: `Manage ${PRODUCT_NAME} plugins`,
  immediate: true,
  load: () => import('./plugin.js'),
} satisfies Command

export default plugin
