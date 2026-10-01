import { isEnvTruthy } from '@thyrox/config/env/utils'

export function isScreenReaderMode(): boolean {
  return isEnvTruthy(process.env.THYROX_CODE_ACCESSIBILITY)
}
