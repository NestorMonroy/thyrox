import { describe, expect, test } from 'bun:test'
import { DEFAULT_TTL_BY_SOURCE, aliasesReaching, canAdvise, routesForOtherModel } from '../cost/cacheRoutes.ts'
import { decide } from '../bin/preModelSwitch.ts'

const req = { from: 'claude-fable-5-1', to: 'claude-opus-5', contextTokens: 508_503, cacheTtl: '1h' as const, subagentFloorTokens: 126_029 }

describe('routesForOtherModel — tres vías, de la más barata a la más cara', () => {
  test('con el contexto medido, el subagente es la más barata y conserva la caché', () => {
    const r = routesForOtherModel(req)
    expect(r.map((x) => x.kind)).toEqual(['subagent', 'advisor', 'switch-and-return'])
    // subagente: 126 029 × 10 (esc. 1 h opus) / 1e6
    expect(r[0]!.usd.toFixed(4)).toBe('1.2603')
    expect(r[0]!.keepsMainCache).toBe(true)
    // advisor: 508 503 × 10 / 1e6 — el servidor reenvía la conversación entera
    expect(r[1]!.usd.toFixed(4)).toBe('5.0850')
    expect(r[1]!.keepsMainCache).toBe(true)
    // cambiar y volver dentro del TTL: ida 5.0850 + vuelta 0 (sin salida declarada)
    expect(r[2]!.usd.toFixed(4)).toBe('5.0850')
    expect(r[2]!.keepsMainCache).toBe(true)
  })
  test('volver fuera del TTL reescribe todo en el origen y ya no conserva nada', () => {
    const r = routesForOtherModel({ ...req, returnWithinTtl: false }).find((x) => x.kind === 'switch-and-return')!
    // ida 5.0850 + vuelta 508 503 × 20 (esc. 1 h fable-5-1) / 1e6
    expect(r.usd.toFixed(4)).toBe('15.2551')
    expect(r.keepsMainCache).toBe(false)
  })
  test('varios turnos en el destino: el advisor y el cambio releen; el subagente relee su piso', () => {
    const r = routesForOtherModel({ ...req, turnsOnTarget: 3, outputTokens: 1000 })
    const by = Object.fromEntries(r.map((x) => [x.kind, x.usd]))
    // advisor: 5.0850 + 2 × 508 503 × 0.5/1e6 + 3 × 1000 × 25/1e6
    expect(by.advisor!.toFixed(4)).toBe('5.6685')
    expect(by.subagent!).toBeLessThan(by.advisor!)
  })
  test('un modelo sin tier rehúsa', () => {
    expect(() => routesForOtherModel({ ...req, to: 'claude-inexistente' })).toThrow(/sin tier/)
  })
})

describe('canAdvise — «al menos tan capaz», leído sobre advisor_rank', () => {
  test('opus-5 (4) no puede asesorar a fable-5-1 (5); fable-5-1 sí a opus-5', () => {
    expect(canAdvise('claude-opus-5', 'claude-fable-5-1').ok).toBe(false)
    expect(canAdvise('claude-fable-5-1', 'claude-opus-5').ok).toBe(true)
    expect(canAdvise('claude-fable-5-1', 'claude-fable-5-1').ok).toBe(true)
  })
  test('sin rango en el catálogo no se afirma nada', () => {
    const c = canAdvise('claude-3-5-haiku', 'claude-opus-5')
    expect(c.ok).toBe(false)
    expect(c.why).toContain('sin advisor_rank')
  })
})

describe('TTL por origen y alias', () => {
  test('el hilo principal escribe a 1 h y un subagente a 5 m, por la lista de should1hCacheTTL', () => {
    expect(DEFAULT_TTL_BY_SOURCE.repl_main_thread).toBe('1h')
    expect(DEFAULT_TTL_BY_SOURCE['agent:custom']).toBe('5m')
  })
  test('opus-5 lo alcanza el alias opus; mythos-5-1 no lo alcanza ninguno', () => {
    expect(aliasesReaching('claude-opus-5')).toEqual(['opus'])
    expect(aliasesReaching('claude-mythos-5-1')).toEqual([])
  })
})

describe('el hook nombra la vía que conserva la caché', () => {
  test('la razón termina con la alternativa más barata que no toca el hilo', () => {
    const out = decide({
      hook_event_name: 'PreModelSwitch', from_model: 'claude-fable-5-1', to_model: 'claude-opus-5',
      context_tokens: 508_503, prompt_cache_warm: true, cache_ttl: '1h',
    }) as { hookSpecificOutput: Record<string, string> }
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain('Sin perder la caché: subagent en claude-opus-5')
  })
})
