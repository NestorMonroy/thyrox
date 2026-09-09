/**
 * Porte de `ccnmt: packages/swarm/src/adapters/buildSwarmAgentDeps.ts` — el
 * puente entre las dos superficies de dependencias del multi-repo: toma un
 * `SwarmHostDeps` (lo que el host implementa para el dominio swarm) y compone
 * el `AgentDeps` que `AgentCore`/`AgentLoop` reciben en el constructor.
 *
 * Es el residuo que TASK-DOCS-0276 excluyo bajo un bloqueo declarado que
 * resulto falso: los seis tipos que la fuente importa de la raiz del paquete
 * hermano ya estaban portados en `agentDeps.ts`, y los cuatro simbolos de
 * runtime (`readMailbox`, `markMessageAsReadByIndex`, `writeToMailbox`,
 * `readTeamFileAsync`) tambien. Solo faltaba declararlos en el barrel de
 * `@thyrox/agent`, hecho en este mismo pase.
 *
 * DIVERGENCIA DECLARADA — los stand-ins `unknown` de `types/deps.ts`.
 * Aquella divergencia (ver su encabezado) sustituye `CoreTool`, `ToolResult`,
 * `ToolExecContext` y `CoreMessage` por `unknown` dentro de `SwarmHostDeps`.
 * `AgentDeps` si usa los tipos reales, asi que en los puntos donde una
 * sub-superficie del host DEVUELVE uno de esos cuatro, el valor llega como
 * `unknown` y no satisface el contrato del agente. Los puntos afectados se
 * anotan uno a uno abajo con un cast estrecho al tipo que la FUENTE declara
 * en ese mismo sitio; ninguno ensancha el contrato ni cambia el valor en
 * ejecucion. Cerrar la divergencia de raiz —darle a `types/deps.ts` los
 * cuatro tipos reales— toca los 30+ consumidores de `SwarmHostDeps` y es
 * trabajo de su propia tarea, no de este puente.
 */
import type {
  AgentDeps,
  ClaimableTask,
  CoreTool,
  IncomingMailMessage,
  MailboxDep,
  OutgoingMailMessage,
  TaskClaimingDep,
  ToolResult,
} from '@thyrox/agent'
import type { CoreMessage } from '@thyrox/agent/coreMessages.js'
import type { ProviderEvent } from '@thyrox/agent/agentDeps.js'
import { markMessageAsReadByIndex, readMailbox, writeToMailbox } from '../mailbox/index.ts'
import { readTeamFileAsync } from '../core/teamHelpers.ts'
import type { SwarmHostDeps } from '../types/deps.ts'

/** La identidad del teammate en cuyo nombre se compone el `AgentDeps`. */
type SwarmAgentIdentity = {
  teammateId: string
  name: string
  teamId: string
  role: 'worker' | 'leader'
}

type BuildSwarmAgentDepsOptions = {
  host: SwarmHostDeps
  identity: SwarmAgentIdentity
}

/**
 * El buzon del teammate como `MailboxDep`.
 *
 * No toma nada del host: el buzon es filesystem bajo el directorio del equipo,
 * y lo resuelven las tres funciones de `mailbox/index.ts`. La fuente si
 * desestructura `host` aqui y no lo usa; el puerto no lo desestructura.
 */
export function createSwarmMailboxAdapter(options: BuildSwarmAgentDepsOptions): MailboxDep {
  const { identity } = options

  const envelope = (message: OutgoingMailMessage) => ({
    from: identity.name,
    text: message.text,
    summary: message.summary,
    timestamp: new Date().toISOString(),
  })

  return {
    async poll(): Promise<IncomingMailMessage[]> {
      const stored = await readMailbox(identity.name, identity.teamId)
      // El indice se fija ANTES de filtrar: `markRead` direcciona por posicion
      // en el buzon completo, asi que un indice recalculado tras el filtro
      // marcaria como leido un mensaje distinto.
      return stored
        .map((message, index) => ({ message, index }))
        .filter(({ message }) => !message.read)
        .map(({ message, index }) => ({
          from: message.from,
          fromName: message.from,
          text: message.text,
          summary: message.summary,
          index,
        }))
    },

    async markRead(index: number): Promise<void> {
      await markMessageAsReadByIndex(identity.name, identity.teamId, index)
    },

    async sendTo(peerId: string, message: OutgoingMailMessage): Promise<void> {
      await writeToMailbox(peerId, envelope(message), identity.teamId)
    },

    async broadcast(message: OutgoingMailMessage): Promise<void> {
      const team = await readTeamFileAsync(identity.teamId)
      if (!team) {
        return
      }
      await Promise.all(
        team.members
          .filter(member => member.name !== identity.name)
          .map(member => writeToMailbox(member.name, envelope(message), identity.teamId)),
      )
    },
  }
}

