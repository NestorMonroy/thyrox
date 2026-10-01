/**
 * El token LLM de Zed: la credencial de usuario se cambia en
 * `/client/llm_tokens` por un token de modelo que dura menos de una hora; se
 * guarda cincuenta minutos y se pide de nuevo cuando el servidor lo da por
 * caducado. Con él se lee el catálogo vivo de modelos, que se guarda una hora.
 *
 * Porte de la mitad LLM de `omniroute: open-sse/shared/zedAuth.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createZedLlmClient, mapZedModel, shouldRefreshZedLlmToken, ZED_HEADERS } from '../../../src/accounts/zed/zedLlm.ts'

type Call = { url: string; method?: string; headers: Record<string, string>; body?: string }

function setup(answer: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = []
  let clock = 0
  const client = createZedLlmClient({
    fetch: (async (input: string | URL | Request, init: RequestInit = {}) => {
      const call = { url: String(input), method: init.method, headers: (init.headers ?? {}) as Record<string, string>, body: init.body as string | undefined }
      calls.push(call)
      return answer(call)
    }) as unknown as typeof globalThis.fetch,
    now: () => clock,
  })
  return { client, calls, advance: (ms: number) => void (clock += ms) }
}

const credentials = (overrides: Record<string, unknown> = {}) => ({ accessToken: 'user-token-0123456789abcdef', providerSpecificData: { userId: 'u1', systemId: 'sys', organizationId: 'org1' }, ...overrides })
const json = (value: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(value), { status, headers })

describe('the Zed LLM token', () => {
  test('is exchanged for the selected organization and kept fifty minutes', async () => {
    const { client, calls, advance } = setup(() => json({ token: 'llm1' }))
    expect(await client.fetchLlmToken(credentials())).toBe('llm1')
    expect(calls[0]).toEqual({ url: 'https://cloud.zed.dev/client/llm_tokens', method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'u1 user-token-0123456789abcdef', 'x-zed-system-id': 'sys' }, body: JSON.stringify({ organization_id: 'org1' }) })
    advance(50 * 60 * 1000 - 1)
    await client.fetchLlmToken(credentials())
    expect(calls).toHaveLength(1)
    advance(1)
    await client.fetchLlmToken(credentials())
    expect(calls).toHaveLength(2)
  })

  test('a forced refresh skips the cache, and another token or organization is another entry', async () => {
    const { client, calls } = setup(() => json({ token: 'llm1' }))
    await client.fetchLlmToken(credentials())
    await client.fetchLlmToken(credentials(), { forceRefresh: true })
    await client.fetchLlmToken(credentials({ accessToken: 'other-token-fedcba9876543210' }))
    await client.fetchLlmToken(credentials(), { organizationId: 'org2' })
    expect(calls).toHaveLength(4)
    expect(calls[3]!.body).toBe(JSON.stringify({ organization_id: 'org2' }))
  })

  test('the token may come as an array or an object, and its absence is an error', async () => {
    expect(await setup(() => json({ token: ['a1'] })).client.fetchLlmToken(credentials())).toBe('a1')
    expect(await setup(() => json({ token: { value: 'v1' } })).client.fetchLlmToken(credentials())).toBe('v1')
    await expect(setup(() => json({})).client.fetchLlmToken(credentials())).rejects.toThrow('Zed did not return an LLM token')
  })

  test('without a declared organization it asks the user, and without any it fails', async () => {
    const { client, calls } = setup(call => (call.url.endsWith('/users/me') ? json({ organizations: [{ id: 'o-team' }, { id: 'o-personal', is_personal: true }] }) : json({ token: 'llm1' })))
    await client.fetchLlmToken(credentials({ providerSpecificData: { userId: 'u1' } }))
    expect(calls.map(call => call.url)).toEqual(['https://cloud.zed.dev/client/users/me', 'https://cloud.zed.dev/client/llm_tokens'])
    expect(calls[1]!.body).toBe(JSON.stringify({ organization_id: 'o-personal' }))
    const none = setup(() => json({ organizations: [] }))
    await expect(none.client.fetchLlmToken(credentials({ providerSpecificData: { userId: 'u1' } }))).rejects.toThrow('No Zed organization selected')
  })

  test('an HTTP error carries the server message and status', async () => {
    const { client } = setup(() => json({ error: { message: 'quota' } }, 429))
    const error = (await client.fetchLlmToken(credentials()).then(() => null, (caught: unknown) => caught)) as Error & { status?: number }
    expect(error.message).toBe('quota')
    expect(error.status).toBe(429)
  })

  test('the cloud base URL is configurable', async () => {
    const { client, calls } = setup(() => json({ token: 'llm1' }))
    await client.fetchLlmToken(credentials(), { config: { cloudBaseUrl: 'https://zed.test/' } })
    expect(calls[0]!.url).toBe('https://zed.test/client/llm_tokens')
  })
})

describe('when to renew the LLM token', () => {
  test('on a 401 or an expired or outdated header', () => {
    expect(shouldRefreshZedLlmToken(new Response('', { status: 401 }))).toBe(true)
    expect(shouldRefreshZedLlmToken(new Response('', { headers: { [ZED_HEADERS.expiredToken]: '1' } }))).toBe(true)
    expect(shouldRefreshZedLlmToken(new Response('', { headers: { [ZED_HEADERS.outdatedToken]: '1' } }))).toBe(true)
    expect(shouldRefreshZedLlmToken(new Response('', { status: 403 }))).toBe(false)
    expect(shouldRefreshZedLlmToken(null)).toBe(false)
  })
})

describe('a request with the LLM token', () => {
  test('carries it as bearer, and is retried once with a fresh token when rejected', async () => {
    let llm = 0
    const { client, calls } = setup(call => {
      if (call.url.endsWith('/llm_tokens')) return json({ token: `llm${++llm}` })
      return call.headers.Authorization === 'Bearer llm1' ? new Response('', { status: 401 }) : new Response('ok')
    })
    const response = await client.llmFetch(credentials(), '/completions', { fetchOptions: { method: 'POST', headers: { 'X-Extra': '1' } } })
    expect(await response.text()).toBe('ok')
    const completions = calls.filter(call => call.url === 'https://cloud.zed.dev/completions')
    expect(completions.map(call => call.headers)).toEqual([{ 'X-Extra': '1', Authorization: 'Bearer llm1' }, { 'X-Extra': '1', Authorization: 'Bearer llm2' }])
    expect(completions[0]!.method).toBe('POST')
  })

  test('the LLM base URL is configurable', async () => {
    const { client, calls } = setup(call => (call.url.endsWith('/llm_tokens') ? json({ token: 'llm1' }) : new Response('ok')))
    await client.llmFetch(credentials(), '/x', { config: { llmBaseUrl: 'https://llm.test' } })
    expect(calls[1]!.url).toBe('https://llm.test/x')
  })
})

describe('the Zed model catalog', () => {
  const catalog = {
    models: [
      { id: 'm1', display_name: 'Model One', provider: 'anthropic', is_latest: true, max_token_count: 200000, max_output_tokens: 8000, supports_tools: true, supported_effort_levels: ['low'] },
      { id: ['m2', 'alias'], displayName: 'Two', maxTokenCount: 1000, is_disabled: true, disabled_reason: 'gone' },
      { id: { id: 'm3' } },
      { id: '' },
    ],
    default_model: 'm1',
    defaultFastModel: ['m3'],
    recommended_models: ['m1', '', { id: 'm3' }],
  }

  test('a raw model is mapped with both spellings of each field', () => {
    expect(mapZedModel(catalog.models[0]!)).toEqual({ id: 'm1', name: 'Model One', provider: 'anthropic', isLatest: true, contextLength: 200000, contextLengthInMaxMode: undefined, maxOutputTokens: 8000, supportsTools: true, supportsImages: false, supportsThinking: false, supportsDisablingThinking: false, supportsFastMode: false, supportsServerSideCompaction: false, supportedEffortLevels: ['low'], supportsStreamingTools: false, supportsParallelToolCalls: false, isDisabled: false, disabledReason: null })
    expect(mapZedModel(catalog.models[1]!)).toMatchObject({ id: 'm2', name: 'Two', contextLength: 1000, isDisabled: true, disabledReason: 'gone', supportedEffortLevels: [] })
    expect(mapZedModel({ id: 'bare' })!.name).toBe('bare')
    expect(mapZedModel({ id: '' })).toBeNull()
  })

  test('is fetched live, without disabled models, and kept an hour', async () => {
    const { client, calls, advance } = setup(call => (call.url.endsWith('/llm_tokens') ? json({ token: 'llm1' }) : json(catalog)))
    const resolved = (await client.resolveModels(credentials()))!
    expect(resolved.models.map(model => model.id)).toEqual(['m1', 'm3'])
    expect(resolved.rawModels).toHaveLength(4)
    expect([...resolved.rawById.keys()]).toEqual(['m1', 'm2', 'm3'])
    expect(resolved.defaultModel).toBe('m1')
    expect(resolved.defaultFastModel).toBe('m3')
    expect(resolved.recommendedModels).toEqual(['m1', 'm3'])
    expect(resolved.expiresAt).toBe(60 * 60 * 1000)
    const modelsCall = calls.find(call => call.url.endsWith('/models'))!
    expect(modelsCall.method).toBe('GET')
    expect(modelsCall.headers[ZED_HEADERS.clientSupportsXai]).toBe('true')
    advance(60 * 60 * 1000 - 1)
    await client.resolveModels(credentials())
    expect(calls.filter(call => call.url.endsWith('/models'))).toHaveLength(1)
    advance(1)
    await client.resolveModels(credentials())
    expect(calls.filter(call => call.url.endsWith('/models'))).toHaveLength(2)
  })

  test('concurrent reads share one request, and a forced one does not', async () => {
    const { client, calls } = setup(call => (call.url.endsWith('/llm_tokens') ? json({ token: 'llm1' }) : json(catalog)))
    const [a, b] = await Promise.all([client.resolveModels(credentials()), client.resolveModels(credentials())])
    expect(a).toBe(b)
    await client.resolveModels(credentials(), { forceRefresh: true })
    expect(calls.filter(call => call.url.endsWith('/models'))).toHaveLength(2)
    await Promise.all([client.resolveModels(credentials({ accessToken: 'third-token-000000000000' })), client.resolveModels(credentials({ accessToken: 'third-token-000000000000' }), { forceRefresh: true })])
    expect(calls.filter(call => call.url.endsWith('/models'))).toHaveLength(4)
  })

  test('without an access token there is none, and a failed request is an error', async () => {
    const { client, calls } = setup(() => json({}))
    expect(await client.resolveModels(credentials({ accessToken: undefined }))).toBeNull()
    expect(calls).toEqual([])
    const failing = setup(call => (call.url.endsWith('/llm_tokens') ? json({ token: 'llm1' }) : new Response('down', { status: 503 })))
    await expect(failing.client.resolveModels(credentials())).rejects.toThrow('Zed models failed: 503 down')
  })

  test('clearing the caches asks again', async () => {
    const { client, calls } = setup(call => (call.url.endsWith('/llm_tokens') ? json({ token: 'llm1' }) : json(catalog)))
    await client.resolveModels(credentials())
    client.clearCaches()
    await client.resolveModels(credentials())
    expect(calls.filter(call => call.url.endsWith('/llm_tokens'))).toHaveLength(2)
    expect(calls.filter(call => call.url.endsWith('/models'))).toHaveLength(2)
  })
})
