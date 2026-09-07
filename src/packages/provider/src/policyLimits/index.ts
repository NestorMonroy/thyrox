/**
 * Porte de `ccnmt: packages/provider/src/policyLimits/index.ts` — servicio
 * de restricciones a nivel de organización. Sus 13 exportaciones, ninguna
 * omitida.
 *
 * `./types.js` (sibling, no asignado a este pase) → `internal/policyLimitsTypes.ts`
 * (ver su cabecera). `./userAgent.js`/`./withRetry.js`
 * (`getClaudeCodeUserAgent`/`getRetryDelay`) → `internal/pendingCrossPackageDeps.ts`.
 * `app-host/bootstrap/cleanupRegistry.js` (`registerCleanup`),
 * `config/env/utils` (`getClaudeConfigHomeDir`), `config/sleep`,
 * `config/env/privacy-level` (`isEssentialTrafficOnly`) → ídem, no
 * resuelven en `@thyrox/*` hoy. `safeParseJSON` → se usa `safeParseJSONC`
 * de `@thyrox/storage/json.js` (la que sí existe; superconjunto tolerante
 * a comentarios).
 */

import axios from 'axios'
import { createHash } from 'node:crypto'
import { readFileSync as fsReadFileSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CLAUDE_AI_INFERENCE_SCOPE, getOauthConfig, OAUTH_BETA_HEADER } from '../oauthConstants.ts'
import { checkAndRefreshOAuthTokenIfNeeded, getAnthropicApiKeyWithSource, getClaudeAIOAuthTokens } from '../authAlias.ts'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { classifyAxiosError } from '@thyrox/local-observability/errorHelpers.js'
import { safeParseJSONC } from '@thyrox/storage/json.js'
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from '../providers.ts'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import {
  getClaudeCodeUserAgent,
  getRetryDelay,
  registerCleanup,
  getClaudeConfigHomeDir,
  sleep,
  isEssentialTrafficOnly,
} from '../internal/pendingCrossPackageDeps.ts'
import {
  type PolicyLimitsFetchResult,
  type PolicyLimitsResponse,
  PolicyLimitsResponseSchema,
} from '../internal/policyLimitsTypes.ts'

function isNodeError(e: unknown): e is NodeJS.ErrnoException {
  return e instanceof Error
}

const CACHE_FILENAME = 'policy-limits.json'
const FETCH_TIMEOUT_MS = 10000
const DEFAULT_MAX_RETRIES = 5
const POLLING_INTERVAL_MS = 60 * 60 * 1000

let pollingIntervalId: ReturnType<typeof setInterval> | null = null
let cleanupRegistered = false

let loadingCompletePromise: Promise<void> | null = null
let loadingCompleteResolve: (() => void) | null = null

const LOADING_PROMISE_TIMEOUT_MS = 30000

let sessionCache: PolicyLimitsResponse['restrictions'] | null = null
let complianceTaintsCache: string[] | null = null

/** Reset síncrono sólo para tests. */
export function _resetPolicyLimitsForTesting(): void {
  stopBackgroundPolling()
  sessionCache = null
  complianceTaintsCache = null
  loadingCompletePromise = null
  loadingCompleteResolve = null
}

/**
 * Inicializa la promesa de carga de policy limits, para que otros
 * sistemas puedan esperarla aunque `loadPolicyLimits()` no se haya
 * llamado todavía. Sólo si el usuario es elegible.
 */
export function initializePolicyLimitsLoadingPromise(): void {
  if (loadingCompletePromise) return

  if (isPolicyLimitsEligible()) {
    loadingCompletePromise = new Promise(resolve => {
      loadingCompleteResolve = resolve
      setTimeout(() => {
        if (loadingCompleteResolve) {
          logForDebugging('Policy limits: Loading promise timed out, resolving anyway')
          loadingCompleteResolve()
          loadingCompleteResolve = null
        }
      }, LOADING_PROMISE_TIMEOUT_MS)
    })
  }
}

function getCachePath(): string {
  return join(getClaudeConfigHomeDir(), CACHE_FILENAME)
}

