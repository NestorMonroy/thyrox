/**
 * Porte de `ccnmt: packages/agent/__tests__/toolSearchPure.test.ts`
 * contra `../toolSearch.ts` (puerto PARCIAL — ver la cabecera de ese
 * archivo: sólo `isToolReferenceBlock` y `extractDiscoveredToolNames`,
 * de los trece símbolos exportados por la fuente).
 *
 * Casos, datos y aserciones idénticos a la fuente. La descripción de cada
 * `describe`/`test` se tradujo al español; los identificadores quedan en
 * inglés.
 */
import { describe, expect, test } from 'bun:test'
import {
  extractDiscoveredToolNames,
  isToolReferenceBlock,
} from '../toolSearch.js'

type Msg = Parameters<typeof extractDiscoveredToolNames>[0][number]

describe('isToolReferenceBlock — type guard en runtime', () => {
  test('bloque tool_reference válido → true', () => {
    expect(isToolReferenceBlock({ type: 'tool_reference' })).toBe(true)
  })

  test('tool_reference con campos extra sigue coincidiendo', () => {
    expect(
      isToolReferenceBlock({ type: 'tool_reference', tool_name: 'X' }),
    ).toBe(true)
  })

  test('type distinto → false', () => {
    expect(isToolReferenceBlock({ type: 'tool_use' })).toBe(false)
    expect(isToolReferenceBlock({ type: 'text' })).toBe(false)
    expect(isToolReferenceBlock({ type: 'tool_result' })).toBe(false)
  })

  test('null → false', () => {
    expect(isToolReferenceBlock(null)).toBe(false)
  })

  test('undefined → false', () => {
    expect(isToolReferenceBlock(undefined)).toBe(false)
  })

  test('primitivos → false', () => {
    expect(isToolReferenceBlock('tool_reference')).toBe(false)
    expect(isToolReferenceBlock(42)).toBe(false)
    expect(isToolReferenceBlock(true)).toBe(false)
  })

  test('objeto sin campo type → false', () => {
    expect(isToolReferenceBlock({ tool_name: 'X' })).toBe(false)
  })

  test('objeto con type pero valor equivocado → false', () => {
    expect(isToolReferenceBlock({ type: 'TOOL_REFERENCE' })).toBe(false) // sensible a mayúsculas
    expect(isToolReferenceBlock({ type: '' })).toBe(false)
  })

  test('arreglo → false (typeof [] === "object" pero sin campo type)', () => {
    expect(isToolReferenceBlock([])).toBe(false)
    expect(isToolReferenceBlock([{ type: 'tool_reference' }])).toBe(false)
  })
})

describe('extractDiscoveredToolNames — entrada vacía', () => {
  test('arreglo vacío → conjunto vacío', () => {
    expect(extractDiscoveredToolNames([])).toEqual(new Set())
  })
})

describe('extractDiscoveredToolNames — filtrado por tipo de mensaje', () => {
  test('los mensajes assistant se saltan (sólo user trae tool_result)', () => {
    // Aunque metiéramos tool_result a la fuerza en un mensaje assistant
    // (imposible en la práctica), la función no debe recorrerlo.
    const msgs: Msg[] = [
      {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [{ type: 'tool_reference', tool_name: 'foo' }],
            },
          ],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set())
  })

  test('los mensajes progress se saltan', () => {
    const msgs: Msg[] = [
      {
        type: 'progress',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [{ type: 'tool_reference', tool_name: 'foo' }],
            },
          ],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set())
  })

  test('content que no es arreglo se salta en silencio', () => {
    const msgs: Msg[] = [
      { type: 'user', message: { content: 'plain text' } } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set())
  })

  test('campo message ausente se salta', () => {
    const msgs: Msg[] = [{ type: 'user' } as Msg]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set())
  })
})

