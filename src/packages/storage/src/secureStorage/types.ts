/**
 * Sustituto local de `ccnmt: packages/mcp-runtime/src/secureStorageTypes.ts`.
 * La fuente misma declara `SecureStorage`/`SecureStorageData` como `unknown`
 * ("Kept minimal — the real implementation was removed during
 * decompilation."), así que aquí se fijan las formas concretas que los
 * consumidores de este porte (`fallbackStorage.ts`, `macOsKeychainStorage.ts`)
 * y sus tests realmente necesitan.
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

export type SecureStorage = {
  name: string
  read(): SecureStorageData | null | undefined
  readAsync(): Promise<SecureStorageData | null | undefined>
  update(data: SecureStorageData): SecureStorageUpdateResult
  delete(): boolean
}
