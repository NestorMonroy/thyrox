/**
 * El buzón de un compañero: el mensajero por archivo de una tanda de agentes.
 *
 * Procedencia: `ccnmt: packages/swarm/src/mailbox/index.ts` (654 líneas, 14
 * funciones exportadas más las reexportaciones del protocolo). Ese árbol
 * declara `"license": "UNLICENSED"`, así que el cuerpo se **reimplementa** y
 * no se copia.
 *
 * Cada compañero tiene un buzón en
 * `<equipos>/<equipo>/inboxes/<agente>.json`. Los demás le escriben ahí y él
 * los recoge como adjuntos. Los buzones se indexan por NOMBRE de agente
 * dentro de un equipo, no por identificador: el nombre es lo que el modelo
 * escribe al mandar un mensaje.
 *
 * TODA ESCRITURA VA BAJO CERROJO. El archivo se reemplaza completo, así que
 * dos remitentes concurrentes sin cerrojo pierden uno de los dos mensajes en
 * silencio — y en una tanda de agentes los remitentes concurrentes son la
 * norma, no la excepción.
 *
 * DIVERGENCIA DECLARADA: no se importan `z`, `PermissionModeSchema`,
 * `lazySchema` ni `BackendType`. La fuente los importa y no los usa en este
 * archivo; traerlos sólo por fidelidad ataría el módulo a cuatro cosas que no
 * necesita.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWriteFile } from '@thyrox/storage/file.js'

import {
  count,
  generateRequestId,
  getAgentName,
  getErrnoCode,
  getTeamName,
  getTeammateColor,
  getTeamsDir,
  jsonParse,
  jsonStringify,
  lock,
  logError,
  logForDebugging,
  sanitizePathComponent,
  SEND_MESSAGE_TOOL_NAME,
  TEAMMATE_MESSAGE_TAG,
} from '../adapters/appRuntime.js'
import type { Message } from '../adapters/appRuntime.js'
import { TEAM_LEAD_NAME } from '../core/constants.js'
import { createShutdownRequestMessage } from './protocolMessages.js'

/**
 * Cómo se espera al cerrojo de un buzón.
 *
 * Reintentos con espera creciente: varios agentes de una misma tanda escriben
 * al mismo buzón a la vez, y fallar de inmediato convertiría la contención
 * normal en mensajes perdidos.
 */
const LOCK_OPTIONS = {
  retries: {
    retries: 10,
    minTimeout: 5,
    maxTimeout: 100,
  },
}

export type TeammateMessage = {
  from: string
  text: string
  timestamp: string
  read: boolean
  /** El color asignado al remitente. */
  color?: string
  /** Resumen de 5-10 palabras que la interfaz muestra como avance. */
  summary?: string
}

/**
 * La ruta del buzón de un agente.
 *
 * Los DOS componentes se sanean: el equipo llega del entorno y el agente de la
 * herramienta, o sea del modelo, y ambos se concatenan a una ruta que se
 * escribe.
 */
export function getInboxPath(agentName: string, teamName?: string): string {
  const team = teamName || getTeamName() || 'default'
  const inboxDir = join(getTeamsDir(), sanitizePathComponent(team), 'inboxes')
  const fullPath = join(inboxDir, `${sanitizePathComponent(agentName)}.json`)
  logForDebugging(
    `[TeammateMailbox] getInboxPath: agent=${agentName}, team=${team}, fullPath=${fullPath}`,
  )
  return fullPath
}

/** Crea el directorio de buzones de un equipo si falta. */
async function ensureInboxDir(teamName?: string): Promise<void> {
  const team = teamName || getTeamName() || 'default'
  const inboxDir = join(getTeamsDir(), sanitizePathComponent(team), 'inboxes')
  await mkdir(inboxDir, { recursive: true })
  logForDebugging(`[TeammateMailbox] Ensured inbox directory: ${inboxDir}`)
}

/**
 * Todos los mensajes del buzón de un agente.
 *
 * Que el buzón no exista es el caso normal del primer sondeo, así que devuelve
 * una lista vacía sin registrarlo como error. Cualquier otro fallo sí se
 * registra: ahí «no hay buzón» y «el buzón está corrupto» son cosas distintas.
 */
