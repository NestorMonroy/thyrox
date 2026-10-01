/**
 * Puerto fiel de `ccnmt: packages/storage/src/secureStorage/index.ts`,
 * llevado a la conducta de `chunk-mmqkf96q.js` (2.1.283): `Un`, el selector
 * que devuelve el backend del sistema si algo lo registró
 * (`registerSystemSecureStorage`, sustituto de la asignación a `Os` — ver
 * abajo) y si no, el de texto plano.
 *
 * Divergencia declarada: la fuente fija `Os` desde un inicializador de
 * plataforma que vive fuera de este tramo (fuera de alcance). Aquí, a
 * falta de ese inicializador, `getSecureStorage()` conserva el chequeo de
 * `process.platform` que ya tenía ESTE puerto (exportación pública
 * preservada, medida por `index.test.ts`) como valor por defecto cuando
 * nada se registró explícitamente — el registro explícito, cuando existe,
 * siempre gana, igual que `Un` prioriza `Os` sobre `In`.
 *
 * El TODO de libsecret para Linux es de la propia fuente — se conserva
 * verbatim; en este contenedor Linux, sin nada registrado,
 * `getSecureStorage()` devuelve `plainTextStorage` (rama ya cubierta por
 * su propio test). `isLibsecretAvailable()` (`./credentialStoreInternals.ts`,
 * puerto de `mWr`) es el mismo stub fijo a `false` que trae 2.1.283.
 */
import { createFallbackStorage } from './fallbackStorage.js'
import { macOsKeychainStorage } from './macOsKeychainStorage.js'
import { plainTextStorage } from './plainTextStorage.js'
import type { SecureStorage } from './types.js'

let systemSecureStorage: SecureStorage | undefined

/** Puerto del punto de asignación a `Os`. */
export function registerSystemSecureStorage(storage: SecureStorage): void {
  systemSecureStorage = storage
}

export function resetSystemSecureStorage(): void {
  systemSecureStorage = undefined
}

/**
 * Puerto de `Un`: el backend del sistema si `registerSystemSecureStorage`
 * lo fijó; si no, el de texto plano (con el chequeo de plataforma como
 * valor por defecto — ver docstring del módulo).
 */
export function getSecureStorage(): SecureStorage {
  if (systemSecureStorage !== undefined) {
    return systemSecureStorage
  }

  if (process.platform === 'darwin') {
    return createFallbackStorage(macOsKeychainStorage, plainTextStorage)
  }

  // TODO: add libsecret support for Linux

  return plainTextStorage
}
