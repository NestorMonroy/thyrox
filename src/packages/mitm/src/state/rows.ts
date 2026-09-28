/**
 * Filas del estado persistente del AgentBridge, tal como las devuelven los
 * módulos de este directorio: los enteros 0/1 de SQLite ya convertidos a
 * booleano.
 *
 * Porte de `omniroute: src/lib/db/_rowTypes.ts` (MIT), sólo las cuatro filas
 * que el MITM consume.
 */

export interface AgentBridgeStateRow {
  agent_id: string
  dns_enabled: boolean
  cert_trusted: boolean
  setup_completed: boolean
  last_started_at: string | null
  last_error: string | null
}

export interface AgentBridgeMappingRow {
  agent_id: string
  source_model: string
  target_model: string
  updated_at: string
}

export type BypassSource = 'default' | 'user'

export interface AgentBridgeBypassRow {
  pattern: string
  source: BypassSource
  created_at: string
}

export type CustomHostKind = 'llm' | 'app' | 'custom'

export interface InspectorCustomHostRow {
  host: string
  enabled: boolean
  label: string | null
  kind: CustomHostKind
  added_at: string
  last_seen_at: string | null
}
