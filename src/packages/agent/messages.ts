import { NO_CONTENT_MESSAGE } from './constants/messages.ts'
import { SYNTHETIC_MESSAGES } from './messagesConstants.ts'

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
 * Cobertura acumulada — **41 de 115**, en nueve grupos, cada uno traido por
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
 * 6. **8 ayudantes puros** traidos por `messagesPureHelpers.test.ts`:
 *    `deriveUUID`, `extractTag`, `isNotEmptyMessage`, `isClassifierDenial`,
 *    `buildYoloRejectionMessage`, `buildClassifierUnavailableMessage`,
 *    `isToolUseRequestMessage`, `isToolUseResultMessage`. Trae consigo el
 *    tipo `ContentBlockParam` (bloque de contenido generico, divergencia
 *    declarada del `ContentBlockParam` del SDK de Anthropic) y dos
 *    ayudantes internos no exportados (`escapeRegExp`,
 *    `AUTO_MODE_REJECTION_PREFIX`).
 * 7. **4 ayudantes de texto** traidos por `contentTextHelpers.test.ts`:
 *    `extractTextContent`, `getContentText`, `getUserMessageText`,
 *    `textForResubmit`. Trae consigo `stripIdeContextTags` (interno, no
 *    exportado — divergencia declarada del
 *    `@claude-code-how-works/output/utils/displayTags.js` de la fuente,
 *    reproducido verbatim) y reusa `ContentBlockParam` del grupo 6.
 * 8. **2 resolvedores de tool_use_id** traidos por
 *    `getToolUseIDPure.test.ts`: `getToolUseID`, `getToolResultIDs`. Trae
 *    consigo los tipos `NormalizedMessage` (alias de `Message`, igual que
 *    la fuente) y `ToolUseBlock` (divergencia declarada, forma estructural
 *    minima del SDK de Anthropic). DIVERGENCIA DE ALCANCE en
 *    `getToolUseID`: omite la rama `attachment` de la fuente (depende de
 *    `isHookAttachmentMessage`, ausente aqui) — sin consumidor en los
 *    tests portados, cae al `default: return null`.
 * 9. **1 detector** traido por `isSyntheticMessage.test.ts`:
 *    `isSyntheticMessage`. Reusa `SYNTHETIC_MESSAGES` del grupo 2 —esta
 *    vez importado en binding local ademas de re-exportado, igual que la
 *    fuente (`messages.ts:142` y `:358`)— y `ContentBlockParam` del
 *    grupo 6.
 *
 * Los 74 restantes NO estan portados y su ausencia es deliberada, no un
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

/**
 * Si `message` es uno de los `SYNTHETIC_MESSAGES` canonicos: no un
 * `progress`/`attachment`/`system` (esos retornan temprano), con
 * contenido en ARREGLO cuyo primer bloque es de texto, y ese texto
 * coincide EXACTO (sin trim, sensible a caja) con alguna de las cadenas
 * del conjunto. Solo se revisa el primer bloque, sin importar el rol del
 * mensaje — un asistente puede llevar el marcador igual que un usuario.
 */
export function isSyntheticMessage(message: Message): boolean {
  const content = message.message?.content
  return (
    message.type !== 'progress' &&
    message.type !== 'attachment' &&
    message.type !== 'system' &&
    Array.isArray(content) &&
    (content as ContentBlockParam[])[0]?.type === 'text' &&
    SYNTHETIC_MESSAGES.has(
      ((content as ContentBlockParam[])[0] as { text: string }).text,
    )
  )
}

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

