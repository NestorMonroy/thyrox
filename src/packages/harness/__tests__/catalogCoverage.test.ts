/**
 * Cobertura del catálogo: cada modelo de `MODELS` cruza umbral, ventana efectiva
 * y coste por turno sin hueco.
 *
 * Fuente del porte: el catálogo `@thyrox/agent` (`src/models.json`), extraído
 * del ejecutable — aquí no se transcribe ninguna cifra. El test es una red
 * contra un modelo nuevo cuyo registro entre sin que las tres piezas lo cubran.
 */

import { describe, expect, test } from 'bun:test'
import { MODELS } from '@thyrox/agent/models'
import { autoCompactThreshold, effectiveContextWindow } from '../src/context/autocompact.ts'
import { turnCost } from '../src/observability/cost.ts'
import type { Usage } from '../src/types.ts'

/**
 * El harness se ejercita en el resto de la suite con UN modelo de fixture
 * (`claude-opus-5`). Eso deja sin medir la afirmacion que el codigo hace: que
 * el precio y la ventana salen del catalogo y valen para CUALQUIER modelo.
 *
 * Un verde sobre un solo modelo no distingue «trata a los 19» de «solo le
 * preguntaron por uno» — el sub-patron D de `metrica-decide-la-conclusion.md`.
 * Esta suite recorre el catalogo entero, asi que crece con el.
 */

const usage: Usage = {
  input_tokens: 1000,
  output_tokens: 500,
  cache_creation_input_tokens: 2000,
  cache_read_input_tokens: 400_000,
}

const catalog = Object.keys(MODELS)

describe('el harness cobra a CUALQUIER modelo del catalogo, no solo al del fixture', () => {
  test('el catalogo no esta vacio: sin esto las pruebas de abajo serian vacuas', () => {
    expect(catalog.length).toBeGreaterThan(1)
  })

  test.each(catalog)('%s tiene precio > 0 y ningun componente se pierde en la traduccion', (model) => {
    const { usd, reason } = turnCost(model, usage, '1h')
    expect(reason).toBeUndefined()
    expect(usd).not.toBeNull()
    expect(usd as number).toBeGreaterThan(0)
  })

  test('el TTL cambia el precio en todo el catalogo: la escritura a 1h es mas cara', () => {
    for (const model of catalog) {
      const corta = turnCost(model, usage, '5m').usd as number
      const larga = turnCost(model, usage, '1h').usd as number
      expect(larga).toBeGreaterThan(corta)
    }
  })

  test('el orden por precio NO es el del alias: fable-5-1 lee cache mas barato que opus-5', () => {
    // Es el caso que `model-selection-subagents.md` corrigio midiendo: con
    // cache_read dominando el consumo, fable-5-1 (0.25) queda por debajo de
    // opus-5 (0.5). Si el harness fijara un precio por familia, esto caeria.
    const fable = turnCost('claude-fable-5-1', usage, '1h').usd as number
    const opus = turnCost('claude-opus-5', usage, '1h').usd as number
    expect(fable).toBeLessThan(opus)
  })
})

describe('la ventana de compactacion sale del catalogo, modelo por modelo', () => {
  test('todo modelo con ventana declarada da un umbral positivo y menor que su ventana', () => {
    let conVentana = 0
    for (const model of catalog) {
      const ventana = MODELS[model]?.context?.window
      if (typeof ventana !== 'number') continue
      conVentana += 1
      const efectiva = effectiveContextWindow(model) as number
      const umbral = autoCompactThreshold(model) as number
      expect(efectiva).toBeGreaterThan(0)
      expect(efectiva).toBeLessThan(ventana)
      expect(umbral).toBeLessThan(efectiva)
    }
    expect(conVentana).toBeGreaterThan(0)
  })

  test('un modelo SIN ventana declarada devuelve null — no un numero inventado', () => {
    const sinVentana = catalog.filter((m) => typeof MODELS[m]?.context?.window !== 'number')
    // Los anteriores a la 4 no declaran ventana. Si algun dia todos la declaran
    // este caso deja de aplicar, y se vera aqui en vez de en produccion.
    for (const model of sinVentana) {
      expect(effectiveContextWindow(model)).toBeNull()
      expect(autoCompactThreshold(model)).toBeNull()
    }
  })

  test('las ventanas NO son todas iguales: un umbral fijo serviria a uno y no al otro', () => {
    const ventanas = new Set(
      catalog.map((m) => effectiveContextWindow(m)).filter((v): v is number => v !== null),
    )
    expect(ventanas.size).toBeGreaterThan(1)
  })
})