export async function readMailbox(
  agentName: string,
  teamName?: string,
): Promise<TeammateMessage[]> {
  const inboxPath = getInboxPath(agentName, teamName)
  logForDebugging(`[TeammateMailbox] readMailbox: path=${inboxPath}`)

  try {
    const content = await readFile(inboxPath, 'utf-8')
    const messages = jsonParse(content) as TeammateMessage[]
    logForDebugging(
      `[TeammateMailbox] readMailbox: read ${messages.length} message(s)`,
    )
    return messages
  } catch (error) {
    if (getErrnoCode(error) === 'ENOENT') {
      logForDebugging('[TeammateMailbox] readMailbox: file does not exist')
      return []
    }
    logForDebugging(`Failed to read inbox for ${agentName}: ${error}`)
    logError(error)
    return []
  }
}

/** Sólo los mensajes sin leer. */
export async function readUnreadMessages(
  agentName: string,
  teamName?: string,
): Promise<TeammateMessage[]> {
  const messages = await readMailbox(agentName, teamName)
  const unread = messages.filter(m => !m.read)
  logForDebugging(
    `[TeammateMailbox] readUnreadMessages: ${unread.length} unread of ${messages.length} total`,
  )
  return unread
}

/**
 * El par `(type, requestId)` de un mensaje de protocolo, o `null`.
 *
 * Usa el `JSON.parse` DEL LENGUAJE y no el binding del anfitrión: está en el
 * camino caliente de escritura, la decisión es una comprobación pura de
 * cadena a objeto, y así queda invocable desde una prueba sin instalar el
 * runtime.
 *
 * El texto llano y los mensajes de protocolo sin identificador de petición dan
 * `null` los dos: se apilan sin condición, porque o son idempotentes o están
 * pensados para repetirse.
 */
export function extractDedupKey(
  text: string,
): { type: string; requestId: string } | null {
  if (!text || text[0] !== '{') return null
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    const obj = parsed as Record<string, unknown>
    const type = typeof obj.type === 'string' ? obj.type : null
    const requestId = typeof obj.requestId === 'string' ? obj.requestId : null
    if (!type || !requestId) return null
    return { type, requestId }
  } catch {
    return null
  }
}

/**
 * Escribe un mensaje en el buzón de un compañero.
 *
 * El archivo se crea con modo EXCLUSIVO antes de tomar el cerrojo: el cerrojo
 * exige que el archivo exista, y crearlo sin exclusividad haría que cada
 * escritura empezara vaciando el buzón del destinatario.
 */
export async function writeToMailbox(
  recipientName: string,
  message: Omit<TeammateMessage, 'read'>,
  teamName?: string,
): Promise<void> {
  await ensureInboxDir(teamName)

  const inboxPath = getInboxPath(recipientName, teamName)
  const lockFilePath = `${inboxPath}.lock`

  logForDebugging(
    `[TeammateMailbox] writeToMailbox: recipient=${recipientName}, from=${message.from}, path=${inboxPath}`,
  )

  try {
    await writeFile(inboxPath, '[]', { encoding: 'utf-8', flag: 'wx' })
    logForDebugging('[TeammateMailbox] writeToMailbox: created new inbox file')
  } catch (error) {
    if (getErrnoCode(error) !== 'EEXIST') {
      logForDebugging(
        `[TeammateMailbox] writeToMailbox: failed to create inbox file: ${error}`,
      )
      logError(error)
      return
    }
  }

  let release: (() => Promise<void>) | undefined
  try {
    release = await lock(inboxPath, {
      lockfilePath: lockFilePath,
      ...LOCK_OPTIONS,
    })

    // Se relee CON el cerrojo tomado: lo leído antes puede ser de hace un
    // reintento entero.
    const messages = await readMailbox(recipientName, teamName)

    // Idempotencia de los mensajes de protocolo. Sin ella, cuatro peticiones
    // con el mismo identificador se apilan; el destinatario atiende una y la
    // marca leída, y las otras tres quedan invisibles — sin leer, e idénticas
    // a una que ya corrió.
    const newKey = extractDedupKey(message.text)
    if (newKey) {
      const existing = messages.find(m => {
        const k = extractDedupKey(m.text)
        return k && k.type === newKey.type && k.requestId === newKey.requestId
      })
      if (existing) {
        logForDebugging(
          `[TeammateMailbox] writeToMailbox: deduped ${newKey.type}#${newKey.requestId} for ${recipientName} (already in mailbox)`,
        )
        return
      }
    }

    messages.push({ ...message, read: false })

    await atomicWriteFile(inboxPath, jsonStringify(messages, null, 2))
    logForDebugging(
      `[TeammateMailbox] Wrote message to ${recipientName}'s inbox from ${message.from}`,
    )
  } catch (error) {
    logForDebugging(`Failed to write to inbox for ${recipientName}: ${error}`)
    logError(error)
  } finally {
    if (release) await release()
  }
}

