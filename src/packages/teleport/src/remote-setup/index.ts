import type { Command } from '@thyrox/command-runtime/runtime'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { isPolicyAllowed } from '@thyrox/provider/policyLimits/index.js'
import { PRODUCT_NAME } from '@thyrox/config/product'

const web = {
  type: 'local-jsx',
  name: 'web-setup',
  description:
    `Setup ${PRODUCT_NAME} on the web (requires connecting your GitHub account)`,
  availability: ['claude-ai'],
  isEnabled: () =>
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_cobalt_lantern', false) &&
    isPolicyAllowed('allow_remote_sessions'),
  get isHidden() {
    return !isPolicyAllowed('allow_remote_sessions')
  },
  load: () => import('./remote-setup.js'),
} satisfies Command

export default web
