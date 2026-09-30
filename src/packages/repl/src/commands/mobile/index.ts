import type { Command } from '@thyrox/command-runtime/runtime'
import { PRODUCT_NAME } from '@thyrox/config/product'

const mobile = {
  type: 'local-jsx',
  name: 'mobile',
  aliases: ['ios', 'android'],
  description: `Show QR code to download the ${PRODUCT_NAME} mobile app`,
  load: () => import('./mobile.js'),
} satisfies Command

export default mobile
