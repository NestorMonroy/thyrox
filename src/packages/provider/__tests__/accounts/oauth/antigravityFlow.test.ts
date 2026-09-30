/**
 * El flujo OAuth de `antigravity` y `agy`: la cuenta de Google, el proyecto
 * de Cloud Code que se descubre (u onboarda) después del intercambio, la
 * marca de cuenta degradada cuando no hay proyecto, la identidad de cliente
 * con que se presenta y la redirección pública de un despliegue remoto.
 *
 * Porte de `omniroute: src/lib/oauth/providers/antigravity.ts`, `agy.ts`,
 * `antigravityProjectGate.ts`, `resolveBrowserOAuthRedirectUri` de
 * `providers.ts`, `open-sse/services/antigravityHeaders.ts`,
 * `antigravityVersion.ts`, `codeAssistSubscription.ts`,
 * `open-sse/config/antigravityUpstream.ts` y
 * `src/shared/constants/antigravityClientProfile.ts` (MIT).
 */
import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'

import {
  antigravityCliUserAgent,
  antigravityIdeNodeUserAgent,
  antigravityIdeUserAgent,
  loadCodeAssistMetadata,
  normalizeClientProfile,
} from '../../../src/accounts/antigravity/clientIdentity.ts'
import { createClientVersions } from '../../../src/accounts/antigravity/clientVersion.ts'
import { codeAssistOnboardTierId, codeAssistSubscriptionTier } from '../../../src/accounts/antigravity/codeAssistTier.ts'
import { createConnectionStore } from '../../../src/accounts/connectionStore.ts'
import { createFieldCipher } from '../../../src/accounts/fieldCipher.ts'
import { degradedProjectState } from '../../../src/accounts/oauth/antigravityProjectGate.ts'
import { resolveBrowserRedirectUri } from '../../../src/accounts/oauth/browserRedirect.ts'
import { antigravityOAuthConfig, createAntigravityFlow } from '../../../src/accounts/oauth/flows/antigravityFlow.ts'
import { createOAuthFlows } from '../../../src/accounts/oauth/oauthFlows.ts'
import { persistOAuthConnection } from '../../../src/accounts/oauth/oauthPersistence.ts'

const credentials = { THYROX_ANTIGRAVITY_OAUTH_CLIENT_ID: 'g-client', THYROX_ANTIGRAVITY_OAUTH_CLIENT_SECRET: 'g-secret' }

type Answer = Response | Error
function scriptedFetch(routes: Record<string, Answer[]>) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input)
    calls.push({ url, init })
    const key = Object.keys(routes).find(prefix => url.includes(prefix))
    const answer = key ? routes[key]!.shift() : undefined
    if (!answer) throw new Error(`unexpected ${url}`)
    if (answer instanceof Error) throw answer
    return answer
  }
  return { calls, fetch: fetch as typeof globalThis.fetch }
}

describe('client identity', () => {
  test('the profile is ide or cli; the old synthetic names read as cli', () => {
    expect(normalizeClientProfile(' CLI ')).toBe('cli')
    expect(normalizeClientProfile('harness')).toBe('cli')
    expect(normalizeClientProfile('sdk')).toBe('cli')
    expect(normalizeClientProfile('other')).toBe('ide')
  })

  test('user agents pin the desktop platform token', () => {
    expect(antigravityIdeUserAgent('2.1.1')).toBe('antigravity/ide/2.1.1 darwin/arm64')
    expect(antigravityCliUserAgent('1.1.5')).toBe(
      'antigravity/cli/1.1.5 (aidev_client; os_type=darwin; arch=arm64; auth_method=consumer)',
    )
    expect(antigravityIdeNodeUserAgent('2.1.1')).toBe('antigravity/2.1.1 darwin/arm64 google-api-nodejs-client/10.3.0')
  })

  test('the metadata carries numeric enums for the host platform', () => {
    expect(loadCodeAssistMetadata('linux', 'x64')).toEqual({ ideType: 9, platform: 3, pluginType: 2 })
    expect(loadCodeAssistMetadata('darwin', 'arm64').platform).toBe(2)
    expect(loadCodeAssistMetadata('win32', 'x64').platform).toBe(5)
    expect(loadCodeAssistMetadata('freebsd', 'x64').platform).toBe(0)
  })
})

