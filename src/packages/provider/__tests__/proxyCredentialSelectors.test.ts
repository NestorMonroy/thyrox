/**
 * Selectores de credenciales — porte de CLIProxyAPI
 * `sdk/cliproxy/auth/selector.go`. Cada caso reproduce uno de
 * `selector_test.go` con su secuencia esperada; el nombre del caso de origen
 * va en el título.
 */
import { describe, expect, test } from 'bun:test'
import {
  authWeight,
  canonicalModelKey,
  FillFirstSelector,
  goDurationString,
  isAuthBlockedForModel,
  ModelCooldownError,
  RoundRobinSelector,
  successorIndex,
  WeightedRoundRobinSelector,
  type ProxyCredential,
} from '../src/proxy/credentialSelectors.ts'

const pickIds = (sel: { pick(p: string, m: string, c: ProxyCredential[]): ProxyCredential }, n: number, model: string, creds: ProxyCredential[]) =>
  Array.from({ length: n }, () => sel.pick('gemini', model, creds).id)
const count = (xs: string[]) => xs.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x]: (acc[x] ?? 0) + 1 }), {})

describe('fill-first y round-robin', () => {
  test('FillFirstSelectorPick_Deterministic: el primero por id', () => {
    expect(new FillFirstSelector().pick('gemini', '', [{ id: 'b' }, { id: 'a' }, { id: 'c' }]).id).toBe('a')
  })

  test('RoundRobinSelectorPick_CyclesDeterministic', () => {
    expect(pickIds(new RoundRobinSelector(), 5, '', [{ id: 'b' }, { id: 'a' }, { id: 'c' }])).toEqual(['a', 'b', 'c', 'a', 'b'])
  })

  test('RoundRobinSelectorPick_PriorityBuckets: sólo el nivel más alto', () => {
    const creds = [
      { id: 'c', attributes: { priority: '0' } },
      { id: 'a', attributes: { priority: '10' } },
      { id: 'b', attributes: { priority: '10' } },
    ]
    const sel = new RoundRobinSelector()
    expect(Array.from({ length: 4 }, () => sel.pick('mixed', '', creds).id)).toEqual(['a', 'b', 'a', 'b'])
  })

  test('RoundRobinSelectorPick_ResumesRotationAcrossRetryExclusions', () => {
    const all = ['aaa', 'bbb', 'ccc', 'ddd', 'eee'].map(id => ({ id }))
    const sel = new RoundRobinSelector()
    const first: string[] = []
    const every: string[] = []
    for (let request = 0; request < 50; request++) {
      const tried = new Set<string>()
      for (let attempt = 0; attempt < 3; attempt++) {
        const got = sel.pick('gemini', 'model', all.filter(c => !tried.has(c.id))).id
        if (attempt === 0) first.push(got)
        every.push(got)
        tried.add(got)
      }
    }
    for (const c of all) {
      expect(count(first)[c.id]).toBe(10)
      expect(count(every)[c.id]).toBe(30)
    }
  })

  test('SuccessorIndex_WrapsAndSkipsFilteredCandidates', () => {
    const available = [{ id: 'aaa' }, { id: 'ccc' }, { id: 'eee' }]
    expect(['', 'aaa', 'bbb', 'eee', 'zzz'].map(last => successorIndex(available, last))).toEqual([0, 1, 1, 0, 0])
  })

  test('RoundRobinSelectorPick_CursorKeyCap: al tope se vacía el mapa de cursores', () => {
    const sel = new RoundRobinSelector(2)
    sel.pick('gemini', 'm1', [{ id: 'a' }])
    sel.pick('gemini', 'm2', [{ id: 'a' }])
    sel.pick('gemini', 'm3', [{ id: 'a' }])
    expect(sel.cursorCount()).toBe(1)
  })

  test('ThinkingSuffixSharesCursor: el sufijo de razonamiento comparte el cursor del modelo', () => {
    const sel = new RoundRobinSelector()
    const creds = [{ id: 'a' }, { id: 'b' }]
    expect([sel.pick('p', 'm(8192)', creds).id, sel.pick('p', 'm', creds).id]).toEqual(['a', 'b'])
    expect(canonicalModelKey(' m(high) ')).toBe('m')
  })
})

