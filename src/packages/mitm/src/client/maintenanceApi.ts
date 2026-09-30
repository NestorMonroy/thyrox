/**
 * El cliente de mantenimiento del AgentBridge: autodiagnóstico, retirada de
 * la CA, reparación del estado huérfano y la configuración portable.
 *
 * Porte de `omniroute: src/lib/inspector/agentBridgeMaintenanceApi.ts` (MIT).
 */
import type { AgentBridgeConfig, ImportResult } from '../inspector/configPortability.ts'
import type { DiagnosticReport } from '../inspector/diagnostics.ts'
import { jsonBody, type LocalApiClient } from './localApi.ts'

const BASE = '/api/tools/agent-bridge'

export interface DiagnoseResult extends DiagnosticReport {
  /** El puerto que probó el diagnóstico. */
  port: number
}

/**
 * La contraseña de sudo sólo viaja si se dio: `JSON.stringify` omite una
 * clave `undefined`, así que sin contraseña el cuerpo es `{}`.
 */
function sudoBody(sudoPassword?: string): Pick<RequestInit, 'headers' | 'body'> {
  return jsonBody({ sudoPassword })
}

export function runDiagnose(client: LocalApiClient, agentId?: string): Promise<DiagnoseResult> {
  const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : ''
  return client.requestJson<DiagnoseResult>(`${BASE}/diagnose${query}`)
}

/** Retira la CA del almacén del sistema; repetirla no falla. */
export function removeCaCert(client: LocalApiClient, sudoPassword?: string): Promise<{ trusted: boolean }> {
  return client.requestJson<{ ok: boolean; trusted: boolean }>(`${BASE}/cert`, {
    method: 'DELETE',
    ...sudoBody(sudoPassword),
  })
}

/** Deshace el estado que dejó una caída: DNS, CA y proxy del sistema. */
export function repairMitmState(client: LocalApiClient, sudoPassword?: string): Promise<{ repaired: string[] }> {
  return client.requestJson<{ ok: boolean; repaired: string[] }>(`${BASE}/repair`, {
    method: 'POST',
    ...sudoBody(sudoPassword),
  })
}

export function fetchAgentBridgeConfig(client: LocalApiClient): Promise<AgentBridgeConfig> {
  return client.requestJson<AgentBridgeConfig>(`${BASE}/config`)
}

export function importAgentBridgeConfig(client: LocalApiClient, config: AgentBridgeConfig): Promise<ImportResult> {
  return client.requestJson<{ ok: boolean } & ImportResult>(`${BASE}/config`, { method: 'POST', ...jsonBody(config) })
}