describe('client version', () => {
  test('the newest release wins over the fallback, and is cached', async () => {
    const { calls, fetch } = scriptedFetch({
      'antigravity-auto-updater': [Response.json([{ version: '2.3.0' }, { version: 'v2.10.1' }, { version: 'bad' }])],
      'antigravity-cli/releases/latest': [Response.json({ tag_name: 'v1.0.0' })],
    })
    const versions = createClientVersions({ fetch, now: () => 1000 })
    expect(versions.cachedIde()).toBe('2.1.1')
    expect(await versions.resolveIde()).toBe('2.10.1')
    expect(await versions.resolveIde()).toBe('2.10.1')
    expect(calls).toHaveLength(1)
    expect(versions.cachedIde()).toBe('2.10.1')
    expect(await versions.resolveCli()).toBe('1.1.5')
  })

  test('an unreachable feed keeps the fallback and is retried next time', async () => {
    const { calls, fetch } = scriptedFetch({ 'antigravity-auto-updater': [new Error('down'), Response.json([{ version: '9.0.0' }])] })
    const versions = createClientVersions({ fetch, now: () => 0 })
    expect(await versions.resolveIde()).toBe('2.1.1')
    expect(await versions.resolveIde()).toBe('9.0.0')
    expect(calls).toHaveLength(2)
  })

  test('the cache expires after six hours', async () => {
    let clock = 0
    const { calls, fetch } = scriptedFetch({ 'antigravity-auto-updater': [Response.json([{ version: '3.0.0' }]), Response.json([{ version: '3.0.1' }])] })
    const versions = createClientVersions({ fetch, now: () => clock })
    await versions.resolveIde()
    clock = 6 * 60 * 60 * 1000 - 1
    expect(await versions.resolveIde()).toBe('3.0.0')
    clock += 1
    expect(await versions.resolveIde()).toBe('3.0.1')
    expect(calls).toHaveLength(2)
  })
})

describe('code assist tier', () => {
  test('onboarding tier: paid, then current if eligible, then the default allowed one, then legacy', () => {
    expect(codeAssistOnboardTierId({ paidTier: { id: 'paid' }, currentTier: { id: 'cur' } })).toBe('paid')
    expect(codeAssistOnboardTierId({ currentTier: { id: 'cur' } })).toBe('cur')
    expect(
      codeAssistOnboardTierId({ ineligibleTiers: [{}], currentTier: { id: 'cur' }, allowedTiers: [{ id: 'a' }, { id: 'def', isDefault: true }] }),
    ).toBe('def')
    expect(codeAssistOnboardTierId({ ineligibleTiers: [{}], currentTier: { id: 'cur' } })).toBe('cur')
    expect(codeAssistOnboardTierId({})).toBe('legacy-tier')
  })

  test('display tier: a restricted account shows its default as restricted', () => {
    expect(codeAssistSubscriptionTier({ paidTier: { name: 'Pro' } })).toBe('Pro')
    expect(codeAssistSubscriptionTier({ ineligibleTiers: [{}], allowedTiers: [{ name: 'Free', isDefault: true }] })).toBe('Free (Restricted)')
    expect(codeAssistSubscriptionTier({})).toBeNull()
  })
})

