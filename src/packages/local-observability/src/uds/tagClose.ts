/**
 * El escape de una etiqueta que envuelve texto ajeno: si el texto trae el
 * cierre de su propio sobre, la barra invertida tras el `<` impide que el
 * modelo lo lea como fin del sobre. Porte de `Qce`, `CFt`, `PL`, `h`, `H`,
 * `iRe` y `Spt`, con sus clases de caracteres (`g3n`, `V`, `_`, `C`, `z`,
 * `bpt`, `h3n`, `G`, `O`, `i`, `OFe`, `sRe`, `F`, `B`, `U`, `uu`), de
 * `chunk-0grnxhq4.js` de 2.1.283.
 *
 * El patrón no busca el literal: admite mayúsculas, guion o guion bajo en
 * cualquier posición de guion, caracteres parecidos a `<` y `/`, y rellenos
 * invisibles entre las letras. Un escape que sólo viera el literal lo evitaría
 * cualquier variante.
 */

/** `g3n`: formato y caracteres invisibles. */
export const INVISIBLE_CHARS =
  '\\u00ad\\u034f\\u0600-\\u0605\\u061c\\u06dd\\u070f\\u0890\\u0891\\u08e2\\u115f\\u1160\\u17b4\\u17b5\\u180b-\\u180f\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u206f\\u3164\\ufe00-\\ufe0f\\ufeff\\uffa0\\ufff0-\\ufffb\\u{110bd}\\u{110cd}\\u{13430}-\\u{1343f}\\u{1bca0}-\\u{1bca3}\\u{1d173}-\\u{1d17a}\\u{16fe4}\\u{e0000}-\\u{e0fff}'
/** `V`: marcas combinantes. */
const COMBINING_MARKS =
  '\\u0300-\\u0344\\u0346-\\u036f\\u0483-\\u0489\\u0591-\\u05bd\\u05bf\\u05c1\\u05c2\\u05c4\\u05c5\\u05c7\\u0610-\\u061a\\u064b-\\u065f\\u0670\\u06d6-\\u06dc\\u06df-\\u06e4\\u06e7\\u06e8\\u06ea-\\u06ed\\u1ab0-\\u1aff\\u1dc0-\\u1dff\\u20d0-\\u20ff\\u3099\\u309a\\ufe20-\\ufe2f'
/** `_`: lo que puede ir entre dos letras de un nombre sin verse. */
export const INTRA_NAME_FILLER = `${INVISIBLE_CHARS}${COMBINING_MARKS}\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f-\\x9f\\u2028\\u2029`
/** `uu`: separadores de línea y rellenos que parecen espacio. */
export const LINE_BREAK_LIKE = '\\x0b\\x0c\\x1c-\\x1f\\x85\\u2028\\u2029\\u115f\\u1160\\u3164\\uffa0'
/** `C`: los caracteres de un nombre de etiqueta. */
export const NAME_CHARS = 'A-Za-z0-9_\\-'
/** `z`: el nombre termina donde deja de haber caracteres de nombre. */
export const NAME_END = `(?:[^${NAME_CHARS}]|$)`
/** `bpt`: guiones. */
export const DASHES = '\\p{Pd}\\u2212\\u207b\\u208b\\u02d7\\u2796\\u2043\\u30fc\\uff70'
/** `sRe`: dos puntos y sus parecidos. */
export const COLON_CHARS = ':\\uff1a\\ufe55\\ufe13\\ua789\\u2236\\u02d0\\u02f8\\u05c3\\u0589\\u0703\\u0704\\u16ec\\u1803\\u1809\\u205a\\ua4fd\\ufe30'
/** `F`: el signo igual y sus parecidos. */
export const EQUALS_CHARS = '=\\u207c\\u208c\\ufe66\\uff1d\\ua78a\\u2550\\u268c\\ua4ff\\u{1f7f0}'
/** `B`: parecidos de guion que no son de la clase `Pd`. */
export const HYPHEN_LOOKALIKES = '\u2e40\u30a0\u1400'
/** `U`: lo que puede ir entre el nombre de un atributo y su signo igual. */
export const ASSIGN_GAP_CHARS = `\\s\\u2800${INTRA_NAME_FILLER}`
/** `h3n`: lo que ocupa la posición de un guion o un guion bajo. */
export const SEPARATOR_CHARS = `_\\p{Pc}\\u2017\\u02cd\\u07fa\\u0640${DASHES}`
/** `G`. */
export const SEPARATOR = `[${SEPARATOR_CHARS}]`

