/**
 * `DEFAULT_AGENT_PROMPT`: el prompt de sistema de un subagente sin
 * definición propia (el papel del literal de 2.1.275 en `runAgent`). El
 * texto es de este árbol; lo que se fija es su contrato.
 */
import { describe, expect, test } from 'bun:test'
import { DEFAULT_AGENT_PROMPT } from '../prompts.js'

describe('DEFAULT_AGENT_PROMPT', () => {
  test('es una sola línea de texto no vacía', () => {
    expect(typeof DEFAULT_AGENT_PROMPT).toBe('string')
    expect(DEFAULT_AGENT_PROMPT.trim().length).toBeGreaterThan(0)
    expect(DEFAULT_AGENT_PROMPT).not.toContain('\n')
  })
  test('pide terminar la tarea con las herramientas y reportar a quien llamó', () => {
    expect(DEFAULT_AGENT_PROMPT).toMatch(/tools/i)
    expect(DEFAULT_AGENT_PROMPT).toMatch(/report/i)
    expect(DEFAULT_AGENT_PROMPT).toMatch(/caller/i)
  })
  test('no copia el texto del binario', () => {
    expect(DEFAULT_AGENT_PROMPT).not.toContain("Anthropic's official CLI")
    expect(DEFAULT_AGENT_PROMPT).not.toContain('gold-plate')
  })
})
