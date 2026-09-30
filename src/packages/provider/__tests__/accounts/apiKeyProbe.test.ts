/**
 * La prueba de una clave de API contra su proveedor: OpenAI y compatibles
 * primero por `/models` (o por el endpoint autenticado que declaren, cuando
 * `/models` es público) y, si eso no decide, por un chat de un token;
 * Anthropic por `/messages`; Google por `/models` con la clave en la URL.
 * Sólo 401/403 declaran la clave inválida y 5xx el proveedor caído; un
 * proveedor sin receta no se da por roto, se declara no soportado.
 *
 * Porte de `testProviderApiKey` en `omniroute: bin/cli/provider-test.mjs` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { resolveProbeModel, testProviderApiKey } from '../../src/accounts/apiKeyProbe.ts'

type Call = { url: string; init: RequestInit }

function fetcher(...statuses: number[]) {
  const calls: Call[] = []
  const fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init })
    return new Response('{}', { status: statuses.shift() ?? 200 })
  }) as unknown as typeof globalThis.fetch
  return { calls, fetch }
}

const header = (call: Call, name: string) => new Headers(call.init.headers).get(name)

describe('probing an api key', () => {
  test('a missing key fails before any request', async () => {
    const f = fetcher()
    expect(await testProviderApiKey({ provider: 'openai', apiKey: '' }, { fetch: f.fetch, env: {} })).toEqual({ valid: false, error: 'Missing API key', statusCode: null })
    expect(f.calls).toEqual([])
  })

  test('a provider without a recipe is unsupported, not broken', async () => {
    const f = fetcher()
    expect(await testProviderApiKey({ provider: 'nope', apiKey: 'k' }, { fetch: f.fetch, env: {} })).toEqual({ valid: false, error: 'Provider test not supported', unsupported: true })
    expect(f.calls).toEqual([])
  })

  test('openai: a 200 on /models with the bearer key is valid and stops there', async () => {
    const f = fetcher(200)
    expect(await testProviderApiKey({ provider: 'openai', apiKey: 'sk-1' }, { fetch: f.fetch, env: {} })).toEqual({ valid: true, error: null, statusCode: 200 })
    expect(f.calls.map(c => [c.init.method, c.url])).toEqual([['GET', 'https://api.openai.com/v1/models']])
    expect(header(f.calls[0]!, 'authorization')).toBe('Bearer sk-1')
  })

  test('openai: 401 and 403 are an invalid key, without a chat', async () => {
    for (const status of [401, 403]) {
      const f = fetcher(status)
      expect(await testProviderApiKey({ provider: 'openai', apiKey: 'sk-1' }, { fetch: f.fetch, env: {} })).toEqual({ valid: false, error: 'Invalid API key', statusCode: status })
      expect(f.calls).toHaveLength(1)
    }
  })

  test('openai: an undecided /models falls back to a one-token chat with the resolved model', async () => {
    const f = fetcher(404, 503)
    expect(await testProviderApiKey({ provider: 'groq', apiKey: 'k', baseUrl: 'https://proxy.test/v1/' }, { fetch: f.fetch, env: {} })).toEqual({ valid: false, error: 'Provider unavailable (503)', statusCode: 503 })
    expect(f.calls.map(c => c.url)).toEqual(['https://proxy.test/v1/models', 'https://proxy.test/v1/chat/completions'])
    expect(JSON.parse(String(f.calls[1]!.init.body))).toEqual({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'test' }], max_tokens: 1 })
  })

  test('a 4xx other than 401/403 on the chat still counts as a working key', async () => {
    const f = fetcher(404, 400)
    expect(await testProviderApiKey({ provider: 'mistral', apiKey: 'k' }, { fetch: f.fetch, env: {} })).toEqual({ valid: true, error: null, statusCode: 400 })
  })

  test('openrouter probes its authenticated key endpoint, not the public catalog', async () => {
    const f = fetcher(401)
    await testProviderApiKey({ provider: 'openrouter', apiKey: 'k' }, { fetch: f.fetch, env: {} })
    expect(f.calls[0]!.url).toBe('https://openrouter.ai/api/v1/auth/key')
  })

  test('anthropic posts a one-token message with its version header', async () => {
    const f = fetcher(200)
    expect((await testProviderApiKey({ provider: 'anthropic', apiKey: 'sk-ant' }, { fetch: f.fetch, env: {} })).valid).toBe(true)
    const call = f.calls[0]!
    expect([call.init.method, call.url]).toEqual(['POST', 'https://api.anthropic.com/v1/messages'])
    expect(header(call, 'x-api-key')).toBe('sk-ant')
    expect(header(call, 'anthropic-version')).toBe('2023-06-01')
    expect(JSON.parse(String(call.init.body)).max_tokens).toBe(1)
  })

  test('google lists models with the key in the query', async () => {
    const f = fetcher(200)
    await testProviderApiKey({ provider: 'google', apiKey: 'g k' }, { fetch: f.fetch, env: {} })
    expect(f.calls[0]!.url).toBe('https://generativelanguage.googleapis.com/v1beta/models?key=g+k')
  })

  test('a network failure is a failed test with its message', async () => {
    const fetch = (async () => {
      throw new Error('connect refused')
    }) as unknown as typeof globalThis.fetch
    expect(await testProviderApiKey({ provider: 'openai', apiKey: 'k' }, { fetch, env: {} })).toEqual({ valid: false, error: 'connect refused', statusCode: null })
  })

  test('a request that outlives the timeout is aborted', async () => {
    const fetch = ((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof globalThis.fetch
    expect(await testProviderApiKey({ provider: 'openai', apiKey: 'k' }, { fetch, env: {}, timeoutMs: 5 })).toEqual({ valid: false, error: 'aborted', statusCode: null })
  })
})

describe('the model a probe uses', () => {
  test('the connection default wins, then the per-provider variable, then the general one, then the recipe', () => {
    const env = { THYROX_PROVIDER_TEST_OPENAI_MODEL: 'per-provider', THYROX_PROVIDER_TEST_MODEL: 'general' }
    expect(resolveProbeModel({ provider: 'openai', defaultModel: 'mine' }, 'recipe', env)).toBe('mine')
    expect(resolveProbeModel({ provider: 'openai' }, 'recipe', env)).toBe('per-provider')
    expect(resolveProbeModel({ provider: 'openai' }, 'recipe', { THYROX_PROVIDER_TEST_MODEL: 'general' })).toBe('general')
    expect(resolveProbeModel({ provider: 'openai' }, 'recipe', {})).toBe('recipe')
  })

  test('the per-provider variable name upper-cases the id and replaces other characters', () => {
    expect(resolveProbeModel({ provider: 'x-ai.v2' }, 'recipe', { THYROX_PROVIDER_TEST_X_AI_V2_MODEL: 'm' })).toBe('m')
  })
})
