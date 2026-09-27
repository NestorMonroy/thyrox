/**
 * El enfriamiento escrito sobre la credencial — porte del camino común de
 * `markAccountUnavailable` y `clearAccountError` de OmniRoute
 * (`src/sse/services/auth.ts`, a58000c7). La decisión la toma
 * `checkFallbackError` (`./proxyAccountCooldown.test.ts`); aquí se mide qué
 * queda escrito en la credencial y que el selector lo respeta.
 */
import { describe, expect, test } from 'bun:test'
import { FillFirstSelector, type ProxyCredential } from '../src/proxy/credentialSelectors.ts'
import type { ProviderTraits } from '../src/proxy/resilience/errorClassifier.ts'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { CredentialCooldown } = (await import(
  process.env.CREDENTIAL_COOLDOWN_MODULE ?? '../src/proxy/resilience/credentialCooldown.ts'
)) as typeof import('../src/proxy/resilience/credentialCooldown.ts')

const TRAITS: Record<string, ProviderTraits> = { codex: { authType: 'oauth' }, openai: { authType: 'apikey' } }
const NOW = new Date('2026-09-27T12:00:00Z')
const at = (ms: number) => new Date(NOW.getTime() + ms)
const cooldown = () => new CredentialCooldown({ traitsOf: p => TRAITS[p] })
const failure = (credential: ProxyCredential, status: number, errorText: string | null, extra: { model?: string; now?: Date; headers?: Headers } = {}) =>
  ({ credential, provider: 'openai', model: extra.model ?? 'gpt-4o', status, errorText, headers: extra.headers ?? null, now: extra.now ?? NOW })

