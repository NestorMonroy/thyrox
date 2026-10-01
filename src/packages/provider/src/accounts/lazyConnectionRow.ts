/**
 * Una fila con sus credenciales todavía cifradas, que se descifran la primera
 * vez que alguien las lee. Filtrar miles de cuentas por prioridad o estado no
 * paga un AES-GCM por fila; sólo la elegida lo paga.
 *
 * Porte de `createLazyRowProxy` de
 * `omniroute: src/lib/db/providers/lazyConnectionView.ts` (MIT).
 */
import type { JsonRecord } from './connectionColumns.ts'
import type { FieldCipher } from './fieldCipher.ts'

const CREDENTIAL_FIELDS = new Set(['apiKey', 'accessToken', 'refreshToken', 'idToken'])

export function createLazyConnectionRow(row: JsonRecord, cipher: FieldCipher): JsonRecord {
  let decrypted: Record<string, string | null | undefined> | undefined

  const ensureDecrypted = () => {
    if (!decrypted) {
      const connectionId = typeof row.id === 'string' ? row.id : ''
      const provider = typeof row.provider === 'string' ? row.provider : 'unknown'
      decrypted = {}
      for (const field of CREDENTIAL_FIELDS) {
        const value = row[field]
        decrypted[field] = typeof value === 'string' ? cipher.decryptQuiet(value, { connectionId, provider, field }) : undefined
      }
    }
    return decrypted
  }

  return new Proxy(row, {
    get(target, prop) {
      if (typeof prop === 'string' && CREDENTIAL_FIELDS.has(prop)) return ensureDecrypted()[prop]
      if (prop === 'toJSON') {
        return () =>
          Object.fromEntries(Object.keys(target).map(key => [key, CREDENTIAL_FIELDS.has(key) ? ensureDecrypted()[key] : target[key]]))
      }
      return Reflect.get(target, prop)
    },
  })
}
