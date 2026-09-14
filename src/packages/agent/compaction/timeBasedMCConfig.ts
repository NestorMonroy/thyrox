/**
 * Porte de `ccnmt: packages/agent/compaction/timeBasedMCConfig.ts`.
 *
 * `TimeBasedMCConfig` vive en `./types.ts` (el porte de `ccnmt:
 * packages/agent/types/compaction.ts`) desde que ese archivo se agregó al
 * paquete -- la divergencia que este docstring declaraba (tipo local, sin
 * `types/` compartido) ya no aplica y se corrige aquí en vez de arrastrarla.
 */
import type { TimeBasedMCConfig } from './types.ts'

export type { TimeBasedMCConfig }

export interface TimeBasedMCConfigDeps {
  getFeatureValue<T>(key: string, defaultValue: T): T
}

export const TIME_BASED_MC_CONFIG_DEFAULTS: TimeBasedMCConfig = {
  enabled: false,
  gapThresholdMinutes: 60,
  keepRecent: 5,
}

/**
 * Lee la config de microcompact por tiempo desde GrowthBook. La lectura
 * se hace SIEMPRE, en cada llamada, para que la exposicion A/B dispare en
 * todo camino de codigo y no se memoiza — cachear es trabajo de GrowthBook.
 */
export function getTimeBasedMCConfig(deps: TimeBasedMCConfigDeps): TimeBasedMCConfig {
  return deps.getFeatureValue<TimeBasedMCConfig>(
    'tengu_slate_heron',
    TIME_BASED_MC_CONFIG_DEFAULTS,
  )
}
