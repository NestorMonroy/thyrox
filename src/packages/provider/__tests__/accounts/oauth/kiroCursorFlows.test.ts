/**
 * Los flujos de Kiro (AWS Builder ID / IAM Identity Center por código de
 * dispositivo, y Google/GitHub por login social) y de Cursor (login
 * deep-control con PKCE y sondeo, o importación de token).
 *
 * Porte de `omniroute: src/lib/oauth/providers/kiro.ts`,
 * `open-sse/services/kiroRegion.ts`, `kiroSocialPoll.ts`,
 * `kiroConnectionIdentity.ts`, el login social de `services/kiro.ts`,
 * `providers/cursor.ts`, `services/cursorLogin.ts` y
 * `services/persistCursorConnection.ts` (MIT).
 */
import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'

import { createConnectionStore } from '../../../src/accounts/connectionStore.ts'
import { createFieldCipher } from '../../../src/accounts/fieldCipher.ts'
import { findKiroConnectionByIdentity } from '../../../src/accounts/kiro/kiroConnectionIdentity.ts'
import {
  assertValidAwsRegion,
  discoverKiroProfileArn,
  kiroProfileDiscoveryRegions,
  kiroRuntimeHost,
  resolveKiroRuntimeRegion,
} from '../../../src/accounts/kiro/kiroRegion.ts'
import { classifyKiroSocialPoll, nextKiroSocialPollInterval } from '../../../src/accounts/kiro/kiroSocialPoll.ts'
import { createCursorLogin, credentialsFromCursorTokens } from '../../../src/accounts/oauth/flows/cursorLogin.ts'
import { createCursorFlow } from '../../../src/accounts/oauth/flows/cursorFlow.ts'
import { createKiroFlow, kiroOAuthConfig } from '../../../src/accounts/oauth/flows/kiroFlow.ts'
import { createKiroSocialLogin } from '../../../src/accounts/oauth/flows/kiroSocialLogin.ts'
import { persistCursorConnection } from '../../../src/accounts/oauth/cursorPersistence.ts'
import { createOAuthFlows } from '../../../src/accounts/oauth/oauthFlows.ts'

function scriptedFetch(answer: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input), init)
  }
  return { calls, fetch: fetch as typeof globalThis.fetch }
}

const body = (init: RequestInit) => JSON.parse(String(init.body))
const jwt = (payload: Record<string, unknown>) =>
  `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`

describe('kiro regions', () => {
  test('a region must have the AWS shape: it is interpolated into hosts', () => {
    expect(assertValidAwsRegion('eu-north-1')).toBe('eu-north-1')
    expect(() => assertValidAwsRegion('127.0.0.1')).toThrow('Invalid region')
    expect(() => assertValidAwsRegion('evil.com/x')).toThrow('Invalid region')
  })

  test('the runtime lives where the profile ARN says, else in a profile region, else us-east-1', () => {
    expect(resolveKiroRuntimeRegion({ profileArn: 'arn:aws:codewhisperer:eu-central-1:1:profile/x', region: 'us-east-1' })).toBe('eu-central-1')
    expect(resolveKiroRuntimeRegion({ region: 'EU-CENTRAL-1' })).toBe('eu-central-1')
    expect(resolveKiroRuntimeRegion({ region: 'eu-north-1' })).toBe('us-east-1')
    expect(kiroRuntimeHost('us-east-1')).toBe('https://codewhisperer.us-east-1.amazonaws.com')
    expect(kiroRuntimeHost('eu-central-1')).toBe('https://q.eu-central-1.amazonaws.com')
  })

  test('discovery probes the profile regions first, EU first for an EMEA identity center, then its own', () => {
    expect(kiroProfileDiscoveryRegions('ap-southeast-2')).toEqual(['us-east-1', 'eu-central-1', 'ap-southeast-2'])
    expect(kiroProfileDiscoveryRegions('eu-north-1')).toEqual(['eu-central-1', 'us-east-1', 'eu-north-1'])
    expect(kiroProfileDiscoveryRegions('us-east-1')).toEqual(['us-east-1', 'eu-central-1'])
    expect(kiroProfileDiscoveryRegions('bad region')).toEqual(['us-east-1', 'eu-central-1'])
  })

  test('the first region with a profile gives the ARN, preferring the one of that region', async () => {
    const { calls, fetch } = scriptedFetch(url =>
      url.startsWith('https://codewhisperer')
        ? Response.json({ profiles: [] })
        : Response.json({ profiles: [{ arn: 'arn:aws:codewhisperer:us-east-1:1:profile/a' }, { arn: 'arn:aws:codewhisperer:eu-central-1:1:profile/b' }] }),
    )
    expect(await discoverKiroProfileArn('tok', 'us-west-2', fetch)).toBe('arn:aws:codewhisperer:eu-central-1:1:profile/b')
    expect(calls[0]!.init.headers).toMatchObject({ 'x-amz-target': 'AmazonCodeWhispererService.ListAvailableProfiles', Authorization: 'Bearer tok' })
    expect(await discoverKiroProfileArn(' ', 'us-east-1', fetch)).toBeUndefined()
  })
})

