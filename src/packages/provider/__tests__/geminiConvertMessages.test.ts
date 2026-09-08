/**
 * Porte del contrato de `ccnmt: packages/provider/src/__tests__/geminiConvertMessages.test.ts`
 * (12 casos en 3 describes).
 *
 * LO QUE ESTE CONTRATO NO CUBRE, y por eso hay una suite hermana. El modulo
 * son 322 lineas con once funciones privadas; estos 12 casos no interrogan ni
 * una vez la normalizacion de argumentos, la de la respuesta de herramienta,
 * el bloque de imagen, ni el ida y vuelta de la firma de pensamiento. Eso vive
 * en `geminiMessagePartsSuite`, declarado como cobertura propia.
 */
import { describe, expect, test } from 'bun:test'
import { anthropicMessagesToGemini } from '../src/gemini/convertMessages.js'

function user(content: unknown) {
  return {
    type: 'user' as const,
    uuid: '00000000-0000-0000-0000-000000000001',
    message: { content },
  }
}

function assistant(content: unknown) {
  return {
    type: 'assistant' as const,
    uuid: '00000000-0000-0000-0000-000000000002',
    message: { content },
  }
}

describe('anthropicMessagesToGemini — la instruccion de sistema', () => {
  test('el prompt de sistema da systemInstruction con su texto', () => {
    const result = anthropicMessagesToGemini([user('hi') as never], ['You are X'] as never)
    expect(result.systemInstruction).toBeDefined()
    expect(result.systemInstruction?.parts).toEqual([{ text: 'You are X' }])
  })

  test('varios segmentos se unen con doble salto de linea', () => {
    const result = anthropicMessagesToGemini(
      [user('hi') as never],
      ['Part A', 'Part B'] as never,
    )
    expect(result.systemInstruction?.parts[0]?.text).toBe('Part A\n\nPart B')
  })

  test('un prompt vacio NO produce la clave systemInstruction', () => {
    // Se omite a proposito: Gemini no acepta de buen grado una instruccion con
    // partes vacias.
    const result = anthropicMessagesToGemini([user('hi') as never], [] as never)
    expect(result).not.toHaveProperty('systemInstruction')
  })

  test('los segmentos falsy se filtran', () => {
    const result = anthropicMessagesToGemini(
      [user('hi') as never],
      ['ok', '', 'also ok'] as never,
    )
    expect(result.systemInstruction?.parts[0]?.text).toBe('ok\n\nalso ok')
  })
})

describe('anthropicMessagesToGemini — mensajes de usuario', () => {
  test('una cadena da rol user con una parte de texto', () => {
    const result = anthropicMessagesToGemini([user('hello') as never], [] as never)
    expect(result.contents).toHaveLength(1)
    expect(result.contents[0]?.role).toBe('user')
    expect(result.contents[0]?.parts[0]).toEqual({ text: 'hello' })
  })

  test('cada bloque de texto del arreglo da su parte', () => {
    const result = anthropicMessagesToGemini(
      [user([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }]) as never],
      [] as never,
    )
    expect(result.contents[0]?.parts.length).toBeGreaterThanOrEqual(2)
  })

  test('un contenido que no es arreglo da cero partes y el mensaje se descarta', () => {
    const result = anthropicMessagesToGemini(
      [user({ unexpected: 'shape' }) as never],
      [] as never,
    )
    expect(result.contents).toEqual([])
  })

  test('una lista de mensajes vacia da contents vacio', () => {
    const result = anthropicMessagesToGemini([], [] as never)
    expect(result.contents).toEqual([])
  })
})

describe('anthropicMessagesToGemini — mensajes de asistente', () => {
  test('una cadena da rol model — Gemini no dice assistant', () => {
    const result = anthropicMessagesToGemini([assistant('reply') as never], [] as never)
    expect(result.contents).toHaveLength(1)
    expect(result.contents[0]?.role).toBe('model')
  })

  test('texto mas tool_use produce una parte functionCall', () => {
    const result = anthropicMessagesToGemini(
      [
        assistant([
          { type: 'text', text: 'I will run' },
          { type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls' } },
        ]) as never,
      ],
      [] as never,
    )
    expect(result.contents[0]?.role).toBe('model')
    const parts = result.contents[0]?.parts as Array<{
      text?: string
      functionCall?: { name: string; args?: unknown }
    }>
    expect(parts.find(p => p.functionCall)?.functionCall?.name).toBe('Bash')
  })

  test('solo tool_use da solo la parte functionCall', () => {
    const result = anthropicMessagesToGemini(
      [assistant([{ type: 'tool_use', id: 'tu_1', name: 'X', input: {} }]) as never],
      [] as never,
    )
    const parts = result.contents[0]?.parts as Array<{ functionCall?: { name: string } }>
    expect(parts.some(p => p.functionCall?.name === 'X')).toBe(true)
  })

  test('el nombre del tool_result se resuelve por su tool_use previo', () => {
    // Gemini identifica la respuesta por el NOMBRE de la funcion, y el bloque
    // de resultado solo trae el id: hace falta el mapa que se puebla con los
    // tool_use del asistente.
    const result = anthropicMessagesToGemini(
      [
        assistant([
          { type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls' } },
        ]) as never,
        user([
          { type: 'tool_result', tool_use_id: 'tu_1', content: 'output' },
        ]) as never,
      ],
      [] as never,
    )
    expect(result.contents).toHaveLength(2)
    expect(result.contents[0]?.role).toBe('model')
    expect(result.contents[1]?.role).toBe('user')
    const userParts = result.contents[1]?.parts as Array<{
      functionResponse?: { name?: string }
    }>
    expect(userParts.find(p => p.functionResponse)?.functionResponse?.name).toBe('Bash')
  })
})
