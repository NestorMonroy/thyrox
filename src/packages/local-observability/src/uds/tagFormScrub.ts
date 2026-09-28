/**
 * El neutralizado de etiquetas por su forma, no por su texto: antes de buscar
 * la etiqueta, cada carácter que se lee como una letra ASCII (una versalita,
 * una letra matemática, un parecido cirílico, una forma compatible) se
 * reescribe en una lectura paralela con una marca del área privada, y el
 * patrón busca sobre esa lectura. Porte de `DLo`, `xu`, `_u`, `D`, `$u`, `Au`,
 * `W`, `Su`, `A`, `L`, `Pfn`, `au` y `eu` con sus constantes (`tu`, `ru`,
 * `ou`, `su`, `bu`, `y`, `iu`, `lu`, `P`, `v`, `K`, `I`, `X`, `S`, `gu`, `k`,
 * `B`, `T`, `pu`, `q`, `m`, `Eu`) de `chunk-0grnxhq4.js` de 2.1.283.
 *
 * `lz`, `Ofn`, `Hfn`, `LLo` y `yJ`, del mismo chunk, construyen otros
 * patrones (etiquetas de canal, corchetes con id) que el buzón no usa; son la
 * fase F4c-2c-1b.
 */
import { LATIN_CONFUSABLES, SCRIPT_LOOKALIKES } from './confusableTables.ts'
import { DASHES, INTRA_NAME_FILLER, NAME_END, SEPARATOR_CHARS, TAG_CLASSES, atomicRun } from './tagClose.ts'

/** `B`: caracteres con forma de guion que no están entre los guiones Unicode. */
const HYPHEN_LOOKALIKES = '⹀゠᐀'
const NON_ASCII = /[\u0080-\u{10ffff}]/u
const OPENER = new RegExp(`[${TAG_CLASSES.open}]`, 'u')
const DASH = new RegExp(`[${DASHES}]`, 'gu')
const SEPARATOR_CHARACTER = new RegExp(`^[${SEPARATOR_CHARS}]$`, 'u')
const REPLACEMENT_CHARACTER = String.fromCharCode(65533)

/** `y`/`iu`/`lu`: la marca de una letra al principio de una lectura. */
const LEAD_MARK_BASE = 57344
const LEAD_MARK_FIRST = LEAD_MARK_BASE + 32
const LEAD_MARK_LAST = LEAD_MARK_BASE + 126
/** `P`/`v`/`K`/`I`: la marca de una letra que continúa una lectura. */
const TAIL_MARK_BASE = 57856
const TAIL_MARK_FIRST = TAIL_MARK_BASE + 32
const TAIL_MARK_LAST = TAIL_MARK_BASE + 126
/** `X`/`S`/`gu`: los caracteres que se leen como dos letras a la vez, y su marca. */
const AMBIGUOUS_LETTER_PAIRS = ['nv', 'uy']
const AMBIGUOUS_MARK_BASE = 57600
const AMBIGUOUS_MARK_LAST = AMBIGUOUS_MARK_BASE + 255
/** `k`: la marca de un guion parecido. */
const HYPHEN_MARK = String.fromCharCode(AMBIGUOUS_MARK_BASE + 240)

const FOLD_CACHE_LIMIT = 32768
/** `Eu`: caracteres de un bloque que se leen uno a uno antes de clasificar el bloque entero. */
const BLOCK_SAMPLE_BEFORE_SCAN = 256
const BLOCK_COUNT = 4352

const foldCache = new Map<string, string>()
/** `q`: por bloque de 256 puntos de código: 0 sin clasificar, 1 sin parecidos, 2 con alguno. */
const blockClass = new Uint8Array(BLOCK_COUNT)
let reverseConfusables: Map<string, string> | undefined

/** `eu`: la tabla de parecidos de escritura, con sus mayúsculas de un solo carácter. */
const scriptLookalikes = (() => {
  const table: Record<string, string> = { ...SCRIPT_LOOKALIKES }
  for (const [character, latin] of Object.entries(SCRIPT_LOOKALIKES)) {
    const upper = character.toUpperCase()
    if (upper !== character && [...upper].length === 1 && !(upper in table) && !/^[A-Za-z]$/.test(upper)) table[upper] = latin
  }
  return { table, pattern: new RegExp(`[${Object.keys(table).join('')}]`, 'gu') }
})()

