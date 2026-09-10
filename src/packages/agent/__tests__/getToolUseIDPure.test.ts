/**
 * Porte de `ccnmt: packages/agent/__tests__/getToolUseIDPure.test.ts`.
 *
 * `getToolUseID` es el punto unico que resuelve «¿a que tool_use pertenece
 * este mensaje?» a traves de los cinco tipos de mensaje del bucle
 * (assistant, user, progress, system) — cada uno con su propia fuente del
 * dato (el primer bloque, `sourceToolUseID`, o el campo `toolUseID`
 * directo). `getToolResultIDs` reduce el historial al mapa
 * `tool_use_id → is_error` que otros ayudantes usan para saber que
 * herramientas ya resolvieron.
 */
import { describe, expect, test } from 'bun:test'
import { getToolUseID, getToolResultIDs } from '../messages.ts'
import type { NormalizedMessage } from '../messageShapes.ts'

// Ayudante: construye un NormalizedMessage con varias formas.
type Block = { type: string; [k: string]: unknown }

function userWithBlocks(blocks: Block[]): NormalizedMessage {
  return {
    type: 'user',
    message: { content: blocks },
  } as unknown as NormalizedMessage
}

function userWithSourceToolUseID(id: string): NormalizedMessage {
  return {
    type: 'user',
    sourceToolUseID: id,
    message: { content: 'whatever' },
  } as unknown as NormalizedMessage
}

function assistantWithBlocks(blocks: Block[]): NormalizedMessage {
  return {
    type: 'assistant',
    message: { content: blocks },
  } as unknown as NormalizedMessage
}

describe('getToolUseID — mensaje de asistente', () => {
  test('el primer bloque es tool_use → devuelve el id', () => {
    expect(
      getToolUseID(
        assistantWithBlocks([{ type: 'tool_use', id: 'tu_1', name: 'X' }]),
      ),
    ).toBe('tu_1')
  })

  test('el primer bloque es texto → null (solo importa el primer bloque)', () => {
    expect(
      getToolUseID(
        assistantWithBlocks([
          { type: 'text', text: 'thinking' },
          { type: 'tool_use', id: 'tu_2', name: 'X' },
        ]),
      ),
    ).toBeNull()
  })

  test('arreglo de contenido vacio → null', () => {
    expect(getToolUseID(assistantWithBlocks([]))).toBeNull()
  })

  test('contenido no-arreglo (cadena) → null', () => {
    expect(
      getToolUseID({
        type: 'assistant',
        message: { content: 'plain text' },
      } as unknown as NormalizedMessage),
    ).toBeNull()
  })

  test('el primer bloque es una cadena (forma rara de la API) → null', () => {
    // El chequeo maneja explicitamente `typeof firstBlock === 'string'` →
    // null. Algunas respuestas antiguas de la API usan bloques de
    // contenido en cadena.
    expect(
      getToolUseID({
        type: 'assistant',
        message: { content: ['raw string' as unknown as Block] },
      } as unknown as NormalizedMessage),
    ).toBeNull()
  })
})

describe('getToolUseID — mensaje de usuario', () => {
  test('sourceToolUseID definido → lo devuelve (anula el recorrido del contenido)', () => {
    expect(getToolUseID(userWithSourceToolUseID('tu_src'))).toBe('tu_src')
  })

  test('sourceToolUseID definido gana incluso si el contenido tiene tool_result', () => {
    // sourceToolUseID es el ID «etiquetado via» que agrega
    // tagMessagesWithToolUseID. TIENE que ganar — el tool_result del
    // contenido es solo incidental.
    expect(
      getToolUseID({
        type: 'user',
        sourceToolUseID: 'tu_winner',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'tu_loser' }],
        },
      } as unknown as NormalizedMessage),
    ).toBe('tu_winner')
  })

  test('el primer bloque es tool_result → devuelve su tool_use_id', () => {
    expect(
      getToolUseID(
        userWithBlocks([
          { type: 'tool_result', tool_use_id: 'tu_3', content: 'r' },
        ]),
      ),
    ).toBe('tu_3')
  })

  test('el primer bloque es texto (no tool_result) → null', () => {
    expect(
      getToolUseID(userWithBlocks([{ type: 'text', text: 'reply' }])),
    ).toBeNull()
  })

  test('contenido vacio → null', () => {
    expect(getToolUseID(userWithBlocks([]))).toBeNull()
  })

  test('contenido no-arreglo + sin sourceToolUseID → null', () => {
    expect(
      getToolUseID({
        type: 'user',
        message: { content: 'plain user message' },
      } as unknown as NormalizedMessage),
    ).toBeNull()
  })
})

