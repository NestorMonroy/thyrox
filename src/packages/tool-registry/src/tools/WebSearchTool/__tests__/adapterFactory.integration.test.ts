// Prueba de integración de `createAdapter`: ejerce la cadena REAL de
// `supportsAnthropicServerWebSearch` sustituyendo sólo `getGlobalConfig`,
// `getInitialSettings` y `getMainLoopModel`. Antes de v26.5.26 el
// enrutamiento de WebSearch fallaba porque `getProviderForModel` devolvía el
// literal 'anthropic' para las conexiones con `protocol='anthropic'`, y el
// predicado caía en su rama por defecto, falsa.
//
// Vive en su propio archivo (no en adapterFactory.test.ts) porque aquel
// sustituye `supportsAnthropicServerWebSearch` directamente y su `beforeEach`
// externo pisaría las sustituciones de integración de éste.
//
// Las tres sustituciones se DESHACEN al terminar el archivo. `mock.module`
// no se queda en su archivo: sin revertirlo, `skillUsageTracking.test.ts`,
// corrido después con `--randomize`, leía este `getGlobalConfig` fijo y sus
// escrituras desaparecían (11 fallos en 3 de 6 semillas,
// `test-order-leaks-20260927T082148`). Lo que revierte es registrar una COPIA
// de las exportaciones reales tomada antes de sustituir: el espacio de nombres
// mismo queda parcheado en su sitio.

import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { ConnectionRecord } from '@thyrox/config'

const realConfig = { ...(await import('@thyrox/config')) }
const config = { connections: [] as ConnectionRecord[] }
mock.module('@thyrox/config', () => ({
  ...realConfig,
  getGlobalConfig: () => config,
}))

const realSettings = { ...(await import('@thyrox/config/settings')) }
mock.module('@thyrox/config/settings', () => ({
  ...realSettings,
  getInitialSettings: () => ({}),
}))

const realModel = { ...(await import('@thyrox/provider/model.js')) }
let currentMainLoopModel = 'claude-account:claude-opus-4-7'
mock.module('@thyrox/provider/model.js', () => ({
  ...realModel,
  getMainLoopModel: () => currentMainLoopModel,
}))

afterAll(() => {
  mock.module('@thyrox/config', () => realConfig)
  mock.module('@thyrox/config/settings', () => realSettings)
  mock.module('@thyrox/provider/model.js', () => realModel)
})

const baseConn = {
  auth: { type: 'api_key' as const, key: 'k' },
  enabled: true,
  createdAt: 0,
}

let envBackup: string | undefined

beforeEach(() => {
  envBackup = process.env.WEB_SEARCH_ADAPTER
  delete process.env.WEB_SEARCH_ADAPTER
  config.connections = []
  currentMainLoopModel = 'claude-account:claude-opus-4-7'
})

afterEach(() => {
  if (envBackup === undefined) delete process.env.WEB_SEARCH_ADAPTER
  else process.env.WEB_SEARCH_ADAPTER = envBackup
})

async function freshFactory() {
  const url = new URL(
    `../adapters/index.ts?integ=${Date.now()}-${Math.random()}`,
    import.meta.url,
  )
  return (await import(url.href)).createAdapter
}

describe('createAdapter — connection-routed integration (v26.5.26 leak fix)', () => {
  test('Pro/Max OAuth connection (api.anthropic.com) → ApiSearchAdapter (THE BUG FIX)', async () => {
    config.connections = [
      {
        ...baseConn,
        id: 'claude-account',
        name: 'Claude Account',
        protocol: 'anthropic',
        endpoint: 'https://api.anthropic.com',
        models: [{ id: 'claude-opus-4-7', label: 'Opus 4.7' }],
      },
    ]
    currentMainLoopModel = 'claude-account:claude-opus-4-7'
    expect((await freshFactory())().constructor.name).toBe('ApiSearchAdapter')
  })

  test('Console api_key connection on api.anthropic.com → ApiSearchAdapter', async () => {
    config.connections = [
      {
        ...baseConn,
        id: 'anthropic-console',
        name: 'Anthropic Console',
        protocol: 'anthropic',
        endpoint: 'https://api.anthropic.com',
        models: [{ id: 'claude-opus-4-7', label: 'Opus 4.7' }],
      },
    ]
    currentMainLoopModel = 'anthropic-console:claude-opus-4-7'
    expect((await freshFactory())().constructor.name).toBe('ApiSearchAdapter')
  })

  test('OpenAI connection → BingSearchAdapter', async () => {
    config.connections = [
      {
        ...baseConn,
        id: 'openai',
        name: 'OpenAI',
        protocol: 'openai',
        endpoint: 'https://api.openai.com/v1',
        models: [{ id: 'gpt-5.5', label: 'GPT-5.5' }],
      },
    ]
    currentMainLoopModel = 'openai:gpt-5.5'
    expect((await freshFactory())().constructor.name).toBe('BingSearchAdapter')
  })

  test('Anthropic-compat proxy on third-party host → still ApiSearchAdapter at this layer', async () => {
    // Documented behavior: WebSearch routing accepts any anthropic-protocol
    // connection. Some proxies forward server tools; those that don't will
    // return an API error the user can see and override via
    // `WEB_SEARCH_ADAPTER=bing`. The endpoint distinction matters for FGTS
    // (legacy/api.ts) — that gate uses `isFirstPartyAnthropicEndpoint` —
    // but not here.
    config.connections = [
      {
        ...baseConn,
        id: 'litellm',
        name: 'LiteLLM',
        protocol: 'anthropic',
        endpoint: 'https://my-proxy.example.com/anthropic',
        models: [{ id: 'claude-opus-4-7', label: 'Opus 4.7' }],
      },
    ]
    currentMainLoopModel = 'litellm:claude-opus-4-7'
    expect((await freshFactory())().constructor.name).toBe('ApiSearchAdapter')
  })
})
