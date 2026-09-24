/**
 * Adaptadores entre el modelo del bucle y el de `AgentCore`.
 *
 * Los dos modelos se conservan separados: `AgentMessage` (`internalTypes.ts`)
 * es anidado —el cuerpo del API vive bajo `message`— y `CoreMessage`
 * (`coreMessages.ts`) es plano —`content`, `usage`, `stop_reason` y `model`
 * en la raiz—. Hasta aqui la frontera era un cast (`ccnmt:
 * packages/agent/createDeps.ts:444-450`) y el core compensaba leyendo las dos
 * formas; estos adaptadores convierten de verdad en las dos direcciones.
 *
 * El viaje de ida y vuelta conserva la identidad: `fromCoreMessages(event.after)`
 * devuelve al bucle los mismos objetos que entraron, porque cada mensaje plano
 * recuerda su original en un `WeakMap`. Un mensaje que el core crea o copia no
 * tiene original registrado; para el, el cuerpo anidado se reconstruye desde
 * los campos planos mas el cuerpo original que la copia arrastra en una clave
 * de simbolo, asi que lo que el core no conoce (el `id` del mensaje, los
 * campos propios del bucle) sobrevive a la copia.
 */
import type { AgentMessage, AgentMessageBody } from './internalTypes.ts'
import type {
  CoreContentBlock,
  CoreMessage,
  Usage,
} from './coreMessages.ts'
export { isCoreMessage } from './coreMessages.ts'

const ORIGINALS = new WeakMap<CoreMessage, AgentMessage>()
/** El cuerpo anidado original, arrastrado por las copias que el core hace con spread. */
const ORIGINAL_BODY: unique symbol = Symbol('originalBody')
/** El tipo del bucle de un mensaje que cruzo como system porque el core no lo modela. */
const ORIGINAL_TYPE: unique symbol = Symbol('originalType')
/** Los campos que el core lleva en la raiz y el bucle bajo `message`. */
const BODY_FIELDS = ['role', 'content', 'usage', 'stop_reason', 'model'] as const

type Carried = { [ORIGINAL_BODY]?: AgentMessageBody; [ORIGINAL_TYPE]?: string }

function toEpochMs(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return undefined
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? undefined : ms
}

function toIso(value: unknown): unknown {
  return typeof value === 'number' ? new Date(value).toISOString() : value
}

function asBlocks(content: unknown): CoreContentBlock[] {
  if (Array.isArray(content)) return content as CoreContentBlock[]
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  return []
}

/** Los campos del bucle que no son cuerpo: viajan tal cual en la raiz plana. */
function ownFields(message: AgentMessage): Record<string, unknown> {
  const { message: _body, type: _type, uuid: _uuid, timestamp: _ts, ...rest } = message
  return rest
}

export function toCoreMessage(message: AgentMessage): CoreMessage {
  const body = message.message
  const uuid = message.uuid ?? crypto.randomUUID()
  const timestamp = toEpochMs(message.timestamp)
  const carried: Carried = body ? { [ORIGINAL_BODY]: body } : {}
  let core: CoreMessage
  if (message.type === 'user') {
    const content = body?.content
    core = {
      ...ownFields(message),
      ...carried,
      type: 'user',
      uuid,
      role: 'user',
      content: typeof content === 'string' ? content : asBlocks(content),
      timestamp,
    }
  } else if (message.type === 'assistant') {
    core = {
      ...ownFields(message),
      ...carried,
      type: 'assistant',
      uuid,
      role: 'assistant',
      content: asBlocks(body?.content),
      model: typeof body?.model === 'string' ? body.model : undefined,
      usage: body?.usage as Usage | undefined,
      stop_reason: body?.stop_reason as string | null | undefined,
      timestamp,
    }
  } else {
    // El core solo modela user, assistant y system. Cualquier otro tipo
    // (attachment, progress…) cruza como system y deja su tipo en `subtype`;
    // el core lo trata como un mensaje que no es de asistente, que es lo que
    // hacia al leerlo por cast.
    const foreign = message.type !== 'system'
    const subtype = foreign ? message.type : message.subtype
    const content = message.content
    core = {
      ...ownFields(message),
      ...carried,
      ...(foreign ? { [ORIGINAL_TYPE]: message.type } : {}),
      type: 'system',
      uuid,
      content: typeof content === 'string' || Array.isArray(content)
        ? (content as string | CoreContentBlock[])
        : undefined,
      subtype: typeof subtype === 'string' ? subtype : undefined,
      timestamp,
    }
  }
  ORIGINALS.set(core, message)
  return core
}

export function fromCoreMessage(core: CoreMessage): AgentMessage {
  const original = ORIGINALS.get(core)
  if (original) return original

  const flat = core as CoreMessage & Carried & Record<string, unknown>
  const carriedBody = flat[ORIGINAL_BODY]
  const carriedType = flat[ORIGINAL_TYPE]
  const rest: Record<string, unknown> = { ...flat }
  for (const field of BODY_FIELDS) delete rest[field]
  delete rest.timestamp
  delete (rest as Carried)[ORIGINAL_BODY]
  delete (rest as Carried)[ORIGINAL_TYPE]

  if (core.type === 'system') {
    // Un tipo del bucle que cruzo como system recupera su tipo; su `subtype`
    // lo puso el adaptador, no el mensaje, y no vuelve.
    if (carriedType !== undefined) {
      delete rest.subtype
      return { ...rest, type: carriedType, timestamp: toIso(core.timestamp) }
    }
    return { ...rest, type: 'system', content: core.content, timestamp: toIso(core.timestamp) }
  }

  const body: AgentMessageBody = { ...(carriedBody ?? {}) }
  for (const field of BODY_FIELDS) {
    if (flat[field] !== undefined) body[field] = flat[field]
  }
  return { ...rest, type: core.type, message: body, timestamp: toIso(core.timestamp) }
}

/** Un mensaje del bucle que el provider emite como evento (`assistant`, `system`). */
export function isAgentMessageEvent(value: { type: string }): value is AgentMessage {
  return value.type === 'assistant' || value.type === 'system'
}

export function toCoreMessages(messages: readonly AgentMessage[]): CoreMessage[] {
  return messages.map(toCoreMessage)
}

export function fromCoreMessages(messages: readonly CoreMessage[]): AgentMessage[] {
  return messages.map(fromCoreMessage)
}
