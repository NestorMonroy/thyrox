/**
 * Test propio (sin equivalente en `ccnmt`) — fija el comportamiento de la
 * porción portada de `ReadMcpResourceTool/UI.ts`. `renderToolResultMessage`
 * está bloqueado — ver el docstring del módulo.
 */
import { describe, expect, test } from 'bun:test'
import {
  renderToolResultMessage,
  renderToolUseMessage,
  userFacingName,
} from '../UI.js'

describe('renderToolUseMessage', () => {
  test('sin uri ni server → null', () => {
    expect(renderToolUseMessage({})).toBeNull()
  })

  test('con uri y server → describe la lectura', () => {
    expect(renderToolUseMessage({ uri: 'file://x', server: 'foo' })).toBe(
      'Read resource "file://x" from server "foo"',
    )
  })
})

describe('userFacingName', () => {
  test('es siempre readMcpResource', () => {
    expect(userFacingName()).toBe('readMcpResource')
  })
})

describe('renderToolResultMessage (bloqueado — Ink ausente)', () => {
  test('lanza con el motivo explícito', () => {
    expect(() =>
      renderToolResultMessage(
        { contents: [] },
        [],
        { verbose: false },
      ),
    ).toThrow(/Cannot find package 'react'|no está portado/)
  })
})
