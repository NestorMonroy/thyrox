/**
 * La forma del system prompt de 2.1.275 (`Zw` en `chunk-q2gh92k2.js`): en
 * modo simple, sólo cwd y fecha; si no, secciones estáticas, la frontera
 * dinámica y después las dinámicas (entorno, instrucciones de MCP). El
 * texto es propio: lo que se fija es la forma.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { getSystemPrompt, SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from '../prompts.ts'

const saved = process.env.CLAUDE_CODE_SIMPLE
afterEach(() => {
  if (saved === undefined) delete process.env.CLAUDE_CODE_SIMPLE
  else process.env.CLAUDE_CODE_SIMPLE = saved
})
const tools = [{ name: 'Read' }, { name: 'Bash' }] as never

describe('getSystemPrompt', () => {
  test('modo simple: una sola sección con cwd y fecha', async () => {
    process.env.CLAUDE_CODE_SIMPLE = '1'
    const out = await getSystemPrompt(tools, 'claude-sonnet-5')
    expect(out).toHaveLength(1)
    expect(out[0]).toContain(`CWD: ${process.cwd()}`)
    expect(out[0]).toMatch(/Date: \d{4}-\d{2}-\d{2}/)
  })
  test('estáticas, frontera, dinámicas; sin secciones vacías', async () => {
    delete process.env.CLAUDE_CODE_SIMPLE
    const out = await getSystemPrompt(tools, 'claude-sonnet-5')
    const b = out.indexOf(SYSTEM_PROMPT_DYNAMIC_BOUNDARY)
    expect(b).toBeGreaterThan(0)
    expect(out.slice(b + 1).some(s => s.includes(process.cwd()))).toBe(true)
    expect(out.slice(0, b).some(s => s.includes(process.cwd()))).toBe(false)
    expect(out.every(s => typeof s === 'string' && s.trim().length > 0)).toBe(true)
  })
  test('las herramientas presentes se nombran, las ausentes no', async () => {
    delete process.env.CLAUDE_CODE_SIMPLE
    const text = (await getSystemPrompt(tools, 'claude-sonnet-5')).join('\n')
    expect(text).toContain('Read')
    expect(text).not.toContain('WebFetch')
  })
  test('las instrucciones de un servidor MCP conectado van tras la frontera', async () => {
    delete process.env.CLAUDE_CODE_SIMPLE
    const mcp = [
      { type: 'connected', name: 'docs', instructions: 'Usa search antes que fetch.' },
      { type: 'failed', name: 'caido', instructions: 'NO-DEBE-SALIR' },
    ] as never
    const out = await getSystemPrompt(tools, 'claude-sonnet-5', [], mcp)
    const b = out.indexOf(SYSTEM_PROMPT_DYNAMIC_BOUNDARY)
    const after = out.slice(b + 1).join('\n')
    expect(after).toContain('Usa search antes que fetch.')
    expect(after).toContain('docs')
    expect(out.join('\n')).not.toContain('NO-DEBE-SALIR')
  })
})
