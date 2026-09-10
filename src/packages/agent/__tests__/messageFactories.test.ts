/**
 * Porte de `ccnmt: packages/agent/__tests__/messageFactories.test.ts`.
 * Cada tipo de mensaje que el runtime persiste al transcript JSONL pasa por
 * una de estas factories.
 *
 * Un default equivocado ([No content] vs '' cruda) es consecuente: las
 * cadenas vacías persistidas a disco rompen la deduplicación de
 * `recordTranscript` al reanudar, y disparan el bug de límite de turno
 * inc-4586 en capybara.
 *
 * Una generación de UUID equivocada (o un timestamp omitido) vuelve
 * inparseable la cadena al reanudar.
 */
import { describe, expect, mock, test } from 'bun:test'

// `logForDebugging` en messageFactories pasa por bindings de host que no
// están instalados en el contexto de test. Se stubea el módulo de
// logging para que la factory de mensaje de límite no reviente en
// logForDebugging.
mock.module('../internal/logging.js', () => ({
  logForDebugging: () => {},
}))

const {
  createAssistantAPIErrorMessage,
  createMicrocompactBoundaryMessage,
  createSystemMessage,
  createToolUseSummaryMessage,
  createUserInterruptionMessage,
  createUserMessage,
} = await import('../internal/messageFactories.js')

describe('createUserMessage', () => {
  test('mensaje básico de contenido string', () => {
    const m = createUserMessage({ content: 'hello' })
    expect(m.type).toBe('user')
    expect(m.message.role).toBe('user')
    expect(m.message.content).toBe('hello')
    expect(typeof m.uuid).toBe('string')
    expect(m.uuid.length).toBeGreaterThan(0)
    expect(typeof m.timestamp).toBe('string')
  })

  test('contenido string vacío recibe el centinela [No content]', () => {
    // Por inc-4586: contenido de longitud cero en tool/user lleva a
    // bugs de límite de turno en algunos modelos. Se reemplaza por el
    // centinela.
    const m = createUserMessage({ content: '' })
    expect(m.message.content).toBe('(no content)')
  })

  test('contenido array (bloques tool_result) se preserva tal cual', () => {
    const m = createUserMessage({
      content: [
        { type: 'tool_result', tool_use_id: 't1', content: 'ok' },
      ],
    })
    expect(Array.isArray(m.message.content)).toBe(true)
    expect((m.message.content as Array<{ tool_use_id: string }>)[0]?.tool_use_id).toBe('t1')
  })

  test('isMeta y toolUseResult fluyen a través', () => {
    const m = createUserMessage({
      content: 'x',
      isMeta: true,
      toolUseResult: { custom: 'data' },
    })
    expect(m.isMeta).toBe(true)
    expect(m.toolUseResult).toEqual({ custom: 'data' })
  })

  test('los UUID son únicos entre llamadas', () => {
    const a = createUserMessage({ content: 'x' })
    const b = createUserMessage({ content: 'x' })
    expect(a.uuid).not.toBe(b.uuid)
  })

  test('el timestamp es ISO 8601', () => {
    const m = createUserMessage({ content: 'x' })
    // Debe hacer round-trip a través de Date
    expect(new Date(m.timestamp).toISOString()).toBe(m.timestamp)
  })
})

describe('createUserInterruptionMessage', () => {
  test('default (sin toolUse) emite el texto de interrupción sin herramienta', () => {
    const m = createUserInterruptionMessage({})
    expect(Array.isArray(m.message.content)).toBe(true)
    const block = (m.message.content as Array<{ text: string }>)[0]
    expect(block?.text).toBe('[Request interrupted by user]')
  })

  test('toolUse=true emite el texto de interrupción específico de herramienta', () => {
    const m = createUserInterruptionMessage({ toolUse: true })
    const block = (m.message.content as Array<{ text: string }>)[0]
    expect(block?.text).toBe('[Request interrupted by user for tool use]')
  })

  test('SKIP_FIRST_PROMPT_PATTERN debe matchear este texto', () => {
    // Chequeo cruzado: el patrón que filtra interrupciones de los
    // títulos de sesión debe matchear el texto emitido aquí. Si
    // divergen, el mensaje de interrupción se vuelve el título de
    // sesión visible.
    const SKIP_PATTERN =
      /^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/
    const m1 = createUserInterruptionMessage({})
    const m2 = createUserInterruptionMessage({ toolUse: true })
    const t1 = (m1.message.content as Array<{ text: string }>)[0]?.text ?? ''
    const t2 = (m2.message.content as Array<{ text: string }>)[0]?.text ?? ''
    expect(SKIP_PATTERN.test(t1)).toBe(true)
    expect(SKIP_PATTERN.test(t2)).toBe(true)
  })
})

