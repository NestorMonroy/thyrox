/**
 * Puerto de `ccnmt: packages/output/src/utils/intl.ts` (verbatim — sin
 * imports en la fuente).
 *
 * Instancias compartidas de objetos Intl con inicializacion perezosa.
 *
 * Los constructores de Intl son caros (~0.05-0.1ms cada uno), asi que se
 * cachean instancias para reusarlas en vez de crear una nueva cada vez.
 * La inicializacion perezosa asegura que solo se paga el costo cuando
 * realmente se necesita.
 */

// Segmentadores para procesamiento de texto Unicode (inicializacion perezosa)
let graphemeSegmenter: Intl.Segmenter | null = null
let wordSegmenter: Intl.Segmenter | null = null

export function getGraphemeSegmenter(): Intl.Segmenter {
  if (!graphemeSegmenter) {
    graphemeSegmenter = new Intl.Segmenter(undefined, {
      granularity: 'grapheme',
    })
  }
  return graphemeSegmenter
}

/**
 * Extrae el primer cluster de grafema de una cadena.
 * Devuelve '' para cadenas vacias.
 */
export function firstGrapheme(text: string): string {
  if (!text) return ''
  const segments = getGraphemeSegmenter().segment(text)
  const first = segments[Symbol.iterator]().next().value
  return first?.segment ?? ''
}

/**
 * Extrae el ultimo cluster de grafema de una cadena.
 * Devuelve '' para cadenas vacias.
 */
export function lastGrapheme(text: string): string {
  if (!text) return ''
  let last = ''
  for (const { segment } of getGraphemeSegmenter().segment(text)) {
    last = segment
  }
  return last
}

export function getWordSegmenter(): Intl.Segmenter {
  if (!wordSegmenter) {
    wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' })
  }
  return wordSegmenter
}

// Cache de RelativeTimeFormat (llave por style:numeric)
const rtfCache = new Map<string, Intl.RelativeTimeFormat>()

export function getRelativeTimeFormat(
  style: 'long' | 'short' | 'narrow',
  numeric: 'always' | 'auto',
): Intl.RelativeTimeFormat {
  const key = `${style}:${numeric}`
  let rtf = rtfCache.get(key)
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat('en', { style, numeric })
    rtfCache.set(key, rtf)
  }
  return rtf
}

// La zona horaria es constante durante la vida del proceso
let cachedTimeZone: string | null = null

export function getTimeZone(): string {
  if (!cachedTimeZone) {
    cachedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  return cachedTimeZone
}

// El subtag de idioma del locale del sistema (p. ej. 'en', 'ja') es
// constante durante la vida del proceso. null = aun no calculado;
// undefined = calculado pero no disponible (asi un entorno con ICU
// recortado falla una vez en vez de reintentar en cada llamada).
let cachedSystemLocaleLanguage: string | undefined | null = null

export function getSystemLocaleLanguage(): string | undefined {
  if (cachedSystemLocaleLanguage === null) {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale
      cachedSystemLocaleLanguage = new Intl.Locale(locale).language
    } catch {
      cachedSystemLocaleLanguage = undefined
    }
  }
  return cachedSystemLocaleLanguage
}
