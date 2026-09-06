/**
 * Porte de `ccnmt: packages/agent/__tests__/zodToJsonSchema.test.ts`.
 * Ejercita `zodToJsonSchema` de `zodSchema/zodToJsonSchema.ts`: la
 * conversión nativa vía `toJSONSchema` de `zod/v4` y su cache por
 * identidad de referencia (`WeakMap`).
 */
import { describe, expect, test } from 'bun:test'
import { z } from 'zod/v4'
import { zodToJsonSchema } from '../zodSchema/zodToJsonSchema.js'

describe('zodToJsonSchema — conversión básica', () => {
  test('z.string() convierte a JSON Schema con type=string', () => {
    const result = zodToJsonSchema(z.string())
    expect(result.type).toBe('string')
  })

  test('z.number() convierte a type=number', () => {
    const result = zodToJsonSchema(z.number())
    expect(result.type).toBe('number')
  })

  test('z.boolean() convierte a type=boolean', () => {
    const result = zodToJsonSchema(z.boolean())
    expect(result.type).toBe('boolean')
  })

  test('z.object({...}) convierte a type=object con properties', () => {
    const result = zodToJsonSchema(
      z.object({ name: z.string(), age: z.number() }),
    )
    expect(result.type).toBe('object')
    expect(result.properties).toBeDefined()
  })

  test('z.array(z.string()) convierte a type=array con items', () => {
    const result = zodToJsonSchema(z.array(z.string()))
    expect(result.type).toBe('array')
    expect(result.items).toBeDefined()
  })

  test('z.enum devuelve un schema tipado como enum', () => {
    const schema = z.enum(['a', 'b', 'c'])
    const result = zodToJsonSchema(schema)
    expect(result.enum).toEqual(['a', 'b', 'c'])
  })
})

describe('zodToJsonSchema — cache por identidad de referencia', () => {
  // Contrato crítico de rendimiento: esta función se llama en cada
  // request de API para cada herramienta (~60-250 veces por turno). La
  // cache WeakMap vuelve O(1) las búsquedas repetidas. Si un refactor
  // elimina por accidente la capa de cache, cada request de API vuelve a
  // parsear cada schema de Zod — medido ~30ms / llamada vs <1μs cacheado.

  test('la misma referencia de schema devuelve la misma referencia de resultado', () => {
    const schema = z.object({ name: z.string() })
    const a = zodToJsonSchema(schema)
    const b = zodToJsonSchema(schema)
    expect(a).toBe(b) // MISMA referencia, no sólo igual
  })

  test('instancias de schema distintas NO comparten cache (la clave de WeakMap es identidad)', () => {
    const schema1 = z.object({ name: z.string() })
    const schema2 = z.object({ name: z.string() }) // estructuralmente igual
    const a = zodToJsonSchema(schema1)
    const b = zodToJsonSchema(schema2)
    // Referencias distintas → entradas de cache separadas → referencias
    // de resultado potencialmente distintas.
    expect(a).not.toBe(b)
  })

  test('el resultado cacheado es estable en referencia a través de muchas llamadas', () => {
    const schema = z.string()
    const first = zodToJsonSchema(schema)
    for (let i = 0; i < 50; i++) {
      expect(zodToJsonSchema(schema)).toBe(first)
    }
  })

  test('la cache es por-schema (no global)', () => {
    const a = z.string()
    const b = z.number()
    const ra = zodToJsonSchema(a)
    const rb = zodToJsonSchema(b)
    expect(ra.type).toBe('string')
    expect(rb.type).toBe('number')
    // Llamadas repetidas preservan el mapeo por-schema.
    expect(zodToJsonSchema(a).type).toBe('string')
    expect(zodToJsonSchema(b).type).toBe('number')
  })

  test('el resultado es un objeto plano (Record<string, unknown>)', () => {
    const result = zodToJsonSchema(z.string())
    expect(typeof result).toBe('object')
    expect(result).not.toBeInstanceOf(Array)
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  })
})

describe('zodToJsonSchema — schemas complejos', () => {
  test('schemas de objeto anidados convierten correctamente', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      items: z.array(z.number()),
    })
    const result = zodToJsonSchema(schema)
    expect(result.type).toBe('object')
    expect(result.properties).toBeDefined()
  })

  test('los campos opcionales se reflejan en el arreglo required', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    })
    const result = zodToJsonSchema(schema)
    expect(result.required).toEqual(['required'])
  })

  test('los tipos union convierten sin lanzar', () => {
    const schema = z.union([z.string(), z.number()])
    expect(() => zodToJsonSchema(schema)).not.toThrow()
  })

  test('los tipos literal preservan el valor', () => {
    const schema = z.literal('hello')
    const result = zodToJsonSchema(schema)
    expect(result.const).toBe('hello')
  })
})
