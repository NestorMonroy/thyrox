/**
 * Puerto de `ccnmt: packages/provider/src/fastMode.ts` (~500 líneas
 * fuente, 15 símbolos de valor exportados + 2 tipos). El propio
 * `internal/pendingCrossPackageDeps.ts` de este paquete ya declaraba, antes
 * de este pase, que el archivo completo "NO está asignado" y traía un
 * sustituto de una línea (`isFastModeEnabled`) sólo para `costTracker.ts`.
 * Ahora es uno de los 16 módulos del pase — se porta entero.
 *
 * Cobertura: 15 de 15 símbolos de valor + los 2 tipos exportados
 * (`FastModeRuntimeState`, `CooldownReason`, `FastModeDisabledReason`).
 *
 * Reusa de este mismo paquete: `./internal/pendingCrossPackageDeps.ts`
 * (`createSignal`, `isEssentialTrafficOnly` — sustitutos locales YA
 * escritos por un pase anterior, mismo contrato que la fuente), `./model.ts`,
 * `./providers.ts`, `./authAlias.ts`, `./oauthConstants.ts`.
 *
 * NO portado — bloqueado, declarado por nombre (dangling, sin fabricar
 * sustituto — un stub de estas tres piezas sería peor que la ausencia):
 *
 * - `@claude-code-how-works/app-host/bootstrap/state.js` →
 *   `getIsNonInteractiveSession`, `getKairosActive`,
 *   `preferThirdPartyAuthentication`. `@thyrox/app-host/src/bootstrap/state.ts`
 *   existe (429 líneas, ya portado) pero su `type State` no declara los
 *   campos `isInteractive`/`kairosActive`/`clientType` que estos tres
 *   accesores leen en la fuente — medido:
 *   `grep -n "isInteractive\|kairosActive\|clientType"
 *   src/packages/app-host/src/bootstrap/state.ts` → 0 hits. Añadirlos exige
 *   tocar el `State` compartido de un paquete que no es mío en este pase
 *   (`app-host` sí lo es, pero el archivo no está en mis 16 y otros agentes
 *   pueden estar escribiéndolo a la vez — `bash-background-tasks.md`).
 * - `@claude-code-how-works/config` (bare, no `/settings`) →
 *   `getGlobalConfig`, `saveGlobalConfig`. Es el config GLOBAL
 *   (`~/.claude.json`), distinto de `@thyrox/config/settings` (que este
 *   mismo pase sí porta) — `@thyrox/config/index.ts` no lo declara.
 * - `@claude-code-how-works/config/bundledMode` → `isInBundledMode`. No
 *   existe ningún `bundledMode.ts` en `@thyrox/config`.
 *
 * Consecuencia observable: `getFastModeUnavailableReason` evalúa el branch
 * de "no disponible en el SDK" como si `getIsNonInteractiveSession()`
 * siempre devolviera `false` (import ausente → el `require` diferido de
 * abajo lanza SÓLO si esa rama se ejecuta) y `prefetchFastModeStatus`/
 * `handleFastModeRejectedByAPI`/`handleFastModeOverageRejection` no pueden
 * leer/escribir `~/.claude.json` hasta que `getGlobalConfig`/
 * `saveGlobalConfig` aterricen — lanzan al invocarse, no al importar el
 * módulo (mismo patrón que `agent/frontmatterParser.ts` y
 * `app-host/src/runtime/installProviderBindings.ts`: import estático de un
 * miembro ausente rompería el módulo ENTERO).
 *
 * Hallazgo incidental (no uno de los 16, corregido por bloquear la
 * verificación de este archivo): 11 imports cross-paquete en 6 hermanos de
 * este mismo paquete (`model.ts`, `modelOptions.ts`, `costTracker.ts`,
 * `claude.ts`, `providers.ts`, `claudeLegacyRuntime.ts`) usaban el sufijo
 * `.ts` en el specifier (p. ej. `'@thyrox/agent/context.ts'`), que ningún
 * patrón del `exports` map de los paquetes destino cubre — sólo `"./*"`
 * (sin sufijo) y `"./*.js"` (sufijo `.js`). Medido:
 * `Bun.resolveSync('@thyrox/agent/context.ts', …)` fallaba,
 * `Bun.resolveSync('@thyrox/agent/context', …)` resuelve. Se corrigió
 * quitando el sufijo (mismo target); 0 ocurrencias fuera de `provider/src/`
 * entre mis 8 paquetes.
 */