function getPolicyLimitsEndpoint(): string {
  return `${getOauthConfig().BASE_API_URL}/api/claude_code/policy_limits`
}

function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep)
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))) {
      sorted[key] = sortKeysDeep(value)
    }
    return sorted
  }
  return obj
}

function computeChecksum(restrictions: PolicyLimitsResponse['restrictions']): string {
  const sorted = sortKeysDeep(restrictions)
  const normalized = jsonStringify(sorted)
  const hash = createHash('sha256').update(normalized).digest('hex')
  return `sha256:${hash}`
}

/**
 * ¿El usuario actual es elegible para policy limits? IMPORTANTE: no debe
 * llamar a `getSettings()` ni nada que lo haga, para evitar ciclos durante
 * la carga de settings.
 */
export function isPolicyLimitsEligible(): boolean {
  if (getAPIProvider() !== 'firstParty') return false
  if (!isFirstPartyAnthropicBaseUrl()) return false

  try {
    const { key: apiKey } = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: true })
    if (apiKey) return true
  } catch {
    // sin API key — sigue con OAuth
  }

  const tokens = getClaudeAIOAuthTokens()
  if (!tokens?.accessToken) return false
  if (!tokens.scopes?.includes(CLAUDE_AI_INFERENCE_SCOPE)) return false
  if (tokens.subscriptionType !== 'enterprise' && tokens.subscriptionType !== 'team') return false

  return true
}

/** Espera a que termine la carga inicial de policy limits. */
export async function waitForPolicyLimitsToLoad(): Promise<void> {
  if (loadingCompletePromise) {
    await loadingCompletePromise
  }
}

function getAuthHeaders(): { headers: Record<string, string>; error?: string } {
  try {
    const { key: apiKey } = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: true })
    if (apiKey) {
      return { headers: { 'x-api-key': apiKey } }
    }
  } catch {
    // sin API key — sigue con OAuth
  }

  const oauthTokens = getClaudeAIOAuthTokens()
  if (oauthTokens?.accessToken) {
    return {
      headers: {
        Authorization: `Bearer ${oauthTokens.accessToken}`,
        'anthropic-beta': OAUTH_BETA_HEADER,
      },
    }
  }

  return { headers: {}, error: 'No authentication available' }
}

async function fetchWithRetry(cachedChecksum?: string): Promise<PolicyLimitsFetchResult> {
  let lastResult: PolicyLimitsFetchResult | null = null

  for (let attempt = 1; attempt <= DEFAULT_MAX_RETRIES + 1; attempt++) {
    lastResult = await fetchPolicyLimits(cachedChecksum)

    if (lastResult.success) return lastResult
    if (lastResult.skipRetry) return lastResult
    if (attempt > DEFAULT_MAX_RETRIES) return lastResult

    const delayMs = getRetryDelay(attempt)
    logForDebugging(`Policy limits: Retry ${attempt}/${DEFAULT_MAX_RETRIES} after ${delayMs}ms`)
    await sleep(delayMs)
  }

  return lastResult!
}