/**
 * Marca UN mensaje como leído, por su posición.
 *
 * Que ya estuviera leído no es un fallo, pero deja huella con nivel de aviso:
 * llegar ahí significa que dos lectores compitieron por el mismo mensaje, que
 * es la firma de un bucle de sondeo solapándose consigo mismo.
 */
export async function markMessageAsReadByIndex(
  agentName: string,
  teamName: string | undefined,
  messageIndex: number,
): Promise<void> {
  const inboxPath = getInboxPath(agentName, teamName)
  logForDebugging(
    `[TeammateMailbox] markMessageAsReadByIndex called: agentName=${agentName}, teamName=${teamName}, index=${messageIndex}, path=${inboxPath}`,
  )

  const lockFilePath = `${inboxPath}.lock`

  let release: (() => Promise<void>) | undefined
  try {
    release = await lock(inboxPath, {
      lockfilePath: lockFilePath,
      ...LOCK_OPTIONS,
    })

    const messages = await readMailbox(agentName, teamName)

    if (messageIndex < 0 || messageIndex >= messages.length) {
      logForDebugging(
        `[TeammateMailbox] markMessageAsReadByIndex: index ${messageIndex} out of bounds (${messages.length} messages)`,
      )
      return
    }

    const message = messages[messageIndex]
    if (!message) {
      logForDebugging(
        `[TeammateMailbox] markMessageAsReadByIndex: message at index ${messageIndex} is missing`,
      )
      return
    }
    if (message.read) {
      logForDebugging(
        `[TeammateMailbox] WARN markMessageAsReadByIndex: message at index ${messageIndex} for ${agentName} (team=${teamName ?? 'default'}) was already read — possible poll/processing race`,
      )
      return
    }

    messages[messageIndex] = { ...message, read: true }

    await atomicWriteFile(inboxPath, jsonStringify(messages, null, 2))
    logForDebugging(
      `[TeammateMailbox] markMessageAsReadByIndex: marked message at index ${messageIndex} as read`,
    )
  } catch (error) {
    if (getErrnoCode(error) === 'ENOENT') {
      logForDebugging(
        `[TeammateMailbox] markMessageAsReadByIndex: file does not exist at ${inboxPath}`,
      )
      return
    }
    logForDebugging(
      `[TeammateMailbox] markMessageAsReadByIndex FAILED for ${agentName}: ${error}`,
    )
    logError(error)
  } finally {
    if (release) await release()
  }
}

/** Marca el buzón entero como leído. */
export async function markMessagesAsRead(
  agentName: string,
  teamName?: string,
): Promise<void> {
  const inboxPath = getInboxPath(agentName, teamName)
  logForDebugging(
    `[TeammateMailbox] markMessagesAsRead called: agentName=${agentName}, teamName=${teamName}, path=${inboxPath}`,
  )

  const lockFilePath = `${inboxPath}.lock`

  let release: (() => Promise<void>) | undefined
  try {
    release = await lock(inboxPath, {
      lockfilePath: lockFilePath,
      ...LOCK_OPTIONS,
    })

    const messages = await readMailbox(agentName, teamName)

    if (messages.length === 0) {
      logForDebugging('[TeammateMailbox] markMessagesAsRead: no messages to mark')
      return
    }

    const unreadCount = count(messages, (m: TeammateMessage) => !m.read)

    // `messages` sale de una lectura fresca: son objetos sin compartir, así
    // que mutarlos aquí no alcanza a nadie más.
    for (const m of messages) m.read = true

    await atomicWriteFile(inboxPath, jsonStringify(messages, null, 2))
    logForDebugging(
      `[TeammateMailbox] markMessagesAsRead: WROTE ${unreadCount} message(s) as read to ${inboxPath}`,
    )
  } catch (error) {
    if (getErrnoCode(error) === 'ENOENT') {
      logForDebugging(
        `[TeammateMailbox] markMessagesAsRead: file does not exist at ${inboxPath}`,
      )
      return
    }
    logForDebugging(
      `[TeammateMailbox] markMessagesAsRead FAILED for ${agentName}: ${error}`,
    )
    logError(error)
  } finally {
    if (release) await release()
  }
}

