/**
 * El hash del contenido canónico de un documento y de cada chunk. El del
 * documento decide si una reingesta es la misma versión: se calcula sobre la
 * lista de chunks serializada, así que un cambio de texto y un cambio de corte
 * entre chunks son contenido distinto. La metadata no entra: describe el
 * documento, no es su contenido.
 */
import { createHash } from 'node:crypto'

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function documentHash(chunks: readonly string[]): string {
  return sha256Hex(JSON.stringify(chunks))
}

export function chunkHash(text: string): string {
  return sha256Hex(text)
}
