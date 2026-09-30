/**
 * El store de cuentas de proveedor (`provider_connections`): cada fila es una
 * cuenta de un upstream —clave de API u OAuth— con su prioridad, su estado de
 * error y de backoff, y sus credenciales cifradas en reposo. Crear una cuenta
 * que ya existe la actualiza en vez de duplicarla; la identidad se decide por
 * nombre, por valor de la clave o por la identidad OAuth.
 *
 * Porte de `omniroute: src/lib/db/providers.ts`, `providers/deletion.ts`,
 * `providers/columns.ts`, `providers/lazyConnectionView.ts`,
 * `webSessionDedup.ts` y `oauth/utils/codexConnectionSelection.ts` (MIT).
 */
import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, test } from 'bun:test'

import { createConnectionStore, type ConnectionStore } from '../../src/accounts/connectionStore.ts'
import { createFieldCipher, looksEncrypted } from '../../src/accounts/fieldCipher.ts'

let db: Database
let store: ConnectionStore
let clock: number
let ids: number

function rawRow(id: string): Record<string, unknown> {
  return db.query('SELECT * FROM provider_connections WHERE id = ?').get(id) as Record<string, unknown>
}

beforeEach(() => {
  db = new Database(':memory:')
  clock = Date.parse('2026-09-28T10:00:00.000Z')
  ids = 0
  store = createConnectionStore({
    db,
    cipher: createFieldCipher('store-test-secret', () => {}),
    now: () => new Date((clock += 1000)).toISOString(),
    newId: () => `conn-${++ids}`,
  })
})

describe('create', () => {
  test('a new account gets an id, the next priority and its defaults', () => {
    const first = store.create({ provider: 'openai', authType: 'apikey', name: 'a', apiKey: 'sk-1' })
    const second = store.create({ provider: 'openai', authType: 'apikey', name: 'b', apiKey: 'sk-2' })
    expect(first!.id).toBe('conn-1')
    expect(first!.priority).toBe(1)
    expect(second!.priority).toBe(2)
    expect(first!.isActive).toBe(true)
    expect(first!.proxyEnabled).toBe(true)
    expect(first!.perKeyProxyEnabled).toBe(false)
    expect(first!.quotaVisible).toBe(true)
    expect(first!.maxConcurrent).toBeUndefined()
    expect(first!.quotaWindowThresholds).toBeNull()
    expect(first!.rateLimitOverrides).toBeNull()
  })

  test('the credentials are ciphertext in the row and plaintext in what is returned', () => {
    const created = store.create({ provider: 'openai', authType: 'apikey', name: 'a', apiKey: 'sk-secret' })
    expect(created!.apiKey).toBe('sk-secret')
    const row = rawRow('conn-1')
    expect(looksEncrypted(row.api_key)).toBe(true)
    expect(store.getById('conn-1')!.apiKey).toBe('sk-secret')
  })

  test('an OAuth account without a name is named after its email', () => {
    const created = store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', accessToken: 't' })
    expect(created!.name).toBe('a@x.io')
    expect(store.create({ provider: 'openai', authType: 'apikey', apiKey: 'k' })!.name).toBeUndefined()
  })

  test('invalid thresholds or overrides are refused, not dropped', () => {
    expect(() =>
      store.create({ provider: 'openai', authType: 'apikey', name: 'a', quotaWindowThresholds: { daily: 120 } }),
    ).toThrow(/quotaWindowThresholds with rejected keys: daily/)
    expect(() =>
      store.create({ provider: 'openai', authType: 'apikey', name: 'a', rateLimitOverrides: { rpm: 5, bogus: 1 } }),
    ).toThrow(/rateLimitOverrides with rejected keys: bogus/)
    const kept = store.create({
      provider: 'openai',
      authType: 'apikey',
      name: 'a',
      quotaWindowThresholds: { daily: 80 },
      rateLimitOverrides: { rpm: 5 },
    })
    expect(store.getById(kept!.id as string)!.quotaWindowThresholds).toEqual({ daily: 80 })
    expect(store.getById(kept!.id as string)!.rateLimitOverrides).toEqual({ rpm: 5 })
  })
})

