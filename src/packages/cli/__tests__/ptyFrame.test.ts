/**
 * El códec de trama del socket del anfitrión de PTY.
 *
 * Reimplementación del patrón de `ccnmt: packages/cli/src/bg/ptyFrame.ts` y de
 * su suite de 15 casos. NO es copia: ccnmt declara `"license": "UNLICENSED"`
 * (#207).
 *
 * Se añaden TRES casos que su suite no tiene, y los tres son la misma clase de
 * hueco — un control que rechaza lo inválido sin comprobar que acepta lo
 * válido en la frontera no distingue «rechaza lo grande» de «rechaza todo»
 * (sub-patrón D de `metrica-decide-la-conclusion.md`):
 *
 *  - el cuerpo de tamaño EXACTAMENTE el tope, que debe pasar;
 *  - un trozo vacío, que no debe romper ni emitir;
 *  - una trama de control con cuerpo de longitud 0, que es JSON inválido.
 */
import { describe, expect, test } from 'bun:test'
import {
  CTRL_TAG, DATA_TAG, FRAME_HEADER_BYTES, FRAME_SIZE_CAP,
  createFrameDecoder, encodeCtrlFrame, encodeDataFrame,
  type CtrlFrame, type DecodedFrame,
} from '../src/bg/ptyFrame.ts'

/** Un decodificador que acumula lo que emite, para afirmarlo de una vez. */
function collector() {
  const frames: DecodedFrame[] = []
  const errors: string[] = []
  const feed = createFrameDecoder(f => frames.push(f), e => errors.push(e))
  return { frames, errors, feed }
}

describe('encodeDataFrame', () => {
  test('escribe la longitud en big-endian, la etiqueta 0 y el cuerpo', () => {
    const out = encodeDataFrame(Buffer.from('hola'))
    expect(out.readUInt32BE(0)).toBe(4)
    expect(out.readUInt8(4)).toBe(DATA_TAG)
    expect(out.subarray(FRAME_HEADER_BYTES).toString()).toBe('hola')
  })

  test('acepta una cadena y la codifica en utf-8', () => {
    const out = encodeDataFrame('añil')
    expect(out.readUInt32BE(0)).toBe(Buffer.byteLength('añil', 'utf8'))
    expect(out.subarray(FRAME_HEADER_BYTES).toString('utf8')).toBe('añil')
  })

  test('un cuerpo vacio da una trama de solo cabecera', () => {
    const out = encodeDataFrame(Buffer.alloc(0))
    expect(out.length).toBe(FRAME_HEADER_BYTES)
    expect(out.readUInt32BE(0)).toBe(0)
  })
})

describe('encodeCtrlFrame', () => {
  test('escribe la etiqueta 1 y el JSON en utf-8', () => {
    const out = encodeCtrlFrame({ t: 'live' })
    expect(out.readUInt8(4)).toBe(CTRL_TAG)
    expect(JSON.parse(out.subarray(FRAME_HEADER_BYTES).toString('utf8'))).toEqual({ t: 'live' })
  })

  test('la trama `hello` lleva el pid del repl y la version', () => {
    const ctrl: CtrlFrame = { t: 'hello', replPid: 4242, version: '0.1.0' }
    const out = encodeCtrlFrame(ctrl)
    expect(JSON.parse(out.subarray(FRAME_HEADER_BYTES).toString('utf8'))).toEqual(ctrl)
  })

  test('la trama `exit` lleva la senal solo cuando la hay', () => {
    const sinSenal = encodeCtrlFrame({ t: 'exit', code: 0 })
    expect(JSON.parse(sinSenal.subarray(FRAME_HEADER_BYTES).toString('utf8'))).toEqual({ t: 'exit', code: 0 })
    const conSenal = encodeCtrlFrame({ t: 'exit', code: 137, signal: 'SIGKILL' })
    expect(JSON.parse(conSenal.subarray(FRAME_HEADER_BYTES).toString('utf8')))
      .toEqual({ t: 'exit', code: 137, signal: 'SIGKILL' })
  })
})

