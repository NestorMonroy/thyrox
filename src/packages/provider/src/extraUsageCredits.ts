/**
 * Créditos de uso en el mensaje `extra_usage_disabled` del modo rápido.
 *
 * Porte de `_6e`, `M5`, `hy`, `Ex`, `DC`, `c2o`, `Run`, `nqn` y `dKn`
 * (`chunk-t6pwageh.js`) de 2.1.283. Estas nueve funciones componen las dos
 * piezas que `Wg` (`extraUsageDisabledMessage`, ya portada en
 * `./fastModeAvailability.ts`) consume cuando la razón de que el modo
 * rápido esté apagado es `extra_usage_disabled`: el enlace de la orden de
 * barra (`_6e`) y, si esa orden no aplica, la instrucción para un admin
 * (`hy() && Ex() ? Run() : undefined`). Este módulo no vuelve a componer el
 * mensaje final — eso ya lo hace `Wg` — sólo resuelve esas dos piezas.
 *
 * Reusa `getOauthAccountInfo`, `getSubscriptionType` y `hasProfileScope`
 * (`Rn`, `nr`, `pt`) de `./authAlias.ts`, ya portadas en este paquete.
 *
 * NO portado — `Te`, `yu` y `Jx` (host interactivo, tipo de entorno propio
 * sin sub-sesión, bandera `claudecode`), que componen `hy`, viven en
 * `chunk-nvht7ckf.js`/`chunk-jwddn0q9.js` y leen estado del host
 * (`app-host`) que este paquete ya declara bloqueado en `fastMode.ts`
 * (mismo motivo: `State` no trae `isInteractive`/`clientType`). Llegan
 * como los tres campos de `ExtraUsageCreditsSessionContext`, cada uno
 * citando su símbolo de origen.
 */
import { getOauthAccountInfo, getSubscriptionType, hasProfileScope } from './authAlias.ts'
import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'

/** `FLt`: la url de reserva cuando no hay una acción de organización que ofrecer. */
const USAGE_SETTINGS_URL = 'claude.ai/settings/usage?from=cc_cli_limit_message'

/** La url directa del panel de administración de créditos de uso, citada en `Run`. */
const ADMIN_USAGE_SETTINGS_URL = 'claude.ai/admin-settings/usage'

/** `aE`: tipos de facturación con los que la propia cuenta puede activar los créditos de uso. */
const SELF_SERVICE_BILLING_TYPES: ReadonlySet<string> = new Set([
  'stripe_subscription',
  'stripe_subscription_contracted',
  'stripe_subscription_enterprise_self_serve',
  'aws_marketplace',
  'c4e_consumption_trial',
  'apple_subscription',
  'google_play_subscription',
])

/** Roles de organización con permiso para activar los créditos de uso, citados en `dKn`. */
const ORG_ROLES_THAT_CAN_ENABLE_USAGE_CREDITS: readonly string[] = ['admin', 'billing', 'owner', 'primary_owner']

/** El contexto que arma `hy`: los tres símbolos no portados, ya resueltos. */
export type ExtraUsageCreditsSessionContext = {
  /** `Te()`: el host de lanzamiento no es interactivo. */
  isNonInteractiveHost: boolean
  /** `yu()`: el tipo de entorno está en la lista propia y no es una sub-sesión (`childSession`). */
  isOwnSessionWithoutChild: boolean
  /** `Jx()`: la sesión corre bajo la bandera `claudecode` del host. */
  isHostSession: boolean
}

/** `dKn`: el rol de organización de la cuenta habilita activar los créditos de uso. */
export function isOrgAdminForUsageCredits(): boolean {
  const role = getOauthAccountInfo()?.organizationRole
  return !!role && ORG_ROLES_THAT_CAN_ENABLE_USAGE_CREDITS.includes(role)
}

/** `c2o`: la propia cuenta puede activar los créditos de uso, sin un admin. */
export function canSelfEnableUsageCredits(): boolean {
  const billingType = getOauthAccountInfo()?.billingType
  if (!hasProfileScope() || !billingType) return false
  return SELF_SERVICE_BILLING_TYPES.has(billingType)
}

/**
 * `DC`: bandera de override del servidor para el comando de créditos de
 * uso. Siempre `null` en este binario (2.1.283) — se porta fiel a la
 * referencia, sin fabricar una fuente que la fuente no trae.
 */
export function serverExtraUsageCommandOverride(): boolean | null {
  return null
}

/** `Ex`: si el comando de créditos de uso extra está disponible en esta sesión. */
export function isExtraUsageCommandAvailable(): boolean {
  if (isEnvTruthy(readEnv('THYROX_CODE_DISABLE_EXTRA_USAGE_COMMAND'))) return false
  if (serverExtraUsageCommandOverride() !== null) return true
  return canSelfEnableUsageCredits()
}

/** `hy`: el tipo de sesión no admite ofrecer la orden de barra `/usage-credits`. */
export function isSlashCommandUnavailable(context: ExtraUsageCreditsSessionContext): boolean {
  return context.isNonInteractiveHost && context.isOwnSessionWithoutChild && !context.isHostSession
}

/** `M5`: la ruta de una orden de barra, o `undefined` si esta sesión no puede ofrecerla. */
export function usageCreditsCommandPath(commandId: string, context: ExtraUsageCreditsSessionContext): string | undefined {
  return isSlashCommandUnavailable(context) ? undefined : `/${commandId}`
}

/** `_6e`: el enlace a la orden de barra que activa los créditos de uso, si existe. */
export function usageCreditsLink(context: ExtraUsageCreditsSessionContext): string | undefined {
  return isExtraUsageCommandAvailable() ? usageCreditsCommandPath('usage-credits', context) : undefined
}

/**
 * `nqn`: la acción que el servidor ofrece para una cuenta `team`/`enterprise`.
 * Siempre `null` en este binario — mismo motivo que `serverExtraUsageCommandOverride`.
 */
export function serverUsageCreditsAdminAction(): string | null {
  return null
}

/** `Run`: la instrucción para activar los créditos de uso cuando no hay orden de barra. */
export function usageCreditsAdminInstruction(context: ExtraUsageCreditsSessionContext): string {
  const subscriptionType = getSubscriptionType()
  if (isSlashCommandUnavailable(context) && (subscriptionType === 'team' || subscriptionType === 'enterprise')) {
    const serverAction = serverUsageCreditsAdminAction()
    if (serverAction !== null) return serverAction
    return hasProfileScope() && isOrgAdminForUsageCredits()
      ? `turn on usage credits at ${ADMIN_USAGE_SETTINGS_URL}`
      : 'ask your admin to turn on usage credits'
  }
  return `turn on usage credits at ${USAGE_SETTINGS_URL}`
}

/** `hy() && Ex() ? Run() : undefined`: la instrucción para un admin, sólo cuando aplica. */
export function usageCreditsInstruction(context: ExtraUsageCreditsSessionContext): string | undefined {
  return isSlashCommandUnavailable(context) && isExtraUsageCommandAvailable()
    ? usageCreditsAdminInstruction(context)
    : undefined
}
