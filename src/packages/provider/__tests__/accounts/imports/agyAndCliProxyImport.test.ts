/**
 * Importar credenciales guardadas por otros clientes: el archivo de tokens del
 * CLI de Antigravity (`agy`), identificando la cuenta y su proyecto de Cloud
 * Code; y el directorio de CLIProxyAPI, un JSON por cuenta con su tipo.
 *
 * Porte de `omniroute: src/lib/oauth/utils/agyAuthImport.ts`,
 * `cliProxyAuthImport.ts` y `app/api/oauth/cliproxy-import/route.ts` (MIT).
 */
import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { LOAD_CODE_ASSIST_ENDPOINTS } from '../../../src/accounts/antigravity/clientIdentity.ts'
import { createConnectionStore, type ConnectionStore } from '../../../src/accounts/connectionStore.ts'
import { createFieldCipher } from '../../../src/accounts/fieldCipher.ts'
import { AGY_PROVIDER_ID, createConnectionFromAgyToken, enrichWithAntigravityBackend, type EnrichedAgyAuth, findExistingAgyConnection, parseAndValidateAgyToken } from '../../../src/accounts/imports/agyAuthImport.ts'
import { cliProxyConfigDir, importCliProxyAccounts, parseCliProxyAuthRecord, previewCliProxyAccounts, resolveCliProxyExpiry, scanCliProxyAuthDir, toConnectionPayload } from '../../../src/accounts/imports/cliProxyAuthImport.ts'
import type { JsonRecord } from '../../../src/accounts/oauth/oauthFlows.ts'

const NOW = Date.parse('2026-09-28T10:00:00.000Z')
const NOW_ISO = new Date(NOW).toISOString()
let store: ConnectionStore
let ids = 0

beforeEach(() => {
  ids = 0
  store = createConnectionStore({
    db: new Database(':memory:'),
    cipher: createFieldCipher('agy-cliproxy-test-secret', () => {}),
    now: () => NOW_ISO,
    newId: () => `conn-${++ids}`,
  })
})

const versions = { cachedIde: () => '9.9.9', cachedCli: () => '7.7.7' }

function scriptedFetch(answer: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input), init)
  }
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function enriched(overrides: Partial<EnrichedAgyAuth> = {}): EnrichedAgyAuth {
  return { accessToken: 'ya29.access', refreshToken: '1//refresh', tokenType: 'Bearer', expiresAt: '2026-09-28T11:00:00.000Z', authMethod: 'consumer', email: 'dev@example.com', projectId: 'proj-1', tier: 'standard-tier', ...overrides }
}

function codeOf(fn: () => unknown): { status?: number; code?: string } {
  try {
    fn()
  } catch (error) {
    return error as { status?: number; code?: string }
  }
  return {}
}

describe('agy token file', () => {
  test('the token nests under `.token`, with an ISO expiry and the method at the top', () => {
    const parsed = parseAndValidateAgyToken({ auth_method: ' consumer ', token: { access_token: ' ya29.a ', refresh_token: '1//r', expiry: '2026-09-28T11:00:00+01:00' } })
    expect(parsed).toEqual({ accessToken: 'ya29.a', refreshToken: '1//r', tokenType: 'Bearer', expiresAt: '2026-09-28T10:00:00.000Z', authMethod: 'consumer' })
  })

  test('a flat file is accepted, with `expires_at`, its own token type and the method inside', () => {
    const parsed = parseAndValidateAgyToken({ access_token: 'a', refresh_token: 'r', expires_at: '2026-09-28T12:00:00Z', token_type: 'bearer', auth_method: 'enterprise' })
    expect(parsed.expiresAt).toBe('2026-09-28T12:00:00.000Z')
    expect(parsed.tokenType).toBe('bearer')
    expect(parsed.authMethod).toBe('enterprise')
  })

  test('a unix-ms `expiry_date` counts; an unreadable ISO or nothing leaves it null', () => {
    expect(parseAndValidateAgyToken({ access_token: 'a', refresh_token: 'r', expiry_date: NOW }).expiresAt).toBe(NOW_ISO)
    expect(parseAndValidateAgyToken({ access_token: 'a', refresh_token: 'r', expiry: 'not a date', expiry_date: NOW }).expiresAt).toBeNull()
    expect(parseAndValidateAgyToken({ access_token: 'a', refresh_token: 'r' }).expiresAt).toBeNull()
    expect(parseAndValidateAgyToken({ access_token: 'a', refresh_token: 'r' }).authMethod).toBeNull()
    expect(parseAndValidateAgyToken({ token: { access_token: 'a', refresh_token: 'r', auth_method: 'inner' } }).authMethod).toBe('inner')
  })

  test('both tokens are required, and blank counts as missing', () => {
    expect(codeOf(() => parseAndValidateAgyToken({ token: { access_token: '  ', refresh_token: 'r' } }))).toMatchObject({ status: 400, code: 'missing_access_token' })
    expect(codeOf(() => parseAndValidateAgyToken({ token: { access_token: 'a' } }))).toMatchObject({ status: 400, code: 'missing_refresh_token' })
    expect(codeOf(() => parseAndValidateAgyToken('text'))).toMatchObject({ code: 'missing_access_token' })
  })
})

