import { NO_CONTENT_MESSAGE } from './constants/messages.ts'
import { stripIdeContextTags } from '@thyrox/output/utils/displayTags.js'
import { escapeRegExp } from '@thyrox/output/utils/stringUtils.js'
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

import type { AssistantMessage, ContentItem, Message } from './messageShapes.ts'

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
 *    declarada del `ContentBlockParam` del SDK de Anthropic) y el
 *    ayudante interno `AUTO_MODE_REJECTION_PREFIX`. `escapeRegExp` ya NO
 *    se reimplementa aqui: viene de `@thyrox/output/utils/stringUtils.js`,
 *    que es de donde la fuente la toma.
 * 7. **4 ayudantes de texto** traidos por `contentTextHelpers.test.ts`:
 *    `extractTextContent`, `getContentText`, `getUserMessageText`,
 *    `textForResubmit`. `stripIdeContextTags` viene de
 *    `@thyrox/output/utils/displayTags.js` — el mismo modulo del que la
 *    fuente la toma — y reusa `ContentBlockParam` del grupo 6.
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
 * 10. **11 exportados** traidos por `normalizeMessagesForAPI.test.ts`:
 *    `normalizeMessagesForAPI`, `reorderAttachmentsForAPI`,
 *    `wrapInSystemReminder`, `wrapMessagesInSystemReminder`,
 *    `stripToolReferenceBlocksFromUserMessage`,
 *    `stripCallerFieldFromAssistantMessage`, `mergeUserMessages`,
 *    `mergeUserMessagesAndToolResults`, `mergeAssistantMessages`,
 *    `mergeUserContentBlocks` y `normalizeAttachmentForAPI` (este ultimo,
 *    porte PARCIAL declarado en su propia cabecera), mas sus ayudantes
 *    internos. Sus divergencias van en la cabecera de la seccion
 *    «Normalizacion del historial para el API», al final del archivo.
 *
 * Los restantes NO estan portados y su ausencia es deliberada, no un
 * olvido: `porte-completo-no-parcial.md` admite el porte parcial
 * **declarado**, nunca el silencioso. El conteo vigente lo publica
 * `grep -c '^export' src/packages/agent/messages.ts`, no esta prosa.
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
  SystemCompactBoundaryMessage,
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
  isVisibleInTranscriptOnly,
  isVirtual,
  isCompactSummary,
  summarizeMetadata,
  toolUseResult,
  mcpMeta,
  uuid,
  timestamp,
  imagePasteIds,
  sourceToolAssistantUUID,
  permissionMode,
  origin,
}: {
  content: string | ContentBlockParam[]
  isMeta?: true
  isVisibleInTranscriptOnly?: true
  isVirtual?: true
  isCompactSummary?: true
  /** Coincide con el tipo `Output` de la herramienta que lo produjo. */
  toolUseResult?: unknown
  /** Metadata del protocolo MCP, que se pasa al consumidor del SDK y NUNCA al modelo. */
  mcpMeta?: {
    _meta?: Record<string, unknown>
    structuredContent?: Record<string, unknown>
  }
  /**
   * La fuente lo declara `UUID | string` y castea al construir: el llamador
   * puede traer un identificador ya formado o una cadena suelta, y el tipo
   * plantilla de `node:crypto` no la admite sin el cast. Se porta la forma
   * entera —declaracion y cast— porque la mitad sola no compila.
   */
  uuid?: UUID | string
  timestamp?: string
  imagePasteIds?: number[]
  /** En un mensaje de `tool_result`: el UUID del assistant con el `tool_use` par. */
  sourceToolAssistantUUID?: UUID
  /** Modo de permiso vigente al enviarlo, para restaurar al rebobinar. */
  permissionMode?: PermissionMode
  summarizeMetadata?: {
    messagesSummarized: number
    userContext?: string
    direction?: PartialCompactDirection
  }
  /** Procedencia del mensaje. `undefined` = humano (teclado). */
  origin?: MessageOrigin
}): UserMessage {
  const m: UserMessage = {
    type: 'user',
    message: {
      role: 'user',
      // Asegura que no se envie un mensaje vacio.
      content: content || NO_CONTENT_MESSAGE,
    },
    isMeta,
    isVisibleInTranscriptOnly,
    isVirtual,
    isCompactSummary,
    summarizeMetadata,
    uuid: (uuid as UUID | undefined) || randomUUID(),
    timestamp: timestamp ?? new Date().toISOString(),
    toolUseResult,
    mcpMeta,
    imagePasteIds,
    sourceToolAssistantUUID,
    permissionMode,
    origin,
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
 * PREMISA RANCIA RETIRADA (TASK-THYROX-0233): esto era una forma estructural
 * propia, y su bloqueo declarado decia que el SDK de Anthropic estaba
 * «ausente de este arbol». Medido, es falso: `@anthropic-ai/sdk` lo declara
 * el manifiesto de este paquete (^0.124.0) y esta materializado en la raiz
 * izada del workspace. El sustituto laxo (`type: string` mas indice) no
 * unificaba con el `MessageContent` de `messageShapes`, que si toma el tipo
 * del SDK — de ahi el TS2322 al construir un `UserMessage`.
 */
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { feature } from 'bun:bundle'
import type { BetaToolUseBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { isConnectorTextBlock } from '@thyrox/provider/connectorTextTypes'
import type { SpinnerMode } from '@thyrox/repl/components/Spinner.js'
import type {
  RequestStartEvent,
  StreamEvent,
  TombstoneMessage,
} from './messageShapes.ts'
export type { ContentBlockParam }

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
  blocks: readonly { readonly type: string }[],
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

/**
 * Distingue el marcador de frontera de compactacion del resto de mensajes.
 *
 * Porte de `ccnmt: packages/agent/messages.ts:4699`, verbatim en su cuerpo.
 * Su consumidor es `storage/sessionStorage.ts`, que sin el **no carga**.
 *
 * BRECHA DECLARADA de este modulo, medida y no cerrada aqui: la fuente tiene
 * **108 exports** y este archivo **43**, o sea 66 ausentes. Completarlo arrastra
 * el subsistema de compactacion entero (`compaction/`, `QueryEngine`), que tiene
 * su propia tarea — **TASK-THYROX-0212**. Lo que se porta aqui es el unico
 * simbolo que la cadena de carga exige, no una muestra arbitraria: el criterio
 * es el import real, no el juicio.
 *
 * Metrica: nombres exportados, contando formas de declaracion y re-export.
 * Ciega a: un export por default, y a si un nombre presente en las dos listas
 * hace lo mismo en ambas — el censo compara nombres, no cuerpos.
 *
 * Refs: TASK-DOCS-0475.
 */
export function isCompactBoundaryMessage(
  message: Message | NormalizedMessage,
): message is SystemCompactBoundaryMessage {
  return message?.type === 'system' && message.subtype === 'compact_boundary'
}

// ===========================================================================
// TRAMO 1 de TASK-THYROX-0212 — la familia `create*`: 18 exports de los 66
// que faltaban, mas el unico ayudante interno que invocan.
// ===========================================================================
// El orden del porte NO es arbitrario ni por tamano: sale del grafo de
// dependencia medido entre los 66 ausentes. 42 son HOJAS —no llaman a ningun
// otro de los 66— y `create*` es la familia mas uniforme de ellas. El cubo
// con dependencia queda para los tramos siguientes, empezando por los de una
// sola arista y terminando en `normalizeMessagesForAPI`, que tiene nueve.
//
// `baseCreateAssistantMessage` es el UNICO simbolo no exportado que la
// familia necesita, medido recorriendo los 42 internos de la fuente: la
// extraccion por frontera de `export` no lo veia, y sin el las dos primeras
// funciones no compilan. Se porta con ellas y sigue sin exportarse, como en
// la fuente.
//
// La COBERTURA del archivo no se transcribe aqui: es propiedad de un artefacto
// que crece, y una cifra en prosa caduca sin que nadie toque el comentario. La
// publica el comando, comparando los dos arboles por simbolo exportado:
//
//   cuenta() { awk '/^export (type )?\{/ { l=$0; sub(/.*\{/,"",l); sub(/\}.*/,"",l)
//       n=split(l,xs,","); for(i=1;i<=n;i++){ gsub(/^[ \t]+|[ \t]+$/,"",xs[i])
//       if(xs[i]!="") print xs[i] } ; next }
//     /^export / { if ($2 ~ /^(type|const|class|interface|enum|let|function)$/) n=$3
//       else if ($2=="async"||$2=="abstract") n=$4; else next
//       gsub(/[(<:={].*/,"",n); if(n!="") print n }' "$1" | sort -u ; }
//   comm -13 <(cuenta src/packages/agent/messages.ts) \
//            <(cuenta "$CCNMT/packages/agent/messages.ts") | wc -l
//
// Metrica: simbolos EXPORTADOS por nombre, incluida la re-exportacion entre
// llaves —que un patron de `^export <palabra>` no ve y aporta dos por lado—.
// Ciega a: si el cuerpo del simbolo hace lo mismo que el de la fuente; el
// conteo mide presencia del nombre, no equivalencia de conducta.
import type { APIError } from '@anthropic-ai/sdk'
import type {
  BetaContentBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { ContentBlock } from '@anthropic-ai/sdk/resources/index.mjs'
import type { BetaUsage as Usage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { SDKAssistantMessageError } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type { PermissionMode } from './types.ts'
import { SYNTHETIC_MODEL } from './messagesConstants.ts'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { formatTokens } from '@thyrox/output/formatters'
import type {
  MessageOrigin,
  NormalizedAssistantMessage,
  PartialCompactDirection,
  StopHookInfo,
  SystemAPIErrorMessage,
  SystemAgentsKilledMessage,
  SystemApiMetricsMessage,
  SystemAwaySummaryMessage,
  SystemBridgeStatusMessage,
  SystemInformationalMessage,
  SystemLocalCommandMessage,
  SystemMemorySavedMessage,
  SystemMessageLevel,
  SystemMicrocompactBoundaryMessage,
  SystemPermissionRetryMessage,
  SystemScheduledTaskFireMessage,
  SystemStopHookSummaryMessage,
  SystemTurnDurationMessage,
  ToolUseSummaryMessage,
} from './messageShapes.ts'
function baseCreateAssistantMessage({
  content,
  isApiErrorMessage = false,
  apiError,
  error,
  errorDetails,
  isVirtual,
  usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
    service_tier: null,
    cache_creation: {
      ephemeral_1h_input_tokens: 0,
      ephemeral_5m_input_tokens: 0,
    },
    inference_geo: null,
    iterations: null, speed: null, output_tokens_details: null,
    // `fallback_credit` es REQUERIDO en `BetaUsage` del SDK 0.110.0 y la
    // fuente lo omite, porque su raiz no se lo exige. Se declara nulo, que
    // es la forma vacia que el propio tipo admite.
    fallback_credit: null,
  },
}: {
  content: BetaContentBlock[]
  isApiErrorMessage?: boolean
  apiError?: AssistantMessage['apiError']
  error?: SDKAssistantMessageError
  errorDetails?: string
  isVirtual?: true
  usage?: Usage
}): AssistantMessage {
  return {
    type: 'assistant',
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    message: {
      id: randomUUID(),
      container: null,
      model: SYNTHETIC_MODEL,
      role: 'assistant',
      stop_reason: 'stop_sequence',
      stop_sequence: '',
      type: 'message',
      usage,
      content: content as ContentBlock[],
      context_management: null,
    },
    requestId: undefined,
    apiError,
    error,
    errorDetails,
    isApiErrorMessage,
    isVirtual,
  }
}

export function createAssistantMessage({
  content,
  usage,
  isVirtual,
}: {
  content: string | BetaContentBlock[]
  usage?: Usage
  isVirtual?: true
}): AssistantMessage {
  return baseCreateAssistantMessage({
    content:
      typeof content === 'string'
        ? [
            {
              type: 'text' as const,
              text: content === '' ? NO_CONTENT_MESSAGE : content,
            } as BetaContentBlock, // NOTE: citations field is not supported in Bedrock API
          ]
        : content,
    usage,
    isVirtual,
  })
}

export function createAssistantAPIErrorMessage({
  content,
  apiError,
  error,
  errorDetails,
}: {
  content: string
  apiError?: AssistantMessage['apiError']
  error?: SDKAssistantMessageError
  errorDetails?: string
}): AssistantMessage {
  return baseCreateAssistantMessage({
    content: [
      {
        type: 'text' as const,
        text: content === '' ? NO_CONTENT_MESSAGE : content,
      } as BetaContentBlock, // NOTE: citations field is not supported in Bedrock API
    ],
    isApiErrorMessage: true,
    apiError,
    error,
    errorDetails,
  })
}

export function createUserInterruptionMessage({
  toolUse = false,
}: {
  toolUse?: boolean
}): UserMessage {
  const content = toolUse ? INTERRUPT_MESSAGE_FOR_TOOL_USE : INTERRUPT_MESSAGE

  return createUserMessage({
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
  })
}

/**
 * Creates a new synthetic user caveat message for local commands (eg. bash, slash).
 * We need to create a new message each time because messages must have unique uuids.
 */

export function createSystemMessage(
  content: string,
  level: SystemMessageLevel,
  toolUseID?: string,
  preventContinuation?: boolean,
): SystemInformationalMessage {
  return {
    type: 'system',
    subtype: 'informational',
    content,
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    toolUseID,
    level,
    ...(preventContinuation && { preventContinuation }),
  }
}

export function createPermissionRetryMessage(
  commands: string[],
): SystemPermissionRetryMessage {
  return {
    type: 'system',
    subtype: 'permission_retry',
    content: `Allowed ${commands.join(', ')}`,
    commands,
    level: 'info',
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
  }
}

export function createBridgeStatusMessage(
  url: string,
  upgradeNudge?: string,
): SystemBridgeStatusMessage {
  return {
    type: 'system',
    subtype: 'bridge_status',
    content: `/remote-control is active. Code in CLI or at ${url}`,
    url,
    upgradeNudge,
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
  }
}

export function createScheduledTaskFireMessage(
  content: string,
): SystemScheduledTaskFireMessage {
  return {
    type: 'system',
    subtype: 'scheduled_task_fire',
    content,
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
  }
}

export function createStopHookSummaryMessage(
  hookCount: number,
  hookInfos: StopHookInfo[],
  hookErrors: string[],
  preventedContinuation: boolean,
  stopReason: string | undefined,
  hasOutput: boolean,
  level: SystemMessageLevel,
  toolUseID?: string,
  hookLabel?: string,
  totalDurationMs?: number,
): SystemStopHookSummaryMessage {
  return {
    type: 'system',
    subtype: 'stop_hook_summary',
    hookCount,
    hookInfos,
    hookErrors,
    preventedContinuation,
    stopReason,
    hasOutput,
    level,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    toolUseID,
    hookLabel,
    totalDurationMs,
  }
}

export function createTurnDurationMessage(
  durationMs: number,
  budget?: { tokens: number; limit: number; nudges: number },
  messageCount?: number,
): SystemTurnDurationMessage {
  return {
    type: 'system',
    subtype: 'turn_duration',
    durationMs,
    budgetTokens: budget?.tokens,
    budgetLimit: budget?.limit,
    budgetNudges: budget?.nudges,
    messageCount,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    isMeta: false,
  }
}

export function createAwaySummaryMessage(
  content: string,
): SystemAwaySummaryMessage {
  return {
    type: 'system',
    subtype: 'away_summary',
    content,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    isMeta: false,
  }
}

export function createMemorySavedMessage(
  writtenPaths: string[],
): SystemMemorySavedMessage {
  return {
    type: 'system',
    subtype: 'memory_saved',
    writtenPaths,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    isMeta: false,
  }
}

export function createAgentsKilledMessage(): SystemAgentsKilledMessage {
  return {
    type: 'system',
    subtype: 'agents_killed',
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    isMeta: false,
  }
}

export function createApiMetricsMessage(metrics: {
  ttftMs: number
  otps: number
  isP50?: boolean
  hookDurationMs?: number
  turnDurationMs?: number
  toolDurationMs?: number
  classifierDurationMs?: number
  toolCount?: number
  hookCount?: number
  classifierCount?: number
  configWriteCount?: number
}): SystemApiMetricsMessage {
  return {
    type: 'system',
    subtype: 'api_metrics',
    ttftMs: metrics.ttftMs,
    otps: metrics.otps,
    isP50: metrics.isP50,
    hookDurationMs: metrics.hookDurationMs,
    turnDurationMs: metrics.turnDurationMs,
    toolDurationMs: metrics.toolDurationMs,
    classifierDurationMs: metrics.classifierDurationMs,
    toolCount: metrics.toolCount,
    hookCount: metrics.hookCount,
    classifierCount: metrics.classifierCount,
    configWriteCount: metrics.configWriteCount,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    isMeta: false,
  }
}

export function createCommandInputMessage(
  content: string,
): SystemLocalCommandMessage {
  return {
    type: 'system',
    subtype: 'local_command',
    content,
    level: 'info',
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    isMeta: false,
  }
}

export function createCompactBoundaryMessage(
  trigger: 'manual' | 'auto',
  preTokens: number,
  lastPreCompactMessageUuid?: UUID,
  userContext?: string,
  messagesSummarized?: number,
): SystemCompactBoundaryMessage {
  return {
    type: 'system',
    subtype: 'compact_boundary',
    content: `Conversation compacted`,
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    level: 'info',
    compactMetadata: {
      trigger,
      preTokens,
      userContext,
      messagesSummarized,
    },
    ...(lastPreCompactMessageUuid && {
      logicalParentUuid: lastPreCompactMessageUuid,
    }),
  }
}

export function createMicrocompactBoundaryMessage(
  trigger: 'auto',
  preTokens: number,
  tokensSaved: number,
  compactedToolIds: string[],
  clearedAttachmentUUIDs: string[],
): SystemMicrocompactBoundaryMessage {
  logForDebugging(
    `[microcompact] saved ~${formatTokens(tokensSaved)} tokens (cleared ${compactedToolIds.length} tool results)`,
  )
  return {
    type: 'system',
    subtype: 'microcompact_boundary',
    content: 'Context microcompacted',
    isMeta: false,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    level: 'info',
    microcompactMetadata: {
      trigger,
      preTokens,
      tokensSaved,
      compactedToolIds,
      clearedAttachmentUUIDs,
    },
  }
}

export function createSystemAPIErrorMessage(
  error: APIError,
  retryInMs: number,
  retryAttempt: number,
  maxRetries: number,
): SystemAPIErrorMessage {
  return {
    type: 'system',
    subtype: 'api_error',
    level: 'error',
    cause: error.cause instanceof Error ? error.cause : undefined,
    error,
    retryInMs,
    retryAttempt,
    maxRetries,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
  }
}

/**
 * Checks if a message is a compact boundary marker
 */

export function createToolUseSummaryMessage(
  summary: string,
  precedingToolUseIds: string[],
): ToolUseSummaryMessage {
  return {
    type: 'tool_use_summary',
    summary,
    precedingToolUseIds,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Defensive validation: ensure tool_use/tool_result pairing is correct.
 *
 * Handles both directions:
 * - Forward: inserts synthetic error tool_result blocks for tool_use blocks missing results
 * - Reverse: strips orphaned tool_result blocks referencing non-existent tool_use blocks
 *
 * Logs when this activates to help identify the root cause.
 *
 * Strict mode: when getStrictToolResultPairing() is true (HFI opts in at
 * startup), any mismatch throws instead of repairing. For training-data
 * collection, a model response conditioned on synthetic placeholders is
 * tainted — fail the trajectory rather than waste labeler time on a turn
 * that will be rejected at submission anyway.
 */


// ===========================================================================
// TRAMO 2 de TASK-THYROX-0212 — los dos simbolos que desbloquean la suite
// ===========================================================================
// El tramo NO se eligio por tamano: se DERIVO de los dos rojos que el
// subconjunto publicaba. Con `proper-lockfile` materializado, el error real
// salio a la luz y contradijo la atribucion del tramo 1:
//
//   message-pipeline.test.ts -> Export named 'normalizeMessages' not found
//   messages.test.ts         -> Export named 'prepareUserContent' not found
//
// Los dos rojos eran del SUJETO -el porte incompleto-, no premisa rancia.
// El `Cannot find package 'proper-lockfile'` los enmascaraba: el grafo de
// modulos moria antes de llegar a preguntar por el export.
//
// El cierre transitivo decide el corte, medido sobre la fuente:
//
//   normalizeMessages        cierre= 3   falta 1    ~84 lineas
//   prepareUserContent       cierre= 1   falta 1    ~19 lineas
//   normalizeMessagesForAPI  cierre=56   faltan 54  ~2766 lineas
//
// Los dos primeros entran aqui y cierran `message-pipeline.test.ts` entero
// -su unico ausente era `normalizeMessages`-. El hub queda para el tramo 3;
// `messages.test.ts` no puede cerrar antes, porque lo importa.
export function prepareUserContent({
  inputString,
  precedingInputBlocks,
}: {
  inputString: string
  precedingInputBlocks: ContentBlockParam[]
}): string | ContentBlockParam[] {
  if (precedingInputBlocks.length === 0) {
    return inputString
  }

  return [
    ...precedingInputBlocks,
    {
      text: inputString,
      type: 'text',
    },
  ]
}

export function normalizeMessages(messages: Message[]): NormalizedMessage[] {
  // isNewChain tracks whether we need to generate new UUIDs for messages when normalizing.
  // When a message has multiple content blocks, we split it into multiple messages,
  // each with a single content block. When this happens, we need to generate new UUIDs
  // for all subsequent messages to maintain proper ordering and prevent duplicate UUIDs.
  // This flag is set to true once we encounter a message with multiple content blocks,
  // and remains true for all subsequent messages in the normalization process.
  let isNewChain = false
  // Cada rama emite un bloque por mensaje: el contenido sale como arreglo por
  // construcción, que es la forma que `NormalizedMessage` declara.
  return messages.flatMap((message): NormalizedMessage[] => {
    switch (message.type) {
      case 'assistant': {
        // El `switch` NO estrecha: `Message.type` esta declarado `MessageType`
        // y no como literal discriminante, asi que TypeScript no deduce el
        // subtipo por rama. La rama SI lo garantiza, asi que se declara con un
        // cast en vez de sembrar `?.` en cada uno de los nueve accesos.
        const am = message as AssistantMessage
        // `content` sigue opcional dentro de `message` —la fuente lo lee sin
        // guarda bajo `strict: false`—, y el arreglo se estrecha a `ContentItem[]`
        // para que `.map` resuelva: una union `A[] | B[]` no ofrece una firma
        // de `map` compatible, y `ContentItem` es el elemento que
        // `messageShapes.ts` exporta para exactamente esto.
        const assistantContent = (Array.isArray(am.message.content)
          ? am.message.content
          : []) as ContentItem[]
        isNewChain = isNewChain || assistantContent.length > 1
        return assistantContent.map((_, index) => {
          const uuid = isNewChain
            ? deriveUUID(am.uuid, index)
            : am.uuid
          return {
            type: 'assistant' as const,
            timestamp: am.timestamp,
            message: {
              ...am.message,
              content: [_],
              context_management: am.message.context_management ?? null,
            },
            isMeta: am.isMeta,
            isVirtual: am.isVirtual,
            requestId: am.requestId,
            uuid,
            error: am.error,
            isApiErrorMessage: am.isApiErrorMessage,
            advisorModel: am.advisorModel,
          } as NormalizedAssistantMessage
        })
      }
      case 'attachment':
        return [message] as NormalizedMessage[]
      case 'progress':
        return [message] as NormalizedMessage[]
      case 'system':
        return [message] as NormalizedMessage[]
      case 'user': {
        // Mismo cast y misma razon que la rama `assistant`. `UserMessage`
        // declara `message` requerido —DIVERGENCIA declarada en
        // `messageShapes.ts`, misma clase que `AssistantMessage`— pero su
        // `content` sigue opcional, asi que se estrecha una sola vez a una
        // variable local en lugar de en los siete accesos de la rama.
        const um = message as UserMessage
        const userContent = (um.message.content ?? []) as string | ContentItem[]
        if (typeof userContent === 'string') {
          const uuid = isNewChain ? deriveUUID(um.uuid, 0) : um.uuid
          return [
            {
              ...um,
              uuid,
              message: {
                ...um.message,
                content: [{ type: 'text', text: userContent }],
              },
            } as NormalizedMessage,
          ]
        }
        isNewChain = isNewChain || userContent.length > 1
        // `imagePasteIds` no esta declarado en `Message`: llega por su firma de
        // indice, o sea `unknown`. Indexarlo sin estrechar es TS18046 —el mismo
        // acceso que la fuente hace legalmente bajo `strict: false`—.
        const imagePasteIds = um.imagePasteIds as number[] | undefined
        let imageIndex = 0
        return userContent.map((_, index) => {
          const isImage = _.type === 'image'
          // For image content blocks, extract just the ID for this image
          const imageId =
            isImage && imagePasteIds ? imagePasteIds[imageIndex] : undefined
          if (isImage) imageIndex++
          return {
            ...createUserMessage({
              content: [_],
              toolUseResult: um.toolUseResult,
              mcpMeta: um.mcpMeta as { _meta?: Record<string, unknown>; structuredContent?: Record<string, unknown> },
              isMeta: um.isMeta === true ? true : undefined,
              isVisibleInTranscriptOnly: um.isVisibleInTranscriptOnly === true ? true : undefined,
              isVirtual: (um.isVirtual as boolean | undefined) === true ? true : undefined,
              timestamp: um.timestamp as string | undefined,
              imagePasteIds: imageId !== undefined ? [imageId] : undefined,
              origin: um.origin as MessageOrigin | undefined,
            }),
            uuid: isNewChain ? deriveUUID(um.uuid, index) : um.uuid,
          } as NormalizedMessage
        })
      }
      // DIVERGENCIA DECLARADA de TOOLCHAIN: la fuente cubre 5 de los 7 miembros
      // de `MessageType` y deja que `grouped_tool_use` y `collapsed_read_search`
      // caigan por el borde devolviendo `undefined`, que `strict: false` le
      // tolera. Aqui el tipo de retorno seria `(Message | undefined)[]`. El
      // `default` declara el paso a traves, que es la conducta que la fuente ya
      // tiene de hecho para esos dos casos. Va al FINAL del `switch`, no en
      // medio: un `default` intercalado es legal y se lee como si cortara las
      // ramas que le siguen.
      default:
        return [message] as NormalizedMessage[]
    }
  })
}


// La superficie que sus consumidores piden y que vive en otro módulo del
// paquete (medido con src/verify/namedImports.ts).
export { filterUnresolvedToolUses } from './loop/session/reconcile.js'

/**
 * El texto de un mensaje del asistente: sus bloques de texto no vacíos,
 * unidos por salto de línea y recortados; null si no es del asistente, si su
 * contenido no es una lista o si no queda texto (≙ `qO` de 2.1.275).
 */
export function getAssistantMessageText(message: Message): string | null {
  if (message.type !== 'assistant') return null
  const content = message.message?.content
  if (!Array.isArray(content)) return null
  return (
    content
      .map(block => (block as { type?: string; text?: string }).type === 'text' ? ((block as { text?: string }).text ?? '') : '')
      .filter(text => text !== '')
      .join('\n')
      .trim() || null
  )
}

/**
 * La nota que acompaña un rechazo cuando la memoria automática está activa:
 * el siguiente mensaje del usuario puede traer una corrección que conviene
 * guardar. El texto es de este árbol; el contrato es el de `MJe`/`WO` en
 * 2.1.275.
 */
export const MEMORY_CORRECTION_HINT =
  "\n\nNote: the user's next message may explain what went wrong or how they want the work done. If it does, consider saving that preference to memory so future sessions follow it."

function isAutoMemoryEnabledDeferred(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/memory/paths') as { isAutoMemoryEnabled: () => boolean }).isAutoMemoryEnabled()
  } catch {
    return false
  }
}

function featureEnabledDeferred(name: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFeatureValue_CACHED_MAY_BE_STALE } = require('@thyrox/config/feature-flags') as {
      getFeatureValue_CACHED_MAY_BE_STALE: <T>(name: string, fallback: T) => T
    }
    return getFeatureValue_CACHED_MAY_BE_STALE<boolean>(name, false) === true
  } catch {
    return false
  }
}

/**
 * El mensaje de rechazo, con la nota de corrección si la memoria automática
 * está activa y la bandera `tengu_amber_prism` también (≙ `WO` de 2.1.275).
 * Este árbol no tiene pausa de memoria, así que sólo la desactivación la
 * apaga.
 */
export function withMemoryCorrectionHint(message: string): string {
  if (isAutoMemoryEnabledDeferred() && featureEnabledDeferred('tengu_amber_prism')) return message + MEMORY_CORRECTION_HINT
  return message
}

// ---------------------------------------------------------------------------
// Índices de mensajes — porte de 2.1.275 (2026-09-24): `eP` y `EUt`, `d6e`
// (subagente), la clase `_ot` con `Qke` y `finish` (vista completa, aquí sin
// su cache incremental `Bee`), y los lectores `n3n`/`r3n`/`x$r`/`J7t`.
// pendiente: la negativa del asesor (`Epe`, `iKe(e)==="refusal"`) como
// causa de error de un `advisor_tool_result`; sólo cuenta aquí su bloque de
// error explícito.
// ---------------------------------------------------------------------------

// Mensajes de forma abierta: los índices sólo leen campos concretos.
type AnyMessage = { type: string; uuid?: string; [key: string]: any }
type AnyBlock = { type: string; [key: string]: any }

export type MessageLookups = {
  siblingToolUseIDs: Map<string, Set<string>>
  progressMessagesByToolUseID: Map<string, AnyMessage[]>
  inProgressHookCounts: Map<string, Map<string, number>>
  resolvedHookCounts: Map<string, Map<string, number>>
  toolResultByToolUseID: Map<string, AnyMessage>
  firstTextBlockUuidByMessageID: Map<string, string>
  toolUseByToolUseID: Map<string, AnyBlock>
  resolvedToolUseIDs: Set<string>
  erroredToolUseIDs: Set<string>
}

/** `EUt`: el conjunto vacío compartido, congelado. */
export const EMPTY_STRING_SET: ReadonlySet<string> = Object.freeze(new Set<string>())

/** `eP`: índices vacíos, para las vistas que no los necesitan. */
export const EMPTY_LOOKUPS: MessageLookups = {
  siblingToolUseIDs: new Map(),
  progressMessagesByToolUseID: new Map(),
  inProgressHookCounts: new Map(),
  resolvedHookCounts: new Map(),
  toolResultByToolUseID: new Map(),
  firstTextBlockUuidByMessageID: new Map(),
  toolUseByToolUseID: new Map(),
  resolvedToolUseIDs: new Set(),
  erroredToolUseIDs: new Set(),
}

// Los adjuntos de resultado de hook (`qpn`).
const HOOK_RESULT_ATTACHMENTS = new Set([
  'hook_blocking_error',
  'hook_cancelled',
  'hook_error_during_execution',
  'hook_non_blocking_error',
  'hook_success',
  'hook_system_message',
  'hook_additional_context',
  'hook_stopped_continuation',
  'hook_deferred_tool',
])

function isHookResultAttachment(message: AnyMessage): boolean {
  return message.type === 'attachment' && HOOK_RESULT_ATTACHMENTS.has(message.attachment?.type)
}

/** `e3n`: un bloque que cita una tool use la da por resuelta. */
function noteToolUseReference(block: AnyBlock, resolved: Set<string>, errored: Set<string>): void {
  if (typeof block.tool_use_id === 'string') resolved.add(block.tool_use_id)
  if (block.type === 'advisor_tool_result' && block.content?.type === 'advisor_tool_result_error')
    errored.add(block.tool_use_id)
}

/** `t3n`: las tool uses que ejecuta el servidor, no el cliente. */
function isServerToolUse(block: AnyBlock): boolean {
  return block.type === 'server_tool_use' || block.type === 'mcp_tool_use'
}

/**
 * `$Ns` + `FNs`: una tool use de servidor sin resultado en un mensaje que ya
 * no es el último no va a resolverse: cuenta como resuelta y fallida.
 */
function failOrphanServerToolUses(
  messages: AnyMessage[],
  last: AnyMessage | undefined,
  resolved: Set<string>,
  errored: Set<string>,
): void {
  const lastID = last?.type === 'assistant' ? last.message.id : undefined
  for (const message of messages) {
    if (message.type !== 'assistant' || message.message.id === lastID) continue
    for (const block of message.message.content)
      if (isServerToolUse(block) && !resolved.has(block.id)) {
        resolved.add(block.id)
        errored.add(block.id)
      }
  }
}

/** `d6e`: índices de la transcripción de un subagente, y lo que sigue en curso. */
export function buildSubagentLookups(entries: Array<{ message: AnyMessage }>): {
  lookups: MessageLookups
  inProgressToolUseIDs: Set<string>
} {
  const toolUses = new Map<string, AnyBlock>()
  const resolved = new Set<string>()
  const errored = new Set<string>()
  const results = new Map<string, AnyMessage>()
  for (const { message } of entries) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'tool_use') toolUses.set(block.id, block)
        noteToolUseReference(block, resolved, errored)
      }
    } else if (message.type === 'user') {
      for (const block of message.message.content)
        if (block.type === 'tool_result') {
          resolved.add(block.tool_use_id)
          results.set(block.tool_use_id, message)
          if (block.is_error) errored.add(block.tool_use_id)
        }
    }
  }
  const messages = entries.map(e => e.message)
  failOrphanServerToolUses(messages, messages.at(-1), resolved, errored)
  const inProgressToolUseIDs = new Set<string>()
  for (const id of toolUses.keys()) if (!resolved.has(id)) inProgressToolUseIDs.add(id)
  return {
    lookups: {
      ...EMPTY_LOOKUPS,
      toolUseByToolUseID: toolUses,
      resolvedToolUseIDs: resolved,
      erroredToolUseIDs: errored,
      toolResultByToolUseID: results,
    },
    inProgressToolUseIDs,
  }
}

