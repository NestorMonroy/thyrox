/**
 * Los errores tipados del agente — porte de `ccnmt: packages/agent/errors.ts`.
 *
 * Cada subclase lleva un `code` estable con prefijo `AGENT_`. El codigo es lo
 * que un consumidor puede comparar; el mensaje es prosa y cambia.
 */

/** Raiz de la familia: aporta el `code` que las demas fijan. */
export class AgentBaseError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AgentBaseError'
    this.code = code
  }
}

/** El host no expone las ataduras que el agente necesita. */
export class HostBindingsError extends AgentBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('AGENT_HOST_BINDINGS_ERROR', message, options)
    this.name = 'AgentHostBindingsError'
  }
}

/** El estado observado contradice al declarado. */
export class StateError extends AgentBaseError {
  constructor(message: string, options?: ErrorOptions) {
    super('AGENT_STATE_ERROR', message, options)
    this.name = 'AgentStateError'
  }
}

/**
 * Bloquear esta tarea cerraria un ciclo en el grafo de dependencias.
 *
 * Un ciclo NO es un grafo lento: es un interbloqueo. Cada tarea del ciclo
 * espera a otra del mismo ciclo, asi que ninguna puede arrancar nunca. Por eso
 * se detecta al ESCRIBIR la arista y no al leer el grafo — quien la crea se
 * entera en el momento, con el camino recorrido en `path`.
 */
export class TaskCycleError extends AgentBaseError {
  readonly path: string[]

  constructor(path: string[], options?: ErrorOptions) {
    super('AGENT_TASK_CYCLE', `blockTask would create a cycle: ${path.join(' → ')}`, options)
    this.name = 'TaskCycleError'
    this.path = path
  }
}

/**
 * La interrupcion cooperativa del usuario, marcada con un simbolo y no con una
 * subclase de `Error`.
 *
 * La razon es que la interrupcion NO es un fallo: distinguirla de un error de
 * proveedor o de herramienta por el texto de `error.message` es fragil, y un
 * simbolo unico se compara por identidad.
 */
export const UserAbort: unique symbol = Symbol('UserAbort')

export type UserAbort = typeof UserAbort
