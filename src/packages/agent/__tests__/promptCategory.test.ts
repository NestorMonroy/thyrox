/**
 * Porte de `ccnmt: packages/agent/__tests__/promptCategory.test.ts`.
 * La etiqueta que separa un agente propio del producto de uno definido por
 * quien lo usa. Si las categorias se colapsan, la lectura por tipo de
 * agente deja de poder hacerse.
 */
import { describe, expect, test } from 'bun:test'
import { getQuerySourceForAgent } from '../src/promptCategory.ts'

describe('getQuerySourceForAgent', () => {
  test('propio con tipo da agent:builtin:<tipo>', () => {
    expect(getQuerySourceForAgent('reviewer', true)).toBe('agent:builtin:reviewer')
  })

  test('propio sin tipo da agent:default', () => {
    expect(getQuerySourceForAgent(undefined, true)).toBe('agent:default')
  })

  test('propio con tipo vacio cae al defecto, no a un prefijo sin sujeto', () => {
    expect(getQuerySourceForAgent('', true)).toBe('agent:default')
  })

  test('el tipo se IGNORA cuando el agente no es propio', () => {
    expect(getQuerySourceForAgent('myCustomAgent', false)).toBe('agent:custom')
  })

  test('no propio y sin tipo da la misma categoria', () => {
    expect(getQuerySourceForAgent(undefined, false)).toBe('agent:custom')
  })

  test('el tipo se interpola verbatim: no hay escapado', () => {
    // Contrato declarado: quien llama es responsable de un nombre sano.
    expect(getQuerySourceForAgent('weird:type-name', true)).toBe(
      'agent:builtin:weird:type-name',
    )
  })

  test('los cuatro cuadrantes devuelven una cadena no vacia', () => {
    for (const s of [
      getQuerySourceForAgent('a', true),
      getQuerySourceForAgent(undefined, true),
      getQuerySourceForAgent('a', false),
      getQuerySourceForAgent(undefined, false),
    ]) {
      expect(typeof s).toBe('string')
      expect(s.length).toBeGreaterThan(0)
    }
  })
})
