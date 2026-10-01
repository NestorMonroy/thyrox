/**
 * Lo que una salida puede decir de un secreto: si está y cuánto mide, nunca
 * su valor. `redactSecrets` recorre un objeto y sustituye cada campo cuyo
 * nombre termina como una credencial (clave, token, secreto, contraseña…) por
 * esa forma.
 *
 * Porte de `credentialShape`, `isSensitiveFieldName` y
 * `redactProviderResponse` en `omniroute: bin/cli/commands/provider-crud.mjs` (MIT).
 */
const SENSITIVE_FIELD_SUFFIX =
  /(?:^|_)(?:api_?key|access_key|secret_access_key|access_?token|refresh_?token|id_?token|auth_token|token|password|passphrase|secret|secret_key|secret_value|client_?secret|credential|authorization|private_key)$/

export function credentialShape(value: unknown): { present: boolean; length: number } {
  if (value === undefined || value === null || String(value).trim() === '') return { present: false, length: 0 }
  return { present: true, length: String(value).length }
}

function isSensitiveFieldName(key: string): boolean {
  const normalized = key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
  return SENSITIVE_FIELD_SUFFIX.test(normalized)
}

export function redactSecrets(value: unknown, key = ''): unknown {
  if (isSensitiveFieldName(key)) {
    if (value === null || value === undefined || value === '') return null
    return typeof value === 'string' ? credentialShape(value) : '[redacted]'
  }
  if (Array.isArray(value)) return value.map(entry => redactSecrets(entry))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactSecrets(entryValue, entryKey)]))
}
