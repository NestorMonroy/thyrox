/**
 * Puerto de `ccnmt: packages/config/remote/index.ts` (671 líneas fuente).
 * Servicio de "remote managed settings": trae, cachea y valida settings
 * gestionados remotamente para clientes enterprise, con validación por
 * checksum para minimizar tráfico de red y degradación elegante ante
 * fallos. Reimplementación fiel — mismo algoritmo de reintentos con
 * backoff exponencial, misma lógica de elegibilidad, mismo manejo de
 * 204/304/404, mismo flujo de force-refresh en 401.
 *
 * Elegibilidad (documentada en la fuente, sin cambios):
 * - Usuarios de consola (API key): todos elegibles.
 * - Usuarios OAuth (Claude.ai): sólo suscriptores Enterprise/C4E y Team.
 * - La API falla abierto (no bloqueante) — si el fetch falla, continúa sin
 *   settings remotos.
 * - La API devuelve settings vacíos para usuarios sin settings gestionados.
 *
 * Repuntados vía `require()` diferido — todos GENUINAMENTE bloqueados,
 * documentados en cada envoltorio al pie del módulo:
 * - `axios` — paquete npm externo, no instalado en este árbol (verificado:
 *   `Bun.resolveSync('axios', …)` → `Cannot find package 'axios'`). La
 *   fuente lo importa estático; aquí se difiere porque un `import` estático
 *   de un especificador que no resuelve haría fallar la carga del MÓDULO
 *   ENTERO — la excepción #3 de las reglas del árbol ("que el especificador
 *   no resuelva") aplica aquí igual que a los `@thyrox/*` cruzados.
 * - `isRemoteManagedSettingsEligible`, `resetSyncCache` — `./syncCache.ts`
 *   no es uno de los 15 del alcance. Medido: es hoja salvo por
 *   `../host.js` (SÍ portado en este pase) — pero su propio import de
 *   `../settings/...` no se verificó a fondo y `remote/syncCache.ts` cae
 *   fuera del recorte declarado ("el único módulo de `remote/` portado es
 *   `remote/index.ts`"), así que se bloquea en vez de extender el alcance
 *   sin que el reporte final lo declare.
 * - `getRemoteManagedSettingsSyncFromCache`, `getSettingsPath`,
 *   `setSessionCache` — `./syncCacheState.ts` no es uno de los 15. Medido:
 *   importa `../settings/settingsCache.js`, que NO existe en este árbol y
 *   pertenece al subárbol `settings/` — exactamente el territorio que el
 *   caso `@thyrox/config/settings` del brief deja fuera de este pase. Se
 *   bloquea por la misma razón que `getSettings`/`getSettingsForSource` en
 *   `managedEnv.ts` y `outputStyles.ts`.
 * - `settingsChangeDetector` — `../settings/changeDetector.ts` no es uno de
 *   los 15 ni existe en este árbol. Notifica a listeners de cambio de
 *   settings; sin el listener real instalado, el default es un no-op.
 *
 * ADAPTADO, no bloqueado — `getSettingsSchema()`:
 * - `SettingsSchema` — la fuente la importa de `../settings/types.ts` como
 *   una LAZY FACTORY (se invoca `SettingsSchema()`), portada así por
 *   `internal/lazySchema.ts` + `mcpConfigSchema.ts` en este mismo pase. El
 *   `settings/types.ts` YA EXISTENTE en este árbol (portado por un pase
 *   distinto, fuera de mi alcance de edición) declara `SettingsSchema`
 *   como objeto Zod PLANO (`export const SettingsSchema = z.object(...)`,
 *   SIN invocar). Es una divergencia de FORMA entre dos portes
 *   independientes del mismo nombre — medido con
 *   `bun -e "require('./settings/types.js').SettingsSchema"` → objeto, no
 *   función. `getSettingsSchema()` normaliza ambas formas para que el
 *   call-site conserve la sintaxis fiel a la fuente (`schema.safeParse(…)`)
 *   sin asumir cuál de las dos formas está instalada.
 * - `Settings` (aliado `SettingsJson`) — mismo criterio que
 *   `remote/types.ts`: el árbol ya declara `Settings`, no `SettingsJson`;
 *   se alía por ser el mismo concepto.
 *
 * `getClaudeCodeUserAgent()` — `MACRO.VERSION` es un define de build-time
 * de `ccnmt` ausente en este árbol fuera de un build real. Mismo patrón que
 * ya usan `local-observability/{telemetry/attributes,logging/error-log-sink,
 * sentry}.ts`: `typeof MACRO !== 'undefined' ? MACRO.VERSION : '0.0.0-dev'`.
 */

