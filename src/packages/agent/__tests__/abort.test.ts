/**
 * Porte de `ccnmt: packages/agent/__tests__/abort.test.ts`.
 * `shouldAbort` es un wrapper trivial sobre `AbortSignal.aborted`;
 * `createSyntheticToolResults` fabrica resultados de error para los
 * `tool_use` pendientes del ÚLTIMO mensaje de assistant, para que una
 * interrupción no deje un turno con herramientas sin su `tool_result`
 * (la API rechaza esa forma de transcript).
 */
import { describe, expect, test } from 'bun:test'
import { createSyntheticToolResults, shouldAbort } from '../internal/abort.ts'

type Msg = Parameters<typeof createSyntheticToolResults>[0][number]

describe('shouldAbort', () => {
  test('devuelve false cuando el signal es undefined', () => {
    expect(shouldAbort(undefined)).toBe(false)
  })
  test('devuelve false cuando el signal no está abortado', () => {
    const c = new AbortController()
    expect(shouldAbort(c.signal)).toBe(false)
  })
  test('devuelve true cuando el signal está abortado', () => {
    const c = new AbortController()
    c.abort()
    expect(shouldAbort(c.signal)).toBe(true)
  })
  test('devuelve false sin argumento (default)', () => {
    expect(shouldAbort()).toBe(false)
  })
})

describe('createSyntheticToolResults — casos vacíos / sin tool_use', () => {
  test('devuelve un arreglo vacío cuando messages está vacío', () => {
    expect(createSyntheticToolResults([])).toEqual([])
  })

  test('devuelve un arreglo vacío cuando no hay mensajes de assistant', () => {
    expect(
      createSyntheticToolResults([
        { type: 'user', content: 'hello' } as never,
      ]),
    ).toEqual([])
  })

  test('devuelve un arreglo vacío cuando el assistant no tiene bloques tool_use', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        content: [{ type: 'text', text: 'hi' }],
      } as never,
    ]
    expect(createSyntheticToolResults(messages)).toEqual([])
  })

  test('devuelve un arreglo vacío cuando el content del assistant no es arreglo (string)', () => {
    const messages: Msg[] = [
      { type: 'assistant', content: 'plain string' } as never,
    ]
    expect(createSyntheticToolResults(messages)).toEqual([])
  })
})

describe('createSyntheticToolResults — extrae los tool_use pendientes del ÚLTIMO assistant', () => {
  test('produce un tool_result por cada bloque tool_use', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        content: [
          { type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} },
          { type: 'tool_use', id: 'tu_2', name: 'Edit', input: {} },
        ],
      } as never,
    ]
    const results = createSyntheticToolResults(messages)
    expect(results).toHaveLength(2)
    // El orden coincide con el orden de entrada.
    expect((results[0] as { tool_use_id: string }).tool_use_id).toBe('tu_1')
    expect((results[1] as { tool_use_id: string }).tool_use_id).toBe('tu_2')
  })

  test('la razón por defecto es "interrupted"', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} }],
      } as never,
    ]
    const results = createSyntheticToolResults(messages)
    expect((results[0] as { content: string }).content).toContain(
      '[interrupted]',
    )
  })

  test('una razón custom se interpola en el content del resultado', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} }],
      } as never,
    ]
    const results = createSyntheticToolResults(messages, 'user-canceled')
    expect((results[0] as { content: string }).content).toContain(
      '[user-canceled]',
    )
  })

  test('marca cada resultado con is_error: true', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} }],
      } as never,
    ]
    const results = createSyntheticToolResults(messages)
    expect((results[0] as { is_error: boolean }).is_error).toBe(true)
  })

  test('usa block.id como tool_use_id', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        content: [{ type: 'tool_use', id: 'unique-id', name: 'Bash', input: {} }],
      } as never,
    ]
    const results = createSyntheticToolResults(messages)
    expect((results[0] as { tool_use_id: string }).tool_use_id).toBe(
      'unique-id',
    )
  })

  test('sólo se examina el ÚLTIMO mensaje de assistant', () => {
    // Camina hacia atrás desde el final; el primer assistant que encuentra gana.
    const messages: Msg[] = [
      {
        type: 'assistant',
        content: [{ type: 'tool_use', id: 'old', name: 'Bash', input: {} }],
      } as never,
      { type: 'user', content: 'something' } as never,
      {
        type: 'assistant',
        content: [{ type: 'tool_use', id: 'new', name: 'Edit', input: {} }],
      } as never,
    ]
    const results = createSyntheticToolResults(messages)
    expect(results).toHaveLength(1)
    expect((results[0] as { tool_use_id: string }).tool_use_id).toBe('new')
  })

  test('el recorrido hacia atrás se detiene en el primer assistant encontrado', () => {
    // Aunque mensajes de assistant más antiguos tengan bloques tool_use,
    // el bucle se rompe tras el primer hit del recorrido inverso.
    const messages: Msg[] = [
      {
        type: 'assistant',
        content: [{ type: 'tool_use', id: 'oldest', name: 'X', input: {} }],
      } as never,
      {
        type: 'assistant',
        content: [{ type: 'tool_use', id: 'newest', name: 'Y', input: {} }],
      } as never,
    ]
    const results = createSyntheticToolResults(messages)
    expect(results).toHaveLength(1)
    expect((results[0] as { tool_use_id: string }).tool_use_id).toBe(
      'newest',
    )
  })

  test('los bloques que no son tool_use en el mensaje de assistant se ignoran', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        content: [
          { type: 'text', text: 'thinking...' },
          { type: 'tool_use', id: 'real_tu', name: 'Bash', input: {} },
          { type: 'thinking', thinking: 'inner' },
        ],
      } as never,
    ]
    const results = createSyntheticToolResults(messages)
    expect(results).toHaveLength(1)
    expect((results[0] as { tool_use_id: string }).tool_use_id).toBe(
      'real_tu',
    )
  })

  test('los bloques sin propiedad "id" se omiten', () => {
    const messages: Msg[] = [
      {
        type: 'assistant',
        content: [
          { type: 'tool_use', name: 'Bash', input: {} } as never,
          { type: 'tool_use', id: 'has_id', name: 'Edit', input: {} },
        ],
      } as never,
    ]
    const results = createSyntheticToolResults(messages)
    expect(results).toHaveLength(1)
  })
})
