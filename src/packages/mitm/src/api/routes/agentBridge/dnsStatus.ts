/** Si algún agente con el DNS activado tiene de verdad sus hosts redirigidos. */
import type { Database } from 'bun:sqlite'

import { getAllAgentBridgeStates } from '../../../state/agentBridgeState.ts'

export function anyAgentDnsConfigured(db: Database, configuredFor: (agentId: string) => boolean): boolean {
  return getAllAgentBridgeStates(db).some(s => s.dns_enabled && configuredFor(s.agent_id))
}
