/**
 * Puerto de `ccnmt: packages/cli/src/secureStorage/keychainPrefetch.ts`
 * (115 líneas, 100 % portado). Dispara las dos lecturas de keychain de
 * macOS ("Claude Code-credentials" / "Claude Code") en paralelo con la
 * evaluación de módulos de main.tsx, mismo patrón que `startMdmRawRead()`
 * en `settings/mdm/rawRead.ts` (no portado). Los cinco símbolos
 * exportados (`startKeychainPrefetch`, `ensureKeychainPrefetchCompleted`,
 * `getLegacyApiKeyPrefetchResult`, `clearLegacyApiKeyPrefetch`) se portan
 * VERBATIM en firma y comportamiento.
 *
 * Ya consumido — `storage: src/secureStorage/keychainPrefetch.ts` ya
 * reexporta `export * from '@thyrox/cli/secureStorage/keychainPrefetch.js'`
 * como su dueño canónico; antes de este porte esa ruta no resolvía ningún
 * archivo, ahora resuelve vía el `./*.js` wildcard de `cli/package.json`.
 *
 * Dos de las tres rutas de import resuelven tal cual en este árbol:
 *
 *   - `execFile` (`child_process`) — built-in de Node/Bun.
 *   - `CREDENTIALS_SERVICE_SUFFIX`, `getMacOsKeychainStorageServiceName`,
 *     `getUsername`, `primeKeychainCacheFromPrefetch`
 *     (`@claude-code-how-works/mcp-runtime/macOsKeychainHelpers.js`) — SÍ
 *     existen en `@thyrox/mcp-runtime` con el subpath EXACTO (medido: está
 *     en `mcp-runtime/package.json` `exports` como
 *     `"./macOsKeychainHelpers"`, y los cuatro símbolos aparecen en
 *     `src/macOsKeychainHelpers.ts`).
 *
 * DIVERGENCIA DE ALCANCE, declarada — `isBareMode`
 * (`@claude-code-how-works/config/env/utils`): `@thyrox/config/env/utils.ts`
 * SÍ existe, pero no expone `isBareMode` (medido:
 * `grep -n "^export function" src/packages/config/env/utils.ts` → sólo
 * `isEnvTruthy`, `readEnv`, `getAllEnv`). Se reimplementa localmente FIEL a
 * la fuente real (`ccnmt: packages/config/env/utils.ts:43-70`:
 * `CLAUDE_CODE_SIMPLE` truthy o `--bare` en `process.argv`) en vez de
 * diferirla con `require()` — mismo criterio, y mismo texto de cita, que
 * `storage: src/sessionStart.ts::isBareMode` y
 * `agent: internal/macroFallback.ts` ya establecieron para este exacto
 * símbolo: es autocontenida (dos líneas, sin dependencias transitivas), así
 * que reimplementarla es más fiel que un `require()` que fallaría siempre.
 */
import { execFile } from 'child_process'
import {
  CREDENTIALS_SERVICE_SUFFIX,
  getMacOsKeychainStorageServiceName,
  getUsername,
  primeKeychainCacheFromPrefetch,
} from '@thyrox/mcp-runtime/macOsKeychainHelpers.js'

/** Fiel a `ccnmt: packages/config/env/utils.ts::isEnvTruthy` — ver docstring. */
function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

/** Fiel a `ccnmt: packages/config/env/utils.ts::isBareMode` — ver docstring. */
function isBareMode(): boolean {
  return isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE) || process.argv.includes('--bare')
}

const KEYCHAIN_PREFETCH_TIMEOUT_MS = 10_000

// Shared with auth.ts getApiKeyFromConfigOrMacOSKeychain() so it can skip its
// sync spawn when the prefetch already landed. Distinguishing "not started" (null)
// from "completed with no key" ({ stdout: null }) lets the sync reader only
// trust a completed prefetch.
let legacyApiKeyPrefetch: { stdout: string | null } | null = null

let prefetchPromise: Promise<void> | null = null

type SpawnResult = { stdout: string | null; timedOut: boolean }

function spawnSecurity(serviceName: string): Promise<SpawnResult> {
  return new Promise(resolve => {
    execFile(
      'security',
      ['find-generic-password', '-a', getUsername(), '-w', '-s', serviceName],
      { encoding: 'utf-8', timeout: KEYCHAIN_PREFETCH_TIMEOUT_MS },
      (err, stdout) => {
        // Exit 44 (entry not found) is a valid "no key" result and safe to
        // prime as null. But timeout (err.killed) means the keychain MAY have
        // a key we couldn't fetch — don't prime, let sync spawn retry.
        resolve({
          stdout: err ? null : stdout?.trim() || null,
          timedOut: Boolean(err && 'killed' in err && err.killed),
        })
      },
    )
  })
}

/**
 * Fire both keychain reads in parallel. Called at main.tsx top-level
 * immediately after startMdmRawRead(). Non-darwin is a no-op.
 */
export function startKeychainPrefetch(): void {
  if (process.platform !== 'darwin' || prefetchPromise || isBareMode()) return

  // Fire both subprocesses immediately (non-blocking). They run in parallel
  // with each other AND with main.tsx imports. The await in Promise.all
  // happens later via ensureKeychainPrefetchCompleted().
  const oauthSpawn = spawnSecurity(
    getMacOsKeychainStorageServiceName(CREDENTIALS_SERVICE_SUFFIX),
  )
  const legacySpawn = spawnSecurity(getMacOsKeychainStorageServiceName())

  prefetchPromise = Promise.all([oauthSpawn, legacySpawn]).then(
    ([oauth, legacy]) => {
      // Timed-out prefetch: don't prime. Sync read/spawn will retry with its
      // own (longer) timeout. Priming null here would shadow a key that the
      // sync path might successfully fetch.
      if (!oauth.timedOut) primeKeychainCacheFromPrefetch(oauth.stdout)
      if (!legacy.timedOut) legacyApiKeyPrefetch = { stdout: legacy.stdout }
    },
  )
}

/**
 * Await prefetch completion. Called in main.tsx preAction alongside
 * ensureMdmSettingsLoaded() — nearly free since subprocesses finish during
 * the ~65ms of main.tsx imports. Resolves immediately on non-darwin.
 */
export async function ensureKeychainPrefetchCompleted(): Promise<void> {
  if (prefetchPromise) await prefetchPromise
}

/**
 * Consumed by getApiKeyFromConfigOrMacOSKeychain() in auth.ts before it
 * falls through to sync execSync. Returns null if prefetch hasn't completed.
 */
export function getLegacyApiKeyPrefetchResult(): {
  stdout: string | null
} | null {
  return legacyApiKeyPrefetch
}

/**
 * Clear prefetch result. Called alongside getApiKeyFromConfigOrMacOSKeychain
 * cache invalidation so a stale prefetch doesn't shadow a fresh write.
 */
export function clearLegacyApiKeyPrefetch(): void {
  legacyApiKeyPrefetch = null
}
