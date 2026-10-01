/**
 * Constructor de cabeceras GGUF sintéticas para las pruebas: escribe la magia,
 * la versión, los conteos y los pares clave-valor tipados en little-endian, y
 * nada de tensores. Permite fabricar cabeceras truncadas o corruptas.
 */

export type SyntheticValue =
  | { readonly type: 'uint8' | 'int8' | 'uint16' | 'int16' | 'uint32' | 'int32' | 'float32' | 'float64', readonly value: number }
  | { readonly type: 'uint64' | 'int64', readonly value: bigint }
  | { readonly type: 'bool', readonly value: boolean }
  | { readonly type: 'string', readonly value: string }
  | { readonly type: 'array', readonly elementType: SyntheticValue['type'], readonly values: readonly SyntheticValue[] }
  | { readonly type: 'raw', readonly typeCode: number, readonly bytes: Uint8Array }

export interface SyntheticHeader {
  readonly magic?: string
  readonly version?: number
  readonly tensorCount?: bigint
  readonly entries: readonly (readonly [string, SyntheticValue])[]
}

const TYPE_CODES: Readonly<Record<Exclude<SyntheticValue['type'], 'raw'>, number>> = {
  uint8: 0, int8: 1, uint16: 2, int16: 3, uint32: 4, int32: 5, float32: 6, bool: 7,
  string: 8, array: 9, uint64: 10, int64: 11, float64: 12,
}

class ByteSink {
  private readonly chunks: Uint8Array[] = []

  push(size: number, write: (view: DataView) => void): void {
    const chunk = new Uint8Array(size)
    write(new DataView(chunk.buffer))
    this.chunks.push(chunk)
  }

  bytes(bytes: Uint8Array): void {
    this.chunks.push(bytes)
  }

  string(text: string): void {
    const encoded = new TextEncoder().encode(text)
    this.push(8, view => view.setBigUint64(0, BigInt(encoded.length), true))
    this.bytes(encoded)
  }

  concat(): Uint8Array {
    const total = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const chunk of this.chunks) {
      out.set(chunk, offset)
      offset += chunk.length
    }
    return out
  }
}

function typeCode(value: SyntheticValue): number {
  return value.type === 'raw' ? value.typeCode : TYPE_CODES[value.type]
}

function writePayload(sink: ByteSink, value: SyntheticValue): void {
  switch (value.type) {
    case 'uint8': sink.push(1, v => v.setUint8(0, value.value)); break
    case 'int8': sink.push(1, v => v.setInt8(0, value.value)); break
    case 'uint16': sink.push(2, v => v.setUint16(0, value.value, true)); break
    case 'int16': sink.push(2, v => v.setInt16(0, value.value, true)); break
    case 'uint32': sink.push(4, v => v.setUint32(0, value.value, true)); break
    case 'int32': sink.push(4, v => v.setInt32(0, value.value, true)); break
    case 'float32': sink.push(4, v => v.setFloat32(0, value.value, true)); break
    case 'float64': sink.push(8, v => v.setFloat64(0, value.value, true)); break
    case 'uint64': sink.push(8, v => v.setBigUint64(0, value.value, true)); break
    case 'int64': sink.push(8, v => v.setBigInt64(0, value.value, true)); break
    case 'bool': sink.push(1, v => v.setUint8(0, value.value ? 1 : 0)); break
    case 'string': sink.string(value.value); break
    case 'array':
      sink.push(4, v => v.setUint32(0, TYPE_CODES[value.elementType as Exclude<SyntheticValue['type'], 'raw'>], true))
      sink.push(8, v => v.setBigUint64(0, BigInt(value.values.length), true))
      for (const element of value.values) writePayload(sink, element)
      break
    case 'raw': sink.bytes(value.bytes); break
  }
}

/** Los bytes de una cabecera GGUF con los pares dados. */
export function syntheticGgufBytes(header: SyntheticHeader): Uint8Array {
  const sink = new ByteSink()
  sink.bytes(new TextEncoder().encode(header.magic ?? 'GGUF'))
  sink.push(4, v => v.setUint32(0, header.version ?? 3, true))
  sink.push(8, v => v.setBigUint64(0, header.tensorCount ?? 0n, true))
  sink.push(8, v => v.setBigUint64(0, BigInt(header.entries.length), true))
  for (const [key, value] of header.entries) {
    sink.string(key)
    sink.push(4, v => v.setUint32(0, typeCode(value), true))
    writePayload(sink, value)
  }
  return sink.concat()
}