async function fetchPolicyLimits(cachedChecksum?: string): Promise<PolicyLimitsFetchResult> {
  try {
    await checkAndRefreshOAuthTokenIfNeeded()

    const authHeaders = getAuthHeaders()
    if (authHeaders.error) {
      return { success: false, error: 'Authentication required for policy limits', skipRetry: true }
    }

    const endpoint = getPolicyLimitsEndpoint()
    const headers: Record<string, string> = {
      ...authHeaders.headers,
      'User-Agent': getClaudeCodeUserAgent(),
    }

    if (cachedChecksum) {
      headers['If-None-Match'] = `"${cachedChecksum}"`
    }

    const response = await axios.get(endpoint, {
      headers,
      timeout: FETCH_TIMEOUT_MS,
      validateStatus: status => status === 200 || status === 304 || status === 404,
    })

    if (response.status === 304) {
      logForDebugging('Policy limits: Using cached restrictions (304)')
      return { success: true, restrictions: null, complianceTaints: null, etag: cachedChecksum }
    }

    if (response.status === 404) {
      logForDebugging('Policy limits: No restrictions found (404)')
      return { success: true, restrictions: {}, complianceTaints: [], etag: undefined }
    }

    const parsed = PolicyLimitsResponseSchema().safeParse(response.data)
    if (!parsed.success) {
      logForDebugging(`Policy limits: Invalid response format - ${parsed.error.message}`)
      return { success: false, error: 'Invalid policy limits format' }
    }

    logForDebugging('Policy limits: Fetched successfully')
    return { success: true, restrictions: parsed.data.restrictions, complianceTaints: parsed.data.compliance_taints }
  } catch (error) {
    const { kind, message } = classifyAxiosError(error)
    switch (kind) {
      case 'auth':
        return { success: false, error: 'Not authorized for policy limits', skipRetry: true }
      case 'timeout':
        return { success: false, error: 'Policy limits request timeout' }
      case 'network':
        return { success: false, error: 'Cannot connect to server' }
      default:
        return { success: false, error: message }
    }
  }
}

function loadCachedRestrictions(): PolicyLimitsResponse['restrictions'] | null {
  try {
    const content = fsReadFileSync(getCachePath(), 'utf-8')
    const data = safeParseJSONC(content)
    const parsed = PolicyLimitsResponseSchema().safeParse(data)
    if (!parsed.success) return null

    complianceTaintsCache = parsed.data.compliance_taints
    return parsed.data.restrictions
  } catch {
    return null
  }
}

