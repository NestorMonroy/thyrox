/**
 * La configuración ajustable del AgentBridge como un JSON versionado, para
 * repetir un montaje en otra máquina: patrones de exclusión del usuario,
 * hosts propios y asignaciones de modelo por agente. Los patrones por defecto
 * viven en el código y no se exportan, así que importar nunca los duplica.
 *
 * Porte de `omniroute: src/lib/inspector/configPortability.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'
import { z } from 'zod'

import { getUserBypassPatterns, replaceUserBypassPatterns } from '../state/agentBridgeBypass.ts'
import { getMappingsForAgent, setMappings } from '../state/agentBridgeMappings.ts'
import { addCustomHost, listCustomHosts } from '../state/inspectorCustomHosts.ts'
import type { CustomHostKind } from '../state/rows.ts'
import { ALL_TARGETS } from '../targets/index.ts'

export const AgentBridgeConfigSchema = z.object({
  version: z.literal(1),
  bypassPatterns: z.array(z.string()),
  customHosts: z.array(
    z.object({
      host: z.string().min(1),
      kind: z.enum(['llm', 'app', 'custom']).default('custom'),
      label: z.string().nullable().optional(),
    }),
  ),
  agentMappings: z.record(z.string(), z.array(z.object({ source: z.string(), target: z.string() }))),
})

export type AgentBridgeConfig = z.infer<typeof AgentBridgeConfigSchema>

export interface ImportResult {
  bypassPatterns: number
  customHosts: number
  agents: number
}

/** Lee el estado ajustable a un JSON portable; sólo los agentes con asignaciones. */
export function exportConfig(db: Database): AgentBridgeConfig {
  const customHosts = listCustomHosts(db).map(h => ({
    host: h.host,
    kind: h.kind ?? 'custom',
    label: h.label ?? null,
  }))
  const agentMappings: AgentBridgeConfig['agentMappings'] = {}
  for (const target of ALL_TARGETS) {
    const rows = getMappingsForAgent(db, target.id)
    if (rows.length > 0) agentMappings[target.id] = rows.map(r => ({ source: r.source_model, target: r.target_model }))
  }
  return { version: 1, bypassPatterns: getUserBypassPatterns(db), customHosts, agentMappings }
}

/**
 * Aplica una configuración ya validada. Exclusiones y asignaciones se
 * reemplazan enteras; los hosts propios se añaden sin pisar los existentes.
 */
export function importConfig(db: Database, config: AgentBridgeConfig): ImportResult {
  replaceUserBypassPatterns(db, config.bypassPatterns)
  for (const h of config.customHosts) addCustomHost(db, h.host, h.kind as CustomHostKind, h.label ?? undefined)
  for (const [agentId, mappings] of Object.entries(config.agentMappings)) setMappings(db, agentId, mappings)
  return {
    bypassPatterns: config.bypassPatterns.length,
    customHosts: config.customHosts.length,
    agents: Object.keys(config.agentMappings).length,
  }
}
