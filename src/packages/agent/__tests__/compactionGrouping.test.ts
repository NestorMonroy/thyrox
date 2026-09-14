import { describe, expect, test } from 'bun:test'
import { groupMessagesByApiRound } from '../compaction/grouping.ts'

type M = { type: string; message?: { id?: string } }

const assistant = (id: string): M => ({ type: 'assistant', message: { id } })
const user = (): M => ({ type: 'user' })

describe('groupMessagesByApiRound', () => {
  test('un assistant con id nuevo abre una ronda; lo que sigue se acumula en ella', () => {
    const groups = groupMessagesByApiRound([user(), assistant('a1'), user(), user()])
    expect(groups).toEqual([[user()], [assistant('a1'), user(), user()]])
  })

  test('dos assistant SEGUIDOS con el MISMO id no abren ronda nueva (streaming del mismo turno)', () => {
    const groups = groupMessagesByApiRound([assistant('a1'), assistant('a1'), user()])
    expect(groups.length).toBe(1)
    expect(groups[0]!.length).toBe(3)
  })

  test('un assistant con id DISTINTO sí abre ronda nueva', () => {
    const groups = groupMessagesByApiRound([assistant('a1'), user(), assistant('a2'), user()])
    expect(groups.length).toBe(2)
    expect(groups[0]).toEqual([assistant('a1'), user()])
    expect(groups[1]).toEqual([assistant('a2'), user()])
  })

  test('arreglo vacío da cero rondas', () => {
    expect(groupMessagesByApiRound([])).toEqual([])
  })

  test('control de anulación: sin la condición de "current.length > 0", el primer mensaje de la lista abriría una ronda vacía de más', () => {
    // Reproduce el guard tal cual: current.length > 0 es lo que evita que el
    // PRIMER mensaje (aunque sea un assistant) empuje un grupo vacío antes de
    // sí mismo. Se prueba contra el caso real, no anulando el código fuente.
    const groups = groupMessagesByApiRound([assistant('a1'), user()])
    expect(groups.length).toBe(1)
    expect(groups[0]![0]).toEqual(assistant('a1'))
  })
})
