/**
 * Test propio (sin equivalente en `ccnmt`) — fija el comportamiento de la
 * porción portada de `ListMcpResourcesTool/UI.ts`. `renderToolResultMessage`
 * está bloqueado — ver el docstring del módulo.
 */
import { describe, expect, test } from 'bun:test'
import { renderToolResultMessage, renderToolUseMessage } from '../UI.js'

describe('renderToolUseMessage', () => {
  test('sin server → lista todos los recursos', () => {
    expect(renderToolUseMessage({})).toBe('List all MCP resources')
  })

  test('con server → lista los de ese servidor', () => {
    expect(renderToolUseMessage({ server: 'foo' })).toBe(
      'List MCP resources from server "foo"',
    )
  })
})

describe('renderToolResultMessage (bloqueado — Ink ausente)', () => {
  test('lanza con el motivo explícito', () => {
    expect(() => renderToolResultMessage([], [], { verbose: false })).toThrow(
      /Cannot find package 'react'|no está portado/,
    )
  })
})
