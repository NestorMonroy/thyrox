/**
 * El texto que llega de un par, con sus etiquetas de mensaje neutralizadas:
 * un cuerpo no puede abrir ni cerrar un `cross-session-message`, un
 * `teammate-message` ni un `agent-message` propios. Porte de `se`, `K`, `aYe`,
 * `X4n`, `ie`, `H`, `oe`, `ae`, `z`, `de`, `ue`, `ce`, `fe`, `lYe`, `Wce` y
 * `dpt` (`chunk-5mcqvwzx.js`), y de `O`, `E`, `d`, `P`, `h`, `ioe`, `g9r`,
 * `m`, `_` y `S` (`chunk-zgj26xgq.js`) de 2.1.283; `rN`, `p1t` y `fj` de
 * `chunk-fmsbxtrp.js`, `ufn` de `chunk-q8a07cv0.js` y `Fte` de
 * `chunk-t6pwageh.js`.
 *
 * Un texto con forma de JSON se trata aparte: la barra que neutraliza una
 * apertura tiene que ir escapada, y una apertura puede estar escrita como
 * `<` dentro de una cadena.
 *
 * `ve` (`chunk-5mcqvwzx.js`) no se porta: la referencia no lo usa en ningún
 * chunk.
 */
import { ENVELOPE_TAG } from './peerEnvelope.ts'
import { TAG_CLASSES } from './tagClose.ts'
import { createTagFormScrubber, type TagFormScrubber } from './tagFormScrub.ts'
import { escapeXmlAttribute } from './xmlText.ts'

/** `rN`. */
export const TEAMMATE_MESSAGE_TAG = 'teammate-message'
/** `p1t`. */
export const AGENT_MESSAGE_TAG = 'agent-message'
/** `Fte`: la herramienta de mensajes que puede escribir un sobre sin `from`. */
export const MCP_SEND_MESSAGE_TOOL = 'mcp_send_message'

let scrubber: TagFormScrubber | undefined

/** `K`: el neutralizador de las tres etiquetas de mensaje, construido una vez. */
function messageTagScrubber(): TagFormScrubber {
  scrubber ??= createTagFormScrubber([{ tags: [ENVELOPE_TAG, TEAMMATE_MESSAGE_TAG, AGENT_MESSAGE_TAG] }])
  return scrubber
}

/** `aYe`. */
export function neutralizeMessageTags(text: string): string {
  return messageTagScrubber().neutralize(text)
}

/** `X4n`. */
export function messageTagOpenerOffsets(text: string): number[] {
  return messageTagScrubber().openerOffsets(text)
}

const OPENER = new RegExp(`[${TAG_CLASSES.open}]`, 'u')
/** `oe`: el comienzo de un objeto o una lista JSON. */
const JSON_START = /^\s*(?:\{\s*["}]|\[\s*(?:["{[\]\d-]|true\b|false\b|null\b))/
const JSON_ESCAPES = new Map([['"', '"'], ['\\', '\\'], ['/', '/'], ['b', '\b'], ['f', '\f'], ['n', '\n'], ['r', '\r'], ['t', '\t']])

/** `H`: si el texto puede contener una apertura: un carácter de apertura o un escape `\u`. */
function mayContainOpener(text: string): boolean {
  return OPENER.test(text) || text.includes('\\u')
}

/** `z`: la comilla que cierra la cadena abierta en `start`, o -1. */
function closingQuote(text: string, start: number): number {
  let position = start
  let backslashes = 1
  while (backslashes % 2 === 1) {
    position = text.indexOf('"', position + 1)
    if (position === -1) return -1
    backslashes = 0
    while (text.charCodeAt(position - backslashes - 1) === 92) backslashes++
  }
  return position
}

/** `de`: los tramos interiores de cada cadena JSON; una sin cerrar llega hasta el final. */
function jsonStringRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  let open = text.indexOf('"')
  while (open !== -1) {
    const close = closingQuote(text, open)
    if (close === -1) {
      ranges.push([open + 1, text.length])
      break
    }
    ranges.push([open + 1, close])
    open = text.indexOf('"', close + 1)
  }
  return ranges
}