describe('kiro device flow', () => {
  const config = kiroOAuthConfig()

  test('registers a client, then asks for the device authorization with its credentials', async () => {
    const { calls, fetch } = scriptedFetch(url =>
      url.endsWith('/client/register')
        ? Response.json({ clientId: 'c-1', clientSecret: 's-1' })
        : Response.json({ deviceCode: 'd', userCode: 'U', verificationUri: 'v', verificationUriComplete: 'vc', expiresIn: 600 }),
    )
    const device = await createOAuthFlows({ kiro: createKiroFlow({ config, fetch }) }).requestDeviceCode('kiro', '')
    expect(body(calls[0]!.init)).toEqual({
      clientName: 'kiro-oauth-client',
      clientType: 'public',
      scopes: ['codewhisperer:completions', 'codewhisperer:analysis', 'codewhisperer:conversations'],
      grantTypes: ['urn:ietf:params:oauth:grant-type:device_code', 'refresh_token'],
      issuerUrl: config.issuerUrl,
    })
    expect(body(calls[1]!.init)).toEqual({ clientId: 'c-1', clientSecret: 's-1', startUrl: 'https://view.awsapps.com/start' })
    expect(device).toEqual({
      device_code: 'd', user_code: 'U', verification_uri: 'v', verification_uri_complete: 'vc', expires_in: 600, interval: 5,
      _clientId: 'c-1', _clientSecret: 's-1', _region: 'us-east-1', _authMethod: 'builder-id',
    })
  })

  test('an identity center tenant registers without the issuer and is marked idc', async () => {
    const { calls, fetch } = scriptedFetch(url => (url.endsWith('/client/register') ? Response.json({ clientId: 'c' }) : Response.json({})))
    const idc = { ...config, skipIssuerUrlForRegistration: true }
    const device = (await createOAuthFlows({ kiro: createKiroFlow({ config: idc, fetch }) }).requestDeviceCode('kiro', '')) as Record<string, unknown>
    expect(body(calls[0]!.init).issuerUrl).toBeUndefined()
    expect(device._authMethod).toBe('idc')
  })

  test('the poll refuses a region that is not a region', async () => {
    const { fetch } = scriptedFetch(() => Response.json({}))
    const flows = createOAuthFlows({ kiro: createKiroFlow({ config, fetch }) })
    await expect(flows.pollForToken('kiro', 'd', undefined, { _region: 'evil.com' })).rejects.toThrow('Invalid region')
  })

  test('a pending poll stays pending; a grant carries the client and discovers the profile of an idc account', async () => {
    const answers = [Response.json({ error: 'authorization_pending' }), Response.json({ accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 })]
    const { calls, fetch } = scriptedFetch(url =>
      url.includes('oidc.') ? answers.shift()! : Response.json({ profiles: [{ arn: 'arn:aws:codewhisperer:us-east-1:9:profile/p' }] }),
    )
    const flows = createOAuthFlows({ kiro: createKiroFlow({ config, fetch }) })
    const extra = { _clientId: 'c', _clientSecret: 's', _region: 'eu-north-1', _authMethod: 'idc' }
    expect(await flows.pollForToken('kiro', 'd', undefined, extra)).toEqual({ success: false, error: 'authorization_pending', errorDescription: undefined })
    const granted = await flows.pollForToken('kiro', 'd', undefined, extra)
    expect(calls[1]!.url).toBe('https://oidc.eu-north-1.amazonaws.com/token')
    expect(body(calls[1]!.init)).toEqual({ clientId: 'c', clientSecret: 's', deviceCode: 'd', grantType: 'urn:ietf:params:oauth:grant-type:device_code' })
    expect(granted).toEqual({
      success: true,
      tokens: {
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
        providerSpecificData: { clientId: 'c', clientSecret: 's', region: 'eu-north-1', authMethod: 'idc', profileArn: 'arn:aws:codewhisperer:us-east-1:9:profile/p' },
      },
    })
  })

  test('a builder id account looks for no profile', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ accessToken: 'at' }))
    const granted = await createOAuthFlows({ kiro: createKiroFlow({ config, fetch }) }).pollForToken('kiro', 'd', undefined, {
      _clientId: 'c', _region: 'us-east-1', _authMethod: 'builder-id',
    })
    expect(calls).toHaveLength(1)
    expect(granted.success && granted.tokens.providerSpecificData).toMatchObject({ authMethod: 'builder-id' })
  })
})

