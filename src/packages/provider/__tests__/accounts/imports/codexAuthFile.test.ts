/**
 * El `auth.json` del CLI de codex en las dos direcciones: exportar una
 * conexión (sólo si hace falta, para no pisar una sesión sana del usuario) e
 * importarlo como conexión, distinguiendo dos usuarios del mismo espacio de
 * trabajo.
 *
 * Porte de `omniroute: src/lib/oauth/utils/codexAuthFile.ts` y
 * `codexAuthImport.ts` (MIT).
 */
import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createConnectionStore, type ConnectionStore } from '../../../src/accounts/connectionStore.ts'
import { createFieldCipher } from '../../../src/accounts/fieldCipher.ts'
import { buildCodexAuthFile, buildCodexAuthPayload, isCodexAuthStale, writeCodexAuthFile, writeCodexAuthFileIfNeeded } from '../../../src/accounts/imports/codexAuthFile.ts'
import { createConnectionFromCodexAuthFile, parseAndValidateCodexAuth } from '../../../src/accounts/imports/codexAuthImport.ts'

const NOW = Date.parse('2026-09-28T10:00:00.000Z')
const NOW_SECONDS = NOW / 1000
const AUTH_CLAIM = 'https://api.openai.com/auth'
let store: ConnectionStore
let ids = 0

beforeEach(() => {
  ids = 0
  store = createConnectionStore({
    db: new Database(':memory:'),
    cipher: createFieldCipher('codex-file-test-secret', () => {}),
    now: () => new Date(NOW).toISOString(),
    newId: () => `conn-${++ids}`,
  })
})

