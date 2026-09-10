/**
 * Direcciones compuestas — porte de `ccnmt: packages/agent/agentIdUtils.ts`.
 *
 * Dos formas que se arman y se desarman sin ambiguedad:
 *
 *   agente   `<nombre>@<equipo>`
 *   pedido   `<tipo>-<marca de tiempo>@<agente>`
 *
 * Son deterministas a proposito: el mismo agente en el mismo equipo recibe
 * el mismo identificador, asi que se puede reconectar tras un reinicio y
 * calcular la direccion de un companero sin consultar a nadie.
 *
 * Las dos gramaticas se cruzan —el agente lleva arroba y el pedido tambien—
 * y por eso cada lado elige su separador con criterio opuesto: el agente
 * parte en la PRIMERA arroba (el equipo puede contener mas), y el pedido
 * separa su marca de tiempo en el ULTIMO guion (el tipo puede contener mas).
 */

/** Une el nombre del agente y el de su equipo. */
export function formatAgentId(agentName: string, teamName: string): string {
  return `${agentName}@${teamName}`
}

/**
 * Desarma la direccion de un agente por su primera arroba. Devuelve nulo
 * si no hay arroba: la cadena no es una direccion, es otra cosa.
 */
export function parseAgentId(
  agentId: string,
): { agentName: string; teamName: string } | null {
  const separator = agentId.indexOf('@')
  if (separator === -1) return null
  return {
    agentName: agentId.slice(0, separator),
    teamName: agentId.slice(separator + 1),
  }
}

/** Acuna el identificador de un pedido, fechandolo en el momento. */
export function generateRequestId(
  requestType: string,
  agentId: string,
): string {
  return `${requestType}-${Date.now()}@${agentId}`
}

/**
 * Desarma un pedido en sus tres partes. Devuelve nulo ante cualquiera de
 * los tres defectos —sin arroba, sin guion en el prefijo, marca de tiempo
 * no numerica— porque los tres significan lo mismo para el llamador: esto
 * no es un pedido.
 */
export function parseRequestId(
  requestId: string,
): { requestType: string; timestamp: number; agentId: string } | null {
  const separator = requestId.indexOf('@')
  if (separator === -1) return null

  const prefix = requestId.slice(0, separator)
  const agentId = requestId.slice(separator + 1)

  const lastDash = prefix.lastIndexOf('-')
  if (lastDash === -1) return null

  const timestamp = parseInt(prefix.slice(lastDash + 1), 10)
  if (Number.isNaN(timestamp)) return null

  return { requestType: prefix.slice(0, lastDash), timestamp, agentId }
}
