/**
 * La resolución del modo de búsqueda de herramientas de 2.1.275
 * (`u9e`, `Dg`, `gfe`, `pQn`, `e_t` en `chunk-jre3kw1j.js`/`chunk-q2gh92k2.js`).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  getToolSearchMode,
  isToolSearchEnabledOptimistic,
  isToolSearchToolAvailable,
  parseAutoToolSearchPercentage,
} from '../toolSearch.js'

const KEYS = ['ENABLE_TOOL_SEARCH', 'CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX']
const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]))
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})
function env(values: Record<string, string | undefined>) {
  for (const k of KEYS) delete process.env[k]
  for (const [k, v] of Object.entries(values)) if (v !== undefined) process.env[k] = v
}

describe('parseAutoToolSearchPercentage (pQn)', () => {
  test('auto:N acota a 0..100; lo demás no es auto:N', () => {
    expect(parseAutoToolSearchPercentage('auto:25')).toBe(25)
    expect(parseAutoToolSearchPercentage('auto:250')).toBe(100)
    expect(parseAutoToolSearchPercentage('auto:-3')).toBe(0)
    expect(parseAutoToolSearchPercentage('auto:x')).toBeNull()
    expect(parseAutoToolSearchPercentage('true')).toBeNull()
  })
})

describe('getToolSearchMode (u9e)', () => {
  test('sin variable, tst', () => {
    env({})
    expect(getToolSearchMode()).toBe('tst')
  })
  test('auto y auto:N intermedio, tst-auto; los extremos se resuelven', () => {
    env({ ENABLE_TOOL_SEARCH: 'auto' })
    expect(getToolSearchMode()).toBe('tst-auto')
    env({ ENABLE_TOOL_SEARCH: 'auto:40' })
    expect(getToolSearchMode()).toBe('tst-auto')
    env({ ENABLE_TOOL_SEARCH: 'auto:0' })
    expect(getToolSearchMode()).toBe('tst')
    env({ ENABLE_TOOL_SEARCH: 'auto:100' })
    expect(getToolSearchMode()).toBe('standard')
  })
  test('verdadero y falso', () => {
    env({ ENABLE_TOOL_SEARCH: 'true' })
    expect(getToolSearchMode()).toBe('tst')
    env({ ENABLE_TOOL_SEARCH: 'false' })
    expect(getToolSearchMode()).toBe('standard')
  })
  test('las betas experimentales desactivadas fuerzan standard', () => {
    env({ ENABLE_TOOL_SEARCH: 'true', CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: '1' })
    expect(getToolSearchMode()).toBe('standard')
  })
})

describe('isToolSearchEnabledOptimistic (Dg)', () => {
  test('en standard, no', () => {
    env({ ENABLE_TOOL_SEARCH: 'false' })
    expect(isToolSearchEnabledOptimistic()).toBe(false)
  })
  test('una URL base que no es de Anthropic, sin variable, no', () => {
    env({ ANTHROPIC_BASE_URL: 'https://proxy.example.com' })
    expect(isToolSearchEnabledOptimistic()).toBe(false)
  })
  test('la misma URL con la variable puesta, sí', () => {
    env({ ANTHROPIC_BASE_URL: 'https://proxy.example.com', ENABLE_TOOL_SEARCH: 'true' })
    expect(isToolSearchEnabledOptimistic()).toBe(true)
  })
  test('primera parte sin variable, sí', () => {
    env({})
    expect(isToolSearchEnabledOptimistic()).toBe(true)
  })
})

describe('isToolSearchToolAvailable (gfe)', () => {
  test('por nombre o por alias', () => {
    expect(isToolSearchToolAvailable([{ name: 'Read' }, { name: 'ToolSearch' }] as never)).toBe(true)
    expect(isToolSearchToolAvailable([{ name: 'X', aliases: ['ToolSearch'] }] as never)).toBe(true)
    expect(isToolSearchToolAvailable([{ name: 'Read' }] as never)).toBe(false)
  })
})
