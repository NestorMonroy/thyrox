/**
 * El store de conexiones de proveedor vive en su propio hogar bajo el de
 * configuración de thyrox, o donde declare `THYROX_PROVIDERS_DATA_DIR`. El
 * directorio se crea sólo para el dueño y la base guarda las credenciales
 * cifradas con la clave del entorno.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { BUSY_TIMEOUT_MS } from '@thyrox/store/db.ts'
import {
  CONNECTIONS_DB_FILE,
  declaredStorageKey,
  openConnectionStore,
  openExistingConnectionStore,
  resolveProvidersDataDir,
} from '../../src/accounts/connectionStoreHome.ts'
import { looksEncrypted } from '../../src/accounts/fieldCipher.ts'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})
const tempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-providers-home-'))
  dirs.push(dir)
  return dir
}

describe('the providers data dir', () => {
  test('is the declared THYROX_PROVIDERS_DATA_DIR, resolved', () => {
    expect(resolveProvidersDataDir({ THYROX_PROVIDERS_DATA_DIR: 'rel/dir' })).toBe(path.resolve('rel/dir'))
  })

  test('without a declaration, or a blank one, is providers under the config home', () => {
    const home = tempDir()
    const env = { THYROX_CONFIG_DIR: home }
    expect(resolveProvidersDataDir(env)).toBe(path.join(home, 'providers'))
    expect(resolveProvidersDataDir({ ...env, THYROX_PROVIDERS_DATA_DIR: '   ' })).toBe(path.join(home, 'providers'))
  })
})

describe('opening the connection store', () => {
  test('creates an owner-only dir, keeps rows across openings, and encrypts secrets at rest', () => {
    const dir = path.join(tempDir(), 'nested', 'providers')
    const env = { THYROX_PROVIDERS_DATA_DIR: dir, THYROX_STORAGE_ENCRYPTION_KEY: 'k'.repeat(32) }
    const first = openConnectionStore({ env })
    const created = first.store.create({ provider: 'openai', authType: 'apikey', name: 'main', apiKey: 'sk-secret' })
    first.close()
    expect(fs.statSync(dir).mode & 0o777).toBe(0o700)
    expect(fs.readFileSync(path.join(dir, CONNECTIONS_DB_FILE)).includes(Buffer.from('sk-secret'))).toBe(false)
    const second = openConnectionStore({ env })
    expect(second.store.getById(created!.id as string)?.apiKey).toBe('sk-secret')
    second.close()
  })

  test('an existing dir opened by others is closed down to its owner', () => {
    const dir = path.join(tempDir(), 'providers')
    fs.mkdirSync(dir, { mode: 0o755 })
    fs.chmodSync(dir, 0o755)
    openConnectionStore({ env: { THYROX_PROVIDERS_DATA_DIR: dir } }).close()
    expect(fs.statSync(dir).mode & 0o777).toBe(0o700)
  })

  // La base la lee el proxy en cada petición mientras la CLI escribe: sin
  // busy_timeout, esa contención fallaría al instante en vez de esperar.
  test('opens with busy_timeout fijado (ADR-THYROX-006 regla 3)', () => {
    const dir = path.join(tempDir(), 'providers')
    const opened = openConnectionStore({ env: { THYROX_PROVIDERS_DATA_DIR: dir } })
    const timeout = (opened.db.query('PRAGMA busy_timeout').get() as { timeout: number }).timeout
    opened.close()
    expect(timeout).toBe(BUSY_TIMEOUT_MS)
  })
})

describe('the declared storage key', () => {
  const none = () => null
  test('the process environment wins over the env file', () => {
    expect(declaredStorageKey({ THYROX_STORAGE_ENCRYPTION_KEY: 'from-env' }, () => 'from-file')).toBe('from-env')
  })
  test('without it in the process, the env file declaration is used', () => {
    expect(declaredStorageKey({}, (name) => (name === 'THYROX_STORAGE_ENCRYPTION_KEY' ? 'from-file' : null))).toBe('from-file')
  })
  test('a blank value counts as undeclared', () => {
    expect(declaredStorageKey({ THYROX_STORAGE_ENCRYPTION_KEY: '  ' }, none)).toBeUndefined()
  })
})

describe('opening an existing connection store', () => {
  test('without the database it returns nothing and creates nothing', () => {
    const dir = path.join(tempDir(), 'absent')
    expect(openExistingConnectionStore({ env: { THYROX_PROVIDERS_DATA_DIR: dir }, declared: () => null })).toBeUndefined()
    expect(fs.existsSync(dir)).toBe(false)
  })
  test('with the database it opens it and ciphers with the key from the env file', () => {
    const dir = tempDir()
    const env = { THYROX_PROVIDERS_DATA_DIR: dir }
    const declared = (name: string) => (name === 'THYROX_STORAGE_ENCRYPTION_KEY' ? 'file-key' : null)
    const created = openConnectionStore({ env, declared })
    created.store.create({ provider: 'claude', authType: 'apikey', name: 'k', isActive: true, apiKey: 'sk-test' })
    const stored = created.db.query('SELECT api_key FROM provider_connections').get() as { api_key: string }
    created.close()
    expect(looksEncrypted(stored.api_key)).toBe(true)
    const opened = openExistingConnectionStore({ env, declared })
    expect(opened).toBeDefined()
    expect(opened?.store.listRaw({ provider: 'claude', isActive: true })).toHaveLength(1)
    opened?.close()
  })
})
