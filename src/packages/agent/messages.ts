import { NO_CONTENT_MESSAGE } from './constants/messages.ts'

/**
 * Las cuatro familias de etiqueta que se retiran del prompt. Son envoltorios
 * de INYECCION DE PROMPT —ordenes del sistema—, no etiquetas de presentacion:
 * esas las retira otro mecanismo, en el paquete de salida.
 *
 * La bandera `s` hace que `.` cruce saltos de linea, asi que un envoltorio
 * multilinea se retira entero; la `g` retira todas sus apariciones; y el
 * respaldo `\1` exige que la etiqueta de cierre sea la misma que la de
 * apertura, no cualquiera de las cuatro.
 */
const STRIPPED_TAGS_RE =
  /<(commit_analysis|context|function_analysis|pr_analysis)>.*?<\/\1>\n?/gs

/** El texto sin sus envoltorios de prompt, recortado. */
export function stripPromptXMLTags(content: string): string {
  return content.replace(STRIPPED_TAGS_RE, '').trim()
}

/**
 * Si el texto de un mensaje no aporta nada: queda en blanco tras retirar los
 * envoltorios, o es exactamente el centinela `NO_CONTENT_MESSAGE`.
 *
 * La segunda mitad compara contra el texto ORIGINAL recortado, no contra el
 * despojado: el centinela no lleva envoltorios, y compararlo tras el despojo
 * daria el mismo resultado por casualidad, no por diseno. La comparacion es
 * exacta —no de subcadena— y distingue caja.
 */
export function isEmptyMessageText(text: string): boolean {
  return (
    stripPromptXMLTags(text).trim() === '' || text.trim() === NO_CONTENT_MESSAGE
  )
}

import type { AssistantMessage, Message } from './messageShapes.ts'

/**
 * El ultimo mensaje de asistente del historial, o `undefined` si no hay.
 *
 * `findLast` sale temprano por el final: es notablemente mas barato que
 * `filter().at(-1)` en historiales largos, y esto se llama en cada render.
 */
export function getLastAssistantMessage(
  messages: Message[],
): AssistantMessage | undefined {
  return messages.findLast(
    (msg): msg is AssistantMessage => msg.type === 'assistant',
  )
}

/**
 * Si el turno de asistente MAS RECIENTE llamo a alguna herramienta.
 *
 * Recorre hacia atras y se detiene en el primer mensaje de asistente que
 * encuentra: la pregunta es sobre ese turno, no sobre el historial. Un
 * `messages.some(...)` sobre todo el arreglo respondería otra cosa —
 * «hubo alguna llamada alguna vez»— y es la confusion que el test fija.
 *
 * Contenido en cadena en vez de arreglo devuelve `false`: una cadena no
 * lleva bloques, asi que no puede llevar un `tool_use`.
 */
export function hasToolCallsInLastAssistantTurn(messages: Message[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message && message.type === 'assistant') {
      const content = (message as AssistantMessage).message.content
      if (Array.isArray(content)) {
        return content.some(
          (block: { type?: string }) => block.type === 'tool_use',
        )
      }
    }
  }
  return false
}