import axios from 'axios'
import { getOauthConfig, OAUTH_BETA_HEADER } from './oauthConstants.ts'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags.js'
import {
  AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import {
  getAnthropicApiKey,
  getClaudeAIOAuthTokens,
  handleOAuth401Error,
  hasProfileScope,
} from './authAlias.ts'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'
import {
  getDefaultMainLoopModelSetting,
  isOpus1mMergeEnabled,
  type ModelSetting,
  parseUserSpecifiedModel,
} from './model.ts'
import { getAPIProvider } from './providers.ts'
import {
  getInitialSettings,
  getSettingsForSource,
  updateSettingsForSource,
} from '@thyrox/config/settings'
import { createSignal, isEssentialTrafficOnly } from './internal/pendingCrossPackageDeps.ts'

// Bindings del host de app-host y del config global (`~/.claude.json`) que
// NO están portados hoy (ver docstring del módulo). Se declaran aquí,
// dangling, con el mismo criterio que el resto del árbol: el `require()`
// lanza SÓLO si el caller invoca la función, no al cargar este archivo.
type MissingAppHostState = {
  getIsNonInteractiveSession: () => boolean
  getKairosActive: () => boolean
  preferThirdPartyAuthentication: () => boolean
}
function requireAppHostBootstrapState(): MissingAppHostState {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/bootstrap/state.js') as MissingAppHostState
}

type MissingGlobalConfig = {
  getGlobalConfig: () => { penguinModeOrgEnabled?: boolean }
  saveGlobalConfig: (
    fn: (current: { penguinModeOrgEnabled?: boolean }) => {
      penguinModeOrgEnabled?: boolean
    },
  ) => void
}
function requireGlobalConfig(): MissingGlobalConfig {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config') as MissingGlobalConfig
}

function requireBundledMode(): { isInBundledMode: () => boolean } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/bundledMode.js') as {
    isInBundledMode: () => boolean
  }
}

export function isFastModeEnabled(): boolean {
  return !isEnvTruthy(readEnv('CLAUDE_CODE_DISABLE_FAST_MODE'))
}

export function isFastModeAvailable(): boolean {
  if (!isFastModeEnabled()) {
    return false
  }
  return getFastModeUnavailableReason() === null
}

type AuthType = 'oauth' | 'api-key'

function getDisabledReasonMessage(
  disabledReason: FastModeDisabledReason,
  authType: AuthType,
): string {
  switch (disabledReason) {
    case 'free':
      return authType === 'oauth'
        ? 'Fast mode requires a paid subscription'
        : 'Fast mode unavailable during evaluation. Please purchase credits.'
    case 'preference':
      return 'Fast mode has been disabled by your organization'
    case 'extra_usage_disabled':
      return 'Fast mode requires extra usage billing · /extra-usage to enable'
    case 'network_error':
      return 'Fast mode unavailable due to network connectivity issues'
    case 'unknown':
      return 'Fast mode is currently unavailable'
  }
}

