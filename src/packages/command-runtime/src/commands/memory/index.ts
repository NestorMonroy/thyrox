import type { Command } from '../../runtime.js'
import { PRODUCT_NAME } from '@thyrox/config/product'

const memory: Command = {
  type: 'local-jsx',
  name: 'memory',
  description: `Edit ${PRODUCT_NAME} memory files`,
  load: () => import('./memory.js'),
}

export default memory