/** `Qke`: el progreso por tool use (sin latidos) y los hooks lanzados por evento. */
function indexProgress(progressMessages: AnyMessage[]): {
  progressMessagesByToolUseID: Map<string, AnyMessage[]>
  inProgressHookCounts: Map<string, Map<string, number>>
} {
  const byToolUse = new Map<string, AnyMessage[]>()
  const hookCounts = new Map<string, Map<string, number>>()
  for (const message of progressMessages) {
    if (message.data?.type === 'tool_heartbeat') continue
    const id = message.parentToolUseID
    const list = byToolUse.get(id)
    if (list) list.push(message)
    else byToolUse.set(id, [message])
    if (message.data?.type === 'hook_progress') {
      const event = message.data.hookEvent
      let counts = hookCounts.get(id)
      if (!counts) hookCounts.set(id, (counts = new Map()))
      counts.set(event, (counts.get(event) ?? 0) + 1)
    }
  }
  return { progressMessagesByToolUseID: byToolUse, inProgressHookCounts: hookCounts }
}

/**
 * La vista completa (`_ot` alimentado como en `Bee.build`): las tool uses se
 * toman de los mensajes mostrados; resultados, primer bloque de texto, tool
 * uses de servidor y hooks resueltos, de los normalizados; el progreso, de
 * los mensajes `progress`.
 */