import { createHash } from 'crypto'
import { open, unlink } from 'fs/promises'
import type { SettingSource } from '../settings/constants.js'
import type { Settings as SettingsJson } from '../settings/types.js'
import { getConfigHostBindings } from '../host.js'
import {
  checkManagedSettingsSecurity,
  handleSecurityCheckResult,
} from './securityCheck.js'
import {
  type RemoteManagedSettingsFetchResult,
  RemoteManagedSettingsResponseSchema,
} from './types.js'

// --- envoltorios de dependencias bloqueadas — ver docstring del módulo ---

/** `axios` — paquete npm externo ausente. */
function requireAxios(): {
  get: (
    url: string,
    config: {
      headers: Record<string, string>
      timeout: number
      validateStatus: (status: number) => boolean
    },
  ) => Promise<{ status: number; data: unknown }>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('axios')
}

/** `./syncCache.ts` — no es uno de los 15; ver docstring del módulo. */
function requireRemoteSyncCache(): {
  isRemoteManagedSettingsEligible: () => boolean
  resetSyncCache: () => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./syncCache.js')
}

/** `./syncCacheState.ts` — no es uno de los 15; ver docstring del módulo. */
function requireRemoteSyncCacheState(): {
  getRemoteManagedSettingsSyncFromCache: () => SettingsJson | null
  getSettingsPath: () => string
  setSessionCache: (value: SettingsJson | null) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./syncCacheState.js')
}

/** `../settings/changeDetector.ts` — no es uno de los 15; ver docstring. */
function requireSettingsChangeDetector(): {
  settingsChangeDetector: { notifyChange: (source: SettingSource) => void }
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../settings/changeDetector.js')
  } catch {
    return { settingsChangeDetector: { notifyChange: () => {} } }
  }
}

/**
 * Normaliza `SettingsSchema` de `../settings/types.ts` entre sus dos formas
 * posibles en este árbol (lazy factory vs. objeto Zod plano) — ver
 * docstring del módulo.
 */
function getSettingsSchema(): {
  safeParse: (data: unknown) =>
    | { success: true; data: SettingsJson }
    | { success: false; error: { message: string } }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../settings/types.js') as { SettingsSchema: unknown }
  const raw = mod.SettingsSchema
  const schema = typeof raw === 'function' ? (raw as () => unknown)() : raw
  return schema as ReturnType<typeof getSettingsSchema>
}

// Mismo patrón que `local-observability/{telemetry/attributes,sentry}.ts` —
// ver docstring del módulo.
declare const MACRO: { VERSION: string } | undefined

function getClaudeCodeUserAgent(): string {
  return `claude-code-how-works-how-works/${typeof MACRO !== 'undefined' ? MACRO.VERSION : '0.0.0-dev'}`
}

// V11.4 — utilidades inline para evitar dependencias de src/ (comentario de
// la fuente, preservado: el mismo criterio que ya aplica este porte al
// resto del árbol).
function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

type AxiosErrorKind = 'network' | 'timeout' | 'http' | 'unknown'

/**
 * DIVERGENCIA MEDIDA, NO CORREGIDA: la fuente nunca devuelve `kind: 'auth'`
 * — cualquier 401/403 con `response` cae en la rama `'http'`. El `switch`
 * de `fetchRemoteManagedSettings` sí trae un `case 'auth':` con la lógica
 * de force-refresh en 401 (ver abajo), pero esa rama es CÓDIGO MUERTO en
 * la fuente: nada la alcanza nunca. Se preserva verbatim — "reimplementación
 * fiel" incluye reproducir el bug, no corregirlo en silencio.
 */
