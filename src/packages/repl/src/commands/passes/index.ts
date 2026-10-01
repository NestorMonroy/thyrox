import type { Command } from '@thyrox/command-runtime/runtime'
import {
  checkCachedPassesEligibility,
  getCachedReferrerReward,
} from '@thyrox/provider/referral.js'
import { PRODUCT_NAME } from '@thyrox/config/product'

export default {
  type: 'local-jsx',
  name: 'passes',
  get description() {
    const reward = getCachedReferrerReward()
    if (reward) {
      return `Share a free week of ${PRODUCT_NAME} with friends and earn extra usage`
    }
    return `Share a free week of ${PRODUCT_NAME} with friends`
  },
  get isHidden() {
    const { eligible, hasCache } = checkCachedPassesEligibility()
    return !eligible || !hasCache
  },
  load: () => import('./passes.js'),
} satisfies Command
