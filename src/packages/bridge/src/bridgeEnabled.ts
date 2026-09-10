/**
 * Puerto fiel de `ccnmt: packages/bridge/src/bridgeEnabled.ts`.
 * `feature`/`checkGate_CACHED_OR_BLOCKING`/
 * `getDynamicConfig_CACHED_MAY_BE_STALE`/
 * `getFeatureValue_CACHED_MAY_BE_STALE`/`isEnvTruthy`/`lt`/
 * `isClaudeAISubscriber`/`hasProfileScope`/`getOauthAccountInfo`/
 * `getMacroVersion` son sustitutos — ver
 * `internal/pendingCrossPackageDeps.ts`.
 */
import {
  checkGate_CACHED_OR_BLOCKING,
  feature,
  getDynamicConfig_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
  getMacroVersion,
  getOauthAccountInfo,
  hasProfileScope,
  isClaudeAISubscriber as authIsClaudeAISubscriber,
  isEnvTruthy,
  lt,
} from './internal/pendingCrossPackageDeps.js'

/**
 * Chequeo en runtime del entitlement de modo bridge.
 *
 * Remote Control requiere una suscripción claude.ai (el bridge se
 * autentica contra CCR con el token OAuth de claude.ai).
 * isClaudeAISubscriber() excluye Bedrock/Vertex/Foundry, despliegues
 * apiKeyHelper/gateway, API keys por env var, y logins Console API —
 * ninguno de los cuales tiene el token OAuth que CCR necesita. Ver
 * github.com/deshaw/anthropic-issues/issues/24.
 *
 * El guard `feature('BRIDGE_MODE')` asegura que el literal de string de
 * GrowthBook sólo se referencia cuando el modo bridge está habilitado en
 * tiempo de build.
 */
export function isBridgeEnabled(): boolean {
  // Patrón de ternario positivo — ver docs/feature-gating.md.
  // El patrón negativo (if (!feature(...)) return) no elimina los
  // literales de string inline de los builds externos.
  return feature('BRIDGE_MODE')
    ? isClaudeAISubscriber() &&
        getFeatureValue_CACHED_MAY_BE_STALE('tengu_ccr_bridge', false)
    : false
}

/**
 * Chequeo bloqueante de entitlement para Remote Control.
 *
 * Devuelve `true` en caché de inmediato (camino rápido). Si la caché en
 * disco dice `false` o falta, espera el init de GrowthBook y obtiene el
 * valor fresco del servidor (camino lento, máx ~5s), y luego lo escribe
 * a disco.
 *
 * Usar en gates de entitlement donde un `false` obsoleto bloquearía el
 * acceso injustamente. Para caminos de error de cara al usuario, preferir
 * `getBridgeDisabledReason()`, que da un diagnóstico específico. Para
 * chequeos de visibilidad de UI en el cuerpo del render, usar
 * `isBridgeEnabled()` en su lugar.
 */
export async function isBridgeEnabledBlocking(): Promise<boolean> {
  return feature('BRIDGE_MODE')
    ? isClaudeAISubscriber() &&
        (await checkGate_CACHED_OR_BLOCKING('tengu_ccr_bridge'))
    : false
}

/**
 * Mensaje de diagnóstico de por qué Remote Control no está disponible, o
 * null si está habilitado. Llamar a esto en vez de un
 * `isBridgeEnabledBlocking()` a secas cuando hace falta mostrarle al
 * usuario un error accionable.
 *
 * El gate de GrowthBook apunta a organizationUUID, que viene de
 * config.oauthAccount — poblado por /api/oauth/profile durante el login.
 * Ese endpoint requiere el scope user:profile. Los tokens sin él
 * (setup-token, la env var CLAUDE_CODE_OAUTH_TOKEN, o logins previos a la
 * expansión de scope) dejan oauthAccount sin poblar, así que el gate cae
 * a false y los usuarios ven un mensaje "no habilitado" sin salida, sin
 * pista de que un re-login lo arreglaría. Ver CC-1165 / gh-33105.
 */
export async function getBridgeDisabledReason(): Promise<string | null> {
  if (feature('BRIDGE_MODE')) {
    if (!isClaudeAISubscriber()) {
      return 'Remote Control requires a claude.ai subscription. Run `claude auth login` to sign in with your claude.ai account.'
    }
    if (!hasProfileScopeSafe()) {
      return 'Remote Control requires a full-scope login token. Long-lived tokens (from `claude setup-token` or CLAUDE_CODE_OAUTH_TOKEN) are limited to inference-only for security reasons. Run `claude auth login` to use Remote Control.'
    }
    if (!getOauthAccountInfoSafe()?.organizationUuid) {
      return 'Unable to determine your organization for Remote Control eligibility. Run `claude auth login` to refresh your account information.'
    }
    if (!(await checkGate_CACHED_OR_BLOCKING('tengu_ccr_bridge'))) {
      return 'Remote Control is not yet enabled for your account.'
    }
    return null
  }
  return 'Remote Control is not available in this build.'
}

