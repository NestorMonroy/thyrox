/**
 * `rotateStorageKey`: vuelve a cifrar con una clave nueva las credenciales
 * que la anterior cifró, en una sola transacción, y rehúsa sin tocar nada si
 * alguna no se deja descifrar con la anterior o si la verificación con la
 * nueva no devuelve el mismo texto.
 */
import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { createFieldCipher } from '../../src/accounts/fieldCipher.ts'
import { rotateStorageKey } from '../../src/accounts/storageKeyRotation.ts'

const OLD = 'clave-anterior-de-prueba'
const NEW = 'clave-nueva-de-prueba'
const quiet = () => {}

function store(): Database {
  const db = new Database(':memory:')
  db.run('CREATE TABLE provider_connections (id TEXT PRIMARY KEY, provider TEXT, api_key TEXT, access_token TEXT, refresh_token TEXT, id_token TEXT)')
  return db
}

function insert(db: Database, id: string, values: Partial<Record<'api_key' | 'access_token' | 'refresh_token' | 'id_token', string | null>>) {
  db.query('INSERT INTO provider_connections (id, provider, api_key, access_token, refresh_token, id_token) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, 'p', values.api_key ?? null, values.access_token ?? null, values.refresh_token ?? null, values.id_token ?? null,
  )
}

function row(db: Database, id: string) {
  return db.query('SELECT api_key, access_token, refresh_token, id_token FROM provider_connections WHERE id = ?').get(id) as Record<string, string | null>
}

describe('rotateStorageKey', () => {
  test('vuelve a cifrar con la clave nueva y la anterior deja de descifrar', () => {
    const db = store()
    const old = createFieldCipher(OLD, quiet)
    insert(db, 'a', { api_key: old.encrypt('sk-uno') as string, refresh_token: old.encrypt('rt-uno') as string })

    const outcome = rotateStorageKey(db, OLD, NEW)

    expect(outcome).toEqual({ kind: 'rotated', fields: 2 })
    const stored = row(db, 'a')
    const next = createFieldCipher(NEW, quiet)
    expect(next.decrypt(stored.api_key)).toBe('sk-uno')
    expect(next.decrypt(stored.refresh_token)).toBe('rt-uno')
    expect(old.decrypt(stored.api_key)).toBeNull()
  })

  test('no toca los valores en claro ni los nulos', () => {
    const db = store()
    const old = createFieldCipher(OLD, quiet)
    insert(db, 'a', { api_key: 'en-claro', access_token: old.encrypt('at') as string })

    expect(rotateStorageKey(db, OLD, NEW)).toEqual({ kind: 'rotated', fields: 1 })
    const stored = row(db, 'a')
    expect(stored.api_key).toBe('en-claro')
    expect(stored.id_token).toBeNull()
  })

  test('rehúsa sin tocar nada si una credencial no se descifra con la clave anterior', () => {
    const db = store()
    const old = createFieldCipher(OLD, quiet)
    const foreign = createFieldCipher('otra-clave', quiet)
    insert(db, 'a', { api_key: old.encrypt('sk-a') as string })
    insert(db, 'b', { access_token: foreign.encrypt('at-b') as string })
    const before = [row(db, 'a'), row(db, 'b')]

    const outcome = rotateStorageKey(db, OLD, NEW)

    expect(outcome).toEqual({ kind: 'refused', reason: 'undecryptable', connectionId: 'b', column: 'access_token' })
    expect([row(db, 'a'), row(db, 'b')]).toEqual(before)
  })

  test('deshace la transacción si la verificación con la clave nueva no devuelve el mismo texto', () => {
    const db = store()
    const old = createFieldCipher(OLD, quiet)
    insert(db, 'a', { api_key: old.encrypt('sk-a') as string })
    const before = row(db, 'a')
    const wrong = createFieldCipher('clave-equivocada', quiet)

    const outcome = rotateStorageKey(db, OLD, NEW, { encrypt: plaintext => wrong.encrypt(plaintext) as string })

    expect(outcome).toEqual({ kind: 'refused', reason: 'verification', connectionId: 'a', column: 'api_key' })
    expect(row(db, 'a')).toEqual(before)
  })

  test('rehúsa si las dos claves son la misma o alguna está vacía', () => {
    const db = store()
    expect(rotateStorageKey(db, OLD, OLD)).toEqual({ kind: 'refused', reason: 'same-key' })
    expect(rotateStorageKey(db, '  ', NEW)).toEqual({ kind: 'refused', reason: 'missing-key' })
    expect(rotateStorageKey(db, OLD, '')).toEqual({ kind: 'refused', reason: 'missing-key' })
  })
})
