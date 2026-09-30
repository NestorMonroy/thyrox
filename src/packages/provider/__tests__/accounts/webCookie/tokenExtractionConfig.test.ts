/**
 * Cómo se inicia sesión en cada proveedor de cookie web y de dónde se extrae
 * la credencial después: cookie, `localStorage`, `sessionStorage` o cabecera.
 *
 * Porte de `omniroute: open-sse/services/tokenExtractionConfig.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { getExtractionConfig, listExtractionConfigs, TOKEN_EXTRACTION_CONFIGS } from '../../../src/accounts/webCookie/tokenExtractionConfig.ts'

describe('the token extraction configs', () => {
  test('cover the providers with an interactive login, one each', () => {
    const ids = listExtractionConfigs().map(config => config.providerId)
    expect(ids).toHaveLength(22)
    expect(new Set(ids).size).toBe(22)
    expect(TOKEN_EXTRACTION_CONFIGS.size).toBe(22)
  })

  test('a config fills the default polling and keeps what it declares', () => {
    expect(getExtractionConfig('gemini-web')).toEqual({
      providerId: 'gemini-web',
      displayName: 'Gemini Web',
      loginUrl: 'https://gemini.google.com/app',
      homeUrl: 'https://gemini.google.com',
      tokenSources: [{ type: 'cookie', name: '__Secure-1PSID', domain: '.google.com' }, { type: 'cookie', name: '__Secure-1PSIDTS', domain: '.google.com' }],
      instructions: 'Log in to your Google account at gemini.google.com. Both __Secure-1PSID and __Secure-1PSIDTS cookies will be extracted.',
      pollingConfig: { pollInterval: 1000, timeout: 300_000, minLoginTime: 5000 },
      successUrlPattern: undefined,
      cookieDomain: '.google.com',
    })
  })

  test('quick polling and partial overrides merge over the default', () => {
    expect(getExtractionConfig('duckduckgo-web')!.pollingConfig).toEqual({ pollInterval: 800, timeout: 120_000, minLoginTime: 3000 })
    const volcengine = getExtractionConfig('volcengine-console')!
    expect(volcengine.pollingConfig).toEqual({ pollInterval: 1000, timeout: 300_000, minLoginTime: 3000 })
    expect(volcengine.successUrlPattern!.test('https://console.volcengine.com/ark/x')).toBe(true)
  })

  test('the sources keep their kind and order', () => {
    expect(getExtractionConfig('kimi-web')!.tokenSources).toEqual([{ type: 'localStorage', key: 'access_token' }, { type: 'cookie', name: 'kimi-auth', domain: '.kimi.com' }])
    expect(getExtractionConfig('copilot-web')!.tokenSources).toEqual([{ type: 'header', name: 'Authorization' }])
  })

  test('an unknown provider has none, and the listing is a copy', () => {
    expect(getExtractionConfig('nope')).toBeUndefined()
    listExtractionConfigs().pop()
    expect(listExtractionConfigs()).toHaveLength(22)
  })
})
