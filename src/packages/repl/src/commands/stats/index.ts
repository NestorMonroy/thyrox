import type { Command } from '@thyrox/command-runtime/runtime'
import { PRODUCT_NAME } from '@thyrox/config/product'

const stats = {
  type: 'local-jsx',
  name: 'stats',
  description: `Show your ${PRODUCT_NAME} usage statistics and activity`,
  load: () => import('./stats.js'),
} satisfies Command

export default stats
