/**
 * El cifrado en reposo de las credenciales de una conexión de proveedor:
 * AES-256-GCM, en el formato `enc:v1:<iv>:<cifrado>:<tag>`, con la clave que
 * declara `THYROX_STORAGE_ENCRYPTION_KEY`.
 *
 * Sin clave NO se escribe una credencial: `encrypt` y
 * `encryptConnectionFields` rehúsan con `StorageKeyMissingError`, igual que
 * el cliente de referencia, que sin su clave de sellado apaga la caché en vez
 * de escribir en claro (`.claude/workbench/sqlite-sensitive-data-at-rest-*`).
 * Leer sigue siendo posible: un valor en claro heredado se devuelve tal cual.
 * Un valor cifrado que no se deja
 * descifrar —otra clave, tag truncado, formato roto— vuelve `null`, y
 * `decryptConnectionFields` marca la conexión con `credentialDecryptFailed`
 * para que nadie lo lea como una credencial vacía y mande un Bearer vacío.
 *
 * La clave se deriva con scrypt y la sal fija de OmniRoute: con la misma
 * clave, este store lee lo que el suyo guardó. `migrateLegacyEncryptedString`
 * re-cifra lo que sus versiones anteriores guardaron con la sal derivada.
 *
 * Porte de `omniroute: src/lib/db/encryption.ts` (MIT).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const KEY_LENGTH = 32
/** El tag completo: fijarlo rechaza un tag truncado en vez de verificar uno debilitado. */
const AUTH_TAG_LENGTH = 16
const PREFIX = 'enc:v1:'
/** La sal de OmniRoute, conservada para leer lo que su store cifró con la misma clave. */
const INTEROPERABLE_SALT = 'omniroute-field-encryption-v1'
export const STORAGE_KEY_VARIABLE = 'THYROX_STORAGE_ENCRYPTION_KEY'

const CREDENTIAL_FIELDS = ['apiKey', 'accessToken', 'refreshToken', 'idToken'] as const
type CredentialField = (typeof CREDENTIAL_FIELDS)[number]
type Stored = string | null | undefined

export type ConnectionFields = { [F in CredentialField]?: string | null } & {
  /** Una credencial cifrada que no se pudo descifrar: no es una credencial vacía. */
  credentialDecryptFailed?: true
} & Record<string, unknown>

/** Una credencial iba a escribirse sin clave de cifrado declarada: se rehúsa en vez de guardarla en claro. */
export class StorageKeyMissingError extends Error {
  constructor(readonly field: string) {
    super(`${STORAGE_KEY_VARIABLE} is not set: refusing to store ${field} in plain text. Declare it (bin/provider-generate-storage-key) and retry.`)
    this.name = 'StorageKeyMissingError'
  }
}

export interface FieldCipher {
  readonly enabled: boolean
  encrypt(plaintext: Stored): Stored
  decrypt(ciphertext: Stored): Stored
  /** `decrypt` que informa un fallo una sola vez por credencial, no en cada lectura. */
  decryptQuiet(ciphertext: Stored, meta: { connectionId: string; provider: string; field: string }): Stored
  encryptConnectionFields<T extends ConnectionFields | null | undefined>(connection: T): T
  decryptConnectionFields<T extends ConnectionFields | null | undefined>(row: T): T
  migrateLegacyEncryptedString(ciphertext: Stored): { updated: boolean; value: Stored }
}

/** ¿Es un valor guardado cifrado? Separa «no se pudo descifrar» de «no hay credencial». */
export function looksEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

function deriveKey(secret: string, salt: string | Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH)
}

function decryptWith(key: Buffer, ciphertext: string): string | null {
  const parts = ciphertext.slice(PREFIX.length).split(':')
  if (parts.length !== 3) return null
  const [ivHex, encryptedHex, tagHex] = parts as [string, string, string]
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'), { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    return decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8')
  } catch {
    return null
  }
}

const RECOVERY_HINT = `Re-authenticate this account, or check that ${STORAGE_KEY_VARIABLE} is the key it was stored with.`

function defaultReport(message: string): void {
  process.stderr.write(`[accounts] ${message}\n`)
}

