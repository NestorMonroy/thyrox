/**
 * Las partes de mensaje de `gemini/convertMessages.ts`, cubiertas por
 * conducta.
 *
 * PROCEDENCIA, declarada: esto NO es contrato portado. El modulo son 322
 * lineas con once funciones privadas, y los 12 casos que la fuente le dedica
 * no interrogan ni una vez la normalizacion de argumentos, la de la respuesta
 * de herramienta, el bloque de imagen ni el ida y vuelta de la firma de
 * pensamiento — que es el mecanismo mas peculiar del modulo y el unico que
 * existe porque la forma de Anthropic no tiene sitio para un dato de Gemini.
 *
 * Se llega a todo por `anthropicMessagesToGemini`, la unica puerta publica.
 *
 * CONTROLES DE ANULACION, medidos:
 *
 * | Anulacion | contrato portado (12) | esta suite (32) |
 * |---|---|---|
 * | el nombre del resultado deja de resolverse por el mapa | 1 | 1 |
 * | la firma de pensamiento deja de viajar | **0** | **2** |
 *
 * La primera fila es honesta en las dos direcciones: el contrato SI cubre el
 * mapa de nombres —le dedica su ultimo caso— asi que ahi esta suite no aporta
 * cobertura nueva, solo casos de borde (el resultado que llega antes que su
 * llamada, y el mapa cruzando varios turnos). La segunda es donde el contrato
 * es ciego: el mecanismo que existe precisamente porque la forma de Anthropic
 * no tiene sitio para ese dato de Gemini puede desaparecer entero sin que
 * ninguno de sus 12 casos cambie de veredicto.
 */
import { describe, expect, test } from 'bun:test'
import { anthropicMessagesToGemini } from '../src/gemini/convertMessages.js'
import { GEMINI_THOUGHT_SIGNATURE_FIELD } from '../src/gemini/types.js'

type Parte = {
  text?: string
  thought?: boolean
  thoughtSignature?: string
  functionCall?: { name?: string; args?: Record<string, unknown> }
  functionResponse?: { name?: string; response?: Record<string, unknown> }
  inlineData?: { mimeType: string; data: string }
}

function partesDe(tipo: 'user' | 'assistant', content: unknown): Parte[] {
  const r = anthropicMessagesToGemini(
    [{ type: tipo, uuid: 'u', message: { content } }] as never,
    [] as never,
  )
  return (r.contents[0]?.parts ?? []) as Parte[]
}

describe('partes de texto', () => {
  test('un texto vacio NO produce parte', () => {
    expect(partesDe('user', [{ type: 'text', text: '' }])).toEqual([])
  })

  test('un texto que no es cadena NO produce parte', () => {
    expect(partesDe('user', [{ type: 'text', text: 42 }])).toEqual([])
  })

  test('una cadena suelta dentro del arreglo cuenta como texto', () => {
    expect(partesDe('user', ['suelta'])).toEqual([{ text: 'suelta' }])
  })
})

describe('el bloque de pensamiento', () => {
  test('da una parte de TEXTO marcada con thought, no un tipo aparte', () => {
    expect(partesDe('assistant', [{ type: 'thinking', thinking: 'pienso' }])).toEqual([
      { text: 'pienso', thought: true },
    ])
  })

  test('su signature viaja como thoughtSignature', () => {
    expect(
      partesDe('assistant', [{ type: 'thinking', thinking: 'p', signature: 'sig' }]),
    ).toEqual([{ text: 'p', thought: true, thoughtSignature: 'sig' }])
  })

  test('un pensamiento vacio NO produce parte', () => {
    expect(partesDe('assistant', [{ type: 'thinking', thinking: '' }])).toEqual([])
  })
})

describe('la firma de pensamiento adosada a otros bloques', () => {
  test('un bloque de texto la lleva a su parte', () => {
    const partes = partesDe('assistant', [
      { type: 'text', text: 'visible', [GEMINI_THOUGHT_SIGNATURE_FIELD]: 'firma' },
    ])
    expect(partes).toEqual([{ text: 'visible', thoughtSignature: 'firma' }])
  })

  test('un tool_use la lleva junto a su functionCall', () => {
    const partes = partesDe('assistant', [
      {
        type: 'tool_use',
        id: 't',
        name: 'X',
        input: {},
        [GEMINI_THOUGHT_SIGNATURE_FIELD]: 'firma',
      },
    ])
    expect(partes[0]?.thoughtSignature).toBe('firma')
  })

  test('una firma vacia NO se adosa', () => {
    const partes = partesDe('assistant', [
      { type: 'text', text: 'v', [GEMINI_THOUGHT_SIGNATURE_FIELD]: '' },
    ])
    expect(partes[0]).not.toHaveProperty('thoughtSignature')
  })

  test('una firma que no es cadena NO se adosa', () => {
    const partes = partesDe('assistant', [
      { type: 'text', text: 'v', [GEMINI_THOUGHT_SIGNATURE_FIELD]: 7 },
    ])
    expect(partes[0]).not.toHaveProperty('thoughtSignature')
  })
})

