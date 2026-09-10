/**
 * El hogar de la CLI: `@thyrox/cli` es quien la aloja, no `@thyrox/harness`.
 *
 * POR QUE ESTE ARCHIVO EXISTE. `@thyrox/harness` se esta vaciando (#226): su
 * `package.json` ya se describe como «lo que queda», y el de `@thyrox/cli`
 * declara desde su creacion ser «el hogar futuro de harness/bin/harness.ts (retirado)
 * (T-009) y su cli/render.ts — no movidos en este pase». Este es ese pase.
 *
 * MITAD ROJA: estas seis aserciones se escribieron ANTES de mover nada, y
 * fallan contra el arbol de hoy — el binario vive en `harness/bin/` y el
 * dibujo en `harness/src/cli/`.
 *
 * QUE MIDE Y QUE NO. Mide el HOGAR y que lo alojado siga vivo ahi: que el
 * paquete exporte el dibujo y la reanudacion, que el binario exista en su
 * nueva ruta, y que corra de punta a punta contra el proveedor grabado. NO
 * re-mide la conducta del dibujo ni la del bucle — de eso siguen siendo
 * dueñas sus propias suites, que viajan con ellos. Un archivo que mide dos
 * cosas a la vez no dice cual se rompio.
 *
 * DOS CONTROLES DE ANULACION, medidos tras la mudanza:
 *
 * - Se retira del `index.ts` de `@thyrox/cli` la reexportacion de
 *   `./render.ts`: caen **2 de 6**, los casos 1 y 2. El 3 sobrevive y debe —
 *   la reanudacion se reexporta por su cuenta.
 * - Se retira el binario de su nueva ruta: caen **2 de 6**, los casos 4 y 6.
 *
 * La prediccion de la segunda era **3 de 6** e incluia el caso 5; se corrige
 * con la medicion. El 5 sobrevive, y esa es la conducta correcta: mide que el
 * hogar VIEJO ya no lo tenga, y sacar el binario del hogar NUEVO no lo
 * devuelve al viejo. Un caso que cayera ahi estaria midiendo la presencia del
 * archivo en general, no la frontera entre los dos hogares.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const RAIZ_CLI = join(import.meta.dir, '..')
const ENTRADA = join(RAIZ_CLI, 'src', 'entry', 'main.ts')
const RAIZ_HARNESS = join(RAIZ_CLI, '..', 'harness')

const uso = {
  input_tokens: 1, output_tokens: 1,
  cache_creation_input_tokens: 0, cache_read_input_tokens: 0,
}

describe('el paquete aloja el dibujo de la CLI', () => {
  test('1. exporta renderEvent y renderStatusLine', async () => {
    const m = (await import('../src/index.js')) as Record<string, unknown>
    expect(typeof m.renderEvent).toBe('function')
    expect(typeof m.renderStatusLine).toBe('function')
  })

  test('2. exporta el catalogo de estilos de salida', async () => {
    const m = (await import('../src/index.js')) as { OUTPUT_STYLES?: readonly string[] }
    expect(Array.isArray(m.OUTPUT_STYLES)).toBe(true)
    expect(m.OUTPUT_STYLES).toContain('text')
  })

  test('3. exporta el selector de reanudacion', async () => {
    const m = (await import('../src/index.js')) as Record<string, unknown>
    expect(typeof m.resumeChoices).toBe('function')
  })
})

describe('el paquete aloja el punto de entrada', () => {
  test('4. el punto de entrada vive en cli/src/entry/main.ts', () => {
    // Renombrado en #205: se llamaba `bin/harness.ts` por el paquete retirado
    // en #226/#266. Las dos referencias lo llaman `main` y ninguna tiene
    // `bin/` — ver el docstring de `cliEntry.test.ts`.
    expect(existsSync(ENTRADA)).toBe(true)
  })

  test('5. y YA NO vive en ningun bin/, ni aqui ni en el paquete retirado', () => {
    // Dos puntos de entrada homonimos son dos superficies divergiendo, que es
    // lo que la mudanza cierra. Ahora ademas no hay `bin/` que los aloje.
    expect(existsSync(join(RAIZ_HARNESS, 'bin', 'harness.ts'))).toBe(false)
    expect(existsSync(join(RAIZ_CLI, 'bin'))).toBe(false)
  })

  test('6. y corre de punta a punta desde su nueva ruta', () => {
    const d = mkdtempSync(join(tmpdir(), 'hogar-cli-'))
    const marca = join(d, 'lo-hizo.txt')
    writeFileSync(join(d, 'turnos.json'), JSON.stringify([
      { id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
        content: [{ type: 'tool_use', id: 'tu1', name: 'Write',
          input: { file_path: marca, content: 'hecho' } }] },
      { id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
        content: [{ type: 'text', text: 'archivo escrito' }] },
    ]))
    const p = Bun.spawnSync(['bun', 'run', ENTRADA, '--prompt', 'escribe el archivo',
      '--provider', 'recorded', '--grabacion', join(d, 'turnos.json'),
      '--cwd', d, '--transcript-dir', join(d, 'tr'), '--json'])
    expect(p.exitCode).toBe(0)
    expect(existsSync(marca)).toBe(true)
  })
})
