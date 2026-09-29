/**
 * `sessionStores.ts` no nombra el paquete `repl` en ninguna forma: un
 * `require()` perezoso en ejecución deja igual su especificador en el grafo
 * estático que arma `Bun.build`. Los creadores de store reciben el oyente
 * (`AppStateChange`) y el anfitrión les pasa `onChangeAppState`.
 *
 * *Ciega a:* esta prueba mide sólo las aristas DIRECTAS de `sessionStores.ts`
 * — no que ningún módulo de `repl` sea alcanzable transitivamente desde
 * cualquier import suyo. Medido aparte: `appStateCompatShim.ts` (import
 * estático necesario, fuera de este archivo) llega a
 * `repl/promptSuggestion.js` vía `state/AppStateCompat.ts`, y ese camino
 * por sí solo ya arrastra ~150 módulos de `repl` — independiente de
 * `onChangeAppState` y fuera del alcance de este corte (no es
 * `sessionStores.ts` ni un consumidor de `repl`).
 */
import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

const ENTRY = join(import.meta.dir, '..', 'sessionStores.ts')

describe('sessionStores.ts no nombra el paquete repl', () => {
  test('ninguna arista DIRECTA del grafo estático apunta a repl', async () => {
    const result = await Bun.build({
      entrypoints: [ENTRY],
      target: 'bun',
      metafile: true,
    })
    expect(result.success).toBe(true)
    const inputs = result.metafile!.inputs
    const entry = Object.keys(inputs).find(p => p.endsWith('sessionStores.ts'))!
    const directRepl = inputs[entry]!.imports
      .map(i => i.path)
      .filter(p => p.includes('/packages/repl/'))
    expect(directRepl).toEqual([])
  })

  test('importar el módulo no ejecuta repl/onChangeAppState.ts', async () => {
    await import(ENTRY)
    const loaded = Object.keys(require.cache)
    expect(loaded.some(p => p.endsWith('/packages/repl/src/onChangeAppState.ts'))).toBe(false)
  })
})
