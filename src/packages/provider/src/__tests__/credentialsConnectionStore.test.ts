/**
 * `resolveCredential` cae a `provider_connections` cuando ninguna
 * variable de entorno resuelve credencial. El store y su cifrado son
 * siempre temporales aquí — nunca el store real ni `process.env` —, con
 * `createConnectionStore`/`createFieldCipher` de `accounts/`.
 */
import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, test } from 'bun:test'

import { createConnectionStore, type ConnectionStore } from '../accounts/connectionStore.ts'
import { createFieldCipher, looksEncrypted, STORAGE_KEY_VARIABLE } from '../accounts/fieldCipher.ts'
import { resolveCredential } from '../credentials.ts'

const noFdRead = () => {
  throw new Error('no se esperaba leer un fd')
}

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
})

function storeWith(secret: string, options: { encryptionKey?: string; authType?: 'apikey' | 'oauth' } = {}): ConnectionStore {
  const cipher = createFieldCipher(options.encryptionKey ?? 'test-store-secret', () => {})
  const store = createConnectionStore({ db, cipher })
  const authType = options.authType ?? 'apikey'
  store.create({
    provider: 'claude',
    authType,
    name: 'c2-test',
    isActive: true,
    ...(authType === 'oauth' ? { accessToken: secret, refreshToken: 'r' } : { apiKey: secret }),
  })
  return store
}

describe('resolveCredential — provider_connections como última fuente de la cadena', () => {
  test('sin store no cambia nada: sigue en none', () => {
    expect(resolveCredential({}, noFdRead)).toEqual({ source: 'none' })
  })

  test('con env vacío y una conexión apikey activa, la credencial sale del store', () => {
    const store = storeWith('sk-de-la-conexion')
    const c = resolveCredential({}, noFdRead, store)
    expect(c).toEqual({ source: 'PROVIDER_CONNECTION', kind: 'api_key', secret: 'sk-de-la-conexion' })
  })

  test('una conexión oauth resuelve como oauth', () => {
    const store = storeWith('token-de-la-conexion', { authType: 'oauth' })
    const c = resolveCredential({}, noFdRead, store)
    expect(c).toEqual({ source: 'PROVIDER_CONNECTION', kind: 'oauth', secret: 'token-de-la-conexion' })
  })

  test('una variable de entorno gana al store aunque el store tenga conexión', () => {
    const store = storeWith('sk-de-la-conexion')
    const c = resolveCredential({ ANTHROPIC_API_KEY: 'sk-del-entorno' }, noFdRead, store)
    expect(c).toEqual({ source: 'ANTHROPIC_API_KEY', kind: 'api_key', secret: 'sk-del-entorno' })
  })

  test('sin conexión activa para el proveedor, sigue en none', () => {
    const cipher = createFieldCipher('test-store-secret', () => {})
    const store = createConnectionStore({ db, cipher })
    store.create({ provider: 'openai', authType: 'apikey', name: 'otro', apiKey: 'sk-otro-proveedor' })
    expect(resolveCredential({}, noFdRead, store)).toEqual({ source: 'none' })
  })

  test('con la clave de cifrado equivocada, rehúsa diciendo la causa — no degrada a "sin credencial"', () => {
    const store = storeWith('sk-de-la-conexion')
    const wrongKeyStore = createConnectionStore({ db, cipher: createFieldCipher('otra-clave-distinta', () => {}) })
    void store
    const c = resolveCredential({}, noFdRead, wrongKeyStore)
    expect(c.source).toBe('none')
    expect(c.error).toContain('no se pudo descifrar')
    expect(c.secret).toBeUndefined()
  })

  test('sin ninguna clave de cifrado declarada, rehúsa diciendo la causa', () => {
    const store = storeWith('sk-de-la-conexion')
    void store
    const plaintextlessStore = createConnectionStore({ db, cipher: createFieldCipher(undefined, () => {}) })
    const c = resolveCredential({}, noFdRead, plaintextlessStore)
    expect(c.source).toBe('none')
    expect(c.error).toContain(STORAGE_KEY_VARIABLE)
    expect(c.secret).toBeUndefined()
  })

  test('una conexión válida no borra el error del descriptor ilegible', () => {
    const store = storeWith('sk-de-la-conexion')
    const c = resolveCredential({ THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: 'x' }, noFdRead, store)
    expect(c.source).toBe('PROVIDER_CONNECTION')
    expect(c.error).toContain('THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR')
  })

  test('un descriptor ilegible y una conexión indescifrable declaran las dos causas', () => {
    storeWith('sk-de-la-conexion')
    const wrongKeyStore = createConnectionStore({ db, cipher: createFieldCipher('otra-clave-distinta', () => {}) })
    const c = resolveCredential({ THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: 'x' }, noFdRead, wrongKeyStore)
    expect(c.source).toBe('none')
    expect(c.error).toContain('THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR')
    expect(c.error).toContain('no se pudo descifrar')
  })

  test('la fila cifrada sigue con su prefijo cuando no hay clave — el store nunca queda en claro', () => {
    const cipher = createFieldCipher('test-store-secret', () => {})
    const store = createConnectionStore({ db, cipher })
    store.create({ provider: 'claude', authType: 'apikey', name: 'c', apiKey: 'sk-real' })
    const row = db.query('SELECT api_key FROM provider_connections').get() as { api_key: string }
    expect(looksEncrypted(row.api_key)).toBe(true)
  })
})
