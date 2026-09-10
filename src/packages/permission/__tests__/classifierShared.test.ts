/**
 * La mitad ROJA del porte de `classifierShared`.
 *
 * Procedencia: `ccnmt: packages/permission/src/classifierShared.ts`
 * (39 líneas, 2 símbolos exportados). Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se reimplementa y no se copia.
 *
 * Métrica: la selección del bloque por nombre y la validación de su carga.
 * Ciega a: si el esquema que se pasa describe bien la respuesta del
 * clasificador — eso lo declara cada consumidor.
 */
import { describe, expect, test } from 'bun:test'
import { z } from 'zod/v4'

type Bloque = { type: string; name?: string; input?: unknown }

const BLOQUES: Bloque[] = [
  { type: 'text' },
  { type: 'tool_use', name: 'otra', input: { a: 1 } },
  { type: 'tool_use', name: 'buscada', input: { veredicto: 'permitir' } },
]

describe('extractToolUseBlock — el bloque, por su nombre', () => {
  test('1. devuelve el bloque de uso de herramienta que coincide', async () => {
    const { extractToolUseBlock } = await import('../src/classifierShared.ts')
    const bloque = extractToolUseBlock(BLOQUES as never, 'buscada')
    expect(bloque?.name).toBe('buscada')
  })

  test('2. un nombre que no está da null, no el primero', async () => {
    const { extractToolUseBlock } = await import('../src/classifierShared.ts')
    // Devolver «el primero que haya» haría que un clasificador leyera la
    // respuesta de otro sin ningún error visible.
    expect(extractToolUseBlock(BLOQUES as never, 'inexistente')).toBeNull()
  })

  test('3. un bloque de texto con el mismo nombre NO cuenta', async () => {
    const { extractToolUseBlock } = await import('../src/classifierShared.ts')
    const soloTexto = [{ type: 'text', name: 'buscada' }]
    expect(extractToolUseBlock(soloTexto as never, 'buscada')).toBeNull()
  })

  test('4. una lista vacía da null', async () => {
    const { extractToolUseBlock } = await import('../src/classifierShared.ts')
    expect(extractToolUseBlock([], 'buscada')).toBeNull()
  })
})

describe('parseClassifierResponse — validar antes de creer', () => {
  test('5. una carga válida vuelve tipada', async () => {
    const { parseClassifierResponse } = await import(
      '../src/classifierShared.ts'
    )
    const esquema = z.object({ veredicto: z.string() })
    const bloque = { type: 'tool_use', name: 'x', input: { veredicto: 'sí' } }
    expect(parseClassifierResponse(bloque as never, esquema)).toEqual({
      veredicto: 'sí',
    })
  })

  test('6. una carga INVÁLIDA da null, no lanza', async () => {
    const { parseClassifierResponse } = await import(
      '../src/classifierShared.ts'
    )
    // Un clasificador que devuelve basura no debe derribar la decisión de
    // permiso: el `null` deja que quien llama caiga a su camino seguro.
    const esquema = z.object({ veredicto: z.string() })
    const bloque = { type: 'tool_use', name: 'x', input: { otra: 1 } }
    expect(parseClassifierResponse(bloque as never, esquema)).toBeNull()
  })

  test('7. una carga ausente da null', async () => {
    const { parseClassifierResponse } = await import(
      '../src/classifierShared.ts'
    )
    const esquema = z.object({ veredicto: z.string() })
    expect(
      parseClassifierResponse({ type: 'tool_use', name: 'x' } as never, esquema),
    ).toBeNull()
  })
})