import { randomUUID, type UUID } from 'node:crypto'
import {
  COMMAND_ARGS_TAG,
  COMMAND_MESSAGE_TAG,
  COMMAND_NAME_TAG,
  LOCAL_COMMAND_CAVEAT_TAG,
  LOCAL_COMMAND_STDOUT_TAG,
} from '@thyrox/command-runtime/xml.js'
import type {
  NormalizedMessage,
  ProgressMessage,
  ToolResultBlockParam,
  ToolUseBlock,
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

/**
 * Deriva un UUID hijo determinista a partir de un UUID padre y un indice.
 * Preserva los primeros 24 caracteres del padre (los tres primeros grupos
 * mas el guion que abre el cuarto) y sustituye el ultimo segmento de 12
 * hex por el indice en base16, relleno con ceros a la izquierda. Lo usa
 * `normalizeMessages` (no portado) para dar una clave estable a cada bloque
 * cuando un mensaje con varios bloques se separa en varios mensajes.
 */
export function deriveUUID(parentUUID: UUID, index: number): UUID {
  const hex = index.toString(16).padStart(12, '0')
  return `${parentUUID.slice(0, 24)}${hex}` as UUID
}

/**
 * Escapa los caracteres especiales de una expresion regular.
 *
 * DIVERGENCIA DECLARADA: la fuente la importa de
 * `@claude-code-how-works/output/utils/stringUtils.js`, ausente de este
 * arbol. La forma es la estandar (MDN `RegExp` guide).
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extrae el contenido de la PRIMERA etiqueta `<tagName>...</tagName>` de
 * `html` que este en profundidad de anidamiento cero, contando aperturas y
 * cierres anteriores del mismo nombre en el texto que precede a la
 * coincidencia.
 *
 * LIMITACIONES documentadas y conservadas de la fuente — no arregladas
 * aqui, porque ninguna de las dos aplica a los usos reales
 * (`<bash-input>`, `<command-name>`, que nunca llevan atributos ni se
 * anidan consigo mismos): no distingue anidamiento del MISMO nombre de
 * etiqueta (colapsa al primer cierre), y un `>` o `</tag>` crudo dentro de
 * un atributo entre comillas rompe el analisis.
 */
export function extractTag(html: string, tagName: string): string | null {
  if (!html.trim() || !tagName.trim()) {
    return null
  }

  const escapedTag = escapeRegExp(tagName)

  // Patron que admite etiquetas autocerradas implicitamente (no matchean),
  // etiquetas con atributos, anidamiento del mismo tipo, y contenido
  // multilinea.
  const pattern = new RegExp(
    `<${escapedTag}(?:\\s+[^>]*)?>` + // apertura con atributos opcionales
      '([\\s\\S]*?)' + // contenido (coincidencia no-codiciosa)
      `<\\/${escapedTag}>`, // cierre
    'gi',
  )

  let match: RegExpExecArray | null
  let depth = 0
  let lastIndex = 0
  const openingTag = new RegExp(`<${escapedTag}(?:\\s+[^>]*?)?>`, 'gi')
  const closingTag = new RegExp(`<\\/${escapedTag}>`, 'gi')

  while ((match = pattern.exec(html)) !== null) {
    const content = match[1]
    const beforeMatch = html.slice(lastIndex, match.index)

    depth = 0

    openingTag.lastIndex = 0
    while (openingTag.exec(beforeMatch) !== null) {
      depth++
    }

    closingTag.lastIndex = 0
    while (closingTag.exec(beforeMatch) !== null) {
      depth--
    }

    // Solo se incluye el contenido si estamos en el nivel de anidamiento
    // correcto.
    if (depth === 0 && content) {
      return content
    }

    lastIndex = match.index + match[0].length
  }

  return null
}

/**
 * Un bloque de contenido generico — texto, imagen, tool_use, tool_result u
 * otro.
 *
 * DIVERGENCIA DECLARADA: la fuente tipa esto con `ContentBlockParam` del
 * SDK de Anthropic (`@anthropic-ai/sdk`), ausente de este arbol. Se declara
 * aqui la forma estructural minima —el discriminante `type`, el `text`
 * opcional que consumen los ayudantes de texto, y un indice para el resto
 * de campos— en vez de arrastrar el SDK entero por un tipo.
 */
export type ContentBlockParam = {
  type: string
  text?: string
  [key: string]: unknown
}

/**
 * Verdadero si `message` TIENE contenido — lo contrario del centinela de
 * vacio que usa la persistencia al transcript. `progress`/`attachment`/
 * `system` se consideran siempre no-vacios; un mensaje multi-bloque
 * tambien, por guarda deliberada (el analisis bloque-a-bloque se pospone,
 * ver el comentario `// Skip multi-block messages for now` de la fuente).
 * El unico caso "vacio" es un unico bloque de texto en blanco, o igual al
 * centinela `NO_CONTENT_MESSAGE` o a `INTERRUPT_MESSAGE_FOR_TOOL_USE`.
 */
export function isNotEmptyMessage(message: Message): boolean {
  if (
    message.type === 'progress' ||
    message.type === 'attachment' ||
    message.type === 'system'
  ) {
    return true
  }

  const content = message.message?.content
  if (typeof content === 'string') {
    return content.trim().length > 0
  }

  const blocks = content as ContentBlockParam[]
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return false
  }

  // Se omiten los mensajes multi-bloque por ahora.
  if (blocks.length > 1) {
    return true
  }

  const first = blocks[0]!
  if (first.type !== 'text') {
    return true
  }

  const text = first.text ?? ''
  return (
    text.trim().length > 0 &&
    text !== NO_CONTENT_MESSAGE &&
    text !== INTERRUPT_MESSAGE_FOR_TOOL_USE
  )
}

