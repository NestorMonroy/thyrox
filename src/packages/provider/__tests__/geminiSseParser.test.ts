/**
 * Porte del contrato de `ccnmt: packages/provider/src/__tests__/sseParser.test.ts`
 * (35 casos en 6 describes): el analizador incremental de tramas SSE.
 *
 * Es la suite mas grande que la fuente dedica a un modulo de este paquete, y
 * su valor esta en que documenta las decisiones INCOMODAS del analizador —las
 * que un lector supondria al reves— caso por caso: una trama con `data` vacio
 * se descarta, una linea sin dos puntos se salta, una trama que solo trae
 * comentario SI se emite.
 */
import { describe, expect, test } from 'bun:test'
import { parseSSEFrames } from '../src/gemini/sseParser.js'

describe('parseSSEFrames — tramas basicas', () => {
  test('una trama completa se extrae', () => {
    const { frames, remaining } = parseSSEFrames('data: hello\n\n')
    expect(frames).toEqual([{ data: 'hello' }])
    expect(remaining).toBe('')
  })

  test('varias tramas se parten por el doble salto de linea', () => {
    const { frames, remaining } = parseSSEFrames('data: a\n\ndata: b\n\ndata: c\n\n')
    expect(frames).toEqual([{ data: 'a' }, { data: 'b' }, { data: 'c' }])
    expect(remaining).toBe('')
  })

  test('la trama incompleta del final vuelve en remaining', () => {
    const { frames, remaining } = parseSSEFrames('data: complete\n\ndata: incomplete')
    expect(frames).toEqual([{ data: 'complete' }])
    expect(remaining).toBe('data: incomplete')
  })

  test('un buffer entero incompleto da cero tramas y vuelve completo', () => {
    const { frames, remaining } = parseSSEFrames('data: partial')
    expect(frames).toEqual([])
    expect(remaining).toBe('data: partial')
  })

  test('un buffer vacio da cero tramas', () => {
    const { frames, remaining } = parseSSEFrames('')
    expect(frames).toEqual([])
    expect(remaining).toBe('')
  })
})

describe('parseSSEFrames — los campos', () => {
  test('el campo event se extrae', () => {
    expect(parseSSEFrames('event: message\ndata: hi\n\n').frames).toEqual([
      { event: 'message', data: 'hi' },
    ])
  })

  test('el campo id se extrae', () => {
    expect(parseSSEFrames('id: 42\ndata: hi\n\n').frames).toEqual([
      { id: '42', data: 'hi' },
    ])
  })

  test('los tres campos juntos', () => {
    expect(parseSSEFrames('event: chunk\nid: 1\ndata: payload\n\n').frames).toEqual([
      { event: 'chunk', id: '1', data: 'payload' },
    ])
  })

  test('los campos desconocidos se descartan en silencio (retry:)', () => {
    expect(parseSSEFrames('retry: 5000\ndata: hi\n\n').frames).toEqual([{ data: 'hi' }])
  })

  test('varias lineas data: se concatenan con salto de linea, segun la norma', () => {
    // Es lo que hace posible un JSON en streaming que abarca varias lineas.
    expect(parseSSEFrames('data: line1\ndata: line2\ndata: line3\n\n').frames).toEqual([
      { data: 'line1\nline2\nline3' },
    ])
  })

  test('con varias lineas event:, gana la ULTIMA', () => {
    // La norma calla sobre los campos no-data repetidos; esta implementacion
    // sobreescribe.
    expect(parseSSEFrames('event: first\nevent: last\ndata: x\n\n').frames).toEqual([
      { event: 'last', data: 'x' },
    ])
  })
})

describe('parseSSEFrames — los dos puntos y el valor', () => {
  test('se recorta UN espacio tras los dos puntos', () => {
    expect(parseSSEFrames('data: hi\n\n').frames).toEqual([{ data: 'hi' }])
  })

  test('sin espacio, el valor no pierde nada', () => {
    expect(parseSSEFrames('data:hi\n\n').frames).toEqual([{ data: 'hi' }])
  })

  test('con DOS espacios, solo se recorta UNO', () => {
    expect(parseSSEFrames('data:  hi\n\n').frames).toEqual([{ data: ' hi' }])
  })

  test('un valor con dos puntos dentro se conserva entero', () => {
    // El corte es por el PRIMER dos puntos.
    expect(parseSSEFrames('data: http://example.com\n\n').frames).toEqual([
      { data: 'http://example.com' },
    ])
  })

  test('una linea sin dos puntos se salta en silencio', () => {
    // La norma dice tratarla como campo con valor vacio; esta
    // implementacion la descarta.
    expect(parseSSEFrames('garbage\ndata: hi\n\n').frames).toEqual([{ data: 'hi' }])
  })

  test('con valor vacio la trama se DESCARTA: la guarda mide veracidad', () => {
    // La guarda final es `frame.data || isComment`, y la cadena vacia es
    // falsy.
    expect(parseSSEFrames('data:\n\n').frames).toEqual([])
  })
})

