/**
 * Cuando todas las credenciales de un modelo están en enfriamiento, el error
 * dice por qué: el último error del upstream, resumido y saneado — el
 * `newModelCooldownErrorWithCause` de CLIProxyAPI (`sdk/cliproxy/auth/
 * selector.go`), con la causa elegida como en `scheduler.go` (la más
 * reciente; a igual instante, la de id mayor), y el 429 con `Retry-After`
 * que devuelven sus manejadores.
 */
import { describe, expect, test } from 'bun:test'
import { AccessManager, createConfigApiKeyProvider } from '../src/proxy/access.ts'
import { FillFirstSelector, type ProxyCredential } from '../src/proxy/credentialSelectors.ts'
// Rutas sustituibles para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { createProxyHandler } = (await import(process.env.PROXY_SERVER_MODULE ?? '../src/proxy/server.ts')) as typeof import('../src/proxy/server.ts')
const { ModelCooldownError } = (await import(
  process.env.CREDENTIAL_SELECTORS_MODULE ?? '../src/proxy/credentialSelectors.ts'
)) as typeof import('../src/proxy/credentialSelectors.ts')
const { CredentialCooldown } = (await import(
  process.env.CREDENTIAL_COOLDOWN_MODULE ?? '../src/proxy/resilience/credentialCooldown.ts'
)) as typeof import('../src/proxy/resilience/credentialCooldown.ts')
type ModelCooldownError = InstanceType<typeof ModelCooldownError>

const NOW = new Date('2026-09-27T12:00:00Z')
const body = (err: ModelCooldownError) => (JSON.parse(err.message) as { error: Record<string, unknown> }).error

describe('ModelCooldownError con causa', () => {
  test('la causa resumida va en last_upstream_error y al final del mensaje', () => {
    const err = new ModelCooldownError('m', 'openai', 60_000, '{"error":{"code":"rate_limit","message":"slow down"}}')
    expect(body(err)).toMatchObject({
      last_upstream_error: 'rate_limit: slow down',
      message: 'All credentials for model m are cooling down via provider openai (last error: rate_limit: slow down)',
    })
  })

  test('la causa se sanea: una clave no sale en el error', () => {
    const err = new ModelCooldownError('m', '', 1000, 'invalid api key sk-abcdef123456 for this request')
    expect(err.message).not.toContain('abcdef123456')
  })

  test('sin causa, o con una causa vacía, el error no cambia', () => {
    for (const cause of [undefined, '   ']) {
      const err = new ModelCooldownError('m', '', 1000, cause)
      expect(body(err)).not.toHaveProperty('last_upstream_error')
      expect(body(err).message).toBe('All credentials for model m are cooling down')
    }
  })
})

describe('CredentialCooldown.latestError', () => {
  const failure = (credential: ProxyCredential, errorText: string | null, now: Date, status = 429) =>
    ({ credential, provider: 'openai', model: 'm', status, errorText, headers: null, now })

  test('guarda el último error de cada credencial y da el más reciente del grupo', () => {
    const layer = new CredentialCooldown()
    const a: ProxyCredential = { id: 'a' }
    const b: ProxyCredential = { id: 'b' }
    layer.markUnavailable(failure(a, 'Rate limit hit on a', NOW))
    layer.markUnavailable(failure(b, 'Rate limit hit on b', new Date(NOW.getTime() + 5)))
    expect(layer.latestError([a, b])).toBe('Rate limit hit on b')
  })

  test('a igual instante gana el id mayor', () => {
    const layer = new CredentialCooldown()
    const a: ProxyCredential = { id: 'a' }
    const b: ProxyCredential = { id: 'b' }
    layer.markUnavailable(failure(b, 'from b', NOW))
    layer.markUnavailable(failure(a, 'from a', NOW))
    expect(layer.latestError([a, b])).toBe('from b')
  })

  test('sin cuerpo, el error es el estado', () => {
    const layer = new CredentialCooldown()
    const a: ProxyCredential = { id: 'a' }
    layer.markUnavailable(failure(a, null, NOW, 503))
    expect(layer.latestError([a])).toBe('HTTP 503')
  })

  test('un acierto borra el error de la credencial', () => {
    const layer = new CredentialCooldown()
    const a: ProxyCredential = { id: 'a' }
    layer.markUnavailable(failure(a, 'Rate limit hit', NOW))
    layer.clear(a)
    expect(layer.latestError([a])).toBeUndefined()
  })
})

test('con todas las credenciales en enfriamiento, el cliente recibe 429, Retry-After y la causa', async () => {
  const KEY = 'sk-local-test'
  const credential: ProxyCredential = { id: 'a1' }
  const cooldown = new CredentialCooldown()
  cooldown.markUnavailable({ credential, provider: 'openai', model: 'mx-a', status: 429, errorText: 'Rate limit hit', headers: new Headers({ 'retry-after': '30' }) })
  const handler = createProxyHandler({
    access: new AccessManager([createConfigApiKeyProvider([KEY])!]),
    routing: { upstreams: [{ name: 'a', provider: 'openai' }], models: [{ id: 'mx', upstream_model: { a: 'mx-a' } }], auto_include_builtin_models: false },
    credentials: { a: [credential] },
    selector: new FillFirstSelector(),
    forward: async () => new Response('{}'),
    cooldown,
  })
  const response = await handler(new Request('http://127.0.0.1/v1/messages', {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'mx', messages: [] }),
  }))
  expect(response.status).toBe(429)
  expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
  const error = ((await response.json()) as { error: Record<string, unknown> }).error
  expect(error).toMatchObject({ code: 'model_cooldown', last_upstream_error: 'Rate limit hit' })
})
