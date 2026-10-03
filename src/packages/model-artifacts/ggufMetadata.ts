/**
 * Lector de la cabecera GGUF v3: magia `GGUF`, versión, conteo de tensores y
 * de pares clave-valor, y los KV tipados. No lee tensores: recorre el archivo
 * por bloques desde el principio y se detiene tras el último KV.
 *
 * La lectura está acotada por `MAX_GGUF_HEADER_BYTES`: una longitud declarada
 * que la excede se rehúsa antes de reservar memoria, así que una cabecera
 * corrupta no puede pedir gigabytes.
 *
 * Formato (little-endian): `uint32` magia, `uint32` versión, `uint64` tensores,
 * `uint64` KV; cada KV es una cadena (`uint64` longitud + UTF-8), un `uint32`
 * de tipo y el valor; un arreglo es `uint32` tipo de elemento, `uint64`
 * longitud y los elementos.
 */

import { open, type FileHandle } from 'node:fs/promises'

export type GgufValue = number | bigint | boolean | string | readonly GgufValue[]

export type GgufMetadata = Readonly<Record<string, GgufValue>>

export interface GgufHeader {
  readonly version: number
  readonly tensorCount: number
  readonly metadata: GgufMetadata
}

export class InvalidGgufError extends Error {
  constructor(readonly path: string, reason: string) {
    super(`GGUF inválido (${path}): ${reason}`)
    this.name = 'InvalidGgufError'
  }
}

const GGUF_MAGIC = 'GGUF'
const SUPPORTED_VERSION = 3

/**
 * Cota de bytes de la cabecera. Medido: magia, conteos y KV de
 * `model-{F16,Q8_0,Q4_K_M}.gguf` de Qwen2.5-0.5B-Instruct ocupan 5 931 473
 * bytes en los tres, casi todo `tokenizer.ggml.tokens` (151 936),
 * `token_type` (151 936) y `merges` (151 387). 64 MiB es ~11× esa medida y
 * sigue rehusando una longitud corrupta del orden de gigabytes.
 */
export const MAX_GGUF_HEADER_BYTES = 64 * 1024 * 1024

const READ_BLOCK_BYTES = 256 * 1024

const enum ValueType {
  Uint8 = 0, Int8 = 1, Uint16 = 2, Int16 = 3, Uint32 = 4, Int32 = 5, Float32 = 6,
  Bool = 7, String = 8, Array = 9, Uint64 = 10, Int64 = 11, Float64 = 12,
}

/** Bytes mínimos que ocupa un elemento de cada tipo; acota el conteo de un arreglo. */
const MIN_ELEMENT_BYTES: Readonly<Record<number, number>> = {
  [ValueType.Uint8]: 1, [ValueType.Int8]: 1, [ValueType.Uint16]: 2, [ValueType.Int16]: 2,
  [ValueType.Uint32]: 4, [ValueType.Int32]: 4, [ValueType.Float32]: 4, [ValueType.Bool]: 1,
  [ValueType.String]: 8, [ValueType.Array]: 12, [ValueType.Uint64]: 8, [ValueType.Int64]: 8,
  [ValueType.Float64]: 8,
}

/** Lee la cabecera y los KV de un GGUF sin cargar sus tensores. */
export async function readGgufMetadata(path: string): Promise<GgufHeader> {
  const handle = await open(path, 'r')
  try {
    return await new HeaderReader(path, handle).read()
  } finally {
    await handle.close()
  }
}

/** Cursor sobre el principio del archivo, que pide bloques sólo cuando le faltan bytes. */
class BoundedCursor {
  private buffer = new Uint8Array(0)
  private start = 0
  private consumed = 0

  constructor(private readonly path: string, private readonly handle: FileHandle) {}

  async take(size: number): Promise<DataView> {
    await this.ensure(size)
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset + this.start, size)
    this.start += size
    this.consumed += size
    return view
  }

  async takeBytes(size: number): Promise<Uint8Array> {
    const view = await this.take(size)
    return new Uint8Array(view.buffer, view.byteOffset, size)
  }

  /** Rehúsa si `size` bytes más desbordarían la cota; se llama antes de reservar. */
  requireWithinBound(size: number, what: string): void {
    if (this.consumed + size > MAX_GGUF_HEADER_BYTES) {
      throw new InvalidGgufError(this.path, `${what} de ${size} bytes excede la cota de ${MAX_GGUF_HEADER_BYTES} bytes de cabecera`)
    }
  }

  private async ensure(size: number): Promise<void> {
    this.requireWithinBound(size, 'lectura')
    const available = this.buffer.length - this.start
    if (available >= size) return
    const missing = size - available
    const block = new Uint8Array(available + Math.max(missing, READ_BLOCK_BYTES))
    block.set(this.buffer.subarray(this.start), 0)
    const { bytesRead } = await this.handle.read(block, available, block.length - available, this.consumed + available)
    this.buffer = block.subarray(0, available + bytesRead)
    this.start = 0
    if (this.buffer.length < size) throw new InvalidGgufError(this.path, `cabecera truncada en el byte ${this.consumed + this.buffer.length}`)
  }
}