async function saveCachedRestrictions(
  restrictions: PolicyLimitsResponse['restrictions'],
  complianceTaints: string[] = [],
): Promise<void> {
  try {
    const path = getCachePath()
    const data: PolicyLimitsResponse = { restrictions, compliance_taints: complianceTaints }
    await writeFile(path, jsonStringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 })
    logForDebugging(`Policy limits: Saved to ${path}`)
  } catch (error) {
    logForDebugging(`Policy limits: Failed to save - ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

async function fetchAndLoadPolicyLimits(): Promise<PolicyLimitsResponse['restrictions'] | null> {
  if (!isPolicyLimitsEligible()) return null

  const cachedRestrictions = loadCachedRestrictions()
  const cachedChecksum = cachedRestrictions ? computeChecksum(cachedRestrictions) : undefined

  try {
    const result = await fetchWithRetry(cachedChecksum)

    if (!result.success) {
      if (cachedRestrictions) {
        logForDebugging('Policy limits: Using stale cache after fetch failure')
        sessionCache = cachedRestrictions
        return cachedRestrictions
      }
      return null
    }

    if (result.restrictions === null && cachedRestrictions) {
      logForDebugging('Policy limits: Cache still valid (304 Not Modified)')
      sessionCache = cachedRestrictions
      return cachedRestrictions
    }

    const newRestrictions = result.restrictions || {}
    const newTaints: typeof result.complianceTaints = Array.isArray(result.complianceTaints) ? result.complianceTaints : []
    const hasContent = Object.keys(newRestrictions).length > 0

    if (hasContent) {
      sessionCache = newRestrictions
      complianceTaintsCache = newTaints
      await saveCachedRestrictions(newRestrictions, newTaints)
      logForDebugging('Policy limits: Applied new restrictions successfully')
      return newRestrictions
    }

    sessionCache = newRestrictions
    complianceTaintsCache = newTaints
    try {
      await unlink(getCachePath())
      logForDebugging('Policy limits: Deleted cached file (404 response)')
    } catch (e) {
      if (isNodeError(e) && e.code !== 'ENOENT') {
        logForDebugging(`Policy limits: Failed to delete cached file - ${e.message}`)
      }
    }
    return newRestrictions
  } catch {
    if (cachedRestrictions) {
      logForDebugging('Policy limits: Using stale cache after error')
      sessionCache = cachedRestrictions
      return cachedRestrictions
    }
    return null
  }
}

const ESSENTIAL_TRAFFIC_DENY_ON_MISS = new Set(['allow_product_feedback'])

/** ¿Una política está permitida? true si es desconocida/no disponible (fail open). */
export function isPolicyAllowed(policy: string): boolean {
  const restrictions = getRestrictionsFromCache()
  if (!restrictions) {
    if (isEssentialTrafficOnly() && ESSENTIAL_TRAFFIC_DENY_ON_MISS.has(policy)) {
      return false
    }
    return true
  }
  const restriction = restrictions[policy]
  if (!restriction) return true
  return restriction.allowed
}

/** ¿Una política está explícitamente enforced (presente y no permitida)? */
export function isPolicyEnforced(policy: string): boolean {
  const restrictions = getRestrictionsFromCache()
  if (!restrictions) return false
  const restriction = restrictions[policy]
  if (!restriction) return false
  return restriction.allowed === false
}

/** Set de compliance taints recibido del servidor. */
export function getComplianceTaints(): string[] {
  if (sessionCache === null && complianceTaintsCache === null) {
    loadCachedRestrictions()
  }
  return complianceTaintsCache ? [...complianceTaintsCache] : []
}

export function hasComplianceTaint(name: string): boolean {
  return getComplianceTaints().includes(name)
}

function getRestrictionsFromCache(): PolicyLimitsResponse['restrictions'] | null {
  if (!isPolicyLimitsEligible()) return null
  if (sessionCache) return sessionCache

  const cachedRestrictions = loadCachedRestrictions()
  if (cachedRestrictions) {
    sessionCache = cachedRestrictions
    return cachedRestrictions
  }
  return null
}

/** Carga policy limits durante la inicialización del CLI. Fail-open. */
export async function loadPolicyLimits(): Promise<void> {
  if (isPolicyLimitsEligible() && !loadingCompletePromise) {
    loadingCompletePromise = new Promise(resolve => {
      loadingCompleteResolve = resolve
    })
  }

  try {
    await fetchAndLoadPolicyLimits()
    if (isPolicyLimitsEligible()) {
      startBackgroundPolling()
    }
  } finally {
    if (loadingCompleteResolve) {
      loadingCompleteResolve()
      loadingCompleteResolve = null
    }
  }
}

/** Refresca policy limits (ej. tras un cambio de login). */
export async function refreshPolicyLimits(): Promise<void> {
  await clearPolicyLimitsCache()
  if (!isPolicyLimitsEligible()) return
  await fetchAndLoadPolicyLimits()
  logForDebugging('Policy limits: Refreshed after auth change')
}

/** Limpia todo (sesión, persistente, y detiene el polling). */
export async function clearPolicyLimitsCache(): Promise<void> {
  stopBackgroundPolling()
  sessionCache = null
  complianceTaintsCache = null
  loadingCompletePromise = null
  loadingCompleteResolve = null

  try {
    await unlink(getCachePath())
  } catch {
    // ENOENT y demás errores se ignoran
  }
}

async function pollPolicyLimits(): Promise<void> {
  if (!isPolicyLimitsEligible()) return

  const previousCache = sessionCache ? jsonStringify(sessionCache) : null

  try {
    await fetchAndLoadPolicyLimits()
    const newCache = sessionCache ? jsonStringify(sessionCache) : null
    if (newCache !== previousCache) {
      logForDebugging('Policy limits: Changed during background poll')
    }
  } catch {
    // no falla cerrado por un poll en background
  }
}

/** Arranca el polling en background de policy limits. */
export function startBackgroundPolling(): void {
  if (pollingIntervalId !== null) return
  if (!isPolicyLimitsEligible()) return

  pollingIntervalId = setInterval(() => {
    void pollPolicyLimits()
  }, POLLING_INTERVAL_MS)
  pollingIntervalId.unref()

  if (!cleanupRegistered) {
    cleanupRegistered = true
    registerCleanup(async () => stopBackgroundPolling())
  }
}

/** Detiene el polling en background. */
export function stopBackgroundPolling(): void {
  if (pollingIntervalId !== null) {
    clearInterval(pollingIntervalId)
    pollingIntervalId = null
  }
}