describe('extractDiscoveredToolNames — extracción de tool_reference', () => {
  test('un solo tool_reference dentro de tool_result', () => {
    const msgs: Msg[] = [
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [{ type: 'tool_reference', tool_name: 'mcp__foo' }],
            },
          ],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set(['mcp__foo']))
  })

  test('múltiples tool_references en el mismo tool_result', () => {
    const msgs: Msg[] = [
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [
                { type: 'tool_reference', tool_name: 'a' },
                { type: 'tool_reference', tool_name: 'b' },
                { type: 'tool_reference', tool_name: 'c' },
              ],
            },
          ],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(
      new Set(['a', 'b', 'c']),
    )
  })

  test('múltiples tool_results a través de mensajes — se acumulan', () => {
    const msgs: Msg[] = [
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [{ type: 'tool_reference', tool_name: 'a' }],
            },
          ],
        },
      } as Msg,
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [{ type: 'tool_reference', tool_name: 'b' }],
            },
          ],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set(['a', 'b']))
  })

  test('los duplicados se deduplican por el Set', () => {
    const msgs: Msg[] = [
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [
                { type: 'tool_reference', tool_name: 'foo' },
                { type: 'tool_reference', tool_name: 'foo' },
              ],
            },
          ],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set(['foo']))
  })

  test('tool_reference mezclado con no-referencias — sólo se extraen las referencias', () => {
    const msgs: Msg[] = [
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [
                { type: 'text', text: 'some output' },
                { type: 'tool_reference', tool_name: 'mcp__foo' },
                { type: 'image', source: { type: 'base64' } },
              ],
            },
          ],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set(['mcp__foo']))
  })

  test('tool_reference SIN campo tool_name se descarta', () => {
    // La verificación en runtime exige que 'type' === 'tool_reference' Y
    // que 'tool_name' sea un string. Una entrada malformada sin
    // tool_name se descarta en silencio (defensivo).
    const msgs: Msg[] = [
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [{ type: 'tool_reference' }], // sin tool_name
            },
          ],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set())
  })

  test('tool_reference con tool_name que no es string se descarta', () => {
    const msgs: Msg[] = [
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [{ type: 'tool_reference', tool_name: 42 }],
            },
          ],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set())
  })

  test('tool_result con content que no es arreglo se descarta en silencio', () => {
    // isToolResultBlockWithContent exige Array.isArray(content).
    const msgs: Msg[] = [
      {
        type: 'user',
        message: {
          content: [{ type: 'tool_result', content: 'not an array' }],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set())
  })
})

describe('extractDiscoveredToolNames — carry de compact_boundary', () => {
  // CRÍTICO: cuando la compactación resume mensajes que portan
  // tool_reference, el conjunto descubierto se snapshotea sobre el
  // marcador de frontera. El recorrido lo vuelve a leer. Sin esto, tras
  // la compactación el modelo perdería visibilidad sobre las
  // herramientas que había descubierto antes.

  test('compact_boundary con preCompactDiscoveredTools porta los nombres', () => {
    const msgs: Msg[] = [
      {
        type: 'system',
        subtype: 'compact_boundary',
        compactMetadata: {
          preCompactDiscoveredTools: ['mcp__a', 'mcp__b'],
        },
      } as unknown as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(
      new Set(['mcp__a', 'mcp__b']),
    )
  })

  test('compact_boundary SIN preCompactDiscoveredTools es no-op', () => {
    const msgs: Msg[] = [
      {
        type: 'system',
        subtype: 'compact_boundary',
      } as unknown as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set())
  })

  test('un mensaje system que no es compact (subtype distinto) es no-op', () => {
    const msgs: Msg[] = [
      {
        type: 'system',
        subtype: 'init',
        compactMetadata: { preCompactDiscoveredTools: ['x'] },
      } as unknown as Msg,
    ]
    // No es compact_boundary → no es candidato de carry. El
    // descubrimiento sólo dispara para compact_boundary específicamente.
    expect(extractDiscoveredToolNames(msgs)).toEqual(new Set())
  })

  test('las herramientas portadas se acumulan con los descubrimientos post-compact', () => {
    const msgs: Msg[] = [
      {
        type: 'system',
        subtype: 'compact_boundary',
        compactMetadata: { preCompactDiscoveredTools: ['mcp__pre'] },
      } as unknown as Msg,
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              content: [{ type: 'tool_reference', tool_name: 'mcp__post' }],
            },
          ],
        },
      } as Msg,
    ]
    expect(extractDiscoveredToolNames(msgs)).toEqual(
      new Set(['mcp__pre', 'mcp__post']),
    )
  })
})

describe('extractDiscoveredToolNames — contrato del valor de retorno', () => {
  test('devuelve una instancia de Set', () => {
    expect(extractDiscoveredToolNames([])).toBeInstanceOf(Set)
  })

  test('devuelve un Set fresco por llamada (sin mutación compartida)', () => {
    const r1 = extractDiscoveredToolNames([])
    const r2 = extractDiscoveredToolNames([])
    expect(r1).not.toBe(r2)
  })
})
