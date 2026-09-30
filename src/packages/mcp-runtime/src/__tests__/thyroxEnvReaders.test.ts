/**
 * THYROX_AGENT_SDK_MCP_NO_PREFIX decide si las herramientas de un servidor
 * MCP del SDK pierden el prefijo `mcp__servidor__`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { skipsMcpToolPrefix } from '../clientRuntime.ts'

const KEY = 'THYROX_AGENT_SDK_MCP_NO_PREFIX'
let saved: string | undefined
beforeEach(() => {
  saved = process.env[KEY]
  delete process.env[KEY]
})
afterEach(() => {
  if (saved === undefined) delete process.env[KEY]
  else process.env[KEY] = saved
})

describe('THYROX_AGENT_SDK_MCP_NO_PREFIX', () => {
  test('un servidor del SDK pierde el prefijo sólo con la variable fijada', () => {
    expect(skipsMcpToolPrefix('sdk')).toBe(false)
    process.env[KEY] = '1'
    expect(skipsMcpToolPrefix('sdk')).toBe(true)
  })

  test('un servidor que no es del SDK conserva el prefijo aunque esté fijada', () => {
    process.env[KEY] = '1'
    expect(skipsMcpToolPrefix('stdio')).toBe(false)
  })
})