/** `ue`: un objeto o lista JSON, o una sola cadena JSON. */
function looksLikeJson(text: string): boolean {
  if (JSON_START.test(text)) return true
  const first = text.search(/\S/)
  const close = text[first] === '"' ? closingQuote(text, first) : -1
  return close !== -1 && text.slice(close + 1).trim() === ''
}

/** `ce`: el tramo decodificado, con el principio y el fin en el original de cada carácter. */
function decodeJsonString(text: string, start: number, end: number): { value: string; starts: number[]; ends: number[] } {
  let value = ''
  const starts: number[] = []
  const ends: number[] = []
  for (let index = start; index < end; ) {
    let character = text[index]!
    let width = 1
    if (character === '\\' && index + 1 < end) {
      const simple = JSON_ESCAPES.get(text[index + 1]!)
      const hex = text.slice(index + 2, index + 6)
      if (simple !== undefined) {
        character = simple
        width = 2
      } else if (text[index + 1] === 'u' && index + 6 <= end && /^[0-9a-fA-F]{4}$/.test(hex)) {
        character = String.fromCharCode(parseInt(hex, 16))
        width = 6
      }
    }
    value += character
    starts.push(index)
    ends.push(index + width)
    index += width
  }
  return { value, starts, ends }
}

/**
 * `fe`: neutraliza las aperturas de un texto JSON, las literales y las que
 * sólo aparecen al decodificar una cadena. Una apertura `<` (o su escape) se
 * conserva y se le añade `\\`; un parecido se sustituye por `<\\`.
 */
function scrubJson(text: string): string {
  const edits = new Map<number, { end: number; keepsOpener: boolean }>()
  for (const offset of messageTagOpenerOffsets(text)) edits.set(offset, { end: offset + 1, keepsOpener: text[offset] === '<' })
  for (const [start, end] of jsonStringRanges(text)) {
    if (!mayContainOpener(text.slice(start, end))) continue
    const { value, starts, ends } = decodeJsonString(text, start, end)
    for (const offset of messageTagOpenerOffsets(value)) edits.set(starts[offset]!, { end: ends[offset]!, keepsOpener: value[offset] === '<' })
  }
  let result = ''
  let copiedUpTo = 0
  for (const offset of [...edits.keys()].sort((left, right) => left - right)) {
    const { end, keepsOpener } = edits.get(offset)!
    result += text.slice(copiedUpTo, keepsOpener ? end : offset) + (keepsOpener ? '\\\\' : '<\\\\')
    copiedUpTo = end
  }
  return result + text.slice(copiedUpTo)
}

/** `lYe`/`dpt`. */
export function scrubPeerText(text: string): string {
  if (!mayContainOpener(text)) return text
  return looksLikeJson(text) ? scrubJson(text) : neutralizeMessageTags(text)
}

/** `Wce`: un mensaje de agente con su remitente escapado y el cuerpo neutralizado. */
export function formatAgentMessage(from: string, text: string): string {
  return `<${AGENT_MESSAGE_TAG} from="${escapeXmlAttribute(from)}">\n${scrubPeerText(text)}\n</${AGENT_MESSAGE_TAG}>`
}

/** `O`: la apertura del sobre, con o sin atributos. */
const ENVELOPE_OPENING = new RegExp(`^<${ENVELOPE_TAG}[ \\t>]`)
/** `ufn`: la apertura del sobre con `from`. */
const ENVELOPE_OPENING_WITH_FROM = new RegExp(`^<${ENVELOPE_TAG} from="([^"]+)"`)
/** `E`. */
const ENVELOPE_CLOSING = `</${ENVELOPE_TAG}>`
/** `P`: un atributo `from-plugin`, con o sin valor, en cualquiera de sus formas de comillas. */
const FROM_PLUGIN_ATTRIBUTE = /\sfrom-plugin\s*(?:=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s>]*))?/gi
const FROM_PLUGIN = /from-plugin/i
/** `d`: cómo se unen los bloques de texto para buscar una etiqueta partida entre dos. */
const BLOCK_JOINERS = ['', '\n']

