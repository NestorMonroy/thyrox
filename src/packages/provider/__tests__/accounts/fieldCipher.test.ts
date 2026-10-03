/**
 * El cifrado en reposo de las credenciales de una conexión: AES-256-GCM con
 * la clave declarada en `THYROX_STORAGE_ENCRYPTION_KEY`, en el formato
 * `enc:v1:<iv>:<cifrado>:<tag>`. Sin clave, el texto pasa tal cual. Un valor
 * cifrado que no se deja descifrar vuelve `null`, y la conexión lo marca, para
 * no confundirlo con una credencial vacía.
 *
 * Porte de `omniroute: tests/unit/db-encryption.test.ts` y
 * `tests/unit/encryption.spec.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'
import { createCipheriv, createHash, randomBytes, scryptSync } from 'node:crypto'

import { type ConnectionFields, createFieldCipher, fieldCipherFromEnv, looksEncrypted, StorageKeyMissingError } from '../../src/accounts/fieldCipher.ts'

function encryptWithLegacyDynamicSalt(secret: string, plaintext: string): string {
  const key = scryptSync(secret, createHash('sha256').update(secret).digest().subarray(0, 16), 32)
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex')
  return `enc:v1:${iv.toString('hex')}:${encrypted}:${cipher.getAuthTag().toString('hex')}`
}

function reporting() {
  const reports: string[] = []
  return { reports, report: (message: string) => reports.push(message) }
}

describe('without a key', () => {
  test('a credential is refused instead of being stored in plain text', () => {
    const cipher = createFieldCipher(undefined)
    expect(cipher.enabled).toBe(false)
    expect(() => cipher.encrypt('plain-text')).toThrow(StorageKeyMissingError)
    expect(() => cipher.encrypt('plain-text')).toThrow('THYROX_STORAGE_ENCRYPTION_KEY')
    expect(cipher.encrypt('')).toBe('')
    expect(cipher.encrypt(null)).toBeNull()
  })

  test('a connection with a credential is refused; one without credentials is stored', () => {
    const cipher = createFieldCipher(undefined)
    expect(() => cipher.encryptConnectionFields({ id: 'c1', provider: 'p', apiKey: 'sk-test-value' })).toThrow(StorageKeyMissingError)
    expect(cipher.encryptConnectionFields({ id: 'c2', provider: 'p', displayName: 'no secrets' })).toEqual({ id: 'c2', provider: 'p', displayName: 'no secrets' })
  })

  test('legacy plaintext and already sealed values still read back unchanged', () => {
    const cipher = createFieldCipher(undefined)
    expect(cipher.decrypt('plain-text')).toBe('plain-text')
    expect(cipher.decrypt(null)).toBeNull()
    expect(cipher.decrypt(undefined)).toBeUndefined()
    const sealed = createFieldCipher('secret').encrypt('token')!
    expect(cipher.encryptConnectionFields({ id: 'c3', apiKey: sealed })).toEqual({ id: 'c3', apiKey: sealed })
  })

  test('a stored ciphertext cannot be read back, and says so', () => {
    const encrypted = createFieldCipher('secret').encrypt('token')!
    const { reports, report } = reporting()
    expect(createFieldCipher('', report).decrypt(encrypted)).toBeNull()
    expect(reports.join('')).toContain('THYROX_STORAGE_ENCRYPTION_KEY')
  })
})

describe('with a key', () => {
  test('round-trips in the serialized format and never encrypts twice', () => {
    const cipher = createFieldCipher('secret-a')
    const encrypted = cipher.encrypt('hello world')!
    expect(cipher.enabled).toBe(true)
    expect(encrypted).toMatch(/^enc:v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
    expect(looksEncrypted(encrypted)).toBe(true)
    expect(cipher.decrypt(encrypted)).toBe('hello world')
    expect(cipher.encrypt(encrypted)).toBe(encrypted)
    expect(cipher.encrypt('hello world')).not.toBe(encrypted)
  })

  test('a truncated authentication tag is rejected, even one GCM would verify', () => {
    const cipher = createFieldCipher('secret-tag', () => {})
    const [prefix, version, iv, body, tag] = cipher.encrypt('forge-me')!.split(':')
    expect(cipher.decrypt(`${prefix}:${version}:${iv}:${body}:ab`)).toBeNull()
    // Doce bytes de los dieciséis: sin fijar la longitud, GCM los aceptaría.
    expect(cipher.decrypt(`${prefix}:${version}:${iv}:${body}:${tag!.slice(0, 24)}`)).toBeNull()
  })

  test('a wrong key, missing parts or invalid hex give null', () => {
    const encrypted = createFieldCipher('secret-c').encrypt('top-secret')
    const other = createFieldCipher('secret-d', () => {})
    expect(other.decrypt(encrypted)).toBeNull()
    expect(other.decrypt('enc:v1:not-valid')).toBeNull()
    expect(other.decrypt('enc:v1:zz:zz:zz')).toBeNull()
  })

  test('plaintext stored before the key existed reads back as is', () => {
    expect(createFieldCipher('secret').decrypt('legacy-plain')).toBe('legacy-plain')
  })
})

describe('connection fields', () => {
  const connection = { apiKey: 'sk-123', accessToken: 'access-123', refreshToken: 'refresh-123', idToken: 'id-123', untouched: 'keep-me' }

  test('the four credential fields are encrypted and decrypted; the rest is left alone', () => {
    const cipher = createFieldCipher('secret-b')
    const encrypted = cipher.encryptConnectionFields({ ...connection })
    for (const field of ['apiKey', 'accessToken', 'refreshToken', 'idToken'] as const) expect(encrypted[field]).toMatch(/^enc:v1:/)
    expect(encrypted.untouched).toBe('keep-me')
    expect(cipher.decryptConnectionFields(encrypted)).toEqual(connection)
  })

  test('null, undefined and missing fields are tolerated', () => {
    const cipher = createFieldCipher('secret-b')
    expect(cipher.encryptConnectionFields(null)).toBeNull()
    expect(cipher.decryptConnectionFields(undefined)).toBeUndefined()
    expect(cipher.decryptConnectionFields(cipher.encryptConnectionFields({ apiKey: 'only' }))).toEqual({ apiKey: 'only' })
  })

  test('an undecryptable credential is flagged, and reported once per row state', () => {
    const row: ConnectionFields = { id: 'c1', provider: 'codex', ...createFieldCipher('old-key').encryptConnectionFields({ ...connection }) }
    const { reports, report } = reporting()
    const cipher = createFieldCipher('new-key', report)
    const first = cipher.decryptConnectionFields(row)
    cipher.decryptConnectionFields(row)
    expect(first.accessToken).toBeNull()
    expect(first.credentialDecryptFailed).toBe(true)
    expect(reports).toHaveLength(1)
    expect(reports[0]).toContain('codex')
    expect(reports[0]).toContain('c1')
  })

  test('decryptQuiet reports a failing credential once, not on every read', () => {
    const encrypted = createFieldCipher('old-key').encrypt('token')
    const { reports, report } = reporting()
    const cipher = createFieldCipher('new-key', report)
    const meta = { connectionId: 'c1', provider: 'codex', field: 'accessToken' }
    expect(cipher.decryptQuiet(encrypted, meta)).toBeNull()
    expect(cipher.decryptQuiet(encrypted, meta)).toBeNull()
    expect(reports).toHaveLength(1)
  })
})

describe('legacy ciphertext', () => {
  test('a value encrypted with the old dynamic salt is migrated to the current key', () => {
    const cipher = createFieldCipher('legacy-secret', () => {})
    const legacy = encryptWithLegacyDynamicSalt('legacy-secret', 'legacy-provider-token')
    expect(cipher.decrypt(legacy)).toBeNull()
    const migrated = cipher.migrateLegacyEncryptedString(legacy)
    expect(migrated.updated).toBe(true)
    expect(cipher.decrypt(migrated.value)).toBe('legacy-provider-token')
  })

  test('a value already under the current key is not migrated', () => {
    const cipher = createFieldCipher('legacy-secret')
    const current = cipher.encrypt('token')
    expect(cipher.migrateLegacyEncryptedString(current)).toEqual({ updated: false, value: current })
  })
})

test('the key is read from THYROX_STORAGE_ENCRYPTION_KEY; blank does not count', () => {
  expect(fieldCipherFromEnv({ THYROX_STORAGE_ENCRYPTION_KEY: 'k' }).enabled).toBe(true)
  expect(fieldCipherFromEnv({ THYROX_STORAGE_ENCRYPTION_KEY: '  ' }, () => {}).enabled).toBe(false)
  expect(fieldCipherFromEnv({}, () => {}).enabled).toBe(false)
})

test('a value OmniRoute stored with the same key reads back', () => {
  const secret = 'shared-key'
  const key = scryptSync(secret, 'omniroute-field-encryption-v1', 32)
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = cipher.update('omniroute-token', 'utf8', 'hex') + cipher.final('hex')
  const stored = `enc:v1:${iv.toString('hex')}:${body}:${cipher.getAuthTag().toString('hex')}`
  expect(createFieldCipher(secret).decrypt(stored)).toBe('omniroute-token')
})