describe('kiro social login', () => {
  test('the login URL uses the kiro:// redirect the identity pool allows', () => {
    const url = new URL(createKiroSocialLogin({}).buildLoginUrl('google', 'chal', 'st'))
    expect(url.origin + url.pathname).toBe('https://prod.us-east-1.auth.desktop.kiro.dev/login')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      idp: 'Google',
      redirect_uri: 'kiro://kiro.kiroAgent/authenticate-success',
      code_challenge: 'chal',
      code_challenge_method: 'S256',
      state: 'st',
      prompt: 'select_account',
    })
    expect(new URL(createKiroSocialLogin({}).buildLoginUrl('github', 'c', 's')).searchParams.get('idp')).toBe('Github')
  })

  test('the code is exchanged with the same redirect; an hour when the expiry is missing', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ accessToken: 'a', refreshToken: 'r', profileArn: 'arn' }))
    expect(await createKiroSocialLogin({ fetch }).exchangeCode('code', 'ver')).toEqual({ accessToken: 'a', refreshToken: 'r', profileArn: 'arn', expiresIn: 3600 })
    expect(body(calls[0]!.init)).toEqual({ code: 'code', code_verifier: 'ver', redirect_uri: 'kiro://kiro.kiroAgent/authenticate-success' })
  })

  test('the social poll: progress may come in status; slow_down widens the interval for good', () => {
    expect(classifyKiroSocialPoll(true, 200, { status: 'authorization_pending' })).toEqual({ kind: 'pending', error: 'authorization_pending' })
    expect(classifyKiroSocialPoll(false, 400, { error: 'slow_down' })).toEqual({ kind: 'pending', error: 'slow_down' })
    expect(classifyKiroSocialPoll(false, 700, { error: ' access_denied ' })).toEqual({ kind: 'error', error: 'access_denied', status: 400 })
    expect(classifyKiroSocialPoll(true, 200, {})).toEqual({ kind: 'error', error: 'invalid_token_response', status: 502 })
    expect(classifyKiroSocialPoll(true, 200, { refreshToken: 'r' })).toEqual({ kind: 'success' })
    expect(nextKiroSocialPollInterval(5000, 'slow_down')).toBe(10000)
    expect(nextKiroSocialPollInterval(5000, 'authorization_pending')).toBe(5000)
  })
})

describe('kiro account identity', () => {
  const rows = [
    { id: 'a', authType: 'oauth', email: 'a@x.io', providerSpecificData: { profileArn: 'arn-shared', clientId: 'c-a' } },
    { id: 'b', authType: 'oauth', name: 'Bee', providerSpecificData: { clientId: 'c-b' } },
    { id: 'k', authType: 'apikey', email: 'k@x.io' },
  ]

  test('a shared profile ARN alone does not identify an account', () => {
    expect(findKiroConnectionByIdentity(rows, { authType: 'oauth', profileArn: 'arn-shared' })).toBeNull()
    expect(findKiroConnectionByIdentity(rows, { authType: 'oauth', profileArn: 'arn-shared', email: 'other@x.io' })).toBeNull()
    expect(findKiroConnectionByIdentity(rows, { authType: 'oauth', profileArn: 'arn-shared', email: 'A@x.io' })?.id).toBe('a')
  })

  test('then the client id, the email and the name, within the auth type', () => {
    expect(findKiroConnectionByIdentity(rows, { clientId: 'c-b' })?.id).toBe('b')
    expect(findKiroConnectionByIdentity(rows, { authType: 'oauth', name: ' bee ' })?.id).toBe('b')
    expect(findKiroConnectionByIdentity(rows, { authType: 'oauth', email: 'k@x.io' })).toBeNull()
    expect(findKiroConnectionByIdentity(rows, { email: 'k@x.io' })?.id).toBe('k')
  })
})