class HeaderReader {
  private readonly cursor: BoundedCursor
  private readonly decoder = new TextDecoder('utf-8', { fatal: true })

  constructor(private readonly path: string, handle: FileHandle) {
    this.cursor = new BoundedCursor(path, handle)
  }

  async read(): Promise<GgufHeader> {
    await this.readMagic()
    const version = (await this.cursor.take(4)).getUint32(0, true)
    if (version !== SUPPORTED_VERSION) throw new InvalidGgufError(this.path, `versión ${version} no soportada; se lee la ${SUPPORTED_VERSION}`)
    const tensorCount = this.toCount(await this.readUint64(), 'conteo de tensores')
    const kvCount = this.toCount(await this.readUint64(), 'conteo de KV')
    return { version, tensorCount, metadata: await this.readEntries(kvCount) }
  }

  private async readMagic(): Promise<void> {
    const magic = String.fromCharCode(...await this.cursor.takeBytes(GGUF_MAGIC.length))
    if (magic !== GGUF_MAGIC) throw new InvalidGgufError(this.path, `magia «${magic}», se espera «${GGUF_MAGIC}»`)
  }

  private async readEntries(count: number): Promise<GgufMetadata> {
    const metadata: Record<string, GgufValue> = {}
    for (let index = 0; index < count; index += 1) {
      const key = await this.readString()
      if (Object.hasOwn(metadata, key)) throw new InvalidGgufError(this.path, `clave repetida «${key}»`)
      const type = (await this.cursor.take(4)).getUint32(0, true)
      metadata[key] = await this.readValue(type, key)
    }
    return metadata
  }

  private async readValue(type: number, key: string): Promise<GgufValue> {
    switch (type) {
      case ValueType.Uint8: return (await this.cursor.take(1)).getUint8(0)
      case ValueType.Int8: return (await this.cursor.take(1)).getInt8(0)
      case ValueType.Uint16: return (await this.cursor.take(2)).getUint16(0, true)
      case ValueType.Int16: return (await this.cursor.take(2)).getInt16(0, true)
      case ValueType.Uint32: return (await this.cursor.take(4)).getUint32(0, true)
      case ValueType.Int32: return (await this.cursor.take(4)).getInt32(0, true)
      case ValueType.Float32: return (await this.cursor.take(4)).getFloat32(0, true)
      case ValueType.Bool: return (await this.cursor.take(1)).getUint8(0) !== 0
      case ValueType.String: return this.readString()
      case ValueType.Array: return this.readArray(key)
      case ValueType.Uint64: return narrowInteger(await this.readUint64())
      case ValueType.Int64: return narrowInteger((await this.cursor.take(8)).getBigInt64(0, true))
      case ValueType.Float64: return (await this.cursor.take(8)).getFloat64(0, true)
      default: throw new InvalidGgufError(this.path, `la clave «${key}» tiene el tipo de valor desconocido ${type}`)
    }
  }

  private async readArray(key: string): Promise<GgufValue[]> {
    const elementType = (await this.cursor.take(4)).getUint32(0, true)
    const minElementBytes = MIN_ELEMENT_BYTES[elementType]
    if (minElementBytes === undefined) throw new InvalidGgufError(this.path, `el arreglo «${key}» tiene el tipo de elemento desconocido ${elementType}`)
    const length = await this.readUint64()
    this.cursor.requireWithinBound(Number(length) * minElementBytes, `el arreglo «${key}»`)
    const values: GgufValue[] = []
    for (let index = 0; index < Number(length); index += 1) values.push(await this.readValue(elementType, key))
    return values
  }

  private async readString(): Promise<string> {
    const length = await this.readUint64()
    this.cursor.requireWithinBound(Number(length), 'una cadena')
    return this.decoder.decode(await this.cursor.takeBytes(Number(length)))
  }

  private async readUint64(): Promise<bigint> {
    return (await this.cursor.take(8)).getBigUint64(0, true)
  }

  private toCount(value: bigint, what: string): number {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new InvalidGgufError(this.path, `${what} ${value} fuera de rango`)
    return Number(value)
  }
}

/** Un entero de 64 bits se devuelve como `number` si cabe sin pérdida; si no, como `bigint`. */
function narrowInteger(value: bigint): number | bigint {
  const fitsInNumber = value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
  return fitsInNumber ? Number(value) : value
}
