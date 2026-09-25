/**
 * Colapso de notificaciones idle duplicadas del buzón de compañeros de
 * equipo — porte PARCIAL DECLARADO de
 * `ccnmt: packages/agent/attachments/mailbox.ts`.
 *
 * La fuente reúne dos productores de attachment
 * (`getTeammateMailboxAttachments`, `getTeamContextAttachment`) más la
 * política de colapso que aquí se porta. Ninguno de los dos productores
 * tiene consumidor en este árbol todavía — dependen de `AppState`, del
 * registro `tool-registry` y del resto del protocolo swarm (mailbox
 * file-based, dedup por `from|timestamp|texto`, remoción de teammates) —
 * así que sólo se porta la pieza que su test ejercita:
 * `collapseConsecutiveIdleDuplicates` + el tipo `RawMessage`.
 *
 * La política de colapso, SIN cambios respecto a la fuente: se descarta
 * una notificación idle sólo si es byte-por-byte idéntica (misma clave
 * remitente + razón + resumen + tarea completada + estado + razón de
 * falla) a la idle INMEDIATAMENTE anterior del mismo remitente. Un
 * mensaje no-idle entre dos idles reinicia el estado de ese remitente —
 * la política previa ("sólo la última idle por remitente") perdía
 * transiciones intra-turno (`available → interrupted → available`),
 * resúmenes de DM entre pares que cambiaban de turno a turno, e idles de
 * finalización de tarea, dejando al líder ciego al progreso real del
 * equipo.
 *
 * DOS DIVERGENCIAS DECLARADAS frente a la fuente:
 *
 *  1. `isIdleNotification` / `createIdleNotification` /
 *     `IdleNotificationMessage` — la fuente los importa de
 *     `@claude-code-how-works/swarm` (`mailbox/protocolMessages.ts`), un
 *     paquete que este árbol no tiene (medido: `ls src/packages/` no lo
 *     lista). Se reimplementan aquí, localmente, acotados a lo que
 *     `collapseConsecutiveIdleDuplicates` necesita — mismo criterio que
 *     `../runtime/mailbox.ts` ya declara para su propio
 *     `createLocalSignal` ante la ausencia de
 *     `@claude-code-how-works/config/signal`.
 *  2. `jsonParse` — la fuente enruta `isIdleNotification` a través de un
 *     binding de runtime del host inyectado
 *     (`@claude-code-how-works/swarm/adapters/appRuntime.js`), que
 *     envuelve `JSON.parse` con instrumentación de rendimiento. Aquí es
 *     el `JSON.parse` desnudo — mismo criterio que `../tasks.ts` ya
 *     declara para su propio `jsonParse`/`jsonStringify`.
 *
 * Consecuencia de la divergencia 1: el test portado NO instala el
 * andamiaje `installSwarmAppRuntime`/`REQUIRED_BINDING_KEYS` de la
 * fuente (~90 claves simuladas para verificar que `isIdleNotification`
 * sólo toca `jsonParse` y ninguna otra atadura). Esa verificación
 * protege una capa de inyección de bindings que, en este puerto, no
 * existe: `isIdleNotification` llama `JSON.parse` directo, sin binding
 * que pueda fugarse a otra clave. Sí se instala `AgentHostBindings`
 * vacío (`../host.ts`) porque `logForDebugging` (`../internal/logging.ts`,
 * ya portado) lanza `HostBindingsError` sin host instalado — mismo
 * patrón que `__tests__/goalStopHook.test.ts` y
 * `__tests__/internalCommandQueue.behavior.test.ts` ya establecen en
 * este árbol.
 */
