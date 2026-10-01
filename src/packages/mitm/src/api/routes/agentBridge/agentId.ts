/** Si un identificador es el de un agente registrado. */
import { MITM_AGENT_IDS, type AgentId } from '../../../types.ts'

const AGENT_IDS: ReadonlySet<string> = new Set(MITM_AGENT_IDS)

export function isAgentId(id: string): id is AgentId {
  return AGENT_IDS.has(id)
}