describe('create an account that already exists', () => {
  test('an API key with the same name updates it', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'main', apiKey: 'sk-old' })
    const again = store.create({ provider: 'openai', authType: 'apikey', name: 'main', apiKey: 'sk-new' })
    expect(again!.id).toBe('conn-1')
    expect(store.count()).toBe(1)
    expect(store.getById('conn-1')!.apiKey).toBe('sk-new')
  })

  test('the same key value under another name is the same account', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'one', apiKey: 'sk-same' })
    const again = store.create({ provider: 'openai', authType: 'apikey', name: 'two', apiKey: ' sk-same ' })
    expect(again!.id).toBe('conn-1')
    expect(store.count()).toBe(1)
  })

  test('a local provider with the same key but another base URL is another server', () => {
    const psd = (baseUrl: string) => ({ baseUrl })
    store.create({ provider: 'lm-studio', authType: 'apikey', apiKey: 'lm', providerSpecificData: psd('http://a:1234/') })
    store.create({ provider: 'lm-studio', authType: 'apikey', apiKey: 'lm', providerSpecificData: psd('http://b:1234') })
    store.create({ provider: 'lm-studio', authType: 'apikey', apiKey: 'lm', providerSpecificData: psd('http://a:1234') })
    expect(store.count({ provider: 'lm-studio' })).toBe(2)
  })

  test('an OAuth email re-login updates it and keeps the credentials it did not bring', () => {
    store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', accessToken: 'at-1', refreshToken: 'rt-1' })
    const again = store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', accessToken: 'at-2' })
    expect(again!.id).toBe('conn-1')
    const stored = store.getById('conn-1')!
    expect(stored.accessToken).toBe('at-2')
    expect(stored.refreshToken).toBe('rt-1')
  })

  test('a credential it cannot decrypt survives a re-login that does not bring it', () => {
    store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', accessToken: 'at-1', refreshToken: 'rt-1' })
    const sealed = rawRow('conn-1').refresh_token
    const otherKey = createConnectionStore({ db, cipher: createFieldCipher('another-secret', () => {}), newId: () => 'unused' })
    otherKey.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', accessToken: 'at-2' })
    expect(rawRow('conn-1').refresh_token).toBe(sealed)
    expect(store.getById('conn-1')!.refreshToken).toBe('rt-1')
  })

  test('the same email in two organizations is two accounts', () => {
    const org = (organizationUUID: string) => ({ organizationUUID })
    store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', providerSpecificData: org('o-1') })
    store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', providerSpecificData: org('o-2') })
    expect(store.count({ provider: 'claude' })).toBe(2)
    store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', providerSpecificData: org('o-1') })
    expect(store.count({ provider: 'claude' })).toBe(2)
  })

  test('a username on one side only is another account', () => {
    store.create({ provider: 'github', authType: 'oauth', email: 'a@x.io', providerSpecificData: { username: 'ann' } })
    store.create({ provider: 'github', authType: 'oauth', email: 'a@x.io' })
    expect(store.count({ provider: 'github' })).toBe(2)
  })

  test('a Codex account is matched by its user within the workspace', () => {
    const codex = (chatgptUserId: string) => ({ workspaceId: 'w-1', chatgptUserId })
    store.create({ provider: 'codex', authType: 'oauth', email: 'a@x.io', providerSpecificData: codex('u-1') })
    store.create({ provider: 'codex', authType: 'oauth', email: 'b@x.io', providerSpecificData: codex('u-2') })
    const again = store.create({ provider: 'codex', authType: 'oauth', email: 'a@x.io', providerSpecificData: codex('u-1') })
    expect(again!.id).toBe('conn-1')
    expect(store.count({ provider: 'codex' })).toBe(2)
  })

  test('a Codex row without a user id is promoted by its email', () => {
    store.create({ provider: 'codex', authType: 'oauth', email: 'a@x.io', providerSpecificData: { workspaceId: 'w-1' } })
    const again = store.create({
      provider: 'codex',
      authType: 'oauth',
      email: 'a@x.io',
      providerSpecificData: { workspaceId: 'w-1', chatgptUserId: 'u-1' },
    })
    expect(again!.id).toBe('conn-1')
  })

  test('a web session with the same secret under another key or name is the same account', () => {
    store.create({ provider: 'chatgpt-web', authType: 'cookie', name: 'one', providerSpecificData: { cookie: ' s-1 ' } })
    const again = store.create({ provider: 'chatgpt-web', authType: 'cookie', name: 'two', providerSpecificData: { sessionToken: 's-1' } })
    expect(again!.id).toBe('conn-1')
    store.create({ provider: 'chatgpt-web', authType: 'cookie', providerSpecificData: { cookie: 's-2' } })
    expect(store.count({ provider: 'chatgpt-web' })).toBe(2)
  })

  test('a bare access token is never deduplicated', () => {
    store.create({ provider: 'codex', authType: 'access_token', email: 'a@x.io', accessToken: 't' })
    store.create({ provider: 'codex', authType: 'access_token', email: 'a@x.io', accessToken: 't' })
    expect(store.count()).toBe(2)
  })
})