describe('getToolUseID — progress / system / attachment', () => {
  test('un mensaje progress devuelve el campo toolUseID', () => {
    expect(
      getToolUseID({
        type: 'progress',
        toolUseID: 'tu_p',
      } as unknown as NormalizedMessage),
    ).toBe('tu_p')
  })

  test('el subtipo informational de system con toolUseID lo devuelve', () => {
    expect(
      getToolUseID({
        type: 'system',
        subtype: 'informational',
        toolUseID: 'tu_sys',
      } as unknown as NormalizedMessage),
    ).toBe('tu_sys')
  })

  test('informational sin toolUseID devuelve null', () => {
    expect(
      getToolUseID({
        type: 'system',
        subtype: 'informational',
      } as unknown as NormalizedMessage),
    ).toBeNull()
  })

  test('un subtipo de system que NO es informational devuelve null aunque haya toolUseID', () => {
    // Critico: solo el subtipo 'informational' esta asociado a un
    // tool_use. 'init', 'compact_boundary' etc. NO deberian propagar el
    // campo.
    expect(
      getToolUseID({
        type: 'system',
        subtype: 'compact_boundary',
        toolUseID: 'tu_should_not_propagate',
      } as unknown as NormalizedMessage),
    ).toBeNull()
  })
})

describe('getToolResultIDs — flatMap sobre los tool_results', () => {
  test('entrada vacia → objeto vacio', () => {
    expect(getToolResultIDs([])).toEqual({})
  })

  test('extrae tool_use_id de un usuario-con-tool_result-como-primer-bloque', () => {
    const r = getToolResultIDs([
      userWithBlocks([
        { type: 'tool_result', tool_use_id: 'tu_a', content: 'x' },
      ]),
    ])
    expect(r).toEqual({ tu_a: false })
  })

  test('la bandera is_error se propaga', () => {
    const r = getToolResultIDs([
      userWithBlocks([
        {
          type: 'tool_result',
          tool_use_id: 'tu_a',
          is_error: true,
          content: 'err',
        },
      ]),
    ])
    expect(r).toEqual({ tu_a: true })
  })

  test('is_error ausente se toma como false por defecto', () => {
    const r = getToolResultIDs([
      userWithBlocks([
        { type: 'tool_result', tool_use_id: 'tu_b', content: 'r' },
      ]),
    ])
    expect(r.tu_b).toBe(false)
  })

  test('el primer bloque que no es tool-result se omite', () => {
    const r = getToolResultIDs([
      userWithBlocks([{ type: 'text', text: 'hi' }]),
    ])
    expect(r).toEqual({})
  })

  test('los mensajes de asistente se omiten (solo el usuario lleva tool_result)', () => {
    const r = getToolResultIDs([
      assistantWithBlocks([
        { type: 'tool_result', tool_use_id: 'tu_c' } as unknown as Block,
      ]),
    ])
    expect(r).toEqual({})
  })

  test('varios mensajes de tool_result — todos se extraen', () => {
    const r = getToolResultIDs([
      userWithBlocks([
        { type: 'tool_result', tool_use_id: 'tu_a', content: 'a' },
      ]),
      userWithBlocks([
        {
          type: 'tool_result',
          tool_use_id: 'tu_b',
          content: 'b',
          is_error: true,
        },
      ]),
    ])
    expect(r).toEqual({ tu_a: false, tu_b: true })
  })

  test('solo se revisa el PRIMER bloque (segun el comentario de la implementacion)', () => {
    // Documenta el contrato actual: solo content[0] importa. Si un futuro
    // mensaje tiene varios bloques tool_result en un solo mensaje (raro),
    // solo se captura el primero.
    const r = getToolResultIDs([
      userWithBlocks([
        { type: 'tool_result', tool_use_id: 'tu_first', content: 'a' },
        { type: 'tool_result', tool_use_id: 'tu_second', content: 'b' },
      ]),
    ])
    expect(r).toEqual({ tu_first: false })
    expect(r.tu_second).toBeUndefined()
  })

  test('el contenido no-arreglo se omite en silencio', () => {
    const r = getToolResultIDs([
      {
        type: 'user',
        message: { content: 'plain string' },
      } as unknown as NormalizedMessage,
    ])
    expect(r).toEqual({})
  })

  test('los duplicados colapsan al ultimo-gana (semantica de Object.fromEntries)', () => {
    // Sonda CRITICA: si el mismo tool_use_id aparece dos veces (raro pero
    // posible durante un reintento), Object.fromEntries conserva el
    // ULTIMO valor. Lo documenta.
    const r = getToolResultIDs([
      userWithBlocks([
        { type: 'tool_result', tool_use_id: 'tu_dup', is_error: false, content: 'first' },
      ]),
      userWithBlocks([
        { type: 'tool_result', tool_use_id: 'tu_dup', is_error: true, content: 'second' },
      ]),
    ])
    expect(r.tu_dup).toBe(true) // gana el ultimo
  })
})