/** `S`: la apertura, hasta el primer `>`. */
function openingOf(text: string): string {
  const end = text.indexOf('>')
  return end < 0 ? text : text.slice(0, end)
}

/** `_`: la apertura sin `from-plugin`, seguida del resto tal cual. */
function withoutFromPlugin(text: string): string {
  const opening = openingOf(text)
  return opening.replace(FROM_PLUGIN_ATTRIBUTE, '') + text.slice(opening.length)
}

/**
 * `m`: un sobre bien formado conserva su `<` de apertura y su cierre, pierde
 * su `from-plugin` y se neutraliza por dentro; cualquier otra cosa se
 * neutraliza entera. Sin `from`, un sobre sólo cuenta si `allowWithoutFrom`.
 */
export function scrubEnvelopeContent(text: string, allowWithoutFrom: boolean): string {
  const trimmed = text.trimEnd()
  const closeAt = trimmed.length - ENVELOPE_CLOSING.length
  const hasFrom = ENVELOPE_OPENING_WITH_FROM.test(text)
  if (!(closeAt > 0 && trimmed.endsWith(ENVELOPE_CLOSING) && (hasFrom || (allowWithoutFrom && ENVELOPE_OPENING.test(text))))) return neutralizeMessageTags(text)
  const inner = withoutFromPlugin(text.slice(1, closeAt))
  return FROM_PLUGIN.test(openingOf(inner)) ? neutralizeMessageTags(text) : `<${neutralizeMessageTags(inner)}${text.slice(closeAt)}`
}

/** `g9r`: el texto de un mensaje `user` de un par, que puede llegar sin `from`. */
export function scrubPeerMessageText(text: string): string {
  return scrubEnvelopeContent(text, true)
}

type ContentBlock = { type: string; text?: string; [field: string]: unknown }

/**
 * `ioe`: el contenido del resultado de una herramienta. Un texto se trata
 * como sobre; una lista de bloques se revisa unida, primero sin separador y
 * luego con saltos de línea, para atrapar una etiqueta partida entre dos
 * bloques; la apertura se neutraliza en el bloque donde cae.
 */
export function scrubToolMessageContent<T>(content: T, toolName: string): T {
  if (typeof content === 'string') return scrubEnvelopeContent(content, toolName === MCP_SEND_MESSAGE_TOOL) as T
  if (!Array.isArray(content)) return content
  let blocks = content as ContentBlock[]
  for (const joiner of BLOCK_JOINERS) {
    const blockStarts: number[] = []
    const blockIndexes: number[] = []
    let joined = ''
    blocks.forEach((block, index) => {
      if (block.type !== 'text') return
      if (blockIndexes.length > 0) joined += joiner
      blockStarts.push(joined.length)
      blockIndexes.push(index)
      joined += block.text
    })
    const offsets = messageTagOpenerOffsets(joined)
    let edited: ContentBlock[] | undefined
    for (let position = offsets.length - 1; position >= 0; position--) {
      const offset = offsets[position]!
      let block = blockStarts.length - 1
      while (blockStarts[block]! > offset) block--
      edited ??= blocks.slice()
      const target = edited[blockIndexes[block]!]!
      if (target.type === 'text') {
        const at = offset - blockStarts[block]!
        edited[blockIndexes[block]!] = { ...target, text: `${target.text!.slice(0, at)}<\\${target.text!.slice(at + 1)}` }
      }
    }
    blocks = edited ?? blocks
  }
  return blocks as T
}