export function getFastModeUnavailableReason(): string | null {
  if (!isFastModeEnabled()) {
    return 'Fast mode is not available'
  }

  const statigReason = getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_penguins_off',
    null,
  )
  if (statigReason !== null) {
    logForDebugging(`Fast mode unavailable: ${statigReason}`)
    return statigReason
  }

  if (
    !requireBundledMode().isInBundledMode() &&
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_marble_sandcastle', false)
  ) {
    return 'Fast mode requires the native binary · Install from: https://claude.com/product/claude-code-how-works-how-works'
  }

  const { getIsNonInteractiveSession, getKairosActive, preferThirdPartyAuthentication } =
    requireAppHostBootstrapState()
  if (
    getIsNonInteractiveSession() &&
    preferThirdPartyAuthentication() &&
    !getKairosActive()
  ) {
    const flagFastMode = getSettingsForSource('flagSettings')?.fastMode
    if (!flagFastMode) {
      const reason = 'Fast mode is not available in the Agent SDK'
      logForDebugging(`Fast mode unavailable: ${reason}`)
      return reason
    }
  }

  if (getAPIProvider() !== 'firstParty') {
    const reason = 'Fast mode is not available on Bedrock, Vertex, or Foundry'
    logForDebugging(`Fast mode unavailable: ${reason}`)
    return reason
  }

  if (orgStatus.status === 'disabled') {
    if (
      orgStatus.reason === 'network_error' ||
      orgStatus.reason === 'unknown'
    ) {
      if (isEnvTruthy(readEnv('CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS'))) {
        return null
      }
    }
    const authType: AuthType =
      getClaudeAIOAuthTokens() !== null ? 'oauth' : 'api-key'
    const reason = getDisabledReasonMessage(orgStatus.reason, authType)
    logForDebugging(`Fast mode unavailable: ${reason}`)
    return reason
  }

  return null
}

// Actualizar los modelos de Fast Mode soportados cuando cambie el
// lanzamiento vigente. Opus 4.8 es el objetivo por defecto; el override
// heredado a Opus 4.6 está deprecado upstream pero se conserva para
// compatibilidad mientras los usuarios migran.
function shouldUseOpus46FastMode(): boolean {
  if (isEnvTruthy(readEnv('CLAUDE_CODE_ENABLE_OPUS_4_8_FAST_MODE'))) return false
  if (isEnvTruthy(readEnv('CLAUDE_CODE_OPUS_4_6_FAST_MODE_OVERRIDE'))) return true
  return false
}

export function getFastModeModelDisplay(): string {
  return shouldUseOpus46FastMode() ? 'Opus 4.6' : 'Opus 4.8'
}

// Constante para callers que resuelven el nombre a la carga del módulo;
// los callers en runtime deberían preferir getFastModeModelDisplay() para
// que el override por variable de entorno se respete aunque se fije
// después de la carga.
export const FAST_MODE_MODEL_DISPLAY = 'Opus 4.8'

export function getFastModeModel(): string {
  const base = shouldUseOpus46FastMode() ? 'claude-opus-4-6' : 'opus'
  return base + (isOpus1mMergeEnabled() ? '[1m]' : '')
}

export function getInitialFastModeSetting(model: ModelSetting): boolean {
  if (!isFastModeEnabled()) {
    return false
  }
  if (!isFastModeAvailable()) {
    return false
  }
  if (!isFastModeSupportedByModel(model)) {
    return false
  }
  const settings = getInitialSettings()
  if (settings.fastModePerSessionOptIn) {
    return false
  }
  return settings.fastMode === true
}

export function isFastModeSupportedByModel(
  modelSetting: ModelSetting,
): boolean {
  if (!isFastModeEnabled()) {
    return false
  }
  const model = modelSetting ?? getDefaultMainLoopModelSetting()
  const parsedModel = parseUserSpecifiedModel(model)
  const normalized = parsedModel.toLowerCase()
  return (
    normalized.includes('opus-4-8') ||
    normalized.includes('opus-4-7') ||
    normalized.includes('opus-4-6')
  )
}

// --- Estado runtime de fast mode ---
// Distinto de la preferencia del usuario (settings.fastMode). Rastrea el
// estado operativo real: si se está enviando velocidad rápida activamente
// o en cooldown tras un rate limit.

export type FastModeRuntimeState =
  | { status: 'active' }
  | { status: 'cooldown'; resetAt: number; reason: CooldownReason }

let runtimeState: FastModeRuntimeState = { status: 'active' }
let hasLoggedCooldownExpiry = false

// --- Listeners de eventos de cooldown ---
export type CooldownReason = 'rate_limit' | 'overloaded'

const cooldownTriggered =
  createSignal<[resetAt: number, reason: CooldownReason]>()
