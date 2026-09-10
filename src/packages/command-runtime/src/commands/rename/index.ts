/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/rename/index.ts`.
 * Porte COMPLETO — sólo cita `../../runtime.js` (hermano ya portado).
 */
import type { Command } from '../../runtime.js'

const rename = {
  type: 'local-jsx',
  name: 'rename',
  description: 'Rename the current conversation',
  immediate: true,
  argumentHint: '[name]',
  load: () => import('./rename.js'),
} satisfies Command

export default rename
