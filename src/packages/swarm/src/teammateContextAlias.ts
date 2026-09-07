/**
 * TeammateContext — contexto en runtime de teammates in-process — porte de
 * `ccnmt: packages/swarm/src/teammateContextAlias.ts`.
 *
 * Porte VERBATIM: la única dependencia es `node:async_hooks`, presente
 * en cualquier runtime de Node/Bun.
 *
 * Contexto basado en AsyncLocalStorage para teammates in-process, que
 * permite ejecución concurrente sin conflictos de estado global.
 *
 * Relación con otros mecanismos de identidad de teammate (documentado en
 * la fuente, ninguno de los dos existe aún en este árbol):
 * - Variables de entorno (CLAUDE_CODE_AGENT_ID): teammates basados en
 *   proceso, lanzados vía tmux.
 * - dynamicTeamContext (teammate.ts): teammates basados en proceso que
 *   se unen en runtime.
 * - TeammateContext (este archivo): teammates in-process vía
 *   AsyncLocalStorage.
 *
 * ADVERTENCIA DE SINGLETON: el slot de AsyncLocalStorage de abajo es un
 * singleton a nivel de módulo. Los consumidores deben pasar por este
 * archivo canónico (o por `./teammateContext.ts`, su fachada) — nunca
 * instanciar una segunda AsyncLocalStorage bajo el mismo nombre.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Contexto en runtime de un teammate in-process.
 * Se guarda en AsyncLocalStorage para acceso concurrente.
 */
export type TeammateContext = {
  /** Agent ID completo, p.ej. "researcher@my-team" */
  agentId: string
  /** Nombre visible, p.ej. "researcher" */
  agentName: string
  /** Nombre del equipo al que pertenece este teammate */
  teamName: string
  /** Color de UI asignado a este teammate */
  color?: string
  /** Si el teammate debe entrar en plan mode antes de implementar */
  planModeRequired: boolean
  /** Session ID del líder (para correlacionar transcripts) */
  parentSessionId: string
  /** Discriminador — siempre true para teammates in-process */
  isInProcess: true
  /** Abort controller para el manejo del ciclo de vida (enlazado al padre) */
  abortController: AbortController
}

const teammateContextStorage = new AsyncLocalStorage<TeammateContext>()

/**
 * Devuelve el contexto actual de teammate in-process, si corre como uno.
 * `undefined` si no se está ejecutando dentro de un contexto de teammate
 * in-process.
 */
export function getTeammateContext(): TeammateContext | undefined {
  return teammateContextStorage.getStore()
}

/**
 * Corre una función con el contexto de teammate fijado. Se usa al lanzar
 * un teammate in-process para establecer su contexto de ejecución.
 */
export function runWithTeammateContext<T>(
  context: TeammateContext,
  fn: () => T,
): T {
  return teammateContextStorage.run(context, fn)
}

/**
 * Verifica si la ejecución actual está dentro de un teammate in-process.
 * Más rápido que `getTeammateContext() !== undefined` para chequeos simples.
 */
export function isInProcessTeammate(): boolean {
  return teammateContextStorage.getStore() !== undefined
}

/**
 * Crea un `TeammateContext` a partir de la configuración de arranque.
 * El `abortController` lo pasa el llamador. Para teammates in-process,
 * típicamente es un controller independiente (no enlazado al padre) para
 * que el teammate siga corriendo aunque se interrumpa la query del líder.
 */
export function createTeammateContext(config: {
  agentId: string
  agentName: string
  teamName: string
  color?: string
  planModeRequired: boolean
  parentSessionId: string
  abortController: AbortController
}): TeammateContext {
  return {
    ...config,
    isInProcess: true,
  }
}