function classifyAxiosError(e: unknown): {
  kind: AxiosErrorKind
  status?: number
  message: string
} {
  const message = errorMessage(e)
  if (!e || typeof e !== 'object' || !('isAxiosError' in e)) {
    return { kind: 'unknown', message }
  }
  const ae = e as { code?: string; response?: { status?: number } }
  if (ae.code === 'ECONNABORTED') return { kind: 'timeout', message }
  if (!ae.response) return { kind: 'network', message }
  return { kind: 'http', status: ae.response.status, message }
}

function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const BASE_RETRY_DELAY_MS = 500

function getRetryDelay(
  attempt: number,
  retryAfterHeader?: string | null,
  maxDelayMs = 32000,
): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10)
    if (!isNaN(seconds)) return seconds * 1000
  }
  const baseDelay = Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1), maxDelayMs)
  return baseDelay + Math.random() * 0.25 * baseDelay
}

// Constantes
const SETTINGS_TIMEOUT_MS = 10000 // 10 segundos para el fetch de settings
const DEFAULT_MAX_RETRIES = 5
const POLLING_INTERVAL_MS = 60 * 60 * 1000 // 1 hora

// Estado del polling en segundo plano
let pollingIntervalId: ReturnType<typeof setInterval> | null = null

// Promesa que resuelve cuando termina la carga inicial de settings remotos.
// Permite que otros sistemas esperen a los settings remotos antes de
// inicializarse.
let loadingCompletePromise: Promise<void> | null = null
let loadingCompleteResolve: (() => void) | null = null

// Timeout de la promesa de carga, para no bloquear indefinidamente si
// loadRemoteManagedSettings() nunca se llama (p. ej. en tests del Agent SDK
// que no pasan por main.tsx).
const LOADING_PROMISE_TIMEOUT_MS = 30000 // 30 segundos

/**
 * Inicializa la promesa de carga de settings gestionados remotamente. Debe
 * llamarse temprano (p. ej. en init.ts) para que otros sistemas puedan
 * esperarla vía waitForRemoteManagedSettingsToLoad() aunque
 * loadRemoteManagedSettings() aún no se haya llamado.
 *
 * Sólo crea la promesa si el usuario es elegible para settings remotos.
 * Incluye un timeout para evitar deadlocks si loadRemoteManagedSettings()
 * nunca se llama.
 */
export function initializeRemoteManagedSettingsLoadingPromise(): void {
  if (loadingCompletePromise) {
    return
  }

  if (requireRemoteSyncCache().isRemoteManagedSettingsEligible()) {
    loadingCompletePromise = new Promise((resolve) => {
      loadingCompleteResolve = resolve

      // Resuelve la promesa aunque loadRemoteManagedSettings() nunca se
      // llame — evita deadlocks en tests del Agent SDK y otros contextos
      // que no son CLI.
      setTimeout(() => {
        if (loadingCompleteResolve) {
          getConfigHostBindings().logDebug?.(
            'Remote settings: Loading promise timed out, resolving anyway',
          )
          loadingCompleteResolve()
          loadingCompleteResolve = null
        }
      }, LOADING_PROMISE_TIMEOUT_MS)
    })
  }
}

/**
 * Obtiene el endpoint de la API de settings remotos. Usa la URL base de la
 * config OAuth.
 */
function getRemoteManagedSettingsEndpoint() {
  const auth = getConfigHostBindings().getSettingsSyncAuth?.()
  return `${auth?.baseApiUrl ?? 'https://api.anthropic.com'}/api/claude_code/settings`
}

/** Ordena recursivamente las claves de un objeto, igual que Python's json.dumps(sort_keys=True). */
function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep)
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key])
    }
    return sorted
  }
  return obj
}