/**
 * Vacía un buzón.
 *
 * El modo `r+` es lo que impide crearlo: un archivo nuevo aquí haría aparecer
 * el buzón de un compañero que no existe, y el resto del sistema lo leería
 * como un miembro más.
 */
export async function clearMailbox(
  agentName: string,
  teamName?: string,
): Promise<void> {
  const inboxPath = getInboxPath(agentName, teamName)

  try {
    await writeFile(inboxPath, '[]', { encoding: 'utf-8', flag: 'r+' })
    logForDebugging(`[TeammateMailbox] Cleared inbox for ${agentName}`)
  } catch (error) {
    if (getErrnoCode(error) === 'ENOENT') return
    logForDebugging(`Failed to clear inbox for ${agentName}: ${error}`)
    logError(error)
  }
}

/**
 * Envuelve los mensajes en el sobre que el modelo lee.
 *
 * EL CUERPO NO SE ESCAPA, y es fiel a la fuente. Quien redacta un mensaje
 * puede cerrar la etiqueta antes de tiempo y abrir otra con el remitente que
 * quiera: la frontera del sobre la parte quien escribe dentro. Está MEDIDO en
 * la suite de este módulo, no supuesto — `ccb` bloquea ese mismo defecto con
 * un test propio, y aquí queda como conducta observada de este árbol.
 */
export function formatTeammateMessages(
  messages: Array<{
    from: string
    text: string
    timestamp: string
    color?: string
    summary?: string
  }>,
): string {
  return messages
    .map(m => {
      const colorAttr = m.color ? ` color="${m.color}"` : ''
      const summaryAttr = m.summary ? ` summary="${m.summary}"` : ''
      return `<${TEAMMATE_MESSAGE_TAG} teammate_id="${m.from}"${colorAttr}${summaryAttr}>\n${m.text}\n</${TEAMMATE_MESSAGE_TAG}>`
    })
    .join('\n\n')
}

// Las formas del protocolo —fábricas, comprobadores y esquemas— viven en
// `protocolMessages.ts`. Se reexportan desde aquí para que quien importe el
// buzón siga encontrándolas donde siempre.
export {
  createIdleNotification,
  createModeSetRequestMessage,
  createPermissionRequestMessage,
  createPermissionResponseMessage,
  createSandboxPermissionRequestMessage,
  createSandboxPermissionResponseMessage,
  createShutdownApprovedMessage,
  createShutdownRejectedMessage,
  createShutdownRequestMessage,
  isIdleNotification,
  isModeSetRequest,
  isPermissionRequest,
  isPermissionResponse,
  isPlanApprovalRequest,
  isPlanApprovalResponse,
  isSandboxPermissionRequest,
  isSandboxPermissionResponse,
  isShutdownApproved,
  isShutdownRejected,
  isShutdownRequest,
  isStructuredProtocolMessage,
  isTaskAssignment,
  isTeamPermissionUpdate,
  ModeSetRequestMessageSchema,
  PlanApprovalRequestMessageSchema,
  PlanApprovalResponseMessageSchema,
  ShutdownApprovedMessageSchema,
  ShutdownRejectedMessageSchema,
  ShutdownRequestMessageSchema,
} from './protocolMessages.js'
export type {
  IdleNotificationMessage,
  ModeSetRequestMessage,
  PermissionRequestMessage,
  PermissionResponseMessage,
  PlanApprovalRequestMessage,
  PlanApprovalResponseMessage,
  SandboxPermissionRequestMessage,
  SandboxPermissionResponseMessage,
  ShutdownApprovedMessage,
  ShutdownRejectedMessage,
  ShutdownRequestMessage,
  TaskAssignmentMessage,
  TeamPermissionUpdateMessage,
} from './protocolMessages.js'

