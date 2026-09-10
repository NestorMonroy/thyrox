/**
 * Tipos marcados de identificador — porte de `ccnmt: packages/agent/idTypes.ts`.
 *
 * `SessionId` y `AgentId` son `string` en ejecucion y tipos distintos al
 * compilar. Esa asimetria es el mecanismo entero: impide cruzar un id de
 * sesion con uno de agente sin coste alguno en tiempo de ejecucion.
 */

/** Identifica una sesion. */
export type SessionId = string & { readonly __brand: 'SessionId' }

/** Identifica un subagente dentro de una sesion. */
export type AgentId = string & { readonly __brand: 'AgentId' }

/** Marca una cadena como `SessionId`, sin verificar su forma. */
export function asSessionId(id: string): SessionId {
  return id as SessionId
}

/** Marca una cadena como `AgentId`, sin verificar su forma. */
export function asAgentId(id: string): AgentId {
  return id as AgentId
}

/**
 * La forma que produce `createAgentId`: `a`, una etiqueta opcional terminada
 * en guion, y 16 hexadecimales.
 */
const AGENT_ID_PATTERN = /^a(?:.+-)?[0-9a-f]{16}$/

/**
 * Reconoce la forma y marca. Devuelve nulo para lo que no la cumple —un
 * nombre de companero, una direccion de equipo— en vez de lanzar: el
 * llamador suele estar clasificando, no validando.
 */
export function toAgentId(candidate: string): AgentId | null {
  return AGENT_ID_PATTERN.test(candidate) ? (candidate as AgentId) : null
}