describe('createFrameDecoder', () => {
  test('decodifica una trama de datos completa', () => {
    const c = collector()
    c.feed(encodeDataFrame('salida'))
    expect(c.errors).toEqual([])
    expect(c.frames).toHaveLength(1)
    expect(c.frames[0]!.kind).toBe(DATA_TAG)
    expect((c.frames[0] as { payload: Buffer }).payload.toString()).toBe('salida')
  })

  test('decodifica una trama de control completa', () => {
    const c = collector()
    c.feed(encodeCtrlFrame({ t: 'resize', cols: 80, rows: 24 }))
    expect(c.errors).toEqual([])
    expect(c.frames[0]).toEqual({ kind: CTRL_TAG, ctrl: { t: 'resize', cols: 80, rows: 24 } })
  })

  test('reensambla una trama partida en trozos, byte a byte', () => {
    const c = collector()
    const trama = encodeDataFrame('partida en muchos pedazos')
    // Byte a byte es el caso extremo: si aguanta esto, aguanta cualquier corte.
    for (const b of trama) c.feed(Buffer.from([b]))
    expect(c.errors).toEqual([])
    expect(c.frames).toHaveLength(1)
    expect((c.frames[0] as { payload: Buffer }).payload.toString()).toBe('partida en muchos pedazos')
  })

  test('decodifica varias tramas de un solo trozo', () => {
    const c = collector()
    c.feed(Buffer.concat([
      encodeDataFrame('una'), encodeCtrlFrame({ t: 'live' }), encodeDataFrame('dos'),
    ]))
    expect(c.errors).toEqual([])
    expect(c.frames).toHaveLength(3)
    expect((c.frames[0] as { payload: Buffer }).payload.toString()).toBe('una')
    expect(c.frames[1]).toEqual({ kind: CTRL_TAG, ctrl: { t: 'live' } })
    expect((c.frames[2] as { payload: Buffer }).payload.toString()).toBe('dos')
  })

  test('deja pendiente una trama incompleta sin emitir nada', () => {
    const c = collector()
    const trama = encodeDataFrame('a medias')
    c.feed(trama.subarray(0, trama.length - 1))
    expect(c.frames).toEqual([])
    expect(c.errors).toEqual([])
    c.feed(trama.subarray(trama.length - 1))
    expect(c.frames).toHaveLength(1)
  })

  test('un trozo vacio no rompe ni emite', () => {
    // AÑADIDO: su suite no lo cubre. Un socket puede entregar un chunk vacio.
    const c = collector()
    c.feed(Buffer.alloc(0))
    expect(c.frames).toEqual([])
    expect(c.errors).toEqual([])
  })

  test('rechaza un cuerpo mayor que el tope', () => {
    const c = collector()
    const cabecera = Buffer.alloc(FRAME_HEADER_BYTES)
    cabecera.writeUInt32BE(FRAME_SIZE_CAP + 1, 0)
    cabecera.writeUInt8(DATA_TAG, 4)
    c.feed(cabecera)
    expect(c.frames).toEqual([])
    expect(c.errors).toHaveLength(1)
    expect(c.errors[0]).toContain('demasiado grande')
  })

  test('ACEPTA un cuerpo de tamano exactamente el tope', () => {
    // AÑADIDO, y es el que discrimina: un decodificador que rechazara TODO
    // pasaria el caso anterior. Este exige que la frontera sea inclusiva.
    const c = collector()
    c.feed(encodeDataFrame(Buffer.alloc(FRAME_SIZE_CAP, 0x61)))
    expect(c.errors).toEqual([])
    expect(c.frames).toHaveLength(1)
    expect((c.frames[0] as { payload: Buffer }).payload.length).toBe(FRAME_SIZE_CAP)
  })

  test('rechaza una trama de control con JSON invalido', () => {
    const c = collector()
    const cuerpo = Buffer.from('{esto no es json', 'utf8')
    const out = Buffer.alloc(FRAME_HEADER_BYTES + cuerpo.length)
    out.writeUInt32BE(cuerpo.length, 0)
    out.writeUInt8(CTRL_TAG, 4)
    cuerpo.copy(out, FRAME_HEADER_BYTES)
    c.feed(out)
    expect(c.frames).toEqual([])
    expect(c.errors[0]).toContain('json')
  })

  test('rechaza una trama de control con cuerpo de longitud cero', () => {
    // AÑADIDO: `JSON.parse('')` lanza, asi que el camino de error tiene que
    // atraparlo igual que un JSON mal formado. Sin este caso, un decodificador
    // que no envolviera el parse en try/catch tumbaria el proceso.
    const c = collector()
    const out = Buffer.alloc(FRAME_HEADER_BYTES)
    out.writeUInt32BE(0, 0)
    out.writeUInt8(CTRL_TAG, 4)
    c.feed(out)
    expect(c.frames).toEqual([])
    expect(c.errors).toHaveLength(1)
  })

  test('rechaza una etiqueta desconocida', () => {
    const c = collector()
    const out = Buffer.alloc(FRAME_HEADER_BYTES)
    out.writeUInt32BE(0, 0)
    out.writeUInt8(9, 4)
    c.feed(out)
    expect(c.errors[0]).toContain('9')
  })

  test('tras un error deja de procesar, incluso trozos validos', () => {
    const c = collector()
    const malo = Buffer.alloc(FRAME_HEADER_BYTES)
    malo.writeUInt32BE(0, 0)
    malo.writeUInt8(9, 4)
    c.feed(malo)
    c.feed(encodeDataFrame('esto ya no se lee'))
    expect(c.frames).toEqual([])
    expect(c.errors).toHaveLength(1)
  })

  test('ida y vuelta: N tramas codificadas vuelven identicas', () => {
    const c = collector()
    const cuerpos = ['uno', 'dos', 'tres', '', 'ñandú']
    c.feed(Buffer.concat(cuerpos.map(s => encodeDataFrame(s))))
    expect(c.errors).toEqual([])
    expect(c.frames.map(f => (f as { payload: Buffer }).payload.toString('utf8'))).toEqual(cuerpos)
  })
})