/**
 * Calcula el checksum de un contenido de settings para caché HTTP. Debe
 * coincidir con el Python del servidor:
 * json.dumps(settings, sort_keys=True, separators=(",", ":")). Exportada
 * para tests que verifiquen la compatibilidad con la implementación del
 * servidor.
 */
export function computeChecksumFromSettings(settings: SettingsJson): string {
  const sorted = sortKeysDeep(settings)
  // Sin espacios tras los separadores, para calzar con separators=(",", ":") de Python.
  const normalized = JSON.stringify(sorted)
  const hash = createHash('sha256').update(normalized).digest('hex')
  return `sha256:${hash}`
}

/**
 * Comprueba si el usuario actual es elegible para settings gestionados
 * remotamente. Es la API pública para que otros sistemas decidan si deben
 * esperar a que carguen los settings remotos.
 */
export function isEligibleForRemoteManagedSettings(): boolean {
  return requireRemoteSyncCache().isRemoteManagedSettingsEligible()
}

/**
 * Espera a que termine la carga inicial de settings remotos. Devuelve de
 * inmediato si:
 * - el usuario no es elegible para settings remotos;
 * - la carga ya terminó;
 * - la carga nunca se inició.
 */
export async function waitForRemoteManagedSettingsToLoad(): Promise<void> {
  if (loadingCompletePromise) {
    await loadingCompletePromise
  }
}

/**
 * Obtiene los headers de auth para settings remotos sin llamar a
 * getSettings(). Evita dependencias circulares durante la carga de
 * settings. Soporta auth por API key y por OAuth.
 */
async function getRemoteSettingsAuthHeaders(): Promise<{
  headers: Record<string, string>
  error?: string
}> {
  const auth = getConfigHostBindings().getSettingsSyncAuth?.()
  if (!auth) return { headers: {}, error: 'Auth binding not installed' }
  try {
    return { headers: await auth.getAuthHeaders() }
  } catch {
    return { headers: {}, error: 'Failed to get auth headers' }
  }
}

/**
 * Trae los settings remotos con reintentos y backoff exponencial. Usa las
 * utilidades de reintento inline de este módulo, por consistencia.
 */
async function fetchWithRetry(
  cachedChecksum?: string,
): Promise<RemoteManagedSettingsFetchResult> {
  let lastResult: RemoteManagedSettingsFetchResult | null = null

  for (let attempt = 1; attempt <= DEFAULT_MAX_RETRIES + 1; attempt++) {
    lastResult = await fetchRemoteManagedSettings(cachedChecksum)

    // Devuelve de inmediato en éxito.
    if (lastResult.success) {
      return lastResult
    }

    // No reintenta si el error no es reintentable (p. ej. errores de auth).
    if (lastResult.skipRetry) {
      return lastResult
    }

    // Si se agotaron los reintentos, devuelve el último error.
    if (attempt > DEFAULT_MAX_RETRIES) {
      return lastResult
    }

    // Calcula el delay y espera antes del siguiente intento.
    const delayMs = getRetryDelay(attempt)
    getConfigHostBindings().logDebug?.(
      `Remote settings: Retry ${attempt}/${DEFAULT_MAX_RETRIES} after ${delayMs}ms`,
    )
    await sleep(delayMs)
  }

  // Nunca debería llegar aquí, pero TypeScript lo necesita.
  return lastResult!
}

/**
 * Trae los settings remotos completos (un solo intento, sin reintentos).
 * Opcionalmente recibe un checksum cacheado para caché basada en ETag.
 */