describe('agy backend identity', () => {
  test('userinfo names the account and loadCodeAssist gives the project and the onboarding tier', async () => {
    const { fetch, calls } = scriptedFetch(url =>
      url.includes('userinfo') ? json({ email: ' dev@example.com ' }) : json({ cloudaicompanionProject: 'proj-1', paidTier: { id: 'g1-pro-tier' } }),
    )
    const result = await enrichWithAntigravityBackend(enriched({ email: null, projectId: null, tier: null }), { fetch, versions, platform: 'linux', arch: 'x64' })
    expect(result).toMatchObject({ email: 'dev@example.com', projectId: 'proj-1', tier: 'g1-pro-tier', accessToken: 'ya29.access' })
    expect(calls[0].url).toBe('https://www.googleapis.com/oauth2/v1/userinfo?alt=json')
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer ya29.access')
    expect(calls[1].url).toBe(LOAD_CODE_ASSIST_ENDPOINTS[0])
    expect(calls[1].init.method).toBe('POST')
    expect((calls[1].init.headers as Record<string, string>)['User-Agent']).toContain('7.7.7')
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ metadata: { ideType: 9, platform: 3, pluginType: 2 } })
  })

  test('the project may come as an object with its id', async () => {
    const { fetch } = scriptedFetch(url => (url.includes('userinfo') ? json({}) : json({ cloudaicompanionProject: { id: ' proj-2 ' } })))
    const result = await enrichWithAntigravityBackend(enriched(), { fetch, versions })
    expect(result.projectId).toBe('proj-2')
    expect(result.email).toBeNull()
  })

  test('a failed userinfo or loadCodeAssist leaves its fields null and the import goes on', async () => {
    const { fetch } = scriptedFetch(url => {
      if (url.includes('userinfo')) throw new Error('offline')
      return json({ error: 'nope' }, 500)
    })
    expect(await enrichWithAntigravityBackend(enriched(), { fetch, versions })).toMatchObject({ email: null, projectId: null, tier: null })
    const unauthorized = scriptedFetch(url => (url.includes('userinfo') ? json({ email: 'x@y' }, 401) : json({}, 200)))
    expect((await enrichWithAntigravityBackend(enriched(), { fetch: unauthorized.fetch, versions })).email).toBeNull()
  })

  test('a backend that hangs is cut at the time box', async () => {
    const { fetch } = scriptedFetch((_url, init) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))))
    const result = await enrichWithAntigravityBackend(enriched(), { fetch, versions, timeoutMs: 20 })
    expect(result).toMatchObject({ email: null, projectId: null, tier: null })
  })
})

