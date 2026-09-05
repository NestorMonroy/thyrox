// Suite del contrato del paquete — TDD: se escribe antes del refactor.
//
// Mide dos invariantes que ningún otro caso cubre:
//   1. una sola fuente de verdad para los enums (no dos listas que nadie
//      sincroniza — el corolario de calibration-verified-numbers.md);
//   2. el emisor de `agents.json` VALIDA, en vez de publicar cualquier objeto.
import { describe, expect, test } from 'bun:test'
import { AGENTS, toAgentsJson } from '../src/index.ts'
import { EFFORT_LEVELS as EFFORT_FROM_SCHEMA } from '../src/schema.ts'
import { EFFORT_LEVELS as EFFORT_FROM_TYPES } from '../src/types.ts'
import type { AgentDefinition } from '../src/types.ts'

describe('una sola fuente de verdad', () => {
  test('los niveles de effort son EL MISMO objeto, no dos listas iguales', () => {
    // La igualdad por valor pasaría con dos listas copiadas; la identidad no.
    expect(EFFORT_FROM_TYPES).toBe(EFFORT_FROM_SCHEMA)
  })
})

describe('el emisor de agents.json valida', () => {
  test('emite el registro de las definiciones del paquete', () => {
    const registry = toAgentsJson(AGENTS)
    expect(Object.keys(registry)).toContain('migration-porter')
  })

  test('el nombre es la clave y no queda en el valor', () => {
    const registry = toAgentsJson(AGENTS)
    expect(registry['migration-porter']).not.toHaveProperty('name')
  })

  test('color NO pertenece al esquema de --agents', () => {
    const registry = toAgentsJson(AGENTS)
    expect(registry['migration-porter']).not.toHaveProperty('color')
  })

  // CONTROL NEGATIVO — antes del refactor esto pasaba en silencio.
  test('rehúsa una definición que el ejecutable rechazaría', () => {
    const roto = { name: '-oculto', description: 'x', prompt: 'y' } as AgentDefinition
    expect(() => toAgentsJson([roto])).toThrow(/must not start with/)
  })

  test('rehúsa la descripción vacía', () => {
    const roto = { name: 'alfa', description: '', prompt: 'y' } as AgentDefinition
    expect(() => toAgentsJson([roto])).toThrow(/alfa/)
  })
})
