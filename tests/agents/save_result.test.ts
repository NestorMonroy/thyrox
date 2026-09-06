/**
 * Pruebas de `src/agents/save_result.mjs` — el tercer escritor del store de
 * agentes, portado de `kaupamex-docs: .claude/hooks/save-agent-result.mjs`.
 *
 * Qué viaja y qué no (DEC-04): viaja el MECANISMO —leer el transcript,
 * deduplicar el uso por `message.id`, ponderar el coste equivalente y componer
 * la entrada—. NO viaja el destino del log, que en la fuente se derivaba por
 * aritmetica de ruta (`dirname(dirname(here))`) y por tanto anclaba al
 * consumidor: aqui es parametro, y sin el se rehusa.
 *
 * El caso que DISCRIMINA es el 4: un agente cortado por maxTurns no deja
 * mensaje final PERO si deja uso. La fuente lo declara verbatim
 * (H-DOCS-106: 240 708 tokens, salida vacia); un puerto que sólo registrara
 * cuando hay texto escondería justo las ejecuciones que cuestan sin entregar.
 */
import { describe, expect, test } from 'bun:test'
import * as sr from '../../src/agents/save_result.mjs'

const linea = (id: string, texto: string, uso: Record<string, number>) =>
  JSON.stringify({
    type: 'assistant',
    message: { role: 'assistant', id, content: [{ type: 'text', text: texto }], usage: uso },
  })

const USO = {
  input_tokens: 10,
  cache_creation_input_tokens: 100,
  cache_read_input_tokens: 1000,
  output_tokens: 5,
}

describe('A. El destino del log es PARAMETRO, no `docs`', () => {
  test('sin destino declarado, rehusa en vez de inventarlo', () => {
    expect(sr.resolveLogFile({}, {})).toBeNull()
  })

  test('con --log-dir compone el archivo del registro', () => {
    const f = sr.resolveLogFile({ '--log-dir': '/x/agent-results' }, {})
    expect(f).toBe('/x/agent-results/registro-de-agentes.md')
  })

  test('la variable de entorno sirve de respaldo', () => {
    expect(sr.resolveLogFile({}, { AGENT_RESULTS_DIR: '/y' }))
      .toBe('/y/registro-de-agentes.md')
  })
})

describe('B. El uso se deduplica por message.id — last wins', () => {
  test('dos bloques del mismo turno cuentan UNA vez', () => {
    const uso = sr.usageFromLines([linea('m1', 'a', USO), linea('m1', 'b', USO)])
    expect(uso.turns).toBe(1)
    expect(uso.cacheRead).toBe(1000)
  })

  test('dos turnos distintos suman', () => {
    const uso = sr.usageFromLines([linea('m1', 'a', USO), linea('m2', 'b', USO)])
    expect(uso.turns).toBe(2)
    expect(uso.cacheRead).toBe(2000)
  })

  test('el ultimo texto no vacio gana', () => {
    expect(sr.lastAssistantText([linea('m1', 'primero', USO), linea('m2', 'ultimo', USO)]))
      .toBe('ultimo')
  })

  test('una linea que no parsea no revienta el recorrido', () => {
    const uso = sr.usageFromLines(['{no es json', '', linea('m1', 'a', USO)])
    expect(uso.turns).toBe(1)
  })
})

describe('C. El coste equivalente pondera, no suma en crudo', () => {
  test('los cuatro pesos de la fuente: 1 / 1.25 / 0.1 / 5', () => {
    // 10 + 1.25*100 + 0.1*1000 + 5*5 = 10 + 125 + 100 + 25 = 260
    expect(sr.equivalentCost(sr.usageFromLines([linea('m1', 'a', USO)]))).toBe(260)
  })

  test('sumar en crudo daria otra cifra — el control de que pondera', () => {
    const uso = sr.usageFromLines([linea('m1', 'a', USO)])
    const crudo = uso.input + uso.cacheCreation + uso.cacheRead + uso.output
    expect(sr.equivalentCost(uso)).not.toBe(crudo)
  })
})

describe('D. DISCRIMINA: un agente sin mensaje final PERO con uso SI se registra', () => {
  test('sin texto y con turnos, hay entrada', () => {
    const uso = { input: 0, cacheCreation: 0, cacheRead: 240708, output: 0, turns: 4 }
    expect(sr.shouldRecord('', uso)).toBe(true)
  })

  test('sin texto y sin turnos, no hay nada que registrar', () => {
    const vacio = { input: 0, cacheCreation: 0, cacheRead: 0, output: 0, turns: 0 }
    expect(sr.shouldRecord('', vacio)).toBe(false)
  })

  test('y la entrada lo dice en vez de dejar el cuerpo en blanco', () => {
    const uso = { input: 0, cacheCreation: 0, cacheRead: 240708, output: 0, turns: 4 }
    const e = sr.entryFor({ ts: '2026-09-06T21:00:00Z', session: 's1',
                            transcript: 't.jsonl', text: '', usage: uso })
    expect(e).toContain('sin mensaje final')
    expect(e).toContain('240,708')
  })
})

describe('E. Los TRES tipos de costo se declaran — no uno rotulado «el costo»', () => {
  test('el módulo nombra los tres y dice dónde vive cada uno', () => {
    expect(Object.keys(sr.COST_KINDS).sort())
      .toEqual(['equiv_tokens', 'titular_harness', 'usd'])
    expect(sr.COST_KINDS.usd).toContain('model_catalog')
  })

  test('DISCRIMINA: el titular del harness y el ponderado NO son la misma cifra', () => {
    // El titular omite `cache_read`, que es el 98 % del consumo medido.
    const uso = sr.usageFromLines([JSON.stringify({
      type: 'assistant',
      message: { role: 'assistant', id: 'm1', content: [], usage: USO },
    })])
    expect(sr.harnessHeadline(uso)).toBe(10 + 100 + 5)     // 115, sin cache_read
    expect(sr.equivalentCost(uso)).toBe(260)               // con su peso 0.1
    expect(sr.equivalentCost(uso)).not.toBe(sr.harnessHeadline(uso))
  })

  test('cuanto más domina la caché, más se separan — que es por qué importa', () => {
    const conCache = { input: 0, cacheCreation: 0, cacheRead: 1_000_000, output: 0, turns: 1 }
    expect(sr.harnessHeadline(conCache)).toBe(0)            // el titular no ve nada
    expect(sr.equivalentCost(conCache)).toBe(100_000)       // el ponderado sí
  })

  test('el USD NO se calcula aquí: este módulo no lo expone', () => {
    // Su precio depende del modelo y del TTL; fabricarlo con los pesos de un
    // solo tier sería publicar una cifra que ningún modelo cobra.
    expect(Object.keys(sr).some((k) => /usd/i.test(k))).toBe(false)
  })
})
