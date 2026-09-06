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
 * Cobertura de este pase — **14 de 115**: las cadenas de contrato del
 * protocolo harness ↔ modelo, que son valores puros sin dependencia externa.
 * El resto NO esta portado y su ausencia es deliberada, no un olvido:
 * `porte-completo-no-parcial.md` admite el porte parcial **declarado**, nunca
 * el silencioso.
 *
 * Por que estas catorce primero: son el unico grupo de la fuente cuyo
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