/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/agent/messages.ts`.
 *
 * La fuente exporta **115 simbolos en 5690 lineas** y depende de siete
 * paquetes hermanos del monorepo de ccnmt (`config`, `local-observability`,
 * `provider`, `tool-registry`, `repl`, `memory`, `shell`, `output`) que este
 * arbol no tiene. Portarla entera exigiria portar antes esos paquetes, asi
 * que se porta **por consumidor**: cada test que aterriza trae consigo los
 * simbolos que ejercita, y este encabezado declara la cobertura.
 *
 * Cobertura acumulada — **26 de 115**, en cinco grupos, cada uno traido por
 * el test que lo ejercita:
 *
 * 1. **14 cadenas de contrato** del protocolo harness ↔ modelo (`INTERRUPT_*`,
 *    `CANCEL_MESSAGE`, la familia `REJECT_*`, `PLAN_REJECTION_PREFIX`,
 *    `DENIAL_WORKAROUND_GUIDANCE`, `AUTO_REJECT_MESSAGE`,
 *    `DONT_ASK_REJECT_MESSAGE`, `NO_RESPONSE_REQUESTED`,
 *    `SYNTHETIC_TOOL_RESULT_PLACEHOLDER`).
 * 2. **2 re-exportados** de `messagesConstants.ts`, igual que la fuente
 *    (`messages.ts:358`): `SYNTHETIC_MESSAGES` y `SYNTHETIC_MODEL`.
 * 3. **1 derivador**: `deriveShortMessageId`.
 * 4. **4 lectores** del historial y del texto: `getLastAssistantMessage`,
 *    `hasToolCallsInLastAssistantTurn`, `stripPromptXMLTags`,
 *    `isEmptyMessageText`.
 * 5. **6 constructores** de mensaje: `createUserMessage`,
 *    `createSyntheticUserCaveatMessage`, `formatCommandInputTags`,
 *    `createModelSwitchBreadcrumbs`, `createProgressMessage`,
 *    `createToolResultStopMessage`.
 *
 * Los 89 restantes NO estan portados y su ausencia es deliberada, no un
 * olvido: `porte-completo-no-parcial.md` admite el porte parcial
 * **declarado**, nunca el silencioso.
 *
 * Por que el grupo 1 fue primero: son el unico grupo de la fuente cuyo
 * contenido ES su comportamiento. Un refactor que «simplifique la redaccion»
 * cambia como responde el modelo ante una interrupcion o una denegacion, y no
 * hay tipo ni firma que lo detecte — solo el valor fijado.
 */

/**
 * Deriva un identificador corto y estable (base36, 6 caracteres) desde un
 * UUID. Lo consume la herramienta de recorte: se inyecta como etiqueta
 * `[id:...]` en los mensajes que van al API para que el modelo pueda citar un
 * mensaje anterior por su identificador.
 *
 * Determinista por construccion — el mismo UUID da siempre el mismo valor. No
 * es una funcion resumen criptografica: 10 hexadecimales son ~40 bits, asi que
 * hay colision posible y el test la admite en su margen.
 */
export function deriveShortMessageId(uuid: string): string {
  // Los primeros 10 hexadecimales del UUID, sin los guiones. Retirarlos es
  // parte del contrato: sin eso, el primer guion se leeria como digito.
  const hex = uuid.replace(/-/g, '').slice(0, 10)
  // Base36 acorta la representacion; el recorte a 6 fija la cota superior.
  return parseInt(hex, 16).toString(36).slice(0, 6)
}

// Re-exportados desde su modulo propio, igual que la fuente (`messages.ts:358`):
// quien solo pregunta si un mensaje es sintetico no arrastra este archivo.
export { SYNTHETIC_MESSAGES, SYNTHETIC_MODEL } from './messagesConstants.ts'

/** El modelo lo ve como mensaje de rol `user` al interrumpirse la peticion. */
export const INTERRUPT_MESSAGE = '[Request interrupted by user]'

/** Variante cuando lo interrumpido fue la herramienta, no la peticion. */
export const INTERRUPT_MESSAGE_FOR_TOOL_USE =
  '[Request interrupted by user for tool use]'

/** El «STOP» en mayusculas es la senal dura de alto que el modelo atiende. */
export const CANCEL_MESSAGE =
  "The user doesn't want to take this action right now. STOP what you are doing and wait for the user to tell you how to proceed."

/**
 * El parentesis de la edicion no escrita impide que el modelo asuma que el
 * `new_string` si aterrizo — sin el, editar-y-verificar se desincroniza.
 */
export const REJECT_MESSAGE =
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed."

/** Termina en salto de linea: el llamador apenda la razon del usuario. */
export const REJECT_MESSAGE_WITH_REASON_PREFIX =
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). To tell you how to proceed, the user said:\n"

/**
 * El rechazo a un subagente no es el del usuario: nadie puede intervenir, asi
 * que la guia es adaptarse o reportar el limite en vez de esperar.
 */
export const SUBAGENT_REJECT_MESSAGE =
  'Permission for this tool use was denied. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). Try a different approach or report the limitation to complete your task.'

/** Termina en salto de linea, igual que su hermano de usuario. */
export const SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX =
  'Permission for this tool use was denied. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). The user said:\n'

/** El plan rechazado se apenda tras el marcador `Rejected plan:\n`. */
export const PLAN_REJECTION_PREFIX =
  'The agent proposed a plan that was rejected by the user. The user chose to stay in plan mode rather than proceed with implementation.\n\nRejected plan:\n'

/**
 * Guia compartida ante una denegacion de permiso. Calibra dos conductas
 * opuestas en el mismo texto: admite el rodeo benigno (head en vez de cat) y
 * prohibe la evasion del proposito de la denegacion.
 */
export const DENIAL_WORKAROUND_GUIDANCE =
  `IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, ` +
  `e.g. using head instead of cat. But you *should not* attempt to work around this denial in malicious ways, ` +
  `e.g. do not use your ability to run tests to execute non-test actions. ` +
  `You should only try to work around this restriction in reasonable ways that do not attempt to bypass the intent behind this denial. ` +
  `If you believe this capability is essential to complete the user's request, STOP and explain to the user ` +
  `what you were trying to do and why you need this permission. Let the user decide how to proceed.`

