/**
 * Utilidades de teammate para la coordinación del swarm de agentes —
 * porte de `ccnmt: packages/swarm/src/teammateState.ts`.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `isEnvTruthy` de
 * `@claude-code-how-works/config/env/utils`, paquete `config` que en este
 * árbol (`@thyrox/config`) no expone ese módulo (medido con
 * `ls src/packages/config`). Se reimplementa localmente — mismo criterio
 * que `api: agent/internalUtils.ts:59` ya declara para su propia
 * reimplementación del mismo wrapper trivial sobre variables de entorno.
 *
 * `AppState` se tipa localmente como `{ tasks: Record<string, unknown> }`
 * — la fuente lo importa de `adapters/appRuntime.ts` (donde también es
 * `unknown`, un tipo-bypass declarado a propósito por el propio host
 * binding), así que no hay pérdida de fidelidad: el shim de la fuente ya
 * era opaco.
 *
 * Estos helpers identifican si esta instancia de Claude Code corre como
 * un teammate lanzado dentro de un swarm. Los teammates reciben su
 * identidad vía argumentos CLI (--agent-id, --team-name, etc.), que se
 * guardan en `dynamicTeamContext`.
 *
 * Para teammates in-process (corriendo en el mismo proceso),
 * AsyncLocalStorage da un contexto aislado por teammate, evitando
 * sobre-escrituras concurrentes.
 *
 * Orden de prioridad para resolver identidad:
 * 1. AsyncLocalStorage (teammates in-process) — vía teammateContext.ts
 * 2. dynamicTeamContext (teammates tmux vía argumentos CLI)
 */

// Re-exporta las utilidades de teammate in-process desde teammateContext.ts
export {
  createTeammateContext,
  getTeammateContext,
  isInProcessTeammate,
  runWithTeammateContext,
  type TeammateContext,
} from './teammateContextAlias.js'

import { getTeammateContext } from './teammateContextAlias.js'

/** Reimplementación local mínima de `isEnvTruthy` (ver divergencia arriba). */
function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

type InProcessTeammateTaskLike = {
  type: string
  status: string
  isIdle?: boolean
  onIdleCallbacks?: Array<() => void>
}

type AppState = { tasks: Record<string, InProcessTeammateTaskLike | unknown> }

/**
 * Devuelve el session ID del padre para este teammate. Para teammates
 * in-process, es el session ID del team lead. Prioridad: AsyncLocalStorage
 * (in-process) > dynamicTeamContext (teammates tmux).
 */
export function getParentSessionId(): string | undefined {
  const inProcessCtx = getTeammateContext()
  if (inProcessCtx) return inProcessCtx.parentSessionId
  return dynamicTeamContext?.parentSessionId
}

/**
 * Contexto dinámico de equipo para unirse en runtime. Cuando está fijado,
 * estos valores tienen precedencia sobre las variables de entorno.
 */
let dynamicTeamContext: {
  agentId: string
  agentName: string
  teamName: string
  color?: string
  planModeRequired: boolean
  parentSessionId?: string
} | null = null

/** Fija el contexto dinámico de equipo (al unirse a un equipo en runtime). */
export function setDynamicTeamContext(
  context: {
    agentId: string
    agentName: string
    teamName: string
    color?: string
    planModeRequired: boolean
    parentSessionId?: string
  } | null,
): void {
  dynamicTeamContext = context
}

/** Limpia el contexto dinámico de equipo (al abandonar un equipo). */
export function clearDynamicTeamContext(): void {
  dynamicTeamContext = null
}

/** Devuelve el contexto dinámico de equipo actual (para inspección/debug). */
export function getDynamicTeamContext(): typeof dynamicTeamContext {
  return dynamicTeamContext
}

/**
 * Devuelve el agent ID si esta sesión corre como teammate en un swarm,
 * o `undefined` si corre standalone. Prioridad: AsyncLocalStorage
 * (in-process) > dynamicTeamContext (tmux vía argumentos CLI).
 */
export function getAgentId(): string | undefined {
  const inProcessCtx = getTeammateContext()
  if (inProcessCtx) return inProcessCtx.agentId
  return dynamicTeamContext?.agentId
}

/**
 * Devuelve el nombre del agente si esta sesión corre como teammate en un
 * swarm. Prioridad: AsyncLocalStorage (in-process) > dynamicTeamContext
 * (tmux vía argumentos CLI).
 */
export function getAgentName(): string | undefined {
  const inProcessCtx = getTeammateContext()
  if (inProcessCtx) return inProcessCtx.agentName
  return dynamicTeamContext?.agentName
}

/**
 * Devuelve el nombre del equipo si esta sesión es parte de uno.
 * Prioridad: AsyncLocalStorage (in-process) > dynamicTeamContext (tmux
 * vía argumentos CLI) > `teamContext` recibido.
 *
 * @param teamContext - Contexto de equipo opcional desde AppState (para líderes)
 */
export function getTeamName(teamContext?: {
  teamName: string
}): string | undefined {
  const inProcessCtx = getTeammateContext()
  if (inProcessCtx) return inProcessCtx.teamName
  if (dynamicTeamContext?.teamName) return dynamicTeamContext.teamName
  return teamContext?.teamName
}

/**
 * `true` si esta sesión corre como teammate en un swarm.
 * Prioridad: AsyncLocalStorage (in-process) > dynamicTeamContext (tmux
 * vía argumentos CLI). Para teammates tmux, exige TANTO agent ID COMO
 * team name.
 */
