/**
 * Los flujos OAuth de GitHub Copilot (device code, en github.com o en un
 * GitHub Enterprise) y de GitLab Duo (código con PKCE): la petición del código
 * de dispositivo, el sondeo, el token de Copilot y el usuario que se leen
 * después, y el acceso directo de GitLab.
 *
 * Porte de `omniroute: src/lib/oauth/providers/github.ts`, `ghe-copilot.ts`,
 * `gitlab-duo.ts`, `src/lib/oauth/gitlab.ts` y de la versión de Copilot de
 * `open-sse/config/providerHeaderProfiles.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { copilotChatUserAgent } from '../../../src/accounts/oauth/flows/copilotIdentity.ts'
import { createGheCopilotFlow, gheCopilotOAuthConfig } from '../../../src/accounts/oauth/flows/gheCopilotFlow.ts'
import { createGithubFlow, githubOAuthConfig } from '../../../src/accounts/oauth/flows/githubFlow.ts'
import { createGitlabDuoFlow, gitlabDuoOAuthConfig, parseGitlabDirectAccess } from '../../../src/accounts/oauth/flows/gitlabDuoFlow.ts'
import { createOAuthFlows } from '../../../src/accounts/oauth/oauthFlows.ts'

function scriptedFetch(answer: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input), init)
  }
  return { calls, fetch: fetch as typeof globalThis.fetch }
}

const form = (init: RequestInit) => Object.fromEntries(new URLSearchParams(String(init.body)))
const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name]

describe('copilot identity', () => {
  test('the chat user agent carries the pinned version, or a safe override', () => {
    expect(copilotChatUserAgent({})).toBe('GitHubCopilotChat/1.0.88')
    expect(copilotChatUserAgent({ THYROX_GITHUB_COPILOT_CLI_VERSION: ' 1.2.3 ' })).toBe('GitHubCopilotChat/1.2.3')
    expect(copilotChatUserAgent({ THYROX_GITHUB_COPILOT_CLI_VERSION: '1.0; rm -rf' })).toBe('GitHubCopilotChat/1.0.88')
  })
})

describe('github', () => {
  const config = githubOAuthConfig({ THYROX_GITHUB_OAUTH_CLIENT_ID: 'gh-client' })

  test('without the client id the device request refuses by naming it', async () => {
    const flows = createOAuthFlows({ github: createGithubFlow({ config: githubOAuthConfig({}) }) })
    await expect(flows.requestDeviceCode('github', '')).rejects.toThrow('THYROX_GITHUB_OAUTH_CLIENT_ID is not set')
  })

  test('the device code is requested with the client and the scope', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ device_code: 'd', user_code: 'U-1', verification_uri: 'https://github.com/login/device' }))
    const flows = createOAuthFlows({ github: createGithubFlow({ config, fetch }) })
    expect(await flows.requestDeviceCode('github', '')).toMatchObject({ user_code: 'U-1' })
    expect(calls[0]!.url).toBe('https://github.com/login/device/code')
    expect(form(calls[0]!.init)).toEqual({ client_id: 'gh-client', scope: 'read:user' })
  })

  test('a refused device request carries the upstream text', async () => {
    const { fetch } = scriptedFetch(() => new Response('slow down', { status: 429 }))
    await expect(createOAuthFlows({ github: createGithubFlow({ config, fetch }) }).requestDeviceCode('github', '')).rejects.toThrow(
      'Device code request failed: slow down',
    )
  })

  test('an HTML answer to the poll is an error, not a crash', async () => {
    const { fetch } = scriptedFetch(() => new Response('<html>oops</html>', { status: 502 }))
    expect(await createOAuthFlows({ github: createGithubFlow({ config, fetch }) }).pollForToken('github', 'd')).toEqual({
      success: false,
      error: 'invalid_response',
      errorDescription: '<html>oops</html>',
    })
  })

  test('a granted poll reads the Copilot token and the user', async () => {
    const { calls, fetch } = scriptedFetch(url => {
      if (url.endsWith('/login/oauth/access_token')) return Response.json({ access_token: 'gho', expires_in: 28800 })
      if (url.includes('copilot_internal')) return Response.json({ token: 'tid=1', expires_at: 1900000000 })
      return Response.json({ id: 7, login: 'ann', name: 'Ann', email: 'a@x.io' })
    })
    const flows = createOAuthFlows({ github: createGithubFlow({ config, fetch, env: {} }) })
    const result = await flows.pollForToken('github', 'dev-1')
    expect(form(calls[0]!.init)).toEqual({ client_id: 'gh-client', device_code: 'dev-1', grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
    expect(calls[1]!.url).toBe('https://api.github.com/copilot_internal/v2/token')
    expect(header(calls[1]!.init, 'X-GitHub-Api-Version')).toBe('2026-08-01')
    expect(header(calls[1]!.init, 'User-Agent')).toBe('GitHubCopilotChat/1.0.88')
    expect(result).toEqual({
      success: true,
      tokens: {
        accessToken: 'gho',
        refreshToken: undefined,
        expiresIn: 28800,
        providerSpecificData: {
          autoSync: true,
          copilotToken: 'tid=1',
          copilotTokenExpiresAt: 1900000000,
          githubUserId: 7,
          githubLogin: 'ann',
          githubName: 'Ann',
          githubEmail: 'a@x.io',
        },
      },
    })
  })
})

describe('github enterprise copilot', () => {
  test('the client id prefers its own variable over the github one', () => {
    expect(gheCopilotOAuthConfig({ THYROX_GITHUB_OAUTH_CLIENT_ID: 'gh', THYROX_GHE_COPILOT_OAUTH_CLIENT_ID: 'ghe' }).clientId).toBe('ghe')
    expect(gheCopilotOAuthConfig({ THYROX_GITHUB_OAUTH_CLIENT_ID: 'gh' }).clientId).toBe('gh')
  })

  test('every endpoint is derived from the enterprise host, which is required', async () => {
    const { calls, fetch } = scriptedFetch(url => {
      if (url.endsWith('/login/oauth/access_token')) return Response.json({ access_token: 'ghu' })
      if (url.includes('copilot_internal')) {
        return Response.json({ token: 't', endpoints: { api: 'https://api.ghe.example', proxy: 'https://proxy.ghe.example' } })
      }
      return Response.json({ login: 'bob' })
    })
    const config = gheCopilotOAuthConfig({ THYROX_GITHUB_OAUTH_CLIENT_ID: 'gh' })
    const flows = createOAuthFlows({ 'ghe-copilot': createGheCopilotFlow({ config, fetch }) })
    await expect(flows.requestDeviceCode('ghe-copilot', '')).rejects.toThrow('gheUrl is required')
    const result = await flows.pollForToken('ghe-copilot', 'd', undefined, { gheUrl: 'https://ghe.example/ ' })
    expect(calls.map(call => call.url)).toEqual([
      'https://ghe.example/login/oauth/access_token',
      'https://ghe.example/api/v3/copilot_internal/v2/token',
      'https://ghe.example/api/v3/user',
    ])
    expect(result.success && result.tokens.providerSpecificData).toMatchObject({
      gheUrl: 'https://ghe.example/ ',
      copilotApiUrl: 'https://api.ghe.example',
      copilotProxyUrl: 'https://proxy.ghe.example',
      githubLogin: 'bob',
    })
  })

  test('the device request goes to the enterprise host from the per-login config', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ device_code: 'd' }))
    const flows = createOAuthFlows({
      'ghe-copilot': createGheCopilotFlow({ config: gheCopilotOAuthConfig({ THYROX_GITHUB_OAUTH_CLIENT_ID: 'gh' }), fetch }),
    })
    await flows.requestDeviceCode('ghe-copilot', '', { ...gheCopilotOAuthConfig({ THYROX_GITHUB_OAUTH_CLIENT_ID: 'gh' }), gheUrl: 'https://ghe.example' })
    expect(calls[0]!.url).toBe('https://ghe.example/login/device/code')
  })
})

describe('gitlab duo', () => {
  test('client id, secret and base URL come from their variables; the base URL defaults to gitlab.com', () => {
    const config = gitlabDuoOAuthConfig({ THYROX_GITLAB_OAUTH_CLIENT_ID: 'gl', THYROX_GITLAB_DUO_BASE_URL: 'https://git.example/' })
    expect([config.clientId, config.clientSecret, config.baseUrl, config.tokenUrl]).toEqual([
      'gl',
      null,
      'https://git.example',
      'https://git.example/oauth/token',
    ])
    expect(gitlabDuoOAuthConfig({ THYROX_GITLAB_DUO_OAUTH_CLIENT_ID: 'duo', THYROX_GITLAB_OAUTH_CLIENT_ID: 'gl' }).clientId).toBe('duo')
    expect(gitlabDuoOAuthConfig({}).baseUrl).toBe('https://gitlab.com')
  })

  test('the authorize URL is PKCE with the AI scope; without a client id it refuses by naming it', () => {
    const config = gitlabDuoOAuthConfig({ THYROX_GITLAB_OAUTH_CLIENT_ID: 'gl' })
    const data = createOAuthFlows({ 'gitlab-duo': createGitlabDuoFlow({ config }) }).generateAuthData('gitlab-duo', 'http://127.0.0.1:9/callback')
    const url = new URL(data.authUrl!)
    expect(url.origin + url.pathname).toBe('https://gitlab.com/oauth/authorize')
    expect(url.searchParams.get('scope')).toBe('ai_features read_user')
    expect(url.searchParams.get('code_challenge')).toBe(data.codeChallenge!)
    expect(() =>
      createOAuthFlows({ 'gitlab-duo': createGitlabDuoFlow({ config: gitlabDuoOAuthConfig({}) }) }).generateAuthData('gitlab-duo', 'r'),
    ).toThrow('THYROX_GITLAB_DUO_OAUTH_CLIENT_ID is not set')
  })

  test('the exchange sends the secret only when declared; the user and the direct access name the account', async () => {
    const { calls, fetch } = scriptedFetch(url => {
      if (url.endsWith('/oauth/token')) return Response.json({ access_token: 'glpat', refresh_token: 'r', expires_in: 7200 })
      if (url.endsWith('/api/v4/user')) return Response.json({ id: 3, username: 'carol', public_email: ' c@x.io ' })
      return Response.json({ token: 'dt', base_url: 'https://cloud.gitlab.com/ai/', expires_at: 1900000000, headers: { 'X-Gitlab-Instance-Id': 'i', bad: 1 } })
    })
    const withSecret = gitlabDuoOAuthConfig({ THYROX_GITLAB_OAUTH_CLIENT_ID: 'gl', THYROX_GITLAB_OAUTH_CLIENT_SECRET: 's' })
    const tokens = await createOAuthFlows({ 'gitlab-duo': createGitlabDuoFlow({ config: withSecret, fetch }) }).exchangeTokens(
      'gitlab-duo', 'code', 'r', 'v', 'st',
    )
    expect(form(calls[0]!.init)).toEqual({ client_id: 'gl', code: 'code', grant_type: 'authorization_code', redirect_uri: 'r', code_verifier: 'v', client_secret: 's' })
    expect(calls[2]!.init.method).toBe('POST')
    expect(tokens).toEqual({
      accessToken: 'glpat',
      refreshToken: 'r',
      expiresIn: 7200,
      email: 'c@x.io',
      name: 'carol',
      providerSpecificData: {
        baseUrl: 'https://gitlab.com',
        gitlabUserId: 3,
        gitlabUsername: 'carol',
        gitlabName: undefined,
        gitlabDirectAccess: {
          token: 'dt',
          baseUrl: 'https://cloud.gitlab.com/ai',
          expiresAt: new Date(1900000000 * 1000).toISOString(),
          headers: { 'X-Gitlab-Instance-Id': 'i' },
        },
      },
    })
    const withoutSecret = scriptedFetch(() => Response.json({ access_token: 'a' }))
    await createOAuthFlows({
      'gitlab-duo': createGitlabDuoFlow({ config: gitlabDuoOAuthConfig({ THYROX_GITLAB_OAUTH_CLIENT_ID: 'gl' }), fetch: withoutSecret.fetch }),
    }).exchangeTokens('gitlab-duo', 'c', 'r', 'v', 's')
    expect(form(withoutSecret.calls[0]!.init).client_secret).toBeUndefined()
  })

  test('a failing direct access does not fail the login', async () => {
    const { fetch } = scriptedFetch(url => {
      if (url.endsWith('/oauth/token')) return Response.json({ access_token: 'a' })
      if (url.endsWith('/api/v4/user')) return Response.json({ name: 'Dan' })
      throw new TypeError('fetch failed')
    })
    const config = gitlabDuoOAuthConfig({ THYROX_GITLAB_OAUTH_CLIENT_ID: 'gl' })
    const tokens = await createOAuthFlows({ 'gitlab-duo': createGitlabDuoFlow({ config, fetch }) }).exchangeTokens('gitlab-duo', 'c', 'r', 'v', 's')
    expect(tokens.name).toBe('Dan')
    expect((tokens.providerSpecificData as Record<string, unknown>).gitlabDirectAccess).toBeUndefined()
  })

  test('a direct access without token or base URL is not one', () => {
    expect(parseGitlabDirectAccess({ token: 't' })).toBeNull()
    expect(parseGitlabDirectAccess({ token: 't', base_url: 'https://x' })).toEqual({ token: 't', baseUrl: 'https://x', expiresAt: null, headers: {} })
  })
})