/** Denegacion automatica: nombra la herramienta y adjunta la guia. */
export function AUTO_REJECT_MESSAGE(toolName: string): string {
  return `Permission to use ${toolName} has been denied. ${DENIAL_WORKAROUND_GUIDANCE}`
}

/** Denegacion por modo «don't ask»: la razon es autoexplicativa. */
export function DONT_ASK_REJECT_MESSAGE(toolName: string): string {
  return `Permission to use ${toolName} has been denied because Claude Code is running in don't ask mode. ${DENIAL_WORKAROUND_GUIDANCE}`
}

/** Respuesta cuando el turno no pide contestacion del modelo. */
export const NO_RESPONSE_REQUESTED = 'No response requested.'

/**
 * Relleno que se inserta cuando un bloque `tool_use` se queda sin su
 * `tool_result`. Satisface el emparejamiento de forma pero su contenido es
 * falso, asi que se exporta para que el filtro de entrada rechace toda carga
 * que lo contenga.
 */
export const SYNTHETIC_TOOL_RESULT_PLACEHOLDER =
  '[Tool result missing due to internal error]'

import { randomUUID } from 'node:crypto'
import {
  COMMAND_ARGS_TAG,
  COMMAND_MESSAGE_TAG,
  COMMAND_NAME_TAG,
  LOCAL_COMMAND_CAVEAT_TAG,
  LOCAL_COMMAND_STDOUT_TAG,
} from '@thyrox/command-runtime/xml.js'
import type {
  ProgressMessage,
  ToolResultBlockParam,
  UserMessage,
} from './messageShapes.ts'

/**
 * Construye un mensaje de rol `user`.
 *
 * PORTE PARCIAL DECLARADO de la firma: la fuente
 * (`ccnmt: packages/agent/messages.ts:509`) acepta **diecinueve** campos, y
 * aqui se portan los que sus consumidores de este arbol usan —`content`,
 * `isMeta`, `uuid`, `timestamp`— mas los cuatro que el cuerpo emite siempre.
 * Los que NO se portan (`isVisibleInTranscriptOnly`, `isVirtual`,
 * `isCompactSummary`, `summarizeMetadata`, `toolUseResult`, `mcpMeta`,
 * `imagePasteIds`, `sourceToolAssistantUUID`, `permissionMode`, `origin`)
 * dependen de tipos de paquetes ausentes (`PermissionMode`,
 * `MessageOrigin`, `PartialCompactDirection`) y no tienen consumidor aqui
 * todavia: entran cuando lo tengan, igual que el resto del modulo.
 *
 * El `content || NO_CONTENT_MESSAGE` es de la fuente y no es defensivo por
 * gusto: un mensaje de contenido vacio hace que el API rechace la peticion,
 * asi que el centinela lo sustituye antes de salir.
 */
