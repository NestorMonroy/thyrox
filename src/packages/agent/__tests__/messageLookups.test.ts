/**
 * Los índices de mensajes de 2.1.275: `eP`/`EUt`, `d6e` (subagente),
 * `_ot` + `Qke` + `finish` (vista completa), `n3n`/`r3n`/`x$r` y `J7t`
 * (`chunk-q2gh92k2.js`, `chunk-v1r6yrzs.js`).
 */
import { describe, expect, test } from 'bun:test'
import {
  buildMessageLookups,
  buildSubagentLookups,
  EMPTY_LOOKUPS,
  EMPTY_STRING_SET,
  getProgressMessagesFromLookup,
  getSiblingToolUseIDsFromLookup,
  getToolUseIDs,
  hasUnresolvedHooksFromLookup,
} from '../messages.ts'

const assistant = (id: string, content: unknown[], uuid = `a-${id}`) =>
  ({ type: 'assistant', uuid, message: { id, content } }) as never
const user = (content: unknown[], uuid = 'u') => ({ type: 'user', uuid, message: { content } }) as never
const toolUse = (id: string) => ({ type: 'tool_use', id, name: 'Read', input: {} })
const result = (id: string, is_error = false) => ({ type: 'tool_result', tool_use_id: id, content: 'x', is_error })
const progress = (toolUseID: string, data: object) => ({ type: 'progress', toolUseID, parentToolUseID: toolUseID, data }) as never

describe('EMPTY_LOOKUPS', () => {
  test('nueve índices vacíos y el conjunto vacío congelado', () => {
    expect(Object.keys(EMPTY_LOOKUPS).sort()).toEqual(
      ['erroredToolUseIDs', 'firstTextBlockUuidByMessageID', 'inProgressHookCounts', 'progressMessagesByToolUseID', 'resolvedHookCounts', 'resolvedToolUseIDs', 'siblingToolUseIDs', 'toolResultByToolUseID', 'toolUseByToolUseID'],
    )
    expect(Object.isFrozen(EMPTY_STRING_SET)).toBe(true)
  })
})

describe('buildSubagentLookups (d6e)', () => {
  test('resuelve, marca errores y deja en curso lo que no tiene resultado', () => {
    const { lookups, inProgressToolUseIDs } = buildSubagentLookups([
      { message: assistant('m1', [toolUse('t1'), toolUse('t2'), toolUse('t3')]) },
      { message: user([result('t1'), result('t2', true)]) },
    ] as never)
    expect([...lookups.resolvedToolUseIDs].sort()).toEqual(['t1', 't2'])
    expect([...lookups.erroredToolUseIDs]).toEqual(['t2'])
    expect([...inProgressToolUseIDs]).toEqual(['t3'])
    expect(lookups.toolUseByToolUseID.get('t3')).toMatchObject({ id: 't3' })
  })
  test('un server_tool_use huérfano de un mensaje anterior se da por fallido', () => {
    const { lookups } = buildSubagentLookups([
      { message: assistant('m1', [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: {} }]) },
      { message: assistant('m2', [{ type: 'text', text: 'luego' }]) },
    ] as never)
    expect(lookups.resolvedToolUseIDs.has('s1')).toBe(true)
    expect(lookups.erroredToolUseIDs.has('s1')).toBe(true)
  })
  test('pero no si es del último mensaje, que aún puede resolverse', () => {
    const { lookups } = buildSubagentLookups([
      { message: assistant('m1', [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: {} }]) },
    ] as never)
    expect(lookups.resolvedToolUseIDs.has('s1')).toBe(false)
  })
})

describe('buildMessageLookups', () => {
  const a = assistant('m1', [toolUse('t1'), toolUse('t2')])
  const normalized = [assistant('m1', [{ type: 'text', text: 'hola' }], 'n1'), a, user([result('t1')])]
  const messages = [a, progress('t1', { type: 'bash_progress' }), progress('t2', { type: 'hook_progress', hookEvent: 'PreToolUse' })]
  const lookups = buildMessageLookups(normalized, messages)
  test('hermanos: las tool uses del mismo mensaje se agrupan', () => {
    expect([...lookups.siblingToolUseIDs.get('t1')!].sort()).toEqual(['t1', 't2'])
    expect([...getSiblingToolUseIDsFromLookup(a, lookups)].sort()).toEqual(['t1', 't2'])
  })
  test('resultado y primer bloque de texto', () => {
    expect(lookups.resolvedToolUseIDs.has('t1')).toBe(true)
    expect(lookups.toolResultByToolUseID.has('t1')).toBe(true)
    expect(lookups.firstTextBlockUuidByMessageID.get('m1')).toBe('n1')
  })
  test('progreso por tool use, sin latidos', () => {
    const withHeartbeat = buildMessageLookups(normalized, [...messages, progress('t1', { type: 'tool_heartbeat' })])
    expect(getProgressMessagesFromLookup(a, withHeartbeat)).toHaveLength(1)
  })
  test('un hook en curso sin resolver', () => {
    expect(hasUnresolvedHooksFromLookup('t2', 'PreToolUse', lookups)).toBe(true)
    expect(hasUnresolvedHooksFromLookup('t1', 'PreToolUse', lookups)).toBe(false)
  })
  test('un mensaje sin tool use devuelve el conjunto vacío compartido', () => {
    expect(getSiblingToolUseIDsFromLookup(user([]), lookups)).toBe(EMPTY_STRING_SET)
  })
})

describe('getToolUseIDs (J7t)', () => {
  test('asistente: tool uses de todo tipo; usuario: su resultado y su origen', () => {
    expect(getToolUseIDs(assistant('m', [toolUse('a'), { type: 'server_tool_use', id: 'b' }, { type: 'text', text: '' }]))).toEqual(['a', 'b'])
    expect(getToolUseIDs({ type: 'user', sourceToolUseID: 's', message: { content: [result('r')] } } as never)).toEqual(['s', 'r'])
  })
})
