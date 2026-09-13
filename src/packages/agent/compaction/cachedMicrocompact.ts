/**
 * Porte de `ccnmt: packages/agent/compaction/cachedMicrocompact.ts`.
 *
 * Estado y transiciones del "cached microcompact": lleva la cuenta de qué
 * `tool_use_id` ya se le mandó a la API, en qué orden, y decide cuáles
 * borrar del historial (v ía `cache_edits`) cuando el conteo de activos
 * supera `triggerThreshold`, siempre dejando `keepRecent` intactos.
 */
import type { CachedMCConfig } from './types.ts'

export type PinnedCacheEdits = {
  userMessageIndex: number
  block: CacheEditsBlock
}

export type CachedMCState = {
  registeredTools: Set<string>
  toolOrder: string[]
  deletedRefs: Set<string>
  pinnedEdits: PinnedCacheEdits[]
  toolsSentToAPI: boolean
}

export type CacheEditsBlock = {
  type: 'cache_edits'
  edits: Array<{ type: string; tool_use_id: string }>
}

export function createCachedMCState(): CachedMCState {
  return {
    registeredTools: new Set(),
    toolOrder: [],
    deletedRefs: new Set(),
    pinnedEdits: [],
    toolsSentToAPI: false,
  }
}

/** No toca `pinnedEdits`: los edits ya fijados en un mensaje pasado no se deshacen. */
export function resetCachedMCState(state: CachedMCState): void {
  state.registeredTools.clear()
  state.toolOrder = []
  state.deletedRefs.clear()
  state.toolsSentToAPI = false
}

export function markToolsSentToAPI(state: CachedMCState): void {
  state.toolsSentToAPI = true
}

/** Ignora un id ya borrado o ya registrado -- el orden de llegada se conserva sólo una vez. */
export function registerToolResult(state: CachedMCState, toolId: string): void {
  if (state.deletedRefs.has(toolId)) return
  if (state.registeredTools.has(toolId)) return
  state.registeredTools.add(toolId)
  state.toolOrder.push(toolId)
}

export function registerToolMessage(state: CachedMCState, groupIds: string[]): void {
  for (const id of groupIds) {
    registerToolResult(state, id)
  }
}

/**
 * Candidatos a borrar: los activos (no borrados ya) menos los `keepRecent`
 * más nuevos, y sólo si hay al menos `triggerThreshold` activos. Marca los
 * elegidos como borrados en el mismo paso -- no hay una llamada "de sólo
 * lectura" separada.
 */
export function getToolResultsToDelete(state: CachedMCState, config: CachedMCConfig): string[] {
  if (!config.enabled) return []

  const activeTools = state.toolOrder.filter((id) => !state.deletedRefs.has(id))
  if (activeTools.length < config.triggerThreshold) return []

  const keepRecent = Math.max(1, config.keepRecent)
  if (activeTools.length <= keepRecent) return []

  const toDelete = activeTools.slice(0, activeTools.length - keepRecent)
  for (const id of toDelete) {
    state.deletedRefs.add(id)
  }
  return toDelete
}

/** `null` si no hay nada que borrar -- un bloque `cache_edits` vacío no tiene sentido. */
export function createCacheEditsBlock(state: CachedMCState, toolIds: string[]): CacheEditsBlock | null {
  if (toolIds.length === 0) return null

  for (const id of toolIds) {
    state.deletedRefs.add(id)
  }

  return {
    type: 'cache_edits',
    edits: toolIds.map((id) => ({ type: 'delete_tool_result', tool_use_id: id })),
  }
}

export function isCachedMicrocompactEnabled(config: CachedMCConfig): boolean {
  return config.enabled
}

/** Lista vacía de modelos soportados == soporta cualquiera (el filtro está apagado). */
export function isModelSupportedForCacheEditing(model: string, config: CachedMCConfig): boolean {
  if (config.supportedModels.length === 0) return true
  return config.supportedModels.some((prefix) => model === prefix || model.startsWith(prefix))
}

export function getCachedMCSimpleConfig(
  config: CachedMCConfig,
): { triggerThreshold: number; keepRecent: number } {
  return { triggerThreshold: config.triggerThreshold, keepRecent: config.keepRecent }
}
