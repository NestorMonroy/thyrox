/**
 * Sustituto local de `ccnmt: packages/mcp-runtime/src/secureStorageTypes.ts`.
 * La fuente misma declara `SecureStorage`/`SecureStorageData` como `unknown`
 * ("Kept minimal — the real implementation was removed during
 * decompilation."), así que aquí se fijan las formas concretas que los
 * consumidores de este porte (`fallbackStorage.ts`, `macOsKeychainStorage.ts`)
 * y sus tests realmente necesitan.
 */
export type SecureStorageData = Record<string, unknown>

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
