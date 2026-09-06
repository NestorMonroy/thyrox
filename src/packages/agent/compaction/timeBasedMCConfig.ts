/**
 * Porte de `ccnmt: packages/agent/compaction/timeBasedMCConfig.ts`.
 *
 * La fuente importa `TimeBasedMCConfig` de un `../types/compaction.js`
 * compartido que este arbol no tiene todavia; se declara aqui mismo, con
 * los tres campos identicos, porque ningun otro modulo de este paquete lo
 * consume por ahora.
 */

export interface TimeBasedMCConfig {
  enabled: boolean
  gapThresholdMinutes: number
  keepRecent: number
}

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