import { logForDebugging } from '../internal/logging.ts'
import { getClaudeConfigHomeDir } from '@thyrox/config/env/utils'
import { getAgentId, getAgentName, getTeamName, isTeamLead } from '@thyrox/swarm/teammateState.js'
import type { Attachment } from '../attachments.ts'
import type { Message } from '../messageShapes.ts'
import type { ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import { getViewedTeammateTask } from '@thyrox/app-host/state/selectors.js'
import {
  isStructuredProtocolMessage,
  isShutdownApproved,
} from '@thyrox/swarm/mailbox/protocolMessages.js'
import { markMessagesAsReadByPredicate } from '@thyrox/swarm/mailbox/index.js'
import { readUnreadMessages, removeTeammateFromTeamFile } from '@thyrox/swarm'
import { isInProcessTeammate } from '@thyrox/swarm/teammateContextAlias.js'
import { isAgentSwarmsEnabled } from '../agentSwarmsEnabled.js'
import { unassignTeammateTasks } from '../teamTasks.js'

/**
 * Shape de un mensaje del buzón de compañero de equipo tras retirar la
 * bandera `read` y la metadata del inbox. Exportado para que los tests
 * construyan fixtures sin reimplementar el tipo inline.
 */
export type RawMessage = {
  from: string
  text: string
  timestamp: string
  color?: string
  summary?: string
}

/** Reimplementación local mínima de `IdleNotificationMessage` (ver arriba). */
export type IdleNotificationMessage = {
  type: 'idle_notification'
  from: string
  timestamp: string
  /** Por qué el agente quedó idle */
  idleReason?: 'available' | 'interrupted' | 'failed'
  /** Resumen breve del último DM enviado en el turno (si hubo) */
  summary?: string
  completedTaskId?: string
  completedStatus?: 'resolved' | 'blocked' | 'failed'
  failureReason?: string
}

/** Reimplementación local mínima de `createIdleNotification` (ver arriba). */
export function createIdleNotification(
  agentId: string,
  options?: {
    idleReason?: IdleNotificationMessage['idleReason']
    summary?: string
    completedTaskId?: string
    completedStatus?: IdleNotificationMessage['completedStatus']
    failureReason?: string
  },
): IdleNotificationMessage {
  return {
    type: 'idle_notification',
    from: agentId,
    timestamp: new Date().toISOString(),
    idleReason: options?.idleReason,
    summary: options?.summary,
    completedTaskId: options?.completedTaskId,
    completedStatus: options?.completedStatus,
    failureReason: options?.failureReason,
  }
}

/** Reimplementación local mínima de `isIdleNotification` (ver arriba). */
export function isIdleNotification(
  messageText: string,
): IdleNotificationMessage | null {
  try {
    const parsed = JSON.parse(messageText)
    if (parsed && parsed.type === 'idle_notification') {
      return parsed as IdleNotificationMessage
    }
  } catch {
    // No es JSON, o no es una idle notification válida.
  }
  return null
}

/**
 * Construye la clave de identidad (remitente, razón, resumen, tarea
 * completada, estado, razón de falla) usada para decidir si una idle
 * notification es duplicado real de la anterior del mismo remitente.
 * Cualquier cosa que varíe —incluso un resumen distinto, incluso la
 * razón `available → interrupted`— produce una clave nueva y el mensaje
 * se conserva.
 */
function makeIdleKey(idle: {
  from: string
  idleReason?: string
  summary?: string
  completedTaskId?: string
  completedStatus?: string
  failureReason?: string
}): string {
  return [
    idle.from,
    idle.idleReason ?? '',
    idle.summary ?? '',
    idle.completedTaskId ?? '',
    idle.completedStatus ?? '',
    idle.failureReason ?? '',
  ].join('|')
}

/**
 * Descarta las notificaciones idle que son byte-por-byte idénticas a la
 * idle inmediatamente anterior del mismo remitente. La primera idle de
 * cada racha se conserva, así el líder ve cuándo empezó un estado, no
 * sólo que sigue en curso. Un mensaje no-idle entre dos idles reinicia
 * el estado por remitente — que un compañero nos hable significa que
 * empieza una racha nueva.
 *
 * Exportado para que los tests verifiquen el algoritmo directamente sin
 * reimplementarlo inline; no forma parte de ningún contrato público.
 */
export function collapseConsecutiveIdleDuplicates(
  messages: RawMessage[],
): RawMessage[] {
  if (messages.length <= 1) return messages

  const lastIdleKeyByAgent = new Map<string, string>()
  const survivors: RawMessage[] = []
  let collapsedCount = 0

  for (const m of messages) {
    const idle = isIdleNotification(m.text)
    if (!idle) {
      // Un mensaje no-idle reinicia la racha del remitente — se limpia
      // explícitamente para que la próxima idle del mismo remitente
      // siempre sobreviva.
      lastIdleKeyByAgent.delete(m.from)
      survivors.push(m)
      continue
    }
    const key = makeIdleKey(idle)
    if (lastIdleKeyByAgent.get(idle.from) === key) {
      collapsedCount++
      continue
    }
    lastIdleKeyByAgent.set(idle.from, key)
    survivors.push(m)
  }

  if (collapsedCount > 0) {
    logForDebugging(
      `[SwarmMailbox] Collapsed ${collapsedCount} consecutive-duplicate idle notification(s)`,
    )
  }
  return survivors
}

// --- porte por miembros: un ancla por ítem ---
/**
 * Devuelve el attachment de contexto de equipo para compañeros de equipo en
 * un swarm. Sólo se inyecta en el primer turno, para dar las instrucciones
 * de coordinación de equipo.
 */
export function getTeamContextAttachment(messages: Message[]): Attachment[] {
  const teamName = getTeamName()
  const agentId = getAgentId()
  const agentName = getAgentName()

  // Sólo se inyecta para compañeros de equipo (no para el líder ni para
  // sesiones sin equipo).
  if (!teamName || !agentId) {
    return []
  }

  // Sólo se inyecta en el primer turno — se comprueba si todavía no hay
  // ningún mensaje de tipo assistant.
  const hasAssistantMessage = messages.some(m => m.type === 'assistant')
  if (hasAssistantMessage) {
    return []
  }

  const configDir = getClaudeConfigHomeDir()
  const teamConfigPath = `${configDir}/teams/${teamName}/config.json`
  const taskListPath = `${configDir}/tasks/${teamName}/`

  return [
    {
      type: 'team_context',
      agentId,
      agentName: agentName || agentId,
      teamName,
      teamConfigPath,
      taskListPath,
    },
  ]
}
export async function getTeammateMailboxAttachments(
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  if (!isAgentSwarmsEnabled()) {
    return []
  }
  // Histórico: esto también dependía de USER_TYPE === 'ant'. Se retiró
  // porque ccb es de un solo operador autoalojado — el swarm es una
  // funcionalidad de primera clase de ccb, y el líder necesita el mismo
  // attachment de buzón de compañero que reciben los builds de tipo ant;
  // de otro modo el líder crea compañeros y queda ciego a su progreso,
  // que es exactamente el fallo que el operador encontró probando esto
  // el 2026-04-30. El gate isAgentSwarmsEnabled() que queda es la única
  // fuente de verdad de "¿está encendida la maquinaria del swarm?".

  // Obtiene AppState temprano para comprobar el estado de team lead
  const appState = toolUseContext.getAppState()

  // Usa el nombre de agente del helper (revisa AsyncLocalStorage, luego dynamicTeamContext)
  const envAgentName = getAgentName()

  // Obtiene el nombre del equipo (revisa AsyncLocalStorage, dynamicTeamContext, luego AppState)
  const teamName = getTeamName(appState.teamContext)

  // Comprueba si somos el team lead (usa la lógica compartida de swarm utils)
  const teamLeadStatus = isTeamLead(appState.teamContext)

  // Comprueba si se está viendo el transcript de un compañero (para teammates in-process)
  const viewedTeammate = getViewedTeammateTask({
    tasks: appState.tasks,
    viewingAgentTaskId: appState.viewingAgentTaskId,
  })

  // Resuelve el nombre de agente según a QUIÉN estamos viendo:
  // - Si vemos a un compañero, usa SU nombre (para leer de su buzón)
  // - Si no, usa la variable de entorno si está fijada, o el nombre del líder si somos el team lead
  let agentName = viewedTeammate?.identity.agentName ?? envAgentName
  if (!agentName && teamLeadStatus && appState.teamContext) {
    const leadAgentId = appState.teamContext.leadAgentId
    // Busca el nombre del líder en el mapa de agentes (no el UUID)
    agentName = appState.teamContext.teammates[leadAgentId]?.name || 'team-lead'
  }

  logForDebugging(
    `[SwarmMailbox] getTeammateMailboxAttachments called: envAgentName=${envAgentName}, isTeamLead=${teamLeadStatus}, resolved agentName=${agentName}, teamName=${teamName}`,
  )

  // Sólo revisa el buzón si se corre como agente en un swarm o como team lead
  if (!agentName) {
    logForDebugging(
      `[SwarmMailbox] Not checking inbox - not in a swarm or team lead`,
    )
    return []
  }

  logForDebugging(
    `[SwarmMailbox] Checking inbox for agent="${agentName}" team="${teamName || 'default'}"`,
  )

  // Revisa el buzón por mensajes sin leer (enruta a in-process o basado en archivo)
  // Filtra los mensajes de protocolo estructurado (peticiones/respuestas de permiso,
  // mensajes de shutdown, etc.) — éstos deben quedar sin leer para que useInboxPoller
  // los enrute a sus manejadores propios (cola workerPermissions, cola sandbox, etc.).
  // Sin este filtro, la generación de attachments compite con InboxPoller: quien lea
  // primero marca todos los mensajes como leídos, y si gana attachments, los mensajes
  // de protocolo terminan empaquetados como texto crudo de contexto para el LLM en vez
  // de enrutarse a sus manejadores de UI.
  const allUnreadMessages = await readUnreadMessages(agentName, teamName)
  const unreadMessages = allUnreadMessages.filter(
    m => !isStructuredProtocolMessage(m.text),
  )
  logForDebugging(
    `[MailboxBridge] Found ${allUnreadMessages.length} unread message(s) for "${agentName}" (${allUnreadMessages.length - unreadMessages.length} structured protocol messages filtered out)`,
  )

  // También revisa AppState.inbox por mensajes pendientes (encolados a mitad de turno por useInboxPoller)
  // IMPORTANTE: appState.inbox contiene mensajes DE compañeros HACIA el líder.
  // Sólo se muestran al ver el transcript del líder (no el de un compañero).
  // Al ver a un compañero, sus mensajes vienen del buzón basado en archivo de arriba.
  // Los compañeros in-process comparten AppState con el líder — appState.inbox contiene
  // los mensajes encolados del LÍDER, no los del compañero. Se salta para evitar fugas
  // (incluido el auto-eco de broadcasts). Los compañeros reciben mensajes exclusivamente
  // por su buzón basado en archivo + waitForNextPromptOrShutdown.
  // Nota: viewedTeammate ya se calculó arriba para resolver agentName
  const pendingInboxMessages =
    viewedTeammate || isInProcessTeammate()
      ? [] // Viendo a un compañero o corriendo como compañero in-process - no mostrar el inbox del líder
      : appState.inbox.messages.filter(m => m.status === 'pending')
  logForDebugging(
    `[SwarmMailbox] Found ${pendingInboxMessages.length} pending message(s) in AppState.inbox`,
  )

  // Combina ambas fuentes de mensajes CON DEDUPLICACIÓN
  // El mismo mensaje podría existir en el buzón de archivo y en AppState.inbox por condiciones de carrera:
  // 1. getTeammateMailboxAttachments lee el archivo -> encuentra el mensaje M
  // 2. InboxPoller lee el mismo archivo -> encola M en AppState.inbox
  // 3. getTeammateMailboxAttachments lee AppState -> encuentra M de nuevo
  // Se deduplica usando from+timestamp+prefijo de texto como clave
  const seen = new Set<string>()
  let allMessages: RawMessage[] = []

  for (const m of [...unreadMessages, ...pendingInboxMessages]) {
    const key = `${m.from}|${m.timestamp}|${m.text.slice(0, 100)}`
    if (!seen.has(key)) {
      seen.add(key)
      allMessages.push({
        from: m.from,
        text: m.text,
        timestamp: m.timestamp,
        color: m.color,
        summary: m.summary,
      })
    }
  }

  // Colapsa sólo las notificaciones idle *idénticas* consecutivas por
  // remitente. La política previa ("conservar sólo la última por
  // remitente") descartaba transiciones a mitad de turno como
  // `available → interrupted → available`, resúmenes de DM entre pares
  // que cambiaban entre turnos, e idles de finalización de tarea —
  // dejando al líder ciego al progreso real que necesitaba ver.
  allMessages = collapseConsecutiveIdleDuplicates(allMessages)

  if (allMessages.length === 0) {
    logForDebugging(`[SwarmMailbox] No messages to deliver, returning empty`)
    return []
  }

  logForDebugging(
    `[SwarmMailbox] Returning ${allMessages.length} message(s) as attachment for "${agentName}" (${unreadMessages.length} from file, ${pendingInboxMessages.length} from AppState, after dedup)`,
  )

  // Construye el attachment ANTES de marcar los mensajes como procesados
  // Esto evita perder mensajes si alguna operación de abajo falla
  const attachment: Attachment[] = [
    {
      type: 'teammate_mailbox',
      messages: allMessages,
    },
  ]

  // Marca como leídos sólo los mensajes de buzón no estructurados, después de construir el attachment.
  // Los mensajes de protocolo estructurado quedan sin leer para que useInboxPoller los maneje.
  if (unreadMessages.length > 0) {
    await markMessagesAsReadByPredicate(
      agentName,
      m => !isStructuredProtocolMessage(m.text),
      teamName,
    )
    logForDebugging(
      `[MailboxBridge] marked ${unreadMessages.length} non-structured message(s) as read for agent="${agentName}" team="${teamName || 'default'}"`,
    )
  }

  // Procesa mensajes shutdown_approved - retira compañeros del archivo de equipo
  // Esto refleja lo que useInboxPoller hace en modo interactivo
  // En modo -p, useInboxPoller no corre, así que esto se maneja aquí
  if (teamLeadStatus && teamName) {
    for (const m of allMessages) {
      const shutdownApproval = isShutdownApproved(m.text)
      if (shutdownApproval) {
        const teammateToRemove = shutdownApproval.from
        logForDebugging(
          `[SwarmMailbox] Processing shutdown_approved from ${teammateToRemove}`,
        )

        // Busca el ID del compañero por su nombre
        const teammateId = appState.teamContext?.teammates
          ? Object.entries(appState.teamContext.teammates).find(
              ([, t]) => t.name === teammateToRemove,
            )?.[0]
          : undefined

        if (teammateId) {
          // Retira del archivo de equipo
          await removeTeammateFromTeamFile(teamName, {
            agentId: teammateId,
            name: teammateToRemove,
          })
          logForDebugging(
            `[SwarmMailbox] Removed ${teammateToRemove} from team file`,
          )

          // Desasigna las tareas propiedad de este compañero
          await unassignTeammateTasks(
            teamName,
            teammateId,
            teammateToRemove,
            'shutdown',
          )

          // Retira del teamContext en AppState
          toolUseContext.setAppState(prev => {
            if (!prev.teamContext?.teammates) return prev
            if (!(teammateId in prev.teamContext.teammates)) return prev
            const { [teammateId]: _, ...remainingTeammates } =
              prev.teamContext.teammates
            return {
              ...prev,
              teamContext: {
                ...prev.teamContext,
                teammates: remainingTeammates,
              },
            }
          })
        }
      }
    }
  }

  // Marca los mensajes de AppState inbox como procesados AL FINAL, después de construir el attachment
  // Esto asegura que no se pierdan mensajes si alguna operación anterior falla
  if (pendingInboxMessages.length > 0) {
    const pendingIds = new Set(pendingInboxMessages.map(m => m.id))
    toolUseContext.setAppState(prev => ({
      ...prev,
      inbox: {
        messages: prev.inbox.messages.map(m =>
          pendingIds.has(m.id) ? { ...m, status: 'processed' as const } : m,
        ),
      },
    }))
  }

  return attachment
}
