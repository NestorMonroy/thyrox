/**
 * Dónde empieza el payload de un ejecutable autónomo de Bun.
 *
 * Bun lo escribe de dos formas, y las dos se leen con la misma tabla de
 * módulos (`bunfs.ts`) una vez localizado el inicio:
 *
 *  - `section`: una sección ELF `.bun` con ocho bytes de cabecera antes del
 *    payload. Es la forma de la referencia (Bun 1.4).
 *  - `appended`: el payload va pegado tras el ejecutable, seguido de un bloque
 *    Offsets de 32 bytes, el magic y un u64 con el largo total del archivo. El
 *    primer u64 de Offsets es el largo del payload, que empieza esa cantidad
 *    de bytes antes de Offsets. Es la forma de Bun 1.3, con la que se compila
 *    thyrox.
 *
 * La sección tiene precedencia: si el ELF la declara, el magic del final (si
 * lo hubiera) no se consulta.
 */
import { BUN_MAGIC, SECTION_HEADER } from './bunfs.ts'
import { findSection } from './elf.ts'

/** Lo que mide el bloque Offsets que precede al magic en la forma de apéndice. */
export const OFFSETS_BYTES = 32

export type PayloadForm = 'section' | 'appended'

/**
 * El payload localizado. `offset` es su posición en el archivo; `region` es
 * el tramo que declara la versión (la sección entera, o el payload con su
 * cierre).
 */
export type LocatedPayload = { form: PayloadForm; offset: number; payload: Buffer; region: Buffer }

/** `null` si el archivo no trae ninguna de las dos formas. */
export function locatePayload(bytes: Buffer): LocatedPayload | null {
  const section = findSection(bytes, '.bun')
  if (section !== null) {
    const region = bytes.subarray(section.offset, section.offset + section.size)
    return { form: 'section', offset: section.offset + SECTION_HEADER, payload: region.subarray(SECTION_HEADER), region }
  }
  return locateAppended(bytes)
}

function locateAppended(bytes: Buffer): LocatedPayload | null {
  const magicAt = bytes.lastIndexOf(BUN_MAGIC)
  const offsetsAt = magicAt - OFFSETS_BYTES
  if (magicAt < 0 || offsetsAt < 0) return null
  const payloadLength = Number(bytes.readBigUInt64LE(offsetsAt))
  const start = offsetsAt - payloadLength
  if (payloadLength <= 0 || start < 0) return null
  const payload = bytes.subarray(start, magicAt + BUN_MAGIC.length)
  return { form: 'appended', offset: start, payload, region: payload }
}
