/**
 * Lo que el orquestador de refresco decide antes y alrededor de cada
 * proveedor: cuánto antes de caducar se refresca, qué proveedores retirados
 * no se refrescan y a dónde migran, el refresco genérico contra el extremo
 * de tokens de un proveedor sin ruta propia, el guardado que viaja con la
 * llamada y la forma de las credenciales que cada proveedor consume.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { deprecatedRefreshOutcome, deprecationNotice, isDeprecatedProvider } from '../../../src/accounts/refresh/deprecatedProviders.ts'
import { refreshWithTokenEndpoint } from '../../../src/accounts/refresh/genericRefresh.ts'
import { activePersist, runWithPersist } from '../../../src/accounts/refresh/persistContext.ts'
import { formatProviderCredentials } from '../../../src/accounts/refresh/providerCredentials.ts'
import { REFRESH_LEAD_MS, refreshLeadMs, TOKEN_EXPIRY_BUFFER_MS } from '../../../src/accounts/refresh/refreshLead.ts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const text = (body: string, status: number) => new Response(body, { status })

function scriptedFetch(answer: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input), init)
  }
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls }
}

const form = (init: RequestInit) => Object.fromEntries(new URLSearchParams(String(init.body)))

describe('refresh lead', () => {
  test('rotating providers refresh five minutes ahead; Google families fifteen', () => {
    expect(TOKEN_EXPIRY_BUFFER_MS).toBe(300_000)
    for (const provider of ['codex', 'openai', 'claude', 'gitlab-duo', 'kiro', 'kimi-coding']) expect(refreshLeadMs(provider)).toBe(300_000)
    for (const provider of ['antigravity', 'agy']) expect(refreshLeadMs(provider)).toBe(900_000)
    expect(Object.keys(REFRESH_LEAD_MS).sort()).toEqual(['agy', 'antigravity', 'claude', 'codex', 'gitlab-duo', 'kimi-coding', 'kiro', 'openai'])
  })

  test('an unlisted provider gets the default buffer', () => {
    expect(refreshLeadMs('qoder')).toBe(TOKEN_EXPIRY_BUFFER_MS)
    expect(refreshLeadMs('qoder', null)).toBe(TOKEN_EXPIRY_BUFFER_MS)
  })

  test('a positive finite per-connection override wins; anything else is ignored', () => {
    expect(refreshLeadMs('antigravity', { refreshLeadMs: 42_000 })).toBe(42_000)
    for (const bad of [0, -5, Number.POSITIVE_INFINITY, Number.NaN, '60000', null]) expect(refreshLeadMs('antigravity', { refreshLeadMs: bad })).toBe(900_000)
  })
})

describe('deprecated providers', () => {
  test('gemini-cli is deprecated and migrates to gemini', () => {
    expect(isDeprecatedProvider('gemini-cli')).toBe(true)
    expect(deprecationNotice('gemini-cli')).toMatchObject({ migrateTo: 'gemini' })
    expect(deprecationNotice('gemini-cli')?.reason).toContain('`gemini` provider')
  })

  test('other ids, empty ids and inherited keys are not deprecated', () => {
    for (const provider of ['gemini', '', 'toString', 'constructor']) {
      expect(isDeprecatedProvider(provider)).toBe(false)
      expect(deprecationNotice(provider)).toBeNull()
    }
  })

  test('a deprecated provider refreshes to a terminal outcome that names where to go', () => {
    const warnings: string[] = []
    expect(deprecatedRefreshOutcome('gemini-cli', { warn: (_tag, message) => void warnings.push(message) })).toEqual({ error: 'unrecoverable_refresh_error', code: 'provider_deprecated', migrateTo: 'gemini', reason: deprecationNotice('gemini-cli')!.reason })
    expect(warnings).toEqual(['gemini-cli is deprecated — not refreshing; migrate this account to gemini'])
    expect(deprecatedRefreshOutcome('gemini')).toBeNull()
  })
})

describe('generic refresh against a token endpoint', () => {
  const endpoint = { tokenUrl: 'https://auth.example/token', clientId: 'cid', clientSecret: 'sec' }

  test('posts the refresh grant with the declared client and keeps the refresh token when none rotates', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'at', expires_in: 3600 }))
    expect(await refreshWithTokenEndpoint('acme', 'rt', endpoint, { fetch })).toEqual({ accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 })
    expect(calls[0].url).toBe('https://auth.example/token')
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: 'rt', client_id: 'cid', client_secret: 'sec' })
    expect(calls[0].init.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' })
  })

  test('a refresh URL wins over the token URL; client fields are sent only when declared', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'at', refresh_token: 'rt2' }))
    expect(await refreshWithTokenEndpoint('acme', 'rt', { refreshUrl: 'https://auth.example/refresh', tokenUrl: 'https://auth.example/token' }, { fetch })).toEqual({ accessToken: 'at', refreshToken: 'rt2', expiresIn: undefined })
    expect(calls[0].url).toBe('https://auth.example/refresh')
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: 'rt' })
  })

  test('without an endpoint or a refresh token nothing is sent', async () => {
    const warnings: string[] = []
    const log = { warn: (_tag: string, message: string) => void warnings.push(message) }
    const { fetch, calls } = scriptedFetch(() => json({}))
    expect(await refreshWithTokenEndpoint('acme', 'rt', null, { fetch, log })).toBeNull()
    expect(await refreshWithTokenEndpoint('acme', 'rt', {}, { fetch, log })).toBeNull()
    expect(await refreshWithTokenEndpoint('acme', '', endpoint, { fetch, log })).toBeNull()
    expect(calls).toHaveLength(0)
    expect(warnings).toEqual(['No refresh endpoint configured for provider: acme', 'No refresh endpoint configured for provider: acme', 'No refresh token available for provider: acme'])
  })

  test('invalid_grant and invalid_request are dead; any other failure is transient', async () => {
    for (const code of ['invalid_grant', 'invalid_request']) expect(await refreshWithTokenEndpoint('acme', 'rt', endpoint, { fetch: scriptedFetch(() => text(JSON.stringify({ error: code }), 400)).fetch })).toEqual({ error: 'unrecoverable_refresh_error', code })
    expect(await refreshWithTokenEndpoint('acme', 'rt', endpoint, { fetch: scriptedFetch(() => text(JSON.stringify({ error: 'unauthorized_client' }), 400)).fetch })).toBeNull()
    expect(await refreshWithTokenEndpoint('acme', 'rt', endpoint, { fetch: scriptedFetch(() => text('busy', 503)).fetch })).toBeNull()
  })

  test('a network failure is transient and logged', async () => {
    const errors: string[] = []
    const offline = (async () => {
      throw new Error('reset')
    }) as unknown as typeof globalThis.fetch
    expect(await refreshWithTokenEndpoint('acme', 'rt', endpoint, { fetch: offline, log: { error: (_tag, message) => void errors.push(message) } })).toBeNull()
    expect(errors).toEqual(['Error refreshing token for acme'])
  })
})

describe('persist context', () => {
  test('the persist callback travels with the call and is gone outside it', async () => {
    const persist = async () => {}
    expect(activePersist()).toBeUndefined()
    expect(await runWithPersist(persist, async () => activePersist())).toBe(persist)
    expect(activePersist()).toBeUndefined()
  })

  test('without a callback the function runs as is', async () => {
    expect(await runWithPersist(null, async () => activePersist() ?? 'none')).toBe('none')
  })
})

describe('provider credentials', () => {
  const credentials = { apiKey: 'k', accessToken: 'a', refreshToken: 'r', projectId: 'p' }
  const known = (provider: string) => provider !== 'mystery'

  test('each provider receives only the fields its requests use', () => {
    expect(formatProviderCredentials('gemini', credentials, known)).toEqual({ apiKey: 'k', accessToken: 'a', projectId: 'p' })
    for (const provider of ['claude', 'codex', 'qoder', 'openai', 'openrouter']) expect(formatProviderCredentials(provider, credentials, known)).toEqual({ apiKey: 'k', accessToken: 'a' })
    for (const provider of ['antigravity', 'agy']) expect(formatProviderCredentials(provider, credentials, known)).toEqual({ accessToken: 'a', refreshToken: 'r' })
    expect(formatProviderCredentials('kiro', credentials, known)).toEqual({ apiKey: 'k', accessToken: 'a', refreshToken: 'r' })
  })

  test('an unknown provider has no credentials and says so', () => {
    const warnings: string[] = []
    expect(formatProviderCredentials('mystery', credentials, known, { warn: (_tag, message) => void warnings.push(message) })).toBeNull()
    expect(warnings).toEqual(['No configuration found for provider: mystery'])
  })
})