describe('agy connection', () => {
  test('a new account becomes an active CLI connection with the project, tier and import time', () => {
    const { connection, created } = createConnectionFromAgyToken(store, enriched(), {}, { now: () => NOW })
    expect(created).toBe(true)
    expect(connection).toMatchObject({ provider: AGY_PROVIDER_ID, authType: 'oauth', name: 'dev@example.com', email: 'dev@example.com', accessToken: 'ya29.access', refreshToken: '1//refresh', testStatus: 'active', isActive: true })
    expect(connection.providerSpecificData).toMatchObject({ autoSync: true, clientProfile: 'cli', tokenType: 'Bearer', authMethod: 'consumer', oauthClient: 'builtin', projectId: 'proj-1', tier: 'standard-tier', importedAt: NOW_ISO })
  })

  test('without a Cloud Code project the connection is stored degraded', () => {
    const { connection } = createConnectionFromAgyToken(store, enriched({ projectId: null }), {}, { now: () => NOW })
    expect(connection).toMatchObject({ testStatus: 'degraded', errorCode: 'missing_project_id', lastErrorType: 'oauth_missing_project_id' })
  })

  test('an unverified identity needs overwriteExisting, and then takes the default name', () => {
    expect(codeOf(() => createConnectionFromAgyToken(store, enriched({ email: null }), {}, { now: () => NOW }))).toMatchObject({ status: 409, code: 'identity_unverified' })
    const { connection } = createConnectionFromAgyToken(store, enriched({ email: null }), { overwriteExisting: true }, { now: () => NOW })
    expect(connection.name).toBe('Antigravity CLI (imported)')
    expect(connection.email ?? null).toBeNull()
  })

  test('the declared email and name win over the discovered ones', () => {
    const { connection } = createConnectionFromAgyToken(store, enriched({ email: null }), { email: 'given@example.com', name: 'Mine' }, { now: () => NOW })
    expect(connection).toMatchObject({ email: 'given@example.com', name: 'Mine' })
    const both = createConnectionFromAgyToken(store, enriched({ email: 'found@example.com' }), { email: 'declared@example.com' }, { now: () => NOW }).connection
    expect(both.email).toBe('declared@example.com')
  })

  test('the same account (any case) is a duplicate unless overwritten', () => {
    createConnectionFromAgyToken(store, enriched(), {}, { now: () => NOW })
    expect(findExistingAgyConnection(store, 'DEV@example.com')?.id).toBe('conn-1')
    expect(findExistingAgyConnection(store, 'other@example.com')).toBeNull()
    expect(codeOf(() => createConnectionFromAgyToken(store, enriched({ email: 'Dev@Example.com' }), {}, { now: () => NOW }))).toMatchObject({ status: 409, code: 'duplicate_account' })
  })

  test('overwriting keeps the operator choices and the known project, and resets the OAuth client', () => {
    const first = createConnectionFromAgyToken(store, enriched(), { name: 'Work' }, { now: () => NOW }).connection
    store.update(first.id as string, { providerSpecificData: { ...(first.providerSpecificData as JsonRecord), autoSync: false, oauthClient: 'custom:web', note: 'kept' } })
    const { connection, created } = createConnectionFromAgyToken(store, enriched({ accessToken: 'ya29.new', refreshToken: '1//new', projectId: null, tier: null }), { overwriteExisting: true }, { now: () => NOW + 1000 })
    expect(created).toBe(false)
    expect(store.list({ provider: AGY_PROVIDER_ID })).toHaveLength(1)
    expect(connection).toMatchObject({ id: first.id, accessToken: 'ya29.new', refreshToken: '1//new', name: 'Work', isActive: true, testStatus: 'degraded', errorCode: 'missing_project_id' })
    expect(connection.providerSpecificData).toMatchObject({ autoSync: false, note: 'kept', oauthClient: 'builtin', projectId: 'proj-1', tier: 'standard-tier', importedAt: new Date(NOW + 1000).toISOString() })
  })

  test('overwriting with a name renames; the stored name stays otherwise', () => {
    createConnectionFromAgyToken(store, enriched(), {}, { now: () => NOW })
    const { connection } = createConnectionFromAgyToken(store, enriched({ projectId: 'proj-9', tier: 'free-tier' }), { overwriteExisting: true, name: 'Renamed' }, { now: () => NOW })
    expect(connection.name).toBe('Renamed')
    expect(connection.providerSpecificData).toMatchObject({ projectId: 'proj-9', tier: 'free-tier' })
    expect(connection.testStatus).toBe('active')
  })
})