async function fetchRemoteManagedSettings(
  cachedChecksum?: string,
  // Flag interno de recursión que se fija cuando ya se está reintentando
  // tras un 401 con el token force-refreshed. Evita un loop infinito si el
  // segundo intento también da 401.
  isForceRefreshRetry = false,
): Promise<RemoteManagedSettingsFetchResult> {
  try {
    // Asegura que el token OAuth esté fresco antes de traer los settings.
    // Evita errores 401 por tokens cacheados obsoletos.
    await getConfigHostBindings().getSettingsSyncAuth?.()?.refreshToken?.()

    // Usa el getter de headers de auth local para evitar la dependencia
    // circular con getSettings().
    const authHeaders = await getRemoteSettingsAuthHeaders()
    if (authHeaders.error) {
      // Los errores de auth no se reintentan — flag especial para saltar reintentos.
      return {
        success: false,
        error: `Authentication required for remote settings`,
        skipRetry: true,
      }
    }

    const endpoint = getRemoteManagedSettingsEndpoint()
    const headers: Record<string, string> = {
      ...authHeaders.headers,
      'User-Agent': getClaudeCodeUserAgent(),
    }

    // Header If-None-Match para caché basada en ETag.
    if (cachedChecksum) {
      headers['If-None-Match'] = `"${cachedChecksum}"`
    }

    const response = await requireAxios().get(endpoint, {
      headers,
      timeout: SETTINGS_TIMEOUT_MS,
      // Permite 204, 304 y 404 sin tratarlos como error. 204/404 se
      // devuelven cuando no hay settings para el usuario o el feature flag
      // está apagado.
      validateStatus: (status) =>
        status === 200 || status === 204 || status === 304 || status === 404,
    })

    // 304 Not Modified — la versión cacheada sigue siendo válida.
    if (response.status === 304) {
      getConfigHostBindings().logDebug?.('Remote settings: Using cached settings (304)')
      return {
        success: true,
        settings: null, // señala que la caché es válida
        checksum: cachedChecksum,
      }
    }

    // 204 No Content / 404 Not Found — no hay settings o el feature flag
    // está apagado. Devuelve objeto vacío (no null) para que el llamador
    // no caiga a los settings cacheados.
    if (response.status === 204 || response.status === 404) {
      getConfigHostBindings().logDebug?.(
        `Remote settings: No settings found (${response.status})`,
      )
      return {
        success: true,
        settings: {},
        checksum: undefined,
      }
    }

    const parsed = RemoteManagedSettingsResponseSchema().safeParse(response.data)
    if (!parsed.success) {
      getConfigHostBindings().logDebug?.(
        `Remote settings: Invalid response format - ${parsed.error.message}`,
      )
      return {
        success: false,
        error: 'Invalid remote settings format',
      }
    }

    // Validación completa de la estructura de settings.
    const settingsValidation = getSettingsSchema().safeParse(parsed.data.settings)
    if (!settingsValidation.success) {
      getConfigHostBindings().logDebug?.(
        `Remote settings: Settings validation failed - ${settingsValidation.error.message}`,
      )
      return {
        success: false,
        error: 'Invalid settings structure',
      }
    }

    getConfigHostBindings().logDebug?.('Remote settings: Fetched successfully')
    return {
      success: true,
      settings: settingsValidation.data,
      checksum: parsed.data.checksum,
    }
  } catch (error) {
    const { kind, status, message } = classifyAxiosError(error)
    if (status === 404) {
      // 404 significa que no hay settings remotos configurados.
      return { success: true, settings: {}, checksum: '' }
    }
    // `kind` se ensancha a `string` sólo para este `switch`: `case 'auth'`
    // nunca puede darse (ver el docstring de `classifyAxiosError`), y sin
    // el ensanche `tsc --strict` lo marca como TS2678 al no solapar con
    // `AxiosErrorKind`. Ensanchar preserva el código muerto verbatim en vez
    // de borrarlo o "corregir" el bug de la fuente.
    switch (kind as string) {
      case 'auth':
        // En 401, force-refresca el token OAuth (saltando la caché) y
        // reintenta una vez. El refresh previo al fetch es un caché
        // best-effort; esto atrapa la rotación de token a mitad de
        // request, o un token que ya estaba fresco pero fue rechazado por
        // el servidor.
        if (status === 401 && !isForceRefreshRetry) {
          const auth = getConfigHostBindings().getSettingsSyncAuth?.()
          if (auth) {
            // getAccessToken es opcional en el contrato del binding;
            // refreshToken es obligatorio. Cuando el host no expone
            // getAccessToken no se puede comparar antes/después, así que
            // se asume que el refresh rotó el token y se reintenta una vez
            // (calza con la semántica optimista de la fuente).
            const tokenBefore = auth.getAccessToken
              ? await auth.getAccessToken()
              : undefined
            await auth.refreshToken({ force: true })
            const tokenAfter = auth.getAccessToken
              ? await auth.getAccessToken()
              : undefined
            const tokenRotated =
              auth.getAccessToken === undefined ||
              (tokenAfter !== undefined && tokenAfter !== tokenBefore)
            if (tokenRotated) {
              getConfigHostBindings().logEvent?.(
                'tengu_remote_settings_401_force_refresh_retry',
                {},
              )
              return fetchRemoteManagedSettings(cachedChecksum, true)
            }
          }
        }
        // Los errores de auth (401, 403) no se reintentan — la API key no tiene acceso.
        return {
          success: false,
          error: 'Not authorized for remote settings',
          skipRetry: true,
        }
      case 'timeout':
        return { success: false, error: 'Remote settings request timeout' }
      case 'network':
        return { success: false, error: 'Cannot connect to server' }
      default:
        return { success: false, error: message }
    }
  }
}