export function buildMessageLookups(normalizedMessages: AnyMessage[], messages: AnyMessage[]): MessageLookups {
  const siblingToolUseIDs = new Map<string, Set<string>>()
  const toolUseByToolUseID = new Map<string, AnyBlock>()
  const idsByMessage = new Map<string, Set<string>>()
  for (const message of messages) {
    if (message.type !== 'assistant' || !message.message.content.some((b: AnyBlock) => b.type === 'tool_use')) continue
    const ids = new Set(idsByMessage.get(message.message.id))
    for (const block of message.message.content)
      if (block.type === 'tool_use') {
        ids.add(block.id)
        toolUseByToolUseID.set(block.id, block)
      }
    idsByMessage.set(message.message.id, ids)
    for (const id of ids) siblingToolUseIDs.set(id, ids)
  }

  const toolResultByToolUseID = new Map<string, AnyMessage>()
  const firstTextBlockUuidByMessageID = new Map<string, string>()
  let resolvedToolUseIDs = new Set<string>()
  let erroredToolUseIDs = new Set<string>()
  const serverToolUses: Array<{ id: string; messageID: string }> = []
  const resolvedHookNames = new Map<string, Map<string, Set<string>>>()
  const resolvedHookCounts = new Map<string, Map<string, number>>()
  for (const message of normalizedMessages) {
    if (message.type === 'user') {
      for (const block of message.message.content)
        if (block.type === 'tool_result') {
          toolResultByToolUseID.set(block.tool_use_id, message)
          resolvedToolUseIDs.add(block.tool_use_id)
          if (block.is_error) erroredToolUseIDs.add(block.tool_use_id)
        }
    } else if (message.type === 'assistant') {
      const id = message.message.id
      for (const block of message.message.content) {
        if (block.type === 'text') {
          if (!firstTextBlockUuidByMessageID.has(id) && message.uuid) firstTextBlockUuidByMessageID.set(id, message.uuid)
        } else if (isServerToolUse(block)) serverToolUses.push({ id: block.id, messageID: id })
        noteToolUseReference(block, resolvedToolUseIDs, erroredToolUseIDs)
      }
    } else if (isHookResultAttachment(message) && message.attachment.hookName !== undefined) {
      const { toolUseID, hookEvent, hookName } = message.attachment
      let byEvent = resolvedHookNames.get(toolUseID)
      if (!byEvent) resolvedHookNames.set(toolUseID, (byEvent = new Map()))
      let names = byEvent.get(hookEvent)
      if (!names) byEvent.set(hookEvent, (names = new Set()))
      names.add(hookName)
      const counts = new Map(resolvedHookCounts.get(toolUseID))
      counts.set(hookEvent, names.size)
      resolvedHookCounts.set(toolUseID, counts)
    }
  }

  // `finish`: la tool use de servidor que no es del último mensaje y sigue
  // sin resultado se da por resuelta y fallida.
  const last = messages.at(-1)
  const lastID = last?.type === 'assistant' ? last.message.id : undefined
  for (const { id, messageID } of serverToolUses) {
    if (messageID === lastID || resolvedToolUseIDs.has(id)) continue
    resolvedToolUseIDs.add(id)
    erroredToolUseIDs.add(id)
  }

  return {
    siblingToolUseIDs,
    ...indexProgress(messages.filter(m => m.type === 'progress')),
    resolvedHookCounts,
    toolResultByToolUseID,
    firstTextBlockUuidByMessageID,
    toolUseByToolUseID,
    resolvedToolUseIDs,
    erroredToolUseIDs,
  }
}

/** `n3n`: las tool uses hermanas de la que corresponde al mensaje. */
export function getSiblingToolUseIDsFromLookup(message: AnyMessage, lookups: MessageLookups): ReadonlySet<string> {
  const id = getToolUseID(message as never)
  if (!id) return EMPTY_STRING_SET
  return lookups.siblingToolUseIDs.get(id) ?? EMPTY_STRING_SET
}

/** `r3n`: los mensajes de progreso de la tool use del mensaje. */
export function getProgressMessagesFromLookup(message: AnyMessage, lookups: MessageLookups): AnyMessage[] {
  const id = getToolUseID(message as never)
  if (!id) return []
  return lookups.progressMessagesByToolUseID.get(id) ?? []
}

/** `x$r`: ¿quedan hooks de este evento lanzados y sin resultado? */
export function hasUnresolvedHooksFromLookup(toolUseID: string, hookEvent: string, lookups: MessageLookups): boolean {
  const launched = lookups.inProgressHookCounts.get(toolUseID)?.get(hookEvent) ?? 0
  const resolved = lookups.resolvedHookCounts.get(toolUseID)?.get(hookEvent) ?? 0
  return launched > resolved
}

/** `J7t`: todos los ids de tool use que un mensaje cita. */
export function getToolUseIDs(message: AnyMessage): string[] {
  switch (message.type) {
    case 'assistant': {
      const ids: string[] = []
      for (const block of message.message.content)
        if (block.type === 'tool_use' || isServerToolUse(block)) ids.push(block.id)
        else if (typeof block.tool_use_id === 'string') ids.push(block.tool_use_id)
      return ids
    }
    case 'user': {
      const ids: string[] = []
      if (message.sourceToolUseID) ids.push(message.sourceToolUseID)
      for (const block of message.message.content) if (block.type === 'tool_result') ids.push(block.tool_use_id)
      return ids
    }
    case 'attachment':
    case 'system': {
      const id = getToolUseID(message as never)
      return id === null ? [] : [id]
    }
    case 'grouped_tool_use':
      return message.messages.map((m: AnyMessage) => m.message.content[0].id)
    default:
      return []
  }
}

// ---------------------------------------------------------------------------
// Filtros de reanudación — porte de 2.1.275 (2026-09-24), `chunk-q2gh92k2.js`:
// `blr`, `_lr` (con `nEt`, `ylr`, `ILs` y la fusión `kde`) y `Oi`/`m6e`.
// pendiente: la rama de `blr` que conserva un thinking seguido de un
// mensaje `resumedFromIncompleteThinking`, y la telemetría de cada filtro.
// ---------------------------------------------------------------------------

function isThinkingBlock(block: AnyBlock): boolean {
  return block.type === 'thinking' || block.type === 'redacted_thinking'
}

// `Gk`, acotado a lo que este árbol produce: mensajes que no cuentan como
// cierre de la conversación.
function isTrailingNoise(message: AnyMessage): boolean {
  return message.type === 'progress' || message.type === 'system' ||
    (message.type === 'attachment' && message.attachment?.type === 'thinking_drop')
}

/** `ILs`: los `message.id` con algún bloque que no es thinking. */
function messageIdsWithNonThinking(messages: AnyMessage[]): Set<string> {
  const ids = new Set<string>()
  for (const m of messages) {
    if (m.type !== 'assistant' || !m.message.id || !Array.isArray(m.message.content)) continue
    if (m.message.content.some((b: AnyBlock) => !isThinkingBlock(b))) ids.add(m.message.id)
  }
  return ids
}

/**
 * `blr`: quita los mensajes de asistente que sólo traen thinking cuando
 * ningún otro fragmento del mismo `message.id` trae contenido. Con
 * `preserveTrailing` conserva el último mensaje significativo.
 */
export function filterOrphanedThinkingOnlyMessages<T extends AnyMessage>(messages: T[], preserveTrailing = false): T[] {
  let lastMeaningful = messages.length - 1
  while (lastMeaningful >= 0 && isTrailingNoise(messages[lastMeaningful]!)) lastMeaningful--
  let withContent: Set<string> | undefined
  let out: T[] | undefined
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!
    const content = m.type === 'assistant' ? m.message.content : undefined
    const orphan =
      m.type === 'assistant' &&
      Array.isArray(content) &&
      content.length > 0 &&
      content.every(isThinkingBlock) &&
      !(m.message.id !== undefined && (withContent ??= messageIdsWithNonThinking(messages)).has(m.message.id)) &&
      !(preserveTrailing && i === lastMeaningful)
    if (!orphan) {
      out?.push(m)
      continue
    }
    out ??= messages.slice(0, i)
  }
  return out ?? messages
}

/** `nEt`: thinking opcional al inicio y luego sólo texto vacío o el marcador. */
function isWhitespaceOnlyContent(content: AnyBlock[]): boolean {
  let sawText = false
  for (const block of content) {
    if (!sawText && isThinkingBlock(block)) continue
    if (block.type !== 'text') return false
    const text = block.text?.trim()
    if (text !== undefined && text !== '' && text !== NO_CONTENT_MESSAGE) return false
    sawText = true
  }
  return sawText
}

/** `ylr`: los `message.id` con algún bloque con contenido real. */
function messageIdsWithContent(messages: AnyMessage[]): Set<string> {
  const ids = new Set<string>()
  for (const m of messages) {
    if (m.type !== 'assistant' || !m.message.id || !Array.isArray(m.message.content)) continue
    const hasContent = m.message.content.some((b: AnyBlock) => {
      if (isThinkingBlock(b)) return false
      if (b.type !== 'text') return true
      const text = (b.text ?? '').trim()
      return text !== '' && text !== NO_CONTENT_MESSAGE
    })
    if (hasContent) ids.add(m.message.id)
  }
  return ids
}

/** `kde`: dos mensajes de usuario seguidos se funden, resultados primero. */
function mergeUserPair(a: AnyMessage, b: AnyMessage): AnyMessage {
  const blocks = (c: unknown): AnyBlock[] => (typeof c === 'string' ? [{ type: 'text', text: c }] : (c as AnyBlock[]))
  const left = blocks(a.message.content)
  const right = blocks(b.message.content)
  const tail = left.at(-1)
  const head = right[0]
  const joined =
    tail?.type === 'text' && head?.type === 'text'
      ? [...left.slice(0, -1), { ...tail, text: `${tail.text}\n` }, ...right]
      : [...left, ...right]
  const content = [...joined.filter(x => x.type === 'tool_result'), ...joined.filter(x => x.type !== 'tool_result')]
  return {
    ...a,
    ...((a.ephemeral || b.ephemeral) && { ephemeral: true }),
    uuid: a.isMeta ? b.uuid : a.uuid,
    message: { ...a.message, content },
  }
}

/**
 * `_lr`: quita los mensajes de asistente sin más que espacios (o el marcador
 * de sin contenido), salvo que otro fragmento del mismo `message.id` traiga
 * contenido, y funde los mensajes de usuario que quedan contiguos.
 */
export function filterWhitespaceOnlyAssistantMessages<T extends AnyMessage>(
  messages: T[],
  { mergeAdjacentUsers = true }: { mergeAdjacentUsers?: boolean } = {},
): T[] {
  const any = messages.some(
    m => m.type === 'assistant' && Array.isArray(m.message.content) && m.message.content.length > 0 && isWhitespaceOnlyContent(m.message.content),
  )
  if (!any) return messages
  const withContent = messageIdsWithContent(messages)
  const kept = messages.filter(m => {
    if (m.type !== 'assistant' || withContent.has(m.message.id)) return true
    const content = m.message.content
    if (!Array.isArray(content) || content.length === 0) return true
    return !isWhitespaceOnlyContent(content)
  })
  if (!mergeAdjacentUsers) return kept
  const merged: T[] = []
  for (const m of kept) {
    const prev = merged.at(-1)
    if (m.type === 'user' && prev?.type === 'user' && !m.interruptedByShutdown && !prev.interruptedByShutdown)
      merged[merged.length - 1] = mergeUserPair(prev, m) as T
    else merged.push(m)
  }
  return merged
}

/** `Ra`. */
function isCompactBoundary(message: AnyMessage | undefined): boolean {
  return message?.type === 'system' && message.subtype === 'compact_boundary'
}

/**
 * `Oi`: la vista desde el último `compact_boundary`, inclusive. El segundo
 * argumento (`includeSnipped`) se acepta por la firma de los llamadores;
 * 2.1.275 ya no lo usa.
 */
export function getMessagesAfterCompactBoundary<T extends AnyMessage>(messages: T[], _options?: { includeSnipped?: boolean }): T[] {
  for (let i = messages.length - 1; i >= 0; i--) if (isCompactBoundary(messages[i])) return messages.slice(i)
  return messages
}

/**
 * Un bloque que lleva firma del modelo: `redacted_thinking`, o `thinking` con
 * `signature` no vacía (`IUt` en 2.1.275). Las firmas están atadas al modelo
 * que las emitió; reenviarlas a otro modelo da 400.
 */
function isSignedBlock(block: { type?: unknown; signature?: unknown }): boolean {
  if (block.type === 'redacted_thinking') return true
  return block.type === 'thinking' && typeof block.signature === 'string' && block.signature !== ''
}

/**
 * Retira los bloques firmados de los mensajes del asistente (`OLs` de 2.1.275
 * con un predicado que acepta todos). Si nada cambia devuelve el MISMO
 * arreglo, para que quien compara por referencia no vea un cambio falso.
 *
 * El tipo del elemento queda libre: `login.tsx` lo pasa a un `setMessages`
 * sobre `unknown[]`. DIVERGENCIA DECLARADA: 2.1.275 también ofrece la forma
 * que sólo limpia los mensajes de un modelo dado (`ZFn`); los consumidores de
 * este árbol llaman con los mensajes solos.
 */
export function stripSignatureBlocks<M>(messages: M[]): M[] {
  let changed = false
  const out = messages.map(message => {
    const candidate = message as unknown as AssistantMessage
    if (candidate?.type !== 'assistant') return message
    const content = candidate.message.content
    if (!Array.isArray(content)) return message
    const kept = (content as Array<{ type?: unknown; signature?: unknown }>).filter(b => !isSignedBlock(b))
    if (kept.length === content.length) return message
    changed = true
    return { ...candidate, message: { ...candidate.message, content: kept } } as unknown as M
  })
  return changed ? out : messages
}

/** El mensaje de sistema que deja un comando local (`Ume` de 2.1.275). */
export function isSystemLocalCommandMessage(message: Message): message is SystemLocalCommandMessage {
  return message.type === 'system' && (message as { subtype?: unknown }).subtype === 'local_command'
}

/**
 * Si un origen hace visible un mensaje meta (`VO` de 2.1.275): canales,
 * observadores, avisos de Slack y pares. Un par con `senderTaskId` siempre;
 * sin él, según `peerVisible` (por defecto sí).
 */