describe('los argumentos de una llamada a funcion', () => {
  function args(input: unknown) {
    return partesDe('assistant', [{ type: 'tool_use', id: 't', name: 'X', input }])[0]
      ?.functionCall?.args
  }

  test('un objeto viaja tal cual', () => {
    expect(args({ a: 1 })).toEqual({ a: 1 })
  })

  test('una cadena con JSON de objeto se analiza', () => {
    expect(args('{"a":1}')).toEqual({ a: 1 })
  })

  test('una cadena con JSON que NO es objeto se envuelve en value', () => {
    // Gemini exige un objeto; envolver conserva el dato en vez de perderlo.
    expect(args('[1,2]')).toEqual({ value: [1, 2] })
    expect(args('42')).toEqual({ value: 42 })
  })

  test('una cadena que no es JSON valido tambien se envuelve, con el null del analisis', () => {
    // safeParseJSON devuelve null y ese null da objeto vacio, no {value:null}.
    expect(args('no es json')).toEqual({})
  })

  test('un arreglo se envuelve en value', () => {
    expect(args([1, 2])).toEqual({ value: [1, 2] })
  })

  test('undefined da objeto vacio', () => {
    expect(args(undefined)).toEqual({})
  })

  test('null se envuelve en value, no da objeto vacio', () => {
    // La comparacion final es contra `undefined`, no por veracidad.
    expect(args(null)).toEqual({ value: null })
  })
})

describe('la respuesta de un resultado de herramienta', () => {
  function respuesta(content: unknown, extra: Record<string, unknown> = {}) {
    return partesDe('user', [
      { type: 'tool_result', tool_use_id: 'tu_1', content, ...extra },
    ])[0]?.functionResponse?.response
  }

  test('sin tool_use previo, el nombre cae al id', () => {
    const p = partesDe('user', [
      { type: 'tool_result', tool_use_id: 'tu_1', content: 'x' },
    ])
    expect(p[0]?.functionResponse?.name).toBe('tu_1')
  })

  test('un texto que es JSON de objeto viaja como ese objeto', () => {
    expect(respuesta('{"ok":true}')).toEqual({ ok: true })
  })

  test('un texto llano se envuelve en result', () => {
    expect(respuesta('salida')).toEqual({ result: 'salida' })
  })

  test('un arreglo de bloques se une por su texto y luego se analiza', () => {
    expect(respuesta([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }])).toEqual({
      result: 'a\nb',
    })
  })

  test('un arreglo cuyo texto unido ES JSON se analiza a objeto', () => {
    expect(respuesta([{ type: 'text', text: '{"ok":1}' }])).toEqual({ ok: 1 })
  })

  test('un contenido ausente da la cadena vacia envuelta', () => {
    expect(respuesta(undefined)).toEqual({ result: '' })
  })

  test('is_error se anade al objeto cuando la respuesta YA es objeto', () => {
    expect(respuesta('{"ok":true}', { is_error: true })).toEqual({
      ok: true,
      is_error: true,
    })
  })

  test('is_error acompana al result cuando la respuesta se envuelve', () => {
    expect(respuesta('fallo', { is_error: true })).toEqual({
      result: 'fallo',
      is_error: true,
    })
  })

  test('sin is_error la clave NO aparece', () => {
    expect(respuesta('ok')).not.toHaveProperty('is_error')
  })
})

describe('el bloque de imagen', () => {
  test('una imagen en base64 da inlineData con su tipo de medio', () => {
    expect(
      partesDe('user', [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAA' } },
      ]),
    ).toEqual([{ inlineData: { mimeType: 'image/jpeg', data: 'AAA' } }])
  })

  test('sin media_type cae a image/png', () => {
    const p = partesDe('user', [
      { type: 'image', source: { type: 'base64', data: 'AAA' } },
    ])
    expect(p[0]?.inlineData?.mimeType).toBe('image/png')
  })

  test('una imagen por URL viaja como TEXTO: Gemini no las admite', () => {
    expect(
      partesDe('user', [
        { type: 'image', source: { type: 'url', url: 'https://e.com/i.png' } },
      ]),
    ).toEqual([{ text: '[image: https://e.com/i.png]' }])
  })

  test('una imagen sin fuente no produce parte', () => {
    expect(partesDe('user', [{ type: 'image' }])).toEqual([])
  })
})

describe('el mapa de nombres de herramienta entre mensajes', () => {
  test('un tool_use posterior NO nombra un resultado anterior', () => {
    // El mapa se puebla al recorrer, en orden: un resultado que llega antes
    // que su llamada cae al id.
    const r = anthropicMessagesToGemini(
      [
        { type: 'user', uuid: 'u', message: { content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'x' }] } },
        { type: 'assistant', uuid: 'a', message: { content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} }] } },
      ] as never,
      [] as never,
    )
    const partesUsuario = r.contents[0]?.parts as Parte[]
    expect(partesUsuario[0]?.functionResponse?.name).toBe('tu_1')
  })

  test('el mapa sobrevive entre varios turnos', () => {
    const r = anthropicMessagesToGemini(
      [
        { type: 'assistant', uuid: 'a', message: { content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} }] } },
        { type: 'user', uuid: 'u', message: { content: [{ type: 'text', text: 'entre medias' }] } },
        { type: 'user', uuid: 'u2', message: { content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'x' }] } },
      ] as never,
      [] as never,
    )
    const ultimas = r.contents[2]?.parts as Parte[]
    expect(ultimas[0]?.functionResponse?.name).toBe('Bash')
  })
})
