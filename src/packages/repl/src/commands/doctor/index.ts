import type { Command } from '@thyrox/command-runtime/runtime'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { PRODUCT_NAME } from '@thyrox/config/product'

const doctor: Command = {
  name: 'doctor',
  aliases: ['checkup'],
  description: `Diagnose and verify your ${PRODUCT_NAME} installation and settings`,
  isEnabled: () => !isEnvTruthy(process.env.DISABLE_DOCTOR_COMMAND),
  type: 'local-jsx',
  load: () => import('./doctor.js'),
}

export default doctor
