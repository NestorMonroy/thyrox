/**
 * La mitad ROJA de `semanticBoolean`.
 *
 * Procedencia del SUJETO: `ccnmt: packages/tool-registry/src/utils/semanticBoolean.ts`.
 * Los casos son propios —no se copian los de su `__tests__`, que ese árbol
 * declara `"license": "UNLICENSED"`— y cubren el mismo contrato.
 *
 * QUÉ SE MIDE, y por qué esto y no otra cosa. El valor del módulo no está en
 * lo que ACEPTA sino en lo que RECHAZA: `z.coerce.boolean()` aceptaría
 * `"false"`, `"no"`, `0` y `{}` convirtiéndolos por veracidad, y `"false"`
 * saldría `true`. Los casos de rechazo son el control de que esta pieza NO es
 * `z.coerce`.
 *
 * Dos costuras con anulación:
 *
 * 1. **La rama `"false" -> false`** — es la que separa esta pieza de
 *    `z.coerce`. Anulación: quitarla y cae el caso de la cadena `"false"`.
 * 2. **El esquema anunciado** — `z.preprocess` deja `{"type":"boolean"}` en el
 *    JSON Schema, así que la tolerancia no se publica al modelo. Anulación:
 *    sustituir el `preprocess` por `z.union([...])` y cae el caso de forma.
 *
 * Métrica: `safeParse` sobre los siete tipos de valor que un JSON puede traer,
 * más el JSON Schema que Zod emite.
 * Ciega a: si el modelo entrecomilla de verdad — eso lo decide el modelo, no
 * este esquema.
 */
import { describe, expect, test } from 'bun:test'
import { z } from 'zod/v4'
import { semanticBoolean } from '../semanticBoolean.js'

describe('semanticBoolean — lo que acepta', () => {
  test('un booleano de verdad pasa tal cual', () => {
    expect(semanticBoolean().parse(true)).toBe(true)
    expect(semanticBoolean().parse(false)).toBe(false)
  })

  test('la cadena "true" se convierte', () => {
    expect(semanticBoolean().parse('true')).toBe(true)
  })

  test('la cadena "false" se convierte a false, NO a true', () => {
    // Es el caso entero del módulo: `z.coerce.boolean()` daría `true` aquí.
    expect(semanticBoolean().parse('false')).toBe(false)
  })
})

describe('semanticBoolean — lo que rechaza (que es el punto)', () => {
  test('cualquier otra cadena', () => {
    for (const v of ['TRUE', 'False', 'yes', 'no', '1', '0', '']) {
      expect(semanticBoolean().safeParse(v).success).toBe(false)
    }
  })

  test('números, incluidos 0 y 1', () => {
    expect(semanticBoolean().safeParse(0).success).toBe(false)
    expect(semanticBoolean().safeParse(1).success).toBe(false)
  })

  test('null y undefined', () => {
    expect(semanticBoolean().safeParse(null).success).toBe(false)
    expect(semanticBoolean().safeParse(undefined).success).toBe(false)
  })

  test('objetos y arreglos', () => {
    expect(semanticBoolean().safeParse({}).success).toBe(false)
    expect(semanticBoolean().safeParse([]).success).toBe(false)
  })
})

describe('semanticBoolean — con el modificador DENTRO', () => {
  test('con `.optional()`, undefined pasa y devuelve undefined', () => {
    expect(semanticBoolean(z.boolean().optional()).parse(undefined)).toBeUndefined()
  })

  test('con `.optional()`, la cadena sigue convirtiéndose', () => {
    expect(semanticBoolean(z.boolean().optional()).parse('true')).toBe(true)
  })

  test('con `.optional()`, null SIGUE rechazado — sólo undefined es válido', () => {
    expect(semanticBoolean(z.boolean().optional()).safeParse(null).success).toBe(false)
  })

  test('con `.default(false)`, undefined toma el valor por defecto', () => {
    expect(semanticBoolean(z.boolean().default(false)).parse(undefined)).toBe(false)
    expect(semanticBoolean(z.boolean().default(true)).parse(undefined)).toBe(true)
  })

  test('con `.default(false)`, la cadena gana sobre el defecto', () => {
    expect(semanticBoolean(z.boolean().default(false)).parse('true')).toBe(true)
  })
})

describe('semanticBoolean — lo que se le anuncia al modelo', () => {
  test('el JSON Schema dice boolean: la tolerancia es invisible', () => {
    const esquema = z.toJSONSchema(semanticBoolean(), { io: 'input' }) as {
      type?: string
    }
    expect(esquema.type).toBe('boolean')
  })
})