describe('ponderado suave', () => {
  test('DistributesAndSkipsNonPositiveWeights: 5:3:2 sobre 100, y el peso 0 fuera', () => {
    const creds = [
      { id: 'a', attributes: { weight: '5' } },
      { id: 'b', attributes: { weight: '3' } },
      { id: 'c', attributes: { weight: '2' } },
      { id: 'disabled-by-weight', attributes: { weight: '0' } },
    ]
    expect(count(pickIds(new WeightedRoundRobinSelector(), 100, 'model', creds))).toEqual({ a: 50, b: 30, c: 20 })
  })

  test('ResetsCreditsWhenWeightsChange', () => {
    const a = { id: 'a', attributes: { weight: '1000000' } }
    const b = { id: 'b', attributes: { weight: '1' } }
    const sel = new WeightedRoundRobinSelector()
    pickIds(sel, 1000, 'model', [a, b])
    a.attributes.weight = '1'
    expect(count(pickIds(sel, 20, 'model', [a, b]))).toEqual({ a: 10, b: 10 })
  })

  test('RebalancesWhenHighestWeightUnavailable', () => {
    const creds = [
      { id: 'a', disabled: true, attributes: { weight: '5' } },
      { id: 'b', attributes: { weight: '3' } },
      { id: 'c', attributes: { weight: '2' } },
    ]
    expect(count(pickIds(new WeightedRoundRobinSelector(), 100, 'model', creds))).toEqual({ b: 60, c: 40 })
  })

  test('KeepsWeightRatiosWhenCandidatesAreExcluded: 3:1 entre los que quedan', () => {
    const a = { id: 'auth-a', attributes: { weight: '5' } }
    const b = { id: 'auth-b', attributes: { weight: '3' } }
    const c = { id: 'auth-c', attributes: { weight: '1' } }
    const sel = new WeightedRoundRobinSelector()
    pickIds(sel, 9, 'model', [a, b, c])
    expect(count(pickIds(sel, 400, 'model', [b, c]))).toEqual({ 'auth-b': 300, 'auth-c': 100 })
  })

  test('DefaultWeightIsOne y valores inválidos o desbordados excluyen', () => {
    expect([authWeight({ id: 'x' }), authWeight({ id: 'x', attributes: { weight: ' ' } }), authWeight({ id: 'x', attributes: { weight: 'abc' } }), authWeight({ id: 'x', attributes: { weight: '1000001' } }), authWeight({ id: 'x', attributes: { weight: '-3' } })])
      .toEqual([1, 1, 0, 0, 0])
  })
})

describe('bloqueo y enfriamiento', () => {
  const now = new Date('2026-09-27T12:00:00Z')
  const later = new Date(now.getTime() + 30 * 60_000)

  test('PriorityFallbackCooldown: el nivel alto enfriando cae al bajo', () => {
    const high = { id: 'high', attributes: { priority: '10' }, modelStates: { m: { unavailable: true, nextRetryAfter: later, quota: { exceeded: true } } } }
    expect(new FillFirstSelector().pick('mixed', 'm', [high, { id: 'low', attributes: { priority: '0' } }], now).id).toBe('low')
  })

  test('UnavailableWithoutNextRetryIsBlocked y ExpiredRecoveryIsAvailable', () => {
    expect(isAuthBlockedForModel({ id: 'a', unavailable: true }, '', now).blocked).toBe(true)
    const past = new Date(now.getTime() - 1000)
    expect(isAuthBlockedForModel({ id: 'a', unavailable: true, nextRetryAfter: past }, '', now).blocked).toBe(false)
  })

  test('AuthQuotaExceededWithoutRecoveryIsBlocked', () => {
    expect(isAuthBlockedForModel({ id: 'a', quota: { exceeded: true } }, '', now).blocked).toBe(true)
  })

  test('ThinkingSuffixStatesBlockCanonicalModel', () => {
    const cred = { id: 'a', modelStates: { 'm(high)': { unavailable: true, nextRetryAfter: later, quota: { exceeded: true } } } }
    expect(isAuthBlockedForModel(cred, 'm', now)).toEqual({ blocked: true, reason: 'cooldown', next: later })
  })

  test('AllCooldownReturnsModelCooldownError: 429, Retry-After y el proveedor sólo si no es mixed', () => {
    const next = new Date(now.getTime() + 60_000)
    const cooling = (id: string) => ({ id, modelStates: { m: { unavailable: true, nextRetryAfter: next, quota: { exceeded: true, nextRecoverAt: next } } } })
    const creds = [cooling('a'), cooling('b')]
    const mixed = (() => { try { new FillFirstSelector().pick('mixed', 'm', creds, now) } catch (e) { return e } })()
    expect(mixed).toBeInstanceOf(ModelCooldownError)
    const err = mixed as ModelCooldownError
    expect(err.statusCode).toBe(429)
    expect(err.headers()['Retry-After']).toBe('60')
    const body = JSON.parse(err.message).error
    expect(body).toEqual({ code: 'model_cooldown', message: 'All credentials for model m are cooling down', model: 'm', reset_time: '1m0s', reset_seconds: 60 })
    const gemini = (() => { try { new FillFirstSelector().pick('gemini', 'm', creds, now) } catch (e) { return e } })() as ModelCooldownError
    expect(JSON.parse(gemini.message).error.provider).toBe('gemini')
  })

  test('sin candidatos: auth_not_found; bloqueadas sin enfriar: auth_unavailable', () => {
    expect(() => new FillFirstSelector().pick('p', '', [])).toThrow('no auth candidates')
    expect(() => new FillFirstSelector().pick('p', '', [{ id: 'a', disabled: true }])).toThrow('no auth available')
  })

  test('goDurationString reproduce time.Duration.String de Go', () => {
    expect([0, 5, 60, 61, 3600, 3661].map(s => goDurationString(s))).toEqual(['0s', '5s', '1m0s', '1m1s', '1h0m0s', '1h1m1s'])
  })
})