describe('createSystemMessage', () => {
  test('mensaje de sistema básico tiene subtype=informational e isMeta=false', () => {
    const m = createSystemMessage('hello', 'info')
    expect(m.type).toBe('system')
    expect(m.subtype).toBe('informational')
    expect(m.content).toBe('hello')
    expect(m.level).toBe('info')
    expect(m.isMeta).toBe(false)
  })

  test('toolUseID se incluye cuando se provee', () => {
    const m = createSystemMessage('hello', 'info', 'tu1')
    expect(m.toolUseID).toBe('tu1')
  })

  test('toolUseID se OMITE (no undefined) cuando no se provee', () => {
    // Comportamiento documentado: se esparce `{ toolUseID }` sólo
    // cuando es truthy. Esto significa que la salida JSONL no tiene
    // un campo `"toolUseID":undefined` que haría round-trip distinto.
    const m = createSystemMessage('hello', 'info')
    expect('toolUseID' in m).toBe(false)
  })

  test('preventContinuation=true se incluye como literal true', () => {
    const m = createSystemMessage('x', 'info', undefined, true)
    expect(m.preventContinuation).toBe(true)
  })

  test('preventContinuation=false se OMITE', () => {
    const m = createSystemMessage('x', 'info', undefined, false)
    expect('preventContinuation' in m).toBe(false)
  })
})

describe('createAssistantAPIErrorMessage', () => {
  test('content cadena vacía cae al fallback [No content]', () => {
    const m = createAssistantAPIErrorMessage({ content: '' })
    const block = (m.message.content as Array<{ text: string }>)[0]
    expect(block?.text).toBe('(no content)')
  })

  test('content no vacío se preserva', () => {
    const m = createAssistantAPIErrorMessage({ content: 'API err: 500' })
    const block = (m.message.content as Array<{ text: string }>)[0]
    expect(block?.text).toBe('API err: 500')
  })

  test('stop_reason es end_turn (para que el bucle se detenga)', () => {
    const m = createAssistantAPIErrorMessage({ content: 'x' })
    expect(m.message.stop_reason).toBe('end_turn')
  })

  test('la bandera isApiErrorMessage es true', () => {
    const m = createAssistantAPIErrorMessage({ content: 'x' })
    expect(m.isApiErrorMessage).toBe(true)
  })

  test('apiError / error / errorDetails fluyen a través', () => {
    const m = createAssistantAPIErrorMessage({
      content: 'x',
      apiError: { code: 500 },
      error: new Error('boom'),
      errorDetails: 'request_id=abc',
    })
    expect(m.apiError).toEqual({ code: 500 })
    expect(m.error).toBeInstanceOf(Error)
    expect(m.errorDetails).toBe('request_id=abc')
  })

  test('usage queda en cero (sin costo de tokens para mensajes de error)', () => {
    const m = createAssistantAPIErrorMessage({ content: 'x' })
    expect(m.message.usage).toEqual({ input_tokens: 0, output_tokens: 0 })
  })
})

describe('createToolUseSummaryMessage', () => {
  test('preserva el string de resumen y los ids', () => {
    const m = createToolUseSummaryMessage('did stuff', ['t1', 't2'])
    expect(m.type).toBe('tool_use_summary')
    expect(m.summary).toBe('did stuff')
    expect(m.precedingToolUseIds).toEqual(['t1', 't2'])
  })

  test('un arreglo de ids vacío se preserva (no se convierte a undefined)', () => {
    const m = createToolUseSummaryMessage('x', [])
    expect(m.precedingToolUseIds).toEqual([])
  })
})

describe('createMicrocompactBoundaryMessage', () => {
  test('forma básica con metadata', () => {
    const m = createMicrocompactBoundaryMessage(
      'auto',
      10000,
      4000,
      ['t1', 't2'],
      ['a1'],
    )
    expect(m.type).toBe('system')
    expect(m.subtype).toBe('microcompact_boundary')
    expect(m.content).toBe('Context microcompacted')
    expect(m.microcompactMetadata).toEqual({
      trigger: 'auto',
      preTokens: 10000,
      tokensSaved: 4000,
      compactedToolIds: ['t1', 't2'],
      clearedAttachmentUUIDs: ['a1'],
    })
  })

  test('una llamada con ahorro cero igual produce un mensaje de límite válido', () => {
    const m = createMicrocompactBoundaryMessage('auto', 5000, 0, [], [])
    expect(m.microcompactMetadata.tokensSaved).toBe(0)
    expect(m.microcompactMetadata.compactedToolIds).toEqual([])
  })

  test('UUID y timestamp están presentes', () => {
    const m = createMicrocompactBoundaryMessage('auto', 1, 1, [], [])
    expect(typeof m.uuid).toBe('string')
    expect(typeof m.timestamp).toBe('string')
    expect(new Date(m.timestamp).toISOString()).toBe(m.timestamp)
  })
})
