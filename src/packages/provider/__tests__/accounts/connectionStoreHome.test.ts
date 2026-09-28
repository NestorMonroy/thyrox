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

import { CONNECTIONS_DB_FILE, openConnectionStore, resolveProvidersDataDir } from '../../src/accounts/connectionStoreHome.ts'

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
})