function isVisibleOrigin(origin: unknown, peerVisible?: boolean): boolean {
  const visible = typeof peerVisible === 'boolean' ? peerVisible : true
  const o = origin as { kind?: unknown; senderTaskId?: unknown } | undefined
  if (o?.kind === 'channel' || o?.kind === 'observer' || o?.kind === 'observer-activity' || o?.kind === 'slack-ping') {
    return true
  }
  if (o?.kind === 'peer') return o.senderTaskId !== undefined || visible
  return false
}

/**
 * Si un mensaje de usuario se muestra en la vista (`l3n` de 2.1.275): los
 * meta sólo si su origen es visible, y los marcados «sólo transcripción»
 * sólo en modo transcripción.
 */
export function shouldShowUserMessage(message: Message, isTranscriptMode: boolean): boolean {
  if (message.type !== 'user') return true
  const m = message as { isMeta?: unknown; origin?: unknown; isVisibleInTranscriptOnly?: unknown }
  if (m.isMeta) return isVisibleOrigin(m.origin)
  if (m.isVisibleInTranscriptOnly && !isTranscriptMode) return false
  return true
}

/** Los tipos de adjunto que produce un hook (`qpn` de 2.1.275). */
const HOOK_ATTACHMENT_TYPES = new Set([
  'hook_blocking_error',
  'hook_cancelled',
  'hook_error_during_execution',
  'hook_non_blocking_error',
  'hook_success',
  'hook_system_message',
  'hook_additional_context',
  'hook_stopped_continuation',
  'hook_deferred_tool',
])

type ToolUseGroup<M = unknown> = {
  toolUse: M | null
  preHooks: M[] | undefined
  toolResult: M | null
  postHooks: M[] | undefined
}

function toolUseGroup<M>(groups: Map<string, ToolUseGroup<M>>, id: string): ToolUseGroup<M> {
  let group = groups.get(id)
  if (group === undefined) {
    group = { toolUse: null, preHooks: undefined, toolResult: null, postHooks: undefined }
    groups.set(id, group)
  }
  return group
}

/**
 * Orden de la vista (`Z4n` de 2.1.275): cada uso de herramienta se muestra con
 * sus hooks previos, su resultado y sus hooks posteriores (incluidas las
 * líneas de resultado del host) en el sitio del uso; los errores de API del
 * sistema se omiten, un resultado sin su uso no se muestra, y los mensajes
 * sintéticos del streaming van al final.
 */
export function reorderMessagesInUI<M>(messages: M[], syntheticStreamingToolUseMessages: M[]): M[] {
  const groups = new Map<string, ToolUseGroup<M>>()
  const slots: Array<ToolUseGroup<M> | null | undefined> = Array(messages.length)
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index] as unknown as {
      type: string
      subtype?: string
      message?: { content?: unknown }
      attachment?: { type?: string; hookEvent?: string; toolUseID?: unknown }
    }
    switch (message.type) {
      case 'assistant': {
        const content = message.message?.content
        if (Array.isArray(content) && content.some((b: { type?: string }) => b.type === 'tool_use')) {
          const id = (content[0] as { id?: string } | undefined)?.id
          if (id) {
            const group = toolUseGroup(groups, id)
            slots[index] = group.toolUse === null ? group : null
            group.toolUse = messages[index]!
          } else slots[index] = null
        }
        break
      }
      case 'attachment': {
        const attachment = message.attachment
        if (attachment && HOOK_ATTACHMENT_TYPES.has(attachment.type ?? '')) {
          const event = attachment.hookEvent
          if (event === 'PreToolUse' || event === 'PostToolUse') {
            slots[index] = null
            const group = toolUseGroup(groups, String(attachment.toolUseID))
            if (event === 'PreToolUse') (group.preHooks ??= []).push(messages[index]!)
            else (group.postHooks ??= []).push(messages[index]!)
          }
        } else if (attachment?.type === 'tool_host_result_lines' && typeof attachment.toolUseID === 'string') {
          slots[index] = null
          ;(toolUseGroup(groups, attachment.toolUseID).postHooks ??= []).push(messages[index]!)
        }
        break
      }
      case 'user': {
        const first = Array.isArray(message.message?.content)
          ? (message.message!.content as Array<{ type?: string; tool_use_id?: string }>)[0]
          : undefined
        if (first?.type === 'tool_result') {
          slots[index] = null
          toolUseGroup(groups, String(first.tool_use_id)).toolResult = messages[index]!
        }
        break
      }
      case 'system': {
        if (message.subtype === 'api_error') slots[index] = null
        break
      }
    }
  }
  const out: M[] = []
  for (let index = 0; index < messages.length; index++) {
    const slot = slots[index]
    if (slot === undefined) out.push(messages[index]!)
    else if (slot !== null && slot.toolUse) {
      out.push(slot.toolUse)
      if (slot.preHooks) out.push(...slot.preHooks)
      if (slot.toolResult) out.push(slot.toolResult)
      if (slot.postHooks) out.push(...slot.postHooks)
    }
  }
  out.push(...syntheticStreamingToolUseMessages)
  return out
}

/**
 * Un tool use que el modelo esta emitiendo: su bloque de apertura y el JSON de
 * entrada acumulado hasta ahora, todavia sin parsear.
 */
export type StreamingToolUse = {
  index: number
  contentBlock: BetaToolUseBlock
  unparsedToolInput: string
}

/** El bloque de pensamiento visible mientras se emite y despues de cerrarse. */
export type StreamingThinking = {
  thinking: string
  isStreaming: boolean
  streamingEndedAt?: number
}

type StreamedItem =
  | Message
  | TombstoneMessage
  | StreamEvent
  | RequestStartEvent
  | ToolUseSummaryMessage

/** Los bloques de herramienta del servidor: el spinner pasa a `tool-input`. */
const SERVER_TOOL_BLOCKS = new Set([
  'server_tool_use',
  'web_search_tool_result',
  'code_execution_tool_result',
  'mcp_tool_use',
  'mcp_tool_result',
  'container_upload',
  'web_fetch_tool_result',
  'bash_code_execution_tool_result',
  'text_editor_code_execution_tool_result',
  'tool_search_tool_result',
  'compaction',
])

type StreamEventPayload = {
  type: string
  index?: number
  content_block?: { type: string; [key: string]: unknown }
  delta?: { type: string; text?: string; partial_json?: string; thinking?: string }
}

type StreamCallbacks = {
  onMessage: (message: Message) => void
  onUpdateLength: (newContent: string) => void
  onSetStreamMode: (mode: SpinnerMode) => void
  onStreamingToolUses: (f: (current: StreamingToolUse[]) => StreamingToolUse[]) => void
  onTombstone?: (message: Message) => void
  onStreamingThinking?: (f: (current: StreamingThinking | null) => StreamingThinking | null) => void
  onApiMetrics?: (metrics: { ttftMs: number }) => void
  onStreamingText?: (f: (current: string | null) => string | null) => void
}

/**
 * Enruta cada elemento que llega del stream a la parte de la interfaz que lo
 * pinta: los mensajes completos se entregan, los eventos de stream mueven el
 * modo del spinner, el largo de la respuesta, el texto parcial y los tool uses
 * en curso.
 *
 * Contrato de `ccnmt: packages/agent/messages.ts:3008-3179` (v2.1.88), que es
 * el que llaman los consumidores de este arbol con argumentos posicionales. En
 * 2.1.281 la funcion (`bcr`) solo recibe eventos de stream y trae su propio
 * contrato; la migracion es una tarea aparte.
 */
export function handleMessageFromStream(
  item: StreamedItem,
  onMessage: StreamCallbacks['onMessage'],
  onUpdateLength: StreamCallbacks['onUpdateLength'],
  onSetStreamMode: StreamCallbacks['onSetStreamMode'],
  onStreamingToolUses: StreamCallbacks['onStreamingToolUses'],
  onTombstone?: StreamCallbacks['onTombstone'],
  onStreamingThinking?: StreamCallbacks['onStreamingThinking'],
  onApiMetrics?: StreamCallbacks['onApiMetrics'],
  onStreamingText?: StreamCallbacks['onStreamingText'],
): void {
  const callbacks: StreamCallbacks = {
    onMessage, onUpdateLength, onSetStreamMode, onStreamingToolUses,
    onTombstone, onStreamingThinking, onApiMetrics, onStreamingText,
  }
  if (item.type === 'stream_request_start') {
    onSetStreamMode('requesting')
    return
  }
  if (item.type === 'stream_event') {
    handleStreamEvent(item as { event: StreamEventPayload; ttftMs?: number }, callbacks)
    return
  }
  deliverMessage(item, callbacks)
}

/** Un mensaje completo: se entrega, salvo la lapida (retira) y el resumen de SDK. */
function deliverMessage(
  item: Message | TombstoneMessage | ToolUseSummaryMessage,
  cb: StreamCallbacks,
): void {
  if (item.type === 'tombstone') {
    cb.onTombstone?.(item.message)
    return
  }
  if (item.type === 'tool_use_summary') return
  const message = item as Message
  if (message.type === 'assistant') {
    const content = message.message.content
    const thinking = Array.isArray(content)
      ? (content as readonly unknown[]).find((block): block is { type: 'thinking'; thinking: string } =>
          typeof block === 'object' && block !== null && (block as { type?: unknown }).type === 'thinking')
      : undefined
    if (thinking) {
      cb.onStreamingThinking?.(() => ({ thinking: thinking.thinking, isStreaming: false, streamingEndedAt: Date.now() }))
    }
  }
  // El texto parcial se retira en el mismo lote en que llega el mensaje final,
  // para que la vista pase de uno a otro sin hueco ni duplicado.
  cb.onStreamingText?.(() => null)
  cb.onMessage(message)
}

function handleStreamEvent(item: { event: StreamEventPayload; ttftMs?: number }, cb: StreamCallbacks): void {
  const event = item.event
  if (event.type === 'message_start' && item.ttftMs != null) cb.onApiMetrics?.({ ttftMs: item.ttftMs })
  switch (event.type) {
    case 'message_stop':
      cb.onSetStreamMode('tool-use')
      cb.onStreamingToolUses(() => [])
      return
    case 'content_block_start':
      startContentBlock(event, cb)
      return
    case 'content_block_delta':
      applyContentDelta(event, cb)
      return
    case 'content_block_stop':
      return
    default:
      // message_delta y cualquier evento desconocido: el modelo sigue respondiendo.
      cb.onSetStreamMode('responding')
  }
}

function startContentBlock(event: StreamEventPayload, cb: StreamCallbacks): void {
  cb.onStreamingText?.(() => null)
  const block = event.content_block
  if (!block) return
  if (feature('CONNECTOR_TEXT') && isConnectorTextBlock(block)) {
    cb.onSetStreamMode('responding')
    return
  }
  if (block.type === 'thinking' || block.type === 'redacted_thinking') {
    cb.onSetStreamMode('thinking')
  } else if (block.type === 'text') {
    cb.onSetStreamMode('responding')
  } else if (block.type === 'tool_use') {
    cb.onSetStreamMode('tool-input')
    const index = event.index ?? 0
    const contentBlock = block as unknown as BetaToolUseBlock
    cb.onStreamingToolUses(current => [...current, { index, contentBlock, unparsedToolInput: '' }])
  } else if (SERVER_TOOL_BLOCKS.has(block.type)) {
    cb.onSetStreamMode('tool-input')
  }
}

function applyContentDelta(event: StreamEventPayload, cb: StreamCallbacks): void {
  const delta = event.delta
  if (!delta) return
  if (delta.type === 'text_delta') {
    const text = delta.text ?? ''
    cb.onUpdateLength(text)
    cb.onStreamingText?.(current => (current ?? '') + text)
  } else if (delta.type === 'input_json_delta') {
    const json = delta.partial_json ?? ''
    cb.onUpdateLength(json)
    cb.onStreamingToolUses(current => {
      const target = current.find(toolUse => toolUse.index === event.index)
      if (!target) return current
      return [...current.filter(toolUse => toolUse !== target), { ...target, unparsedToolInput: target.unparsedToolInput + json }]
    })
  } else if (delta.type === 'thinking_delta') {
    cb.onUpdateLength(delta.thinking ?? '')
  }
  // signature_delta no es salida del modelo: no cuenta para el largo.
}

/**
 * Si la llamada mas reciente a `toolName` termino sin error.
 *
 * Contrato de la fuente (ccnmt v2.1.88, `utils/messages.ts`): se busca hacia
 * atras el `tool_use` mas reciente del asistente con ese nombre; despues, su
 * `tool_result` en un mensaje de usuario. Exito es `is_error !== true`; sin
 * llamada o sin resultado, `false`.
 */
