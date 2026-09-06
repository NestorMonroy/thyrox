import { describe, expect, test } from 'bun:test'
import { MODELS, usageCostUsd, usageEquivalentTokens } from '../models.ts'

/**
 * Precio y consumo son DOS unidades distintas, y hay una tercera.
 *
 * - **tokens crudos** — la unidad de CAPACIDAD: lo que cabe en la ventana.
 * - **tokens equivalentes** — la unidad de COSTE COMPARABLE: pondera los cuatro
 *   componentes por los cocientes de un tier. No depende de la tarifa, así que
 *   dos ejecuciones se comparan aunque el precio de lista cambie.
 * - **USD** — la unidad de FACTURA: depende de una tabla externa por build.
 *
 * Confundirlas produce comparaciones falsas: un turno que lee 400 k de caché y
 * emite 500 tokens tiene el mismo conteo crudo en dos modelos y un coste muy
 * distinto en los otros dos ejes.
 */

const usage = {
  input_tokens: 1000,
  cache_creation_tokens: 2000,
  cache_read_tokens: 400_000,
  output_tokens: 500,
}

describe('tokens equivalentes — la unidad que NO depende de la tarifa', () => {
  test('los cocientes del tier 3/15 son los que el store ya usaba: 1 · 1.25 · 0.1 · 5', () => {
    // Control contra un valor conocido fuera de este código: `costo-agente.sh`
    // declara «in 1x, cc 1.25x, cr 0.1x, out 5x». Si la derivación por tier no
    // los reprodujera, esta función mediría otra cosa que la del store.
    //
    // El TTL es **5m**, y eso NO es un detalle: el 1.25x del store sólo sale de
    // la escritura a 5m (3.75/3); a 1h el cociente es 2 (6/3). Los pesos del
    // store llevan implícito el TTL por defecto de un subagente.
    const solo = (u: Partial<typeof usage>) =>
      usageEquivalentTokens('claude-sonnet-4-5', { input_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0, output_tokens: 0, ...u }, { cacheTtl: '5m' })
    expect(solo({ input_tokens: 1000 })).toBeCloseTo(1000, 6)
    expect(solo({ cache_creation_tokens: 1000 })).toBeCloseTo(1250, 6)   // 6 / 3 … 1h
    expect(solo({ cache_read_tokens: 1000 })).toBeCloseTo(100, 6)
    expect(solo({ output_tokens: 1000 })).toBeCloseTo(5000, 6)
  })

  test('el TTL de 5m da otro cociente de escritura: 3.75/3 = 1.25', () => {
    const cc = (ttl: '5m' | '1h') =>
      usageEquivalentTokens('claude-sonnet-4-5', { cache_creation_tokens: 1000 }, { cacheTtl: ttl })
    expect(cc('5m')).toBeCloseTo(1250, 6)
    expect(cc('1h')).toBeCloseTo(2000, 6)
  })

  test('Fable 5.1 ROMPE el cociente unico: su cache_read es 0.025, no 0.1', () => {
    // Es la ruptura que `agent_store.py` declara (H-DOCS-1008). Ponderar todo
    // el store con los cocientes de UN tier subestima a este modelo 4x en el
    // componente que domina el consumo.
    const cr = (m: string) => usageEquivalentTokens(m, { cache_read_tokens: 1000 })
    expect(cr('claude-sonnet-4-5')).toBeCloseTo(100, 6)
    expect(cr('claude-fable-5-1')).toBeCloseTo(25, 6)
  })

  test('una base explicita compara dos modelos con la MISMA vara', () => {
    // Sin base comun, «fable cuesta menos» mezcla dos escalas y no compara nada.
    const base = { basis: 'claude-sonnet-4-5' as const }
    const a = usageEquivalentTokens('claude-fable-5-1', usage, base)
    const b = usageEquivalentTokens('claude-opus-5', usage, base)
    expect(a).toBe(b)   // misma vara → mismo equivalente: la diferencia vive en USD
  })

  test('los tres ejes son independientes: mismo crudo, distinto equivalente y distinto USD', () => {
    const crudo = usage.input_tokens + usage.cache_creation_tokens + usage.cache_read_tokens + usage.output_tokens
    expect(crudo).toBe(403_500)   // la capacidad no depende del modelo
    const eqSonnet = usageEquivalentTokens('claude-sonnet-5', usage)
    const eqFable = usageEquivalentTokens('claude-fable-5-1', usage)
    expect(eqSonnet).not.toBeCloseTo(eqFable, 0)
    const usdSonnet = usageCostUsd('claude-sonnet-5', usage)
    const usdFable = usageCostUsd('claude-fable-5-1', usage)
    expect(usdSonnet).toBeLessThan(usdFable)
  })

  test('todo modelo con tier da un equivalente > 0 — el barrido, no un caso', () => {
    for (const id of Object.keys(MODELS)) {
      expect(usageEquivalentTokens(id, usage)).toBeGreaterThan(0)
    }
  })

  test('un modelo fuera del catalogo LANZA, no devuelve 0', () => {
    expect(() => usageEquivalentTokens('claude-inventado-9', usage)).toThrow(/sin tier de precio/)
  })
})

