/**
 * Alta de una credencial de Anthropic desde la CLI y su lectura por la cadena
 * de credenciales, sobre el mismo store cifrado: `providers add anthropic`
 * guarda la fila bajo el id que `resolveCredential` busca, la clave queda
 * cifrada en disco, `providers test` la prueba contra un servidor de loopback
 * con el nombre de su receta, y `providers login claude` rehúsa sin
 * `THYROX_CLAUDE_OAUTH_CLIENT_ID` antes de abrir un servidor o un navegador.
 *
 * Nunca una credencial real: el store vive en un directorio temporal
 * (`THYROX_PROVIDERS_DATA_DIR`) con una clave de cifrado de prueba.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { testProviderApiKey } from '@thyrox/provider/accounts/apiKeyProbe'
import { openConnectionStore, type OpenedConnectionStore } from '@thyrox/provider/accounts/connectionStoreHome'
import type { CallbackServer } from '@thyrox/provider/accounts/oauth/callbackServer'
import { type AnthropicMockServer, startAnthropicMockServer } from '@thyrox/provider/anthropicMockServer'
import { resolveCredential } from '@thyrox/provider/credentials'

import { providersCommand, type ProvidersCommandDeps } from '../src/commands/providers-commands.ts'
import { createOAuthLogin } from '../src/commands/providers/oauthLogin.ts'
import { ANTHROPIC_STORE_PROVIDER_ID, apiKeyProbeProvider, canonicalProviderId } from '../src/commands/providers/providerId.ts'

const SECRET = 'sk-ant-test-only-0123456789'
const CLIENT_ID_VARIABLE = 'THYROX_CLAUDE_OAUTH_CLIENT_ID'

describe('the spelling of the Anthropic provider', () => {
  test('anthropic and claude are the same store id, in any case; other providers keep their spelling', () => {
    expect(canonicalProviderId('anthropic')).toBe(ANTHROPIC_STORE_PROVIDER_ID)
    expect(canonicalProviderId(' Anthropic ')).toBe(ANTHROPIC_STORE_PROVIDER_ID)
    expect(canonicalProviderId('claude')).toBe(ANTHROPIC_STORE_PROVIDER_ID)
    expect(canonicalProviderId('openai')).toBe('openai')
    expect(canonicalProviderId(' OpenAI ')).toBe('OpenAI')
  })

  test('the API-key probe is asked with the name of its recipe', () => {
    expect(apiKeyProbeProvider(ANTHROPIC_STORE_PROVIDER_ID)).toBe('anthropic')
    expect(apiKeyProbeProvider('openai')).toBe('openai')
  })
})

describe('an Anthropic API key from providers add to resolveCredential', () => {
  let home: string
  let opened: OpenedConnectionStore
  let server: AnthropicMockServer
  const out: string[] = []
  let deps: ProvidersCommandDeps

  beforeAll(async () => {
    home = mkdtempSync(join(tmpdir(), 'thyrox-anthropic-credential-'))
    const env = { THYROX_PROVIDERS_DATA_DIR: home, THYROX_STORAGE_ENCRYPTION_KEY: 'test-key-never-real', ANTHROPIC_TEST_KEY: SECRET }
    opened = openConnectionStore({ env, declared: () => null })
    server = await startAnthropicMockServer({ host: '127.0.0.1', port: 0 })
    deps = {
      openStore: () => ({ store: opened.store, close: () => {} }),
      write: text => void out.push(text),
      interactive: false,
      confirm: async () => false,
      testDeps: { probe: input => testProviderApiKey(input, { env: {} }) },
      now: () => '2026-09-30T00:00:00.000Z',
      env,
      readStdin: async () => '',
      promptSecret: async () => '',
      readFile: () => '',
      login: async () => ({ ok: false, error: 'not under test' }),
    }
  })

  afterAll(async () => {
    await server.close()
    opened.close()
    rmSync(home, { recursive: true, force: true })
  })

  test('add anthropic stores the row under the id the credential chain reads, with the key encrypted at rest', async () => {
    const baseUrl = `${server.url}/v1`
    expect(await providersCommand(['providers', 'add', 'anthropic', '--credential-env', 'ANTHROPIC_TEST_KEY', '--provider-specific-data', JSON.stringify({ baseUrl })], deps)).toBe(0)
    const raw = opened.store.listRaw()
    expect(raw).toHaveLength(1)
    expect(raw[0]).toMatchObject({ provider: ANTHROPIC_STORE_PROVIDER_ID, name: ANTHROPIC_STORE_PROVIDER_ID, authType: 'apikey' })
    expect(String(raw[0]!.apiKey)).not.toContain(SECRET)
    expect(opened.store.getById(String(raw[0]!.id))?.apiKey).toBe(SECRET)
    expect(out.join('')).not.toContain(SECRET)
  })

  test('resolveCredential reads that same row when the environment has no credential', () => {
    const credential = resolveCredential({}, () => '', opened.store)
    expect(credential).toEqual({ source: 'PROVIDER_CONNECTION', kind: 'api_key', secret: SECRET })
  })

  test('providers test anthropic sends the key to the local server as x-api-key and records the verdict', async () => {
    out.length = 0
    expect(await providersCommand(['providers', 'test', 'anthropic'], deps)).toBe(0)
    expect(out.join('')).toBe(`OK ${ANTHROPIC_STORE_PROVIDER_ID}: provider test passed\n`)
    expect(server.requests).toHaveLength(1)
    expect(server.requests[0]).toMatchObject({ method: 'POST', path: '/v1/messages' })
    expect(server.requests[0]!.headers['x-api-key']).toBe(SECRET)
    const tested = opened.store.list()[0]!
    expect(tested).toMatchObject({ testStatus: 'active', lastTested: '2026-09-30T00:00:00.000Z' })
    expect(tested.lastError).toBeFalsy()
  })

  test('providers validate sees a usable row', async () => {
    out.length = 0
    expect(await providersCommand(['providers', 'validate'], deps)).toBe(0)
    expect(out.join('')).toBe(`OK ${ANTHROPIC_STORE_PROVIDER_ID}\n`)
  })
})

describe('providers login claude and its client id', () => {
  const io = { write: () => {}, interactive: false, promptSecret: async () => '', readStdin: async () => '' }
  const store = { list: () => [], create: () => null, update: () => null }

  function loginWith(env: Record<string, string | undefined>) {
    const calls = { browser: [] as string[], servers: 0 }
    const callbackServer: CallbackServer = { host: '127.0.0.1', port: 1, callback: Promise.resolve({ error: 'access_denied' }), close: () => {} }
    const login = createOAuthLogin(io, {
      env,
      openBrowser: async url => void calls.browser.push(url),
      startCallbackServer: async () => (calls.servers++, callbackServer),
    })
    return { calls, login }
  }

  test('without THYROX_CLAUDE_OAUTH_CLIENT_ID it refuses naming the variable, before any server or browser', async () => {
    const { calls, login } = loginWith({})
    const outcome = await login(store, { provider: 'claude' })
    expect(outcome).toEqual({ ok: false, error: `${CLIENT_ID_VARIABLE} is not set: declare the OAuth client id of this provider to log in.` })
    expect(calls).toEqual({ browser: [], servers: 0 })
  })

  test('with the variable declared the flow starts, and the client id travels in the URL, never a published one', async () => {
    const { calls, login } = loginWith({ [CLIENT_ID_VARIABLE]: 'consumer-client-id' })
    const outcome = await login(store, { provider: 'claude' })
    expect(outcome).toEqual({ ok: false, error: 'access_denied' })
    expect(calls.servers).toBe(1)
    expect(calls.browser).toHaveLength(1)
    expect(new URL(calls.browser[0]!).searchParams.get('client_id')).toBe('consumer-client-id')
  })
})
