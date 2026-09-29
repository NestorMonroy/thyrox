/**
 * Rotar `THYROX_STORAGE_ENCRYPTION_KEY` sin perder las credenciales que ya
 * cifró: cada valor `enc:v1:` de `provider_connections` se descifra con la
 * clave anterior y se vuelve a cifrar con la nueva, dentro de una sola
 * transacción.
 *
 * El orden decide lo que se puede perder, así que es fijo:
 *
 *   1. se descifra todo con la clave anterior ANTES de escribir nada; un
 *      valor que no se deja descifrar detiene la rotación sin tocar la base,
 *      porque recifrar el resto dejaría la conexión con dos claves;
 *   2. se escribe y, en la misma transacción, se relee cada valor y se
 *      descifra con una instancia nueva de la clave nueva; si no devuelve el
 *      texto original, la transacción se deshace.
 *
 * Los valores en claro y los nulos no se tocan: rotar no es cifrar lo que
 * se guardó sin clave. La clave nunca aparece en el resultado.
 */
import type { Database } from 'bun:sqlite'

import { createFieldCipher, looksEncrypted } from './fieldCipher.ts'

const TABLE = 'provider_connections'
/** Las columnas de `CREDENTIAL_FIELDS`, con su nombre en la base. */
export const CREDENTIAL_COLUMNS = ['api_key', 'access_token', 'refresh_token', 'id_token'] as const
type CredentialColumn = (typeof CREDENTIAL_COLUMNS)[number]

export type RotationOutcome =
  | { kind: 'rotated'; fields: number }
  | { kind: 'refused'; reason: 'missing-key' | 'same-key' }
  | { kind: 'refused'; reason: 'undecryptable' | 'verification'; connectionId: string; column: CredentialColumn }

export interface RotationOptions {
  /** Cifra con la clave nueva; existe para probar que la verificación deshace una escritura mala. */
  encrypt?: (plaintext: string) => string
}

type PendingValue = { id: string; column: CredentialColumn; plaintext: string }

class VerificationFailed extends Error {
  constructor(readonly value: PendingValue) {
    super('rotation verification failed')
  }
}

const silent = () => {}

export function rotateStorageKey(db: Database, previousSecret: string, nextSecret: string, options: RotationOptions = {}): RotationOutcome {
  if (!previousSecret.trim() || !nextSecret.trim()) return { kind: 'refused', reason: 'missing-key' }
  if (previousSecret === nextSecret) return { kind: 'refused', reason: 'same-key' }
  const previous = createFieldCipher(previousSecret, silent)
  const next = createFieldCipher(nextSecret, silent)
  const encrypt = options.encrypt ?? ((plaintext: string) => next.encrypt(plaintext) as string)

  const pending: PendingValue[] = []
  const rows = db.query(`SELECT id, ${CREDENTIAL_COLUMNS.join(', ')} FROM ${TABLE}`).all() as Array<Record<string, string | null>>
  for (const row of rows) {
    for (const column of CREDENTIAL_COLUMNS) {
      const stored = row[column]
      if (!looksEncrypted(stored)) continue
      const plaintext = previous.decrypt(stored)
      if (typeof plaintext !== 'string') return { kind: 'refused', reason: 'undecryptable', connectionId: String(row.id), column }
      pending.push({ id: String(row.id), column, plaintext })
    }
  }

  const verifier = createFieldCipher(nextSecret, silent)
  try {
    db.transaction(() => {
      for (const value of pending) {
        db.query(`UPDATE ${TABLE} SET ${value.column} = ? WHERE id = ?`).run(encrypt(value.plaintext), value.id)
      }
      for (const value of pending) {
        const written = db.query(`SELECT ${value.column} AS stored FROM ${TABLE} WHERE id = ?`).get(value.id) as { stored: string | null }
        if (verifier.decrypt(written.stored) !== value.plaintext) throw new VerificationFailed(value)
      }
    })()
  } catch (error) {
    if (!(error instanceof VerificationFailed)) throw error
    return { kind: 'refused', reason: 'verification', connectionId: error.value.id, column: error.value.column }
  }
  return { kind: 'rotated', fields: pending.length }
}