describe('la vara externa (`unit`) — comparar DOS modelos sin borrar su diferencia', () => {
  /**
   * `basis` y `unit` responden preguntas distintas y no son intercambiables:
   *
   * - `basis` pondera el consumo con los cocientes de OTRO tier y descarta los
   *   del modelo. Sirve para agregar un corpus de muchos modelos bajo una sola
   *   vara, con el sesgo declarado arriba.
   * - `unit` pondera con los precios REALES del modelo y sólo expresa el
   *   resultado en el token de entrada de otro tier. La diferencia de precio
   *   entre los dos modelos SOBREVIVE — que es justo lo que se compara al
   *   decidir una ruta de cambio de modelo.
   */
  test('con la vara del propio modelo, `unit` es la identidad', () => {
    for (const id of Object.keys(MODELS)) {
      expect(usageEquivalentTokens(id, usage, { unit: id })).toBeCloseTo(
        usageEquivalentTokens(id, usage), 9)
    }
  })

  test('`unit` es exactamente el USD dividido por el escalar del token de entrada de la vara', () => {
    const vara = 'claude-sonnet-5'
    const escalar = MODELS[vara]!.pricing!.input / 1e6
    for (const id of ['claude-fable-5-1', 'claude-opus-5', 'claude-haiku-4-5']) {
      const eq = usageEquivalentTokens(id, usage, { unit: vara })
      expect(eq).toBeCloseTo(usageCostUsd(id, usage, '1h') / escalar, 6)
    }
  })

  test('CONTROL — `basis` iguala a dos modelos distintos; `unit` los separa', () => {
    const a = 'claude-fable-5-1', b = 'claude-opus-5', vara = 'claude-sonnet-4-5'
    // `basis`: misma vara Y mismos cocientes → el mismo número (lo que ya
    // afirmaba el caso de arriba). Es correcto para agregar, y ciego para elegir.
    expect(usageEquivalentTokens(a, usage, { basis: vara }))
      .toBe(usageEquivalentTokens(b, usage, { basis: vara }))
    // `unit`: misma vara, precios propios → números distintos, y el orden es
    // el del USD.
    const ea = usageEquivalentTokens(a, usage, { unit: vara })
    const eb = usageEquivalentTokens(b, usage, { unit: vara })
    expect(ea).not.toBe(eb)
    expect(ea > eb).toBe(usageCostUsd(a, usage, '1h') > usageCostUsd(b, usage, '1h'))
  })

  test('pedir las dos varas a la vez REHÚSA — no elige una en silencio', () => {
    expect(() => usageEquivalentTokens('claude-opus-5', usage, { basis: 'claude-sonnet-5', unit: 'claude-sonnet-5' }))
      .toThrow(/basis.*unit|unit.*basis/)
  })

  test('una vara fuera del catálogo LANZA, no cae al modelo', () => {
    expect(() => usageEquivalentTokens('claude-opus-5', usage, { unit: 'claude-inventado-9' }))
      .toThrow(/sin tier de precio/)
  })
})