describe('cursor', () => {
  test('the imported token maps to a day of validity and its method', async () => {
    const flows = createOAuthFlows({ cursor: createCursorFlow() })
    expect(flows.generateAuthData('cursor', 'r').supported).toBe(false)
    expect(await flows.finalizeTokens('cursor', { accessToken: 'a', machineId: 'm' })).toEqual({
      accessToken: 'a', refreshToken: null, expiresIn: 86400, providerSpecificData: { machineId: 'm', authMethod: 'imported' },
    })
    expect(((await flows.finalizeTokens('cursor', { accessToken: 'a', refreshToken: 'r' })).providerSpecificData as Record<string, unknown>).authMethod).toBe('deep_control')
  })

  test('the login URL carries only the challenge; the verifier stays in the session', async () => {
    let clock = 0
    const login = createCursorLogin({ now: () => clock })
    const session = login.start()
    const url = new URL(session.loginUrl)
    expect(url.origin + url.pathname).toBe('https://cursor.com/loginDeepControl')
    expect(url.searchParams.get('mode')).toBe('login')
    expect(url.searchParams.get('redirectTarget')).toBe('cli')
    expect(session.loginUrl).not.toContain(login.peek(session.sessionId)!.verifier)
    expect(login.view(session.sessionId)).not.toHaveProperty('verifier')
    clock = 15 * 60 * 1000
    expect(login.view(session.sessionId)).toBeNull()
  })

  test('one poll: 404 is pending, tokens are success, anything else an error', async () => {
    const answers = [new Response('', { status: 404 }), Response.json({ accessToken: 'a' }), Response.json({ accessToken: 'a', refreshToken: 'r' }), new Response('x', { status: 500 })]
    const { calls, fetch } = scriptedFetch(() => answers.shift()!)
    const login = createCursorLogin({ fetch })
    expect(await login.pollOnce('u 1', 'v&1')).toEqual({ status: 'pending' })
    expect(calls[0]!.url).toBe('https://api2.cursor.sh/auth/poll?uuid=u%201&verifier=v%261')
    expect(await login.pollOnce('u', 'v')).toEqual({ status: 'error', message: 'Cursor auth response missing tokens' })
    expect(await login.pollOnce('u', 'v')).toEqual({ status: 'ok', accessToken: 'a', refreshToken: 'r' })
    expect(await login.pollOnce('u', 'v')).toEqual({ status: 'error', message: 'Cursor auth poll failed: 500', httpStatus: 500 })
  })

  test('the credentials take the account and the email from the token, and expire five minutes early', () => {
    const credentials = credentialsFromCursorTokens(jwt({ sub: 42, email: 'A@X.io', exp: 2000 }), 'r', () => 0)
    expect(credentials).toEqual({ accessToken: credentials.accessToken, refreshToken: 'r', expiresAt: new Date(2000 * 1000 - 300000), accountId: '42', email: 'a@x.io' })
    expect(credentialsFromCursorTokens('opaque', 'r', () => 1000).expiresAt).toEqual(new Date(1000 + 3600000))
  })

  test('persisting: the same account id updates and clears the error, another creates', () => {
    let ids = 0
    const store = createConnectionStore({ db: new Database(':memory:'), cipher: createFieldCipher('k', () => {}), newId: () => `c${++ids}` })
    const expiresAt = new Date(0)
    persistCursorConnection(store, { accessToken: 'a1', refreshToken: 'r1', expiresAt, accountId: 'acc', authMethod: 'deep_control' })
    store.update('c1', { lastError: 'boom', testStatus: 'error' })
    const again = persistCursorConnection(store, { accessToken: 'a2', refreshToken: 'r2', expiresAt, accountId: 'acc', authMethod: 'deep_control' })
    expect(again!.id).toBe('c1')
    expect([store.getById('c1')!.accessToken, store.getById('c1')!.testStatus, store.getById('c1')!.lastError]).toEqual(['a2', 'active', undefined])
    expect(store.getById('c1')!.providerSpecificData).toMatchObject({ provider: 'Deep Control', accountId: 'acc', userId: 'acc', username: 'acc' })
    persistCursorConnection(store, { accessToken: 'b', refreshToken: 'rb', expiresAt, accountId: 'other', authMethod: 'imported' })
    expect(store.count({ provider: 'cursor' })).toBe(2)
  })
})