/** Guarda los settings remotos en archivo (el checksum se computa on-demand cuando hace falta). */
async function saveSettings(settings: SettingsJson): Promise<void> {
  try {
    const path = requireRemoteSyncCacheState().getSettingsPath()
    const handle = await open(path, 'w', 0o600)
    try {
      await handle.writeFile(JSON.stringify(settings, null, 2), {
        encoding: 'utf-8',
      })
      await handle.datasync()
    } finally {
      await handle.close()
    }
    getConfigHostBindings().logDebug?.(`Remote settings: Saved to ${path}`)
  } catch (error) {
    getConfigHostBindings().logDebug?.(
      `Remote settings: Failed to save - ${error instanceof Error ? error.message : 'unknown error'}`,
    )
    // Ignora errores de guardado — se reintentará el fetch en el próximo arranque.
  }
}

/** Limpia toda la caché de settings remotos (sesión, persistente, y detiene el polling). */
export async function clearRemoteManagedSettingsCache(): Promise<void> {
  // Detiene el polling en segundo plano.
  stopBackgroundPolling()

  // Limpia la caché de sesión.
  requireRemoteSyncCache().resetSyncCache()

  // Limpia el estado de la promesa de carga.
  loadingCompletePromise = null
  loadingCompleteResolve = null

  try {
    const path = requireRemoteSyncCacheState().getSettingsPath()
    await unlink(path)
  } catch {
    // Ignora errores al limpiar el archivo (ENOENT es esperado).
  }
}

/**
 * Trae y carga los settings remotos con caché en archivo. Función interna
 * que maneja el flujo completo de carga/fetch. Falla abierto — devuelve
 * null si el fetch falla y no hay caché.
 */
