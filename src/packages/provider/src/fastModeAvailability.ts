/**
 * Por qué el modo rápido no está disponible, sobre un contexto explícito:
 * las causas en el orden en que la referencia las comprueba, y su
 * redacción para el usuario.
 *
 * Porte de `gL`, `aC`, `$g`, `Wg`, `D5` y `Bk` (`chunk-t6pwageh.js`) de
 * 2.1.283. El contexto reúne lo que esas funciones leen del proceso —el
 * proveedor, la bandera de apagado, la lista de modelos permitidos, las
 * preferencias por origen, el estado de la organización—; quien lo arma a
 * partir del proceso es otra pieza.
 */
import type { FastModeDisabledReason } from './fastMode.ts'
import type { ModelSetting } from './model.ts'

/** Lo que devuelve `gL`: una causa propia o la razón del servidor. */
export type FastModeUnavailabilityCause =
  | 'not_first_party'
  | 'disabled_by_env'
  | 'model_not_allowed'
  | 'sdk_opt_in_required'
  | 'pending'
  | FastModeDisabledReason

/** El estado de la organización; `source: 'server'` si lo dijo el servidor y no la caché. */
export type FastModeOrgStatusSnapshot =
  | { status: 'pending' }
  | { status: 'enabled' }
  | { status: 'disabled'; reason: FastModeDisabledReason; source?: 'server' }

export type FastModeAuthType = 'oauth' | 'api-key'

export type FastModeAvailabilityContext = {
  apiProvider: string
  /** `mo`. */
  fastModeEnabled: boolean
  /** La bandera `tengu_penguins_off`: su texto, o `null` si no está puesta. */
  penguinsOffMessage: string | null
  /** `Vr`. */
  isModelAllowed: (model: string) => boolean
  /** `Rte`. */
  fastModeModel: string
  /** El modelo a juzgar: el pedido, el de la configuración si es `null`, el del bucle si falta. */
  resolveModel: (model: ModelSetting | undefined) => string
  /** `Ea`. */
  hasRemoteControlChannel: boolean
  /** `qy`. */
  supportsFastMode: (model: string) => boolean
  flagSettingsFastMode: boolean | undefined
  policyFastMode: boolean | undefined
  policyPerSessionOptIn: boolean | undefined
  /** `Te() && ijt()`: una sesión no interactiva fuera de la extensión de VS Code. */
  sdkOptInRequired: boolean
  orgStatus: FastModeOrgStatusSnapshot
  /** `THYROX_CODE_SKIP_FAST_MODE_ORG_CHECK`, sin más condición. */
  skipOrgCheckEnv: boolean
  /** `THYROX_CODE_SKIP_FAST_MODE_NETWORK_ERRORS`. */
  skipNetworkErrorsEnv: boolean
  /** `rn`: la sesión la gestiona un entorno remoto. */
  remoteManaged: boolean
  authType: FastModeAuthType
  /** `K$`. */
  fastModeModelDisplay: string
  /** `_6e`: la acción para activar los créditos de uso, si existe. */
  usageCreditsLink: string | undefined
  /** `hy() && Ex() ? Run() : undefined`. */
  usageCreditsInstruction: string | undefined
}

export type FastModeAvailabilityOptions = { sessionOptIn?: boolean; sessionOnly?: boolean }

/** `Yg`. */
function isTransientDisabledReason(reason: FastModeDisabledReason): boolean {
  return reason === 'network_error' || reason === 'unknown'
}

/** `Yi`: saltar la comprobación de la organización no vale en una sesión gestionada. */
function skipsOrgCheck(context: FastModeAvailabilityContext): boolean {
  return context.skipOrgCheckEnv && !context.remoteManaged
}

