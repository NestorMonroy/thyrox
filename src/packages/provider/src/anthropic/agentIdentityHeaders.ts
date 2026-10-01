/**
 * Las cabeceras con que el cliente identifica al subagente que hace la
 * petición. Referencia: el tramo `V` de `EV` (constructor del cliente del
 * ejecutable 2.1.283) y `n3n`, su codificación de valores; extracción en
 * `.claude/workbench/session-headers-20260927T183409/outputs/`.
 *
 * El hilo principal no se identifica; un subagente manda su id y, si lo
 * tiene, el de su agente padre. Con eso un proxy puede separar la sesión de
 * un subagente de la de su padre sin mezclar su afinidad de credencial.
 *
 * Divergencia declarada: el ejecutable las llama `x-claude-code-agent-id` y
 * `x-claude-code-parent-agent-id`; aquí llevan el nombre de thyrox, como
 * pide `src/verify/check_product_word.py`.
 */

export const AGENT_ID_HEADER = 'x-thyrox-agent-id'
export const PARENT_AGENT_ID_HEADER = 'x-thyrox-parent-agent-id'

export type AgentIdentity = { agentType: string; agentId?: string; parentAgentId?: string }

/** `n3n`: `%` y lo que no es ASCII imprimible, codificado para una cabecera. */
export function encodeHeaderValue(value: string): string {
  return value.replace(/%|[^\x20-\x7e]/gu, character => encodeURIComponent(character))
}

export function agentIdentityHeaders(context: AgentIdentity | undefined): Record<string, string> {
  if (!context || context.agentType === 'main') return {}
  return {
    ...(context.agentId && { [AGENT_ID_HEADER]: encodeHeaderValue(context.agentId) }),
    ...(context.parentAgentId && { [PARENT_AGENT_ID_HEADER]: encodeHeaderValue(context.parentAgentId) }),
  }
}