describe('antigravity flow', () => {
  const versions = { cachedIde: () => '2.1.1', cachedCli: () => '1.1.5' }
  const noWait = async () => {}
  const flowsWith = (fetch: typeof globalThis.fetch, profile: 'ide' | 'cli' = 'ide') =>
    createOAuthFlows({
      antigravity: createAntigravityFlow({ config: antigravityOAuthConfig(credentials), profile, fetch, versions, sleep: noWait, platform: ['linux', 'x64'] }),
    })

  test('the authorize URL asks for offline consent, without PKCE', () => {
    const data = flowsWith(fetch).generateAuthData('antigravity', 'http://127.0.0.1:9/callback')
    const url = new URL(data.authUrl!)
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    expect(url.searchParams.get('client_id')).toBe('g-client')
    expect(url.searchParams.has('code_challenge')).toBe(false)
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/cloud-platform')
  })

  test('without the client secret the flow refuses by naming it', async () => {
    const flows = createOAuthFlows({
      antigravity: createAntigravityFlow({ config: antigravityOAuthConfig({ THYROX_ANTIGRAVITY_OAUTH_CLIENT_ID: 'x' }), profile: 'ide' }),
    })
    await expect(flows.exchangeTokens('antigravity', 'c', 'r', 'v', 's')).rejects.toThrow('THYROX_ANTIGRAVITY_OAUTH_CLIENT_SECRET is not set')
  })

  test('an account with a project: exchange with the secret, discover the project, record the issuing client', async () => {
    const { calls, fetch } = scriptedFetch({
      'oauth2.googleapis.com/token': [Response.json({ access_token: 'at', refresh_token: 'rt', expires_in: 3599, scope: 's' })],
      userinfo: [Response.json({ email: 'a@g.com' })],
      loadCodeAssist: [Response.json({ cloudaicompanionProject: { id: 'proj-1' }, paidTier: { id: 'standard-tier' } })],
      onboardUser: [Response.json({ done: true })],
    })
    const tokens = await flowsWith(fetch).exchangeTokens('antigravity', 'code', 'http://127.0.0.1:9/callback', 'v', 's')
    expect(Object.fromEntries(new URLSearchParams(String(calls[0]!.init.body)))).toEqual({
      grant_type: 'authorization_code',
      client_id: 'g-client',
      code: 'code',
      redirect_uri: 'http://127.0.0.1:9/callback',
      client_secret: 'g-secret',
    })
    expect((calls[0]!.init.headers as Record<string, string>)['User-Agent']).toBe(antigravityIdeNodeUserAgent('2.1.1'))
    const load = calls.find(call => call.url.includes('loadCodeAssist'))!
    expect(load.url).toBe('https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist')
    expect(JSON.parse(String(load.init.body))).toEqual({ metadata: { ideType: 9, platform: 3, pluginType: 2 } })
    expect((load.init.headers as Record<string, string>)['X-Goog-Api-Client']).toBe('gl-node/22.21.1')
    expect(tokens).toEqual({
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 3599,
      scope: 's',
      email: 'a@g.com',
      projectId: 'proj-1',
      projectDiscoveryOutcome: undefined,
      providerSpecificData: { clientProfile: 'ide', projectId: 'proj-1', tier: 'standard-tier', oauthClient: 'custom:g-client', autoSync: true },
    })
  })

  test('the cli profile presents the cli identity to the content endpoints', async () => {
    const { calls, fetch } = scriptedFetch({
      'oauth2.googleapis.com/token': [Response.json({ access_token: 'at' })],
      userinfo: [new Error('offline')],
      loadCodeAssist: [Response.json({ cloudaicompanionProject: 'proj-2' })],
      onboardUser: [Response.json({ done: true })],
    })
    const tokens = await flowsWith(fetch, 'cli').exchangeTokens('antigravity', 'c', 'r', 'v', 's')
    expect((calls[0]!.init.headers as Record<string, string>)['User-Agent']).toBe(antigravityCliUserAgent('1.1.5'))
    expect((calls.find(c => c.url.includes('loadCodeAssist'))!.init.headers as Record<string, string>)['User-Agent']).toBe(
      antigravityCliUserAgent('1.1.5'),
    )
    expect(tokens.email).toBeUndefined()
    expect(tokens.projectId).toBe('proj-2')
  })

  test('no project: one inline onboarding, then discovery; an empty retry means bring your own project', async () => {
    const { fetch } = scriptedFetch({
      'oauth2.googleapis.com/token': [Response.json({ access_token: 'at' })],
      userinfo: [Response.json({})],
      loadCodeAssist: [Response.json({ currentTier: { id: 'free-tier' } }), Response.json({})],
      onboardUser: [Response.json({ done: true })],
    })
    const tokens = await flowsWith(fetch).exchangeTokens('antigravity', 'c', 'r', 'v', 's')
    expect(tokens.projectId).toBe('')
    expect(tokens.projectDiscoveryOutcome).toBe('requires_manual_project')
  })

  test('a project created after the onboarding is found by the second discovery', async () => {
    const { fetch } = scriptedFetch({
      'oauth2.googleapis.com/token': [Response.json({ access_token: 'at' })],
      userinfo: [Response.json({})],
      loadCodeAssist: [Response.json({}), Response.json({ cloudaicompanionProject: 'created-late' })],
      onboardUser: [Response.json({ done: true })],
    })
    const tokens = await flowsWith(fetch).exchangeTokens('antigravity', 'c', 'r', 'v', 's')
    expect([tokens.projectId, tokens.projectDiscoveryOutcome]).toEqual(['created-late', undefined])
  })

  test('no project in discovery but one in the onboarding answer: it is taken', async () => {
    const { fetch } = scriptedFetch({
      'oauth2.googleapis.com/token': [Response.json({ access_token: 'at' })],
      userinfo: [Response.json({})],
      loadCodeAssist: [Response.json({}), Response.json({})],
      onboardUser: [Response.json({ response: {}, cloudaicompanionProject: { id: 'from-onboard' } })],
    })
    expect((await flowsWith(fetch).exchangeTokens('antigravity', 'c', 'r', 'v', 's')).projectId).toBe('from-onboard')
  })

  test('discovery and onboarding both failing is a failed discovery, not a manual project', async () => {
    const { fetch } = scriptedFetch({
      'oauth2.googleapis.com/token': [Response.json({ access_token: 'at' })],
      userinfo: [Response.json({})],
      loadCodeAssist: [new Response('nope', { status: 403 })],
      onboardUser: [new Response('nope', { status: 403 })],
    })
    expect((await flowsWith(fetch).exchangeTokens('antigravity', 'c', 'r', 'v', 's')).projectDiscoveryOutcome).toBe('discovery_failed')
  })

  test('background onboarding of an account with a project is bounded', async () => {
    const answers = Array.from({ length: 5 }, () => Response.json({ done: false }))
    const { calls, fetch } = scriptedFetch({
      'oauth2.googleapis.com/token': [Response.json({ access_token: 'at' })],
      userinfo: [Response.json({})],
      loadCodeAssist: [Response.json({ cloudaicompanionProject: 'p' })],
      onboardUser: answers,
    })
    const waits: number[] = []
    const flows = createOAuthFlows({
      antigravity: createAntigravityFlow({
        config: antigravityOAuthConfig(credentials),
        profile: 'ide',
        fetch,
        versions,
        sleep: async ms => void waits.push(ms),
        random: () => 0.5,
        platform: ['linux', 'x64'],
      }),
    })
    await flows.exchangeTokens('antigravity', 'c', 'r', 'v', 's')
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(calls.filter(call => call.url.includes('onboardUser'))).toHaveLength(3)
    expect(waits).toEqual([5000, 5000, 5000])
  })
})

