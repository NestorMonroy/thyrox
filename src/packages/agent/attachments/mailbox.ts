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