/** El sistema de tareas del host como `TaskClaimingDep`, acotado al equipo. */
export function createSwarmTaskClaimingAdapter(
  options: BuildSwarmAgentDepsOptions,
): TaskClaimingDep {
  const { host, identity } = options

  return {
    async listAvailable(): Promise<ClaimableTask[]> {
      const tasks = await host.tasks.listTasks(identity.teamId)
      return tasks
        .filter(task => task.status === 'pending')
        .map(task => ({
          taskId: task.id,
          // `description` es opcional en `HostTask`; el subject siempre esta.
          description: task.description ?? task.subject,
        }))
    },

    async claim(taskId: string): Promise<boolean> {
      const result = await host.tasks.claimTask(identity.teamId, taskId, identity.name)
      return result.success
    },

    async update(taskId: string, status: string): Promise<void> {
      await host.tasks.updateTask(identity.teamId, taskId, {
        status: status as 'pending' | 'in_progress' | 'completed',
      })
    },
  }
}

/**
 * Compone el `AgentDeps` completo desde el host.
 *
 * Es `async` por una sola razon: `HostContextProvider.getSystemPrompt()`
 * devuelve una promesa y `ContextDep.getSystemPrompt()` es sincrono. El prompt
 * se resuelve una vez aqui y el `ContextDep` devuelve lo ya resuelto.
 */
export async function buildSwarmAgentDeps(
  options: BuildSwarmAgentDepsOptions,
): Promise<AgentDeps> {
  const { host, identity } = options
  const systemPrompt = await host.context.getSystemPrompt()

  return {
    provider: {
      stream(params) {
        // DIVERGENCIA 1 — `systemPrompt` es OPCIONAL en `ProviderStreamParams`
        // y OBLIGATORIO en `HostApiProvider.stream`. La asimetria esta en la
        // fuente misma (`ccnmt: packages/agent/types/deps.ts:9` lo declara
        // `systemPrompt?` y `packages/swarm/src/types/deps.ts:8` sin `?`), asi
        // que su propio `buildSwarmAgentDeps` no typechequea contra sus tipos.
        // El puerto no reproduce el error: hace explicito el campo, que en
        // ejecucion sigue siendo el mismo valor (`undefined` si no venia).
        return host.api.stream({ ...params, systemPrompt: params.systemPrompt }) as AsyncIterable<ProviderEvent>
      },
      getModel() {
        return host.api.getModel()
      },
    },
    tools: {
      find(name) {
        return host.tools.find(name) as CoreTool | undefined
      },
      list() {
        return host.tools.list() as CoreTool[]
      },
      execute(tool, input, context) {
        return host.tools.execute(tool, input, context) as Promise<ToolResult>
      },
    },
    permission: {
      async canUseTool(tool, input, context) {
        const result = await host.permissions.canUseTool(tool, input, {
          ...context,
          input,
        })
        // DIVERGENCIA 2 — `PermissionResult` es una union discriminada
        // (`{allowed:true} | {allowed:false; reason:string}`) y el host
        // devuelve `{allowed:boolean; reason?:string}`. Segunda asimetria de
        // la fuente: su objeto plano tampoco satisface su propia union. El
        // puerto discrimina, y cuando el host deniega sin motivo pone uno —
        // la union EXIGE un `reason` en la rama denegada.
        if (result.allowed) {
          return { allowed: true }
        }
        return {
          allowed: false,
          reason: result.reason ?? 'el host denego el permiso sin declarar motivo',
        }
      },
    },
    output: {
      emit(event) {
        host.events.emit(event)
      },
    },
    hooks: {
      onTurnStart(state) {
        return host.hooks.onTurnStart(state)
      },
      onTurnEnd(state) {
        return host.hooks.onTurnEnd(state)
      },
      onStop(messages, context) {
        return host.hooks.onStop(messages, context)
      },
    },
    compaction: {
      maybeCompact(messages, tokenCount) {
        return host.compaction.maybeCompact(messages, tokenCount) as Promise<{
          compacted: boolean
          messages: CoreMessage[]
          tokensSaved?: number
        }>
      },
    },
    context: {
      getSystemPrompt() {
        return systemPrompt.map(content => ({ content }))
      },
      getUserContext() {
        return host.context.getUserContext()
      },
      getSystemContext() {
        return host.context.getSystemContext()
      },
    },
    session: {
      recordTranscript(messages) {
        return host.session.recordTranscript(messages)
      },
      getSessionId() {
        return host.session.getSessionId()
      },
    },
    swarm: {
      identity: {
        name: identity.name,
        teamId: identity.teamId,
        teammateId: identity.teammateId,
        role: identity.role,
      },
      mailbox: createSwarmMailboxAdapter(options),
      taskClaiming: createSwarmTaskClaimingAdapter(options),
    },
  }
}