export function hasSuccessfulToolCall(messages: Message[], toolName: string): boolean {
  let toolUseId: string | undefined
  for (let i = messages.length - 1; i >= 0 && !toolUseId; i--) {
    const msg = messages[i]!
    if (msg.type !== 'assistant') continue
    const content = msg.message.content
    if (!Array.isArray(content)) continue
    for (const block of content as ContentItem[]) {
      const candidate = block as { type?: string; name?: string; id?: string }
      if (candidate.type === 'tool_use' && candidate.name === toolName) {
        toolUseId = candidate.id
        break
      }
    }
  }
  if (!toolUseId) return false
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!
    if (msg.type !== 'user') continue
    const content = msg.message.content
    if (!Array.isArray(content)) continue
    for (const block of content as ContentItem[]) {
      const result = block as { type?: string; tool_use_id?: string; is_error?: boolean }
      if (result.type === 'tool_result' && result.tool_use_id === toolUseId) {
        return result.is_error !== true
      }
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Normalizacion del historial para el API — porte de
// `ccnmt: packages/agent/messages.ts:2055-2440` (`normalizeMessagesForAPI`) y
// de los ayudantes que necesita y no tenian hogar en este arbol. Los que ya lo
// tenian se reusan y no se duplican: `isToolSearchEnabledOptimistic` e
// `isToolReferenceBlock` (`toolSearch.ts`), `checkStatsigFeatureGate_*`
// (`config`), `toolMatchesName` (`tool-registry`), `normalizeToolInputForAPI`
// (`provider/legacy/api`), `validateImagesForAPI` (`storage`),
// `normalizeLegacyToolName` (`permission`), `isSnipRuntimeEnabled`
// (`compaction/snipCompact`), y los dos filtros de asistente de mas arriba.
//
// Tres divergencias declaradas, con su razon:
//
// 1. `last` de `lodash-es` se sustituye por `Array.prototype.at(-1)`: misma
//    semantica (`undefined` en arreglo vacio) sin arrastrar la dependencia.
// 2. Los `require('./compaction/snipCompact.js')` diferidos de la fuente se
//    resuelven como import estatico: el modulo solo importa tipos, asi que no
//    hay ciclo que justifique diferirlo, y las reglas de este arbol prohiben
//    importar dentro de una funcion.
// 3. `normalizeToolInputForAPI` se resuelve por `require` diferido, con el
//    ciclo de imports medido en su envoltorio (`normalizeToolInputForAPIDeferred`).
// 4. Los cinco textos de error de PDF/imagen/peticion demasiado grande NO
//    existen en `@thyrox/provider/errors.js` (ver su cabecera: leen el modo
//    no interactivo del host, decision de frontera pendiente). La tabla de
//    recorte se construye aqui con las DOS variantes de cada texto —la
//    interactiva y la no interactiva—: es un superconjunto de lo que la
//    fuente calcula en el momento de la llamada, y el mensaje sintetico se
//    escribio con el modo vigente cuando ocurrio el error, asi que cualquiera
//    de las dos puede ser la que haya que emparejar.
// ---------------------------------------------------------------------------
import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { readEnv } from '@thyrox/config/env/utils.js'
import { checkStatsigFeatureGate_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { OUTPUT_STYLE_CONFIG } from '@thyrox/config/outputStyles.js'
import { logEvent } from '@thyrox/local-observability'
import { logAntError } from '@thyrox/local-observability/debug.js'
import { formatFileSize, formatNumber } from '@thyrox/output/formatters'
import { normalizeLegacyToolName } from '@thyrox/permission/permissionRuleParser'
import { API_PDF_MAX_PAGES, PDF_TARGET_RAW_SIZE } from '@thyrox/provider/apiLimits.js'
import { validateImagesForAPI } from '@thyrox/storage/imageValidation.js'
import { type Tool, type Tools, toolMatchesName } from '@thyrox/tool-registry/Tool.js'
import { AGENT_TOOL_NAME } from '@thyrox/tool-registry/tools/AgentTool/constants.js'
import { EXIT_PLAN_MODE_V2_TOOL_NAME } from '@thyrox/tool-registry/tools/ExitPlanModeTool/constants.js'
import { FILE_READ_TOOL_NAME } from '@thyrox/tool-registry/tools/FileReadTool/constants.js'
import { SEND_MESSAGE_TOOL_NAME } from '@thyrox/tool-registry/tools/SendMessageTool/constants.js'
import { TASK_CREATE_TOOL_NAME } from '@thyrox/tool-registry/tools/TaskCreateTool/constants.js'
import { TASK_OUTPUT_TOOL_NAME } from '@thyrox/tool-registry/tools/TaskOutputTool/constants.js'
import { TASK_UPDATE_TOOL_NAME } from '@thyrox/tool-registry/tools/TaskUpdateTool/constants.js'
import { isAgentSwarmsEnabled } from './agentSwarmsEnabled.ts'
import { isSnipRuntimeEnabled, SNIP_NUDGE_TEXT } from './compaction/snipCompact.ts'
import type { AttachmentMessage, MessageContent } from './messageShapes.ts'
import { isTodoV2Enabled } from './tasks.ts'
import { isToolReferenceBlock, isToolSearchEnabledOptimistic } from './toolSearch.ts'

/** Texto hermano que corta el `<functions>` expandido de un `tool_reference`. */
const TOOL_REFERENCE_TURN_BOUNDARY = 'Tool loaded.'

/** Un mensaje con rol de usuario o de asistente: lo unico que el API acepta. */
type ApiMessage = UserMessage | AssistantMessage

/** La carga de un adjunto tal como `AttachmentMessage` la declara. */
type ApiAttachment = AttachmentMessage['attachment']

/**
 * El contenido en arreglo de un mensaje, o `undefined` si es cadena o falta.
 * El cast es el mismo que `isSyntheticMessage` ya hace mas arriba:
 * `MessageContent` es `ContentBlockParam[] | ContentBlock[]`, y una union de
 * arreglos no ofrece `map`/`filter` con firma compatible; los lectores de esta
 * seccion solo consultan `type` y los campos que las dos formas comparten.
 */
function arrayContent(content: MessageContent | undefined): ContentBlockParam[] | undefined {
  return Array.isArray(content) ? (content as ContentBlockParam[]) : undefined
}

/** El `tool_name` de un bloque `tool_reference`, o `undefined` si no lo es. */
function toolReferenceName(block: unknown): string | undefined {
  if (!isToolReferenceBlock(block) || typeof block !== 'object' || block === null || !('tool_name' in block)) {
    return undefined
  }
  return typeof block.tool_name === 'string' ? block.tool_name : undefined
}

/** Un bloque de thinking, en cualquiera de sus dos formas. */
function isThinkingParam(block: { type: string }): boolean {
  return block.type === 'thinking' || block.type === 'redacted_thinking'
}

/** Un `Record` llano: lo unico que `normalizeToolInputForAPI` sabe recortar. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * `normalizeToolInputForAPI` de `@thyrox/provider/legacy/api.js`, resuelto
 * en la llamada y no en la carga. Medido por biseccion sobre los 24 imports
 * de esta seccion: es el UNICO que cierra un ciclo — `legacy/api` importa
 * `agent/prompts`, `agent/context` y las herramientas del registro, y por
 * `permission/pathSafety` vuelve a este modulo antes de que aquel termine de
 * inicializarse (`ReferenceError: Cannot access 'SENSITIVE_FILES' before
 * initialization` al cargar `__tests__/compat.test.ts`). Misma forma que
 * `featureEnabledDeferred` mas arriba y que el `require` diferido de la
 * fuente para `snipCompact`; el tipo viene de `typeof import`, que no carga
 * nada. Si el modulo no resuelve, el input vuelve intacto: es lo que la
 * rama `default` de la funcion real hace.
 */
function normalizeToolInputForAPIDeferred(tool: Tool, input: Record<string, unknown>): unknown {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api = require('@thyrox/provider/legacy/api.js') as typeof import('@thyrox/provider/legacy/api.js')
    return api.normalizeToolInputForAPI(tool, input)
  } catch {
    return input
  }
}

/**
 * El error sintetico que el bucle inserta cuando el API rechaza la peticion:
 * un asistente marcado `isApiErrorMessage` y con el modelo `<synthetic>`.
 */
function isSyntheticApiErrorMessage(
  message: Message,
): message is AssistantMessage & { isApiErrorMessage: true } {
  return (
    message.type === 'assistant' &&
    message.isApiErrorMessage === true &&
    message.message.model === SYNTHETIC_MODEL
  )
}

/** El envoltorio que marca un texto como recordatorio del sistema. */
export function wrapInSystemReminder(content: string): string {
  return `<system-reminder>\n${content}\n</system-reminder>`
}

/** Envuelve el contenido de cada mensaje: la cadena entera, o cada bloque de texto. */
export function wrapMessagesInSystemReminder(messages: UserMessage[]): UserMessage[] {
  return messages.map(msg => {
    const content = msg.message.content
    if (typeof content === 'string') {
      return { ...msg, message: { ...msg.message, content: wrapInSystemReminder(content) } }
    }
    const blocks = arrayContent(content)
    if (blocks) {
      const wrappedContent = blocks.map(block =>
        block.type === 'text' ? { ...block, text: wrapInSystemReminder(block.text) } : block,
      )
      return { ...msg, message: { ...msg.message, content: wrappedContent } }
    }
    return msg
  })
}

/**
 * Sube cada adjunto hasta que topa con un asistente o con un `tool_result`:
 * asi el contexto inyectado queda justo despues del turno que lo motivo. Se
 * construye hacia atras y se invierte una vez al final —O(N)—; un `unshift`
 * dentro del bucle seria O(N^2).
 */
export function reorderAttachmentsForAPI(messages: Message[]): Message[] {
  const result: Message[] = []
  // Los adjuntos se acumulan al recorrer de abajo arriba, asi que este
  // buffer los guarda en orden inverso respecto a la entrada.
  const pendingAttachments: AttachmentMessage[] = []

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (!message) continue

    if (message.type === 'attachment') {
      pendingAttachments.push(message)
      continue
    }
    const isStoppingPoint =
      message.type === 'assistant' ||
      (message.type === 'user' && arrayContent(message.message.content)?.[0]?.type === 'tool_result')

    if (isStoppingPoint && pendingAttachments.length > 0) {
      // Tope: los adjuntos se quedan aqui (van despues del tope). Ya estan
      // invertidos, asi que tras el `reverse` final quedan en su orden
      // original justo despues de `message`.
      for (const attachment of pendingAttachments) result.push(attachment)
      result.push(message)
      pendingAttachments.length = 0
    } else {
      result.push(message)
    }
  }

  // Lo que queda sube hasta el principio.
  for (const attachment of pendingAttachments) result.push(attachment)

  result.reverse()
  return result
}

/**
 * Retira los `tool_reference` a herramientas que ya no existen (un servidor
 * MCP desconectado, renombrado o retirado). Sin esto el API rechaza con
 * «Tool reference not found in available tools».
 */
function stripUnavailableToolReferencesFromUserMessage(
  message: UserMessage,
  availableToolNames: Set<string>,
): UserMessage {
  const content = arrayContent(message.message.content)
  if (!content) return message

  const isUnavailable = (block: unknown): boolean => {
    const toolName = toolReferenceName(block)
    return toolName !== undefined && !availableToolNames.has(normalizeLegacyToolName(toolName))
  }

  const hasUnavailableReference = content.some(
    block => block.type === 'tool_result' && Array.isArray(block.content) && block.content.some(isUnavailable),
  )
  if (!hasUnavailableReference) return message

  return {
    ...message,
    message: {
      ...message.message,
      content: content.map(block => {
        if (block.type !== 'tool_result' || !Array.isArray(block.content)) return block

        const filteredContent = block.content.filter(c => {
          const rawToolName = toolReferenceName(c)
          if (rawToolName === undefined) return true
          const toolName = normalizeLegacyToolName(rawToolName)
          const isAvailable = availableToolNames.has(toolName)
          if (!isAvailable) {
            logForDebugging(`Filtering out tool_reference for unavailable tool: ${toolName}`, { level: 'warn' })
          }
          return isAvailable
        })

        // Si no queda nada, un marcador en vez de un bloque vacio.
        if (filteredContent.length === 0) {
          return {
            ...block,
            content: [{ type: 'text' as const, text: '[Tool references removed - tools no longer available]' }],
          }
        }
        return { ...block, content: filteredContent }
      }),
    },
  }
}

/**
 * Apenda la etiqueta `[id:...]` al ultimo bloque de texto de un mensaje de
 * usuario. Solo muta la copia que va al API, no el mensaje guardado; es lo
 * que le permite al modelo citar un mensaje al llamar a la herramienta de
 * recorte.
 */
function appendMessageTagToUserMessage(message: UserMessage): UserMessage {
  if (message.isMeta) return message

  const tag = `\n[id:${deriveShortMessageId(message.uuid)}]`
  const content = message.message.content

  if (typeof content === 'string') {
    return { ...message, message: { ...message.message, content: content + tag } }
  }

  const blocks = arrayContent(content)
  if (!blocks || blocks.length === 0) return message

  let lastTextIdx = -1
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i]?.type === 'text') {
      lastTextIdx = i
      break
    }
  }
  const textBlock = blocks[lastTextIdx]
  if (!textBlock || textBlock.type !== 'text') return message

  const newContent = [...blocks]
  newContent[lastTextIdx] = { ...textBlock, text: textBlock.text + tag }
  return { ...message, message: { ...message.message, content: newContent } }
}

/**
 * Retira todo `tool_reference` de los `tool_result` de un mensaje de usuario:
 * solo son validos con la beta de busqueda de herramientas activa.
 */
export function stripToolReferenceBlocksFromUserMessage(message: UserMessage): UserMessage {
  const content = arrayContent(message.message.content)
  if (!content) return message

  const hasToolReference = content.some(
    block => block.type === 'tool_result' && Array.isArray(block.content) && block.content.some(isToolReferenceBlock),
  )
  if (!hasToolReference) return message

  return {
    ...message,
    message: {
      ...message.message,
      content: content.map(block => {
        if (block.type !== 'tool_result' || !Array.isArray(block.content)) return block
        const filteredContent = block.content.filter(c => !isToolReferenceBlock(c))
        if (filteredContent.length === 0) {
          return {
            ...block,
            content: [{ type: 'text' as const, text: '[Tool references removed - tool search not enabled]' }],
          }
        }
        return { ...block, content: filteredContent }
      }),
    },
  }
}

/**
 * Retira el campo `caller` de los `tool_use` de un asistente: solo es valido
 * con la beta de busqueda de herramientas. NO normaliza el input — eso lo
 * hace `normalizeToolInputForAPI` dentro de `normalizeMessagesForAPI`, y este
 * ayudante corre despues, en el post-proceso por modelo.
 */
export function stripCallerFieldFromAssistantMessage(message: AssistantMessage): AssistantMessage {
  const contentArr = arrayContent(message.message.content) ?? []
  const hasCallerField = contentArr.some(
    block => block.type === 'tool_use' && 'caller' in block && block.caller !== null,
  )
  if (!hasCallerField) return message

  return {
    ...message,
    message: {
      ...message.message,
      content: contentArr.map(block => {
        if (block.type !== 'tool_use') return block
        // Solo los campos estandar del API, construidos explicitamente.
        return { type: 'tool_use' as const, id: block.id, name: block.name, input: block.input }
      }),
    },
  }
}

/** Si algun `tool_result` del arreglo lleva un `tool_reference` dentro. */
function contentHasToolReference(content: ReadonlyArray<ContentBlockParam>): boolean {
  return content.some(
    block => block.type === 'tool_result' && Array.isArray(block.content) && block.content.some(isToolReferenceBlock),
  )
}

/**
 * Garantiza que todo texto de un mensaje de origen adjunto lleve el
 * envoltorio `<system-reminder>`: asi el prefijo discrimina de forma fiable en
 * el paso final (`smooshSystemReminderSiblings`). Idempotente.
 */
function ensureSystemReminderWrap(msg: UserMessage): UserMessage {
  const content = msg.message.content
  if (typeof content === 'string') {
    if (content.startsWith('<system-reminder>')) return msg
    return { ...msg, message: { ...msg.message, content: wrapInSystemReminder(content) } }
  }
  const blocks = arrayContent(content)
  if (!blocks) return msg
  let changed = false
  const newContent = blocks.map(b => {
    if (b.type === 'text' && !b.text.startsWith('<system-reminder>')) {
      changed = true
      return { ...b, text: wrapInSystemReminder(b.text) }
    }
    return b
  })
  return changed ? { ...msg, message: { ...msg.message, content: newContent } } : msg
}

/**
 * Paso final: funde los textos hermanos con prefijo `<system-reminder>` en el
 * ULTIMO `tool_result` del mismo mensaje de usuario. El texto que no es
 * recordatorio (entrada real del usuario, `TOOL_REFERENCE_TURN_BOUNDARY`,
 * resumenes `<collapsed>`) se deja donde esta: una frontera `Human:` antes
 * de entrada real es correcta. Idempotente y puro.
 */
function smooshSystemReminderSiblings(messages: ApiMessage[]): ApiMessage[] {
  return messages.map(msg => {
    if (msg.type !== 'user') return msg
    const content = arrayContent(msg.message.content)
    if (!content) return msg
    if (!content.some(b => b.type === 'tool_result')) return msg

    const srText: TextBlockParam[] = []
    const kept: ContentBlockParam[] = []
    for (const b of content) {
      if (b.type === 'text' && b.text.startsWith('<system-reminder>')) srText.push(b)
      else kept.push(b)
    }
    if (srText.length === 0) return msg

    // Al ULTIMO tool_result: es el adyacente en el prompt renderizado.
    const lastTrIdx = kept.findLastIndex(b => b.type === 'tool_result')
    const lastTr = kept[lastTrIdx]
    if (!lastTr || lastTr.type !== 'tool_result') return msg
    const smooshed = smooshIntoToolResult(lastTr, srText)
    if (smooshed === null) return msg // restriccion de tool_reference — se deja

    const newContent = [...kept.slice(0, lastTrIdx), smooshed, ...kept.slice(lastTrIdx + 1)]
    return { ...msg, message: { ...msg.message, content: newContent } }
  })
}

/**
 * Deja solo texto en los `tool_result` con `is_error`: el API rechaza la
 * mezcla («all content must be type text if is_error is true»). Guarda de
 * lectura para transcripts anteriores a que `smooshIntoToolResult` filtrara
 * por `is_error`; sin ella una sesion reanudada da 400 en cada llamada.
 */
function sanitizeErrorToolResultContent(messages: ApiMessage[]): ApiMessage[] {
  return messages.map(msg => {
    if (msg.type !== 'user') return msg
    const content = arrayContent(msg.message.content)
    if (!content) return msg

    let changed = false
    const newContent = content.map(b => {
      if (b.type !== 'tool_result' || !b.is_error) return b
      const trContent = b.content
      if (!Array.isArray(trContent)) return b
      if (trContent.every(c => c.type === 'text')) return b
      changed = true
      const texts = trContent.flatMap(c => (c.type === 'text' ? [c.text] : []))
      const textOnly: TextBlockParam[] = texts.length > 0 ? [{ type: 'text', text: texts.join('\n\n') }] : []
      return { ...b, content: textOnly }
    })
    if (!changed) return msg
    return { ...msg, message: { ...msg.message, content: newContent } }
  })
}

/**
 * Mueve los textos hermanos de un mensaje con `tool_reference` al siguiente
 * mensaje de usuario que tenga `tool_result` y NO `tool_reference`. El
 * servidor expande la referencia a un bloque `<functions>`, y un texto
 * hermano justo despues crea un segundo segmento de turno humano que el
 * modelo imita emitiendo la secuencia de parada. Si no hay destino valido,
 * los hermanos se quedan. Idempotente.
 */
function relocateToolReferenceSiblings(messages: ApiMessage[]): ApiMessage[] {
  const result = [...messages]

  for (let i = 0; i < result.length; i++) {
    const msg = result[i]
    if (!msg || msg.type !== 'user') continue
    const content = arrayContent(msg.message.content)
    if (!content || !contentHasToolReference(content)) continue

    const textSiblings = content.filter(b => b.type === 'text')
    if (textSiblings.length === 0) continue

    // Un destino con tool_reference solo recrearia el problema una posicion
    // mas adelante, asi que se salta.
    let targetIdx = -1
    for (let j = i + 1; j < result.length; j++) {
      const cand = result[j]
      if (!cand || cand.type !== 'user') continue
      const cc = arrayContent(cand.message.content)
      if (!cc || !cc.some(b => b.type === 'tool_result') || contentHasToolReference(cc)) continue
      targetIdx = j
      break
    }
    const target = result[targetIdx]
    if (targetIdx === -1 || !target || target.type !== 'user') continue

    result[i] = { ...msg, message: { ...msg.message, content: content.filter(b => b.type !== 'text') } }
    result[targetIdx] = {
      ...target,
      message: {
        ...target.message,
        content: [...(arrayContent(target.message.content) ?? []), ...textSiblings],
      },
    }
  }

  return result
}

