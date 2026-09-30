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
 *
 * R-2b-5 (2.1.283, `chunk-t6pwageh.js`): ciclo de vida de `orgStatus` —
 * `Vg` (`replaceOrgStatus`, `updateOrgStatus`/`zl`, el aviso de créditos
 * agotados una vez por turno), `$Oo`/`handleFastModeRejectedByAPI` con su
 * guarda de origen (`isDurablyDisabledByServer`, de `Udn`+`Yg`), `source:
 * 'server'` en la lectura del endpoint y su normalización de razón (`dC`), y
 * `lC`/`getOverageDisabledMessage` con su nueva redacción y `org_spend_cap_
 * reached`. Corrige de paso una divergencia stale del párrafo de arriba:
 * `@thyrox/config` SÍ exporta `getGlobalConfig`/`saveGlobalConfig` hoy
 * (medido: `global/config.ts` los declara y el barril los re-exporta) — pero
 * `penguinModeOrgEnabled` no tiene sitio en su `GlobalConfig` (medido: 0
 * hits de `penguin` en `src/packages/config/`), así que `requireGlobalConfig`
 * sigue siendo un `require()` diferido con un tipo local mínimo para ESE
 * campo, no porque el paquete falte sino porque el campo no tiene tipo
 * anfitrión sin tocar `@thyrox/config` (fuera de mis archivos en este pase).
 * NO portado en este pase: `Ga`/`ar()` (la cola de notificaciones del
 * transcript, keyed por host, clase `Gg` en el mismo chunk) — declarado en
 * `handleFastModeOverageRejection`, no en este encabezado, junto a la
 * función que la necesitaría.
 */
import axios from 'axios'
import { getOauthConfig, OAUTH_BETA_HEADER } from './oauthConstants.ts'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import {
  getAnthropicApiKey,
  getClaudeAIOAuthTokens,
  handleOAuth401Error,
  hasProfileScope,
} from './authAlias.ts'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { readEnv } from '@thyrox/config/env/utils'
import {
  getDefaultMainLoopModelSetting,
  getMainLoopModel,
  isOpus1mMergeEnabled,
  type ModelSetting,
  parseUserSpecifiedModel,
} from './model.ts'
import { getAPIProvider } from './providers.ts'
import { modelHasCapability } from '@thyrox/agent/modelCapabilities'
import { canonicalModelName, MODELS } from '@thyrox/agent/models'
import {
  isCoworkEntrypoint,
  isInsideAgentShell,
  isTopLevelDesktopSession,
  isTruthyFlag,
  processEntrypointContext,
} from '@thyrox/config/entrypoint'
import { type ExtraUsageCreditsSessionContext, usageCreditsInstruction, usageCreditsLink } from './extraUsageCredits.ts'
import { hasRemoteSessionWorkerClaims } from './remoteSessionClaims.ts'
import {
  extraUsageDisabledMessage,
  fastModeUnavailableMessage,
  isFastModeAvailableFor,
  type FastModeAvailabilityContext,
  type FastModeAvailabilityOptions,
  type FastModeOrgStatusSnapshot,
} from './fastModeAvailability.ts'
import { isModelAllowed } from './model/modelAllowlist.ts'
import {
  fastModePreferenceEnabled,
  shouldShowFastModeIndicator,
  type FastModeSelectionContext,
} from './fastModeSelection.ts'
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

