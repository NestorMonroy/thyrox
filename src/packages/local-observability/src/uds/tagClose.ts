/**
 * El escape de una etiqueta que envuelve texto ajeno: si el texto trae el
 * cierre de su propio sobre, la barra invertida tras el `<` impide que el
 * modelo lo lea como fin del sobre. Porte de `Qce`, `CFt`, `PL`, `h`, `H`,
 * `iRe` y `Spt`, con sus clases de caracteres (`g3n`, `V`, `_`, `C`, `z`,
 * `bpt`, `h3n`, `G`, `O`, `i`), de `chunk-0grnxhq4.js` de 2.1.283.
 *
 * El patrón no busca el literal: admite mayúsculas, guion o guion bajo en
 * cualquier posición de guion, caracteres parecidos a `<` y `/`, y rellenos
 * invisibles entre las letras. Un escape que sólo viera el literal lo evitaría
 * cualquier variante.
 */

/** `g3n`: formato y caracteres invisibles. */
const INVISIBLE =
  '\\u00ad\\u034f\\u0600-\\u0605\\u061c\\u06dd\\u070f\\u0890\\u0891\\u08e2\\u115f\\u1160\\u17b4\\u17b5\\u180b-\\u180f\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u206f\\u3164\\ufe00-\\ufe0f\\ufeff\\uffa0\\ufff0-\\ufffb\\u{110bd}\\u{110cd}\\u{13430}-\\u{1343f}\\u{1bca0}-\\u{1bca3}\\u{1d173}-\\u{1d17a}\\u{16fe4}\\u{e0000}-\\u{e0fff}'
/** `V`: marcas combinantes. */
const COMBINING_MARKS =
  '\\u0300-\\u0344\\u0346-\\u036f\\u0483-\\u0489\\u0591-\\u05bd\\u05bf\\u05c1\\u05c2\\u05c4\\u05c5\\u05c7\\u0610-\\u061a\\u064b-\\u065f\\u0670\\u06d6-\\u06dc\\u06df-\\u06e4\\u06e7\\u06e8\\u06ea-\\u06ed\\u1ab0-\\u1aff\\u1dc0-\\u1dff\\u20d0-\\u20ff\\u3099\\u309a\\ufe20-\\ufe2f'
/** `_`: lo que puede ir entre dos letras de un nombre sin verse. */
export const INTRA_NAME_FILLER = `${INVISIBLE}${COMBINING_MARKS}\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f-\\x9f\\u2028\\u2029`
/** `C`: los caracteres de un nombre de etiqueta. */
const NAME_CHARS = 'A-Za-z0-9_\\-'
/** `z`: el nombre termina donde deja de haber caracteres de nombre. */
export const NAME_END = `(?:[^${NAME_CHARS}]|$)`
/** `bpt`: guiones. */
export const DASHES = '\\p{Pd}\\u2212\\u207b\\u208b\\u02d7\\u2796\\u2043\\u30fc\\uff70'
/** `h3n`: lo que ocupa la posición de un guion o un guion bajo. */
export const SEPARATOR_CHARS = `_\\p{Pc}\\u2017\\u02cd\\u07fa\\u0640${DASHES}`
/** `G`. */
const SEPARATOR = `[${SEPARATOR_CHARS}]`

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
  }
})()

/** `iRe`: una repetición atómica de `characters`: la captura `group` se consume entera. */
export function atomicRun(characters: string, group: number): string {
  return `(?=([${characters}]*))(?:\\${group})`
}

const PATTERN_CACHE_LIMIT = 64
const patternCache = new Map<string, RegExp>()

/** `H` con los parámetros que usan `Qce` y `CFt`. */
function buildTagPattern(tag: string, closeOnly: boolean): RegExp {
  const { open, slash, filler } = TAG_CLASSES
  let group = 0
  const lead = closeOnly ? `${atomicRun(`${filler}${slash}`, ++group)}[${slash}]${atomicRun(filler, ++group)}` : atomicRun(filler, ++group)
  const spell = (character: string) => (character === '-' || character === '_' ? SEPARATOR : character)
  const name = [...tag].map((character, index) => (index === 0 ? '' : atomicRun(INTRA_NAME_FILLER, ++group)) + spell(character)).join('')
  return new RegExp(`[${open}](?!\\\\)(?=${lead}(?:${name})${NAME_END})`, 'giu')
}

/** `h`: el patrón en caché; al llenarse la caché se vacía entera. */
function tagPattern(tag: string, closeOnly: boolean): RegExp {
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