/** `O`: los caracteres que se leen como `<`, `>` o `/`. */
const LOOKALIKES: Readonly<Record<string, '<' | '>' | '/'>> = {
  '＜': '<', '＞': '>', '﹤': '<', '﹥': '>', '〈': '<', '〉': '>',
  '⟨': '<', '⟩': '>', '〈': '<', '〉': '>', '‹': '<', '›': '>',
  '˂': '<', '˃': '>', 'ᐸ': '<', 'ᐳ': '>', '❬': '<', '❭': '>',
  '❮': '<', '❯': '>', '❰': '<', '❱': '>', '⧼': '<', '⧽': '>',
  '≮': '<', '≯': '>', '≺': '<', '≻': '>', '⋖': '<', '⋗': '>',
  '／': '/', '∕': '/', '⁄': '/',
}

/** `i`: las clases de apertura y barra, con sus parecidos, y el relleno entre `<` y el nombre. */
export const TAG_CLASSES = (() => {
  const members: Record<'<' | '>' | '/', string> = { '<': '<', '>': '>', '/': '/' }
  for (const [lookalike, ascii] of Object.entries(LOOKALIKES)) members[ascii] += lookalike
  return {
    open: members['<'],
    close: members['>'],
    slash: members['/'],
    filler: `^${NAME_CHARS}${members['<']}${members['>']}`,
    lookalikePattern: new RegExp(`[${Object.keys(LOOKALIKES).join('')}]`, 'g'),
    invisiblePattern: new RegExp(`[${INVISIBLE_CHARS}]`, 'gu'),
  }
})()

/** `OFe`: las tres clases de caracteres de una etiqueta. */
export const TAG_CHARACTERS = { open: TAG_CLASSES.open, close: TAG_CLASSES.close, slash: TAG_CLASSES.slash }

/** `iRe`: una repetición atómica de `characters`: la captura `group` se consume entera. */
export function atomicRun(characters: string, group: number): string {
  return `(?=([${characters}]*))(?:\\${group})`
}

/** `Spt`: relleno invisible entre dos letras de un nombre. */
export function intraNameRun(group: number): string {
  return atomicRun(INTRA_NAME_FILLER, group)
}

/** Lo que distingue a un patrón de etiqueta de otro: `H` recibe estos cinco parámetros. */
export type TagScrubSpec = {
  tags: readonly string[]
  closeOnly: boolean
  /** Lo que puede ir entre `<` y el nombre. */
  fillerClass: string
  /** Cómo se escribe en el patrón cada carácter del nombre. */
  spell: (character: string) => string
  /** Lo que sigue al nombre; sin cola, el nombre tiene que terminar. */
  tail: string | undefined
}

/** `H`: una apertura de etiqueta (o sólo el cierre) que todavía no lleva la barra de escape. */
export function buildTagScrubPattern({ tags, closeOnly, fillerClass, spell, tail }: TagScrubSpec): RegExp {
  const { open, slash } = TAG_CLASSES
  let group = 0
  const lead = closeOnly ? `${atomicRun(`${fillerClass}${slash}`, ++group)}[${slash}]${atomicRun(fillerClass, ++group)}` : atomicRun(fillerClass, ++group)
  const names = tags.map(tag => [...tag].map((character, index) => (index === 0 ? '' : intraNameRun(++group)) + spell(character)).join(''))
  const end = tail === undefined ? NAME_END : `${intraNameRun(++group)}${tail}`
  return new RegExp(`[${open}](?!\\\\)(?=${lead}(?:${names.join('|')})${end})`, 'giu')
}

const PATTERN_CACHE_LIMIT = 64
const patternCache = new Map<string, RegExp>()

/** `H` con los parámetros que usan `Qce` y `CFt`. */
function buildTagPattern(tag: string, closeOnly: boolean): RegExp {
  return buildTagScrubPattern({
    tags: [tag],
    closeOnly,
    fillerClass: TAG_CLASSES.filler,
    spell: character => (character === '-' || character === '_' ? SEPARATOR : character),
    tail: undefined,
  })
}

/** `h`: el patrón en caché; al llenarse la caché se vacía entera. */
export function tagPattern(tag: string, closeOnly: boolean): RegExp {
  const key = `${closeOnly ? '/' : ''}${tag}`
  const cached = patternCache.get(key)
  if (cached) return cached
  const pattern = buildTagPattern(tag, closeOnly)
  if (patternCache.size >= PATTERN_CACHE_LIMIT) patternCache.clear()
  patternCache.set(key, pattern)
  return pattern
}

/** `Qce`: escapa cada cierre de `tag` en `text`. */
export function escapeTagClose(tag: string, text: string): string {
  return text.replace(tagPattern(tag, true), '<\\')
}

/** `CFt`: escapa cada apertura y cada cierre de `tag` en `text`. */
export function escapeTagOpenOrClose(tag: string, text: string): string {
  return text.replace(tagPattern(tag, false), '<\\')
}

/** `PL`: cada parecido de `<`, `>` o `/` pasa a su carácter ASCII. */
export function normalizeTagLookalikes(text: string): string {
  return text.replace(TAG_CLASSES.lookalikePattern, character => LOOKALIKES[character] ?? character)
}
