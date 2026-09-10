/**
 * Porte PARCIAL, declarado, de
 * `ccnmt: packages/mcp-runtime/src/macOsKeychainHelpers.ts`.
 *
 * La fuente depende de `@claude-code-how-works/provider/oauthConstants`
 * (`getOauthConfig().OAUTH_FILE_SUFFIX`) para nombrar el servicio de
 * keychain — paquete ausente en este árbol. `getMacOsKeychainStorageServiceName`
 * se porta sin ese sufijo (cadena vacía en su lugar); el resto —
 * `CREDENTIALS_SERVICE_SUFFIX`, `getUsername`, `KEYCHAIN_CACHE_TTL_MS`,
 * `keychainCacheState`, `clearKeychainCache`— es fiel a la fuente.
 * `primeKeychainCacheFromPrefetch` no se porta — ningún test de este pase
 * lo ejercita y depende de un flujo de prefetch que tampoco existe aquí.
 */
import { createHash } from 'node:crypto'
import { userInfo } from 'node:os'
import type { SecureStorageData } from './types.js'

// Suffix distinguishing the OAuth credentials keychain entry from the
// legacy API key entry (which uses no suffix). DO NOT change this value —
// it's part of the keychain lookup key and would orphan existing stored
// credentials.
export const CREDENTIALS_SERVICE_SUFFIX = '-credentials'

export function getMacOsKeychainStorageServiceName(
  serviceSuffix: string = '',
): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? ''
  const isDefaultDir = !process.env.CLAUDE_CONFIG_DIR

  const dirHash = isDefaultDir
    ? ''
    : `-${createHash('sha256').update(configDir).digest('hex').substring(0, 8)}`
  return `Claude Code${serviceSuffix}${dirHash}`
}

export function getUsername(): string {
  try {
    return process.env.USER || userInfo().username
  } catch {
    return 'claude-code-user'
  }
}

// Cache for keychain reads to avoid repeated expensive security CLI calls.
export const KEYCHAIN_CACHE_TTL_MS = 30_000

export const keychainCacheState: {
  cache: { data: SecureStorageData | null; cachedAt: number }
  generation: number
  readInFlight: Promise<SecureStorageData | null> | null
} = {
  cache: { data: null, cachedAt: 0 },
  generation: 0,
  readInFlight: null,
}

export function clearKeychainCache(): void {
  keychainCacheState.cache = { data: null, cachedAt: 0 }
  keychainCacheState.generation++
  keychainCacheState.readInFlight = null
}