// El almacén de capacidades de superficie (`ve`) vive en app-host, que ya
// depende de provider: se lee con un `require()` diferido para no cerrar un
// ciclo estático.
type SurfaceCapabilities = {
  isRemoteSurface: () => boolean
  hasRemoteControlChannel: () => boolean
}
function requireSurfaceCapabilities(): SurfaceCapabilities {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/state/surfaceCapabilities.js') as SurfaceCapabilities
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

/**
 * `mo`: sólo con el API de primera parte, y cualquier valor de
 * `THYROX_CODE_DISABLE_FAST_MODE` lo apaga, "0" incluido.
 */
export function isFastModeEnabled(): boolean {
  if (getAPIProvider() !== 'firstParty') return false
  return !readEnv('THYROX_CODE_DISABLE_FAST_MODE')
}

export function isFastModeAvailable(): boolean {
  if (!isFastModeEnabled()) {
    return false
  }
  return getFastModeUnavailableReason() === null
}

/**
 * `D5`: el motivo, redactado, de que el modo rápido no esté disponible para
 * `model` (el del bucle si falta), o `null`.
 */
export function getFastModeUnavailableReason(
  model?: ModelSetting,
  options: FastModeAvailabilityOptions = {},
): string | null {
  return fastModeUnavailableMessage(model, options, processFastModeAvailabilityContext(), logForDebugging)
}

/** `uc() && Iz()`: una sesión remota de cowork, fuera de un puente. */
function isRemoteCoworkSession(): boolean {
  return isTruthyFlag(readEnv('THYROX_CODE_REMOTE')) && readEnv('THYROX_CODE_ENVIRONMENT_KIND') === undefined && isCoworkEntrypoint()
}

/** `K$`: el nombre visible del modelo del modo rápido, leído del catálogo. */
export function getFastModeModelDisplay(): string {
  const model = parseUserSpecifiedModel('opus')
  return MODELS[canonicalModelName(model)]?.display_name ?? 'Opus'
}

/** El contexto de `gL` leído del proceso. */
export function processFastModeAvailabilityContext(): FastModeAvailabilityContext {
  const policy = getSettingsForSource('policySettings')
  // `hy`: `Te`, `yu` y `Jx` del proceso.
  const credits: ExtraUsageCreditsSessionContext = {
    isNonInteractiveHost: processEntrypointContext.isNonInteractive(),
    isOwnSessionWithoutChild: isTopLevelDesktopSession(),
    isHostSession: isInsideAgentShell(),
  }
  return {
    apiProvider: getAPIProvider(),
    fastModeEnabled: isFastModeEnabled(),
    penguinsOffMessage: getFeatureValue_CACHED_MAY_BE_STALE<string | null>('tengu_penguins_off', null),
    isModelAllowed,
    fastModeModel: 'opus' + (isOpus1mMergeEnabled() ? '[1m]' : ''),
    resolveModel: model => (model !== undefined ? String(model ?? getDefaultMainLoopModelSetting()) : getMainLoopModel()),
    hasRemoteControlChannel: requireSurfaceCapabilities().hasRemoteControlChannel(),
    supportsFastMode: isFastModeSupportedByModel,
    flagSettingsFastMode: getSettingsForSource('flagSettings')?.fastMode,
    policyFastMode: policy?.fastMode,
    policyPerSessionOptIn: policy?.fastModePerSessionOptIn,
    sdkOptInRequired: requireAppHostBootstrapState().preferThirdPartyAuthentication(),
    orgStatus,
    skipOrgCheckEnv: Boolean(readEnv('THYROX_CODE_SKIP_FAST_MODE_ORG_CHECK')),
    skipNetworkErrorsEnv: Boolean(readEnv('THYROX_CODE_SKIP_FAST_MODE_NETWORK_ERRORS')),
    // `rn`: `uc() && Iz() || eo()`.
    remoteManaged: isRemoteCoworkSession() || hasRemoteSessionWorkerClaims(),
    authType: getClaudeAIOAuthTokens() !== null ? 'oauth' : 'api-key',
    fastModeModelDisplay: getFastModeModelDisplay(),
    usageCreditsLink: usageCreditsLink(credits),
    usageCreditsInstruction: usageCreditsInstruction(credits),
  }
}

/** El contexto de `Ndn`/`oA` leído del proceso: `Dt`, `Yl` y `Bk` sobre `processFastModeAvailabilityContext()`. */
export function processFastModeSelectionContext(): FastModeSelectionContext {
  const settings = getInitialSettings()
  return {
    fastModeEnabled: isFastModeEnabled(),
    remoteSurface: requireSurfaceCapabilities().isRemoteSurface(),
    supportsFastMode: isFastModeSupportedByModel,
    isAvailableFor: model => isFastModeAvailableFor(model, processFastModeAvailabilityContext()),
    preferenceEnabled: fastModePreferenceEnabled(
      settings,
      getSettingsForSource('policySettings') ?? undefined,
      getSettingsForSource('flagSettings') ?? undefined,
    ),
  }
}

/** `iLr` sobre el contexto leído del proceso. */
export function shouldShowFastModeIndicatorForProcess(fastMode: boolean | undefined, pendingIndicator: boolean): boolean {
  return shouldShowFastModeIndicator(fastMode, pendingIndicator, processFastModeSelectionContext())
}

// Constante para callers que resuelven el nombre a la carga del módulo. El
// nombre visible sale del catálogo (`getFastModeModelDisplay`); 2.1.283 ya
// no trae la anulación a Opus 4.6, así que no hay variable de entorno que
// leer después de la carga.
export const FAST_MODE_MODEL_DISPLAY = getFastModeModelDisplay()

/** `Rte`: 'opus', con el sufijo `[1m]` cuando aplica la fusión de contexto de 1M. */
export function getFastModeModel(): string {
  return 'opus' + (isOpus1mMergeEnabled() ? '[1m]' : '')
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

/**
 * `qy`: primero la capacidad `fast_mode` (entorno, consulta servida,
 * catálogo); si ninguna fuente la afirma ni la niega, el nombre decide.
 */
export function isFastModeSupportedByModel(
  modelSetting: ModelSetting,
): boolean {
  if (!isFastModeEnabled()) {
    return false
  }
  const model = modelSetting ?? getDefaultMainLoopModelSetting()
  const parsedModel = parseUserSpecifiedModel(model)
  const declared = modelHasCapability(canonicalModelName(parsedModel), 'fast_mode', parsedModel)
  if (declared !== undefined) return declared
  const normalized = parsedModel.toLowerCase()
  return normalized.includes('opus-4-8') || normalized.includes('opus-5')
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
      reason as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
  cooldownTriggered.emit(resetTimestamp, reason)
}

export function clearFastModeCooldown(): void {
  runtimeState = { status: 'active' }
}

/**
 * `$Oo`: se llama cuando la API rechaza una petición de fast mode (p. ej.
 * 400 "Fast mode is not enabled for your organization"). Su guarda de
 * origen es asimétrica con la de `handleFastModeOverageRejection` — no
 * cualquier `'disabled'` la detiene, sólo uno que YA vino del servidor por
 * una razón que un reintento no corrige; una adivinanza de caché, o un
 * `'network_error'`/`'unknown'` transitorio, sí se pisan aquí.
 */
export function handleFastModeRejectedByAPI(): void {
  if (isDurablyDisabledByServer()) {
    return
  }
  replaceOrgStatus({ status: 'disabled', reason: 'preference', source: 'server' })
  updateSettingsForSource('userSettings', { fastMode: undefined })
  requireGlobalConfig().saveGlobalConfig(current =>
    current.penguinModeOrgEnabled === false ? current : { ...current, penguinModeOrgEnabled: false },
  )
  orgFastModeChange.emit(false)
}

// --- Listeners de rechazo por overage ---
// Se disparan cuando un 429 indica que fast mode fue rechazado porque los
// créditos de uso no están disponibles. Distinto del deshabilitado a nivel
// de organización.
const overageRejection = createSignal<[message: string]>()
export const onFastModeOverageRejection = overageRejection.subscribe

/** `lC`: el mensaje por razón; las dos de aprovisionamiento reusan `Wg` (`extraUsageDisabledMessage`). */
function getOverageDisabledMessage(reason: string | null): string {
  switch (reason) {
    case 'out_of_credits':
      return 'Fast mode disabled · usage credits exhausted'
    case 'org_level_disabled':
    case 'org_service_level_disabled':
      return 'Fast mode disabled · usage credits turned off by your organization'
    case 'org_level_disabled_until':
    case 'org_spend_cap_reached':
      return 'Fast mode disabled · usage credit limit reached'
    case 'member_level_disabled':
      return 'Fast mode disabled · usage credits turned off for your account'
    case 'seat_tier_level_disabled':
    case 'seat_tier_zero_credit_limit':
    case 'member_zero_credit_limit':
      return 'Fast mode disabled · usage credits not available for your plan'
    case 'overage_not_provisioned':
    case 'no_limits_configured':
      return extraUsageDisabledMessage(processFastModeAvailabilityContext())
    default:
      return 'Fast mode disabled · usage credits not available'
  }
}

/** `$dn`: las tres razones que significan "sin crédito", no "sin permiso". */
function isOutOfCreditsReason(reason: string | null): boolean {
  return reason === 'org_level_disabled_until' || reason === 'org_spend_cap_reached' || reason === 'out_of_credits'
}

/**
 * `UOo`: se llama cuando un 429 indica que fast mode fue rechazado porque
 * el overage no está disponible. Sin crédito (`isOutOfCreditsReason`) NO
 * deshabilita fast mode —puede volver en cuanto haya crédito— y sólo
 * notifica, una vez por turno (`claimCreditsExhaustedNotice`); cualquier
 * otra razón sí lo deshabilita de forma durable (`source: 'server'`).
 *
 * NO PORTADO: el aviso inmediato al transcript (`Ga`/`ar()`, la cola `Gg`
 * propia del host en `chunk-t6pwageh.js`, keyed por host) — ningún
 * consumidor de este árbol la tiene portada. `onFastModeOverageRejection`
 * sigue siendo el canal para quien quiera mostrarlo.
 */
export function handleFastModeOverageRejection(reason: string | null): void {
  const message = getOverageDisabledMessage(reason)
  logForDebugging(
    `Fast mode overage rejection: ${reason ?? 'unknown'} — ${message}`,
  )
  logEvent('tengu_fast_mode_overage_rejected', {
    overage_disabled_reason: (reason ??
      'unknown') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
  if (isOutOfCreditsReason(reason)) {
    if (!claimCreditsExhaustedNotice()) {
      logForDebugging('Fast mode credits rejection already surfaced this turn, suppressing repeat')
      return
    }
  } else {
    updateSettingsForSource('userSettings', { fastMode: undefined })
    requireGlobalConfig().saveGlobalConfig(current => ({
      ...current,
      penguinModeOrgEnabled: false,
    }))
    replaceOrgStatus({ status: 'disabled', reason: 'extra_usage_disabled', source: 'server' })
    orgFastModeChange.emit(false)
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
export type FastModeOrgStatus = FastModeOrgStatusSnapshot

let orgStatus: FastModeOrgStatus = { status: 'pending' }

// Listeners notificados cuando el estado de fast mode a nivel de org cambia
const orgFastModeChange = createSignal<[orgEnabled: boolean]>()
export const onOrgFastModeChanged = orgFastModeChange.subscribe

/**
 * `Vg.replaceOrgStatus`: sustituye `orgStatus` y devuelve el valor anterior,
 * para que quien llama pueda comparar antes/después sin leer dos veces.
 */
function replaceOrgStatus(next: FastModeOrgStatus): FastModeOrgStatus {
  const previous = orgStatus
  orgStatus = next
  return previous
}

/** `Yg`: las dos razones que un reintento puede corregir por sí solo. */
function isTransientDisabledReason(reason: FastModeDisabledReason): boolean {
  return reason === 'network_error' || reason === 'unknown'
}

/**
 * `Udn` + `Yg`: el estado actual lo fijó una respuesta real del servidor por
 * una razón que un reintento no corrige — no lo pisa una adivinanza de
 * caché ni un error de red transitorio.
 */
function isDurablyDisabledByServer(): boolean {
  return orgStatus.status === 'disabled' && orgStatus.source === 'server' && !isTransientDisabledReason(orgStatus.reason)
}

/**
 * `dC`: normaliza la razón que trae la respuesta del servidor contra el
 * conjunto conocido; ausente cae a `'preference'`, cualquier otra cosa a
 * `'unknown'` — nunca se propaga un string no declarado.
 */
const KNOWN_FAST_MODE_DISABLED_REASONS = new Set<FastModeDisabledReason>([
  'free',
  'preference',
  'extra_usage_disabled',
  'network_error',
  'unknown',
])
function normalizeFastModeDisabledReason(reason: string | null | undefined): FastModeDisabledReason {
  if (reason !== null && reason !== undefined && KNOWN_FAST_MODE_DISABLED_REASONS.has(reason as FastModeDisabledReason)) {
    return reason as FastModeDisabledReason
  }
  return reason === null || reason === undefined ? 'preference' : 'unknown'
}

/**
 * `zl`: reemplaza `orgStatus` y, sólo si el nuevo valor deja de ser
 * `'pending'`, decide si el cambio es observable — de habilitado a
 * deshabilitado o viceversa, o la razón del deshabilitado cambió — y sólo
 * entonces emite `orgFastModeChange`. Un `'pending'` nunca emite: todavía no
 * hay nada que anunciar.
 */
function updateOrgStatus(next: FastModeOrgStatus): void {
  const previous = replaceOrgStatus(next)
  if (next.status === 'pending') return
  const wasEnabled =
    previous.status !== 'pending'
      ? previous.status === 'enabled'
      : requireGlobalConfig().getGlobalConfig().penguinModeOrgEnabled === true
  const isEnabled = next.status === 'enabled'
  const reasonChanged = previous.status === 'disabled' && next.status === 'disabled' && previous.reason !== next.reason
  if (wasEnabled !== isEnabled || reasonChanged) {
    orgFastModeChange.emit(isEnabled)
  }
}

// --- Aviso de créditos agotados, una vez por turno ---
// `Vg.creditsExhaustedNotifiedThisTurn`: sin este guardado, cada llamada
// consecutiva a `handleFastModeOverageRejection` con la misma razón (p. ej.
// un reintento inmediato) volvería a anunciar el mismo aviso.
let creditsExhaustedNotifiedThisTurn = false

/** `Vg.claimCreditsExhaustedNotice`: primera vez este turno → `true` y se marca; repetida → `false`. */
function claimCreditsExhaustedNotice(): boolean {
  if (creditsExhaustedNotifiedThisTurn) return false
  creditsExhaustedNotifiedThisTurn = true
  return true
}

/** `Fdn`: rearma el aviso — lo invoca el límite de turno, que no vive en este pase. */
export function rearmFastModeCreditsExhaustedNotice(): void {
  creditsExhaustedNotifiedThisTurn = false
}

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
 * `lLr`: resuelve `orgStatus` desde la caché persistida sin llamadas a la
 * API. Se usa cuando los prefetches de arranque están throttled, para que
 * las comprobaciones de disponibilidad de fast mode sigan funcionando sin
 * tocar la red. 2.1.283 ya no trae la salida directa por `USER_TYPE ===
 * 'ant'` que esta función tenía antes (medido: `USER_TYPE` no aparece en
 * `chunk-t6pwageh.js`) — se retira aquí también.
 */
export function resolveFastModeStatusFromCache(): void {
  if (!isFastModeEnabled()) {
    return
  }
  if (orgStatus.status !== 'pending') {
    return
  }
  const cachedEnabled = requireGlobalConfig().getGlobalConfig().penguinModeOrgEnabled === true
  replaceOrgStatus(cachedEnabled ? { status: 'enabled' } : { status: 'disabled', reason: 'unknown' })
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

      const wasEnabled =
        orgStatus.status !== 'pending'
          ? orgStatus.status === 'enabled'
          : requireGlobalConfig().getGlobalConfig().penguinModeOrgEnabled === true
      updateOrgStatus(
        status.enabled
          ? { status: 'enabled' }
          : { status: 'disabled', reason: normalizeFastModeDisabledReason(status.disabled_reason), source: 'server' },
      )
      if (wasEnabled !== status.enabled) {
        if (!status.enabled) {
          updateSettingsForSource('userSettings', { fastMode: undefined })
        }
        requireGlobalConfig().saveGlobalConfig(current => ({
          ...current,
          penguinModeOrgEnabled: status.enabled,
        }))
      }
      logForDebugging(
        `Org fast mode: ${status.enabled ? 'enabled' : `disabled (${status.disabled_reason ?? 'preference'})`}`,
      )
    } catch (err) {
      // Una respuesta real del servidor por una razón durable no se pisa
      // con la adivinanza de un error de red (`isDurablyDisabledByServer`,
      // el mismo guardado de `handleFastModeRejectedByAPI`); si no hay tal
      // respuesta, cae al valor cacheado de `penguinModeOrgEnabled`, y sin
      // caché positiva deshabilita con razón `network_error`.
      if (!isDurablyDisabledByServer()) {
        const cachedEnabled = requireGlobalConfig().getGlobalConfig().penguinModeOrgEnabled === true
        updateOrgStatus(cachedEnabled ? { status: 'enabled' } : { status: 'disabled', reason: 'network_error' })
      }
      logForDebugging(
        `Failed to fetch org fast mode status, standing on ${orgStatus.status === 'enabled' ? 'enabled (cached)' : `disabled (${orgStatus.status === 'disabled' ? orgStatus.reason : 'unknown'})`}: ${err}`,
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

/**
 * `Vg.reset`, sólo la porción de estado de este pase (org status, aviso de
 * créditos, ventana de prefetch) — sin tocar `runtimeState`/
 * `hasLoggedCooldownExpiry`, que no son de este ítem. Sólo para pruebas: el
 * store es module-level y sobrevive entre `test()` del mismo proceso.
 */
export function _resetFastModeOrgStatusForTesting(): void {
  orgStatus = { status: 'pending' }
  creditsExhaustedNotifiedThisTurn = false
  lastPrefetchAt = 0
  inflightPrefetch = null
}

/** Setter directo, sólo para pruebas — sembrar un `orgStatus` concreto sin pasar por el ciclo público. */
export function _setFastModeOrgStatusForTesting(status: FastModeOrgStatus): void {
  orgStatus = status
}
