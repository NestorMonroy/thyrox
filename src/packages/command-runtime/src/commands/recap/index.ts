/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/recap/index.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO; `getFeatureValue_CACHED_MAY_BE_STALE` pasa por
 * `internal/pendingCrossPackageDeps.ts` (`@thyrox/config/feature-flags.js`
 * ya tiene el símbolo portado).
 *
 * Comando `/recap` — genera bajo demanda el resumen de una línea "mientras
 * no estabas". Reusa el pipeline `generateAwaySummary` (`agent/awaySummary.ts`)
 * que también usa la UI de auto-idle, así que el comportamiento queda
 * consistente con esa tarjeta.
 *
 * Gateado igual que el path de idle: feature flag `tengu_sedge_lantern` con
 * su holdback (ver abajo).
 */
import type { Command } from '../../runtime.js'
import { requireConfigFeatureFlags } from '../../internal/pendingCrossPackageDeps.js'

const recap: Command = {
  type: 'local',
  name: 'recap',
  description: 'Generate a one-line session recap now',
  // El path de idle también revisa tengu_sedge_lantern_holdback; se
  // espeja acá para que /recap y la tarjeta de resumen se muevan juntos.
  isEnabled: () => {
    const { getFeatureValue_CACHED_MAY_BE_STALE } = requireConfigFeatureFlags()
    const enabled = getFeatureValue_CACHED_MAY_BE_STALE('tengu_sedge_lantern')
    const holdback = getFeatureValue_CACHED_MAY_BE_STALE(
      'tengu_sedge_lantern_holdback',
    )
    return enabled === true && holdback !== true
  },
  supportsNonInteractive: false,
  load: () => import('./recap.js'),
}

export default recap