// try/catch: main.tsx:5698 llama isBridgeEnabled() mientras se define el
// programa de Commander, antes de que corra enableConfigs().
// isClaudeAISubscriber() → getGlobalConfig() lanza "Config accessed
// before allowed" ahí. Antes de la config, no puede existir ningún token
// OAuth de todos modos — false es correcto. El mismo swallow que ya hace
// getFeatureValue_CACHED_MAY_BE_STALE en growthbook.ts:775-780.
function isClaudeAISubscriber(): boolean {
  try {
    return authIsClaudeAISubscriber()
  } catch {
    return false
  }
}
function hasProfileScopeSafe(): boolean {
  try {
    return hasProfileScope()
  } catch {
    return false
  }
}
function getOauthAccountInfoSafe(): ReturnType<typeof getOauthAccountInfo> {
  try {
    return getOauthAccountInfo()
  } catch {
    return undefined
  }
}

/**
 * Chequeo en runtime del camino de bridge del REPL env-less (v2).
 * Devuelve true cuando la bandera de GrowthBook `tengu_bridge_repl_v2`
 * está habilitada.
 *
 * Esto gatea qué implementación usa initReplBridge — NO si el bridge
 * está disponible en absoluto (ver isBridgeEnabled arriba). Los caminos
 * de daemon/print se quedan en la implementación basada en env sin
 * importar este gate.
 */
export function isEnvLessBridgeEnabled(): boolean {
  return feature('BRIDGE_MODE')
    ? getFeatureValue_CACHED_MAY_BE_STALE('tengu_bridge_repl_v2', false)
    : false
}

/**
 * Kill-switch para el shim de re-etiquetado del lado cliente `cse_*` →
 * `session_*`.
 *
 * El shim existe porque compat/convert.go:27 valida TagSession y el
 * frontend de claude.ai enruta sobre `session_*`, mientras los endpoints
 * worker de v2 entregan `cse_*`. Una vez que el servidor etiquete por
 * environment_kind y el frontend acepte `cse_*` directamente, poner esto
 * en false hará que toCompatSessionId sea un no-op. Default true — el
 * shim se queda activo hasta deshabilitarse explícitamente.
 */
export function isCseShimEnabled(): boolean {
  return feature('BRIDGE_MODE')
    ? getFeatureValue_CACHED_MAY_BE_STALE(
        'tengu_bridge_repl_v2_cse_shim_enabled',
        true,
      )
    : true
}

/**
 * Devuelve un mensaje de error si la versión actual del CLI está por
 * debajo del mínimo requerido para el camino v1 (basado en env) de
 * Remote Control, o null si la versión está bien. El camino v2
 * (env-less) usa checkEnvLessBridgeMinVersion() en envLessBridgeConfig.ts
 * en su lugar — las dos implementaciones tienen pisos de versión
 * independientes.
 *
 * Usa config de GrowthBook cacheada (no bloqueante). Si GrowthBook aún
 * no cargó, el default '0.0.0' significa que el chequeo pasa — un
 * fallback seguro.
 */
export function checkBridgeMinVersion(): string | null {
  // Patrón positivo — ver docs/feature-gating.md. El patrón negativo
  // (if (!feature(...)) return) no elimina los literales de string
  // inline de los builds externos.
  if (feature('BRIDGE_MODE')) {
    const config = getDynamicConfig_CACHED_MAY_BE_STALE<{
      minVersion: string
    }>('tengu_bridge_min_version', { minVersion: '0.0.0' })
    if (config.minVersion && lt(getMacroVersion(), config.minVersion)) {
      return `Your version of Claude Code (${getMacroVersion()}) is too old for Remote Control.\nVersion ${config.minVersion} or higher is required. Run \`claude update\` to update.`
    }
  }
  return null
}

/**
 * Default de remoteControlAtStartup cuando el usuario no lo fijó
 * explícitamente. Cuando la bandera de build CCR_AUTO_CONNECT está
 * presente (sólo-ant) y el gate de GrowthBook tengu_cobalt_harbor está
 * activo, todas las sesiones se conectan a CCR por defecto — el usuario
 * aún puede optar por salir fijando remoteControlAtStartup=false en la
 * config (los ajustes explícitos siempre ganan sobre este default).
 *
 * Definido aquí en vez de en config.ts para evitar un ciclo directo
 * config.ts → growthbook.ts (growthbook.ts → user.ts → config.ts).
 */
export function getCcrAutoConnectDefault(): boolean {
  return feature('CCR_AUTO_CONNECT')
    ? getFeatureValue_CACHED_MAY_BE_STALE('tengu_cobalt_harbor', false)
    : false
}

/**
 * Modo espejo CCR opt-in — cada sesión local arranca una sesión Remote
 * Control saliente-únicamente que recibe eventos reenviados. Separado de
 * getCcrAutoConnectDefault (Remote Control bidireccional). La env var
 * gana para opt-in local; GrowthBook controla el rollout.
 */
export function isCcrMirrorEnabled(): boolean {
  return feature('CCR_MIRROR')
    ? isEnvTruthy(process.env.CLAUDE_CODE_CCR_MIRROR) ||
        getFeatureValue_CACHED_MAY_BE_STALE('tengu_ccr_mirror', false)
    : false
}
