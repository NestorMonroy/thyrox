/**
 * Los invariantes de `openai/convertMessages.ts` pinchados sobre su FUENTE.
 *
 * POR QUE ESTE INSTRUMENTO ADEMAS DE LOS DOS DE CONDUCTA. Las dos suites
 * portadas de la fuente —21 casos de traduccion y 4 del ida y vuelta del
 * pensamiento— miden el significado y son el control fuerte. Pero hay
 * invariantes que ningun caso interroga:
 *
 * - El default `'image/png'` del tipo de medio. Los dos casos de imagen en
 *   base64 declaran su `media_type`, asi que quitarle el default no cambia
 *   ningun veredicto.
 * - El `default: break` del switch por tipo de mensaje. Ningun caso pasa un
 *   mensaje que no sea `user` ni `assistant`, asi que nada mide que los demas
 *   se salten en vez de reventar.
 * - Que `reasoning_content` se agregue por `!== undefined` y no por
 *   veracidad. Con un bloque de pensamiento de cadena vacia la primera forma
 *   emite el campo vacio y la segunda lo suprime; ningun caso lo interroga.
 * - El `filter(Boolean)` del contenido de arreglo de un `tool_result`. Los
 *   casos usan bloques con texto, nunca uno vacio.
 *
 * CONTROLES DE ANULACION, los dos medidos:
 *
 * - Quitando el default `'image/png'`: caen **0 de 25** en conducta y **1 de
 *   6** aqui (el caso 2).
 * - Cambiando `reasoningContent !== undefined` por `reasoningContent`: caen
 *   **0 de 25** en conducta y **1 de 6** aqui (el caso 5).
 *
 * Los patrones se adaptan a NUESTRA redaccion —el puerto es reimplementacion
 * bajo UNLICENSED, no copia— pero pinchan invariantes de la fuente.
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
    'convertMessages.ts',
  ),
  'utf-8',
)

describe('invariantes escritos en openai/convertMessages.ts', () => {
  test('1. los mensajes tool se emiten ANTES de empujar el de usuario', () => {
    // El invariante que el API exige. La conducta tambien lo mide; aqui se
    // pincha ademas que este ESCRITO en ese orden, para que un refactor no lo
    // reordene apoyandose en que el caso de conducta pase por otra via.
    const cuerpo = fuente.slice(fuente.indexOf('function convertInternalUserMessage'))
    const posTool = cuerpo.indexOf('result.push(convertToolResult(tr))')
    const posUser = cuerpo.indexOf("result.push({ role: 'user', content: multiContent })")
    expect(posTool).toBeGreaterThan(-1)
    expect(posUser).toBeGreaterThan(-1)
    expect(posTool).toBeLessThan(posUser)
  })

  test('2. el tipo de medio cae a image/png cuando el bloque no lo declara', () => {
    expect(fuente).toMatch(/\(source\.media_type as string\) \|\| 'image\/png'/)
  })

  test('3. el switch por tipo de mensaje trae su rama default', () => {
    const cuerpo = fuente.slice(fuente.indexOf('for (const msg of messages)'))
    expect(cuerpo).toMatch(/case 'user':/)
    expect(cuerpo).toMatch(/case 'assistant':/)
    expect(cuerpo).toMatch(/default:\s*\n\s*break/)
  })

  test('4. el contenido de arreglo de un tool_result filtra los vacios', () => {
    const cuerpo = fuente.slice(fuente.indexOf('function convertToolResult'))
    expect(cuerpo.slice(0, cuerpo.indexOf('\n}'))).toMatch(/\.filter\(Boolean\)/)
  })

  test('5. reasoning_content se agrega por !== undefined, no por veracidad', () => {
    // Con veracidad, un bloque de pensamiento de cadena vacia suprimiria el
    // campo; con la comparacion explicita lo emite vacio, que es lo que la
    // fuente hace.
    expect(fuente).toMatch(
      /reasoningContent !== undefined && \{ reasoning_content: reasoningContent \}/,
    )
  })

  test('6. tool_calls se agrega solo si hay alguna, por longitud', () => {
    expect(fuente).toMatch(/toolCalls\.length > 0 && \{ tool_calls: toolCalls \}/)
  })
})
