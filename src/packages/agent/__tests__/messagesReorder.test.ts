import { describe, expect, test } from 'bun:test'

import { reorderMessagesInUI } from '../messages.ts'
import type { Message } from '../messageShapes.ts'

// Contrato de 2.1.275 (`chunk-q2gh92k2.js`): `Z4n` con `Q4n`, `hHe`, `qpn`, `Xar`.
const m = (tag: string, body: Record<string, unknown>) => ({ tag, ...body }) as unknown as Message
const toolUse = (id: string) => m(`use:${id}`, { type: 'assistant', message: { content: [{ type: 'tool_use', id }] } })
const result = (id: string) => m(`result:${id}`, { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id }] } })
const hook = (id: string, hookEvent: string) =>
  m(`${hookEvent}:${id}`, { type: 'attachment', attachment: { type: 'hook_success', hookEvent, toolUseID: id } })
const tags = (ms: Message[]) => ms.map(x => (x as unknown as { tag: string }).tag)

describe('reorderMessagesInUI', () => {
  test('agrupa uso, hooks previos, resultado y hooks posteriores en el sitio del uso', () => {
    const text = m('text', { type: 'user', message: { content: [{ type: 'text', text: 'hi' }] } })
    const out = reorderMessagesInUI(
      [text, toolUse('a'), hook('a', 'PostToolUse'), result('a'), hook('a', 'PreToolUse')],
      [],
    )
    expect(tags(out)).toEqual(['text', 'use:a', 'PreToolUse:a', 'result:a', 'PostToolUse:a'])
  })

  test('las líneas de resultado del host van con los hooks posteriores', () => {
    const lines = m('lines:a', { type: 'attachment', attachment: { type: 'tool_host_result_lines', toolUseID: 'a' } })
    expect(tags(reorderMessagesInUI([lines, toolUse('a'), result('a')], []))).toEqual(['use:a', 'result:a', 'lines:a'])
  })

  test('los errores de API del sistema no se muestran', () => {
    const apiError = m('api', { type: 'system', subtype: 'api_error' })
    expect(tags(reorderMessagesInUI([apiError, toolUse('a')], []))).toEqual(['use:a'])
  })

  test('un resultado sin su uso queda fuera, y los sintéticos van al final', () => {
    const synthetic = m('synthetic', { type: 'assistant', message: { content: [] } })
    expect(tags(reorderMessagesInUI([result('x'), toolUse('a')], [synthetic]))).toEqual(['use:a', 'synthetic'])
  })
})
