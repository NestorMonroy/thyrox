/**
 * Los invariantes de `openai/modelMapping.ts` pinchados sobre su FUENTE.
 *
 * POR QUE ESTE INSTRUMENTO ADEMAS DEL DE CONDUCTA. Los 20 casos portados de la
 * suite de la fuente (`openaiModelMapping.test.ts`) miden el significado: se
 * llama a `resolveOpenAIModel` con el entorno sembrado y se lee lo que sale.
 * Ese es el control fuerte. Pero hay invariantes que un refactor puede soltar
 * SIN que ninguno de los 20 casos cambie de veredicto, porque ninguno los
 * interroga:
 *
 * - El ORDEN de la deteccion de familia (haiku, luego opus, luego sonnet). Solo
 *   se observa con un nombre que contenga dos familias, y ninguno de los 20 lo
 *   tiene.
 * - El ANCLA `$` del recorte de `[1m]`. Un `.replace('[1m]', '')` sin ancla
 *   pasa los tres casos de sufijo, porque los tres lo llevan al final.
 * - El `??` del fallback final. Con `||` el veredicto solo cambia si alguna
 *   entrada del mapa fuera cadena vacia, y ninguna lo es.
 * - Que el modulo lea el entorno por `readEnv` y no por `process.env` directo.
 *   Los 20 casos siembran `process.env`, asi que los dos caminos dan lo mismo
 *   — y sin embargo `readEnv` es la capa que aplica la expansion del entorno.
 * - Las 13 entradas del mapa. La conducta solo ejercita 6; borrar una de las
 *   otras 7 no mueve ninguna aserción.
 *
 * Son dos ejes y ninguno sustituye al otro. Los patrones se adaptan a NUESTRA
 * redaccion —el puerto es reimplementacion bajo UNLICENSED, no copia— pero
 * pinchan invariantes de la fuente, no de nuestro estilo.
 *
 * CONTROLES DE ANULACION, los dos medidos:
 *
 * - Quitando el ancla `$` del recorte de `[1m]`: cae **1 de 8** aqui (el caso
 *   3) y **0 de 20** en la suite de conducta. Ese es el hueco que este
 *   instrumento existe para cubrir.
 * - Invirtiendo la precedencia `OPENAI_DEFAULT_` / `ANTHROPIC_DEFAULT_`: cae
 *   **1 de 20** en conducta y **1 de 8** aqui (el caso 6). Ese es el hueco
 *   contrario, y es el que prueba que ninguno de los dos ejes sobra.
 *
 * La segunda medicion destapo un defecto en este mismo archivo: la primera
 * version del caso 6 buscaba los dos nombres sobre el ARCHIVO entero, y los
 * dos aparecen —en ese mismo orden— en el docstring de prioridad de la
 * fuente. Con el codigo invertido daba verde: media el comentario, no el
 * codigo. Se acoto al cuerpo de la funcion y entonces si cayo. Un control que
 * no se anula no es un control.
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
    'modelMapping.ts',
  ),
  'utf-8',
)

describe('invariantes escritos en openai/modelMapping.ts', () => {
  test('1. el entorno se lee por readEnv, no por process.env directo', () => {
    expect(fuente).toMatch(/import \{ readEnv \} from '@thyrox\/config\/env\/utils'/)
    expect(fuente).not.toMatch(/process\.env/)
  })

  test('2. OPENAI_MODEL se consulta ANTES de la rama de familia', () => {
    const posOpenaiModel = fuente.indexOf("readEnv('OPENAI_MODEL')")
    const posFamilia = fuente.indexOf('getModelFamily(')
    expect(posOpenaiModel).toBeGreaterThan(-1)
    expect(posFamilia).toBeGreaterThan(-1)
    // La declaracion de la funcion aparece antes; lo que se pincha es la
    // LLAMADA dentro de resolveOpenAIModel.
    const cuerpo = fuente.slice(fuente.indexOf('export function resolveOpenAIModel'))
    expect(cuerpo.indexOf("readEnv('OPENAI_MODEL')")).toBeLessThan(
      cuerpo.indexOf('getModelFamily('),
    )
  })

  test('3. el recorte de [1m] esta ANCLADO al final', () => {
    expect(fuente).toMatch(/\.replace\(\/\\\[1m\\\]\$\/, ''\)/)
  })

  test('4. la familia se detecta en el orden haiku, opus, sonnet', () => {
    const posHaiku = fuente.indexOf('/haiku/i')
    const posOpus = fuente.indexOf('/opus/i')
    const posSonnet = fuente.indexOf('/sonnet/i')
    expect(posHaiku).toBeGreaterThan(-1)
    expect(posHaiku).toBeLessThan(posOpus)
    expect(posOpus).toBeLessThan(posSonnet)
  })

  test('5. las tres deteccciones de familia ignoran la caja (bandera i)', () => {
    for (const familia of ['haiku', 'opus', 'sonnet']) {
      expect(fuente).toMatch(new RegExp(`/${familia}/i\\.test\\(`))
    }
  })

  test('6. OPENAI_DEFAULT_ se consulta ANTES que ANTHROPIC_DEFAULT_', () => {
    // Se acota al CUERPO de la funcion a proposito: los dos nombres tambien
    // aparecen, en ese mismo orden, en el docstring de prioridad. Medir sobre
    // el archivo entero daria verde con el codigo invertido — un control que
    // no discrimina. Medido: acotado, la inversion lo hace caer.
    const cuerpo = fuente.slice(fuente.indexOf('export function resolveOpenAIModel'))
    const posOpenai = cuerpo.indexOf('`OPENAI_DEFAULT_${')
    const posAnthropic = cuerpo.indexOf('`ANTHROPIC_DEFAULT_${')
    expect(posOpenai).toBeGreaterThan(-1)
    expect(posAnthropic).toBeGreaterThan(-1)
    expect(posOpenai).toBeLessThan(posAnthropic)
  })

  test('7. el fallback final usa ?? y devuelve el modelo YA recortado', () => {
    expect(fuente).toMatch(/DEFAULT_MODEL_MAP\[cleanModel\] \?\? cleanModel/)
  })

  test('8. el mapa por defecto declara exactamente 13 entradas', () => {
    const inicio = fuente.indexOf('const DEFAULT_MODEL_MAP')
    expect(inicio).toBeGreaterThan(-1)
    const literal = fuente.slice(inicio, fuente.indexOf('}', inicio))
    const entradas = literal.match(/^\s*'claude-[^']+':/gm) ?? []
    expect(entradas).toHaveLength(13)
  })
})
