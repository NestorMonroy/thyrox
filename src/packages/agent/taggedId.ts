/**
 * Identificador etiquetado — `<tag>_<version><base58>`.
 *
 * Porte de `ccnmt: packages/agent/taggedId.ts` (`toTaggedId`). El
 * identificador dice de que es sin consultar nada: la etiqueta va delante,
 * la version detras, y el UUID de 128 bits viaja codificado en base58 de
 * longitud fija.
 *
 * La longitud fija no es adorno: 22 caracteres es `ceil(128 / log2(58))`, y
 * rellenar por la izquierda con el caracter de posicion 0 hace que dos
 * identificadores se puedan comparar y ordenar como cadenas.
 */

/** El alfabeto base58 — sin `0`, `O`, `I` ni `l`, que se confunden al leerse. */
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/** La version del formato, entre la etiqueta y la carga. */
const VERSION = '01'

/** ceil(128 / log2(58)) — los 128 bits del UUID nunca desbordan 22 digitos. */
const ENCODED_LENGTH = 22

/** Codifica un entero de 128 bits en base58 con longitud fija. */
function base58Encode(value: bigint): string {
  const base = BigInt(BASE58_ALPHABET.length)
  const digits = new Array<string>(ENCODED_LENGTH).fill(BASE58_ALPHABET[0]!)
  let remaining = value
  let position = ENCODED_LENGTH - 1
  while (remaining > 0n) {
    digits[position] = BASE58_ALPHABET[Number(remaining % base)]!
    remaining = remaining / base
    position--
  }
  return digits.join('')
}

/**
 * Lee un UUID —con guiones o sin ellos— como entero de 128 bits.
 *
 * Rehusa nombrando la longitud: un UUID truncado es el defecto mas frecuente
 * y el mensaje tiene que decir por que, no solo que.
 */
function uuidToBigInt(uuid: string): bigint {
  const hex = uuid.replace(/-/g, '')
  if (hex.length !== 32) {
    throw new Error(`Invalid UUID hex length: ${hex.length} (expected 32)`)
  }
  return BigInt(`0x${hex}`)
}

/** Convierte un UUID en su identificador etiquetado. */
export function toTaggedId(tag: string, uuid: string): string {
  return `${tag}_${VERSION}${base58Encode(uuidToBigInt(uuid))}`
}
