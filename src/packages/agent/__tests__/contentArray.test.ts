/**
 * Porte de `ccnmt: packages/agent/__tests__/contentArray.test.ts`.
 * La colocacion tiene dos ramas y cada una con su regla; el caso limite es el
 * bloque que queda ultimo, porque ahi la insercion cambia el final del mensaje.
 */
import { describe, expect, test } from 'bun:test'
import { insertBlockAfterToolResults } from '../contentArray.ts'

const marker = { type: 'marker' }
const toolResult = (id: string) => ({ type: 'tool_result', tool_use_id: id })

describe('insertBlockAfterToolResults — con tool_result', () => {
  test('inserta tras el unico resultado', () => {
    const content: unknown[] = [toolResult('a'), { type: 'text', text: 'x' }]
    insertBlockAfterToolResults(content, marker)
    expect(content[1]).toBe(marker)
    expect(content).toHaveLength(3)
  })

  test('inserta tras el ULTIMO resultado cuando hay varios', () => {
    const content: unknown[] = [toolResult('a'), toolResult('b'), { type: 'text', text: 'x' }]
    insertBlockAfterToolResults(content, marker)
    expect(content[2]).toBe(marker)
  })

  test('anade texto de continuacion cuando el bloque queda ultimo', () => {
    const content: unknown[] = [toolResult('a')]
    insertBlockAfterToolResults(content, marker)
    expect(content[1]).toBe(marker)
    expect(content[2]).toEqual({ type: 'text', text: '.' })
  })

  test('NO anade continuacion cuando quedan bloques detras', () => {
    const content: unknown[] = [toolResult('a'), { type: 'text', text: 'x' }]
    insertBlockAfterToolResults(content, marker)
    expect(content).toHaveLength(3)
    expect(content[2]).toEqual({ type: 'text', text: 'x' })
  })
})

describe('insertBlockAfterToolResults — sin tool_result', () => {
  test('inserta ANTES del ultimo bloque', () => {
    const content: unknown[] = [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }]
    insertBlockAfterToolResults(content, marker)
    expect(content[1]).toBe(marker)
    expect(content[2]).toEqual({ type: 'text', text: 'b' })
  })

  test('con un solo elemento el bloque queda primero', () => {
    const content: unknown[] = [{ type: 'text', text: 'a' }]
    insertBlockAfterToolResults(content, marker)
    expect(content[0]).toBe(marker)
  })

  test('con contenido vacio inserta en el indice cero', () => {
    const content: unknown[] = []
    insertBlockAfterToolResults(content, marker)
    expect(content).toEqual([marker])
  })
})

describe('insertBlockAfterToolResults — bordes del reconocedor', () => {
  test('un elemento que no es objeto no cuenta como tool_result', () => {
    const content: unknown[] = ['tool_result', { type: 'text', text: 'b' }]
    insertBlockAfterToolResults(content, marker)
    expect(content[1]).toBe(marker)
  })

  test('un objeto sin clave type no cuenta como tool_result', () => {
    const content: unknown[] = [{ tool_use_id: 'a' }, { type: 'text', text: 'b' }]
    insertBlockAfterToolResults(content, marker)
    expect(content[1]).toBe(marker)
  })

  test('null en el arreglo no revienta el recorrido', () => {
    const content: unknown[] = [null, toolResult('a'), { type: 'text', text: 'b' }]
    insertBlockAfterToolResults(content, marker)
    expect(content[2]).toBe(marker)
  })
})
