// El vocabulario de esfuerzo tiene una sola declaración, en una hoja sin
// dependencias (`effortLevels.ts`). `effort.ts`, `schema.ts` y `models.ts`
// la re-exportan: el control de identidad (`toBe`) separa derivar de copiar,
// y la lectura del fuente separa importar la hoja de importar `effort.ts`,
// que arrastra feature flags y el proveedor.
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import * as effort from '../effort.ts'
import { EFFORT_LEVELS, NAMED_EFFORT_LEVELS } from '../effortLevels.ts'
import { effortCostIndex, MODELS } from '../models.ts'
import { AgentJsonSchema, EFFORT_LEVELS as EFFORT_FROM_SCHEMA } from '../schema.ts'

const source = (file: string) => readFileSync(join(import.meta.dir, '..', file), 'utf8')
const importSpecifiers = (text: string) => [...text.matchAll(/^\s*(?:import|export)\b[^'"]*from\s+['"]([^'"]+)['"]/gm)].map(m => m[1])

describe('la hoja effortLevels.ts', () => {
  test('declara los 6 niveles, con none primero', () => {
    expect([...EFFORT_LEVELS]).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max'])
  })

  test('deriva los 5 nombrados, sin none y en el mismo orden', () => {
    expect([...NAMED_EFFORT_LEVELS]).toEqual(['low', 'medium', 'high', 'xhigh', 'max'])
  })

  test('no importa nada', () => {
    expect(importSpecifiers(source('effortLevels.ts'))).toEqual([])
  })
})

describe('los consumidores re-exportan la hoja', () => {
  test('effort.ts expone el mismo arreglo', () => {
    expect(effort.EFFORT_LEVELS).toBe(EFFORT_LEVELS)
  })

  test('schema.ts expone el mismo arreglo de nombrados', () => {
    expect(EFFORT_FROM_SCHEMA).toBe(NAMED_EFFORT_LEVELS)
  })

  test.each(['schema.ts', 'models.ts'])('%s importa la hoja y no effort.ts', file => {
    const specifiers = importSpecifiers(source(file))
    expect(specifiers).toContain('./effortLevels.ts')
    expect(specifiers.some(s => /^\.\/effort\.(ts|js)$/.test(s))).toBe(false)
  })

  test('models.ts no redeclara los niveles como literales', () => {
    expect(source('models.ts')).not.toMatch(/'low'\s*\|\s*'medium'/)
  })
})

describe('comportamiento', () => {
  test('el frontmatter rechaza effort: none', () => {
    expect(AgentJsonSchema.safeParse({ description: 'x', prompt: 'y', effort: 'none' }).success).toBe(false)
  })

  test('el frontmatter acepta los cinco niveles nombrados', () => {
    for (const level of NAMED_EFFORT_LEVELS) {
      expect(AgentJsonSchema.safeParse({ description: 'x', prompt: 'y', effort: level }).success).toBe(true)
    }
  })

  test('effortCostIndex devuelve la cifra declarada de cada nivel en el catálogo', () => {
    const indexed = Object.entries(MODELS).filter(([, record]) => record.effort_cost_index !== undefined)
    expect(indexed.length).toBeGreaterThan(0)
    for (const [id, record] of indexed) {
      for (const level of NAMED_EFFORT_LEVELS) {
        expect(effortCostIndex(id, level)).toBe(record.effort_cost_index![level] ?? null)
      }
    }
  })
})
