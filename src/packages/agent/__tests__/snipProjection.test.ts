/**
 * Porte de `ccnmt: packages/agent/__tests__/snipProjection.test.ts`
 * contra `ccnmt: packages/agent/compaction/snipProjection.ts`.
 *
 * La fuente tipa los mensajes con `CoreMessage` (`../types/messages.js`),
 * un tipo compartido que este arbol no tiene. Se usa `Message` de
 * `../messageShapes.ts` — el porte minimo ya establecido en este paquete
 * para la jerarquia de mensajes — porque expone los mismos dos campos
 * (`type`, y `subtype` vía su indice `[key: string]: unknown`) que este
 * modulo consume.
 */
import { describe, expect, test } from 'bun:test'
import {
  isSnipBoundaryMessage,
  projectSnippedView,
} from '../compaction/snipProjection.ts'

type Msg = Parameters<typeof projectSnippedView>[0][number]

describe('isSnipBoundaryMessage', () => {
  test('devuelve true para un mensaje de sistema con subtype=snip_boundary', () => {
    expect(
      isSnipBoundaryMessage({ type: 'system', subtype: 'snip_boundary' } as Msg),
    ).toBe(true)
  })

  test('devuelve false para un mensaje de sistema con otro subtype', () => {
    expect(
      isSnipBoundaryMessage({
        type: 'system',
        subtype: 'compact_boundary',
      } as Msg),
    ).toBe(false)
  })

  test('devuelve false para un mensaje de sistema sin subtype', () => {
    expect(isSnipBoundaryMessage({ type: 'system' } as Msg)).toBe(false)
  })

  test('devuelve false para mensajes de assistant aunque tengan el subtype', () => {
    // Contrato crítico: el type tiene que ser 'system'. Un mensaje de
    // user/assistant que por casualidad lleve un campo `subtype:
    // snip_boundary` NO es un marcador de límite — sólo un mensaje de
    // sistema puede serlo.
    expect(
      isSnipBoundaryMessage({
        type: 'assistant',
        subtype: 'snip_boundary',
      } as never),
    ).toBe(false)
  })

  test('devuelve false para mensajes de user', () => {
    expect(isSnipBoundaryMessage({ type: 'user' } as never)).toBe(false)
  })

  test('el check de subtype es match exacto de cadena (sensible a mayúsculas)', () => {
    expect(
      isSnipBoundaryMessage({
        type: 'system',
        subtype: 'SNIP_BOUNDARY',
      } as Msg),
    ).toBe(false)
  })
})

describe('projectSnippedView', () => {
  // Contrato: devuelve la porción desde el límite en adelante. Si no hay
  // límite, devuelve el input completo sin cambios. Crítico para la
  // compactación — el modelo sólo ve la porción posterior al snip de la
  // conversación.

  test('devuelve el input completo cuando no hay límite presente', () => {
    const messages = [
      { type: 'user' },
      { type: 'assistant' },
    ] as Msg[]
    expect(projectSnippedView(messages)).toBe(messages) // misma referencia
  })

  test('devuelve la porción que arranca en el límite', () => {
    const messages = [
      { type: 'user' },
      { type: 'assistant' },
      { type: 'system', subtype: 'snip_boundary' },
      { type: 'user' },
      { type: 'assistant' },
    ] as Msg[]
    const result = projectSnippedView(messages)
    expect(result).toHaveLength(3)
    expect(result[0]!.type).toBe('system')
    expect(result[1]!.type).toBe('user')
    expect(result[2]!.type).toBe('assistant')
  })

  test('límite en el índice 0 devuelve el arreglo completo', () => {
    const messages = [
      { type: 'system', subtype: 'snip_boundary' },
      { type: 'user' },
    ] as Msg[]
    const result = projectSnippedView(messages)
    expect(result).toHaveLength(2)
  })

  test('límite en el último índice devuelve sólo el límite', () => {
    const messages = [
      { type: 'user' },
      { type: 'assistant' },
      { type: 'system', subtype: 'snip_boundary' },
    ] as Msg[]
    const result = projectSnippedView(messages)
    expect(result).toHaveLength(1)
    expect((result[0] as unknown as { subtype: string }).subtype).toBe('snip_boundary')
  })

  test('varios límites — sólo gana el PRIMERO', () => {
    // findIndex devuelve el primer match. Si un refactor futuro cambia a
    // findLast (o invierte el orden), el modelo vería una porción
    // distinta de la conversación — una ruptura semántica silenciosa.
    const messages = [
      { type: 'user' },
      { type: 'system', subtype: 'snip_boundary' },
      { type: 'assistant' },
      { type: 'system', subtype: 'snip_boundary' },
      { type: 'user' },
    ] as Msg[]
    const result = projectSnippedView(messages)
    expect(result).toHaveLength(4)
    // Desde el primer límite en adelante.
    expect((result[0] as unknown as { subtype: string }).subtype).toBe('snip_boundary')
  })

  test('input vacío devuelve vacío', () => {
    expect(projectSnippedView([])).toEqual([])
  })

  test('NO muta el input', () => {
    const messages: Msg[] = [
      { type: 'user' },
      { type: 'system', subtype: 'snip_boundary' },
    ] as Msg[]
    const before = messages.length
    projectSnippedView(messages)
    expect(messages.length).toBe(before)
  })
})
