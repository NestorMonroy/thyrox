import { describe, expect, test } from 'bun:test'
import {
  hasTextBlocks,
  adjustIndexToPreserveAPIInvariants,
  calculateMessagesToKeepIndex,
  DEFAULT_SM_COMPACT_CONFIG,
  type SMMessage,
  type SessionMemoryCalcDeps,
} from '../compaction/sessionMemoryCalc.ts'

const textMsg = (type: 'user' | 'assistant', text: string): SMMessage => ({
  type,
  message: { content: type === 'user' ? text : [{ type: 'text', text }] },
})
const toolUse = (id: string): SMMessage => ({
  type: 'assistant',
  message: { id: `m-${id}`, content: [{ type: 'tool_use', id, name: 'X', input: {} }] },
})
const toolResult = (id: string): SMMessage => ({
  type: 'user',
  message: { content: [{ type: 'tool_result', tool_use_id: id }] },
})

function deps(overrides: Partial<SessionMemoryCalcDeps> = {}): SessionMemoryCalcDeps {
  return {
    estimateMessageTokens: () => 1_000,
    isCompactBoundaryMessage: () => false,
    ...overrides,
  }
}

describe('hasTextBlocks', () => {
  test('assistant con bloque text: sí', () => {
    expect(hasTextBlocks(textMsg('assistant', 'hola'))).toBe(true)
  })
  test('assistant sin bloque text (sólo tool_use): no', () => {
    expect(hasTextBlocks(toolUse('t1'))).toBe(false)
  })
  test('user con contenido string no vacío: sí', () => {
    expect(hasTextBlocks(textMsg('user', 'hola'))).toBe(true)
  })
  test('user con contenido string vacío: no', () => {
    expect(hasTextBlocks(textMsg('user', ''))).toBe(false)
  })
  test('user con arreglo de contenido sin bloque text: no', () => {
    expect(hasTextBlocks(toolResult('t1'))).toBe(false)
  })
  test('otro tipo de mensaje: no', () => {
    expect(hasTextBlocks({ type: 'system' })).toBe(false)
  })
})

describe('adjustIndexToPreserveAPIInvariants', () => {
  test('startIndex 0 o fuera de rango se devuelve tal cual', () => {
    const messages = [toolUse('a'), toolResult('a')]
    expect(adjustIndexToPreserveAPIInvariants(messages, 0)).toBe(0)
    expect(adjustIndexToPreserveAPIInvariants(messages, 99)).toBe(99)
  })

  test('un tool_result dentro del rango cuyo tool_use quedó FUERA corre el índice hasta el tool_use', () => {
    const messages = [textMsg('user', 'antes'), toolUse('a'), toolResult('a')]
    expect(adjustIndexToPreserveAPIInvariants(messages, 2)).toBe(1)
  })

  test('si el tool_use ya está dentro del rango conservado, no hace falta correr el índice', () => {
    const messages = [textMsg('user', 'antes'), toolUse('a'), toolResult('a')]
    expect(adjustIndexToPreserveAPIInvariants(messages, 1)).toBe(1)
  })

  test('un assistant que comparte message.id con uno ya conservado también se incluye (paso 2)', () => {
    const split: SMMessage = { type: 'assistant', message: { id: 'shared' } }
    const continuation: SMMessage = { type: 'assistant', message: { id: 'shared' } }
    const messages = [split, continuation, textMsg('user', 'x')]
    expect(adjustIndexToPreserveAPIInvariants(messages, 1)).toBe(0)
  })
})

