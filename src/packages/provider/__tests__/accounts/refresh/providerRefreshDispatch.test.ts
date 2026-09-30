/**
 * El despacho del refresco por proveedor: cada proveedor va a su ruta con la
 * configuración que declara su variable, un proveedor retirado termina sin
 * llamar a nadie, Google refresca con el cliente que emitió el token, una
 * cuenta de Antigravity sin proyecto lo recupera al refrescar, y un
 * proveedor sin ruta propia usa su extremo de tokens.
 *
 * Porte de `_getAccessTokenInternal` y `supportsTokenRefresh` de
 * `omniroute: open-sse/services/tokenRefresh.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createProjectDiscovery, isUsableProjectId } from '../../../src/accounts/antigravity/projectDiscovery.ts'
import { anthropicOAuthConfig } from '../../../src/accounts/oauth/flows/anthropicFlow.ts'
import { qoderOAuthConfig } from '../../../src/accounts/oauth/flows/qoderFlow.ts'
import { googleBuiltinClients, googleConfiguredClient } from '../../../src/accounts/refresh/googleClients.ts'
import { createProviderRefreshDispatch } from '../../../src/accounts/refresh/providerRefreshDispatch.ts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function scriptedFetch(answer: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input), init)
  }
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls }
}

const form = (init: RequestInit) => Object.fromEntries(new URLSearchParams(String(init.body)))
const tokens = () => json({ access_token: 'at', refresh_token: 'rt2', expires_in: 3600, accessToken: 'at', refreshToken: 'rt2', expiresIn: 3600, token: 'at' })

const ENV = {
  THYROX_CLAUDE_OAUTH_CLIENT_ID: 'claude-client',
  THYROX_CODEX_OAUTH_CLIENT_ID: 'codex-client',
  THYROX_OPENFERENCE_OAUTH_CLIENT_ID: 'of-client',
  THYROX_QODER_OAUTH_CLIENT_ID: 'qoder-client',
  THYROX_QODER_OAUTH_CLIENT_SECRET: 'qoder-secret',
  THYROX_QODER_OAUTH_TOKEN_URL: 'https://qoder.example/token',
  THYROX_GITHUB_OAUTH_CLIENT_ID: 'gh-client',
  THYROX_GITHUB_OAUTH_CLIENT_SECRET: 'gh-secret',
  THYROX_KIMI_CODING_OAUTH_CLIENT_ID: 'kimi-client',
  THYROX_GITLAB_DUO_OAUTH_CLIENT_ID: 'gl-client',
  THYROX_ANTIGRAVITY_OAUTH_CLIENT_ID: 'ag-custom',
  THYROX_ANTIGRAVITY_OAUTH_CLIENT_SECRET: 'ag-custom-secret',
  THYROX_ANTIGRAVITY_BUILTIN_OAUTH_CLIENT_ID: 'ag-builtin',
  THYROX_ANTIGRAVITY_BUILTIN_OAUTH_CLIENT_SECRET: 'ag-builtin-secret',
  THYROX_GEMINI_OAUTH_CLIENT_ID: 'gm-custom',
  THYROX_GEMINI_OAUTH_CLIENT_SECRET: 'gm-custom-secret',
  THYROX_GEMINI_BUILTIN_OAUTH_CLIENT_ID: 'gm-builtin',
  THYROX_GEMINI_BUILTIN_OAUTH_CLIENT_SECRET: 'gm-builtin-secret',
}

const system = { hostname: 'box', release: '6.1.0', type: 'Linux', arch: 'x64' }
const withProject = { projectId: 'p-1' }

describe('Google clients from variables', () => {
  test('the configured and the builtin clients come from their own variables', () => {
    expect(googleConfiguredClient('antigravity', ENV)).toEqual({ clientId: 'ag-custom', clientSecret: 'ag-custom-secret' })
    expect(googleConfiguredClient('agy', ENV)).toEqual({ clientId: 'ag-custom', clientSecret: 'ag-custom-secret' })
    expect(googleConfiguredClient('gemini', ENV)).toEqual({ clientId: 'gm-custom', clientSecret: 'gm-custom-secret' })
    expect(googleBuiltinClients(ENV)).toEqual({ antigravity: { clientId: 'ag-builtin', clientSecret: 'ag-builtin-secret' }, gemini: { clientId: 'gm-builtin', clientSecret: 'gm-builtin-secret' } })
  })

  test('a builtin client needs both halves; a half is no client', () => {
    expect(googleBuiltinClients({ THYROX_ANTIGRAVITY_BUILTIN_OAUTH_CLIENT_ID: 'x' })).toEqual({})
    expect(googleBuiltinClients({ THYROX_GEMINI_BUILTIN_OAUTH_CLIENT_SECRET: 'y' })).toEqual({})
  })
})

describe('provider dispatch', () => {
  test('a deprecated provider ends without a request', async () => {
    const { fetch, calls } = scriptedFetch(tokens)
    const dispatch = createProviderRefreshDispatch({ env: ENV, fetch })
    expect(await dispatch.refresh('gemini-cli', { refreshToken: 'rt' })).toMatchObject({ error: 'unrecoverable_refresh_error', code: 'provider_deprecated', migrateTo: 'gemini' })
    expect(calls).toHaveLength(0)
  })

  test('each provider is refreshed against its own endpoint', async () => {
    const expected: Record<string, string> = {
      claude: anthropicOAuthConfig(ENV).tokenUrl,
      codex: 'https://auth.openai.com/oauth/token',
      openference: 'https://openference.com',
      qoder: qoderOAuthConfig(ENV).tokenUrl as string,
      github: 'https://github.com/login/oauth/access_token',
      kiro: 'https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken',
      'amazon-q': 'https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken',
      cline: 'https://api.cline.bot',
      clinepass: 'https://api.cline.bot',
      'kimi-coding': 'https://auth.kimi.com',
      'gitlab-duo': 'https://gitlab.com/oauth/token',
      'codebuddy-cn': 'https://copilot.tencent.com',
      cursor: 'https://api2.cursor.sh',
      'muse-code': 'https://api.meta.ai',
    }
    for (const [provider, prefix] of Object.entries(expected)) {
      const { fetch, calls } = scriptedFetch(tokens)
      const dispatch = createProviderRefreshDispatch({ env: ENV, fetch, system })
      const refreshToken = provider === 'muse-code' ? 'dca:token' : 'rt'
      await dispatch.refresh(provider, { refreshToken })
      expect({ provider, url: calls[0]?.url.startsWith(prefix) }).toEqual({ provider, url: true })
    }
  })

  test('the client of each provider comes from its variable', async () => {
    const { fetch, calls } = scriptedFetch(tokens)
    const dispatch = createProviderRefreshDispatch({ env: ENV, fetch, system })
    await dispatch.refresh('codex', { refreshToken: 'rt' })
    await dispatch.refresh('github', { refreshToken: 'rt' })
    await dispatch.refresh('kimi-coding', { refreshToken: 'rt' })
    expect(form(calls[0].init).client_id).toBe('codex-client')
    expect(form(calls[1].init)).toMatchObject({ client_id: 'gh-client', client_secret: 'gh-secret' })
    expect(form(calls[2].init).client_id).toBe('kimi-client')
  })

  test('connection data reaches the providers that read it', async () => {
    const { fetch, calls } = scriptedFetch(tokens)
    const dispatch = createProviderRefreshDispatch({ env: ENV, fetch, system })
    await dispatch.refresh('gitlab-duo', { refreshToken: 'rt', providerSpecificData: { baseUrl: 'https://gitlab.acme.test' } })
    await dispatch.refresh('kiro', { refreshToken: 'rt', providerSpecificData: { clientId: 'c', clientSecret: 's', region: 'eu-west-1' } })
    await dispatch.refresh('kimi-coding', { refreshToken: 'rt', providerSpecificData: { deviceId: 'abcdef0123456789abcdef0123456789' } })
    expect(calls[0].url).toBe('https://gitlab.acme.test/oauth/token')
    expect(calls[1].url).toBe('https://oidc.eu-west-1.amazonaws.com/token')
    expect((calls[2].init.headers as Record<string, string>)['X-Msh-Device-Id']).toBe('abcdef01-2345-6789-abcd-ef0123456789')
    expect((calls[2].init.headers as Record<string, string>)['X-Msh-Device-Name']).toBe('box')
  })

  test('a cursor connection without a refresh token is dead without a request', async () => {
    const { fetch, calls } = scriptedFetch(tokens)
    expect(await createProviderRefreshDispatch({ env: ENV, fetch }).refresh('cursor', { refreshToken: '' })).toEqual({ error: 'unrecoverable_refresh_error', code: 'no_refresh_token' })
    expect(calls).toHaveLength(0)
  })

  test('a missing client variable is named, not replaced by a foreign client', async () => {
    const dispatch = createProviderRefreshDispatch({ env: {}, fetch: scriptedFetch(tokens).fetch })
    await expect(dispatch.refresh('codex', { refreshToken: 'rt' })).rejects.toThrow('THYROX_CODEX_OAUTH_CLIENT_ID')
    await expect(dispatch.refresh('agy', { refreshToken: 'rt', providerSpecificData: { ...withProject, oauthClient: 'builtin' } })).rejects.toThrow('THYROX_ANTIGRAVITY_BUILTIN_OAUTH_CLIENT_ID')
    await expect(dispatch.refresh('gemini', { refreshToken: 'rt' })).rejects.toThrow('THYROX_GEMINI_BUILTIN_OAUTH_CLIENT_ID')
  })

  test('an unknown provider uses its token endpoint, or nothing', async () => {
    const { fetch, calls } = scriptedFetch(tokens)
    const dispatch = createProviderRefreshDispatch({ env: ENV, fetch, genericEndpoint: provider => (provider === 'acme' ? { tokenUrl: 'https://acme.example/token', clientId: 'acme-client' } : null) })
    expect(await dispatch.refresh('acme', { refreshToken: 'rt' })).toEqual({ accessToken: 'at', refreshToken: 'rt2', expiresIn: 3600 })
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: 'rt', client_id: 'acme-client' })
    expect(await dispatch.refresh('nobody', { refreshToken: 'rt' })).toBeNull()
    expect(calls).toHaveLength(1)
  })
})

describe('Google refresh client', () => {
  const googleRefresh = async (provider: string, oauthClient?: string) => {
    const { fetch, calls } = scriptedFetch(tokens)
    await createProviderRefreshDispatch({ env: ENV, fetch }).refresh(provider, { refreshToken: 'rt', providerSpecificData: { ...withProject, oauthClient } })
    return form(calls[0].init)
  }

  test('a token issued by the configured client refreshes with it', async () => {
    expect(await googleRefresh('antigravity', 'custom:ag-custom')).toMatchObject({ client_id: 'ag-custom', client_secret: 'ag-custom-secret' })
    expect(await googleRefresh('gemini', 'custom:gm-custom')).toMatchObject({ client_id: 'gm-custom', client_secret: 'gm-custom-secret' })
  })

  test('any other token refreshes with the builtin client of its family', async () => {
    expect(await googleRefresh('agy', 'builtin')).toMatchObject({ client_id: 'ag-builtin', client_secret: 'ag-builtin-secret' })
    expect(await googleRefresh('antigravity', 'custom:someone-else')).toMatchObject({ client_id: 'ag-builtin' })
    expect(await googleRefresh('gemini')).toMatchObject({ client_id: 'gm-builtin', client_secret: 'gm-builtin-secret' })
  })
})

describe('Antigravity project recovery', () => {
  const googleTokens = () => json({ access_token: 'at', refresh_token: 'rt2', expires_in: 3600 })

  function recover(credentials: Record<string, unknown>, discovered: string | Error = 'proj-found', provider = 'antigravity') {
    const { fetch } = scriptedFetch(googleTokens)
    const discoveries: string[] = []
    const persisted: unknown[][] = []
    const warnings: string[] = []
    const dispatch = createProviderRefreshDispatch({
      env: ENV,
      fetch,
      log: { warn: (_tag, message) => void warnings.push(message), info: () => {} },
      discoverProject: async accessToken => {
        discoveries.push(accessToken)
        if (discovered instanceof Error) throw discovered
        return discovered
      },
      persistProjectId: async (...args) => void persisted.push(args),
    })
    return { result: dispatch.refresh(provider, { refreshToken: 'rt', ...credentials }), discoveries, persisted, warnings }
  }

  test('an account without a project recovers it with the new access token and saves it', async () => {
    const { result, discoveries, persisted } = recover({ connectionId: 'c-1', providerSpecificData: { oauthClient: 'builtin', tier: 'free' } })
    expect(await result).toEqual({ accessToken: 'at', refreshToken: 'rt2', expiresIn: 3600, projectId: 'proj-found', providerSpecificData: { oauthClient: 'builtin', tier: 'free', projectId: 'proj-found' } })
    expect(discoveries).toEqual(['at'])
    expect(persisted).toEqual([['c-1', 'proj-found', { oauthClient: 'builtin', tier: 'free' }]])
  })

  test('agy recovers too; without a connection nothing is saved', async () => {
    const { result, persisted } = recover({ providerSpecificData: { oauthClient: 'builtin' } }, 'proj-found', 'agy')
    expect(await result).toMatchObject({ projectId: 'proj-found' })
    expect(persisted).toEqual([])
  })

  test('a known or manual project, or gemini, is not rediscovered', async () => {
    for (const credentials of [{ projectId: 'p-col', providerSpecificData: { oauthClient: 'builtin' } }, { providerSpecificData: { oauthClient: 'builtin', projectId: 'p-psd' } }, { providerSpecificData: { oauthClient: 'builtin', isProjectIdManual: true } }]) {
      const { result, discoveries } = recover(credentials)
      expect(await result).toEqual({ accessToken: 'at', refreshToken: 'rt2', expiresIn: 3600 })
      expect(discoveries).toEqual([])
    }
    const { result, discoveries } = recover({ providerSpecificData: { oauthClient: 'builtin' } }, 'proj', 'gemini')
    expect(await result).toEqual({ accessToken: 'at', refreshToken: 'rt2', expiresIn: 3600 })
    expect(discoveries).toEqual([])
  })

  test('a blank project is not usable, and a failed discovery keeps the fresh tokens', async () => {
    const blank = recover({ connectionId: 'c-1', providerSpecificData: { oauthClient: 'builtin', projectId: '  ' } }, '  ')
    expect(await blank.result).toEqual({ accessToken: 'at', refreshToken: 'rt2', expiresIn: 3600 })
    expect(blank.discoveries).toEqual(['at'])
    expect(blank.persisted).toEqual([])
    const failed = recover({ providerSpecificData: { oauthClient: 'builtin' } }, new Error('loadCodeAssist down'))
    expect(await failed.result).toEqual({ accessToken: 'at', refreshToken: 'rt2', expiresIn: 3600 })
    expect(failed.warnings).toEqual(['Antigravity projectId discovery failed: loadCodeAssist down'])
  })

  test('a failed refresh is not followed by a discovery', async () => {
    const { fetch } = scriptedFetch(() => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }))
    const discoveries: string[] = []
    const dispatch = createProviderRefreshDispatch({ env: ENV, fetch, discoverProject: async token => (discoveries.push(token), 'p') })
    expect(await dispatch.refresh('antigravity', { refreshToken: 'rt', providerSpecificData: { oauthClient: 'builtin' } })).toEqual({ error: 'unrecoverable_refresh_error', code: 'invalid_grant' })
    expect(discoveries).toEqual([])
  })

  test('by default the project is discovered through Code Assist with the connection profile', async () => {
    const { fetch, calls } = scriptedFetch(url => (url.includes('loadCodeAssist') ? json({ cloudaicompanionProject: 'proj-ca', allowedTiers: [] }) : url.includes('onboardUser') ? json({ done: true }) : googleTokens()))
    const dispatch = createProviderRefreshDispatch({ env: ENV, fetch, sleep: async () => {}, platform: ['linux', 'x64'] })
    expect(await dispatch.refresh('agy', { refreshToken: 'rt', providerSpecificData: { oauthClient: 'builtin', clientProfile: 'cli' } })).toMatchObject({ projectId: 'proj-ca' })
    const load = calls.find(call => call.url.includes('loadCodeAssist'))!
    expect((load.init.headers as Record<string, string>).Authorization).toBe('Bearer at')
    expect((load.init.headers as Record<string, string>)['X-Goog-Api-Client']).toBeUndefined()
  })

  test('a usable project id is non-blank text', () => {
    expect(isUsableProjectId('p')).toBe(true)
    for (const value of ['', '   ', null, undefined, 7]) expect(isUsableProjectId(value)).toBe(false)
    expect(typeof createProjectDiscovery({ profile: 'ide' }).discover).toBe('function')
  })
})

describe('supported providers', () => {
  test('the providers with their own route are supported; the rest need a token endpoint', () => {
    const dispatch = createProviderRefreshDispatch({ env: ENV, genericEndpoint: provider => (provider === 'acme' ? { tokenUrl: 'https://acme.example/token' } : provider === 'bare' ? {} : null) })
    for (const provider of ['gemini', 'antigravity', 'agy', 'claude', 'codex', 'openference', 'qoder', 'github', 'kiro', 'amazon-q', 'cline', 'kimi-coding', 'muse-code', 'gitlab-duo', 'codebuddy-cn', 'cursor']) expect({ provider, supported: dispatch.supportsTokenRefresh(provider) }).toEqual({ provider, supported: true })
    expect(dispatch.supportsTokenRefresh('acme')).toBe(true)
    for (const provider of ['devin-desktop', 'devin-cli', 'bare', 'gemini-cli']) expect({ provider, supported: dispatch.supportsTokenRefresh(provider) }).toEqual({ provider, supported: false })
  })
})
