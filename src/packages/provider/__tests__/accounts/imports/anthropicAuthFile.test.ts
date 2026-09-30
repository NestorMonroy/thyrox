/**
 * El archivo de credenciales del CLI de Anthropic en las dos direcciones:
 * exportar una conexión OAuth (refrescándola si está por caducar) y escribirla
 * sin perder lo que el CLI guardó al lado; e importar ese archivo como
 * conexión, identificando la cuenta por el bootstrap del servicio.
 *
 * Porte de `omniroute: src/lib/oauth/utils/claudeAuthFile.ts` y
 * `claudeAuthImport.ts` (MIT).
 */
import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createConnectionStore, type ConnectionStore } from '../../../src/accounts/connectionStore.ts'
import { createFieldCipher } from '../../../src/accounts/fieldCipher.ts'
import { anthropicConnectionLabel, buildAnthropicAuthFile, buildAnthropicAuthPayload, writeAnthropicAuthFile } from '../../../src/accounts/imports/anthropicAuthFile.ts'
import { sanitizeFileNamePart, shouldRefreshConnection } from '../../../src/accounts/imports/cliAuthFileExport.ts'
import { createConnectionFromAuthFile, enrichWithBootstrap, parseAndValidateAnthropicAuth } from '../../../src/accounts/imports/anthropicAuthImport.ts'

const NOW = Date.parse('2026-09-28T10:00:00.000Z')
let store: ConnectionStore
let ids = 0

beforeEach(() => {
  ids = 0
  store = createConnectionStore({
    db: new Database(':memory:'),
    cipher: createFieldCipher('auth-file-test-secret', () => {}),
    now: () => new Date(NOW).toISOString(),
    newId: () => `conn-${++ids}`,
  })
})

function scriptedFetch(answer: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input), init)
  }
  return { calls, fetch: fetch as typeof globalThis.fetch }
}

const inMinutes = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString()

