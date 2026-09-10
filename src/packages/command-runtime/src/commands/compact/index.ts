/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/compact/index.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO de la metadata; `isEnvTruthy`/`readEnv` pasan por
 * `internal/pendingCrossPackageDeps.ts` (paquete sin `node_modules/@thyrox/*`
 * — ver ese archivo). `@thyrox/config/env/utils.js` ya tiene ambos
 * símbolos portados, así que resuelve en cuanto se declare la dependencia.
 */
import type { Command } from '../../runtime.js'
import { requireConfigEnvUtils } from '../../internal/pendingCrossPackageDeps.js'

const compact = {
  type: 'local',
  name: 'compact',
  description:
    'Clear conversation history but keep a summary in context. Optional: /compact [instructions for summarization]',
  isEnabled: () => {
    const { isEnvTruthy, readEnv } = requireConfigEnvUtils()
    return !isEnvTruthy(readEnv('DISABLE_COMPACT'))
  },
  supportsNonInteractive: true,
  argumentHint: '<optional custom summarization instructions>',
  load: () => import('./compact.js'),
} satisfies Command

export default compact
