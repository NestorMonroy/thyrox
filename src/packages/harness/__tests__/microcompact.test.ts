/**
 * Microcompactación de resultados de herramienta (T-024).
 *
 * Fuente: la telemetría medida —313 agentes, `cache_read` = 98.07 % del
 * consumo— y el diseño en su análisis. El control que discrimina es que un
 * resultado aún vigente NO se compacte y uno superado sí, no que el conteo baje.
 */

import { describe, expect, test } from 'bun:test'
import {
  COMPACTABLE_TOOLS,
  CLEARED_MARKER,
  collectCompactableToolIds,
  microcompact,
} from '../src/context/microcompact.ts'
import type { Message } from '../src/types.ts'

const asistente = (id: string, name: string): Message =>
  ({ role: 'assistant', content: [{ type: 'tool_use', id, name, input: {} }] })
const resultado = (id: string, texto: string): Message =>
  ({ role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: texto }] })

describe('collectCompactableToolIds (T-024)', () => {
  test('vacio para entrada vacia', () => {
    expect(collectCompactableToolIds([])).toEqual([])
  })

  test('recoge solo los tool_use cuyo nombre esta en la lista', () => {
    const ms = [
      { role: 'assistant', content: [
        { type: 'tool_use', id: 'a', name: 'Bash', input: {} },
        { type: 'tool_use', id: 'b', name: 'Agent', input: {} },
      ] } as Message,
    ]
    expect(collectCompactableToolIds(ms)).toEqual(['a'])
  })

  test('IGNORA los bloques del lado usuario aunque tengan forma de tool_use', () => {
    const ms = [
      { role: 'user', content: [{ type: 'tool_use', id: 'no', name: 'Bash', input: {} }] } as unknown as Message,
    ]
    expect(collectCompactableToolIds(ms)).toEqual([])
  })

  test('la lista de herramientas compactables es la del nucleo mas la red', () => {
    expect([...COMPACTABLE_TOOLS].sort()).toEqual(
      ['Bash', 'Edit', 'Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch', 'Write'],
    )
  })
})

describe('microcompact (T-024)', () => {
  const conversacion = (): Message[] => [
    { role: 'user', content: [{ type: 'text', text: 'haz algo' }] },
    asistente('t1', 'Bash'), resultado('t1', 'salida uno'),
    asistente('t2', 'Read'), resultado('t2', 'salida dos'),
    asistente('t3', 'Grep'), resultado('t3', 'salida tres'),
  ]

  test('limpia los resultados viejos y conserva los ultimos N', () => {
    const r = microcompact(conversacion(), { keepLast: 1 })
    const textos = r.messages.flatMap((m) => m.content)
      .filter((b) => b.type === 'tool_result')
      .map((b) => (b as { content: string }).content)
    expect(textos).toEqual([CLEARED_MARKER, CLEARED_MARKER, 'salida tres'])
    expect(r.cleared).toEqual(['t1', 't2'])
  })

  test('con keepLast mayor que el numero de resultados no limpia nada', () => {
    const r = microcompact(conversacion(), { keepLast: 10 })
    expect(r.cleared).toEqual([])
  })

  test('NO toca el resultado de una herramienta fuera de la lista', () => {
    const ms: Message[] = [
      asistente('t1', 'Agent'), resultado('t1', 'reporte del subagente'),
      asistente('t2', 'Bash'), resultado('t2', 'ls'),
      asistente('t3', 'Bash'), resultado('t3', 'pwd'),
    ]
    const r = microcompact(ms, { keepLast: 1 })
    expect(r.cleared).toEqual(['t2'])
    expect((r.messages[1].content[0] as { content: string }).content).toBe('reporte del subagente')
  })

  test('no muta la entrada — devuelve mensajes nuevos', () => {
    const original = conversacion()
    const copia = JSON.parse(JSON.stringify(original))
    microcompact(original, { keepLast: 0 })
    expect(original).toEqual(copia)
  })

  test('un resultado ya limpiado no se vuelve a contar como limpiado', () => {
    const una = microcompact(conversacion(), { keepLast: 1 })
    const dos = microcompact(una.messages, { keepLast: 1 })
    expect(dos.cleared).toEqual([])
  })

  test('informa el delta de tokens, y es la resta contra el marcador', () => {
    const grande: Message[] = [asistente('t1', 'Bash'), resultado('t1', 'x'.repeat(4000))]
    const r = microcompact(grande, { keepLast: 0 })
    expect(r.freedTokens).toBe(1000 - Math.ceil(CLEARED_MARKER.length / 4))
    expect(microcompact(grande, { keepLast: 10 }).freedTokens).toBe(0)
  })

  test('el delta es NEGATIVO cuando el resultado era mas corto que el marcador', () => {
    // No se esconde con un max(0, …): limpiar un resultado diminuto cuesta
    // tokens en vez de ahorrarlos, y quien decide el umbral necesita verlo.
    const diminuto: Message[] = [asistente('t1', 'Bash'), resultado('t1', 'ok')]
    expect(microcompact(diminuto, { keepLast: 0 }).freedTokens).toBeLessThan(0)
  })
})