export function isTeammate(): boolean {
  // Los teammates in-process corren dentro del mismo proceso.
  const inProcessCtx = getTeammateContext()
  if (inProcessCtx) return true
  // Los teammates tmux exigen agent ID Y team name.
  return !!(dynamicTeamContext?.agentId && dynamicTeamContext?.teamName)
}

/**
 * Devuelve el color asignado al teammate, o `undefined` si no corre como
 * teammate o no tiene color asignado. Prioridad: AsyncLocalStorage
 * (in-process) > dynamicTeamContext (teammates tmux).
 */
export function getTeammateColor(): string | undefined {
  const inProcessCtx = getTeammateContext()
  if (inProcessCtx) return inProcessCtx.color
  return dynamicTeamContext?.color
}

/**
 * `true` si esta sesión de teammate exige plan mode antes de implementar.
 * Cuando está activo, el teammate debe entrar en plan mode y obtener
 * aprobación antes de escribir código. Prioridad: AsyncLocalStorage >
 * dynamicTeamContext > variable de entorno.
 */
export function isPlanModeRequired(): boolean {
  const inProcessCtx = getTeammateContext()
  if (inProcessCtx) return inProcessCtx.planModeRequired
  if (dynamicTeamContext !== null) {
    return dynamicTeamContext.planModeRequired
  }
  return isEnvTruthy(process.env.CLAUDE_CODE_PLAN_MODE_REQUIRED)
}

/**
 * Verifica si esta sesión es el team lead.
 *
 * Una sesión se considera team lead si:
 * 1. Existe un contexto de equipo con `leadAgentId`, Y
 * 2. O bien:
 *    - nuestro `CLAUDE_CODE_AGENT_ID` coincide con `leadAgentId`, O
 *    - no tenemos `CLAUDE_CODE_AGENT_ID` fijado (compatibilidad hacia
 *      atrás: la sesión original que creó el equipo antes de que los
 *      agent IDs se estandarizaran).
 *
 * @param teamContext - El contexto de equipo desde AppState, si existe
 * @returns `true` si esta sesión es el team lead
 */
export function isTeamLead(
  teamContext:
    | {
        leadAgentId: string
      }
    | undefined,
): boolean {
  if (!teamContext?.leadAgentId) {
    return false
  }

  // Usa getAgentId() para soportar AsyncLocalStorage (teammates in-process).
  const myAgentId = getAgentId()
  const leadAgentId = teamContext.leadAgentId

  // Si mi agent ID coincide con el del líder, soy el líder.
  if (myAgentId === leadAgentId) {
    return true
  }

  // Compatibilidad hacia atrás: sin agent ID fijado y con contexto de
  // equipo, ésta es la sesión original que lo creó (el líder).
  if (!myAgentId) {
    return true
  }

  return false
}

/**
 * `true` si hay algún teammate in-process activo corriendo. Lo usan
 * el modo headless/print para decidir si esperar a los teammates antes
 * de salir.
 */
export function hasActiveInProcessTeammates(appState: AppState): boolean {
  for (const task of Object.values(appState.tasks)) {
    const t = task as InProcessTeammateTaskLike
    if (t?.type === 'in_process_teammate' && t.status === 'running') {
      return true
    }
  }
  return false
}

/**
 * `true` si hay teammates in-process que aún están trabajando en tareas
 * activamente. Devuelve `true` si algún teammate corre pero NO está idle
 * (sigue procesando). Se usa para decidir si esperar antes de enviar
 * prompts de shutdown.
 */
export function hasWorkingInProcessTeammates(appState: AppState): boolean {
  for (const task of Object.values(appState.tasks)) {
    const t = task as InProcessTeammateTaskLike
    if (t?.type === 'in_process_teammate' && t.status === 'running' && !t.isIdle) {
      return true
    }
  }
  return false
}

/**
 * Devuelve una promesa que resuelve cuando todos los teammates in-process
 * que estaban trabajando pasan a idle. Registra callbacks en la tarea de
 * cada teammate trabajando — se invocan cuando pasa a idle. Resuelve de
 * inmediato si ningún teammate está trabajando.
 */
export function waitForTeammatesToBecomeIdle(
  setAppState: (f: (prev: AppState) => AppState) => void,
  appState: AppState,
): Promise<void> {
  const workingTaskIds: string[] = []

  for (const [taskId, task] of Object.entries(appState.tasks)) {
    const t = task as InProcessTeammateTaskLike
    if (t?.type === 'in_process_teammate' && t.status === 'running' && !t.isIdle) {
      workingTaskIds.push(taskId)
    }
  }

  if (workingTaskIds.length === 0) {
    return Promise.resolve()
  }

  // Crea una promesa que resuelve cuando todos los teammates trabajando
  // pasan a idle.
  return new Promise<void>(resolve => {
    let remaining = workingTaskIds.length

    const onIdle = (): void => {
      remaining--
      if (remaining === 0) {
        resolve()
      }
    }

    // Registra un callback en cada teammate trabajando. Verifica el
    // estado actual de isIdle para manejar la carrera en que el teammate
    // pasó a idle entre nuestro snapshot inicial y este registro.
    setAppState(prev => {
      const newTasks = { ...prev.tasks }
      for (const taskId of workingTaskIds) {
        const task = newTasks[taskId] as InProcessTeammateTaskLike | undefined
        if (task && task.type === 'in_process_teammate') {
          // Si la tarea ya está idle, invoca onIdle de inmediato.
          if (task.isIdle) {
            onIdle()
          } else {
            newTasks[taskId] = {
              ...task,
              onIdleCallbacks: [...(task.onIdleCallbacks ?? []), onIdle],
            }
          }
        }
      }
      return { ...prev, tasks: newTasks }
    })
  })
}
