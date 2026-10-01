import type { Command } from '@thyrox/command-runtime/runtime'
import { PRODUCT_NAME } from '@thyrox/config/product'

const stickers = {
  type: 'local',
  name: 'stickers',
  description: `Order ${PRODUCT_NAME} stickers`,
  supportsNonInteractive: false,
  load: () => import('./stickers.js'),
} satisfies Command

export default stickers