async function fetchAndLoadRemoteManagedSettings(): Promise<SettingsJson | null> {
  if (!requireRemoteSyncCache().isRemoteManagedSettingsEligible()) {
    return null
  }

  // Carga los settings cacheados desde archivo.
  const cachedSettings = requireRemoteSyncCacheState().getRemoteManagedSettingsSyncFromCache()

  // Computa el checksum localmente desde los settings cacheados, para
  // validación de caché HTTP.
  const cachedChecksum = cachedSettings
    ? computeChecksumFromSettings(cachedSettings)
    : undefined

  try {
    // Trae los settings de la API con reintentos.
    const result = await fetchWithRetry(cachedChecksum)

    if (!result.success) {
      // Si el fetch falla, usa el archivo obsoleto si existe (degradación elegante).
      if (cachedSettings) {
        getConfigHostBindings().logDebug?.(
          'Remote settings: Using stale cache after fetch failure',
        )
        requireRemoteSyncCacheState().setSessionCache(cachedSettings)
        return cachedSettings
      }
      // No hay caché disponible — falla abierto, continúa sin settings remotos.
      return null
    }

    // 304 Not Modified — los settings cacheados siguen siendo válidos.
    if (result.settings === null && cachedSettings) {
      getConfigHostBindings().logDebug?.('Remote settings: Cache still valid (304 Not Modified)')
      requireRemoteSyncCacheState().setSessionCache(cachedSettings)
      return cachedSettings
    }

    // Guarda los settings nuevos en archivo (sólo si no están vacíos).
    const newSettings = result.settings || {}
    const hasContent = Object.keys(newSettings).length > 0

    if (hasContent) {
      // Comprueba cambios peligrosos antes de aplicar los settings.
      const securityResult = await checkManagedSettingsSecurity(
        cachedSettings,
        newSettings,
      )
      if (!handleSecurityCheckResult(securityResult)) {
        // El usuario rechazó — no aplica los settings, devuelve los cacheados o null.
        getConfigHostBindings().logDebug?.(
          'Remote settings: User rejected new settings, using cached settings',
        )
        return cachedSettings
      }

      requireRemoteSyncCacheState().setSessionCache(newSettings)
      await saveSettings(newSettings)
      getConfigHostBindings().logDebug?.('Remote settings: Applied new settings successfully')
      return newSettings
    }

    // Settings vacíos (respuesta 404) — borra el archivo cacheado si existe.
    // Evita que persistan settings obsoletos cuando se eliminan los
    // settings remotos del usuario.
    requireRemoteSyncCacheState().setSessionCache(newSettings)
    try {
      const path = requireRemoteSyncCacheState().getSettingsPath()
      await unlink(path)
      getConfigHostBindings().logDebug?.('Remote settings: Deleted cached file (404 response)')
    } catch (e) {
      const code = getErrnoCode(e)
      if (code !== 'ENOENT') {
        getConfigHostBindings().logDebug?.(
          `Remote settings: Failed to delete cached file - ${e instanceof Error ? e.message : 'unknown error'}`,
        )
      }
    }
    return newSettings
  } catch {
    // Ante cualquier error, usa el archivo obsoleto si existe (degradación elegante).
    if (cachedSettings) {
      getConfigHostBindings().logDebug?.('Remote settings: Using stale cache after error')
      requireRemoteSyncCacheState().setSessionCache(cachedSettings)
      return cachedSettings
    }

    // No hay caché disponible — falla abierto, continúa sin settings remotos.
    return null
  }
}

/**
 * Carga los settings remotos durante la inicialización del CLI. Falla
 * abierto — si el fetch falla, continúa sin settings remotos. También
 * arranca el polling en segundo plano para captar cambios de settings a
 * mitad de sesión.
 *
 * Esta función arma una promesa que otros sistemas pueden esperar vía
 * waitForRemoteManagedSettingsToLoad(), para no inicializarse hasta que los
 * settings remotos se hayan traído.
 */
export async function loadRemoteManagedSettings(): Promise<void> {
  // Arma la promesa para que otros sistemas la esperen. Sólo si el usuario
  // es elegible para settings remotos Y la promesa aún no está armada
  // (initializeRemoteManagedSettingsLoadingPromise pudo haberse llamado antes).
  if (
    requireRemoteSyncCache().isRemoteManagedSettingsEligible() &&
    !loadingCompletePromise
  ) {
    loadingCompletePromise = new Promise((resolve) => {
      loadingCompleteResolve = resolve
    })
  }

  // Cache-first: si hay settings cacheados en disco, se aplican y se
  // desbloquea a quien espera de inmediato. El fetch igual corre abajo;
  // notifyChange dispara una sola vez, después del fetch, como antes.
  // Ahorra la espera del fetch (~77ms) en el arranque del modo print.
  // getRemoteManagedSettingsSyncFromCache ya trae la guarda de elegibilidad
  // y puebla la caché de sesión internamente — no hace falta llamar a
  // setSessionCache aquí.
  if (
    requireRemoteSyncCacheState().getRemoteManagedSettingsSyncFromCache() &&
    loadingCompleteResolve
  ) {
    loadingCompleteResolve()
    loadingCompleteResolve = null
  }

  try {
    const settings = await fetchAndLoadRemoteManagedSettings()

    // Arranca el polling en segundo plano para captar cambios de settings a
    // mitad de sesión.
    if (requireRemoteSyncCache().isRemoteManagedSettingsEligible()) {
      startBackgroundPolling()
    }

    // Dispara el hot-reload si se cargaron settings (nuevos o de caché).
    // notifyChange resetea la caché de settings internamente antes de
    // iterar listeners — env vars, telemetría y permisos se actualizan en
    // la siguiente lectura.
    if (settings !== null) {
      requireSettingsChangeDetector().settingsChangeDetector.notifyChange(
        'policySettings',
      )
    }
  } finally {
    // Siempre resuelve la promesa, aunque el fetch falle (fail-open).
    if (loadingCompleteResolve) {
      loadingCompleteResolve()
      loadingCompleteResolve = null
    }
  }
}

