/**
 * El mensaje de progreso que el motor de hooks emite por cada hook que va a
 * lanzar, antes de lanzarlo. Porte de 2.1.281:
 *
 *   · `sanitizeForDisplay` ≙ `H9` · `displayText` ≙ `wm`
 *     (`chunk-nqsdwfmt.js`)
 *   · `truncateCodeUnits` ≙ `re` + `f` (`chunk-nqsdwfmt.js`)
 *   · `hookDisplayText` ≙ `ML` · `scriptDisplayText` ≙ `UHn` ·
 *     `hookProgressCommand` ≙ `tR` (`chunk-adsaemws.js`)
 *   · `buildHookProgressMessage` ≙ el `yield{message:{type:"progress",\u2026}}`
 *     del motor (`chunk-4n4g22z6.js`)
 *
 * Los volcados de estas funciones están en
 * `.claude/workbench/analizar-qwen-code-para-thyrox-20260924T201614/`
 * (`hook-progress-*.txt`).
 */
import { randomUUID } from 'node:crypto'
import type { HookEvent, HookProgress } from '../types/hooks.js'

/** `hj` del binario: el ancho del resumen de un hook `script`. */
const SCRIPT_DISPLAY_WIDTH = 60

const INVISIBLE = /[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\u2028\u2029]/gu
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|^[#*0-9]\uFE0F?\u20E3$/u
const TAG_FLAG = /^\u{1F3F4}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,6}\u{E007F}$/u

/**
 * Vuelve visible todo carácter de control, de formato o ignorable, sin
 * romper los emoji: dentro de un grafema pictográfico se respetan los
 * selectores de variación, el ZWJ interior y las etiquetas de bandera.
 * El salto de línea y el tabulador se conservan (≙ `H9`).
 */
export function sanitizeForDisplay(text: string): string {
  INVISIBLE.lastIndex = 0
  if (!INVISIBLE.test(text)) return text
  let out = ''
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) {
    const emoji = EMOJI.test(segment)
    const tagFlag = TAG_FLAG.test(segment)
    INVISIBLE.lastIndex = 0
    out += segment.replace(INVISIBLE, (char, offset: number) => {
      if (char === '\n' || char === '\t') return char
      const code = char.codePointAt(0) ?? 0
      if (
        emoji &&
        (char === '\uFE0F' || char === '\uFE0E' || char === '\u20E3' ||
          (char === '\u200D' && offset + char.length < segment.length) ||
          (tagFlag && code >= 0xe0020 && code <= 0xe007f))
      ) {
        return char
      }
      if (code === 27) return '\u241B'
      if (code < 32) return String.fromCodePoint(0x2400 + code)
      if (code === 127) return '\u2421'
      return `\\u{${code.toString(16).toUpperCase()}}`
    })
  }
  return out
}

/** `sanitizeForDisplay` más saltos y tabuladores visibles: una sola línea (≙ `wm`). */
export function displayText(text: string): string {
  return sanitizeForDisplay(text).replace(/\n/g, '\u2424').replace(/\t/g, '\u2409')
}

/**
 * Corta a `width` unidades de código sin dejar medio par sustituto; la
 * vuelta por UTF-16 reemplaza un sustituto huérfano (≙ `re` + `f`).
 */
export function truncateCodeUnits(text: string, width: number): string {
  if (width <= 0) return ''
  if (text.length <= width) return text
  let cut = text.slice(0, width)
  const last = cut.charCodeAt(width - 1)
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1)
  return Buffer.from(cut, 'utf16le').toString('utf16le')
}

/** La primera línea no vacía de un script, acotada y marcada si se cortó (≙ `UHn`). */
export function scriptDisplayText(script: string): string {
  const first = sanitizeForDisplay(script).split('\n').map(line => line.trim()).find(line => line.length > 0) ?? ''
  const shown = truncateCodeUnits(first, SCRIPT_DISPLAY_WIDTH)
  const cut = shown.length < first.length || script.trim().includes('\n')
  return `script: ${shown}${cut ? '\u2026' : ''}`
}

/** La forma de un hook que el texto de progreso necesita leer. */
export type HookDisplaySource = {
  type: string
  command?: string
  args?: string[]
  prompt?: string
  url?: string
  server?: string
  tool?: string
  file?: string
  script?: string
  statusMessage?: string
  [key: string]: unknown
}

/** El texto con que se nombra un hook según su tipo (≙ `ML`). */
export function hookDisplayText(hook: HookDisplaySource): string {
  switch (hook.type) {
    case 'command':
      return hook.args ? [hook.command ?? '', ...hook.args].join(' ') : (hook.command ?? '')
    case 'prompt':
    case 'agent':
      return hook.prompt ?? ''
    case 'http':
      return hook.url ?? ''
    case 'mcp_tool':
      return `${hook.server}/${hook.tool}`
    case 'script':
      return hook.file !== undefined ? displayText(hook.file) : scriptDisplayText(hook.script ?? '')
    case 'callback':
      return 'callback'
    case 'function':
      return 'function'
    default:
      return ''
  }
}

/** El comando que muestra el progreso: el `statusMessage` si lo hay (≙ `tR`). */
export function hookProgressCommand(hook: HookDisplaySource): string {
  return displayText('statusMessage' in hook && hook.statusMessage ? hook.statusMessage : hookDisplayText(hook))
}

/** El mensaje `progress` de un hook a punto de lanzarse. */
export type HookProgressMessage = {
  type: 'progress'
  data: HookProgress
  parentToolUseID: string
  toolUseID: string
  timestamp: string
  uuid: string
}

export function buildHookProgressMessage(
  hook: HookDisplaySource,
  hookEvent: HookEvent,
  hookName: string,
  toolUseID: string,
): HookProgressMessage {
  return {
    type: 'progress',
    data: {
      type: 'hook_progress',
      hookEvent,
      hookName,
      command: hookProgressCommand(hook),
      ...(hook.type === 'prompt' && { promptText: displayText(hook.prompt ?? '') }),
      ...('statusMessage' in hook && hook.statusMessage != null && { statusMessage: displayText(hook.statusMessage) }),
    },
    parentToolUseID: toolUseID,
    toolUseID,
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
  }
}
