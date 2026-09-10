import { describe, expect, test } from 'bun:test'
import { getNext, type Notification } from '../notifications.js'

function textNotif(
  key: string,
  priority: Notification extends { priority: infer P } ? P : never,
): Notification {
  return { key, priority, text: key }
}

describe('getNext', () => {
  test('undefined con la cola vacía', () => {
    expect(getNext([])).toBeUndefined()
  })

  test('devuelve la de mayor prioridad (immediate < high < medium < low)', () => {
    const low = textNotif('low', 'low')
    const immediate = textNotif('immediate', 'immediate')
    const high = textNotif('high', 'high')
    expect(getNext([low, high, immediate])).toBe(immediate)
  })

  test('primer elemento gana el empate de prioridad', () => {
    const a = textNotif('a', 'medium')
    const b = textNotif('b', 'medium')
    expect(getNext([a, b])).toBe(a)
  })
})