/**
 * Refresca los settings remotos de forma asíncrona (ante cambios de estado
 * de auth). Se usa en login/logout. Falla abierto — si el fetch falla,
 * continúa sin settings remotos.
 */
export async function refreshRemoteManagedSettings(): Promise<void> {
  // Limpia las cachés primero.
  await clearRemoteManagedSettingsCache()

  // Si no está habilitado, notifica que policySettings cambió (a vacío).
  if (!requireRemoteSyncCache().isRemoteManagedSettingsEligible()) {
    requireSettingsChangeDetector().settingsChangeDetector.notifyChange(
      'policySettings',
    )
    return
  }

  // Intenta cargar settings nuevos (falla abierto si el fetch falla).
  await fetchAndLoadRemoteManagedSettings()
  getConfigHostBindings().logDebug?.('Remote settings: Refreshed after auth change')

  // Notifica a los listeners. notifyChange resetea la caché de settings
  // internamente; esto dispara el hot-reload (actualización de AppState,
  // aplicación de env vars, etc.).
  requireSettingsChangeDetector().settingsChangeDetector.notifyChange(
    'policySettings',
  )
}

/** Callback del polling en segundo plano — trae settings y dispara hot-reload si cambiaron. */
async function pollRemoteSettings(): Promise<void> {
  if (!requireRemoteSyncCache().isRemoteManagedSettingsEligible()) {
    return
  }

  // Obtiene los settings cacheados actuales para comparar.
  const prevCache = requireRemoteSyncCacheState().getRemoteManagedSettingsSyncFromCache()
  const previousSettings = prevCache ? JSON.stringify(prevCache) : null

  try {
    await fetchAndLoadRemoteManagedSettings()

    // Comprueba si los settings realmente cambiaron.
    const newCache = requireRemoteSyncCacheState().getRemoteManagedSettingsSyncFromCache()
    const newSettings = newCache ? JSON.stringify(newCache) : null
    if (newSettings !== previousSettings) {
      getConfigHostBindings().logDebug?.('Remote settings: Changed during background poll')
      requireSettingsChangeDetector().settingsChangeDetector.notifyChange(
        'policySettings',
      )
    }
  } catch {
    // No falla cerrado por el polling en segundo plano — sólo continúa.
  }
}

/** Arranca el polling en segundo plano de settings remotos. Cada hora, para captar cambios a mitad de sesión. */
export function startBackgroundPolling(): void {
  if (pollingIntervalId !== null) {
    return
  }

  if (!requireRemoteSyncCache().isRemoteManagedSettingsEligible()) {
    return
  }

  pollingIntervalId = setInterval(() => {
    void pollRemoteSettings()
  }, POLLING_INTERVAL_MS)
  pollingIntervalId.unref()

  // Registra el cleanup para detener el polling al apagar.
  getConfigHostBindings().registerCleanup?.(async () => stopBackgroundPolling())
}

/** Detiene el polling en segundo plano de settings remotos. */
export function stopBackgroundPolling(): void {
  if (pollingIntervalId !== null) {
    clearInterval(pollingIntervalId)
    pollingIntervalId = null
  }
}