/** `au`: sin marcas combinantes tras la descomposición de compatibilidad. */
function stripMarks(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}+/gu, '')
}

/** `Pfn`: el texto con cada parecido de escritura llevado a su letra, sin marcas y en NFKC. */
export function foldConfusables(text: string): string {
  const { table, pattern } = scriptLookalikes
  const replace = (value: string) => value.replace(pattern, character => table[character] ?? character)
  return replace(stripMarks(replace(text)).normalize('NFKC'))
}

/** `A`. */
function leadMark(character: string): string {
  return String.fromCharCode(LEAD_MARK_BASE + character.charCodeAt(0))
}

/** `L`. */
function tailMark(character: string): string {
  return String.fromCharCode(TAIL_MARK_BASE + character.charCodeAt(0))
}

/** `W`: la lectura de un carácter. */
function foldCharacter(character: string): string {
  const codePoint = character.codePointAt(0)!
  if (
    (codePoint >= LEAD_MARK_FIRST && codePoint <= LEAD_MARK_LAST) ||
    (codePoint >= TAIL_MARK_FIRST && codePoint <= TAIL_MARK_LAST) ||
    (codePoint >= AMBIGUOUS_MARK_BASE && codePoint <= AMBIGUOUS_MARK_LAST)
  )
    return REPLACEMENT_CHARACTER
  if (HYPHEN_LOOKALIKES.includes(character)) return HYPHEN_MARK
  if (reverseConfusables === undefined) {
    reverseConfusables = new Map()
    for (const [latin, lookalikes] of LATIN_CONFUSABLES) for (const lookalike of lookalikes) reverseConfusables.set(lookalike, latin)
  }
  const letters = new Set<string>()
  const variants = [character, character.toLowerCase(), character.toUpperCase(), character.toUpperCase().toLowerCase(), character.toLowerCase().toUpperCase()]
  for (const variant of variants) {
    const latin = reverseConfusables.get(variant)
    if (latin !== undefined) letters.add(latin)
  }
  const joined = [...letters].sort().join('')
  const reading = joined || foldConfusables(character).replace(DASH, '-').toLowerCase().replace(/ß/g, 'ss')
  if (letters.size > 1) {
    const pair = AMBIGUOUS_LETTER_PAIRS.indexOf(joined)
    return pair === -1 ? leadMark(joined) : String.fromCharCode(AMBIGUOUS_MARK_BASE + pair)
  }
  if (/^[a-z0-9_-]+$/.test(reading)) return [...reading].map((letter, index) => (index === 0 ? leadMark(letter) : tailMark(letter))).join('')
  if (SEPARATOR_CHARACTER.test(character)) return leadMark('_')
  return character
}

/** `Au`: `W` en caché; al llenarse la caché se vacía entera. */
function cachedFold(character: string): string {
  const cached = foldCache.get(character)
  if (cached !== undefined) return cached
  const folded = foldCharacter(character)
  if (foldCache.size >= FOLD_CACHE_LIMIT) foldCache.clear()
  foldCache.set(character, folded)
  return folded
}

/** `Su`: si algún carácter no ASCII del bloque tiene otra lectura. */
function classifyBlock(block: number): number {
  let result = 1
  for (let codePoint = Math.max(block << 8, 128); codePoint < (block + 1) << 8; codePoint++) {
    const character = String.fromCodePoint(codePoint)
    if (foldCharacter(character) !== character) {
      result = 2
      break
    }
  }
  blockClass[block] = result
  return result
}

type Reading = { reading: string; offsetInText: (offset: number) => number }

