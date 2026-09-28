/**
 * El sondeo de sesión de un proveedor de cookie web: un `GET` a `/models` de
 * su host de API con la cookie; sólo un 401/403 declara la sesión caducada, y
 * un proveedor sin host de API honesto se declara no soportado en vez de
 * inventar un `valid: true`.
 *
 * Porte de `omniroute: src/lib/providers/validation/webCookie.ts`, de los
 * conjuntos de `validation/transport.ts`, del catálogo de
 * `src/shared/constants/providers/web-cookie.ts` y de `extractZaiToken` en
 * `open-sse/executors/zai-web/protocol.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { isWebCookieProvider, WEB_COOKIE_PROBE_BASE_URLS } from '../../../src/accounts/webCookie/webCookieProviders.ts'
import { resolveWebCookieProbe, validateWebCookieProvider } from '../../../src/accounts/webCookie/webCookieProbe.ts'
import { extractZaiToken } from '../../../src/accounts/webCookie/zaiToken.ts'

function prober(answer: (url: string) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input))
  }) as unknown as typeof globalThis.fetch
  return { calls, validate: (provider: string, apiKey?: string, specialValidators = {}) => validateWebCookieProvider({ provider, apiKey }, { fetch, specialValidators }) }
}

const UNSUPPORTED = { valid: false, error: 'Provider validation not supported', unsupported: true }

describe('the web-cookie catalog', () => {
  test('knows every catalogued provider in any case, and nothing inherited', () => {
    expect(Object.keys(WEB_COOKIE_PROBE_BASE_URLS)).toHaveLength(33)
    expect(isWebCookieProvider('grok-web')).toBe(true)
    expect(isWebCookieProvider('Kimi-Web')).toBe(true)
    expect(isWebCookieProvider('poe-web')).toBe(true)
    expect(isWebCookieProvider('openai')).toBe(false)
    expect(isWebCookieProvider('constructor')).toBe(false)
    expect(isWebCookieProvider(null)).toBe(false)
  })
})

describe('the Z.ai web-session token', () => {
  test('is read from JSON, a bearer line, a token cookie or a bare value', () => {
    expect(extractZaiToken(' {"token":" t1 "} ')).toBe('t1')
    expect(extractZaiToken('{"accessToken":"t2"}')).toBe('t2')
    expect(extractZaiToken('{"access_token":"t3"}')).toBe('t3')
    expect(extractZaiToken('{"token":5}')).toBe('')
    expect(extractZaiToken('Authorization: Bearer  t4 ')).toBe('t4')
    expect(extractZaiToken('bearer t5')).toBe('t5')
    expect(extractZaiToken('Cookie: a=1; token=t6; b=2')).toBe('t6')
    expect(extractZaiToken('token=t7')).toBe('t7')
    expect(extractZaiToken('a=1; b=2')).toBe('')
    expect(extractZaiToken('baretoken')).toBe('baretoken')
    expect(extractZaiToken('Cookie: baretoken')).toBe('baretoken')
    expect(extractZaiToken('{broken')).toBe('{broken')
  })
})

describe('resolving the probe of a provider', () => {
  test('a cookie provider pings /models of its API host with the cookie', () => {
    const probe = resolveWebCookieProbe('deepseek-web', 'sid=1')
    expect(probe).toEqual({ testUrl: 'https://chat.deepseek.com/api/v0/chat/completion/models', headers: { 'User-Agent': expect.stringContaining('Mozilla/5.0'), Cookie: 'sid=1' } })
  })

  test('a provider outside the catalog is unsupported', () => {
    expect(resolveWebCookieProbe('openai', 'c')).toEqual({ rejection: { valid: false, error: 'Provider not found in registry', unsupported: true } })
  })

  test('a missing cookie is required, not unsupported', () => {
    expect(resolveWebCookieProbe('deepseek-web', '')).toEqual({ rejection: { valid: false, error: 'Cookie required for web-cookie provider', unsupported: false } })
  })

  test('a provider without an API host, or whose host is not a plain http(s) URL, is unsupported', () => {
    expect(resolveWebCookieProbe('poe-web', 'c')).toEqual({ rejection: UNSUPPORTED })
    expect(resolveWebCookieProbe('copilot-web', 'c')).toEqual({ rejection: UNSUPPORTED })
  })

  test('Z.ai probes /api/models with its bearer token, and without one it is required', () => {
    expect(resolveWebCookieProbe('zai-web', 'token=z1')).toEqual({ testUrl: 'https://chat.z.ai/api/models', headers: { Accept: 'application/json', 'Accept-Language': 'en-US', Authorization: 'Bearer z1', 'User-Agent': expect.stringContaining('Mozilla/5.0') } })
    expect(resolveWebCookieProbe('zai-web', 'a=1; b=2')).toEqual({ rejection: { valid: false, error: 'Z.ai web-session credential required', unsupported: false } })
  })
})

describe('validating a web-cookie provider', () => {
  test('a 401 or 403 is an expired session', async () => {
    for (const status of [401, 403]) {
      const { validate } = prober(() => new Response('', { status }))
      expect(await validate('deepseek-web', ' sid=1 ')).toEqual({ valid: false, error: 'SESSION_EXPIRED', errorCode: 'AUTH_007', unsupported: false })
    }
  })

  test('the probe is a GET that does not follow redirects, with the trimmed cookie', async () => {
    const { calls, validate } = prober(() => new Response('{}'))
    await validate('deepseek-web', ' sid=1 ')
    expect(calls[0]!.init.method).toBe('GET')
    expect(calls[0]!.init.redirect).toBe('manual')
    expect((calls[0]!.init.headers as Record<string, string>).Cookie).toBe('sid=1')
  })

  test('any other status accepts the cookie', async () => {
    for (const status of [200, 404, 429]) {
      const { validate } = prober(() => new Response('', { status }))
      expect(await validate('deepseek-web', 'sid=1')).toEqual({ valid: true, error: null, unsupported: false })
    }
  })

  test('a provider without a models API only trusts a 401/403', async () => {
    expect(await prober(() => new Response('')).validate('grok-web', 'sso=1')).toEqual(UNSUPPORTED)
    expect(await prober(() => new Response('', { status: 401 })).validate('grok-web', 'sso=1')).toMatchObject({ error: 'SESSION_EXPIRED' })
  })

  test('a redirect is blocked, and on an unreliable probe it is unsupported', async () => {
    const redirect = () => new Response('', { status: 302, headers: { Location: 'https://login.test/' } })
    expect(await prober(redirect).validate('deepseek-web', 'sid=1')).toEqual({ valid: false, error: 'Redirect blocked', unsupported: false })
    expect(await prober(redirect).validate('lmarena', 'sid=1')).toEqual(UNSUPPORTED)
  })

  test('a rejection is returned without any request', async () => {
    const { calls, validate } = prober(() => new Response(''))
    expect(await validate('poe-web', 'c')).toEqual(UNSUPPORTED)
    expect(calls).toEqual([])
  })

  test('a network failure is a sanitized error, never thrown', async () => {
    const { validate } = prober(() => {
      throw new Error('connect ECONNREFUSED Bearer sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789')
    })
    const outcome = await validate('deepseek-web', 'sid=1')
    expect(outcome).toMatchObject({ valid: false, unsupported: false })
    expect(outcome.error).toContain('ECONNREFUSED')
    expect(outcome.error).not.toContain('sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789')
  })

  test('a thrown value that is not an Error still reports a failure', async () => {
    const { validate } = prober(() => {
      throw undefined
    })
    expect(await validate('deepseek-web', 'sid=1')).toEqual({ valid: false, error: 'Validation failed', unsupported: false })
  })

  test('chatgpt-web goes to its own validator, and an injected map without one leaves it unsupported', async () => {
    const { calls, validate } = prober(() => new Response(''))
    expect(await validate('chatgpt-web', '{}', {})).toEqual(UNSUPPORTED)
    expect(await validate('chatgpt-web', '{}', { 'chatgpt-web': () => ({ valid: true, error: null, unsupported: false }) })).toEqual({ valid: true, error: null, unsupported: false })
    expect(calls).toEqual([])
  })
})
