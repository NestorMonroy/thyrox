/**
 * Puerto fiel de `ccnmt: packages/storage/src/secureStorage/index.ts` (605
 * bytes fuente, 1 símbolo exportado — porte completo). Elige la
 * implementación de `SecureStorage` según la plataforma.
 *
 * Divergencia declarada: `SecureStorage` (de
 * `@claude-code-how-works/mcp-runtime/secureStorageTypes.js`) se importa
 * del `./types.js` local — ya existente en este árbol (no mío), el mismo
 * sustituto que usan `fallbackStorage.ts` y `macOsKeychainStorage.ts`.
 *
 * El TODO de libsecret para Linux es de la propia fuente — se conserva
 * verbatim; en este contenedor Linux, `getSecureStorage()` devuelve
 * `plainTextStorage` (rama ya cubierta por su propio test).
 */
import { createFallbackStorage } from './fallbackStorage.js'
import { macOsKeychainStorage } from './macOsKeychainStorage.js'
import { plainTextStorage } from './plainTextStorage.js'
import type { SecureStorage } from './types.js'

/**
 * Get the appropriate secure storage implementation for the current platform
 */
export function getSecureStorage(): SecureStorage {
  if (process.platform === 'darwin') {
    return createFallbackStorage(macOsKeychainStorage, plainTextStorage)
  }

  // TODO: add libsecret support for Linux

  return plainTextStorage
}
