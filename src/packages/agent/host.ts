/**
 * El registro de bindings del host — porte de
 * `ccnmt: packages/agent/host.ts`.
 *
 * El paquete `agent` describe el comportamiento del runtime sin acoplarse a
 * quién lo ejecuta: cada binding (logging, sesión, hooks, red) la instala el
 * proceso host una sola vez con `installAgentHostBindings`, y el resto del
 * paquete la consulta con `getAgentHostBindings()`. Sin bindings instaladas,
 * `getAgentHostBindings()` lanza — un binding individual ausente (todas son
 * opcionales) se resuelve caso por caso con el operador `?.` en el módulo
 * que la consume, nunca aquí.
 *
 * `AgentHostBindings` se importa de `./contracts.ts`, como en la fuente.
 * Hasta 2026-09-25 este archivo declaraba un subconjunto local porque
 * `contracts.ts` no estaba portado; ya lo está (85 bindings, que contienen
 * los 65 del subconjunto), y la copia reducida hacía fallar a los
 * consumidores de los bindings que le faltaban.
 *
 * `./internalTypes.ts` SÍ está portado (es autocontenido, sin
 * dependencias externas) — por eso `AgentMessage` se importa de ahí en
 * vez de repetir aquí una forma estructural abierta como
 * `AgentMessageLike` (que sigue existiendo, sin tocar, para los bindings
 * de `runtimeBridges.ts` que ya la usaban antes de este pase).
 */
import { HostBindingsError } from './errors.ts'
import type { AgentMessage } from './internalTypes.ts'
import type { AgentHostBindings } from './contracts.ts'

/**
 * Forma mínima de un mensaje de agente para el binding
 * `createCompactBoundaryMessage`. La fuente usa el `AgentMessage` completo
 * de `internalTypes.ts` (147 líneas, sin portar); aquí basta con que el
 * binding pueda devolver una forma estructural abierta — quien la consuma
 * en `runtimeBridges.ts` la castea a `CompactBoundaryMessage`.
 */
export type AgentMessageLike = Record<string, unknown>

/** La firma exacta que `contracts.ts` declara para `createDumpPromptsFetch`. */
export type DumpPromptsFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

// El contrato completo vive en `./contracts.ts`, como en la fuente; se re-exporta
// para que `installAgentHostBindings`/`getAgentHostBindings` y sus consumidores
// lo sigan tomando de aquí.
export type { AgentHostBindings }

let agentHostBindings: AgentHostBindings | null = null

/**
 * Una tarea del tablero, en la forma MÍNIMA que el pipeline de Stop lee:
 * su estado para saber si hay trabajo de fondo en vuelo, y su dueño para
 * saber de quién. El tablero real declara muchos más campos; declararlos
 * todos aquí ataría este paquete a su esquema sin necesidad.
 */
export type HostTask = {
  id: string
  subject: string
  description?: string
  status: string
  owner?: string
}

/** Lo que un ejecutor de hooks emite por cada hook que corre. */
export type StopHookExecutionResult = {
  message?: AgentMessage
  blockingError?: { blockingError: string }
  preventContinuation?: boolean
  stopReason?: string
  hook?: unknown
  impossible?: boolean
}

export function installAgentHostBindings(bindings: AgentHostBindings): void {
  agentHostBindings = bindings
}

export function getAgentHostBindings(): AgentHostBindings {
  if (!agentHostBindings) {
    throw new HostBindingsError(
      'Agent host bindings have not been installed. Install host bindings before using @thyrox/agent runtime APIs.',
    )
  }
  return agentHostBindings
}