const cooldownExpired = createSignal()
export const onCooldownTriggered = cooldownTriggered.subscribe
export const onCooldownExpired = cooldownExpired.subscribe

export function getFastModeRuntimeState(): FastModeRuntimeState {
  if (
    runtimeState.status === 'cooldown' &&
    Date.now() >= runtimeState.resetAt
  ) {
    if (isFastModeEnabled() && !hasLoggedCooldownExpiry) {
      logForDebugging('Fast mode cooldown expired, re-enabling fast mode')
      hasLoggedCooldownExpiry = true
      cooldownExpired.emit()
    }
    runtimeState = { status: 'active' }
  }
  return runtimeState
}

export function triggerFastModeCooldown(
  resetTimestamp: number,
  reason: CooldownReason,
): void {
  if (!isFastModeEnabled()) {
    return
  }
  runtimeState = { status: 'cooldown', resetAt: resetTimestamp, reason }
  hasLoggedCooldownExpiry = false
  const cooldownDurationMs = resetTimestamp - Date.now()
  logForDebugging(
    `Fast mode cooldown triggered (${reason}), duration ${Math.round(cooldownDurationMs / 1000)}s`,
  )
  logEvent('tengu_fast_mode_fallback_triggered', {
    cooldown_duration_ms: cooldownDurationMs,
    cooldown_reason:
      reason as typeof AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
  cooldownTriggered.emit(resetTimestamp, reason)
}

export function clearFastModeCooldown(): void {
  runtimeState = { status: 'active' }
}

/**
 * Se llama cuando la API rechaza una petición de fast mode (p. ej. 400
 * "Fast mode is not enabled for your organization"). Deshabilita fast
 * mode permanentemente por el mismo flujo que cuando el prefetch descubre
 * que la org lo tiene deshabilitado.
 */
export function handleFastModeRejectedByAPI(): void {
  if (orgStatus.status === 'disabled') {
    return
  }
  orgStatus = { status: 'disabled', reason: 'preference' }
  updateSettingsForSource('userSettings', { fastMode: undefined })
  requireGlobalConfig().saveGlobalConfig(current => ({
    ...current,
    penguinModeOrgEnabled: false,
  }))
  orgFastModeChange.emit(false)
}

// --- Listeners de rechazo por overage ---
// Se disparan cuando un 429 indica que fast mode fue rechazado porque el
// billing de uso extra no está disponible. Distinto del deshabilitado a
// nivel de organización.
const overageRejection = createSignal<[message: string]>()
export const onFastModeOverageRejection = overageRejection.subscribe

function getOverageDisabledMessage(reason: string | null): string {
  switch (reason) {
    case 'out_of_credits':
      return 'Fast mode disabled · extra usage credits exhausted'
    case 'org_level_disabled':
    case 'org_service_level_disabled':
      return 'Fast mode disabled · extra usage disabled by your organization'
    case 'org_level_disabled_until':
      return 'Fast mode disabled · extra usage spending cap reached'
    case 'member_level_disabled':
      return 'Fast mode disabled · extra usage disabled for your account'
    case 'seat_tier_level_disabled':
    case 'seat_tier_zero_credit_limit':
    case 'member_zero_credit_limit':
      return 'Fast mode disabled · extra usage not available for your plan'
    case 'overage_not_provisioned':
    case 'no_limits_configured':
      return 'Fast mode requires extra usage billing · /extra-usage to enable'
    default:
      return 'Fast mode disabled · extra usage not available'
  }
}

function isOutOfCreditsReason(reason: string | null): boolean {
  return reason === 'org_level_disabled_until' || reason === 'out_of_credits'
}

/**
 * Se llama cuando un 429 indica que fast mode fue rechazado porque el
 * overage no está disponible. Deshabilita fast mode permanentemente
 * (salvo que el usuario se haya quedado sin crédito) y notifica con un
 * mensaje específico de la razón.
 */
export function handleFastModeOverageRejection(reason: string | null): void {
  const message = getOverageDisabledMessage(reason)
  logForDebugging(
    `Fast mode overage rejection: ${reason ?? 'unknown'} — ${message}`,
  )
  logEvent('tengu_fast_mode_overage_rejected', {
    overage_disabled_reason: (reason ??
      'unknown') as typeof AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
  if (!isOutOfCreditsReason(reason)) {
    updateSettingsForSource('userSettings', { fastMode: undefined })
    requireGlobalConfig().saveGlobalConfig(current => ({
      ...current,
      penguinModeOrgEnabled: false,
    }))
  }
  overageRejection.emit(message)
}

export function isFastModeCooldown(): boolean {
  return getFastModeRuntimeState().status === 'cooldown'
}

export function getFastModeState(
  model: ModelSetting,
  fastModeUserEnabled: boolean | undefined,
): 'off' | 'cooldown' | 'on' {
  const enabled =
    isFastModeEnabled() &&
    isFastModeAvailable() &&
    !!fastModeUserEnabled &&
    isFastModeSupportedByModel(model)
  if (enabled && isFastModeCooldown()) {
    return 'cooldown'
  }
  if (enabled) {
    return 'on'
  }
  return 'off'
}

// Razón devuelta por la API. La API es la fuente canónica de por qué fast
// mode está deshabilitado (cuenta gratuita, preferencia del admin, extra
// usage no habilitado).
export type FastModeDisabledReason =
  | 'free'
  | 'preference'
  | 'extra_usage_disabled'
  | 'network_error'
  | 'unknown'

// Caché en memoria del estado de fast mode que viene de la API. Distinto
// del app state de fast mode del usuario — representa si la org *permite*
// fast mode y por qué puede estar deshabilitado.
type FastModeOrgStatus =
  | { status: 'pending' }
  | { status: 'enabled' }
  | { status: 'disabled'; reason: FastModeDisabledReason }

let orgStatus: FastModeOrgStatus = { status: 'pending' }

// Listeners notificados cuando el estado de fast mode a nivel de org cambia
const orgFastModeChange = createSignal<[orgEnabled: boolean]>()
export const onOrgFastModeChanged = orgFastModeChange.subscribe

type FastModeResponse = {
  enabled: boolean
  disabled_reason: FastModeDisabledReason | null
}

async function fetchFastModeStatus(
  auth: { accessToken: string } | { apiKey: string },
): Promise<FastModeResponse> {
  const endpoint = `${getOauthConfig().BASE_API_URL}/api/claude_code_penguin_mode`
  const headers: Record<string, string> =
    'accessToken' in auth
      ? {
          Authorization: `Bearer ${auth.accessToken}`,
          'anthropic-beta': OAUTH_BETA_HEADER,
        }
      : { 'x-api-key': auth.apiKey }

  const response = await axios.get<FastModeResponse>(endpoint, { headers })
  return response.data
}

const PREFETCH_MIN_INTERVAL_MS = 30_000
let lastPrefetchAt = 0
let inflightPrefetch: Promise<void> | null = null

/**
 * Resuelve orgStatus desde la caché persistida sin llamadas a la API. Se
 * usa cuando los prefetches de arranque están throttled, para que las
 * comprobaciones de disponibilidad de fast mode sigan funcionando sin
 * tocar la red.
 */
export function resolveFastModeStatusFromCache(): void {
  if (!isFastModeEnabled()) {
    return
  }
  if (orgStatus.status !== 'pending') {
    return
  }
  const isAnt = process.env.USER_TYPE === 'ant'
  const cachedEnabled = requireGlobalConfig().getGlobalConfig().penguinModeOrgEnabled === true
  orgStatus =
    isAnt || cachedEnabled
      ? { status: 'enabled' }
      : { status: 'disabled', reason: 'unknown' }
}

export async function prefetchFastModeStatus(): Promise<void> {
  if (isEssentialTrafficOnly()) {
    return
  }

  if (!isFastModeEnabled()) {
    return
  }

  if (inflightPrefetch) {
    logForDebugging(
      'Fast mode prefetch in progress, returning in-flight promise',
    )
    return inflightPrefetch
  }

  // Las sesiones OAuth de service key no tienen scope user:profile → el
  // endpoint devuelve 403. Se resuelve orgStatus desde caché y se sale
  // antes de quemar la ventana de throttle. La autenticación por API key
  // no se ve afectada.
  const apiKey = getAnthropicApiKey()
  const hasUsableOAuth =
    getClaudeAIOAuthTokens()?.accessToken && hasProfileScope()
  if (!hasUsableOAuth && !apiKey) {
    const isAnt = process.env.USER_TYPE === 'ant'
    const cachedEnabled = requireGlobalConfig().getGlobalConfig().penguinModeOrgEnabled === true
    orgStatus =
      isAnt || cachedEnabled
        ? { status: 'enabled' }
        : { status: 'disabled', reason: 'preference' }
    return
  }

  const now = Date.now()
  if (now - lastPrefetchAt < PREFETCH_MIN_INTERVAL_MS) {
    logForDebugging('Skipping fast mode prefetch, fetched recently')
    return
  }
  lastPrefetchAt = now

  const fetchWithCurrentAuth = async (): Promise<FastModeResponse> => {
    const currentTokens = getClaudeAIOAuthTokens()
    const auth =
      currentTokens?.accessToken && hasProfileScope()
        ? { accessToken: currentTokens.accessToken }
        : apiKey
          ? { apiKey }
          : null
    if (!auth) {
      throw new Error('No auth available')
    }
    return fetchFastModeStatus(auth)
  }

  async function doFetch(): Promise<void> {
    try {
      let status: FastModeResponse
      try {
        status = await fetchWithCurrentAuth()
      } catch (err) {
        const isAuthError =
          axios.isAxiosError(err) &&
          (err.response?.status === 401 ||
            (err.response?.status === 403 &&
              typeof err.response?.data === 'string' &&
              err.response.data.includes('OAuth token has been revoked')))
        if (isAuthError) {
          const failedAccessToken = getClaudeAIOAuthTokens()?.accessToken
          if (failedAccessToken) {
            await handleOAuth401Error(failedAccessToken)
            status = await fetchWithCurrentAuth()
          } else {
            throw err
          }
        } else {
          throw err
        }
      }

      const previousEnabled =
        orgStatus.status !== 'pending'
          ? orgStatus.status === 'enabled'
          : requireGlobalConfig().getGlobalConfig().penguinModeOrgEnabled
      orgStatus = status.enabled
        ? { status: 'enabled' }
        : {
            status: 'disabled',
            reason: status.disabled_reason ?? 'preference',
          }
      if (previousEnabled !== status.enabled) {
        if (!status.enabled) {
          updateSettingsForSource('userSettings', { fastMode: undefined })
        }
        requireGlobalConfig().saveGlobalConfig(current => ({
          ...current,
          penguinModeOrgEnabled: status.enabled,
        }))
        orgFastModeChange.emit(status.enabled)
      }
      logForDebugging(
        `Org fast mode: ${status.enabled ? 'enabled' : `disabled (${status.disabled_reason ?? 'preference'})`}`,
      )
    } catch (err) {
      // En fallo: los ants por defecto quedan habilitados (no bloquear
      // usuarios internos). Usuarios externos: caen al valor cacheado de
      // penguinModeOrgEnabled; sin caché positiva, deshabilita con razón
      // network_error.
      const isAnt = process.env.USER_TYPE === 'ant'
      const cachedEnabled = requireGlobalConfig().getGlobalConfig().penguinModeOrgEnabled === true
      orgStatus =
        isAnt || cachedEnabled
          ? { status: 'enabled' }
          : { status: 'disabled', reason: 'network_error' }
      logForDebugging(
        `Failed to fetch org fast mode status, defaulting to ${orgStatus.status === 'enabled' ? 'enabled (cached)' : 'disabled (network_error)'}: ${err}`,
        { level: 'error' },
      )
      logEvent('tengu_org_penguin_mode_fetch_failed', {})
    } finally {
      inflightPrefetch = null
    }
  }

  inflightPrefetch = doFetch()
  return inflightPrefetch
}
