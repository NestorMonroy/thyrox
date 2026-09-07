/**
 * Puerto de `ccnmt: packages/teleport/src/remote-setup/index.ts` (20
 * líneas fuente, 100% portado). Manifiesto del comando `/web-setup`:
 * declara disponibilidad, condicion de habilitado/oculto por policy, y
 * carga perezosa (dinámica, ya lo era en la fuente) del componente JSX.
 *
 * Divergencia de import: la fuente importa el tipo `Command` desde
 * `command-runtime/runtime`; en este árbol `Command` vive en
 * `command-runtime/src/types.ts` (verificado: `export type Command` en
 * `types.ts:158`), así que se cita `@thyrox/command-runtime/types.js`.
 */

import type { Command } from '@thyrox/command-runtime/types.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { isPolicyAllowed } from '@thyrox/provider/policyLimits/index.js'

const web = {
  type: 'local-jsx',
  name: 'web-setup',
  description:
    'Setup Claude Code on the web (requires connecting your GitHub account)',
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
