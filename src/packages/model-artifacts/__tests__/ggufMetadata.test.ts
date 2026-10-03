import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { InvalidGgufError, MAX_GGUF_HEADER_BYTES, readGgufMetadata } from '../ggufMetadata.js'
import { syntheticGgufBytes, type SyntheticHeader } from '../testing/syntheticGguf.js'

const WORKDIR = mkdtempSync(join(tmpdir(), 'gguf-metadata-'))
afterAll(() => rmSync(WORKDIR, { recursive: true, force: true }))

let fileCounter = 0
function writeGguf(bytes: Uint8Array): string {
  fileCounter += 1
  const path = join(WORKDIR, `model-${fileCounter}.gguf`)
  writeFileSync(path, bytes)
  return path
}

function writeHeader(header: SyntheticHeader): string {
  return writeGguf(syntheticGgufBytes(header))
}

describe('readGgufMetadata — cabecera válida', () => {
  test('lee versión, conteos y cada tipo de valor', async () => {
    const path = writeHeader({
      tensorCount: 290n,
      entries: [
        ['general.architecture', { type: 'string', value: 'qwen2' }],
        ['u8', { type: 'uint8', value: 200 }],
        ['i8', { type: 'int8', value: -5 }],
        ['u16', { type: 'uint16', value: 60000 }],
        ['i16', { type: 'int16', value: -300 }],
        ['qwen2.block_count', { type: 'uint32', value: 24 }],
        ['i32', { type: 'int32', value: -70000 }],
        ['f32', { type: 'float32', value: 0.5 }],
        ['flag', { type: 'bool', value: true }],
        ['u64', { type: 'uint64', value: 1n << 40n }],
        ['i64big', { type: 'int64', value: -(1n << 60n) }],
        ['f64', { type: 'float64', value: 1e-6 }],
        ['tokens', { type: 'array', elementType: 'string', values: [{ type: 'string', value: 'a' }, { type: 'string', value: 'ñ' }] }],
      ],
    })
    const header = await readGgufMetadata(path)
    expect(header.version).toBe(3)
    expect(header.tensorCount).toBe(290)
    expect(header.metadata).toEqual({
      'general.architecture': 'qwen2',
      u8: 200, i8: -5, u16: 60000, i16: -300,
      'qwen2.block_count': 24, i32: -70000, f32: 0.5, flag: true,
      u64: 2 ** 40, i64big: -(1n << 60n), f64: 1e-6,
      tokens: ['a', 'ñ'],
    })
  })

  test('no lee tensores: una cabecera sin sus datos se lee igual', async () => {
    const path = writeHeader({ tensorCount: 1_000_000n, entries: [['k', { type: 'uint32', value: 1 }]] })
    expect((await readGgufMetadata(path)).metadata).toEqual({ k: 1 })
  })

  test('una cabecera que cruza varios bloques de lectura', async () => {
    const long = 'x'.repeat(1_000_000)
    const path = writeHeader({ entries: [['a', { type: 'string', value: long }], ['b', { type: 'uint32', value: 7 }]] })
    const metadata = (await readGgufMetadata(path)).metadata
    expect(metadata.a).toBe(long)
    expect(metadata.b).toBe(7)
  })
})

describe('readGgufMetadata — rehúsa con nombre', () => {
  test('magia distinta de GGUF', async () => {
    const path = writeHeader({ magic: 'GGML', entries: [] })
    expect(readGgufMetadata(path)).rejects.toThrow(/magia/)
  })

  test('versión no soportada', async () => {
    const path = writeHeader({ version: 1, entries: [] })
    expect(readGgufMetadata(path)).rejects.toThrow(/versión 1/)
  })

  test('tipo de valor desconocido, nombrando la clave', async () => {
    const path = writeHeader({ entries: [['rara', { type: 'raw', typeCode: 99, bytes: new Uint8Array(4) }]] })
    expect(readGgufMetadata(path)).rejects.toThrow(/rara.*99/)
  })

  test('cabecera truncada', async () => {
    const bytes = syntheticGgufBytes({ entries: [['general.architecture', { type: 'string', value: 'qwen2' }]] })
    const path = writeGguf(bytes.slice(0, bytes.length - 2))
    expect(readGgufMetadata(path)).rejects.toThrow(InvalidGgufError)
    expect(readGgufMetadata(path)).rejects.toThrow(/truncad/)
  })

  test('cabecera mayor que la cota: no se lee sin límite', async () => {
    const path = writeHeader({ entries: [['huge', { type: 'string', value: 'y'.repeat(MAX_GGUF_HEADER_BYTES) }]] })
    expect(readGgufMetadata(path)).rejects.toThrow(/cota/)
  })

  test('longitud declarada absurda: rehúsa sin reservar esa memoria', async () => {
    const bytes = syntheticGgufBytes({ entries: [['k', { type: 'string', value: 'ab' }]] })
    const view = new DataView(bytes.buffer)
    const keyLengthOffset = 4 + 4 + 8 + 8
    view.setBigUint64(keyLengthOffset, 1n << 62n, true)
    expect(readGgufMetadata(writeGguf(bytes))).rejects.toThrow(/cota/)
  })

  test('clave repetida', async () => {
    const path = writeHeader({ entries: [['k', { type: 'uint8', value: 1 }], ['k', { type: 'uint8', value: 2 }]] })
    expect(readGgufMetadata(path)).rejects.toThrow(/repetida.*k/)
  })
})

const REAL_Q4_K_M = '/var/lib/containers/storage/volumes/thyrox-quantization-lab-artifacts/_data/model-Q4_K_M.gguf'
const realAvailable = existsSync(REAL_Q4_K_M)

describe('readGgufMetadata — GGUF real (opcional)', () => {
  if (!realAvailable) {
    test.skip(`se salta: no existe ${REAL_Q4_K_M} (volumen thyrox-quantization-lab-artifacts)`, () => {})
    return
  }
  test('Qwen2.5-0.5B-Instruct Q4_K_M: qwen2, 24 capas, 2 cabezas KV', async () => {
    const { metadata, version, tensorCount } = await readGgufMetadata(REAL_Q4_K_M)
    expect(version).toBe(3)
    expect(tensorCount).toBe(290)
    expect(metadata['general.architecture']).toBe('qwen2')
    expect(metadata['qwen2.block_count']).toBe(24)
    expect(metadata['qwen2.attention.head_count_kv']).toBe(2)
    expect(metadata['qwen2.attention.head_count']).toBe(14)
    expect(metadata['qwen2.embedding_length']).toBe(896)
  })
})