describe('degraded project', () => {
  test('only the Google providers without a project are degraded', () => {
    expect(degradedProjectState('codex', {})).toBeNull()
    expect(degradedProjectState('antigravity', { providerSpecificData: { projectId: ' p ' } })).toBeNull()
    expect(degradedProjectState('agy', { projectDiscoveryOutcome: 'discovery_failed' })!.lastError).toContain('could not be discovered')
    const byop = degradedProjectState('antigravity', {})!
    expect([byop.testStatus, byop.errorCode, byop.lastErrorType]).toEqual(['degraded', 'missing_project_id', 'oauth_missing_project_id'])
    expect(byop.lastError).toContain('BYOP')
  })

  test('persisting a login without a project stores it degraded; a later one with a project restores it', () => {
    let ids = 0
    const store = createConnectionStore({ db: new Database(':memory:'), cipher: createFieldCipher('k', () => {}), newId: () => `c${++ids}` })
    const first = persistOAuthConnection(store, 'antigravity', { email: 'a@g.com', accessToken: 'at', projectId: '' })
    expect([first!.testStatus, first!.errorCode]).toEqual(['degraded', 'missing_project_id'])
    const second = persistOAuthConnection(store, 'antigravity', { email: 'a@g.com', accessToken: 'at2', projectId: 'p-1' })
    expect(second!.testStatus).toBe('active')
    expect(store.getById('c1')!.errorCode).toBeUndefined()
  })
})

describe('browser redirect', () => {
  const custom = { ...credentials, THYROX_PUBLIC_BASE_URL: 'https://proxy.example/' }

  test('a Google provider with operator credentials and a public URL moves the loopback redirect there', () => {
    expect(resolveBrowserRedirectUri('antigravity', 'http://127.0.0.1:20128/callback?x=1', custom)).toBe('https://proxy.example/callback?x=1')
    expect(resolveBrowserRedirectUri('agy', 'http://localhost:9/', custom)).toBe('https://proxy.example/callback')
  })

  test('anything else is left as it is', () => {
    expect(resolveBrowserRedirectUri('codex', 'http://127.0.0.1:1/callback', custom)).toBe('http://127.0.0.1:1/callback')
    expect(resolveBrowserRedirectUri('antigravity', 'http://127.0.0.1:1/callback', credentials)).toBe('http://127.0.0.1:1/callback')
    expect(resolveBrowserRedirectUri('antigravity', 'http://127.0.0.1:1/callback', { THYROX_PUBLIC_BASE_URL: 'https://p' })).toBe(
      'http://127.0.0.1:1/callback',
    )
    expect(resolveBrowserRedirectUri('antigravity', 'https://public.example/callback', custom)).toBe('https://public.example/callback')
    expect(resolveBrowserRedirectUri('antigravity', 'not a url', custom)).toBe('not a url')
  })
})