describe('CLIProxyAPI expiry', () => {
  test('an absolute `expired`, as RFC3339, unix seconds or milliseconds', () => {
    expect(resolveCliProxyExpiry({ expired: '2026-09-28T12:00:00+02:00' }, NOW)).toBe(NOW_ISO)
    expect(resolveCliProxyExpiry({ expired: NOW / 1000 }, 0)).toBe(NOW_ISO)
    expect(resolveCliProxyExpiry({ expired: NOW }, 0)).toBe(NOW_ISO)
  })

  test('a relative `expires_in` from now, when `expired` is unusable', () => {
    expect(resolveCliProxyExpiry({ expired: 'soon', expires_in: 60 }, NOW)).toBe(new Date(NOW + 60_000).toISOString())
    expect(resolveCliProxyExpiry({ expired: 0, expires_in: 60 }, NOW)).toBe(new Date(NOW + 60_000).toISOString())
    expect(resolveCliProxyExpiry({ expires_in: 0 }, NOW)).toBeNull()
    expect(resolveCliProxyExpiry({}, NOW)).toBeNull()
  })
})

describe('CLIProxyAPI record', () => {
  test('the type maps to the provider, ignoring case; the rest is normalized', () => {
    expect(parseCliProxyAuthRecord({ type: ' Anthropic ', email: ' a@b.c ', access_token: 'at', refresh_token: 'rt', expires_in: 60 }, NOW)).toEqual({
      provider: 'claude', type: 'anthropic', email: 'a@b.c', accessToken: 'at', refreshToken: 'rt', expiresAt: new Date(NOW + 60_000).toISOString(), projectId: null,
    })
    expect(parseCliProxyAuthRecord({ type: 'antigravity', access_token: 'at', projectId: 'p-2' }, NOW)).toMatchObject({ provider: 'antigravity', refreshToken: null, projectId: 'p-2', email: null })
    expect(parseCliProxyAuthRecord({ type: 'codex', access_token: 'at', project_id: 'p-1', projectId: 'p-2' }, NOW)?.projectId).toBe('p-1')
    expect(parseCliProxyAuthRecord({ type: 'kimi', access_token: 'at' }, NOW)?.provider).toBe('kimi')
  })

  test('not an object, an unknown type or no access token is not importable', () => {
    for (const raw of [null, 'text', [{ type: 'codex', access_token: 'a' }], {}, { type: 'gemini', access_token: 'a' }, { type: 'codex' }, { type: 'codex', access_token: '  ' }]) {
      expect(parseCliProxyAuthRecord(raw, NOW)).toBeNull()
    }
  })

  test('a Muse record with a minted key keeps the DCA token as its refresh and no expiry', () => {
    const parsed = parseCliProxyAuthRecord({ type: 'meta', api_key: 'sk-muse', dca_token: 'dca:abc', email: 'm@x', name: 'M', base_url: 'https://muse', expires_in: 60 }, NOW)
    expect(parsed).toMatchObject({ provider: 'muse-code', accessToken: 'sk-muse', refreshToken: 'dca:abc', expiresAt: null })
    expect(parsed?.providerSpecificData).toEqual({ dcaToken: 'dca:abc', baseUrl: 'https://muse', email: 'm@x', name: 'M', authKind: 'oauth', importedFrom: 'cliproxyapi' })
  })

  test('a Muse record with only a DCA access token keeps the DCA clock', () => {
    const parsed = parseCliProxyAuthRecord({ type: 'meta', access_token: 'dca:only', api_key: 'dca:too', auth_kind: 'device', expires_in: 60 }, NOW)
    expect(parsed).toMatchObject({ accessToken: 'dca:only', refreshToken: 'dca:only', expiresAt: new Date(NOW + 60_000).toISOString() })
    expect(parsed?.providerSpecificData?.authKind).toBe('device')
  })

  test('a Muse access token that is not DCA is the inference key', () => {
    expect(parseCliProxyAuthRecord({ type: 'meta', access_token: 'sk-plain' }, NOW)).toMatchObject({ accessToken: 'sk-plain', refreshToken: null, expiresAt: null })
    expect(parseCliProxyAuthRecord({ type: 'meta' }, NOW)).toBeNull()
  })

  test('the connection payload names the account and marks the import', () => {
    const plain = toConnectionPayload(parseCliProxyAuthRecord({ type: 'codex', access_token: 'at' }, NOW)!, NOW)
    expect(plain).toEqual({ provider: 'codex', authType: 'oauth', email: undefined, name: 'codex (CLIProxyAPI import)', accessToken: 'at', refreshToken: undefined, expiresAt: undefined, testStatus: 'active', providerSpecificData: { importedFrom: 'cliproxyapi', importedAt: NOW_ISO } })
    const full = toConnectionPayload(parseCliProxyAuthRecord({ type: 'antigravity', access_token: 'at', refresh_token: 'rt', email: 'e@x', project_id: 'p', expires_in: 60 }, NOW)!, NOW)
    expect(full).toMatchObject({ name: 'e@x', email: 'e@x', refreshToken: 'rt', expiresAt: new Date(NOW + 60_000).toISOString(), providerSpecificData: { projectId: 'p', importedFrom: 'cliproxyapi' } })
    const muse = toConnectionPayload(parseCliProxyAuthRecord({ type: 'meta', api_key: 'sk', dca_token: 'dca:d' }, NOW)!, NOW)
    expect(muse.providerSpecificData).toMatchObject({ dcaToken: 'dca:d', importedFrom: 'cliproxyapi', importedAt: NOW_ISO })
  })
})

