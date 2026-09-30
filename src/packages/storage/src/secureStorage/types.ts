/**
 * Sustituto local de `ccnmt: packages/mcp-runtime/src/secureStorageTypes.ts`.
 * La fuente misma declara `SecureStorage`/`SecureStorageData` como `unknown`
 * ("Kept minimal — the real implementation was removed during
 * decompilation."), así que aquí se fijan las formas concretas que los
 * consumidores de este porte (`fallbackStorage.ts`, `macOsKeychainStorage.ts`)
 * y sus tests realmente necesitan.
 *
 * Ampliado hacia `chunk-mmqkf96q.js` de 2.1.283: el sentinela `fc`
 * (`READ_FAILED`), las opciones de lectura (`fromStoreCopy`,
 * `unreadableFileAs`, de `In.read`/`In.readAsyncStrict`) y la forma del
 * backend genérico que `ji` (`withGenerationTracking`, en
 * `./credentialStoreInternals.ts`) envuelve con seguimiento de generación
 * (`CredentialBackend`, de las llamadas `e.readCredentials()` /
 * `e.writeCredentials()` / `e.deleteCredentials()` dentro de `ji`). Los
 * métodos nuevos de `SecureStorage` son OPCIONALES a propósito: preservan
 * la compatibilidad estructural con `macOsKeychainStorage.ts` y con lo que
 * `fallbackStorage.ts` compone, ninguno de los cuales los declara.
 */
/** Una entrada de token OAuth de un servidor MCP, por clave de servidor. */
export type McpOAuthEntry = {
  serverName: string
  serverUrl: string
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope?: string
  clientId?: string
  clientSecret?: string
  stepUpScope?: string
  discoveryState?: {
    authorizationServerUrl?: string
    resourceMetadataUrl?: string
  }
}

// Las claves que los consumidores de este árbol leen y escriben: la forma se
// deriva de sus escrituras (`mcp-runtime/auth.ts`, `bridge/trustedDevice.ts`,
// `config/plugin/pluginOptionsStorage.ts`). La firma de índice conserva las
// claves que otros módulos añaden (p. ej. `mcpXaaIdp` de `xaaIdpLogin.ts`).
export type SecureStorageData = {
  mcpOAuth?: Record<string, McpOAuthEntry>
  mcpOAuthClientConfig?: Record<string, { clientSecret?: string }>
  pluginSecrets?: Record<string, Record<string, string>>
  trustedDeviceToken?: string
  [key: string]: unknown
}

export type SecureStorageUpdateResult = {
  success: boolean
  warning?: string
}

/**
 * Puerto de `fc` (`chunk-mmqkf96q.js`) — sentinela de «se intentó leer y
 * falló», distinto de `null` («no existe»). Lo devuelven las lecturas
 * estrictas (`readAsyncStrict`) ante un archivo presente pero ilegible.
 */
export const READ_FAILED: unique symbol = Symbol('secureStorage.READ_FAILED')
export type ReadFailed = typeof READ_FAILED

/** Opciones de `In.read` — `fromStoreCopy` intenta la copia por generación
 * antes de tocar disco (ver `credentialStoreInternals.ts`). */
export type SecureStorageReadOptions = {
  fromStoreCopy?: boolean
}

/** Opciones de `In.readAsyncStrict` — con `unreadableFileAs: 'failure'`,
 * un archivo presente pero ilegible resuelve a `READ_FAILED` en vez de
 * `null`. */
export type SecureStorageReadStrictOptions = {
  unreadableFileAs?: 'failure' | 'null'
}

/**
 * Puerto de la forma que `ji` (`chunk-mmqkf96q.js`) espera de su
 * argumento `e`: un backend de credenciales de bajo nivel, con sus
 * cuatro operaciones devolviendo un estado explícito en vez de lanzar.
 */
export type CredentialCopyState =
  | { state: 'present'; data: SecureStorageData }
  | { state: 'absent' }
  | { state: 'corrupt' }
  | { state: 'refused-symlink' }
  | { state: 'read-failed' }

export type CredentialWriteResult = { state: 'written' } | { state: 'failed' }
export type CredentialDeleteResult = { state: 'deleted' } | { state: 'failed' }

export type CredentialBackend = {
  readCredentials(): Promise<CredentialCopyState>
  readCredentialsStrict(): Promise<CredentialCopyState>
  writeCredentials(data: SecureStorageData): Promise<CredentialWriteResult>
  deleteCredentials(): Promise<CredentialDeleteResult>
}

export type SecureStorage = {
  name: string
  /** Puerto de `In.osGuarded` — `false` para el almacén de texto plano: no
   * hay ningún guardián del sistema operativo (Keychain/CredMan) delante. */
  osGuarded?: boolean
  read(options?: SecureStorageReadOptions): SecureStorageData | null | undefined
  readAsync(backend?: CredentialBackend): Promise<SecureStorageData | null | undefined>
  /** Puerto de `In.readAsyncStrict` — ausente en los backends que no lo
   * necesitan (`macOsKeychainStorage.ts`, el compuesto de
   * `fallbackStorage.ts`). */
  readAsyncStrict?(
    backend?: CredentialBackend,
    options?: SecureStorageReadStrictOptions,
  ): Promise<SecureStorageData | null | ReadFailed>
  update(data: SecureStorageData, backend?: CredentialBackend): SecureStorageUpdateResult
  /** Puerto de `In.mutate`, sobre `Et` (`mutateCredentials`). */
  mutate?(
    mutator: (data: SecureStorageData) => SecureStorageData,
  ): Promise<SecureStorageUpdateResult & { transient?: boolean }>
  /** Puerto de `In.invalidateCache`, sobre `c_e`. */
  invalidateCache?(): void
  delete(backend?: CredentialBackend): boolean
}
