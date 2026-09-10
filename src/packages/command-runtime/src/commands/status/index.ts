/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/status/index.ts`.
 * Porte COMPLETO — sólo cita `../../runtime.js` (hermano ya portado).
 * `status.tsx` (la implementación Ink) no se porta en este pase — queda
 * como referencia diferida por `load()`, mismo patrón que `commandRegistryRuntime.js`
 * en `@thyrox/app-host`.
 */
import type { Command } from '../../runtime.js'

const status = {
  type: 'local-jsx',
  name: 'status',
  description:
    'Show Claude Code status including version, model, account, API connectivity, and tool statuses',
  immediate: true,
  load: () => import('./status.js'),
} satisfies Command

export default status
