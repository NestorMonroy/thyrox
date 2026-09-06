/**
 * Contexto de agente para atribución de analítica vía AsyncLocalStorage —
 * porte COMPLETO de `ccnmt: packages/agent/agentContext.ts`.
 *
 * Rastrea la identidad del agente a través de operaciones asíncronas sin
 * taladrar un parámetro por toda la pila de llamadas. Admite dos tipos de
 * agente:
 *
 * 1. Subagentes (tool `Agent`): corren en el mismo proceso, para tareas
 *    delegadas y rápidas. Contexto: `SubagentContext` con
 *    `agentType: 'subagent'`.
 * 2. Teammates en el mismo proceso: parte de un swarm, con coordinación de
 *    equipo. Contexto: `TeammateAgentContext` con `agentType: 'teammate'`.
 *
 * Para teammates de swarm en procesos separados (tmux/iTerm2), la fuente usa
 * variables de entorno (`CLAUDE_CODE_AGENT_ID`,
 * `CLAUDE_CODE_PARENT_SESSION_ID`) en vez de este mecanismo — fuera del
 * alcance de este módulo.
 *
 * POR QUÉ AsyncLocalStorage y no un estado compartido único (AppState):
 * cuando los agentes corren en segundo plano, varios pueden ejecutarse
 * concurrentemente en el mismo proceso. Un estado único se sobreescribiría
 * entre ellos — los eventos del Agente A usarían por error el contexto que
 * dejó puesto el Agente B. `AsyncLocalStorage` aísla cada cadena de
 * ejecución asíncrona, así que los agentes concurrentes no interfieren
 * entre sí.
 *
 * Sustitución declarada (no es un recorte de símbolos: los NUEVE que la
 * fuente exporta —`SubagentContext`, `TeammateAgentContext`, `AgentContext`,
 * `getAgentContext`, `runWithAgentContext`, `isSubagentContext`,
 * `isTeammateAgentContext`, `getSubagentLogName`,
 * `consumeInvokingRequestId`— están todos aquí, con fidelidad de
 * comportamiento byte a byte). Lo que se sustituye es el ORIGEN de un tipo:
 * la fuente importa `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS`
 * desde `@claude-code-how-works/local-observability/compat`, paquete
 * hermano inexistente en este árbol. Se importa en su lugar desde
 * `./internalTypes.ts` — el hogar canónico local del mismo tipo, ya usado
 * con idéntico propósito por `internal/logging.ts`.
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from './internalTypes.ts'
import { isAgentSwarmsEnabled } from './agentSwarmsEnabled.ts'

/**
 * Contexto para subagentes (agentes del tool `Agent`).
 * Los subagentes corren en el mismo proceso, para tareas rápidas y
 * delegadas.
 */
export type SubagentContext = {
  /** El UUID del subagente (de createAgentId()). */
  agentId: string
  /** El session id del team lead (de la variable de entorno
   *  CLAUDE_CODE_PARENT_SESSION_ID); indefinido para subagentes del REPL
   *  principal. */
  parentSessionId?: string
  /** El id del agente padre inmediato, si este subagente fue engendrado
   *  por otro subagente (cadena de fork anidada). Indefinido para
   *  subagentes de primer nivel engendrados desde el REPL principal. */
  parentAgentId?: string
  /** Tipo de agente — 'subagent' para agentes del tool `Agent`. */
  agentType: 'subagent'
  /** El nombre de tipo del subagente (p. ej. "Explore", "Bash",
   *  "code-reviewer"). */
  subagentName?: string
  /** Si es un agente incorporado (built-in), frente a un agente custom
   *  definido por el usuario. */
  isBuiltIn?: boolean
  /** El request_id del agente invocador que engendró o reanudó este
   *  agente. Para subagentes anidados es el invocador inmediato, no la
   *  raíz — el session_id ya agrupa el árbol entero. Se actualiza en cada
   *  reanudación. */
  invokingRequestId?: string
  /** Si esta invocación es el engendrado inicial o una reanudación
   *  posterior vía SendMessage. Indefinido cuando invokingRequestId está
   *  ausente. */
  invocationKind?: 'spawn' | 'resume'
  /** Bandera mutable: ¿ya se emitió el borde de esta invocación a
   *  telemetría? Se reinicia a false en cada spawn/resume; la pone en
   *  true consumeInvokingRequestId() en el primer evento de API
   *  terminal. */
  invocationEmitted?: boolean
}

