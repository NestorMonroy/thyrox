/**
 * Los flujos OAuth de `claude` y `codex`: la URL de autorización, el
 * intercambio del código, lo que se lee después (el bootstrap de la cuenta,
 * los claims del id_token) y la cuenta que resulta. El client id sale sólo de
 * su variable; sin ella, el flujo rehúsa nombrándola.
 *
 * Porte de `omniroute: src/lib/oauth/providers/claude.ts`, `providers/codex.ts`
 * y de `CLAUDE_CONFIG`/`CODEX_CONFIG` en `constants/oauth.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createAnthropicFlow, anthropicOAuthConfig } from '../../../src/accounts/oauth/flows/anthropicFlow.ts'
import { createCodexFlow, codexOAuthConfig } from '../../../src/accounts/oauth/flows/codexFlow.ts'
import { createOAuthFlows } from '../../../src/accounts/oauth/oauthFlows.ts'

interface Call {
  url: string
  init: RequestInit
}

function recordingFetch(answer: (url: string) => Response) {
  const calls: Call[] = []
  const fetch = async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init })
    return answer(String(url))
  }
  return { calls, fetch: fetch as typeof globalThis.fetch }
}

function jwt(payload: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${part({ alg: 'none' })}.${part(payload)}.signature`
}

describe('client credentials', () => {
  test('the client id and the redirect come from their variables', () => {
    const config = anthropicOAuthConfig({ THYROX_CLAUDE_OAUTH_CLIENT_ID: 'cid', THYROX_CODE_REDIRECT_URI: 'https://own/cb' })
    expect(config.clientId).toBe('cid')
    expect(config.redirectUri).toBe('https://own/cb')
    expect(anthropicOAuthConfig({}).redirectUri).toBe('https://platform.claude.com/oauth/code/callback')
    expect(codexOAuthConfig({ THYROX_CODEX_OAUTH_CLIENT_ID: ' x ' }).clientId).toBe('x')
  })

  test('without the variable the flow refuses by naming it', async () => {
    const flows = createOAuthFlows({
      claude: createAnthropicFlow({ config: anthropicOAuthConfig({}) }),
      codex: createCodexFlow({ config: codexOAuthConfig({}) }),
    })
    expect(() => flows.generateAuthData('claude', 'r')).toThrow('THYROX_CLAUDE_OAUTH_CLIENT_ID is not set')
    await expect(flows.exchangeTokens('codex', 'c', 'r', 'v', 's')).rejects.toThrow('THYROX_CODEX_OAUTH_CLIENT_ID is not set')
  })
})

describe('claude', () => {
  const config = anthropicOAuthConfig({ THYROX_CLAUDE_OAUTH_CLIENT_ID: 'claude-client' })

  test('the authorize URL carries the scopes, the challenge and a forced login', () => {
    const data = createOAuthFlows({ claude: createAnthropicFlow({ config }) }).generateAuthData('claude', 'ignored')
    const url = new URL(data.authUrl!)
    expect(url.origin + url.pathname).toBe('https://claude.ai/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('claude-client')
    expect(url.searchParams.get('redirect_uri')).toBe('https://platform.claude.com/oauth/code/callback')
    expect(url.searchParams.get('scope')).toBe(
      'org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers',
    )
    expect(url.searchParams.get('code_challenge')).toBe(data.codeChallenge!)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('state')).toBe(data.state!)
    expect(url.searchParams.get('prompt')).toBe('login')
    expect(url.searchParams.get('code')).toBe('true')
  })

  test('a pasted code#state is split, exchanged as JSON and the bootstrap names the account', async () => {
    const { calls, fetch } = recordingFetch(url =>
      url.endsWith('/v1/oauth/token')
        ? Response.json({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 's', subscription_type: 'max' })
        : Response.json({
            oauth_account: {
              account_uuid: 'acc-1',
              account_email: 'a@x.io',
              organization_uuid: 'org-1',
              organization_name: 'Org',
              organization_type: 'claude_max',
              organization_rate_limit_tier: 'tier-4',
            },
          }),
    )
    const flows = createOAuthFlows({
      claude: createAnthropicFlow({ config, fetch, userAgent: () => 'agent/1', randomHex: () => 'cli-user' }),
    })
    const tokens = await flows.exchangeTokens('claude', 'the-code#pasted-state', 'r', 'verifier', 'own-state')
    const exchange = JSON.parse(String(calls[0]!.init.body))
    expect(exchange).toEqual({
      code: 'the-code',
      state: 'pasted-state',
      grant_type: 'authorization_code',
      client_id: 'claude-client',
      redirect_uri: 'https://platform.claude.com/oauth/code/callback',
      code_verifier: 'verifier',
    })
    expect(calls[1]!.url).toBe('https://api.anthropic.com/api/claude_cli/bootstrap')
    expect((calls[1]!.init.headers as Record<string, string>).Authorization).toBe('Bearer at')
    expect((calls[1]!.init.headers as Record<string, string>)['User-Agent']).toBe('agent/1')
    expect(tokens).toEqual({
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 3600,
      scope: 's',
      email: 'a@x.io',
      displayName: 'a@x.io',
      providerSpecificData: {
        cliUserID: 'cli-user',
        autoSync: true,
        accountUUID: 'acc-1',
        organizationUUID: 'org-1',
        organizationName: 'Org',
        organizationType: 'claude_max',
        organizationRateLimitTier: 'tier-4',
        plan: 'max',
      },
    })
  })

  test('a code without state keeps its own state; a failed bootstrap does not fail the login', async () => {
    const { calls, fetch } = recordingFetch(url =>
      url.endsWith('/v1/oauth/token') ? Response.json({ access_token: 'at' }) : new Response('down', { status: 503 }),
    )
    const tokens = await createOAuthFlows({ claude: createAnthropicFlow({ config, fetch, randomHex: () => 'u' }) }).exchangeTokens(
      'claude', 'code', 'r', 'v', 'own-state',
    )
    expect(JSON.parse(String(calls[0]!.init.body)).state).toBe('own-state')
    expect((calls[1]!.init.headers as Record<string, string>)['User-Agent']).toMatch(/^claude-cli\/\d+\.\d+\.\d+ \(external, cli\)$/)
    expect(tokens.email).toBeUndefined()
    expect(tokens.providerSpecificData).toEqual({ cliUserID: 'u', autoSync: true })
  })

  test('an unreachable bootstrap does not fail the login', async () => {
    const { fetch } = recordingFetch(url => {
      if (url.endsWith('/v1/oauth/token')) return Response.json({ access_token: 'at', refresh_token: 'rt' })
      throw new TypeError('fetch failed')
    })
    const tokens = await createOAuthFlows({ claude: createAnthropicFlow({ config, fetch, randomHex: () => 'u' }) }).exchangeTokens(
      'claude', 'code', 'r', 'v', 's',
    )
    expect(tokens.refreshToken).toBe('rt')
  })

  test('a refused exchange carries the upstream text', async () => {
    const { fetch } = recordingFetch(() => new Response('invalid_grant', { status: 400 }))
    await expect(
      createOAuthFlows({ claude: createAnthropicFlow({ config, fetch }) }).exchangeTokens('claude', 'c', 'r', 'v', 's'),
    ).rejects.toThrow('Token exchange failed: invalid_grant')
  })
})

describe('codex', () => {
  const config = codexOAuthConfig({ THYROX_CODEX_OAUTH_CLIENT_ID: 'codex-client' })

  test('a fixed port and path, and the OpenAI parameters in the URL', () => {
    const flows = createOAuthFlows({ codex: createCodexFlow({ config }) })
    const data = flows.generateAuthData('codex', 'http://localhost:1455/auth/callback')
    expect([data.fixedPort, data.callbackPath]).toEqual([1455, '/auth/callback'])
    const url = new URL(data.authUrl!)
    expect(url.origin + url.pathname).toBe('https://auth.openai.com/oauth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'codex-client',
      redirect_uri: 'http://localhost:1455/auth/callback',
      scope: 'openid profile email offline_access',
      code_challenge: data.codeChallenge!,
      code_challenge_method: 'S256',
      id_token_add_organizations: 'true',
      codex_cli_simplified_flow: 'true',
      originator: 'codex_cli_rs',
      prompt: 'login',
      state: data.state!,
    })
  })

  test('the exchange is form-encoded and the id_token names the workspace and the email', async () => {
    const idToken = jwt({
      email: 'ñandú@x.io',
      'https://api.openai.com/auth': { chatgpt_account_id: 'acct-1', chatgpt_plan_type: 'Plus', chatgpt_user_id: 'u-1', organizations: [] },
    })
    const { calls, fetch } = recordingFetch(() =>
      Response.json({ access_token: 'at', refresh_token: 'rt', id_token: idToken, expires_in: 60 }),
    )
    const tokens = await createOAuthFlows({ codex: createCodexFlow({ config, fetch }) }).exchangeTokens(
      'codex', 'code-1', 'http://localhost:1455/auth/callback', 'verifier', 's',
    )
    expect(Object.fromEntries(new URLSearchParams(String(calls[0]!.init.body)))).toEqual({
      grant_type: 'authorization_code',
      client_id: 'codex-client',
      code: 'code-1',
      redirect_uri: 'http://localhost:1455/auth/callback',
      code_verifier: 'verifier',
    })
    expect(tokens).toEqual({
      accessToken: 'at',
      refreshToken: 'rt',
      idToken,
      expiresIn: 60,
      email: 'ñandú@x.io',
      providerSpecificData: {
        autoSync: true,
        workspaceId: 'acct-1',
        workspacePlanType: 'plus',
        chatgptUserId: 'u-1',
        organizations: null,
      },
    })
  })

  test('a free plan with a team organization binds the team workspace', async () => {
    const organizations = [
      { id: 'personal', is_default: true, role: 'owner', title: 'Personal' },
      { id: 'team-1', is_default: false, role: 'member', title: 'Acme' },
    ]
    const idToken = jwt({ 'https://api.openai.com/auth': { chatgpt_account_id: 'personal', chatgpt_plan_type: 'free', organizations } })
    const { fetch } = recordingFetch(() => Response.json({ access_token: 'at', id_token: idToken }))
    const tokens = await createOAuthFlows({ codex: createCodexFlow({ config, fetch }) }).exchangeTokens('codex', 'c', 'r', 'v', 's')
    expect(tokens.providerSpecificData).toMatchObject({ workspaceId: 'team-1', workspacePlanType: 'team', organizations })
  })

  test('a team plan keeps its own account; a malformed id_token yields no identity', async () => {
    const organizations = [{ id: 'team-2', is_default: false, role: 'admin', title: 'Other' }]
    const team = jwt({ 'https://api.openai.com/auth': { chatgpt_account_id: 'team-1', chatgpt_plan_type: 'team', organizations } })
    const answers = [Response.json({ access_token: 'a', id_token: team }), Response.json({ access_token: 'b', id_token: 'not-a-jwt' })]
    const { fetch } = recordingFetch(() => answers.shift()!)
    const flows = createOAuthFlows({ codex: createCodexFlow({ config, fetch }) })
    expect((await flows.exchangeTokens('codex', 'c', 'r', 'v', 's')).providerSpecificData).toMatchObject({ workspaceId: 'team-1' })
    const broken = await flows.exchangeTokens('codex', 'c', 'r', 'v', 's')
    expect(broken.email).toBeNull()
    expect(broken.providerSpecificData).toMatchObject({ workspaceId: null, chatgptUserId: null })
  })
})
