import { describe, expect, test } from 'bun:test'

import { isSystemLocalCommandMessage, stripSignatureBlocks } from '../messages.ts'
import type { Message } from '../messageShapes.ts'

// Contrato de 2.1.275 (`chunk-q2gh92k2.js`): `OLs` + `IUt` para el retiro de
// bloques firmados, `Ume` (`chunk-1qj0na9r.js`) para el mensaje de comando local.

function assistant(content: unknown[]): Message {
  return { type: 'assistant', uuid: crypto.randomUUID(), message: { content } } as unknown as Message
}

describe('stripSignatureBlocks', () => {
  test('retira thinking firmado y redacted_thinking de los mensajes del asistente', () => {
    const msg = assistant([
      { type: 'thinking', thinking: 'x', signature: 'sig' },
      { type: 'redacted_thinking', data: 'z' },
      { type: 'text', text: 'hola' },
    ])
    const [out] = stripSignatureBlocks([msg]) as Array<{ message: { content: unknown[] } }>
    expect(out!.message.content).toEqual([{ type: 'text', text: 'hola' }])
  })

  test('conserva el thinking sin firma', () => {
    const block = { type: 'thinking', thinking: 'x', signature: '' }
    const msg = assistant([block, { type: 'text', text: 't' }])
    const [out] = stripSignatureBlocks([msg]) as Array<{ message: { content: unknown[] } }>
    expect(out!.message.content).toEqual([block, { type: 'text', text: 't' }])
  })

  test('sin nada que retirar devuelve el MISMO arreglo', () => {
    const messages = [assistant([{ type: 'text', text: 't' }])]
    expect(stripSignatureBlocks(messages)).toBe(messages)
  })

  test('no toca mensajes que no son del asistente', () => {
    const user = { type: 'user', message: { content: [{ type: 'redacted_thinking', data: 'z' }] } } as unknown as Message
    expect(stripSignatureBlocks([user])).toEqual([user])
  })
})

describe('isSystemLocalCommandMessage', () => {
  test('sólo el mensaje de sistema con subtype local_command', () => {
    expect(isSystemLocalCommandMessage({ type: 'system', subtype: 'local_command' } as unknown as Message)).toBe(true)
    expect(isSystemLocalCommandMessage({ type: 'system', subtype: 'informational' } as unknown as Message)).toBe(false)
    expect(isSystemLocalCommandMessage({ type: 'user', subtype: 'local_command' } as unknown as Message)).toBe(false)
  })
})
