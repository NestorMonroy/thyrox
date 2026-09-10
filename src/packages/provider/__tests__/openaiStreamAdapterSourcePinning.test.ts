/**
 * Los invariantes de `openai/streamAdapter.ts` pinchados sobre su FUENTE.
 *
 * POR QUE ESTE INSTRUMENTO ADEMAS DEL DE CONDUCTA. Los 22 casos de conducta
 * recorren el generador y leen los eventos que salen; ese es el control fuerte.
 * Pero el adaptador acumula estado entre chunks, y varias de sus decisiones solo
 * se distinguen con una secuencia que ningun caso construye:
 *
 * - `prompt_tokens ?? inputTokens` conserva el valor previo cuando un chunk
 *   posterior trae `usage` sin ese campo. Con `||` un cero lo borraria.
 * - `details?.cached_tokens` se lee por veracidad: un cero NO pisa el valor ya
 *   acumulado.
 * - `tc.id || generado` cae al id generado tambien con cadena vacia. Con `??`
 *   una cadena vacia se colaria como id de herramienta.
 * - El ORDEN de cierre al terminar —pensamiento, luego texto, luego las
 *   herramientas— y el guard que evita cerrar dos veces el mismo indice.
 *
 * CONTROL DE ANULACION, medido: cambiando `tc.id || …` por `tc.id ?? …` caen
 * **0 de 22** en conducta y **1 de 6** aqui (el caso 3).
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fuente = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'openai',
    'streamAdapter.ts',
  ),
  'utf-8',
)

describe('invariantes escritos en openai/streamAdapter.ts', () => {
  test('1. el uso acumulado se conserva con ??, no se pisa con ||', () => {
    expect(fuente).toMatch(/prompt_tokens \?\? inputTokens/)
    expect(fuente).toMatch(/completion_tokens \?\? outputTokens/)
  })

  test('2. cached_tokens se lee por veracidad: un cero no pisa lo acumulado', () => {
    expect(fuente).toMatch(/if \(details\?\.cached_tokens\) \{/)
  })

  test('3. el id de herramienta cae al generado tambien con cadena vacia', () => {
    // Con `??` en vez de `||`, una cadena vacia se colaria como id.
    expect(fuente).toMatch(/tc\.id \|\|\s*`toolu_/)
    expect(fuente).not.toMatch(/tc\.id \?\?/)
  })

  test('4. al terminar se cierra pensamiento, luego texto, luego herramientas', () => {
    const cierre = fuente.slice(fuente.indexOf('if (choice?.finish_reason)'))
    const posPensamiento = cierre.indexOf('if (thinkingBlockOpen)')
    const posTexto = cierre.indexOf('if (textBlockOpen)')
    const posHerramientas = cierre.indexOf('for (const [, block] of toolBlocks)')
    expect(posPensamiento).toBeGreaterThan(-1)
    expect(posPensamiento).toBeLessThan(posTexto)
    expect(posTexto).toBeLessThan(posHerramientas)
  })

  test('5. el cierre de herramientas comprueba que el indice siga abierto', () => {
    // Sin el guard, un bloque ya cerrado se cerraria dos veces.
    const cierre = fuente.slice(fuente.indexOf('for (const [, block] of toolBlocks)'))
    expect(cierre).toMatch(/if \(openBlockIndices\.has\(block\.contentIndex\)\)/)
  })

  test('6. el stop_reason se FUERZA a tool_use por presencia de herramientas', () => {
    // Algunos backends devuelven «stop» con tool_calls presentes; sin este
    // forzado el bucle no llegaria a ejecutarlas.
    expect(fuente).toMatch(
      /const hasToolCalls = toolBlocks\.size > 0[\s\S]{0,160}hasToolCalls[\s\S]{0,40}'tool_use'/,
    )
  })
})