/**
 * La tabla «texto del error sintetico → tipos de bloque a retirar del meta
 * que lo precede». Divergencia 3 de la cabecera: las dos variantes de cada
 * texto, porque los constructores de `provider/errors.js` no estan portados.
 */
function apiErrorBlockTypesToStrip(): Record<string, Set<string>> {
  const pdfLimits = `max ${API_PDF_MAX_PAGES} pages, ${formatFileSize(PDF_TARGET_RAW_SIZE)}`
  const requestLimits = `max ${formatFileSize(PDF_TARGET_RAW_SIZE)}`
  const entries: Array<[string, string[]]> = [
    [`PDF too large (${pdfLimits}). Try reading the file a different way (e.g., extract text with pdftotext).`, ['document']],
    [`PDF too large (${pdfLimits}). Double press esc to go back and try again, or use pdftotext to convert to text first.`, ['document']],
    ['PDF is password protected. Try using a CLI tool to extract or convert the PDF.', ['document']],
    ['PDF is password protected. Please double press esc to edit your message and try again.', ['document']],
    ['The PDF file was not valid. Try converting it to text first (e.g., pdftotext).', ['document']],
    ['The PDF file was not valid. Double press esc to go back and try again with a different file.', ['document']],
    ['Image was too large. Try resizing the image or using a different approach.', ['image']],
    ['Image was too large. Double press esc to go back and try again with a smaller image.', ['image']],
    [`Request too large (${requestLimits}). Try with a smaller file.`, ['document', 'image']],
    [`Request too large (${requestLimits}). Double press esc to go back and try with a smaller file.`, ['document', 'image']],
  ]
  const table: Record<string, Set<string>> = {}
  for (const [text, types] of entries) table[text] = new Set(types)
  return table
}

/**
 * Prepara el historial para el API: retira lo que es solo de pantalla,
 * funde usuarios contiguos (Bedrock no admite dos seguidos), funde los
 * fragmentos de un mismo asistente, normaliza los `tool_use`, rinde los
 * adjuntos, y aplica los pases finales de limpieza. El orden de esos pases
 * importa y esta comentado en cada uno.
 */
export function normalizeMessagesForAPI(messages: Message[], tools: Tools = []): ApiMessage[] {
  // Los nombres disponibles, para retirar referencias a herramientas ausentes.
  const availableToolNames = new Set(tools.map(t => t.name))

  // Primero suben los adjuntos; luego se retiran los virtuales — son solo de
  // pantalla (p. ej. las llamadas internas del REPL) y nunca llegan al API.
  const reorderedMessages = reorderAttachmentsForAPI(messages).filter(
    m => !((m.type === 'user' || m.type === 'assistant') && m.isVirtual),
  )

  const errorToBlockTypes = apiErrorBlockTypesToStrip()

  // Mapa de recorte dirigido: uuid del meta de usuario → tipos a retirar.
  const stripTargets = new Map<string, Set<string>>()
  for (let i = 0; i < reorderedMessages.length; i++) {
    const msg = reorderedMessages[i]
    if (!msg || !isSyntheticApiErrorMessage(msg)) continue
    const first = arrayContent(msg.message.content)?.[0]
    const errorText = first?.type === 'text' ? first.text : undefined
    if (!errorText) continue
    const blockTypesToStrip = errorToBlockTypes[errorText]
    if (!blockTypesToStrip) continue
    // Hacia atras hasta el meta de usuario mas cercano.
    for (let j = i - 1; j >= 0; j--) {
      const candidate = reorderedMessages[j]
      if (!candidate) break
      if (candidate.type === 'user' && candidate.isMeta) {
        const existing = stripTargets.get(candidate.uuid)
        if (existing) {
          for (const t of blockTypesToStrip) existing.add(t)
        } else {
          stripTargets.set(candidate.uuid, new Set(blockTypesToStrip))
        }
        break
      }
      // Otros errores sinteticos se saltan; un asistente o un usuario que no
      // es meta detiene la busqueda.
      if (isSyntheticApiErrorMessage(candidate)) continue
      break
    }
  }

  const result: ApiMessage[] = []
  for (const message of reorderedMessages) {
    if (message.type === 'progress' || isSyntheticApiErrorMessage(message)) continue

    if (message.type === 'system') {
      // Un `local_command` entra como usuario: asi el modelo puede citar la
      // salida del comando en turnos posteriores.
      if (!isSystemLocalCommandMessage(message)) continue
      const userMsg = createUserMessage({ content: message.content, uuid: message.uuid, timestamp: message.timestamp })
      const lastMessage = result.at(-1)
      if (lastMessage?.type === 'user') {
        result[result.length - 1] = mergeUserMessages(lastMessage, userMsg)
        continue
      }
      result.push(userMsg)
      continue
    }

    if (message.type === 'user') {
      // Sin busqueda de herramientas se retira todo `tool_reference`; con
      // ella, solo los que apuntan a herramientas que ya no existen.
      let normalizedMessage = isToolSearchEnabledOptimistic()
        ? stripUnavailableToolReferencesFromUserMessage(message, availableToolNames)
        : stripToolReferenceBlocksFromUserMessage(message)

      // Retira los `document`/`image` del meta que precedio a un error de
      // tamano, para no reenviar el contenido problematico en cada llamada.
      const typesToStrip = stripTargets.get(normalizedMessage.uuid)
      if (typesToStrip && normalizedMessage.isMeta) {
        const content = arrayContent(normalizedMessage.message.content)
        if (content) {
          const filtered = content.filter(block => !typesToStrip.has(block.type))
          if (filtered.length === 0) continue // todo retirado: el mensaje se omite
          if (filtered.length < content.length) {
            normalizedMessage = { ...normalizedMessage, message: { ...normalizedMessage.message, content: filtered } }
          }
        }
      }

      // El servidor expande `tool_reference` como `<functions>...</functions>`;
      // al final del prompt eso hace que el modelo muestree la secuencia de
      // parada. Un texto hermano inserta una frontera de turno limpia. Va
      // aqui —preparacion del API— para que nunca se renderice en el REPL, y
      // se salta solo si el recorte de arriba dejo el mensaje sin
      // referencias. Idempotente: el `startsWith` casa la forma desnuda y la
      // etiquetada por `appendMessageTagToUserMessage`. Apagado bajo la
      // bandera que activa `relocateToolReferenceSiblings` mas abajo.
      if (!checkStatsigFeatureGate_CACHED_MAY_BE_STALE('tengu_toolref_defer_j8m')) {
        const contentAfterStrip = arrayContent(normalizedMessage.message.content)
        if (
          contentAfterStrip &&
          !contentAfterStrip.some(b => b.type === 'text' && b.text.startsWith(TOOL_REFERENCE_TURN_BOUNDARY)) &&
          contentHasToolReference(contentAfterStrip)
        ) {
          normalizedMessage = {
            ...normalizedMessage,
            message: {
              ...normalizedMessage.message,
              content: [...contentAfterStrip, { type: 'text', text: TOOL_REFERENCE_TURN_BOUNDARY }],
            },
          }
        }
      }

      const lastMessage = result.at(-1)
      if (lastMessage?.type === 'user') {
        result[result.length - 1] = mergeUserMessages(lastMessage, normalizedMessage)
        continue
      }
      result.push(normalizedMessage)
      continue
    }

    if (message.type === 'assistant') {
      // Normaliza los inputs (p. ej. retira `plan` de ExitPlanModeV2). Sin la
      // beta de busqueda de herramientas se retira ademas `caller`, que solo
      // es valido con su cabecera.
      const toolSearchEnabled = isToolSearchEnabledOptimistic()
      const normalizedMessage: AssistantMessage = {
        ...message,
        message: {
          ...message.message,
          content: (arrayContent(message.message.content) ?? []).map(block => {
            if (block.type !== 'tool_use') return block
            const tool = tools.find(t => toolMatchesName(t, block.name))
            // La fuente pasa el input sin mirar su forma; aqui solo se
            // normaliza un `Record`, que es lo unico que las ramas de
            // `normalizeToolInputForAPI` tocan — el resto vuelve intacto.
            const rawInput: unknown = block.input
            const normalizedInput = tool && isPlainRecord(rawInput) ? normalizeToolInputForAPIDeferred(tool, rawInput) : rawInput
            const canonicalName = tool?.name ?? block.name

            if (toolSearchEnabled) {
              return { ...block, name: canonicalName, input: normalizedInput }
            }
            // Se retira `caller` y se conserva el resto de la metadata del
            // proveedor (p. ej. la firma de pensamiento de Gemini).
            const { caller: _caller, ...toolUseRest } = block
            return { ...toolUseRest, type: 'tool_use' as const, id: block.id, name: canonicalName, input: normalizedInput }
          }),
        },
      }

      // Se funde con el asistente previo del mismo `message.id`, saltando
      // los tool_result y los asistentes de otro id: los agentes concurrentes
      // intercalan fragmentos de respuestas distintas.
      let merged = false
      for (let i = result.length - 1; i >= 0; i--) {
        const msg = result[i]
        if (!msg) break
        if (msg.type !== 'assistant' && !isToolResultMessage(msg)) break
        if (msg.type === 'assistant' && msg.message.id === normalizedMessage.message.id) {
          result[i] = mergeAssistantMessages(msg, normalizedMessage)
          merged = true
          break
        }
      }
      if (!merged) result.push(normalizedMessage)
      continue
    }

    if (message.type === 'attachment') {
      const rawAttachmentMessage = normalizeAttachmentForAPI(message.attachment)
      const attachmentMessage = checkStatsigFeatureGate_CACHED_MAY_BE_STALE('tengu_chair_sermon')
        ? rawAttachmentMessage.map(ensureSystemReminderWrap)
        : rawAttachmentMessage

      const lastMessage = result.at(-1)
      if (lastMessage?.type === 'user') {
        result[result.length - 1] = attachmentMessage.reduce((p, c) => mergeUserMessagesAndToolResults(p, c), lastMessage)
        continue
      }
      result.push(...attachmentMessage)
    }
    // `grouped_tool_use` y `collapsed_read_search` no llevan rama en la
    // fuente: pasan su filtro y el `switch` los ignora. Aqui igual.
  }

  // Mueve los textos hermanos fuera de los mensajes con `tool_reference`
  // (#21049). Tras la fusion (los hermanos ya estan en su sitio) y antes del
  // etiquetado (las etiquetas reflejan la posicion final). Con la bandera
  // apagada no hace nada, y la frontera inyectada arriba es el respaldo.
  const relocated = checkStatsigFeatureGate_CACHED_MAY_BE_STALE('tengu_toolref_defer_j8m')
    ? relocateToolReferenceSiblings(result)
    : result

  // Asistentes huerfanos de solo thinking (la compactacion recorto lo que
  // habia entre una respuesta fallida y su reintento): sin esto, dos
  // asistentes seguidos con firmas de thinking distintas dan 400.
  const withFilteredOrphans = filterOrphanedThinkingOnlyMessages(relocated)

  // El orden importa: primero el thinking final, DESPUES el filtro de solo
  // espacios. Al reves, `[text("\n\n"), thinking(...)]` sobrevive al filtro
  // (tiene un bloque que no es texto) y el recorte deja `[text("\n\n")]`,
  // que el API rechaza.
  const withFilteredThinking = filterTrailingThinkingFromLastAssistant(withFilteredOrphans)
  const withFilteredWhitespace = filterWhitespaceOnlyAssistantMessages(withFilteredThinking)
  const withNonEmpty = ensureNonEmptyAssistantContent(withFilteredWhitespace)

  // El filtro de huerfanos no funde usuarios adyacentes (el de espacios si,
  // pero solo cuando dispara). Se funde aqui para que el paso siguiente
  // pueda plegar el hermano que `hoistToolResults` produce. Van juntos bajo
  // la misma bandera: la fusion existe solo para alimentar al pliegue.
  const smooshed = checkStatsigFeatureGate_CACHED_MAY_BE_STALE('tengu_chair_sermon')
    ? smooshSystemReminderSiblings(mergeAdjacentUserMessages(withNonEmpty))
    : withNonEmpty

  // Incondicional: transcripts anteriores a que el pliegue filtrara por
  // `is_error`. Sin esto, una sesion reanudada con una imagen dentro de un
  // tool_result de error da 400 para siempre.
  const sanitized = sanitizeErrorToolResultContent(smooshed)

  // Etiquetas `[id:...]` para la herramienta de recorte, tras toda fusion
  // (asi la etiqueta coincide con el mensaje que sobrevive). En modo test no:
  // cambian el hash del contenido y rompen la busqueda de fixtures VCR.
  if (feature('HISTORY_SNIP') && readEnv('NODE_ENV') !== 'test' && isSnipRuntimeEnabled()) {
    for (let i = 0; i < sanitized.length; i++) {
      const msg = sanitized[i]
      if (msg?.type === 'user') sanitized[i] = appendMessageTagToUserMessage(msg)
    }
  }

  // Ninguna imagen fuera del limite del API antes de enviar.
  validateImagesForAPI(sanitized)

  return sanitized
}

/** Fusion de un usuario con los mensajes de un adjunto: pliega y luego iza. */
export function mergeUserMessagesAndToolResults(a: UserMessage, b: UserMessage): UserMessage {
  const lastContent = normalizeUserTextContent(a.message.content)
  const currentContent = normalizeUserTextContent(b.message.content)
  return {
    ...a,
    message: { ...a.message, content: hoistToolResults(mergeUserContentBlocks(lastContent, currentContent)) },
  }
}

/** Dos fragmentos del mismo asistente: el contenido se concatena. */
export function mergeAssistantMessages(a: AssistantMessage, b: AssistantMessage): AssistantMessage {
  return {
    ...a,
    message: {
      ...a.message,
      content: [...(arrayContent(a.message.content) ?? []), ...(arrayContent(b.message.content) ?? [])],
    },
  }
}

/** Un mensaje de usuario que lleva algun `tool_result`. */
function isToolResultMessage(msg: Message): boolean {
  if (msg.type !== 'user') return false
  return (arrayContent(msg.message.content) ?? []).some(block => block.type === 'tool_result')
}

/**
 * Dos usuarios contiguos en uno. Conserva el uuid del que NO es meta, para
 * que las etiquetas `[id:]` (derivadas del uuid) sean estables entre
 * llamadas: el contexto del sistema recibe un uuid nuevo cada vez.
 */
export function mergeUserMessages(a: UserMessage, b: UserMessage): UserMessage {
  const lastContent = normalizeUserTextContent(a.message.content)
  const currentContent = normalizeUserTextContent(b.message.content)
  // Un fundido es meta solo si TODOS sus operandos lo son. Va tras la
  // comprobacion completa de runtime porque cambiar `isMeta` afecta a otros
  // consumidores (el hash de fixtures VCR): solo cuando el recorte esta
  // activo de verdad.
  if (feature('HISTORY_SNIP') && isSnipRuntimeEnabled()) {
    return {
      ...a,
      isMeta: a.isMeta && b.isMeta ? true : undefined,
      uuid: a.isMeta ? b.uuid : a.uuid,
      message: { ...a.message, content: hoistToolResults(joinTextAtSeam(lastContent, currentContent)) },
    }
  }
  return {
    ...a,
    uuid: a.isMeta ? b.uuid : a.uuid,
    message: { ...a.message, content: hoistToolResults(joinTextAtSeam(lastContent, currentContent)) },
  }
}

/** Funde cada par de usuarios contiguos de la lista. */
function mergeAdjacentUserMessages(msgs: ApiMessage[]): ApiMessage[] {
  const out: ApiMessage[] = []
  for (const m of msgs) {
    const prev = out.at(-1)
    if (m.type === 'user' && prev?.type === 'user') {
      out[out.length - 1] = mergeUserMessages(prev, m)
    } else {
      out.push(m)
    }
  }
  return out
}

/**
 * Los `tool_result` van primero en el contenido de un usuario: si no, el API
 * responde «tool result must follow tool use».
 */
function hoistToolResults(content: ContentBlockParam[]): ContentBlockParam[] {
  const toolResults: ContentBlockParam[] = []
  const otherBlocks: ContentBlockParam[] = []
  for (const block of content) {
    if (block.type === 'tool_result') toolResults.push(block)
    else otherBlocks.push(block)
  }
  return [...toolResults, ...otherBlocks]
}