const jwt = (payload: Record<string, unknown>) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`
const idToken = (auth: Record<string, unknown>, extra: Record<string, unknown> = {}) => jwt({ [AUTH_CLAIM]: auth, ...extra })
const noRefresh = async () => null

describe('export', () => {
  test('the payload needs the three tokens and an account id, from the claim or the workspace', () => {
    const connection = { idToken: idToken({ chatgpt_account_id: 'acc' }), accessToken: 'a', refreshToken: 'r' }
    expect(buildCodexAuthPayload(connection, NOW)).toEqual({ auth_mode: 'chatgpt', OPENAI_API_KEY: null, tokens: { id_token: connection.idToken, access_token: 'a', refresh_token: 'r', account_id: 'acc' }, last_refresh: '2026-09-28T10:00:00.000Z' })
    expect(buildCodexAuthPayload({ ...connection, idToken: idToken({ account_id: 'legacy' }) }, NOW).tokens.account_id).toBe('legacy')
    expect(buildCodexAuthPayload({ ...connection, idToken: idToken({}), providerSpecificData: { workspaceId: 'ws' } }, NOW).tokens.account_id).toBe('ws')
    expect(() => buildCodexAuthPayload({ ...connection, idToken: idToken({}) }, NOW)).toThrow('Unable to derive Codex account_id')
    expect(() => buildCodexAuthPayload({ ...connection, idToken: ' ' }, NOW)).toThrow('missing id_token')
    expect(() => buildCodexAuthPayload({ ...connection, accessToken: null }, NOW)).toThrow('missing access_token')
    expect(() => buildCodexAuthPayload({ ...connection, refreshToken: null }, NOW)).toThrow('missing refresh_token')
  })

  test('the file is named by the id-token email, then the stored email, then the label', async () => {
    const withClaim = store.create({ provider: 'codex', authType: 'oauth', name: 'Work', email: 'stored@x', accessToken: 'a', refreshToken: 'r', idToken: idToken({ chatgpt_account_id: 'acc', chatgpt_user_id: 'u1' }, { email: 'Claim@X' }), providerSpecificData: { workspaceId: 'acc', chatgptUserId: 'u1' } })!
    const deps = { store, now: () => NOW, refresh: noRefresh }
    expect((await buildCodexAuthFile(deps, withClaim.id as string)).fileName).toBe('auth-claim@x.json')
    const plain = store.create({ provider: 'codex', authType: 'oauth', name: 'Work', email: 'stored@x', accessToken: 'a', refreshToken: 'r', idToken: idToken({ chatgpt_account_id: 'acc2', chatgpt_user_id: 'u2' }), providerSpecificData: { workspaceId: 'acc2', chatgptUserId: 'u2' } })!
    expect((await buildCodexAuthFile(deps, plain.id as string)).fileName).toBe('auth-stored@x.json')
    const anthropic = store.create({ provider: 'claude', authType: 'oauth', email: 'a@x', accessToken: 'a', refreshToken: 'r' })!
    await expect(buildCodexAuthFile(deps, anthropic.id as string)).rejects.toThrow('Only Codex provider connections')
  })

  test('a refresh that returns its own expiry keeps it', async () => {
    const stale = store.create({ provider: 'codex', authType: 'oauth', email: 's@x', accessToken: 'old', refreshToken: 'r', expiresAt: new Date(NOW + 60_000).toISOString(), idToken: idToken({ chatgpt_account_id: 'acc' }) })!
    const refresh = async () => ({ accessToken: 'new', expiresAt: '2026-09-29T00:00:00.000Z', expiresIn: 60 })
    await buildCodexAuthFile({ store, now: () => NOW, refresh }, stale.id as string)
    expect(store.getById(stale.id as string)!.expiresAt).toBe('2026-09-29T00:00:00.000Z')
  })

  test('writing replaces the whole file, keeps a side backup and is owner-only', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'codex-file-'))
    const authPath = join(dir, '.codex', 'auth.json')
    const connection = store.create({ provider: 'codex', authType: 'oauth', email: 'w@x', accessToken: 'a', refreshToken: 'r', idToken: idToken({ chatgpt_account_id: 'acc' }) })!
    const built = await buildCodexAuthFile({ store, now: () => NOW, refresh: noRefresh }, connection.id as string)
    await writeCodexAuthFile(built, { authPath, now: () => NOW })
    writeFileSync(authPath, JSON.stringify({ extra: true }))
    const written = await writeCodexAuthFile(built, { authPath, now: () => NOW })
    expect(written.savedBakPath).toBe(join(dir, '.codex', 'auth-2026-09-28T10-00-00-000Z.bak'))
    expect(JSON.parse(readFileSync(authPath, 'utf8')).extra).toBeUndefined()
    expect(statSync(authPath).mode & 0o777).toBe(0o600)
  })

  test('a stored file is stale by its token exp, else by six hours since its last refresh; unknown is fresh', () => {
    const file = (accessToken: string, lastRefresh?: string) => ({ auth_mode: 'chatgpt' as const, OPENAI_API_KEY: null, tokens: { id_token: 'i', access_token: accessToken, refresh_token: 'r', account_id: 'a' }, last_refresh: lastRefresh as string })
    expect(isCodexAuthStale(file(jwt({ exp: NOW_SECONDS + 300 })), NOW)).toBe(true)
    expect(isCodexAuthStale(file(jwt({ exp: NOW_SECONDS + 301 })), NOW)).toBe(false)
    expect(isCodexAuthStale(file('opaque', new Date(NOW - 6 * 3_600_000).toISOString()), NOW)).toBe(true)
    expect(isCodexAuthStale(file('opaque', new Date(NOW - 6 * 3_600_000 + 1).toISOString()), NOW)).toBe(false)
    expect(isCodexAuthStale(file('opaque', 'garbage'), NOW)).toBe(false)
    expect(isCodexAuthStale(file('opaque'), NOW)).toBe(false)
  })

  test('the guarded write leaves a healthy session alone unless forced, and writes an absent or stale one', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'codex-guard-'))
    const authPath = join(dir, 'auth.json')
    const connection = store.create({ provider: 'codex', authType: 'oauth', email: 'g@x', accessToken: 'a', refreshToken: 'r', idToken: idToken({ chatgpt_account_id: 'acc' }) })!
    const deps = { store, now: () => NOW, refresh: noRefresh }
    const id = connection.id as string
    expect((await writeCodexAuthFileIfNeeded(deps, id, { authPath })).decision).toBe('written')
    writeFileSync(authPath, JSON.stringify({ tokens: { access_token: jwt({ exp: NOW_SECONDS + 3600 }) } }))
    expect((await writeCodexAuthFileIfNeeded(deps, id, { authPath })).decision).toBe('skipped_present_fresh')
    expect((await writeCodexAuthFileIfNeeded(deps, id, { authPath, force: true })).decision).toBe('written')
    writeFileSync(authPath, JSON.stringify({ tokens: { access_token: jwt({ exp: NOW_SECONDS }) } }))
    expect((await writeCodexAuthFileIfNeeded(deps, id, { authPath })).decision).toBe('written')
    writeFileSync(authPath, JSON.stringify({ tokens: {} }))
    expect((await writeCodexAuthFileIfNeeded(deps, id, { authPath })).decision).toBe('written')
  })
})

describe('import', () => {
  const tokens = (auth: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ tokens: { id_token: idToken(auth, extra), access_token: jwt({ exp: NOW_SECONDS + 7200 }), refresh_token: 'r', ...extra.fileTokens as object } })

  test('the file names the account, the user and the expiry of the access token first', () => {
    const parsed = parseAndValidateCodexAuth(tokens({ chatgpt_account_id: 'acc', chatgpt_user_id: 'u1' }, { email: 'e@x', exp: NOW_SECONDS }))
    expect([parsed.accountId, parsed.userId, parsed.email, parsed.expiresAt]).toEqual(['acc', 'u1', 'e@x', '2026-09-28T12:00:00.000Z'])
    const opaque = parseAndValidateCodexAuth({ tokens: { id_token: idToken({ account_id: 'a2', user_id: 'u2' }, { exp: NOW_SECONDS }), access_token: 'opaque', refresh_token: 'r', account_id: ' tok ' } })
    expect([opaque.accountId, opaque.userId, opaque.expiresAt]).toEqual(['tok', 'u2', '2026-09-28T10:00:00.000Z'])
    expect(parseAndValidateCodexAuth({ tokens: { id_token: jwt({ sub: 's', [AUTH_CLAIM]: { account_id: 'a' } }), access_token: 'x', refresh_token: 'r' } }).userId).toBe('s')
  })

  test('a foreign auth_mode, a missing token or no account id is refused', () => {
    const good = tokens({ chatgpt_account_id: 'acc' })
    expect(() => parseAndValidateCodexAuth({ ...good, auth_mode: 'apikey' })).toThrow('unexpected auth_mode')
    expect(parseAndValidateCodexAuth({ ...good, auth_mode: null }).accountId).toBe('acc')
    expect(() => parseAndValidateCodexAuth({ tokens: { ...good.tokens, id_token: '' } })).toThrow('id_token is missing')
    expect(() => parseAndValidateCodexAuth({ tokens: { ...good.tokens, access_token: '' } })).toThrow('access_token is missing')
    expect(() => parseAndValidateCodexAuth({ tokens: { ...good.tokens, refresh_token: '' } })).toThrow('refresh_token is missing')
    expect(() => parseAndValidateCodexAuth(tokens({}))).toThrow('Unable to derive account_id')
  })

  test('a new account is created; the same user again is a duplicate unless overwritten', () => {
    const parsed = parseAndValidateCodexAuth(tokens({ chatgpt_account_id: 'acc', chatgpt_user_id: 'u1' }, { email: 'e@x' }))
    const first = createConnectionFromCodexAuthFile(store, parsed, {}, { now: () => NOW })
    expect([first.created, first.connection.name, (first.connection.providerSpecificData as any).workspaceId]).toEqual([true, 'e@x', 'acc'])
    expect(() => createConnectionFromCodexAuthFile(store, parsed, {}, { now: () => NOW })).toThrow('already exists')
    const again = createConnectionFromCodexAuthFile(store, { ...parsed, accessToken: 'a2' }, { overwriteExisting: true }, { now: () => NOW })
    expect([again.created, again.connection.id, again.connection.accessToken]).toEqual([false, first.connection.id, 'a2'])
  })

  test('another user of the same workspace is a new account; a legacy row without user keeps its stored one', () => {
    createConnectionFromCodexAuthFile(store, parseAndValidateCodexAuth(tokens({ chatgpt_account_id: 'acc', chatgpt_user_id: 'u1' }, { email: 'one@x' })), {}, { now: () => NOW })
    const second = createConnectionFromCodexAuthFile(store, parseAndValidateCodexAuth(tokens({ chatgpt_account_id: 'acc', chatgpt_user_id: 'u2' }, { email: 'two@x' })), {}, { now: () => NOW })
    expect(second.created).toBe(true)
    const legacy = store.create({ provider: 'codex', authType: 'oauth', name: 'Legacy', accessToken: 'l', providerSpecificData: { workspaceId: 'ws', chatgptUserId: 'stored' } })!
    const overwrite = createConnectionFromCodexAuthFile(store, { ...parseAndValidateCodexAuth(tokens({ chatgpt_account_id: 'ws' })), userId: null }, { overwriteExisting: true }, { now: () => NOW })
    expect([overwrite.connection.id, (overwrite.connection.providerSpecificData as any).chatgptUserId, overwrite.connection.name]).toEqual([legacy.id, 'stored', 'Legacy'])
  })
})