describe('calculateMessagesToKeepIndex', () => {
  test('arreglo vacío da índice 0', () => {
    expect(calculateMessagesToKeepIndex([], -1, DEFAULT_SM_COMPACT_CONFIG, deps())).toBe(0)
  })

  test('con lastSummarizedIndex >= 0, si lo que sigue ya cumple ambos mínimos, no expande hacia atrás', () => {
    // lastSummarizedIndex=0 -> startIndex=1; los 6 mensajes restantes (índices
    // 1..6) ya cumplen minTokens (6*2000=12000 >= 10000) y minTextBlockMessages
    // (6 >= 5) sin exceder maxTokens (40000) -- la ÚNICA forma en que el rango
    // inicial (antes del loop hacia atrás) puede no estar vacío: con
    // lastSummarizedIndex=-1 el rango inicial siempre es vacío (startIndex
    // arranca en messages.length), así que ese caso lo cubre otro test.
    const messages = Array.from({ length: 7 }, (_, i) => textMsg('assistant', `m${i}`))
    const d = deps({ estimateMessageTokens: () => 2_000 })
    const r = calculateMessagesToKeepIndex(messages, 0, DEFAULT_SM_COMPACT_CONFIG, d)
    expect(r).toBe(1)
  })

  test('con lastSummarizedIndex=-1, el rango inicial (antes de expandir) siempre es vacío', () => {
    // startIndex arranca en messages.length -- el loop sum totalTokens sobre
    // [startIndex, messages.length) es vacío, así que SIEMPRE hace falta al
    // menos una vuelta del loop hacia atrás para juntar cualquier mensaje.
    const messages = Array.from({ length: 6 }, (_, i) => textMsg('assistant', `m${i}`))
    const d = deps({ estimateMessageTokens: () => 999_999 }) // un solo mensaje ya excede maxTokens
    const r = calculateMessagesToKeepIndex(messages, -1, DEFAULT_SM_COMPACT_CONFIG, d)
    expect(r).toBe(5) // expandió exactamente un mensaje hacia atrás, no cero
  })

  test('si el tope maxTokens se alcanza antes de cumplir minTextBlockMessages, corta ahí igual', () => {
    const messages = [toolUse('a'), toolResult('a')]
    const d = deps({ estimateMessageTokens: () => 25_000 })
    const r = calculateMessagesToKeepIndex(messages, -1, DEFAULT_SM_COMPACT_CONFIG, d)
    expect(r).toBe(0)
  })

  test('expande hacia atrás hasta cumplir minTokens y minTextBlockMessages a la vez', () => {
    const messages = Array.from({ length: 20 }, (_, i) => textMsg('assistant', `m${i}`))
    const d = deps({ estimateMessageTokens: () => 1_000 })
    // Con 20 mensajes de 1000 tokens y config default (min 10000/5, max 40000):
    // hacen falta 10 mensajes para llegar a 10000 tokens.
    const r = calculateMessagesToKeepIndex(messages, -1, DEFAULT_SM_COMPACT_CONFIG, d)
    expect(messages.length - r).toBe(10)
  })

  test('el piso es la última frontera de compactación: no expande más allá de ella', () => {
    const boundary: SMMessage = { type: 'system', subtype: 'compact_boundary' }
    const after = Array.from({ length: 2 }, (_, i) => textMsg('assistant', `m${i}`))
    const messages = [textMsg('assistant', 'antes'), boundary, ...after]
    const d = deps({
      estimateMessageTokens: () => 1_000,
      isCompactBoundaryMessage: (m) => (m as { subtype?: string }).subtype === 'compact_boundary',
    })
    const r = calculateMessagesToKeepIndex(messages, -1, DEFAULT_SM_COMPACT_CONFIG, d)
    // El piso es idx(boundary)+1 = 2; nunca puede bajar de 2 aunque el mínimo no se alcance.
    expect(r).toBeGreaterThanOrEqual(2)
  })

  test('lastSummarizedIndex >= 0 arranca justo después de él', () => {
    const messages = Array.from({ length: 5 }, (_, i) => textMsg('assistant', `m${i}`))
    const d = deps({ estimateMessageTokens: () => 20_000 })
    // Ya cumple ambos mínimos desde el arranque (lastSummarizedIndex=1 -> startIndex=2)
    const r = calculateMessagesToKeepIndex(messages, 1, DEFAULT_SM_COMPACT_CONFIG, d)
    expect(r).toBe(2)
  })

  test('control de anulación: sin el piso de la frontera, la expansión cruzaría a mensajes ya resumidos', () => {
    const boundary: SMMessage = { type: 'system', subtype: 'compact_boundary' }
    const before = textMsg('assistant', 'ya-resumido')
    const after = textMsg('assistant', 'reciente')
    const messages = [before, boundary, after]
    const depsWithoutFloor: SessionMemoryCalcDeps = {
      estimateMessageTokens: () => 1, // nunca cumple el mínimo -> fuerza expansión al máximo posible
      isCompactBoundaryMessage: () => false, // anula el piso
    }
    const depsWithFloor: SessionMemoryCalcDeps = {
      estimateMessageTokens: () => 1,
      isCompactBoundaryMessage: (m) => (m as { subtype?: string }).subtype === 'compact_boundary',
    }
    const withoutFloor = calculateMessagesToKeepIndex(messages, -1, DEFAULT_SM_COMPACT_CONFIG, depsWithoutFloor)
    const withFloor = calculateMessagesToKeepIndex(messages, -1, DEFAULT_SM_COMPACT_CONFIG, depsWithFloor)
    expect(withoutFloor).toBe(0) // cruza hasta el mensaje ya resumido
    expect(withFloor).toBe(2) // se detiene justo después de la frontera
  })
})
