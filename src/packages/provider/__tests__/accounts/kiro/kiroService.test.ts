/**
 * Las operaciones de cuenta de Kiro fuera del inicio de sesión: registrar un
 * cliente OIDC propio, refrescar por cada camino (IdP de empresa, OIDC de
 * AWS con re-registro, social), validar un refresh token pegado, descubrir el
 * perfil y normalizar una clave de API.
 *
 * Porte de `omniroute: src/lib/oauth/services/kiro.ts` y
 * `open-sse/services/kiroExternalIdp.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildExternalIdpRefreshParams, emailFromExternalIdpToken, isExternalIdpAuthMethod, normalizeScope, validateExternalIdpTokenEndpoint } from '../../../src/accounts/kiro/kiroExternalIdp.ts'
import { createKiroService, readCachedClientCredentials } from '../../../src/accounts/kiro/kiroService.ts'
import { kiroOAuthConfig } from '../../../src/accounts/oauth/flows/kiroFlow.ts'

const IMPORT_TOKEN = 'aorAAAAAGimported'
const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const text = (body: string, status: number) => new Response(body, { status })

function scriptedFetch(answers: ((url: string, init: RequestInit) => Response)[]) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    const answer = answers[calls.length - 1]
    if (!answer) throw new Error(`unexpected call ${calls.length}: ${String(input)}`)
    return answer(String(input), init)
  }
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls }
}

const bodyOf = (init: RequestInit) => JSON.parse(String(init.body))
const headersOf = (init: RequestInit) => init.headers as Record<string, string>

function errorOf(fn: () => unknown): string {
  try {
    fn()
  } catch (error) {
    return (error as Error).message
  }
  return ''
}

async function rejectionOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    return (error as Error).message
  }
  return ''
}

function ssoCache(entries: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'kiro-sso-'))
  for (const [name, content] of Object.entries(entries)) writeFileSync(join(dir, name), typeof content === 'string' ? content : JSON.stringify(content))
  return dir
}

const service = (fetch: typeof globalThis.fetch = scriptedFetch([]).fetch, ssoCacheDir?: string) => createKiroService({ config: kiroOAuthConfig(), fetch, ssoCacheDir })

const IDP_DATA = { clientId: 'app-1', tokenEndpoint: 'https://login.microsoftonline.com/t/oauth2/v2.0/token', scopes: ['api://app-1/codewhisperer:conversations', ' ', 'offline_access'] }

describe('external IdP', () => {
  test('the method marker ignores case and spaces', () => {
    expect(isExternalIdpAuthMethod(' External_IDP ')).toBe(true)
    expect(isExternalIdpAuthMethod('imported')).toBe(false)
    expect(isExternalIdpAuthMethod(7)).toBe(false)
  })

  test('the token endpoint must be https on a known identity provider', () => {
    expect(validateExternalIdpTokenEndpoint(' https://login.microsoftonline.com/t/token ')).toBe('https://login.microsoftonline.com/t/token')
    expect(validateExternalIdpTokenEndpoint('https://acme.okta.com/oauth2/v1/token')).toBe('https://acme.okta.com/oauth2/v1/token')
    expect(validateExternalIdpTokenEndpoint('https://accounts.google.com/o/oauth2/token')).toBe('https://accounts.google.com/o/oauth2/token')
    expect(errorOf(() => validateExternalIdpTokenEndpoint(''))).toContain('required')
    expect(errorOf(() => validateExternalIdpTokenEndpoint('not a url'))).toContain('valid URL')
    expect(errorOf(() => validateExternalIdpTokenEndpoint('http://login.microsoftonline.com/t'))).toContain('https')
    expect(errorOf(() => validateExternalIdpTokenEndpoint('https://okta.com/token'))).toContain('not an allowed')
    expect(errorOf(() => validateExternalIdpTokenEndpoint('https://evil-login.microsoftonline.com/token'))).toContain('not an allowed')
    expect(errorOf(() => validateExternalIdpTokenEndpoint('https://attacker.example/token'))).toContain('attacker.example')
  })

  test('scopes collapse to one space-separated string', () => {
    expect(normalizeScope(['a', ' b ', '', 3])).toBe('a b')
    expect(normalizeScope(' a b ')).toBe('a b')
    expect(normalizeScope(undefined)).toBe('')
  })

  test('the login name is the email, else preferred_username, else upn', () => {
    expect(emailFromExternalIdpToken(jwt({ email: 'e@x', preferred_username: 'p@x', upn: 'u@x' }))).toBe('e@x')
    expect(emailFromExternalIdpToken(jwt({ preferred_username: 'p@x', upn: 'u@x' }))).toBe('p@x')
    expect(emailFromExternalIdpToken(jwt({ upn: 'u@x' }))).toBe('u@x')
    expect(emailFromExternalIdpToken(jwt({ sub: 's' }))).toBeNull()
    expect(emailFromExternalIdpToken('opaque')).toBeNull()
  })

  test('the refresh is a public-client grant, with the snake-case aliases accepted', () => {
    const request = buildExternalIdpRefreshParams('rt', IDP_DATA)
    expect(request.tokenEndpoint).toBe(IDP_DATA.tokenEndpoint)
    expect(Object.fromEntries(request.body)).toEqual({ grant_type: 'refresh_token', client_id: 'app-1', refresh_token: 'rt', scope: 'api://app-1/codewhisperer:conversations offline_access' })
    const aliased = buildExternalIdpRefreshParams('rt', { client_id: 'app-2', token_endpoint: IDP_DATA.tokenEndpoint, scope: 'openid' })
    expect(Object.fromEntries(aliased.body)).toMatchObject({ client_id: 'app-2', scope: 'openid' })
    expect(errorOf(() => buildExternalIdpRefreshParams('', IDP_DATA))).toContain('refresh token')
    expect(errorOf(() => buildExternalIdpRefreshParams('rt', { ...IDP_DATA, clientId: ' ' }))).toContain('clientId')
    expect(errorOf(() => buildExternalIdpRefreshParams('rt', { ...IDP_DATA, scopes: [] }))).toContain('scope')
    expect(errorOf(() => buildExternalIdpRefreshParams('rt', null))).toContain('tokenEndpoint')
  })
})

describe('client registration', () => {
  test('a client is registered in the requested region with the flow configuration', async () => {
    const { fetch, calls } = scriptedFetch([() => json({ clientId: 'c', clientSecret: 's', clientSecretExpiresAt: 99, extra: 1 })])
    expect(await service(fetch).registerClient('eu-west-1')).toEqual({ clientId: 'c', clientSecret: 's', clientSecretExpiresAt: 99 })
    expect(calls[0].url).toBe('https://oidc.eu-west-1.amazonaws.com/client/register')
    const config = kiroOAuthConfig()
    expect(bodyOf(calls[0].init)).toEqual({ clientName: config.clientName, clientType: config.clientType, scopes: config.scopes, grantTypes: config.grantTypes, issuerUrl: config.issuerUrl })
  })

  test('a refused registration names the answer; a bad region never reaches the network', async () => {
    const { fetch, calls } = scriptedFetch([() => text('quota', 429)])
    const kiro = service(fetch)
    expect(await rejectionOf(kiro.registerClient())).toBe('Failed to register client: quota')
    expect(calls[0].url).toBe('https://oidc.us-east-1.amazonaws.com/client/register')
    expect(await rejectionOf(kiro.registerClient('evil.example/'))).toBe('Invalid region')
    expect(calls).toHaveLength(1)
  })
})

describe('refresh', () => {
  test('an external IdP token refreshes against its own endpoint, form-encoded', async () => {
    const { fetch, calls } = scriptedFetch([() => json({ access_token: 'new-at' })])
    expect(await service(fetch).refreshToken('rt', { authMethod: 'external_idp', ...IDP_DATA })).toEqual({ accessToken: 'new-at', refreshToken: 'rt', expiresIn: 3600 })
    expect(calls[0].url).toBe(IDP_DATA.tokenEndpoint)
    expect(headersOf(calls[0].init)['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(new URLSearchParams(String(calls[0].init.body)).get('grant_type')).toBe('refresh_token')
  })

  test('an external IdP refresh keeps the rotated token and its lifetime, and names a refusal', async () => {
    const ok = scriptedFetch([() => json({ access_token: 'a', refresh_token: 'r2', expires_in: 60 })])
    expect(await service(ok.fetch).refreshToken('rt', { authMethod: 'external_idp', ...IDP_DATA })).toEqual({ accessToken: 'a', refreshToken: 'r2', expiresIn: 60 })
    const refused = scriptedFetch([() => text('invalid_grant', 400)])
    expect(await rejectionOf(service(refused.fetch).refreshToken('rt', { authMethod: 'external_idp', ...IDP_DATA }))).toBe('Token refresh failed: invalid_grant')
  })

  test('a Builder ID token refreshes against AWS OIDC in its region', async () => {
    const { fetch, calls } = scriptedFetch([() => json({ accessToken: 'at2', refreshToken: 'rt2', expiresIn: 900 })])
    expect(await service(fetch).refreshToken('rt', { clientId: 'c', clientSecret: 's', authMethod: 'builder-id', region: 'eu-central-1' })).toEqual({ accessToken: 'at2', refreshToken: 'rt2', expiresIn: 900 })
    expect(calls[0].url).toBe('https://oidc.eu-central-1.amazonaws.com/token')
    expect(bodyOf(calls[0].init)).toEqual({ clientId: 'c', clientSecret: 's', refreshToken: 'rt', grantType: 'refresh_token' })
  })

  test('without a region the OIDC refresh goes to us-east-1 and keeps the old token when none rotates', async () => {
    const { fetch, calls } = scriptedFetch([() => json({ accessToken: 'at2' })])
    expect(await service(fetch).refreshToken('rt', { clientId: 'c', clientSecret: 's' })).toEqual({ accessToken: 'at2', refreshToken: 'rt', expiresIn: 3600 })
    expect(calls[0].url).toBe('https://oidc.us-east-1.amazonaws.com/token')
    expect(await rejectionOf(service().refreshToken('rt', { clientId: 'c', clientSecret: 's', region: 'x' }))).toBe('Invalid region')
  })

  test('a refused OIDC refresh registers a fresh client and retries once', async () => {
    const { fetch, calls } = scriptedFetch([() => text('expired client', 400), () => json({ clientId: 'c2', clientSecret: 's2', clientSecretExpiresAt: 7 }), () => json({ accessToken: 'at3' })])
    const result = await service(fetch).refreshToken('rt', { clientId: 'c', clientSecret: 's', region: 'us-west-2' })
    expect(result).toEqual({ accessToken: 'at3', refreshToken: 'rt', expiresIn: 3600, newClient: { clientId: 'c2', clientSecret: 's2', clientSecretExpiresAt: 7 } })
    expect(calls[1].url).toBe('https://oidc.us-west-2.amazonaws.com/client/register')
    expect(calls[2].url).toBe('https://oidc.us-west-2.amazonaws.com/token')
    expect(bodyOf(calls[2].init)).toMatchObject({ clientId: 'c2', clientSecret: 's2', refreshToken: 'rt', grantType: 'refresh_token' })
  })

  test('the retry keeps a rotated token and lifetime; a failed retry says so', async () => {
    const rotated = scriptedFetch([() => text('x', 400), () => json({ clientId: 'c2', clientSecret: 's2' }), () => json({ accessToken: 'a', refreshToken: 'r9', expiresIn: 10 })])
    expect(await service(rotated.fetch).refreshToken('rt', { clientId: 'c', clientSecret: 's' })).toMatchObject({ refreshToken: 'r9', expiresIn: 10 })
    const failed = scriptedFetch([() => text('x', 400), () => json({ clientId: 'c2', clientSecret: 's2' }), () => text('still bad', 400)])
    expect(await rejectionOf(service(failed.fetch).refreshToken('rt', { clientId: 'c', clientSecret: 's' }))).toBe('Token refresh retry failed after re-registration: still bad')
  })

  test('when re-registration itself fails, the original refusal is reported', async () => {
    const { fetch } = scriptedFetch([() => text('original', 400), () => text('no', 500)])
    expect(await rejectionOf(service(fetch).refreshToken('rt', { clientId: 'c', clientSecret: 's' }))).toBe('Token refresh failed: original')
  })

  test('an imported social token refreshes at the Kiro auth service even with a client', async () => {
    const { fetch, calls } = scriptedFetch([() => json({ accessToken: 'at', profileArn: 'arn:p', expiresIn: 120 })])
    expect(await service(fetch).refreshToken('rt', { clientId: 'c', clientSecret: 's', authMethod: 'imported' })).toEqual({ accessToken: 'at', refreshToken: 'rt', profileArn: 'arn:p', expiresIn: 120 })
    expect(calls[0].url).toBe('https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken')
    expect(bodyOf(calls[0].init)).toEqual({ refreshToken: 'rt' })
  })

  test('a social refresh keeps the old token, defaults the lifetime and names a refusal', async () => {
    const ok = scriptedFetch([() => json({ accessToken: 'at' })])
    expect(await service(ok.fetch).refreshToken('rt')).toMatchObject({ refreshToken: 'rt', expiresIn: 3600 })
    const partial = scriptedFetch([() => json({ accessToken: 'at', refreshToken: 'r2' })])
    expect(await service(partial.fetch).refreshToken('rt', { clientId: 'c' })).toMatchObject({ refreshToken: 'r2' })
    expect(partial.calls[0].url).toBe('https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken')
    const refused = scriptedFetch([() => text('revoked', 401)])
    expect(await rejectionOf(service(refused.fetch).refreshToken('rt'))).toBe('Token refresh failed: revoked')
  })
})

describe('cached SSO client credentials', () => {
  test('a missing cache, broken files and entries without a secret give nothing', async () => {
    expect(await readCachedClientCredentials(join(tmpdir(), 'kiro-no-such-cache'))).toBeNull()
    expect(await readCachedClientCredentials(ssoCache({ 'a.json': '{', 'b.json': { clientId: 'c' }, 'c.txt': { clientId: 'c', clientSecret: 's' } }))).toBeNull()
  })

  test('the token own client wins; then the region; then the latest expiry', async () => {
    const dir = ssoCache({
      'old.json': { clientId: 'old', clientSecret: 's-old', region: 'us-east-1', expiresAt: '2026-01-01' },
      'new.json': { clientId: 'new', clientSecret: 's-new', region: 'us-east-1', clientSecretExpiresAt: '2027-01-01' },
      'eu.json': { clientId: 'eu', clientSecret: 's-eu', region: 'eu-west-1', expiresAt: '2028-01-01' },
    })
    expect(await readCachedClientCredentials(dir, 'us-east-1', 'old')).toEqual({ clientId: 'old', clientSecret: 's-old' })
    expect(await readCachedClientCredentials(dir, 'us-east-1', 'unknown')).toEqual({ clientId: 'new', clientSecret: 's-new' })
    expect(await readCachedClientCredentials(dir, 'eu-west-1')).toEqual({ clientId: 'eu', clientSecret: 's-eu' })
    expect(await readCachedClientCredentials(dir, 'ap-south-1')).toEqual({ clientId: 'eu', clientSecret: 's-eu' })
    expect(await readCachedClientCredentials(dir)).toEqual({ clientId: 'eu', clientSecret: 's-eu' })
  })
})

describe('import validation', () => {
  test('only an AWS refresh token is accepted, in a valid region', async () => {
    const kiro = service(scriptedFetch([]).fetch, ssoCache({}))
    expect(await rejectionOf(kiro.validateImportToken('xyz'))).toContain('aorAAAAAG')
    expect(await rejectionOf(kiro.validateImportToken(IMPORT_TOKEN, 'nope'))).toBe('Invalid region')
  })

  test('a cached Builder ID client that refreshes the token makes it a Builder ID import', async () => {
    const dir = ssoCache({ 'c.json': { clientId: 'cached', clientSecret: 'cs', region: 'us-east-1' } })
    const { fetch, calls } = scriptedFetch([() => json({ accessToken: 'at', expiresIn: 60 })])
    const result = await service(fetch, dir).validateImportToken(IMPORT_TOKEN, 'eu-central-1')
    expect(result).toEqual({ accessToken: 'at', refreshToken: IMPORT_TOKEN, profileArn: undefined, expiresIn: 60, authMethod: 'builder-id', clientId: 'cached', clientSecret: 'cs' })
    expect(calls[0].url).toBe('https://oidc.eu-central-1.amazonaws.com/token')
    expect(bodyOf(calls[0].init)).toMatchObject({ clientId: 'cached', refreshToken: IMPORT_TOKEN })
  })

  test('the token own client id picks the cached registration', async () => {
    const dir = ssoCache({ 'a.json': { clientId: 'a', clientSecret: 'sa', region: 'us-east-1', expiresAt: '2030' }, 'b.json': { clientId: 'b', clientSecret: 'sb', region: 'us-east-1', expiresAt: '2020' } })
    const { fetch, calls } = scriptedFetch([() => json({ accessToken: 'at', refreshToken: 'rotated' })])
    const result = await service(fetch, dir).validateImportToken(IMPORT_TOKEN, 'us-east-1', 'b')
    expect(bodyOf(calls[0].init).clientId).toBe('b')
    expect(result.refreshToken).toBe('rotated')
  })

  test('when the cached client fails, the social refresh validates it and a dedicated client is registered', async () => {
    const dir = ssoCache({ 'c.json': { clientId: 'cached', clientSecret: 'cs' } })
    const { fetch, calls } = scriptedFetch([
      () => text('bad', 400),
      () => text('bad', 500),
      () => json({ accessToken: 'at', profileArn: 'arn:p', expiresIn: 30 }),
      () => json({ clientId: 'own', clientSecret: 'own-s', clientSecretExpiresAt: 5 }),
    ])
    const result = await service(fetch, dir).validateImportToken(IMPORT_TOKEN, 'eu-central-1')
    expect(result).toEqual({ accessToken: 'at', refreshToken: IMPORT_TOKEN, profileArn: 'arn:p', expiresIn: 30, authMethod: 'imported', clientId: 'own', clientSecret: 'own-s', clientSecretExpiresAt: 5 })
    expect(calls[2].url).toContain('auth.desktop.kiro.dev')
    expect(calls[3].url).toBe('https://oidc.eu-central-1.amazonaws.com/client/register')
  })

  test('without a cache, a failed registration leaves the import without its own client', async () => {
    const { fetch } = scriptedFetch([() => json({ accessToken: 'at', refreshToken: 'r2' }), () => text('nope', 500)])
    const result = await service(fetch, ssoCache({})).validateImportToken(IMPORT_TOKEN)
    expect(result).toEqual({ accessToken: 'at', refreshToken: 'r2', profileArn: undefined, expiresIn: 3600, authMethod: 'imported' })
  })

  test('a token the social refresh rejects is not valid', async () => {
    const { fetch } = scriptedFetch([() => text('revoked', 401)])
    expect(await rejectionOf(service(fetch, ssoCache({})).validateImportToken(IMPORT_TOKEN))).toBe('Token validation failed: Token refresh failed: revoked')
  })
})

describe('profiles and API keys', () => {
  test('profiles are listed on the regional host and the one in the region wins', async () => {
    const { fetch, calls } = scriptedFetch([() => json({ profiles: [{ arn: 'arn:aws:q:us-east-1:1:p' }, { profileArn: 'arn:aws:q:eu-central-1:1:p' }] })])
    expect(await service(fetch).listAvailableProfiles('tok', 'eu-central-1')).toBe('arn:aws:q:eu-central-1:1:p')
    expect(calls[0].url).toBe('https://q.eu-central-1.amazonaws.com')
    expect(calls[0].init.method).toBe('POST')
    expect(headersOf(calls[0].init)).toMatchObject({ Authorization: 'Bearer tok', 'x-amz-target': 'AmazonCodeWhispererService.ListAvailableProfiles', tokentype: 'API_KEY', 'Content-Type': 'application/x-amz-json-1.0' })
    expect(bodyOf(calls[0].init)).toEqual({ maxResults: 10 })
  })

  test('without a match the first profile is taken; none gives null; a refusal is named', async () => {
    const first = scriptedFetch([() => json({ profiles: [{ arn: 'arn:aws:q:eu-west-1:1:p' }] })])
    expect(await service(first.fetch).listAvailableProfiles('t')).toBe('arn:aws:q:eu-west-1:1:p')
    expect(first.calls[0].url).toBe('https://codewhisperer.us-east-1.amazonaws.com')
    const none = scriptedFetch([() => json({ profiles: 'x' })])
    expect(await service(none.fetch).listAvailableProfiles('t')).toBeNull()
    const refused = scriptedFetch([() => text('denied', 403)])
    expect(await rejectionOf(service(refused.fetch).listAvailableProfiles('t'))).toBe('Failed to list profiles: denied')
    expect(await rejectionOf(service().listAvailableProfiles('t', 'bad'))).toBe('Invalid region')
  })

  test('an API key is trimmed and its profile looked up', async () => {
    const { fetch } = scriptedFetch([() => json({ profiles: [{ arn: 'arn:aws:q:us-east-1:1:p' }] })])
    expect(await service(fetch).validateApiKey('  key  ')).toEqual({ accessToken: 'key', refreshToken: null, profileArn: 'arn:aws:q:us-east-1:1:p', region: 'us-east-1', authMethod: 'api_key' })
    expect(await rejectionOf(service().validateApiKey('  '))).toBe('API key is required')
    expect(await rejectionOf(service().validateApiKey('k', 'bad'))).toBe('Invalid region')
    expect(await rejectionOf(service().validateApiKey('  ', 'bad'))).toBe('Invalid region')
  })

  test('a key denied only on profile listing is still valid; any other failure is not', async () => {
    const denied = scriptedFetch([() => text('AccessDeniedException: API key authentication is not supported for this operation', 403)])
    expect(await service(denied.fetch).validateApiKey('k', 'eu-central-1')).toMatchObject({ profileArn: null, region: 'eu-central-1' })
    const otherDenial = scriptedFetch([() => text('AccessDeniedException: expired', 403)])
    expect(await rejectionOf(service(otherDenial.fetch).validateApiKey('k'))).toContain('expired')
    const unsupported = scriptedFetch([() => text('API key authentication is not supported for this operation', 400)])
    expect(await rejectionOf(service(unsupported.fetch).validateApiKey('k'))).toContain('not supported')
  })

  test('the account name of a token is its email, preferred username or subject', () => {
    const kiro = service()
    expect(kiro.extractEmailFromJwt(jwt({ email: 'e@x', sub: 's' }))).toBe('e@x')
    expect(kiro.extractEmailFromJwt(jwt({ preferred_username: 'p', sub: 's' }))).toBe('p')
    expect(kiro.extractEmailFromJwt(jwt({ sub: 's' }))).toBe('s')
    expect(kiro.extractEmailFromJwt(jwt({}))).toBeNull()
    expect(kiro.extractEmailFromJwt('opaque')).toBeNull()
  })
})