/**
 * Contexto para teammates en el mismo proceso.
 * Los teammates son parte de un swarm y tienen coordinación de equipo.
 */
export type TeammateAgentContext = {
  /** Id completo del agente, p. ej. "researcher@my-team". */
  agentId: string
  /** Nombre para mostrar, p. ej. "researcher". */
  agentName: string
  /** Nombre del equipo al que pertenece este teammate. */
  teamName: string
  /** Color de UI asignado a este teammate. */
  agentColor?: string
  /** Si el teammate debe entrar en plan mode antes de implementar. */
  planModeRequired: boolean
  /** El session id del team lead, para correlacionar el transcript. */
  parentSessionId: string
  /** Si este agente es el team lead. */
  isTeamLead: boolean
  /** Tipo de agente — 'teammate' para teammates de swarm. */
  agentType: 'teammate'
  /** El request_id del agente invocador que engendró o reanudó este
   *  teammate. Indefinido para teammates arrancados fuera de una llamada
   *  a herramienta (p. ej. al inicio de la sesión). Se actualiza en cada
   *  reanudación. */
  invokingRequestId?: string
  /** Ver SubagentContext.invocationKind. */
  invocationKind?: 'spawn' | 'resume'
  /** Bandera mutable: ver SubagentContext.invocationEmitted. */
  invocationEmitted?: boolean
}

/**
 * Unión discriminada para el contexto de agente.
 * Se usa agentType para distinguir entre contexto de subagente y de
 * teammate.
 */
export type AgentContext = SubagentContext | TeammateAgentContext

const agentContextStorage = new AsyncLocalStorage<AgentContext>()

/**
 * Obtiene el contexto de agente actual, si existe.
 * Devuelve indefinido si no se corre dentro de un contexto de agente
 * (subagente o teammate). Usar los type guards isSubagentContext() o
 * isTeammateAgentContext() para acotar el tipo.
 */
export function getAgentContext(): AgentContext | undefined {
  return agentContextStorage.getStore()
}

/**
 * Corre una función asíncrona con el contexto de agente dado.
 * Todas las operaciones asíncronas dentro de la función tienen acceso a
 * este contexto.
 */
export function runWithAgentContext<T>(context: AgentContext, fn: () => T): T {
  return agentContextStorage.run(context, fn)
}

/**
 * Type guard: ¿el contexto es un SubagentContext?
 */
export function isSubagentContext(
  context: AgentContext | undefined,
): context is SubagentContext {
  return context?.agentType === 'subagent'
}

/**
 * Type guard: ¿el contexto es un TeammateAgentContext?
 */
export function isTeammateAgentContext(
  context: AgentContext | undefined,
): context is TeammateAgentContext {
  if (isAgentSwarmsEnabled()) {
    return context?.agentType === 'teammate'
  }
  return false
}

/**
 * Nombre del subagente apto para logueo en analítica.
 * Devuelve el nombre de tipo de agente para agentes incorporados,
 * "user-defined" para agentes custom, o indefinido si no se corre dentro
 * de un contexto de subagente.
 *
 * Seguro para metadata de analítica: los nombres de agente incorporados
 * son constantes de código, y los agentes custom siempre se mapean al
 * literal "user-defined".
 */
export function getSubagentLogName():
  | AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  | undefined {
  const context = getAgentContext()
  if (!isSubagentContext(context) || !context.subagentName) {
    return undefined
  }
  return (
    context.isBuiltIn ? context.subagentName : 'user-defined'
  ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Obtiene el request_id invocador del contexto de agente actual — una vez
 * por invocación. Devuelve el id en la primera llamada tras un
 * spawn/resume, luego indefinido hasta el siguiente límite. También
 * indefinido en el hilo principal, o cuando la ruta de spawn no traía
 * request_id.
 *
 * Semántica de borde disperso: invokingRequestId aparece en exactamente
 * un evento terminal de API por invocación, así que un valor no-nulo
 * aguas abajo marca un límite de spawn/resume.
 */
export function consumeInvokingRequestId():
  | {
      invokingRequestId: string
      invocationKind: 'spawn' | 'resume' | undefined
    }
  | undefined {
  const context = getAgentContext()
  if (!context?.invokingRequestId || context.invocationEmitted) {
    return undefined
  }
  context.invocationEmitted = true
  return {
    invokingRequestId: context.invokingRequestId,
    invocationKind: context.invocationKind,
  }
}