export function createFieldCipher(secret: string | undefined, report: (message: string) => void = defaultReport): FieldCipher {
  const declared = secret?.trim() ? secret : undefined
  const key = declared ? deriveKey(declared, INTEROPERABLE_SALT) : null
  const reported = new Set<string>()
  const reportOnce = (signature: string, message: string) => {
    if (reported.has(signature)) return
    reported.add(signature)
    report(message)
  }

  const encrypt = (plaintext: Stored): Stored => {
    if (!plaintext) return plaintext
    if (plaintext.startsWith(PREFIX)) return plaintext
    if (!key) throw new StorageKeyMissingError('a credential')
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    const encrypted = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex')
    return `${PREFIX}${iv.toString('hex')}:${encrypted}:${cipher.getAuthTag().toString('hex')}`
  }

  const decryptSilently = (ciphertext: Stored): Stored => {
    if (!looksEncrypted(ciphertext)) return ciphertext
    return key ? decryptWith(key, ciphertext) : null
  }

  const decrypt = (ciphertext: Stored): Stored => {
    const value = decryptSilently(ciphertext)
    if (value === null && looksEncrypted(ciphertext)) {
      report(key ? 'A stored credential could not be decrypted.' : `A credential is encrypted but ${STORAGE_KEY_VARIABLE} is not set.`)
    }
    return value
  }

  return {
    enabled: key !== null,
    encrypt,
    decrypt,

    decryptQuiet(ciphertext, meta) {
      const value = decryptSilently(ciphertext)
      if (value === null && looksEncrypted(ciphertext)) {
        reportOnce(`${meta.provider}::${meta.connectionId}::${meta.field}:${ciphertext}`, `Failed to decrypt ${meta.field} for "${meta.provider}" (connection ${meta.connectionId}). ${RECOVERY_HINT}`)
      }
      return value
    },

    encryptConnectionFields(connection) {
      if (!connection) return connection
      for (const field of CREDENTIAL_FIELDS) {
        if (!connection[field]) continue
        if (!key && !looksEncrypted(connection[field])) throw new StorageKeyMissingError(field)
        if (key) connection[field] = encrypt(connection[field]) as string
      }
      return connection
    },

    decryptConnectionFields(row) {
      if (!key || !row) return row
      const decrypted: Record<string, unknown> = { ...row }
      const failed: CredentialField[] = []
      for (const field of CREDENTIAL_FIELDS) {
        if (!(field in row)) continue
        const value = decryptSilently(row[field])
        decrypted[field] = value
        if (value === null && looksEncrypted(row[field])) failed.push(field)
      }
      if (failed.length === 0) return decrypted as typeof row
      const connectionId = typeof row.id === 'string' ? row.id : 'unknown'
      const provider = typeof row.provider === 'string' ? row.provider : 'unknown'
      const signature = `${provider}::${connectionId}::${failed.map(f => `${f}:${row[f]}`).join('|')}`
      reportOnce(signature, `Failed to decrypt credential(s) [${failed.join(', ')}] for provider "${provider}" (connection ${connectionId}). ${RECOVERY_HINT}`)
      return { ...decrypted, credentialDecryptFailed: true } as typeof row
    },

    migrateLegacyEncryptedString(ciphertext) {
      if (!key || !declared || !looksEncrypted(ciphertext)) return { updated: false, value: ciphertext }
      if (decryptWith(key, ciphertext) !== null) return { updated: false, value: ciphertext }
      // La sal derivada de versiones anteriores: los primeros 16 bytes del SHA-256 de la clave.
      const legacyKey = deriveKey(declared, createHash('sha256').update(declared).digest().subarray(0, 16))
      const plaintext = decryptWith(legacyKey, ciphertext)
      return plaintext === null ? { updated: false, value: ciphertext } : { updated: true, value: encrypt(plaintext) }
    },
  }
}

export function fieldCipherFromEnv(env: Record<string, string | undefined> = process.env, report?: (message: string) => void): FieldCipher {
  return createFieldCipher(env[STORAGE_KEY_VARIABLE], report)
}