/** El prefijo con que la interfaz reconoce un rechazo del clasificador de auto-modo. */
const AUTO_MODE_REJECTION_PREFIX =
  'Permission for this action has been denied. Reason: '

/**
 * Si `content` es la salida de una denegacion del clasificador de
 * auto-modo. Lo usa la interfaz para renderizar un resumen corto en vez
 * del mensaje completo.
 */
export function isClassifierDenial(content: string): boolean {
  return content.startsWith(AUTO_MODE_REJECTION_PREFIX)
}

/**
 * Construye el mensaje de rechazo del clasificador de auto-modo.
 *
 * DIVERGENCIA DECLARADA: la fuente bifurca `ruleHint` con
 * `feature('BASH_CLASSIFIER')` (`bun:bundle`, ausente de este arbol). Las
 * dos ramas mencionan «permission rule» y «Bash» por igual, que es todo lo
 * que el contrato exige — se colapsa a la rama de la bandera apagada.
 */
export function buildYoloRejectionMessage(reason: string): string {
  const ruleHint =
    'To allow this type of action in the future, the user can add a Bash permission rule to their settings.'

  return (
    `${AUTO_MODE_REJECTION_PREFIX}${reason}. ` +
    `If you have other tasks that don't depend on this action, continue working on those. ` +
    `${DENIAL_WORKAROUND_GUIDANCE} ` +
    ruleHint
  )
}

/**
 * Mensaje para cuando el clasificador de auto-modo esta temporalmente no
 * disponible. Dice al agente que espere y reintente, y sugiere trabajar en
 * otras tareas mientras tanto.
 */
export function buildClassifierUnavailableMessage(
  toolName: string,
  classifierModel: string,
): string {
  return (
    `${classifierModel} is temporarily unavailable, so auto mode cannot determine the safety of ${toolName} right now. ` +
    `Wait briefly and then try this action again. ` +
    `If it keeps failing, continue with other tasks that don't require this action and come back to it later. ` +
    `Note: reading files, searching code, and other read-only operations do not require the classifier and can still be used.`
  )
}

/** Verdadero si `message` es un turno de asistente que pide usar una herramienta. */
export function isToolUseRequestMessage(
  message: Message,
): message is AssistantMessage {
  const content = message.message?.content
  return (
    message.type === 'assistant' &&
    Array.isArray(content) &&
    (content as ContentBlockParam[]).some(b => b.type === 'tool_use')
  )
}

/** Verdadero si `message` es el resultado de una herramienta previamente pedida. */
export function isToolUseResultMessage(
  message: Message,
): message is UserMessage {
  const content = message.message?.content
  return (
    message.type === 'user' &&
    ((Array.isArray(content) &&
      (content as ContentBlockParam[])[0]?.type === 'tool_result') ||
      Boolean(message.toolUseResult))
  )
}

/**
 * Extrae texto de un arreglo de bloques de contenido, uniendo los bloques
 * de texto con el separador dado. Funciona con `ContentBlockParam` y
 * cualquier variante de solo lectura via tipado estructural.
 */
export function extractTextContent(
  blocks: readonly { readonly type: string; readonly [key: string]: unknown }[],
  separator = '',
): string {
  return blocks
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map(b => b.text)
    .join(separator)
}

/**
 * `content` como texto plano: una cadena se devuelve verbatim (SIN
 * `trim()` — solo la rama de arreglo lo recorta); un arreglo se une con
 * salto de linea y se recorta, devolviendo `null` si queda vacio;
 * cualquier otra cosa es `null`.
 */
export function getContentText(
  content: string | ReadonlyArray<ContentBlockParam>,
): string | null {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return extractTextContent(content, '\n').trim() || null
  }
  return null
}

/** El texto plano de un mensaje de USUARIO, o `null` si no lo es. */
export function getUserMessageText(message: Message): string | null {
  if (message.type !== 'user') {
    return null
  }
  return getContentText(
    message.message?.content as string | ReadonlyArray<ContentBlockParam>,
  )
}

/**
 * Patron de etiquetas de contexto inyectadas por el IDE
 * (`ide_opened_file`, `ide_selection`). Solo estas dos — a diferencia del
 * patron generico de `stripDisplayTags` de la fuente (ausente aqui) — para
 * que `<code>foo</code>` escrito por el usuario sobreviva.
 */
const IDE_CONTEXT_TAGS_PATTERN =
  /<(ide_opened_file|ide_selection)(?:\s[^>]*)?>[\s\S]*?<\/\1>\n?/g

