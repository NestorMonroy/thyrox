/**
 * Porte de `ccnmt: packages/agent/compaction/cachedMCConfig.ts`.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `CachedMCConfig`
 * desde `types/compaction.ts`, un archivo de tipos compartido que no
 * existe en este paquete (aqui `src/packages/agent/` es plano — no hay
 * `types/`). El tipo se declara localmente; si en el futuro otro modulo
 * de `compaction/` lo necesita, se extrae entonces a un archivo comun.
 */

export interface CachedMCConfig {
  enabled: boolean
  triggerThreshold: number
  keepRecent: number
  supportedModels: string[]
  systemPromptSuggestSummaries: boolean
}

export interface CachedMCConfigDeps {
  getFeatureValue<T>(key: string, defaultValue: T): T
  getEnv(key: string): string | undefined
}

export const DEFAULT_CACHED_MC_CONFIG: CachedMCConfig = {
  enabled: true,
  triggerThreshold: 20,
  keepRecent: 5,
  supportedModels: [
    'claude-sonnet-4',
    'claude-opus-4',
    'claude-3-5-sonnet',
    'claude-3-7-sonnet',
  ],
  systemPromptSuggestSummaries: false,
}

/**
 * Resuelve la config de cached microcompact. La variable de entorno
 * `CLAUDE_CACHED_MC_ENABLED`, cuando esta definida, gana sobre GrowthBook
 * por completo (permite a ops apagar la feature en un incidente sin
 * rollback de flag remoto). Sin ella, se consulta el flag remoto
 * `tengu_cached_microcompact` con `DEFAULT_CACHED_MC_CONFIG` como
 * fallback.
 */
export function getCachedMCConfig(deps: CachedMCConfigDeps): CachedMCConfig {
  const envEnabled = deps.getEnv('CLAUDE_CACHED_MC_ENABLED')
  if (envEnabled !== undefined) {
    return {
      enabled: envEnabled === '1',
      triggerThreshold:
        parseInt(deps.getEnv('CLAUDE_CACHED_MC_TRIGGER') ?? '', 10) ||
        DEFAULT_CACHED_MC_CONFIG.triggerThreshold,
      keepRecent:
        parseInt(deps.getEnv('CLAUDE_CACHED_MC_KEEP_RECENT') ?? '', 10) ||
        DEFAULT_CACHED_MC_CONFIG.keepRecent,
      supportedModels: DEFAULT_CACHED_MC_CONFIG.supportedModels,
      systemPromptSuggestSummaries:
        deps.getEnv('CLAUDE_CACHED_MC_SUGGEST_SUMMARIES') === '1',
    }
  }

  const remoteConfig = deps.getFeatureValue<CachedMCConfig>(
    'tengu_cached_microcompact',
    DEFAULT_CACHED_MC_CONFIG,
  )
  return remoteConfig ?? DEFAULT_CACHED_MC_CONFIG
}
