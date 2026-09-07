/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/cost/index.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO de la metadata.
 *
 * El comando cost sólo trae metadata mínima aquí; la implementación se
 * carga en diferido desde `cost.ts` para reducir el tiempo de arranque.
 */
import type { Command } from '../../runtime.js'
import {
  requireConfigEnvUtils,
  requireProviderAuthAlias,
} from '../../internal/pendingCrossPackageDeps.js'

const cost = {
  type: 'local',
  name: 'cost',
  description: 'Show the total cost and duration of the current session',
  get isHidden() {
    // Sigue visible para Ants aunque sean subscribers (ven el desglose de costo)
    if (requireConfigEnvUtils().readEnv('USER_TYPE') === 'ant') {
      return false
    }
    return requireProviderAuthAlias().isClaudeAISubscriber()
  },
  supportsNonInteractive: true,
  load: () => import('./cost.js'),
} satisfies Command

export default cost
