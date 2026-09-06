/**
 * Atribucion de un cambio — porte de `ccnmt: packages/agent/commitAttribution.ts`
 * (`sanitizeModelName`, `sanitizeSurfaceKey`, `buildSurfaceKey`,
 * `computeContentHash`).
 *
 * Un cambio se atribuye a una SUPERFICIE (quien lo origino: `cli`, `sdk`,
 * `vscode`) y a un MODELO canonico. El nombre interno de un modelo lleva
 * variantes que no deben salir a un remolque de commit —`-fast`,
 * `-internal`— asi que se colapsa a su familia publica antes de escribirlo.
 *
 * DIVERGENCIA DE TABLA, declarada. La tabla de familias es PARAMETRO del
 * consumidor, no mecanismo: la de la referencia se porta verbatim (sus once
 * entradas) y se le anaden las de ESTE catalogo, que la referencia no
 * conoce. Ninguna asercion portada cambia de veredicto por ello.
 *
 * DIVERGENCIA DE FORMA, declarada. La referencia resuelve con una cadena de
 * `if` en orden de escritura, asi que su especificidad depende del cuidado
 * de quien la edita: colar `opus-4` antes que `opus-4-7` la rompe en
 * silencio. Aqui la tabla se ordena por longitud descendente de clave al
 * cargar el modulo, de modo que «gana el mas especifico» es una propiedad
 * del mecanismo y no del orden del archivo.
 */
import { createHash } from 'node:crypto'

/**
 * Las once de la referencia, mas las de este catalogo. La clave es el tramo
 * que se busca dentro del nombre interno; el valor, el nombre publico.
 */
const MODEL_FAMILIES: ReadonlyArray<readonly [key: string, canonical: string]> = [
  // Verbatim de la referencia.
  ['opus-4-7', 'claude-opus-4-7'],
  ['opus-4-6', 'claude-opus-4-6'],
  ['opus-4-5', 'claude-opus-4-5'],
  ['opus-4-1', 'claude-opus-4-1'],
  ['opus-4', 'claude-opus-4'],
  ['sonnet-4-6', 'claude-sonnet-4-6'],
  ['sonnet-4-5', 'claude-sonnet-4-5'],
  ['sonnet-4', 'claude-sonnet-4'],
  ['sonnet-3-7', 'claude-sonnet-3-7'],
  ['haiku-4-5', 'claude-haiku-4-5'],
  ['haiku-3-5', 'claude-haiku-3-5'],
  // Anadidas: viven en el catalogo vendorizado y la referencia no las tiene.
  ['opus-4-8', 'claude-opus-4-8'],
  ['opus-4-0', 'claude-opus-4-0'],
  ['opus-5', 'claude-opus-5'],
  ['sonnet-5', 'claude-sonnet-5'],
  ['fable-5-1', 'claude-fable-5-1'],
  ['fable-5', 'claude-fable-5'],
  ['mythos-5-1', 'claude-mythos-5-1'],
  ['mythos-5', 'claude-mythos-5'],
]

/**
 * La misma tabla, ordenada de clave mas larga a mas corta. `fable-5-1` tiene
 * que consultarse antes que `fable-5` porque el nombre del primero contiene
 * al segundo; ordenar por longitud lo garantiza sin depender del orden en
 * que esten escritas las filas.
 */
const FAMILIES_BY_SPECIFICITY = [...MODEL_FAMILIES].sort(
  (a, b) => b[0].length - a[0].length,
)

/** El nombre que recibe un modelo que la tabla no reconoce. */
const UNKNOWN_MODEL = 'claude'

/**
 * Colapsa un nombre interno de modelo a su nombre publico.
 *
 * Lo que la tabla NO cubre, y es deuda declarada: los tres identificadores
 * del catalogo anteriores a la 4 (`claude-3-5-haiku`, `claude-3-5-sonnet`,
 * `claude-3-7-sonnet`) invierten el orden de las palabras respecto a las
 * claves de la referencia (`haiku-3-5`, `sonnet-3-7`), asi que hoy colapsan
 * a `claude`. Son dos convenciones de nombre distintas y elegir una es
 * juicio, no medicion. Sucesor: TASK-DOCS-0431.
 */
export function sanitizeModelName(shortName: string): string {
  for (const [key, canonical] of FAMILIES_BY_SPECIFICITY) {
    if (shortName.includes(key)) return canonical
  }
  return UNKNOWN_MODEL
}

/**
 * Sanea la clave de superficie sustituyendo SOLO su tramo de modelo, que es
 * el que sigue a la ultima barra. Sin barra no hay tramo de modelo, y la
 * clave pasa verbatim.
 */
export function sanitizeSurfaceKey(surfaceKey: string): string {
  const separator = surfaceKey.lastIndexOf('/')
  if (separator === -1) return surfaceKey
  const surface = surfaceKey.slice(0, separator)
  const model = surfaceKey.slice(separator + 1)
  return `${surface}/${sanitizeModelName(model)}`
}

/**
 * Arma la clave de superficie. Su salida es punto fijo de
 * `sanitizeSurfaceKey`: sanear lo ya saneado no lo mueve.
 */
export function buildSurfaceKey(surface: string, model: string): string {
  return `${surface}/${sanitizeModelName(model)}`
}

/** SHA-256 del contenido, en hexadecimal minusculo — sobre bytes UTF-8. */
export function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}