/** `$u`: la lectura del texto y cómo volver de una posición de la lectura a una del texto. */
function readText(text: string): Reading {
  const shiftAt: number[] = []
  const shiftBy: number[] = []
  let sampled: Uint16Array | undefined
  let reading = ''
  let copiedUpTo = 0
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    if (code < 128) continue
    const next = text.charCodeAt(index + 1)
    const width = code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff ? 2 : 1
    const block = (width === 2 ? text.codePointAt(index)! : code) >> 8
    let kind = blockClass[block]!
    if (kind === 0) {
      sampled ??= new Uint16Array(BLOCK_COUNT)
      if (++sampled[block]! >= BLOCK_SAMPLE_BEFORE_SCAN) kind = classifyBlock(block)
    }
    if (kind === 1) {
      index += width - 1
      continue
    }
    const folded = cachedFold(text.slice(index, index + width))
    reading += text.slice(copiedUpTo, index) + folded
    copiedUpTo = index + width
    if (folded.length !== width) {
      shiftAt.push(reading.length)
      shiftBy.push(folded.length - width + (shiftBy.at(-1) ?? 0))
    }
    index += width - 1
  }
  reading += text.slice(copiedUpTo)
  return {
    reading,
    offsetInText(offset) {
      let low = 0
      let high = shiftAt.length
      while (low < high) {
        const middle = (low + high) >> 1
        if (shiftAt[middle]! <= offset) low = middle + 1
        else high = middle
      }
      return low === 0 ? offset : offset - shiftBy[low - 1]!
    },
  }
}

/** `_u`: la clase de una letra del nombre: ella, sus marcas y los pares ambiguos que la incluyen. */
function spellFormLetter(letter: string): string {
  if (/^[a-z0-9]$/.test(letter)) {
    const ambiguous = AMBIGUOUS_LETTER_PAIRS.flatMap((pair, index) => (pair.includes(letter) ? [String.fromCharCode(AMBIGUOUS_MARK_BASE + index)] : []))
    return `[${letter}${leadMark(letter)}${tailMark(letter)}${ambiguous.join('')}]`
  }
  if (letter === '-' || letter === '_') return `[_\\-${leadMark('_')}${leadMark('-')}${tailMark('_')}${tailMark('-')}${HYPHEN_MARK}]`
  throw new Error('createTagFormScrub: tag names are lowercase [a-z0-9_-]')
}

export type TagFormSpec = { tags: readonly string[] }

/** `xu`: el patrón de las aperturas de `tags` sobre la lectura. */
function buildFormPattern({ tags }: TagFormSpec): RegExp {
  const { open, filler } = TAG_CLASSES
  let group = 0
  const spell = (tag: string) => [...tag].map((letter, index) => (index === 0 ? '' : atomicRun(INTRA_NAME_FILLER, ++group)) + spellFormLetter(letter)).join('')
  return new RegExp(`[${open}](?!\\\\)(?=[${filler}]*?(?:${tags.map(spell).join('|')})${NAME_END})`, 'giu')
}

/** `D`: las posiciones, en el texto original y ordenadas, de cada apertura que casa algún patrón. */
function openerOffsets(text: string, patterns: readonly RegExp[]): number[] {
  if (!OPENER.test(text)) return []
  const reading = NON_ASCII.test(text) ? readText(text) : undefined
  const subject = reading?.reading ?? text
  const offsets = new Set<number>()
  for (const pattern of patterns) for (const match of subject.matchAll(pattern)) offsets.add(reading ? reading.offsetInText(match.index) : match.index)
  return [...offsets].sort((left, right) => left - right)
}

export type TagFormScrubber = {
  openerOffsets: (text: string) => number[]
  /** Sustituye el carácter de apertura de cada etiqueta por `<\`. */
  neutralize: (text: string) => string
}

/** `DLo`. */
export function createTagFormScrubber(specs: readonly TagFormSpec[]): TagFormScrubber {
  const patterns = specs.filter(spec => spec.tags.length > 0).map(buildFormPattern)
  return {
    openerOffsets: text => openerOffsets(text, patterns),
    neutralize(text) {
      let result = ''
      let copiedUpTo = 0
      for (const offset of openerOffsets(text, patterns)) {
        result += `${text.slice(copiedUpTo, offset)}<\\`
        copiedUpTo = offset + 1
      }
      return result + text.slice(copiedUpTo)
    },
  }
}