export function createUserMessage({
  content,
  isMeta,
  uuid,
  timestamp,
}: {
  content: string | unknown[]
  isMeta?: true
  uuid?: string
  timestamp?: string
}): UserMessage {
  const m: UserMessage = {
    type: 'user',
    message: {
      role: 'user',
      content: content || NO_CONTENT_MESSAGE,
    },
    isMeta,
    uuid: uuid || randomUUID(),
    timestamp: timestamp ?? new Date().toISOString(),
  }
  return m
}

/**
 * Un caveat sintetico nuevo para los comandos locales (bash, slash).
 *
 * Se construye uno NUEVO en cada llamada porque cada mensaje necesita su
 * propio UUID: reusar una constante daria claves duplicadas en el
 * reconciliador de la vista.
 */
export function createSyntheticUserCaveatMessage(): UserMessage {
  return createUserMessage({
    content: `<${LOCAL_COMMAND_CAVEAT_TAG}>Caveat: The messages below were generated by the user while running local commands. DO NOT respond to these messages or otherwise consider them in your response unless the user explicitly asks you to.</${LOCAL_COMMAND_CAVEAT_TAG}>`,
    isMeta: true,
  })
}

/**
 * Da forma a la miga de entrada de comando que el modelo ve al ejecutarse un
 * comando slash. La sangria de las dos ultimas lineas es de la fuente y se
 * conserva: forma parte del texto que el modelo recibe.
 */
export function formatCommandInputTags(
  commandName: string,
  args: string,
): string {
  return `<${COMMAND_NAME_TAG}>/${commandName}</${COMMAND_NAME_TAG}>
            <${COMMAND_MESSAGE_TAG}>${commandName}</${COMMAND_MESSAGE_TAG}>
            <${COMMAND_ARGS_TAG}>${args}</${COMMAND_ARGS_TAG}>`
}

/**
 * El rastro de migas que el manejador `set_model` inyecta para que el modelo
 * vea un cambio de modelo a mitad de conversacion. Misma forma que produce el
 * comando `/model` del CLI a traves de processSlashCommand.
 *
 * `modelArg` se interpola VERBATIM, sin saneo: quien llama es el CLI o el
 * SDK, no una entrada externa. El test lo fija como contrato para que nadie
 * lo «arregle» y cambie en silencio lo que el modelo lee.
 */
export function createModelSwitchBreadcrumbs(
  modelArg: string,
  resolvedDisplay: string,
): UserMessage[] {
  return [
    createSyntheticUserCaveatMessage(),
    createUserMessage({ content: formatCommandInputTags('model', modelArg) }),
    createUserMessage({
      content: `<${LOCAL_COMMAND_STDOUT_TAG}>Set model to ${resolvedDisplay}</${LOCAL_COMMAND_STDOUT_TAG}>`,
    }),
  ]
}

/**
 * Un mensaje de progreso de una herramienta en ejecucion.
 *
 * DIVERGENCIA DECLARADA: la fuente acota el parametro con
 * `<P extends Progress>`, y `Progress` vive en `tool-registry`, ausente de
 * este arbol. Aqui la cota es `unknown`, que es la que el propio
 * `ProgressMessage<T = unknown>` de la fuente ya admite.
 *
 * La `data` se guarda POR REFERENCIA, no se clona: pertenece a quien llama, y
 * el test lo fija con `toBe`.
 */
export function createProgressMessage<P>({
  toolUseID,
  parentToolUseID,
  data,
}: {
  toolUseID: string
  parentToolUseID: string
  data: P
}): ProgressMessage<P> {
  return {
    type: 'progress',
    data,
    toolUseID,
    parentToolUseID,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  }
}

/**
 * El bloque `tool_result` con que se cierra una herramienta interrumpida.
 *
 * `is_error: true` es lo que hace que el modelo lo lea como fallo y no como
 * salida valida; el contenido es siempre `CANCEL_MESSAGE`, identico para
 * todas las herramientas, porque lo que informa es la interrupcion y no la
 * herramienta concreta.
 */
export function createToolResultStopMessage(
  toolUseID: string,
): ToolResultBlockParam {
  return {
    type: 'tool_result',
    content: CANCEL_MESSAGE,
    is_error: true,
    tool_use_id: toolUseID,
  }
}