/**
 * Retira SOLO las etiquetas de contexto inyectadas por el IDE. La usa
 * `textForResubmit` para que el reenvio con flecha-arriba preserve
 * contenido escrito por el usuario, incluido HTML en minusculas, mientras
 * descarta el ruido del IDE.
 *
 * DIVERGENCIA DECLARADA: la fuente la importa de
 * `@claude-code-how-works/output/utils/displayTags.js`, ausente de este
 * arbol. El patron y el comportamiento se reproducen aqui verbatim.
 */
function stripIdeContextTags(text: string): string {
  return text.replace(IDE_CONTEXT_TAGS_PATTERN, '').trim()
}

/**
 * El texto que el reenvio con flecha-arriba le vuelve a poner al usuario
 * en el prompt, y el modo en que se reenviaria: `bash-input` gana sobre
 * `command-name`, que gana sobre el texto llano (pasado por
 * `stripIdeContextTags`).
 */
export function textForResubmit(
  msg: UserMessage,
): { text: string; mode: 'bash' | 'prompt' } | null {
  const content = getUserMessageText(msg)
  if (content === null) return null
  const bash = extractTag(content, 'bash-input')
  if (bash) return { text: bash, mode: 'bash' }
  const cmd = extractTag(content, COMMAND_NAME_TAG)
  if (cmd) {
    const args = extractTag(content, COMMAND_ARGS_TAG) ?? ''
    return { text: `${cmd} ${args}`, mode: 'prompt' }
  }
  return { text: stripIdeContextTags(content), mode: 'prompt' }
}

/**
 * El `tool_use_id` al que pertenece `message`, segun su tipo:
 *
 * - `assistant` — el `id` del primer bloque, si es `tool_use`.
 * - `user` — `sourceToolUseID` si esta presente (gana SIEMPRE, aunque el
 *   contenido tambien lleve un `tool_result`: lo etiqueto
 *   `tagMessagesWithToolUseID`, no portada); si no, el `tool_use_id` del
 *   primer bloque, si es `tool_result`.
 * - `progress` — el campo `toolUseID`, sin resguardo (igual que la fuente:
 *   un `progress` sin el campo devuelve `undefined`, no `null`).
 * - `system` — el campo `toolUseID` SOLO si `subtype === 'informational'`;
 *   cualquier otro subtipo (`init`, `compact_boundary`, ...) da `null`
 *   aunque el campo este presente.
 *
 * DIVERGENCIA DE ALCANCE: la fuente tiene un quinto caso, `attachment`
 * (via `isHookAttachmentMessage`, ausente de este arbol). Sin consumidor
 * en los tests portados, cae al `default: return null` — mismo resultado
 * que tendria un attachment que no fuera un hook.
 */
export function getToolUseID(message: NormalizedMessage): string | null {
  switch (message.type) {
    case 'assistant': {
      const content = message.message?.content
      const first = Array.isArray(content) ? content[0] : undefined
      if (
        !first ||
        typeof first === 'string' ||
        (first as ContentBlockParam).type !== 'tool_use'
      ) {
        return null
      }
      return (first as unknown as ToolUseBlock).id
    }
    case 'user': {
      if (message.sourceToolUseID) {
        return message.sourceToolUseID as string
      }
      const content = message.message?.content
      const first = Array.isArray(content) ? content[0] : undefined
      if (
        !first ||
        typeof first === 'string' ||
        (first as ContentBlockParam).type !== 'tool_result'
      ) {
        return null
      }
      return (first as unknown as ToolResultBlockParam).tool_use_id
    }
    case 'progress':
      return message.toolUseID as string
    case 'system':
      return (message.subtype as string) === 'informational'
        ? ((message.toolUseID as string) ?? null)
        : null
    default:
      return null
  }
}

/**
 * Mapa `tool_use_id → is_error` de todo mensaje de usuario cuyo PRIMER
 * bloque sea un `tool_result`. Solo el primer bloque importa (documentado
 * en la fuente); si el mismo `tool_use_id` aparece dos veces, gana el
 * ULTIMO por la semantica de `Object.fromEntries`.
 */
export function getToolResultIDs(
  normalizedMessages: NormalizedMessage[],
): { [toolUseID: string]: boolean } {
  return Object.fromEntries(
    normalizedMessages.flatMap((m): [string, boolean][] => {
      const content = m.type === 'user' ? m.message?.content : undefined
      if (!Array.isArray(content)) return []
      const first = (content as ContentBlockParam[])[0]
      if (!first || first.type !== 'tool_result') return []
      const block = first as unknown as ToolResultBlockParam
      return [[block.tool_use_id, block.is_error ?? false]]
    }),
  )
}