/**
 * El contenido de un usuario como arreglo de bloques. La fuente lo declara
 * `string | ContentBlockParam[]`; aqui `message.content` es opcional en la
 * forma, y un contenido ausente se trata como vacio.
 */
function normalizeUserTextContent(a: MessageContent | undefined): ContentBlockParam[] {
  if (typeof a === 'string') return [{ type: 'text', text: a }]
  return arrayContent(a) ?? []
}

/**
 * Concatena dos arreglos apendando `\n` al ultimo texto de `a` cuando la
 * costura es texto-texto: el API concatena textos adyacentes sin separador,
 * y dos prompts encolados «2 + 2» y «3 + 3» llegarian como «2 + 23 + 3». El
 * `\n` va del lado de `a` para que ningun `startsWith` de `b` cambie — el
 * pliegue clasifica por `startsWith('<system-reminder>')`.
 */
function joinTextAtSeam(a: ContentBlockParam[], b: ContentBlockParam[]): ContentBlockParam[] {
  const lastA = a.at(-1)
  const firstB = b[0]
  if (lastA?.type === 'text' && firstB?.type === 'text') {
    return [...a.slice(0, -1), { ...lastA, text: lastA.text + '\n' }, ...b]
  }
  return [...a, ...b]
}

/** Un elemento admitido dentro de `tool_result.content`. */
type ToolResultContentItem = Extract<ToolResultBlockParam['content'], readonly unknown[]>[number]

/**
 * Pliega bloques dentro del contenido de un `tool_result`. Devuelve el
 * bloque actualizado, o `null` si no se puede (un `tool_reference` no admite
 * mezcla — ValueError del servidor).
 *
 * - contenido cadena/ausente + solo textos → cadena (forma heredada)
 * - contenido arreglo con tool_reference → null
 * - resto → arreglo, con los textos adyacentes fundidos
 */
function smooshIntoToolResult(tr: ToolResultBlockParam, blocks: ContentBlockParam[]): ToolResultBlockParam | null {
  if (blocks.length === 0) return tr

  const existing = tr.content
  if (Array.isArray(existing) && existing.some(isToolReferenceBlock)) return null

  // Un tool_result con is_error solo admite texto. Los hermanos de un
  // comando encolado pueden traer imagenes; plegarlas en un error produce un
  // transcript que da 400 en cada llamada. La imagen no se pierde: llega
  // como turno de usuario propio.
  let incoming = blocks
  if (tr.is_error) {
    incoming = incoming.filter(b => b.type === 'text')
    if (incoming.length === 0) return tr
  }

  const incomingTexts = incoming.flatMap(b => (b.type === 'text' ? [b.text.trim()] : []))
  const allText = incomingTexts.length === incoming.length

  // Forma de cadena cuando lo existente era cadena o nada y todo lo que
  // entra es texto: el caso comun (recordatorios de hooks en Bash/Read).
  if (allText && (existing === undefined || typeof existing === 'string')) {
    const joined = [(typeof existing === 'string' ? existing : '').trim(), ...incomingTexts].filter(Boolean).join('\n\n')
    return { ...tr, content: joined }
  }

  // Caso general: a arreglo, concatenar, fundir textos adyacentes.
  const base: ToolResultContentItem[] =
    existing === undefined
      ? []
      : typeof existing === 'string'
        ? existing.trim()
          ? [{ type: 'text', text: existing.trim() }]
          : []
        : [...existing]

  const merged: ToolResultContentItem[] = []
  for (const b of [...base, ...incoming]) {
    if (b.type === 'text') {
      const t = b.text.trim()
      if (!t) continue
      const prev = merged.at(-1)
      if (prev?.type === 'text') {
        merged[merged.length - 1] = { ...prev, text: `${prev.text}\n\n${t}` }
      } else {
        merged.push({ type: 'text', text: t })
      }
    } else {
      // image / search_result / document pasan tal cual. El cast es el de la
      // fuente: `ContentBlockParam` es mas ancho que lo admitido dentro de un
      // tool_result, y quien llama ya filtro los tool_result hermanos.
      merged.push(b as ToolResultContentItem)
    }
  }

  return { ...tr, content: merged }
}

/**
 * Concatena dos contenidos de usuario. Si `a` termina en `tool_result`, los
 * bloques de `b` se pliegan dentro de el: cualquier hermano tras un
 * tool_result renderiza como `</function_results>\n\nHuman:`, y repetido a
 * media conversacion ensena al modelo a emitir `Human:` en una cola desnuda
 * (A/B: 92% → 0%).
 */
export function mergeUserContentBlocks(a: ContentBlockParam[], b: ContentBlockParam[]): ContentBlockParam[] {
  const lastBlock = a.at(-1)
  if (lastBlock?.type !== 'tool_result') return [...a, ...b]

  if (!checkStatsigFeatureGate_CACHED_MAY_BE_STALE('tengu_chair_sermon')) {
    // Pliegue heredado (sin bandera): solo tool_result con contenido cadena y
    // hermanos de solo texto → cadena unida. La precondicion garantiza que
    // `smooshIntoToolResult` toma su rama de cadena (nunca `null`); la fuente
    // lo afirma con `!`, aqui se comprueba.
    if (typeof lastBlock.content === 'string' && b.every(x => x.type === 'text')) {
      const smooshed = smooshIntoToolResult(lastBlock, b)
      if (smooshed === null) return [...a, ...b]
      return [...a.slice(0, -1), smooshed]
    }
    return [...a, ...b]
  }

  // Pliegue universal (con bandera): todo lo que no sea tool_result entra en
  // el contenido; los tool_result de `b` siguen como hermanos (los iza
  // `hoistToolResults` despues).
  const toSmoosh = b.filter(x => x.type !== 'tool_result')
  const toolResults = b.filter(x => x.type === 'tool_result')
  if (toSmoosh.length === 0) return [...a, ...b]

  const smooshed = smooshIntoToolResult(lastBlock, toSmoosh)
  if (smooshed === null) return [...a, ...b] // restriccion de tool_reference

  return [...a.slice(0, -1), smooshed, ...toolResults]
}

/**
 * Retira los bloques de thinking finales del ULTIMO asistente: el API no
 * admite que la respuesta a prellenar termine en thinking. Si todo era
 * thinking, queda un marcador.
 */
function filterTrailingThinkingFromLastAssistant(messages: ApiMessage[]): ApiMessage[] {
  const lastMessage = messages.at(-1)
  if (!lastMessage || lastMessage.type !== 'assistant') return messages

  const content = arrayContent(lastMessage.message.content)
  if (!content) return messages
  const lastBlock = content.at(-1)
  if (!lastBlock || !isThinkingParam(lastBlock)) return messages

  let lastValidIndex = content.length - 1
  while (lastValidIndex >= 0) {
    const block = content[lastValidIndex]
    if (!block || !isThinkingParam(block)) break
    lastValidIndex--
  }

  logEvent('tengu_filtered_trailing_thinking_block', {
    messageUUID: lastMessage.uuid,
    blocksRemoved: content.length - lastValidIndex - 1,
    remainingBlocks: lastValidIndex + 1,
  })

  const filteredContent: ContentBlockParam[] =
    lastValidIndex < 0
      ? [{ type: 'text', text: '[No message content]', citations: [] }]
      : content.slice(0, lastValidIndex + 1)

  const result = [...messages]
  result[messages.length - 1] = { ...lastMessage, message: { ...lastMessage.message, content: filteredContent } }
  return result
}

/**
 * Un asistente intermedio con contenido vacio recibe el centinela: el API lo
 * rechaza vacio. El ultimo se deja (puede estar vacio para prellenar).
 */
function ensureNonEmptyAssistantContent(messages: ApiMessage[]): ApiMessage[] {
  if (messages.length === 0) return messages

  let hasChanges = false
  const result = messages.map((message, index): ApiMessage => {
    if (message.type !== 'assistant' || index === messages.length - 1) return message
    const content = message.message.content
    if (Array.isArray(content) && content.length === 0) {
      hasChanges = true
      logEvent('tengu_fixed_empty_assistant_content', { messageUUID: message.uuid, messageIndex: index })
      return {
        ...message,
        message: { ...message.message, content: [{ type: 'text', text: NO_CONTENT_MESSAGE, citations: [] }] },
      }
    }
    return message
  })

  return hasChanges ? result : messages
}

/** Un campo del adjunto como cadena; lo que no es cadena se lee como `''`. */
function attachmentString(attachment: ApiAttachment, key: string): string {
  const value = attachment[key]
  return typeof value === 'string' ? value : ''
}

/** Un campo del adjunto como arreglo; lo que no lo es se lee como vacio. */
function attachmentArray(attachment: ApiAttachment, key: string): unknown[] {
  const value = attachment[key]
  return Array.isArray(value) ? value : []
}

/** Un campo del adjunto como objeto llano, o `undefined`. */
function attachmentRecord(attachment: ApiAttachment, key: string): Record<string, unknown> | undefined {
  const value = attachment[key]
  return isPlainRecord(value) ? value : undefined
}

/** Un campo de un objeto llano como cadena, o `''`. */
function recordString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  return typeof value === 'string' ? value : ''
}

/** Contenido de mensaje que `createUserMessage` acepta, o `undefined`. */
function asUserContent(value: unknown): string | ContentBlockParam[] | undefined {
  if (typeof value === 'string') return value
  // Un arreglo de bloques del hook: se confia en su forma, como la fuente,
  // que lo castea a `string | ContentBlockParam[]`.
  return Array.isArray(value) ? (value as ContentBlockParam[]) : undefined
}

/**
 * Rinde un adjunto como los mensajes de usuario que van al API.
 *
 * PORTE PARCIAL DECLARADO de `ccnmt: packages/agent/messages.ts:3537-4379`
 * (57 casos). Se portan los casos que solo necesitan `createUserMessage`,
 * el envoltorio `<system-reminder>` y constantes que este arbol ya tiene.
 * Los campos del adjunto se leen por nombre desde la forma abierta
 * `{ type: string; [key: string]: unknown }` de `AttachmentMessage` —la fuente
 * tiene un tipo por adjunto—, con lectores que degradan a `''`/`[]` en vez
 * de fallar.
 *
 * Casos NO portados, cada uno con lo que lo bloquea:
 *
 * - `teammate_mailbox`: `formatTeammateMessages` del paquete `swarm`,
 *   ausente aqui.
 * - `directory`, `file`: sintetizan un par tool_use/tool_result con
 *   `BashTool`/`FileReadTool` (`createToolUseMessage`,
 *   `createToolResultMessage`), que no estan en este modulo.
 * - `queued_command`: `wrapCommandText` y el origen `MessageOrigin` de la
 *   cola, sin hogar en este arbol.
 * - `diagnostics`: `DiagnosticTrackingService.formatDiagnosticsSummary`.
 * - `plan_mode`, `auto_mode`: `getPlanModeInstructions` y
 *   `getAutoModeInstructions`, constructores de prompt no portados.
 * - `relevant_memories`: se porta solo con la cabecera almacenada
 *   (`m.header`); el respaldo `memoryHeader(path, mtimeMs)` no existe aqui,
 *   asi que una memoria sin cabecera guardada se rinde sin ella.
 *
 * Para esos casos se devuelve `[]` con un aviso por `logForDebugging`, en
 * vez de tratarlos como desconocidos: su tipo si existe, lo que falta es
 * su renderizador. El registro de tipo desconocido (`logAntError`) queda
 * para los que la fuente tampoco conoce.
 */
