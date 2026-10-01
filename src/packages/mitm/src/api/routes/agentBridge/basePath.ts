/** La raíz de las rutas del AgentBridge en la API local. */
export const AGENT_BRIDGE_BASE = '/api/tools/agent-bridge'

export function agentBridgePath(route: string): string {
  return `${AGENT_BRIDGE_BASE}${route}`
}