/**
 * Pide a un compañero que se apague.
 *
 * Vive aquí y no junto a las formas del protocolo porque toca E/S e identidad
 * —quién soy, de qué equipo, con qué color— que son asuntos del runtime y no
 * de la forma del mensaje.
 *
 * El líder no tiene nombre de agente propio, así que se identifica con el
 * nombre reservado: mandar una cadena vacía dejaría el mensaje sin remitente.
 */
export async function sendShutdownRequestToMailbox(
  targetName: string,
  teamName?: string,
  reason?: string,
): Promise<{ requestId: string; target: string }> {
  const resolvedTeamName = teamName || getTeamName()
  const senderName = getAgentName() || TEAM_LEAD_NAME
  const requestId = generateRequestId('shutdown', targetName)

  const shutdownMessage = createShutdownRequestMessage({
    requestId,
    from: senderName,
    reason,
  })

  await writeToMailbox(
    targetName,
    {
      from: senderName,
      text: jsonStringify(shutdownMessage),
      timestamp: new Date().toISOString(),
      color: getTeammateColor(),
    },
    resolvedTeamName,
  )

  return { requestId, target: targetName }
}

/** Marca como leídos sólo los mensajes que casan con el predicado. */
export async function markMessagesAsReadByPredicate(
  agentName: string,
  predicate: (msg: TeammateMessage) => boolean,
  teamName?: string,
): Promise<void> {
  const inboxPath = getInboxPath(agentName, teamName)
  const lockFilePath = `${inboxPath}.lock`
  let release: (() => Promise<void>) | undefined

  try {
    release = await lock(inboxPath, {
      lockfilePath: lockFilePath,
      ...LOCK_OPTIONS,
    })

    const messages = await readMailbox(agentName, teamName)
    if (messages.length === 0) return

    const updatedMessages = messages.map(m =>
      !m.read && predicate(m) ? { ...m, read: true } : m,
    )

    await atomicWriteFile(inboxPath, jsonStringify(updatedMessages, null, 2))
  } catch (error) {
    if (getErrnoCode(error) === 'ENOENT') return
    logError(error)
  } finally {
    if (release) {
      try {
        await release()
      } catch {
        // El cerrojo puede haberse soltado ya; soltarlo dos veces no es un
        // fallo que deba propagarse.
      }
    }
  }
}

/**
 * El último mensaje directo a un PAR de este turno, como «[to X] resumen».
 *
 * Recorre hacia atrás y CORTA en el primer turno tecleado por el usuario: sin
 * ese corte, el mensaje de un turno viejo se mostraría como si acabara de
 * ocurrir. Un turno de usuario se reconoce porque su contenido es texto; los
 * resultados de herramienta llegan como lista.
 *
 * El líder y la difusión no cuentan como par: lo que esta función responde es
 * «¿le escribí a alguien en privado?».
 */
export function getLastPeerDmSummary(messages: Message[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg) continue

    if (msg.type === 'user' && typeof msg.message?.content === 'string') break
    if (msg.type !== 'assistant') continue

    const content = msg.message?.content
    if (!Array.isArray(content)) continue

    for (const block of content) {
      if (typeof block === 'string') continue
      const b = block as unknown as {
        type: string
        name?: string
        input?: Record<string, unknown>
      }
      if (
        b.type === 'tool_use' &&
        b.name === SEND_MESSAGE_TOOL_NAME &&
        typeof b.input === 'object' &&
        b.input !== null &&
        'to' in b.input &&
        typeof b.input.to === 'string' &&
        b.input.to !== '*' &&
        b.input.to.toLowerCase() !== TEAM_LEAD_NAME.toLowerCase() &&
        'message' in b.input &&
        typeof b.input.message === 'string'
      ) {
        const to = b.input.to
        const summary =
          'summary' in b.input && typeof b.input.summary === 'string'
            ? b.input.summary
            : b.input.message.slice(0, 80)
        return `[to ${to}] ${summary}`
      }
    }
  }
  return undefined
}
