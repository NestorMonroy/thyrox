/**
 * El código de dispositivo propio de OpenAI para codex (no el RFC 8628): un
 * código de usuario, un sondeo que devuelve el código de autorización con su
 * verificador PKCE generado en el servidor, y el intercambio por tokens.
 *
 * Porte de `omniroute: src/lib/oauth/codexDeviceFlow.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { CodexDeviceAuthError, createCodexDeviceAuth } from '../../../src/accounts/oauth/flows/codexDeviceAuth.ts'
import { codexOAuthConfig } from '../../../src/accounts/oauth/flows/codexFlow.ts'

type Answer = Response | Error
function scriptedFetch(answers: Answer[]) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    const answer = answers.shift() ?? new Response('exhausted', { status: 599 })
    if (answer instanceof Error) throw answer
    return answer
  }
  return { calls, fetch: fetch as typeof globalThis.fetch }
}

const config = codexOAuthConfig({ THYROX_CODEX_OAUTH_CLIENT_ID: 'cid' })
function clockAndDelay() {
  let now = 0
  const waits: number[] = []
  return { waits, monotonicNow: () => now, delay: async (ms: number) => { waits.push(ms); now += ms } }
}
const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' })

describe('user code', () => {
  test('without its variable the flow refuses naming it', async () => {
    const auth = createCodexDeviceAuth({ config: codexOAuthConfig({}), ...clockAndDelay() })
    await expect(auth.requestUserCode()).rejects.toThrow('THYROX_CODEX_OAUTH_CLIENT_ID is not set')
  })

  test('the user code comes with its handle, a sane interval and the page to enter it', async () => {
    const { calls, fetch } = scriptedFetch([Response.json({ device_auth_id: 'd', usercode: 'AB-12', interval: '7' })])
    const code = await createCodexDeviceAuth({ config, fetch, ...clockAndDelay() }).requestUserCode()
    expect(code).toEqual({ deviceAuthId: 'd', userCode: 'AB-12', intervalSec: 7, verificationUri: 'https://auth.openai.com/codex/device' })
    expect(calls[0]!.url).toBe('https://auth.openai.com/api/accounts/deviceauth/usercode')
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ client_id: 'cid' })
    const { fetch: bad } = scriptedFetch([Response.json({ device_auth_id: 'd', user_code: 'X', interval: -3 })])
    expect((await createCodexDeviceAuth({ config, fetch: bad, ...clockAndDelay() }).requestUserCode()).intervalSec).toBe(5)
  })

  test('a disabled account, a failure, an incomplete answer, the network and an abort have their codes', async () => {
    const codeOf = async (answer: Answer) => {
      const { fetch } = scriptedFetch([answer])
      return createCodexDeviceAuth({ config, fetch, ...clockAndDelay() }).requestUserCode().catch((error: CodexDeviceAuthError) => [error.code, error.status])
    }
    expect(await codeOf(new Response('', { status: 404 }))).toEqual(['device_disabled', 404])
    expect(await codeOf(new Response('boom', { status: 500 }))).toEqual(['usercode_failed', 500])
    expect(await codeOf(Response.json({ user_code: 'X' }))).toEqual(['usercode_failed', undefined])
    expect(await codeOf(new Error('dns'))).toEqual(['network', undefined])
    expect(await codeOf(abortError())).toEqual(['aborted', undefined])
  })
})

describe('polling', () => {
  test('pending answers and network hiccups keep polling at the interval until the code arrives', async () => {
    const timing = clockAndDelay()
    const { calls, fetch } = scriptedFetch([new Response('', { status: 403 }), new Error('reset'), new Response('', { status: 404 }), Response.json({ authorization_code: 'ac', code_verifier: 'cv' })])
    const result = await createCodexDeviceAuth({ config, fetch, ...timing }).pollForAuthorization('d', 'u', 2)
    expect(result).toEqual({ authorizationCode: 'ac', codeVerifier: 'cv' })
    expect(timing.waits).toEqual([2000, 2000, 2000, 2000])
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ device_auth_id: 'd', user_code: 'u' })
  })

  test('a hard failure, an incomplete grant, the deadline and an abort stop the poll', async () => {
    const run = (answers: Answer[], timeoutMs?: number) => {
      const { fetch } = scriptedFetch(answers)
      return createCodexDeviceAuth({ config, fetch, ...clockAndDelay() }).pollForAuthorization('d', 'u', 1, { timeoutMs }).catch((error: CodexDeviceAuthError) => [error.code, error.status])
    }
    expect(await run([new Response('no', { status: 500 })])).toEqual(['usercode_failed', 500])
    expect(await run([Response.json({ authorization_code: 'ac' })])).toEqual(['usercode_failed', undefined])
    expect(await run([new Response('', { status: 403 }), new Response('', { status: 403 })], 1500)).toEqual(['timeout', undefined])
    expect(await run([abortError()])).toEqual(['aborted', undefined])
    const controller = new AbortController()
    controller.abort()
    const { fetch } = scriptedFetch([])
    await expect(createCodexDeviceAuth({ config, fetch, ...clockAndDelay() }).pollForAuthorization('d', 'u', 1, { signal: controller.signal })).rejects.toMatchObject({ code: 'aborted' })
  })
})

describe('exchange and the whole flow', () => {
  test('the code and the server verifier become tokens at the device callback', async () => {
    const { calls, fetch } = scriptedFetch([Response.json({ access_token: 'a', refresh_token: 'r', id_token: 'i', expires_in: 60, extra: 1 })])
    expect(await createCodexDeviceAuth({ config, fetch, ...clockAndDelay() }).exchangeCodeForTokens('ac', 'cv')).toEqual({ access_token: 'a', refresh_token: 'r', id_token: 'i', expires_in: 60 })
    const body = new URLSearchParams(String(calls[0]!.init.body))
    expect([calls[0]!.url, body.get('code_verifier'), body.get('redirect_uri'), body.get('client_id')]).toEqual(['https://auth.openai.com/oauth/token', 'cv', 'https://auth.openai.com/deviceauth/callback', 'cid'])
  })

  test('a failed or empty exchange is an exchange failure', async () => {
    const codeOf = async (answer: Answer) => {
      const { fetch } = scriptedFetch([answer])
      return createCodexDeviceAuth({ config, fetch, ...clockAndDelay() }).exchangeCodeForTokens('ac', 'cv').catch((error: CodexDeviceAuthError) => [error.code, error.status])
    }
    expect(await codeOf(new Response('bad', { status: 400 }))).toEqual(['exchange_failed', 400])
    expect(await codeOf(Response.json({}))).toEqual(['exchange_failed', undefined])
    expect(await codeOf(new Error('dns'))).toEqual(['network', undefined])
  })

  test('the whole flow shows the code, polls and exchanges', async () => {
    const shown: string[] = []
    const { fetch } = scriptedFetch([Response.json({ device_auth_id: 'd', user_code: 'U' }), Response.json({ authorization_code: 'ac', code_verifier: 'cv' }), Response.json({ access_token: 'a' })])
    const tokens = await createCodexDeviceAuth({ config, fetch, ...clockAndDelay() }).run({ onUserCode: code => shown.push(code.userCode) })
    expect([shown, tokens.access_token]).toEqual([['U'], 'a'])
  })
})
