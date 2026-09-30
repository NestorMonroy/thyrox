/**
 * `prependUserContext` — producción no tiene rama por `NODE_ENV` (ejecutable
 * 2.1.283, `Jze` en `chunk-csayct82.js`: va directo a comprobar si el
 * contexto está vacío, sin mirar el entorno).
 */
import { describe, expect, test } from 'bun:test'

import { prependUserContext } from '../legacy/api.js'
import { createUserMessage } from '@thyrox/agent/messages.js'

describe('prependUserContext — sin rama por NODE_ENV', () => {
  test('1. antepone el mensaje de contexto aunque NODE_ENV sea test', () => {
    const base = [createUserMessage({ content: 'hola' })]
    const result = prependUserContext(base, { userEmail: 'a@b.com' })
    expect(result.length).toBe(base.length + 1)
    expect(result[0]?.isMeta).toBe(true)
  })

  test('2. sin contexto, devuelve los mensajes sin cambios', () => {
    const base = [createUserMessage({ content: 'hola' })]
    const result = prependUserContext(base, {})
    expect(result).toBe(base)
  })
})