describe('read', () => {
  test('list filters, orders by priority and decrypts only on access', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'a', apiKey: 'sk-a' })
    store.create({ provider: 'openai', authType: 'apikey', name: 'b', apiKey: 'sk-b', isActive: false })
    store.create({ provider: 'claude', authType: 'oauth', email: 'c@x.io', accessToken: 'at' })
    const openai = store.list({ provider: 'openai' })
    expect(openai.map((c) => c.name)).toEqual(['a', 'b'])
    expect(openai[0]!.apiKey).toBe('sk-a')
    expect(JSON.parse(JSON.stringify(openai[1]!)).apiKey).toBe('sk-b')
    expect(store.list({ isActive: false }).map((c) => c.name)).toEqual(['b'])
    expect(store.list({ authType: 'oauth' })).toHaveLength(1)
    expect(store.list({}, { limit: 1, offset: 1 })).toHaveLength(1)
    expect(store.count({ isActive: true })).toBe(2)
  })

  test('the raw list keeps the ciphertext', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'a', apiKey: 'sk-a' })
    expect(looksEncrypted(store.listRaw()[0]!.apiKey)).toBe(true)
  })

  test('a projection only admits real columns, and quotes group', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'a', group: 'team' })
    expect(store.listRaw({}, { columns: ['id', 'group'] })[0]).toEqual({
      id: 'conn-1',
      group: 'team',
      quotaWindowThresholds: null,
      rateLimitOverrides: null,
    })
    expect(() => store.listRaw({}, { columns: ['id; DROP TABLE x'] })).toThrow(/invalid column/)
  })

  test('display metadata reads labels without the credentials', () => {
    store.create({ provider: 'claude', authType: 'oauth', email: 'a@x.io', displayName: 'Ann', accessToken: 'at' })
    expect(store.displayMetadata(['conn-1', 'conn-1', '', 'missing'])).toEqual([
      { id: 'conn-1', name: 'a@x.io', displayName: 'Ann', email: 'a@x.io' },
    ])
  })

  test('an unknown id is null', () => {
    expect(store.getById('missing')).toBeNull()
  })
})

describe('update', () => {
  test('merges the change, re-encrypts and refreshes updatedAt', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'a', apiKey: 'sk-a' })
    const before = rawRow('conn-1').updated_at
    const updated = store.update('conn-1', { name: 'renamed', apiKey: 'sk-b' })
    expect(updated!.name).toBe('renamed')
    expect(rawRow('conn-1').updated_at).not.toBe(before)
    expect(looksEncrypted(rawRow('conn-1').api_key)).toBe(true)
    expect(store.getById('conn-1')!.apiKey).toBe('sk-b')
  })

  test('refuses invalid thresholds and ignores an unknown id', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'a' })
    expect(() => store.update('conn-1', { quotaWindowThresholds: { daily: -1 } })).toThrow(/rejected keys: daily/)
    expect(store.update('missing', { name: 'x' })).toBeNull()
  })

  test('a priority change reorders the provider', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'a' })
    store.create({ provider: 'openai', authType: 'apikey', name: 'b' })
    store.update('conn-2', { priority: 0 })
    expect(store.list({ provider: 'openai' }).map((c) => [c.name, c.priority])).toEqual([
      ['b', 1],
      ['a', 2],
    ])
  })
})

describe('usage and backoff', () => {
  test('touching the last use sets its time and count', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'a' })
    store.touchLastUsed('conn-1', 7)
    expect(rawRow('conn-1').consecutive_use_count).toBe(7)
    expect(rawRow('conn-1').last_used_at).toBeString()
    store.touchSyncedModelsAt('conn-1')
    expect(rawRow('conn-1').synced_models_at).toBeString()
  })

  test('resetting the backoff clears every error column', () => {
    store.create({
      provider: 'openai',
      authType: 'apikey',
      name: 'a',
      lastError: 'boom',
      lastErrorType: 'rate_limit',
      lastErrorSource: 'upstream',
      errorCode: '429',
      testStatus: 'error',
    })
    store.update('conn-1', { backoffLevel: 3, lastErrorAt: '2026-09-28T09:00:00.000Z' })
    store.resetBackoff('conn-1')
    const row = rawRow('conn-1')
    expect(row.backoff_level).toBe(0)
    expect(row.test_status).toBe('active')
    for (const column of ['last_error', 'last_error_at', 'last_error_type', 'last_error_source', 'error_code']) {
      expect(row[column]).toBeNull()
    }
  })

  test('the groups are distinct, sorted and without null', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'a', group: 'z' })
    store.create({ provider: 'openai', authType: 'apikey', name: 'b', group: 'a' })
    store.create({ provider: 'openai', authType: 'apikey', name: 'c', group: 'z' })
    store.create({ provider: 'openai', authType: 'apikey', name: 'd' })
    expect(store.distinctGroups()).toEqual(['a', 'z'])
  })
})

describe('delete', () => {
  test('one account, and the rest of its provider is renumbered', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'a' })
    store.create({ provider: 'openai', authType: 'apikey', name: 'b' })
    store.create({ provider: 'openai', authType: 'apikey', name: 'c' })
    expect(store.delete('conn-2')).toBe(true)
    expect(store.delete('conn-2')).toBe(false)
    expect(store.list({ provider: 'openai' }).map((c) => [c.name, c.priority])).toEqual([
      ['a', 1],
      ['c', 2],
    ])
  })

  test('several at once, and a whole provider', () => {
    store.create({ provider: 'openai', authType: 'apikey', name: 'a' })
    store.create({ provider: 'openai', authType: 'apikey', name: 'b' })
    store.create({ provider: 'claude', authType: 'apikey', name: 'c' })
    store.create({ provider: 'claude', authType: 'apikey', name: 'd' })
    expect(store.deleteMany([])).toBe(0)
    expect(store.deleteMany(['conn-1', 'missing'])).toBe(1)
    expect(store.deleteByProvider('claude')).toBe(2)
    expect(store.list().map((c) => c.name)).toEqual(['b'])
  })
})