describe('CredentialCooldown.markUnavailable', () => {
  test('un 429 deja la credencial no disponible hasta el fin de su enfriamiento', () => {
    const credential: ProxyCredential = { id: 'a' }
    const decision = cooldown().markUnavailable(failure(credential, 429, 'Rate limit hit'))
    expect(decision.shouldFallback).toBe(true)
    expect(decision.cooldownMs).toBeGreaterThan(0)
    expect(credential.unavailable).toBe(true)
    expect(credential.nextRetryAfter).toEqual(at(decision.cooldownMs))
  })

  test('la pista Retry-After del upstream fija el fin del enfriamiento', () => {
    const credential: ProxyCredential = { id: 'a' }
    cooldown().markUnavailable(failure(credential, 429, 'Rate limit hit', { headers: new Headers({ 'retry-after': '30' }) }))
    const wait = credential.nextRetryAfter!.getTime() - NOW.getTime()
    expect(wait).toBeGreaterThan(29_000)
    expect(wait).toBeLessThanOrEqual(30_000)
  })

  test('un fallo concurrente sobre una credencial ya enfriada no alarga ni sube el retroceso', () => {
    const credential: ProxyCredential = { id: 'a' }
    const layer = cooldown()
    layer.markUnavailable(failure(credential, 502, null))
    const until = credential.nextRetryAfter
    const second = layer.markUnavailable(failure(credential, 502, null, { now: at(1) }))
    expect(credential.nextRetryAfter).toEqual(until)
    expect(second.cooldownMs).toBe(until!.getTime() - at(1).getTime())
    expect(layer.backoffLevelOf('a')).toBe(1)
  })

  test('los fallos repetidos tras cada enfriamiento alargan el siguiente', () => {
    const credential: ProxyCredential = { id: 'a' }
    const layer = cooldown()
    const first = layer.markUnavailable(failure(credential, 502, null))
    const second = layer.markUnavailable(failure(credential, 502, null, { now: at(first.cooldownMs + 1) }))
    expect(second.cooldownMs).toBe(first.cooldownMs * 2)
    expect(layer.backoffLevelOf('a')).toBe(2)
  })

  test('una baja definitiva no la sobrescribe un fallo transitorio posterior', () => {
    const credential: ProxyCredential = { id: 'a' }
    const layer = cooldown()
    layer.markUnavailable(failure(credential, 401, 'account has been deactivated'))
    const until = credential.nextRetryAfter
    expect(until!.getTime() - NOW.getTime()).toBeGreaterThan(300 * 24 * 60 * 60 * 1000)
    const later = at(until!.getTime() - NOW.getTime() + 1)
    layer.markUnavailable(failure(credential, 502, null, { now: later }))
    expect(credential.nextRetryAfter).toEqual(until)
    expect(credential.unavailable).toBe(true)
  })

  test('un 400 de modelo que el proveedor no sirve no toca la credencial ni pasa a otra', () => {
    const credential: ProxyCredential = { id: 'a' }
    const decision = cooldown().markUnavailable(failure(credential, 400, 'The model gpt-9 does not exist'))
    expect(decision).toEqual({ shouldFallback: false, cooldownMs: 0, reason: 'provider_model_unsupported' })
    expect(credential.unavailable).toBeUndefined()
    expect(credential.nextRetryAfter).toBeUndefined()
  })

  test('un modelo retirado bloquea ese modelo y deja la credencial para los demás', () => {
    const credential: ProxyCredential = { id: 'a' }
    const decision = cooldown().markUnavailable(failure(credential, 410, 'The model has reached its end of life and is no longer available.', { model: 'old-model' }))
    expect(credential.unavailable).toBeUndefined()
    expect(credential.modelStates?.['old-model']).toEqual({ unavailable: true, nextRetryAfter: at(decision.cooldownMs) })
  })

  test('un 403 de ruta no pasa a otra credencial ni la enfría', () => {
    const credential: ProxyCredential = { id: 'a' }
    const decision = cooldown().markUnavailable(failure(credential, 403, 'Fire Pass API keys are not authorized for this route.'))
    expect(decision.shouldFallback).toBe(false)
    expect(credential.unavailable).toBeUndefined()
  })

  test('un fallo que pasa a otra credencial sin enfriamiento la deja disponible', () => {
    const credential: ProxyCredential = { id: 'a' }
    const decision = cooldown().markUnavailable(failure(credential, 401, 'bad token'))
    expect(decision).toMatchObject({ shouldFallback: true, cooldownMs: 0 })
    expect(credential.unavailable).toBeUndefined()
    expect(credential.nextRetryAfter).toBeUndefined()
  })

  test('un 429 escribe además la cuota agotada, que el selector lee como enfriamiento', () => {
    const credential: ProxyCredential = { id: 'a' }
    const decision = cooldown().markUnavailable(failure(credential, 429, 'Rate limit hit'))
    expect(credential.quota).toEqual({ exceeded: true, reason: 'quota', nextRecoverAt: at(decision.cooldownMs) })
    expect(() => new FillFirstSelector().pick('openai', 'gpt-4o', [credential], NOW)).toThrow('cooling down')
  })

  test('un 5xx enfría sin cuota: el selector lo da por no disponible, no por enfriado', () => {
    const credential: ProxyCredential = { id: 'a' }
    cooldown().markUnavailable(failure(credential, 503, 'upstream down'))
    expect(credential.unavailable).toBe(true)
    expect(credential.quota).toBeUndefined()
    expect(() => new FillFirstSelector().pick('openai', 'gpt-4o', [credential], NOW)).toThrow('no auth available')
  })
})

describe('CredentialCooldown.clear', () => {
  test('un acierto retira el enfriamiento y vuelve el retroceso a cero', () => {
    const credential: ProxyCredential = { id: 'a' }
    const layer = cooldown()
    const first = layer.markUnavailable(failure(credential, 429, null))
    layer.clear(credential)
    expect(credential.unavailable).toBe(false)
    expect(credential.nextRetryAfter).toBeUndefined()
    expect(credential.quota).toBeUndefined()
    expect(layer.backoffLevelOf('a')).toBe(0)
    const again = layer.markUnavailable(failure(credential, 429, null, { now: at(first.cooldownMs + 1) }))
    expect(again.cooldownMs).toBe(first.cooldownMs)
  })

  test('un acierto no levanta una baja definitiva', () => {
    const credential: ProxyCredential = { id: 'a' }
    const layer = cooldown()
    layer.markUnavailable(failure(credential, 401, 'account has been deactivated'))
    layer.clear(credential)
    expect(credential.unavailable).toBe(true)
  })
})

test('el selector salta la credencial enfriada y vuelve a ella al vencer', () => {
  const a: ProxyCredential = { id: 'a' }
  const b: ProxyCredential = { id: 'b' }
  const selector = new FillFirstSelector()
  const decision = cooldown().markUnavailable(failure(a, 429, 'Rate limit hit'))
  expect(selector.pick('openai', 'gpt-4o', [a, b], NOW).id).toBe('b')
  expect(selector.pick('openai', 'gpt-4o', [a, b], at(decision.cooldownMs + 1)).id).toBe('a')
})