describe('parseSSEFrames — comentarios y keepalive', () => {
  test('una trama que solo trae comentario SI se emite, vacia', () => {
    // A proposito: deja al consumidor refrescar su temporizador de vivacidad.
    expect(parseSSEFrames(':keepalive\n\n').frames).toEqual([{}])
  })

  test('comentario mas data conserva el data', () => {
    expect(parseSSEFrames(':comment line\ndata: real\n\n').frames).toEqual([
      { data: 'real' },
    ])
  })

  test('una trama de varias lineas de comentario emite una sola vacia', () => {
    expect(parseSSEFrames(':line1\n:line2\n\n').frames).toEqual([{}])
  })
})

describe('parseSSEFrames — los bordes', () => {
  test('una trama de solo espacios se salta', () => {
    expect(parseSSEFrames('   \n\ndata: real\n\n').frames).toEqual([{ data: 'real' }])
  })

  test('sin data y sin comentario, la trama NO se emite', () => {
    // Es contrato: el consumidor solo actua sobre tramas con datos.
    expect(parseSSEFrames('event: hi\n\n').frames).toEqual([])
    expect(parseSSEFrames('id: 42\n\n').frames).toEqual([])
  })

  test('un data vacio se descarta, con espacio y sin el', () => {
    // El caso de la fuente se llama «empty data field IS emitted (truthy
    // because present)» y sus dos aserciones dicen lo contrario: se descarta.
    // Se porta la CONDUCTA que mide, con el nombre corregido.
    expect(parseSSEFrames('data: \n\n').frames).toEqual([])
    expect(parseSSEFrames('data:\n\n').frames).toEqual([])
  })

  test('varios dobles saltos seguidos no producen tramas vacias', () => {
    expect(parseSSEFrames('data: a\n\n\n\ndata: b\n\n').frames).toEqual([
      { data: 'a' },
      { data: 'b' },
    ])
  })

  test('un doble salto al principio no produce trama', () => {
    expect(parseSSEFrames('\n\ndata: x\n\n').frames).toEqual([{ data: 'x' }])
  })

  test('con finales CRLF las tramas se analizan igual', () => {
    // La norma WHATWG admite CRLF, LF y CR sueltos como separador. Sin
    // normalizar, un servidor que emita CRLF —observado en Gemini tras
    // ciertos proxies— daria cero tramas y el stream se colgaria.
    expect(parseSSEFrames('data: hi\r\n\r\n').frames).toEqual([{ data: 'hi' }])
  })

  test('con finales de CR suelto tambien', () => {
    expect(parseSSEFrames('data: hi\r\r').frames).toEqual([{ data: 'hi' }])
  })

  test('CRLF y LF mezclados en el mismo buffer se normalizan bien', () => {
    expect(parseSSEFrames('event: e\r\ndata: x\n\n').frames).toEqual([
      { event: 'e', data: 'x' },
    ])
  })

  test('una trama parcial tras una completa vuelve entera en remaining', () => {
    const { frames, remaining } = parseSSEFrames(
      'data: complete\n\ndata: incomplete\nevent:',
    )
    expect(frames).toEqual([{ data: 'complete' }])
    expect(remaining).toBe('data: incomplete\nevent:')
  })

  test('recomposicion en streaming: parcial mas resto da la trama completa', () => {
    const r1 = parseSSEFrames('data: part1')
    expect(r1.frames).toEqual([])

    const r2 = parseSSEFrames(r1.remaining + ' part2\n\n')
    expect(r2.frames).toEqual([{ data: 'part1 part2' }])
  })

  test('campos mezclados: event, dos data y una linea ajena', () => {
    expect(
      parseSSEFrames('event: chunk\ndata: a\ndata: b\nignored: junk\n\n').frames,
    ).toEqual([{ event: 'chunk', data: 'a\nb' }])
  })

  test('lo que sigue al ultimo doble salto queda en remaining', () => {
    const { frames, remaining } = parseSSEFrames('data: a\n\ndata: ')
    expect(frames).toEqual([{ data: 'a' }])
    expect(remaining).toBe('data: ')
  })
})

describe('parseSSEFrames — sonda con el formato de cable de Anthropic', () => {
  test('event mas un data con JSON', () => {
    const wire =
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0}\n\n'
    expect(parseSSEFrames(wire).frames).toEqual([
      {
        event: 'content_block_delta',
        data: '{"type":"content_block_delta","index":0}',
      },
    ])
  })

  test('varias lineas data con un JSON partido, que la norma admite', () => {
    const wire = 'event: e\ndata: {\ndata:   "x": 1\ndata: }\n\n'
    expect(parseSSEFrames(wire).frames).toEqual([{ event: 'e', data: '{\n  "x": 1\n}' }])
  })

  test('un keepalive entre dos tramas de datos', () => {
    const wire = 'data: first\n\n:keep-alive\n\ndata: second\n\n'
    expect(parseSSEFrames(wire).frames).toEqual([
      { data: 'first' },
      {},
      { data: 'second' },
    ])
  })
})
