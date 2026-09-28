/**
 * Dónde empieza el payload de un ejecutable autónomo de Bun, en las dos formas
 * que Bun escribe: la sección ELF `.bun` (la de la referencia, Bun 1.4) y el
 * apéndice tras el ejecutable (la de Bun 1.3, con la que se compila thyrox).
 *
 * En la forma de apéndice el archivo cierra así, medido sobre una compilación
 * de thyrox con Bun 1.3.11:
 *
 *   [ejecutable][payload][Offsets, 32 B][magic][u64 largo total del archivo]
 *
 * y el primer u64 de Offsets es el largo del payload: el payload empieza esa
 * cantidad de bytes ANTES de Offsets. Los punteros de la tabla son relativos
 * a ese inicio.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { BUN_MAGIC, readModuleTable } from '../src/bunfs.ts'
import { findSection } from '../src/elf.ts'
import { locatePayload, OFFSETS_BYTES } from '../src/payload.ts'

const STRIDE = 52
const NAMES = ['/$bunfs/root/thyrox', '/$bunfs/root/a-1.node', '/$bunfs/root/b-2.node']
const CONTENTS = ['console.log(1)', 'AAAA', 'BBBBBB']

/** Un payload mínimo: nombres y contenidos, luego la tabla de tres entradas. */
function buildPayloadBody(): { body: Buffer; tableOffset: number; tableLength: number } {
  const parts: Buffer[] = []
  const pointers: Array<[number, number, number, number]> = []
  let cursor = 0
  for (let i = 0; i < NAMES.length; i++) {
    const name = Buffer.from(NAMES[i]!)
    const content = Buffer.from(CONTENTS[i]!)
    pointers.push([cursor, name.length, cursor + name.length, content.length])
    parts.push(name, content)
    cursor += name.length + content.length
  }
  const table = Buffer.alloc(STRIDE * NAMES.length)
  pointers.forEach(([no, nl, co, cl], i) => {
    table.writeUInt32LE(no, i * STRIDE)
    table.writeUInt32LE(nl, i * STRIDE + 4)
    table.writeUInt32LE(co, i * STRIDE + 8)
    table.writeUInt32LE(cl, i * STRIDE + 12)
  })
  parts.push(table)
  return { body: Buffer.concat(parts), tableOffset: cursor, tableLength: table.length }
}

/** El archivo entero en la forma de apéndice. */
function buildAppendedExecutable(prefix: Buffer): Buffer {
  const { body, tableOffset, tableLength } = buildPayloadBody()
  const offsets = Buffer.alloc(OFFSETS_BYTES)
  offsets.writeBigUInt64LE(BigInt(body.length), 0)
  offsets.writeUInt32LE(tableOffset, 8)
  offsets.writeUInt32LE(tableLength, 12)
  offsets.writeUInt32LE(0, OFFSETS_BYTES - 4)
  const withoutSize = Buffer.concat([prefix, body, offsets, BUN_MAGIC])
  const size = Buffer.alloc(8)
  size.writeBigUInt64LE(BigInt(withoutSize.length + 8))
  return Buffer.concat([withoutSize, size])
}

describe('locatePayload — forma de apéndice (Bun 1.3)', () => {
  test('localiza el payload por el largo que declara Offsets, no por el magic', () => {
    const prefix = Buffer.from('\x7fELF-no-es-seccion-bun-'.padEnd(64, '.'))
    const bytes = buildAppendedExecutable(prefix)
    const located = locatePayload(bytes)
    expect(located?.form).toBe('appended')
    expect(located?.offset).toBe(prefix.length)
  })

  test('la tabla de módulos se lee sobre el payload localizado', () => {
    const bytes = buildAppendedExecutable(Buffer.alloc(100, 0x2e))
    const located = locatePayload(bytes)!
    const table = readModuleTable(located.payload)
    expect(table?.stride).toBe(STRIDE)
    expect(table?.entries.map(e => e.name)).toEqual(NAMES)
    const first = table!.entries[0]!
    expect(located.payload.subarray(first.offset, first.offset + first.length).toString()).toBe(CONTENTS[0])
  })

  test('un largo que no cabe en el archivo no produce payload', () => {
    const bytes = buildAppendedExecutable(Buffer.alloc(10))
    const magicAt = bytes.lastIndexOf(BUN_MAGIC)
    bytes.writeBigUInt64LE(BigInt(bytes.length * 2), magicAt - OFFSETS_BYTES)
    expect(locatePayload(bytes)).toBeNull()
  })

  test('sin magic no hay payload', () => {
    expect(locatePayload(Buffer.alloc(256))).toBeNull()
  })
})

describe('locatePayload — forma de sección (Bun 1.4)', () => {
  test('el ejecutable de la referencia se sigue leyendo por su sección .bun', () => {
    const binary = '/opt/claude-code/bin/claude'
    if (!existsSync(binary)) return
    const located = locatePayload(readFileSync(binary))
    expect(located?.form).toBe('section')
    expect(readModuleTable(located!.payload)?.stride).toBe(STRIDE)
  })
})

describe('findSection ante un ELF truncado', () => {
  test('un encabezado con el magic y sin tabla de secciones no lanza', () => {
    const truncated = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(20, 0x41)])
    expect(() => findSection(truncated, '.bun')).not.toThrow()
    expect(findSection(truncated, '.bun')).toBeNull()
  })

  test('un e_shoff que apunta fuera del archivo se lee como ausencia', () => {
    const header = Buffer.alloc(0x40)
    header.set([0x7f, 0x45, 0x4c, 0x46])
    header.writeBigUInt64LE(10_000_000n, 0x28)
    header.writeUInt16LE(64, 0x3a)
    header.writeUInt16LE(3, 0x3c)
    header.writeUInt16LE(2, 0x3e)
    expect(findSection(header, '.bun')).toBeNull()
  })
})
