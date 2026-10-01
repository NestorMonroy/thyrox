/**
 * Lo que devuelve `GET /api/tools/agent-bridge/state`, llevado siempre a la
 * forma que lee el cliente: `serverState` nunca queda indefinido, y lo que no
 * llega cae a un valor seguro. Acepta la forma de siempre (`server`, con
 * `certExists` en lugar de `certTrusted`) y la nueva (`serverState`).
 *
 * `agents` NO se convierte en `agentStates`: sus entradas tienen otra forma
 * (detección de instalación, no estado guardado), así que `agentStates` sólo
 * sale de la clave del mismo nombre.
 *
 * Porte de `omniroute: src/app/(dashboard)/dashboard/tools/agent-bridge/
 * normalizeState.ts` (MIT), con sus tipos, que allí vivían en el componente
 * de la página.
 */
import type { AgentBridgeStateRow } from '../state/rows.ts'

export interface AgentBridgeServerState {
  running: boolean
  port: number
  certTrusted: boolean
  upstreamCa: string | null
  lastStartedAt: string | null
  activeConns: number
  interceptedCount: number
  dnsConfigured: boolean
  orphanedStateDetected: boolean
  hasCachedPassword?: boolean
  needsSudoPassword?: boolean
  isWin?: boolean
}

export type AgentMappingsMap = Record<string, Array<{ source: string; target: string }>>

export interface AgentBridgePageData {
  serverState: AgentBridgeServerState
  agentStates: AgentBridgeStateRow[]
  bypassPatterns: string[]
  mappings: AgentMappingsMap
}

function defaultServerState(): AgentBridgeServerState {
  return {
    running: false,
    port: 443,
    certTrusted: false,
    upstreamCa: null,
    lastStartedAt: null,
    activeConns: 0,
    interceptedCount: 0,
    dnsConfigured: false,
    orphanedStateDetected: false,
  }
}

export const DEFAULT_AGENT_BRIDGE_STATE: Readonly<AgentBridgePageData> = {
  serverState: defaultServerState(),
  agentStates: [],
  bypassPatterns: [],
  mappings: {},
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type FieldKind = 'boolean' | 'number' | 'string'

/** Los campos que pasan tal cual cuando traen el tipo esperado. */
const PASS_THROUGH: ReadonlyArray<[keyof AgentBridgeServerState, FieldKind]> = [
  ['running', 'boolean'],
  ['port', 'number'],
  ['upstreamCa', 'string'],
  ['lastStartedAt', 'string'],
  ['activeConns', 'number'],
  ['interceptedCount', 'number'],
  ['dnsConfigured', 'boolean'],
  ['orphanedStateDetected', 'boolean'],
  ['hasCachedPassword', 'boolean'],
  ['needsSudoPassword', 'boolean'],
  ['isWin', 'boolean'],
]

function serverStateFrom(source: Record<string, unknown> | undefined): AgentBridgeServerState {
  const state = defaultServerState() as unknown as Record<string, unknown>
  if (!source) return state as unknown as AgentBridgeServerState
  for (const [key, kind] of PASS_THROUGH) {
    if (typeof source[key] === kind) state[key] = source[key]
  }
  // `certTrusted` es la clave canónica; `certExists` es la de siempre.
  if (typeof source.certTrusted === 'boolean') state.certTrusted = source.certTrusted
  else if (typeof source.certExists === 'boolean') state.certTrusted = source.certExists
  return state as unknown as AgentBridgeServerState
}

export function normalizeAgentBridgeState(raw: unknown): AgentBridgePageData {
  if (!isRecord(raw)) return { ...DEFAULT_AGENT_BRIDGE_STATE, serverState: defaultServerState() }
  const source = isRecord(raw.serverState) ? raw.serverState : isRecord(raw.server) ? raw.server : undefined
  return {
    serverState: serverStateFrom(source),
    agentStates: Array.isArray(raw.agentStates) ? (raw.agentStates as AgentBridgeStateRow[]) : [],
    bypassPatterns: Array.isArray(raw.bypassPatterns) ? (raw.bypassPatterns as string[]) : [],
    mappings: isRecord(raw.mappings) ? (raw.mappings as AgentMappingsMap) : {},
  }
}
