/**
 * Test propio (no hay equivalente en `ccnmt` para estas funciones puras
 * de `MCPTool/UI.tsx`) — fija el comportamiento de la porción portada de
 * `MCPTool/UI.ts`: `renderToolUseMessage`, `tryFlattenJson`,
 * `tryUnwrapTextPayload`, `trySlackSendCompact`. Las dos funciones JSX
 * (`renderToolUseProgressMessage`, `renderToolResultMessage`) están
 * bloqueadas — ver el docstring del módulo — y se prueban sólo por su
 * lanzamiento explícito.
 */
import { describe, expect, test } from 'bun:test'
import {
  renderToolResultMessage,
  renderToolUseMessage,
  renderToolUseProgressMessage,
  tryFlattenJson,
  tryUnwrapTextPayload,
  trySlackSendCompact,
} from '../UI.js'

describe('renderToolUseMessage', () => {
  test('objeto vacío → string vacío', () => {
    expect(renderToolUseMessage({}, { verbose: false })).toBe('')
  })

  test('junta clave: valor con coma', () => {
    expect(renderToolUseMessage({ a: 1, b: 'x' }, { verbose: false })).toBe(
      'a: 1, b: "x"',
    )
  })
})

describe('tryFlattenJson', () => {
  test('objeto plano de escalares se aplana', () => {
    expect(tryFlattenJson('{"a":1,"b":"x","c":true}')).toEqual([
      ['a', '1'],
      ['b', 'x'],
      ['c', 'true'],
    ])
  })

  test('no-JSON → null', () => {
    expect(tryFlattenJson('not json')).toBeNull()
  })

  test('arreglo JSON → null (no es objeto)', () => {
    expect(tryFlattenJson('[1,2,3]')).toBeNull()
  })
})

describe('tryUnwrapTextPayload', () => {
  test('desenvuelve el payload de texto dominante', () => {
    const longText =
      'line1\nline2 and more text than fifty chars to qualify as dominant'
    const result = tryUnwrapTextPayload(
      JSON.stringify({ messages: longText, page: 1 }),
    )
    expect(result).toEqual({ body: longText, extras: [['page', '1']] })
  })

  test('sin payload dominante → null', () => {
    expect(tryUnwrapTextPayload('{"a":"short","b":"also short"}')).toBeNull()
  })
})

describe('trySlackSendCompact', () => {
  test('detecta un envío exitoso a Slack y arma channel/url', () => {
    const output = [
      {
        type: 'text' as const,
        text: JSON.stringify({
          message_link: 'https://foo.slack.com/archives/C123/p123',
        }),
      },
    ]
    expect(trySlackSendCompact(output, { channel_id: 'general' })).toEqual({
      channel: '#general',
      url: 'https://foo.slack.com/archives/C123/p123',
    })
  })

  test('sin message_link → null', () => {
    expect(trySlackSendCompact('plain string', {})).toBeNull()
  })
})

describe('funciones bloqueadas (JSX/Ink ausente)', () => {
  test('renderToolUseProgressMessage lanza con el motivo explícito', () => {
    expect(() => renderToolUseProgressMessage([])).toThrow(
      /Cannot find package 'react'|no está portado/,
    )
  })

  test('renderToolResultMessage lanza con el motivo explícito', () => {
    expect(() => renderToolResultMessage('x', [], { verbose: false })).toThrow(
      /Cannot find package 'react'|no está portado/,
    )
  })
})
