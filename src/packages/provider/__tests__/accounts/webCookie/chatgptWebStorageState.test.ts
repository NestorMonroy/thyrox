/**
 * La credencial de ChatGPT web es un storage state de Playwright, no una
 * cabecera de cookie: se valida su forma y que cada cookie y cada origen sean
 * de primera parte (chatgpt.com u openai.com), sin repetir su contenido en
 * ningún error.
 *
 * Porte de `normalizeChatGptWebStorageState` en
 * `omniroute: open-sse/utils/chatgptWebExecutorAdapter.ts` y de
 * `src/lib/providers/validation/chatgptWeb.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { normalizeChatGptWebStorageState, validateChatGptWebProvider } from '../../../src/accounts/webCookie/chatgptWebStorageState.ts'
import { validateWebCookieProvider } from '../../../src/accounts/webCookie/webCookieProbe.ts'

const cookie = (overrides: Record<string, unknown> = {}) => ({ name: '__Secure-next-auth.session-token', value: 'secret-value', domain: '.chatgpt.com', path: '/', expires: 1893456000, httpOnly: true, secure: true, sameSite: 'Lax', ...overrides })
const origin = (overrides: Record<string, unknown> = {}) => ({ origin: 'https://chatgpt.com', localStorage: [{ name: 'k', value: 'v' }], ...overrides })
const state = (overrides: Record<string, unknown> = {}) => ({ cookies: [cookie()], origins: [origin()], ...overrides })

describe('the ChatGPT web storage state', () => {
  test('a first-party state is accepted as a copy', () => {
    const input = state({ cookies: [cookie(), cookie({ domain: 'auth.openai.com', sameSite: 'None' })] })
    const normalized = normalizeChatGptWebStorageState(input)
    expect(normalized as unknown).toEqual(input)
    expect(normalized).not.toBe(input)
    expect(normalized.cookies[0]).not.toBe(input.cookies[0])
  })

  test('the top level must carry cookie and origin arrays', () => {
    for (const bad of [null, [], { cookies: [] }, { origins: [] }, { cookies: {}, origins: [] }]) expect(() => normalizeChatGptWebStorageState(bad)).toThrow('ChatGPT Web browser storage state is invalid')
  })

  test('every cookie field is checked', () => {
    const invalid = [{ name: '' }, { name: 5 }, { value: 1 }, { domain: null }, { path: 'x' }, { path: 1 }, { expires: '1' }, { expires: Infinity }, { httpOnly: 'yes' }, { secure: 1 }, { sameSite: 'lax' }]
    for (const overrides of invalid) expect(() => normalizeChatGptWebStorageState(state({ cookies: [cookie(overrides)] }))).toThrow('contains an invalid cookie')
    expect(() => normalizeChatGptWebStorageState(state({ cookies: ['x'] }))).toThrow('contains an invalid cookie')
  })

  test('a cookie of another site is foreign, even one that only ends like chatgpt.com', () => {
    for (const domain of ['.example.com', 'evilchatgpt.com', 'chatgpt.com.evil.test']) expect(() => normalizeChatGptWebStorageState(state({ cookies: [cookie({ domain })] }))).toThrow('contains a foreign cookie domain')
    expect(normalizeChatGptWebStorageState(state({ cookies: [cookie({ domain: 'CHATGPT.COM' })] })).cookies).toHaveLength(1)
  })

  test('an origin must be an https URL of the first party with valid local storage', () => {
    for (const overrides of [{ origin: 5 }, { localStorage: {} }, { origin: 'not a url' }]) expect(() => normalizeChatGptWebStorageState(state({ origins: [origin(overrides)] }))).toThrow('contains an invalid origin')
    for (const overrides of [{ origin: 'http://chatgpt.com' }, { origin: 'https://example.com' }]) expect(() => normalizeChatGptWebStorageState(state({ origins: [origin(overrides)] }))).toThrow('contains a foreign origin')
    expect(() => normalizeChatGptWebStorageState(state({ origins: [origin({ localStorage: [{ name: 'k', value: 1 }] })] }))).toThrow('contains invalid local storage')
    expect(() => normalizeChatGptWebStorageState(state({ origins: ['x'] }))).toThrow('contains an invalid origin')
  })
})

describe('validating a ChatGPT web credential', () => {
  test('a state with first-party cookies is valid', () => {
    expect(validateChatGptWebProvider({ apiKey: JSON.stringify(state()) })).toEqual({ valid: true, error: null, unsupported: false })
  })

  test('an empty credential, a state without cookies, or an invalid one is rejected without echoing it', () => {
    expect(validateChatGptWebProvider({ apiKey: '  ' })).toEqual({ valid: false, error: 'ChatGPT Web browser storage state JSON is required', unsupported: false })
    expect(validateChatGptWebProvider({ apiKey: 5 })).toEqual({ valid: false, error: 'ChatGPT Web browser storage state JSON is required', unsupported: false })
    expect(validateChatGptWebProvider({ apiKey: JSON.stringify(state({ cookies: [] })) })).toEqual({ valid: false, error: 'ChatGPT Web browser storage state must contain first-party cookies', unsupported: false })
    const foreign = validateChatGptWebProvider({ apiKey: JSON.stringify(state({ cookies: [cookie({ domain: '.example.com' })] })) })
    expect(foreign).toEqual({ valid: false, error: 'ChatGPT Web browser storage state JSON is invalid or contains foreign origins', unsupported: false })
    expect(validateChatGptWebProvider({ apiKey: '{broken' }).error).toBe('ChatGPT Web browser storage state JSON is invalid or contains foreign origins')
  })

  test('is the validator the web-cookie probe uses for chatgpt-web by default', async () => {
    expect(await validateWebCookieProvider({ provider: 'chatgpt-web', apiKey: JSON.stringify(state()) })).toEqual({ valid: true, error: null, unsupported: false })
  })
})
