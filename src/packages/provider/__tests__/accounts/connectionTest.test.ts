/**
 * Probar una conexión guardada: una de clave de API va a la prueba de su
 * proveedor y una de cookie web a su sonda de sesión; una OAuth no tiene qué
 * probar sin red de refresco y se salta. Sólo un veredicto real se guarda:
 * «no soportado» y «saltada» no pisan un estado bueno. La validación, sin
 * red, dice qué le falta a la fila para poder usarse.
 *
 * Porte de `runProviderTest`, `validateConnection` y
 * `updateProviderTestResult` en `omniroute: bin/cli/commands/providers.mjs` y
 * `bin/cli/provider-store.mjs` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { testConnection, testResultUpdate, validateConnection } from '../../src/accounts/connectionTest.ts'

const apiKeyRow = (overrides: Record<string, unknown> = {}) => ({ id: 'c1', provider: 'openai', name: 'main', authType: 'apikey', apiKey: 'sk-1', defaultModel: 'm', providerSpecificData: { baseUrl: 'https://proxy.test/v1' }, ...overrides })

describe('testing one connection', () => {
  test('an api-key connection goes to its provider probe with its model and base url, and is persisted', async () => {
    const seen: unknown[] = []
    const outcome = await testConnection(apiKeyRow(), { probe: async input => (seen.push(input), { valid: true, error: null, statusCode: 200 }) })
    expect(seen).toEqual([{ provider: 'openai', apiKey: 'sk-1', defaultModel: 'm', baseUrl: 'https://proxy.test/v1' }])
    expect(outcome).toEqual({ valid: true, error: null, statusCode: 200, skipped: false, persist: true })
  })

  test('an unsupported provider is skipped and not persisted', async () => {
    const outcome = await testConnection(apiKeyRow(), { probe: async () => ({ valid: false, error: 'Provider test not supported', unsupported: true }) })
    expect(outcome).toMatchObject({ valid: false, skipped: true, persist: false })
  })

  test('an oauth connection is skipped without a probe', async () => {
    let probed = false
    const outcome = await testConnection(apiKeyRow({ authType: 'oauth' }), { probe: async () => ((probed = true), { valid: true, error: null }) })
    expect(probed).toBe(false)
    expect(outcome).toEqual({ valid: false, error: 'No API-key probe for oauth connections', skipped: true, persist: false })
    expect((await testConnection(apiKeyRow({ authType: null }), { probe: async () => ({ valid: true, error: null }) })).error).toBe('No API-key probe for unknown connections')
  })

  test('an api-key connection without a key fails, and that failure is persisted', async () => {
    const outcome = await testConnection(apiKeyRow({ apiKey: null }), { probe: async () => ({ valid: true, error: null }) })
    expect(outcome).toEqual({ valid: false, error: 'Connection main has no API key configured.', statusCode: null, skipped: false, persist: true })
  })

  test('a web-cookie provider goes to the session probe, whatever its auth type', async () => {
    const seen: unknown[] = []
    const outcome = await testConnection(apiKeyRow({ provider: 'Grok-Web', authType: 'cookie', apiKey: 'sso=x' }), {
      probe: async () => ({ valid: true, error: null }),
      webCookie: async request => (seen.push(request), { valid: false, error: 'Session expired', unsupported: false }),
    })
    expect(seen).toEqual([{ provider: 'Grok-Web', apiKey: 'sso=x' }])
    expect(outcome).toEqual({ valid: false, error: 'Session expired', skipped: false, persist: true })
    const unsupported = await testConnection(apiKeyRow({ provider: 'grok-web' }), { probe: async () => ({ valid: true, error: null }), webCookie: async () => ({ valid: false, error: 'Provider validation not supported', unsupported: true }) })
    expect(unsupported).toMatchObject({ skipped: true, persist: false })
  })

  test('a probe that throws is a persisted failure with its message', async () => {
    const outcome = await testConnection(apiKeyRow(), { probe: async () => { throw new Error('boom') } })
    expect(outcome).toEqual({ valid: false, error: 'boom', statusCode: null, skipped: false, persist: true })
  })
})

describe('the fields a test result writes', () => {
  test('a pass clears the error fields and stamps the test', () => {
    expect(testResultUpdate({ valid: true, error: null, statusCode: 200 }, 'T')).toEqual({ testStatus: 'active', lastError: null, lastErrorAt: null, lastErrorType: null, lastErrorSource: null, errorCode: null, lastTested: 'T' })
  })

  test('a failure records its message, its status code and where it came from', () => {
    expect(testResultUpdate({ valid: false, error: 'Invalid API key', statusCode: 401 }, 'T')).toEqual({ testStatus: 'error', lastError: 'Invalid API key', lastErrorAt: 'T', lastErrorType: 'connection_test_failed', lastErrorSource: 'upstream', errorCode: 401, lastTested: 'T' })
    expect(testResultUpdate({ valid: false, error: null }, 'T')).toMatchObject({ lastError: 'Provider test failed', errorCode: null })
  })
})

describe('validating a connection offline', () => {
  test('a complete api-key row is valid with nothing to say', () => {
    expect(validateConnection(apiKeyRow())).toEqual({ valid: true, issues: [], warnings: [] })
  })

  test('a missing id or provider is an issue; a missing auth type is a warning', () => {
    expect(validateConnection(apiKeyRow({ id: '', provider: '', authType: '' }))).toEqual({ valid: false, issues: ['Missing id', 'Missing provider'], warnings: ['Missing auth type', 'OAuth connection has no access or refresh token visible locally'] })
  })

  test('an api-key row without its key is an issue', () => {
    expect(validateConnection(apiKeyRow({ apiKey: '' })).issues).toEqual(['Connection main has no API key configured.'])
  })

  test('an oauth row with no token at all is a warning, not an issue', () => {
    expect(validateConnection(apiKeyRow({ authType: 'oauth', apiKey: null, accessToken: null, refreshToken: null }))).toEqual({ valid: true, issues: [], warnings: ['OAuth connection has no access or refresh token visible locally'] })
    expect(validateConnection(apiKeyRow({ authType: 'oauth', refreshToken: 'r' })).warnings).toEqual([])
  })

  test('a row whose secrets could not be decrypted says so', () => {
    expect(validateConnection(apiKeyRow({ credentialDecryptFailed: true })).issues).toEqual(['Stored credentials could not be decrypted with the configured key'])
  })
})