describe('export', () => {
  test('a connection without an access token needs refresh; one without expiry does not; five minutes is the margin', () => {
    expect(shouldRefreshConnection({ accessToken: ' ' }, NOW)).toBe(true)
    expect(shouldRefreshConnection({ accessToken: 'a' }, NOW)).toBe(false)
    expect(shouldRefreshConnection({ accessToken: 'a', expiresAt: 'garbage' }, NOW)).toBe(false)
    expect(shouldRefreshConnection({ accessToken: 'a', expiresAt: inMinutes(5) }, NOW)).toBe(true)
    expect(shouldRefreshConnection({ accessToken: 'a', expiresAt: inMinutes(6) }, NOW)).toBe(false)
  })

  test('the label and the file name part', () => {
    expect(anthropicConnectionLabel({ email: 'e@x', id: 'i' })).toBe('e@x')
    expect(anthropicConnectionLabel({})).toBe('anthropic-account')
    expect(sanitizeFileNamePart('  Ada Lovelace/Work@X.io ')).toBe('ada-lovelace-work@x.io')
    expect(sanitizeFileNamePart('///')).toBe('account')
  })

  test('the payload carries the tokens, the expiry in milliseconds, the scopes and the declared plan', () => {
    expect(buildAnthropicAuthPayload({ accessToken: 'a', refreshToken: 'r', expiresAt: inMinutes(60), providerSpecificData: { scopes: ['user:inference', 7], subscriptionType: 'max', rateLimitTier: ' ' } })).toEqual({
      claudeAiOauth: { accessToken: 'a', refreshToken: 'r', expiresAt: NOW + 3_600_000, scopes: ['user:inference'], subscriptionType: 'max' },
    })
    expect(() => buildAnthropicAuthPayload({ refreshToken: 'r' })).toThrow('missing access_token')
    expect(() => buildAnthropicAuthPayload({ accessToken: 'a' })).toThrow('missing refresh_token')
  })

  test('only an Anthropic OAuth connection exports, and a fresh one is not refreshed', async () => {
    const created = store.create({ provider: 'claude', authType: 'oauth', name: 'Work', email: 'Ada@X.io', accessToken: 'a', refreshToken: 'r', expiresAt: inMinutes(60) })!
    const other = store.create({ provider: 'openai', authType: 'apikey', name: 'k', apiKey: 'sk' })!
    const apiKey = store.create({ provider: 'claude', authType: 'apikey', name: 'k2', apiKey: 'sk-ant' })!
    let refreshed = 0
    const deps = { store, now: () => NOW, refresh: async () => { refreshed += 1; return null } }
    const built = await buildAnthropicAuthFile(deps, created.id as string)
    expect([built.fileName, built.email, built.connectionLabel, refreshed]).toEqual(['anthropic-auth-ada@x.io.json', 'Ada@X.io', 'Work', 0])
    await expect(buildAnthropicAuthFile(deps, apiKey.id as string)).rejects.toThrow('Only OAuth Anthropic connections')
    expect(built.content.endsWith('\n')).toBe(true)
    await expect(buildAnthropicAuthFile(deps, 'missing')).rejects.toThrow('Connection not found')
    await expect(buildAnthropicAuthFile(deps, other.id as string)).rejects.toThrow('Only Anthropic provider connections')
  })

  test('a stale connection is refreshed, persisted and exported with the new tokens', async () => {
    const created = store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', accessToken: 'old', refreshToken: 'r', expiresAt: inMinutes(1), providerSpecificData: { scopes: ['s'] } })!
    const refresh = async () => ({ accessToken: 'new', expiresIn: 3600, providerSpecificData: { rateLimitTier: 't' } })
    const built = await buildAnthropicAuthFile({ store, now: () => NOW, refresh }, created.id as string)
    expect(built.payload.claudeAiOauth).toEqual({ accessToken: 'new', refreshToken: 'r', expiresAt: NOW + 3_600_000, scopes: ['s'], rateLimitTier: 't' })
    expect(store.getById(created.id as string)!.accessToken).toBe('new')
  })

  test('an unrecoverable or empty refresh is refused with its code', async () => {
    const created = store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', accessToken: 'old', refreshToken: 'r', expiresAt: inMinutes(1) })!
    await expect(buildAnthropicAuthFile({ store, now: () => NOW, refresh: async () => ({ unrecoverable: true }) }, created.id as string)).rejects.toMatchObject({ code: 'reauth_required', status: 409 })
    await expect(buildAnthropicAuthFile({ store, now: () => NOW, refresh: async () => null }, created.id as string)).rejects.toMatchObject({ code: 'refresh_failed', status: 502 })
  })

  test('writing keeps what the CLI stored beside the tokens, backs up the old file and leaves it owner-only', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'auth-file-'))
    const authPath = join(dir, '.anthropic', '.credentials.json')
    const created = store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', accessToken: 'a', refreshToken: 'r', expiresAt: inMinutes(60) })!
    const built = await buildAnthropicAuthFile({ store, now: () => NOW, refresh: async () => null }, created.id as string)
    const first = await writeAnthropicAuthFile(built, { authPath, now: () => NOW })
    expect([first.savedBakPath, first.mcpOAuthPreserved]).toEqual([null, false])
    writeFileSync(authPath, JSON.stringify({ mcpOAuth: { server: 'x' }, claudeAiOauth: { accessToken: 'stale' } }))
    const second = await writeAnthropicAuthFile(built, { authPath, now: () => NOW })
    const written = JSON.parse(readFileSync(authPath, 'utf8'))
    expect([written.mcpOAuth, written.claudeAiOauth.accessToken, second.mcpOAuthPreserved]).toEqual([{ server: 'x' }, 'a', true])
    expect(second.savedBakPath).toBe(join(dir, '.anthropic', 'credentials-2026-09-28T10-00-00-000Z.bak'))
    expect(JSON.parse(readFileSync(second.savedBakPath!, 'utf8')).claudeAiOauth.accessToken).toBe('stale')
    expect(statSync(authPath).mode & 0o777).toBe(0o600)
    expect(readdirSync(join(dir, '.anthropic')).length).toBe(2)
    expect(existsSync(authPath)).toBe(true)
  })
})