describe('CLIProxyAPI directory', () => {
  test('the directory comes from THYROX_CLIPROXYAPI_CONFIG_DIR, else the home default', () => {
    expect(cliProxyConfigDir({ THYROX_CLIPROXYAPI_CONFIG_DIR: '/srv/cpa' }, '/home/u')).toBe('/srv/cpa')
    expect(cliProxyConfigDir({ THYROX_CLIPROXYAPI_CONFIG_DIR: '  ' }, '/home/u')).toBe('/home/u/.cli-proxy-api')
    expect(cliProxyConfigDir({}, '/home/u')).toBe('/home/u/.cli-proxy-api')
  })

  test('every .json is read; broken or unsupported ones are counted as skipped', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cliproxy-'))
    writeFileSync(join(dir, 'a.json'), JSON.stringify({ type: 'codex', email: 'a@x', access_token: 'at' }))
    writeFileSync(join(dir, 'B.JSON'), JSON.stringify({ type: 'claude', email: 'b@x', access_token: 'bt' }))
    writeFileSync(join(dir, 'broken.json'), '{')
    writeFileSync(join(dir, 'other.json'), JSON.stringify({ type: 'gemini', access_token: 'x' }))
    writeFileSync(join(dir, 'notes.txt'), 'ignored')
    const scan = await scanCliProxyAuthDir(dir, NOW)
    expect(scan.scanned).toBe(4)
    expect(scan.skipped).toBe(2)
    expect(scan.candidates.map(c => c.email).sort()).toEqual(['a@x', 'b@x'])
    expect(await scanCliProxyAuthDir(join(dir, 'missing'), NOW)).toEqual({ candidates: [], skipped: 0, scanned: 0 })
  })

  test('the preview never carries tokens, and the import stores each account', () => {
    const candidates = [parseCliProxyAuthRecord({ type: 'codex', email: 'a@x', access_token: 'at' }, NOW)!, parseCliProxyAuthRecord({ type: 'claude', email: 'b@x', access_token: 'bt', refresh_token: 'br' }, NOW)!]
    expect(previewCliProxyAccounts(candidates)).toEqual([{ provider: 'codex', type: 'codex', email: 'a@x' }, { provider: 'claude', type: 'claude', email: 'b@x' }])
    const outcome = importCliProxyAccounts(store, candidates, NOW)
    expect(outcome).toEqual({ imported: 2, results: [{ provider: 'codex', email: 'a@x', ok: true }, { provider: 'claude', email: 'b@x', ok: true }] })
    expect(store.list({ provider: 'claude' })[0]).toMatchObject({ email: 'b@x', refreshToken: 'br', accessToken: 'bt' })
  })

  test('an account the store refuses is reported, not thrown', () => {
    const refusing = { ...store, create: () => { throw new Error('disk full') } } as ConnectionStore
    const candidate = parseCliProxyAuthRecord({ type: 'codex', email: 'a@x', access_token: 'at' }, NOW)!
    expect(importCliProxyAccounts(refusing, [candidate], NOW)).toEqual({ imported: 0, results: [{ provider: 'codex', email: 'a@x', ok: false, error: 'disk full' }] })
  })
})
