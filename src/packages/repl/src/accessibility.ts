import { isEnvTruthy } from '@thyrox/config/env/utils'

export function isScreenReaderMode(): boolean {
  return isEnvTruthy(process.env.CLAUDE_CODE_ACCESSIBILITY)
}
