/**
 * Porte de `ccnmt: packages/agent/__tests__/grouping.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { groupMessagesByApiRound } from '../compaction/grouping.js'

type Msg = Parameters<typeof groupMessagesByApiRound>[0][number]

function user(): Msg {
  return { type: 'user' } as Msg
}
function assistant(id: string): Msg {
  return { type: 'assistant', message: { id } } as Msg
}
function toolResult(): Msg {
  return { type: 'user' } as Msg
}

describe('groupMessagesByApiRound', () => {
  // Contrato: agrupa mensajes en "rondas" — cada ronda empieza con un
  // mensaje de assistant que trae un message.id NUEVO (distinto del id del
  // assistant anterior). Los mensajes user/system subsiguientes se quedan
  // en la ronda actual hasta que aparece un id de assistant nuevo.
  //
  // Critico para la compactacion: el agrupamiento decide que se recorta o
  // se conserva como unidad. Si un refactor rompe la deteccion de frontera,
  // un recorte parcial de ronda corrompe el emparejamiento
  // tool_use <-> tool_result.

  test('empty input returns empty', () => {
    expect(groupMessagesByApiRound([])).toEqual([])
  })

  test('single user message → one group of length 1', () => {
    const result = groupMessagesByApiRound([user()])
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(1)
  })

  test('user + assistant + user → splits at assistant boundary', () => {
    // Traza: u1 → current=[u1]; a1 → current.length>0 && a1.id!==undefined
    // → push [u1], current=[a1]; tr → current=[a1,tr]; FIN → push.
    // Resultado: [[u1], [a1, tr]]
    const messages = [user(), assistant('a1'), toolResult()]
    const result = groupMessagesByApiRound(messages)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveLength(1)
    expect(result[1]).toHaveLength(2)
  })

  test('two assistants with DIFFERENT ids → three groups', () => {
    // Traza: u → [u]; a1 → dispara frontera, push [u], current=[a1];
    // a2 → dispara frontera, push [a1], current=[a2]; FIN → push.
    // Resultado: [[u], [a1], [a2]]
    const messages = [user(), assistant('a1'), assistant('a2')]
    const result = groupMessagesByApiRound(messages)
    expect(result).toHaveLength(3)
    expect(result[0]).toHaveLength(1)
    expect(result[1]).toHaveLength(1)
    expect(result[2]).toHaveLength(1)
  })

  test('two assistants with SAME id → first triggers boundary, second stays in same group', () => {
    // Traza: u → [u]; a1 → dispara frontera (lastAssistantId era undefined,
    // a1.id es 'a1', difieren), push [u], current=[a1]; segundo a1 →
    // a1.id === lastAssistantId, NO dispara frontera; current=[a1, a1]; FIN.
    // Resultado: [[u], [a1, a1]]
    const messages = [user(), assistant('a1'), assistant('a1')]
    const result = groupMessagesByApiRound(messages)
    expect(result).toHaveLength(2)
    expect(result[1]).toHaveLength(2) // los dos a1 juntos
  })

  test('assistant without id field — boundary fires once but subsequent ones do not', () => {
    // Traza: u → [u]; assistant con id=undefined → chequeo de frontera:
    // msg.id (undefined) !== lastAssistantId (undefined) → FALSO,
    // no hay frontera; current=[u, asst]; FIN → push.
    // Resultado: [[u, asst]] — un solo grupo.
    const messages = [
      user(),
      { type: 'assistant', message: {} } as Msg,
    ]
    const result = groupMessagesByApiRound(messages)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(2)
  })

  test('typical pattern: u → a1 → tr → a2 → u → a3 → tr → 4 groups', () => {
    // Traza cada paso:
    //  u → [u]
    //  a1 → frontera (current.len>0 && a1!==undef) → push [u], cur=[a1]
    //  tr → cur=[a1, tr]
    //  a2 → frontera → push [a1, tr], cur=[a2]
    //  u → cur=[a2, u]
    //  a3 → frontera → push [a2, u], cur=[a3]
    //  tr → cur=[a3, tr]
    //  FIN → push [a3, tr]
    // Resultado: [[u], [a1, tr], [a2, u], [a3, tr]]
    const messages = [
      user(),
      assistant('a1'),
      toolResult(),
      assistant('a2'),
      user(),
      assistant('a3'),
      toolResult(),
    ]
    const result = groupMessagesByApiRound(messages)
    expect(result).toHaveLength(4)
    expect(result[0]).toHaveLength(1)
    expect(result[1]).toHaveLength(2)
    expect(result[2]).toHaveLength(2)
    expect(result[3]).toHaveLength(2)
  })

  test('first assistant in stream when current is empty — no boundary fires', () => {
    // current.length === 0 hace que el chequeo de frontera falle. Un
    // stream que empieza con assistant produce un solo grupo, no uno vacio
    // al inicio.
    const messages = [assistant('a1')]
    const result = groupMessagesByApiRound(messages)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(1)
  })

  test('preserves message order within and across groups', () => {
    const u1: Msg = { type: 'user', tag: 'first' } as never
    const a1: Msg = { type: 'assistant', message: { id: 'a1' } } as Msg
    const u2: Msg = { type: 'user', tag: 'second' } as never
    const a2: Msg = { type: 'assistant', message: { id: 'a2' } } as Msg
    const result = groupMessagesByApiRound([u1, a1, u2, a2])
    // Traza: u1 → [u1]; a1 → push, cur=[a1]; u2 → cur=[a1, u2];
    //   a2 → push, cur=[a2]; FIN → push. → [[u1], [a1, u2], [a2]]
    expect(result).toHaveLength(3)
    expect(result[0]?.[0]).toBe(u1)
    expect(result[1]?.[0]).toBe(a1)
    expect(result[1]?.[1]).toBe(u2)
    expect(result[2]?.[0]).toBe(a2)
  })

  test('does NOT mutate input array', () => {
    const messages = [user(), assistant('a1'), assistant('a2')]
    const before = messages.length
    groupMessagesByApiRound(messages)
    expect(messages.length).toBe(before)
  })

  test('flat-concat of all groups equals the original sequence', () => {
    const messages = [
      user(),
      assistant('a1'),
      toolResult(),
      assistant('a2'),
    ]
    const result = groupMessagesByApiRound(messages)
    const flat = result.flat()
    expect(flat).toEqual(messages)
  })
})