/** `gL`. */
export function fastModeUnavailabilityCause(
  model: ModelSetting | undefined,
  { sessionOptIn = false, sessionOnly = false }: FastModeAvailabilityOptions,
  context: FastModeAvailabilityContext,
): FastModeUnavailabilityCause | null {
  if (!context.fastModeEnabled) return context.apiProvider !== 'firstParty' ? 'not_first_party' : 'disabled_by_env'
  if (context.penguinsOffMessage !== null) return 'unknown'
  if (!context.isModelAllowed(context.fastModeModel)) {
    const candidate = context.resolveModel(model)
    const usable = !context.hasRemoteControlChannel && context.supportsFastMode(candidate) && context.isModelAllowed(candidate)
    if (!usable) return 'model_not_allowed'
  }
  const optedIn = sessionOptIn || context.flagSettingsFastMode === true
  if (context.policyFastMode === false) return 'preference'
  if ((sessionOptIn || sessionOnly) && context.policyPerSessionOptIn === true) return 'preference'
  if (context.sdkOptInRequired && !optedIn) return 'sdk_opt_in_required'
  const optedInLocally = optedIn && !context.remoteManaged
  const org = context.orgStatus
  if (org.status === 'pending' && !skipsOrgCheck(context) && !optedInLocally) return 'pending'
  if (org.status === 'disabled' && (!skipsOrgCheck(context) || org.source === 'server')) {
    const toleratesTransient = (context.skipNetworkErrorsEnv && !context.remoteManaged) || optedInLocally
    if (isTransientDisabledReason(org.reason) && toleratesTransient) return null
    return org.reason
  }
  return null
}

/** `Wg`. */
export function extraUsageDisabledMessage(context: FastModeAvailabilityContext): string {
  const base = 'Fast mode requires usage credits'
  if (context.usageCreditsLink) return `${base} · ${context.usageCreditsLink} to turn them on`
  return context.usageCreditsInstruction ? `${base} · ${context.usageCreditsInstruction}` : base
}

/** `$g`. */
export function describeFastModeDisabledReason(
  reason: FastModeDisabledReason,
  authType: FastModeAuthType,
  context: FastModeAvailabilityContext,
): string {
  switch (reason) {
    case 'free':
      return authType === 'oauth'
        ? 'Fast mode requires a paid subscription'
        : 'Fast mode unavailable during evaluation. Please purchase credits.'
    case 'preference':
      return 'Fast mode has been disabled by your organization'
    case 'extra_usage_disabled':
      return extraUsageDisabledMessage(context)
    case 'network_error':
      return 'Fast mode unavailable due to network connectivity issues'
    case 'unknown':
      return 'Fast mode is currently unavailable'
  }
}

/** `aC`. */
export function describeFastModeUnavailability(cause: FastModeUnavailabilityCause, context: FastModeAvailabilityContext): string {
  switch (cause) {
    case 'not_first_party':
      return 'Fast mode is only available when using the Anthropic API directly'
    case 'disabled_by_env':
      return 'Fast mode is not available'
    case 'model_not_allowed':
      return `${context.fastModeModelDisplay} is not in your organization's allowed models`
    case 'sdk_opt_in_required':
      return 'Fast mode is not available in the Agent SDK'
    case 'pending':
      return 'Checking fast mode availability'
    case 'unknown':
      return context.penguinsOffMessage ?? describeFastModeDisabledReason('unknown', 'oauth', context)
    default:
      return describeFastModeDisabledReason(cause, context.authType, context)
  }
}

/** `D5`. */
export function fastModeUnavailableMessage(
  model: ModelSetting | undefined,
  options: FastModeAvailabilityOptions,
  context: FastModeAvailabilityContext,
  logDebug: (line: string) => void,
): string | null {
  const cause = fastModeUnavailabilityCause(model, options, context)
  if (cause === null) return null
  const message = describeFastModeUnavailability(cause, context)
  logDebug(`Fast mode unavailable: ${message}`)
  return message
}

/** `Bk`. */
export function isFastModeAvailableFor(model: ModelSetting | undefined, context: FastModeAvailabilityContext): boolean {
  if (!context.fastModeEnabled) return false
  return fastModeUnavailabilityCause(model, {}, context) === null
}