export function normalizeAttachmentForAPI(attachment: ApiAttachment): UserMessage[] {
  const meta = (content: string | ContentBlockParam[]): UserMessage => createUserMessage({ content, isMeta: true })
  const reminder = (content: string): UserMessage[] => [meta(wrapInSystemReminder(content))]

  if (isAgentSwarmsEnabled() && attachment.type === 'team_context') {
    return [
      meta(`<system-reminder>
# Team Coordination

You are a teammate in team "${attachmentString(attachment, 'teamName')}".

**Your Identity:**
- Name: ${attachmentString(attachment, 'agentName')}

**Team Resources:**
- Team config: ${attachmentString(attachment, 'teamConfigPath')}
- Task list: ${attachmentString(attachment, 'taskListPath')}

**Team Leader:** The team lead's name is "team-lead". Send updates and completion notifications to them.

Read the team config to discover your teammates' names. Check the task list periodically. Create new tasks when work should be divided. Mark tasks resolved when complete.

**IMPORTANT:** Always refer to teammates by their NAME (e.g., "team-lead", "analyzer", "researcher"), never by UUID. When messaging, use the name directly:

\`\`\`json
{
  "to": "team-lead",
  "message": "Your message here",
  "summary": "Brief 5-10 word preview"
}
\`\`\`
</system-reminder>`),
    ]
  }

  // Fuera del `switch` para que el literal viva bajo la bandera de compilacion.
  if (feature('EXPERIMENTAL_SKILL_SEARCH') && attachment.type === 'skill_discovery') {
    const skills = attachmentArray(attachment, 'skills').filter(isPlainRecord)
    if (skills.length === 0) return []
    const lines = skills.map(s => `- ${recordString(s, 'name')}: ${recordString(s, 'description')}`)
    return wrapMessagesInSystemReminder([
      meta(
        `Skills relevant to your task:\n\n${lines.join('\n')}\n\n` +
          `These skills encode project-specific conventions. ` +
          `Invoke via Skill("<name>") for complete instructions.`,
      ),
    ])
  }

  switch (attachment.type) {
    case 'edited_text_file':
      return wrapMessagesInSystemReminder([
        meta(
          `Note: ${attachmentString(attachment, 'filename')} was modified, either by the user or by a linter. This change was intentional, so make sure to take it into account as you proceed (ie. don't revert it unless the user asks you to). Don't tell the user this, since they are already aware. Here are the relevant changes (shown with line numbers):\n${attachmentString(attachment, 'snippet')}`,
        ),
      ])
    case 'compact_file_reference':
      return wrapMessagesInSystemReminder([
        meta(
          `Note: ${attachmentString(attachment, 'filename')} was read before the last conversation was summarized, but the contents are too large to include. Use ${FILE_READ_TOOL_NAME} tool if you need to access it.`,
        ),
      ])
    case 'pdf_reference': {
      const fileSize = typeof attachment.fileSize === 'number' ? attachment.fileSize : 0
      return wrapMessagesInSystemReminder([
        meta(
          `PDF file: ${attachmentString(attachment, 'filename')} (${String(attachment.pageCount)} pages, ${formatFileSize(fileSize)}). ` +
            `This PDF is too large to read all at once. You MUST use the ${FILE_READ_TOOL_NAME} tool with the pages parameter ` +
            `to read specific page ranges (e.g., pages: "1-5"). Do NOT call ${FILE_READ_TOOL_NAME} without the pages parameter ` +
            `or it will fail. Start by reading the first few pages to understand the structure, then read more as needed. ` +
            `Maximum 20 pages per request.`,
        ),
      ])
    }
    case 'selected_lines_in_ide': {
      const maxSelectionLength = 2000
      const raw = attachmentString(attachment, 'content')
      const content = raw.length > maxSelectionLength ? raw.substring(0, maxSelectionLength) + '\n... (truncated)' : raw
      return wrapMessagesInSystemReminder([
        meta(
          `The user selected the lines ${String(attachment.lineStart)} to ${String(attachment.lineEnd)} from ${attachmentString(attachment, 'filename')}:\n${content}\n\nThis may or may not be related to the current task.`,
        ),
      ])
    }
    case 'opened_file_in_ide':
      return wrapMessagesInSystemReminder([
        meta(
          `The user opened the file ${attachmentString(attachment, 'filename')} in the IDE. This may or may not be related to the current task.`,
        ),
      ])
    case 'plan_file_reference':
      return wrapMessagesInSystemReminder([
        meta(
          `A plan file exists from plan mode at: ${attachmentString(attachment, 'planFilePath')}\n\nPlan contents:\n\n${attachmentString(attachment, 'planContent')}\n\nIf this plan is relevant to the current work and not already complete, continue working on it.`,
        ),
      ])
    case 'invoked_skills': {
      const skills = attachmentArray(attachment, 'skills').filter(isPlainRecord)
      if (skills.length === 0) return []
      const skillsContent = skills
        .map(skill => `### Skill: ${recordString(skill, 'name')}\nPath: ${recordString(skill, 'path')}\n\n${recordString(skill, 'content')}`)
        .join('\n\n---\n\n')
      return wrapMessagesInSystemReminder([
        meta(`The following skills were invoked in this session. Continue to follow these guidelines:\n\n${skillsContent}`),
      ])
    }
    case 'todo_reminder': {
      const todoItems = attachmentArray(attachment, 'content')
        .filter(isPlainRecord)
        .map((todo, index) => `${index + 1}. [${recordString(todo, 'status')}] ${recordString(todo, 'content')}`)
        .join('\n')
      let message = `The TodoWrite tool hasn't been used recently. If you're working on tasks that would benefit from tracking progress, consider using the TodoWrite tool to track progress. Also consider cleaning up the todo list if has become stale and no longer matches what you are working on. Only use it if it's relevant to the current work. This is just a gentle reminder - ignore if not applicable. Make sure that you NEVER mention this reminder to the user\n`
      if (todoItems.length > 0) message += `\n\nHere are the existing contents of your todo list:\n\n[${todoItems}]`
      return wrapMessagesInSystemReminder([meta(message)])
    }
    case 'task_reminder': {
      if (!isTodoV2Enabled()) return []
      const taskItems = attachmentArray(attachment, 'content')
        .filter(isPlainRecord)
        .map(task => `#${String(task.id)}. [${recordString(task, 'status')}] ${recordString(task, 'subject')}`)
        .join('\n')
      let message = `The task tools haven't been used recently. If you're working on tasks that would benefit from tracking progress, consider using ${TASK_CREATE_TOOL_NAME} to add new tasks and ${TASK_UPDATE_TOOL_NAME} to update task status (set to in_progress when starting, completed when done). Also consider cleaning up the task list if it has become stale. Only use these if relevant to the current work. This is just a gentle reminder - ignore if not applicable. Make sure that you NEVER mention this reminder to the user\n`
      if (taskItems.length > 0) message += `\n\nHere are the existing tasks:\n\n${taskItems}`
      return wrapMessagesInSystemReminder([meta(message)])
    }
    case 'nested_memory': {
      const content = attachmentRecord(attachment, 'content')
      return wrapMessagesInSystemReminder([
        meta(`Contents of ${content ? recordString(content, 'path') : ''}:\n\n${content ? recordString(content, 'content') : ''}`),
      ])
    }
    case 'relevant_memories':
      return wrapMessagesInSystemReminder(
        attachmentArray(attachment, 'memories')
          .filter(isPlainRecord)
          .map(m => {
            // La cabecera guardada al crear el adjunto mantiene los bytes
            // estables entre turnos (acierto de cache). pendiente: el respaldo
            // `memoryHeader(path, mtimeMs)` para sesiones anteriores al campo.
            const header = recordString(m, 'header')
            return meta(header ? `${header}\n\n${recordString(m, 'content')}` : recordString(m, 'content'))
          }),
      )
    case 'dynamic_skill':
      // Solo informativo para la UI: los skills se cargan aparte.
      return []
    case 'skill_listing': {
      const content = attachmentString(attachment, 'content')
      if (!content) return []
      return wrapMessagesInSystemReminder([
        meta(`The following skills are available for use with the Skill tool:\n\n${content}`),
      ])
    }
    case 'output_style': {
      const style = attachmentString(attachment, 'style')
      const outputStyle = Object.hasOwn(OUTPUT_STYLE_CONFIG, style)
        ? OUTPUT_STYLE_CONFIG[style as keyof typeof OUTPUT_STYLE_CONFIG]
        : null
      if (!outputStyle) return []
      const turnReminder = 'turnReminder' in outputStyle && typeof outputStyle.turnReminder === 'string'
        ? outputStyle.turnReminder
        : 'Remember to follow the specific guidelines for this style.'
      return wrapMessagesInSystemReminder([meta(`${outputStyle.name} output style is active. ${turnReminder}`)])
    }
    case 'plan_mode_reentry': {
      const content = `## Re-entering Plan Mode

You are returning to plan mode after having previously exited it. A plan file exists at ${attachmentString(attachment, 'planFilePath')} from your previous planning session.

**Before proceeding with any new planning, you should:**
1. Read the existing plan file to understand what was previously planned
2. Evaluate the user's current request against that plan
3. Decide how to proceed:
   - **Different task**: If the user's request is for a different task—even if it's similar or related—start fresh by overwriting the existing plan
   - **Same task, continuing**: If this is explicitly a continuation or refinement of the exact same task, modify the existing plan while cleaning up outdated or irrelevant sections
4. Continue on with the plan process and most importantly you should always edit the plan file one way or the other before calling ${EXIT_PLAN_MODE_V2_TOOL_NAME}

Treat this as a fresh planning session. Do not assume the existing plan is relevant without evaluating it first.`
      return wrapMessagesInSystemReminder([meta(content)])
    }
    case 'plan_mode_exit': {
      const planReference = attachment.planExists
        ? ` The plan file is located at ${attachmentString(attachment, 'planFilePath')} if you need to reference it.`
        : ''
      return wrapMessagesInSystemReminder([
        meta(`## Exited Plan Mode

You have exited plan mode. You can now make edits, run tools, and take actions.${planReference}`),
      ])
    }
    case 'auto_mode_exit':
      return wrapMessagesInSystemReminder([
        meta(`## Exited Auto Mode

You have exited auto mode. The user may now want to interact more directly. You should ask clarifying questions when the approach is ambiguous rather than making assumptions.`),
      ])
    case 'critical_system_reminder':
      return wrapMessagesInSystemReminder([meta(attachmentString(attachment, 'content'))])
    case 'mcp_resource': {
      const server = attachmentString(attachment, 'server')
      const uri = attachmentString(attachment, 'uri')
      const content = attachmentRecord(attachment, 'content')
      const contents = content ? content.contents : undefined
      if (!Array.isArray(contents) || contents.length === 0) {
        return wrapMessagesInSystemReminder([
          meta(`<mcp-resource server="${server}" uri="${uri}">(No content)</mcp-resource>`),
        ])
      }
      // Solo el contenido de texto; lo binario se anuncia por su tipo MIME.
      const transformedBlocks: ContentBlockParam[] = []
      for (const item of contents) {
        if (!isPlainRecord(item)) continue
        if (typeof item.text === 'string') {
          transformedBlocks.push(
            { type: 'text', text: 'Full contents of resource:' },
            { type: 'text', text: item.text },
            {
              type: 'text',
              text: 'Do NOT read this resource again unless you think it may have changed, since you already have the full contents.',
            },
          )
        } else if ('blob' in item) {
          const mimeType = 'mimeType' in item ? String(item.mimeType) : 'application/octet-stream'
          transformedBlocks.push({ type: 'text', text: `[Binary content: ${mimeType}]` })
        }
      }
      if (transformedBlocks.length > 0) return wrapMessagesInSystemReminder([meta(transformedBlocks)])
      // La fuente lo registra con `logMCPDebug`; aqui, con el registro de
      // depuracion generico — no hay hogar para el registro por servidor.
      logForDebugging(`No displayable content found in MCP resource ${uri} (server ${server}).`)
      return wrapMessagesInSystemReminder([
        meta(`<mcp-resource server="${server}" uri="${uri}">(No displayable content)</mcp-resource>`),
      ])
    }
    case 'agent_mention':
      return wrapMessagesInSystemReminder([
        meta(
          `The user has expressed a desire to invoke the agent "${attachmentString(attachment, 'agentType')}". Please invoke the agent appropriately, passing in the required context to it. `,
        ),
      ])
    case 'task_status': {
      const status = attachmentString(attachment, 'status')
      const description = attachmentString(attachment, 'description')
      const taskId = attachmentString(attachment, 'taskId')
      const deltaSummary = attachmentString(attachment, 'deltaSummary')
      const outputFilePath = attachmentString(attachment, 'outputFilePath')
      const displayStatus = status === 'killed' ? 'stopped' : status

      // Detenida: breve, el delta no aporta.
      if (status === 'killed') {
        return reminder(`Task "${description}" (${taskId}) was stopped by the user.`)
      }
      // En curso: advertir contra un duplicado — este adjunto solo se emite
      // tras compactar, cuando el mensaje de lanzamiento original ya no esta.
      if (status === 'running') {
        const parts = [`Background agent "${description}" (${taskId}) is still running.`]
        if (deltaSummary) parts.push(`Progress: ${deltaSummary}`)
        parts.push(
          outputFilePath
            ? `Do NOT spawn a duplicate. You will be notified when it completes. You can read partial output at ${outputFilePath} or send it a message with ${SEND_MESSAGE_TOOL_NAME}.`
            : `Do NOT spawn a duplicate. You will be notified when it completes. You can check its progress with the ${TASK_OUTPUT_TOOL_NAME} tool or send it a message with ${SEND_MESSAGE_TOOL_NAME}.`,
        )
        return reminder(parts.join(' '))
      }
      // Terminada o fallida: el delta completo.
      const messageParts: string[] = [
        `Task ${taskId}`,
        `(type: ${attachmentString(attachment, 'taskType')})`,
        `(status: ${displayStatus})`,
        `(description: ${description})`,
      ]
      if (deltaSummary) messageParts.push(`Delta: ${deltaSummary}`)
      messageParts.push(
        outputFilePath
          ? `Read the output file to retrieve the result: ${outputFilePath}`
          : `You can check its output using the ${TASK_OUTPUT_TOOL_NAME} tool.`,
      )
      return reminder(messageParts.join(' '))
    }
    case 'async_hook_response': {
      const response = attachmentRecord(attachment, 'response')
      const messages: UserMessage[] = []
      const systemMessage = response ? asUserContent(response.systemMessage) : undefined
      if (systemMessage) messages.push(meta(systemMessage))
      const hookSpecificOutput = response && isPlainRecord(response.hookSpecificOutput) ? response.hookSpecificOutput : undefined
      const additionalContext = hookSpecificOutput ? asUserContent(hookSpecificOutput.additionalContext) : undefined
      if (additionalContext) messages.push(meta(additionalContext))
      return wrapMessagesInSystemReminder(messages)
    }
    case 'token_usage':
      return reminder(
        `Token usage: ${String(attachment.used)}/${String(attachment.total)}; ${String(attachment.remaining)} remaining`,
      )
    case 'budget_usd':
      return reminder(
        `USD budget: $${String(attachment.used)}/$${String(attachment.total)}; $${String(attachment.remaining)} remaining`,
      )
    case 'output_token_usage': {
      const turn = typeof attachment.turn === 'number' ? attachment.turn : 0
      const session = typeof attachment.session === 'number' ? attachment.session : 0
      const turnText =
        typeof attachment.budget === 'number' ? `${formatNumber(turn)} / ${formatNumber(attachment.budget)}` : formatNumber(turn)
      return reminder(`Output tokens — turn: ${turnText} · session: ${formatNumber(session)}`)
    }
    case 'hook_blocking_error': {
      const blockingError = attachmentRecord(attachment, 'blockingError')
      return reminder(
        `${attachmentString(attachment, 'hookName')} hook blocking error from command: "${blockingError ? recordString(blockingError, 'command') : ''}": ${blockingError ? recordString(blockingError, 'blockingError') : ''}`,
      )
    }
    case 'hook_success': {
      const hookEvent = attachment.hookEvent
      if (hookEvent !== 'SessionStart' && hookEvent !== 'UserPromptSubmit') return []
      const content = attachmentString(attachment, 'content')
      if (content === '') return []
      return reminder(`${attachmentString(attachment, 'hookName')} hook success: ${content}`)
    }
    case 'hook_additional_context': {
      const content = attachmentArray(attachment, 'content')
      if (content.length === 0) return []
      return reminder(`${attachmentString(attachment, 'hookName')} hook additional context: ${content.join('\n')}`)
    }
    case 'hook_stopped_continuation':
      return reminder(
        `${attachmentString(attachment, 'hookName')} hook stopped continuation: ${attachmentString(attachment, 'message')}`,
      )
    case 'compaction_reminder':
      return wrapMessagesInSystemReminder([
        meta(
          'Auto-compact is enabled. When the context window is nearly full, older messages will be automatically summarized so you can continue working seamlessly. There is no need to stop or rush — you have unlimited context through automatic compaction.',
        ),
      ])
    case 'context_efficiency':
      if (feature('HISTORY_SNIP')) return wrapMessagesInSystemReminder([meta(SNIP_NUDGE_TEXT)])
      return []
    case 'date_change':
      return wrapMessagesInSystemReminder([
        meta(
          `The date has changed. Today's date is now ${attachmentString(attachment, 'newDate')}. DO NOT mention this to the user explicitly because they are already aware.`,
        ),
      ])
    case 'ultrathink_effort':
      return wrapMessagesInSystemReminder([
        meta(`The user has requested reasoning effort level: ${attachmentString(attachment, 'level')}. Apply this to the current turn.`),
      ])
    case 'ultrawork_request':
      return wrapMessagesInSystemReminder([
        meta('The user included the keyword "ultrawork", which means you should use the Workflow tool to fulfill their request.'),
      ])
    case 'deferred_tools_delta': {
      const parts: string[] = []
      const addedLines = attachmentArray(attachment, 'addedLines')
      const removedNames = attachmentArray(attachment, 'removedNames')
      if (addedLines.length > 0) {
        parts.push(`The following deferred tools are now available via ToolSearch:\n${addedLines.join('\n')}`)
      }
      if (removedNames.length > 0) {
        parts.push(
          `The following deferred tools are no longer available (their MCP server disconnected). Do not search for them — ToolSearch will return no match:\n${removedNames.join('\n')}`,
        )
      }
      return wrapMessagesInSystemReminder([meta(parts.join('\n\n'))])
    }
    case 'agent_listing_delta': {
      const parts: string[] = []
      const addedLines = attachmentArray(attachment, 'addedLines')
      const removedTypes = attachmentArray(attachment, 'removedTypes')
      if (addedLines.length > 0) {
        const header = attachment.isInitial
          ? 'Available agent types for the Agent tool:'
          : 'New agent types are now available for the Agent tool:'
        parts.push(`${header}\n${addedLines.join('\n')}`)
      }
      if (removedTypes.length > 0) {
        parts.push(`The following agent types are no longer available:\n${removedTypes.map(t => `- ${String(t)}`).join('\n')}`)
      }
      if (attachment.isInitial && attachment.showConcurrencyNote) {
        parts.push(
          `Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses.`,
        )
      }
      return wrapMessagesInSystemReminder([meta(parts.join('\n\n'))])
    }
    case 'mcp_instructions_delta': {
      const parts: string[] = []
      const addedBlocks = attachmentArray(attachment, 'addedBlocks')
      const removedNames = attachmentArray(attachment, 'removedNames')
      if (addedBlocks.length > 0) {
        parts.push(
          `# MCP Server Instructions\n\nThe following MCP servers have provided instructions for how to use their tools and resources:\n\n${addedBlocks.join('\n\n')}`,
        )
      }
      if (removedNames.length > 0) {
        parts.push(`The following MCP servers have disconnected. Their instructions above no longer apply:\n${removedNames.join('\n')}`)
      }
      return wrapMessagesInSystemReminder([meta(parts.join('\n\n'))])
    }
    case 'verify_plan_reminder': {
      // La comparacion con `'true'` permite eliminar la cadena en builds
      // externas, donde la variable vale `'false'`.
      const toolName = readEnv('CLAUDE_CODE_VERIFY_PLAN') === 'true' ? 'VerifyPlanExecution' : ''
      return wrapMessagesInSystemReminder([
        meta(
          `You have completed implementing the plan. Please call the "${toolName}" tool directly (NOT the ${AGENT_TOOL_NAME} tool or an agent) to verify that all plan items were completed correctly.`,
        ),
      ])
    }
    case 'already_read_file':
    case 'command_permissions':
    case 'edited_image_file':
    case 'hook_cancelled':
    case 'hook_error_during_execution':
    case 'hook_non_blocking_error':
    case 'hook_system_message':
    case 'structured_output':
    case 'hook_permission_decision':
      return []
    case 'teammate_mailbox':
    case 'directory':
    case 'file':
    case 'queued_command':
    case 'diagnostics':
    case 'plan_mode':
    case 'auto_mode':
      // Los casos sin renderizador en este porte (ver la cabecera).
      logForDebugging(`normalizeAttachmentForAPI: renderer not ported for attachment type ${attachment.type}`, {
        level: 'warn',
      })
      return []
    default:
      break
  }

  // Adjuntos heredados ya retirados: una sesion reanudada puede traerlos, y
  // no son un error.
  const LEGACY_ATTACHMENT_TYPES = ['autocheckpointing', 'background_task_status', 'todo', 'task_progress', 'ultramemory']
  if (LEGACY_ATTACHMENT_TYPES.includes(attachment.type)) return []

  logAntError('normalizeAttachmentForAPI', new Error(`Unknown attachment type: ${attachment.type}`))
  return []
}
