import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { preconnectAnthropicApi, resetPreconnectStateForTests } from '../apiPreconnect.js'

const ENV_KEYS = [
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
  'HTTPS_PROXY',
  'https_proxy',
  'HTTP_PROXY',
  'http_proxy',
  'ANTHROPIC_UNIX_SOCKET',
  'CLAUDE_CODE_CLIENT_CERT',
  'CLAUDE_CODE_CLIENT_KEY',
  'ANTHROPIC_BASE_URL',
] as const

let snapshot: Record<string, string | undefined>
let fetchOriginal: typeof fetch

beforeEach(() => {
  snapshot = {}
  for (const k of ENV_KEYS) {
    snapshot[k] = process.env[k]
    delete process.env[k]
  }
  fetchOriginal = globalThis.fetch
  resetPreconnectStateForTests()
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k]
    else process.env[k] = snapshot[k]
  }
  globalThis.fetch = fetchOriginal
})

describe('preconnectAnthropicApi', () => {
  test('sin proveedor cloud ni proxy: dispara un HEAD fire-and-forget', () => {
    const llamadas: [string | URL, RequestInit | undefined][] = []
    globalThis.fetch = mock((url: string | URL, init?: RequestInit) => {
      llamadas.push([url, init])
      return Promise.resolve(new Response(null))
    }) as unknown as typeof fetch

    preconnectAnthropicApi()

    expect(llamadas.length).toBe(1)
    expect(llamadas[0][0]).toBe('https://api.anthropic.com')
    expect(llamadas[0][1]?.method).toBe('HEAD')
  })

  test('respeta ANTHROPIC_BASE_URL si está configurado', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://gateway.interno.example/v1'
    const llamadas: (string | URL)[] = []
    globalThis.fetch = mock((url: string | URL) => {
      llamadas.push(url)
      return Promise.resolve(new Response(null))
    }) as unknown as typeof fetch

    preconnectAnthropicApi()

    expect(llamadas).toEqual(['https://gateway.interno.example/v1'])
  })

  test('con proveedor Bedrock: no llama a fetch (endpoint distinto)', () => {
    process.env.CLAUDE_CODE_USE_BEDROCK = '1'
    let llamado = false
    globalThis.fetch = mock(() => {
      llamado = true
      return Promise.resolve(new Response(null))
    }) as unknown as typeof fetch

    preconnectAnthropicApi()

    expect(llamado).toBe(false)
  })

  test('con HTTPS_PROXY configurado: no llama a fetch (pool no reusable)', () => {
    process.env.HTTPS_PROXY = 'http://proxy.local:8080'
    let llamado = false
    globalThis.fetch = mock(() => {
      llamado = true
      return Promise.resolve(new Response(null))
    }) as unknown as typeof fetch

    preconnectAnthropicApi()

    expect(llamado).toBe(false)
  })

  test('sólo dispara una vez por proceso — la segunda llamada es no-op', () => {
    let cuenta = 0
    globalThis.fetch = mock(() => {
      cuenta += 1
      return Promise.resolve(new Response(null))
    }) as unknown as typeof fetch

    preconnectAnthropicApi()
    preconnectAnthropicApi()
    preconnectAnthropicApi()

    expect(cuenta).toBe(1)
  })
})