describe('import', () => {
  test('the file needs both tokens; the expiry becomes ISO and the scopes stay strings', () => {
    expect(parseAndValidateAnthropicAuth({ claudeAiOauth: { accessToken: ' a ', refreshToken: 'r', expiresAt: NOW, scopes: ['s', 1], subscriptionType: 'pro' } })).toEqual({
      accessToken: 'a', refreshToken: 'r', expiresAt: '2026-09-28T10:00:00.000Z', scopes: ['s'], subscriptionType: 'pro', rateLimitTier: null, email: null,
    })
    expect(parseAndValidateAnthropicAuth({ claudeAiOauth: { accessToken: 'a', refreshToken: 'r', expiresAt: ' 2026-01-01 ' } }).expiresAt).toBe('2026-01-01')
    expect(() => parseAndValidateAnthropicAuth({ claudeAiOauth: { refreshToken: 'r' } })).toThrow('accessToken is missing')
    expect(() => parseAndValidateAnthropicAuth({})).toThrow('accessToken is missing')
    expect(() => parseAndValidateAnthropicAuth({ claudeAiOauth: { accessToken: 'a' } })).toThrow('refreshToken is missing')
  })

  test('the bootstrap names the account and its organization; a failed one leaves them empty', async () => {
    const parsed = parseAndValidateAnthropicAuth({ claudeAiOauth: { accessToken: 'a', refreshToken: 'r', rateLimitTier: 'file' } })
    const { calls, fetch } = scriptedFetch(() => Response.json({ account_uuid: 'U-1', organization_uuid: 'o', organization_name: 'Org', account_email: 'b@x.io' }))
    const enriched = await enrichWithBootstrap(parsed, { fetch, userAgent: 'thyrox/1' })
    expect(calls[0]!.url).toBe('https://api.anthropic.com/api/claude_cli/bootstrap')
    expect((calls[0]!.init.headers as Record<string, string>)['anthropic-beta']).toBe('oauth-2025-04-20')
    expect([enriched.accountUUID, enriched.organizationName, enriched.email, enriched.rateLimitTier]).toEqual(['U-1', 'Org', 'b@x.io', 'file'])
    const { fetch: down } = scriptedFetch(() => Response.json({ account_uuid: 'from-an-error' }, { status: 500 }))
    expect((await enrichWithBootstrap(parsed, { fetch: down, userAgent: 'thyrox/1' })).accountUUID).toBeNull()
    const { fetch: broken } = scriptedFetch(() => { throw new Error('offline') })
    expect((await enrichWithBootstrap(parsed, { fetch: broken, userAgent: 'thyrox/1' })).accountUUID).toBeNull()
  })

  const enriched = (overrides: Record<string, unknown> = {}) => ({
    accessToken: 'a', refreshToken: 'r', expiresAt: null, scopes: [], subscriptionType: null, rateLimitTier: null, email: null,
    accountUUID: null, organizationUUID: null, organizationName: null, organizationType: null, ...overrides,
  })
  const deps = { now: () => NOW, randomHex: () => 'f'.repeat(64) }

  test('a new account is created with a device identity; without any identity it needs overwrite', () => {
    const result = createConnectionFromAuthFile(store, enriched({ accountUUID: 'U-1', email: 'b@x.io' }), {}, deps)
    expect(result.created).toBe(true)
    expect([result.connection.name, (result.connection.providerSpecificData as any).cliUserID]).toEqual(['b@x.io', 'f'.repeat(64)])
    expect(() => createConnectionFromAuthFile(store, enriched(), {}, deps)).toThrow('Could not verify the account identity')
    expect(createConnectionFromAuthFile(store, enriched(), { overwriteExisting: true }, deps).connection.name).toBe('Anthropic (imported)')
  })

  test('the same account again is a duplicate unless overwritten, and overwrite keeps its device identity', () => {
    const first = createConnectionFromAuthFile(store, enriched({ accountUUID: 'U-1', email: 'b@x.io' }), { name: 'Mine' }, deps)
    expect(() => createConnectionFromAuthFile(store, enriched({ accountUUID: 'u-1', accessToken: 'a2' }), {}, deps)).toThrow('already exists')
    const again = createConnectionFromAuthFile(store, enriched({ accountUUID: 'u-1', accessToken: 'a2' }), { overwriteExisting: true }, { now: () => NOW, randomHex: () => '0'.repeat(64) })
    expect([again.created, again.connection.id, again.connection.name, again.connection.accessToken]).toEqual([false, first.connection.id, 'Mine', 'a2'])
    expect((again.connection.providerSpecificData as any).cliUserID).toBe('f'.repeat(64))
  })
})
