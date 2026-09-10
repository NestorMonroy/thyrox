/**
 * Fuente del token de dispositivo confiable — puerto byte-a-byte de
 * ant v2.1.136 3157.js (módulo `tN`): `wgH` / `PRH` / `t66` / `U$5` /
 * `U$H` / `G$_` / `kJ8` / `VJ8` / `JgH` / `ZJ8` / `LJ8` / `wO7` / `YgH`.
 *
 * Las sesiones bridge tienen SecurityTier=ELEVATED en el servidor (CCR
 * v2). El servidor gatea ConnectBridgeWorker con su propia bandera; este
 * gating del lado CLI controla si el CLI envía X-Trusted-Device-Token en
 * absoluto.
 *
 * Dos banderas + una política de organización:
 *   - `tengu_sessions_elevated_auth_enforcement` (`ZJ8`) — gate de GrowthBook.
 *     Cuando está OFF, el CLI nunca lee / envía / limpia el token.
 *   - `require_trusted_devices` (`LJ8`) — entrada de política administrada
 *     que el admin de la org puede activar para exigir dispositivos
 *     confiables para sus miembros.
 *   - `tengu_sessions_elevated_auth_disable_proactive_enrollment` (`wO7`)
 *     — kill-switch (override del lado servidor) que deshabilita el
 *     ENROLAMIENTO. Los caminos de envío-de-token y enforcement-de-gate
 *     no se ven afectados. Se usa durante caídas del endpoint de
 *     enrolamiento para que los usuarios no vean 5xx espurios durante
 *     /login.
 *
 * Gate combinado (`wgH`):
 *     gate=on  AND  isPolicyAllowed(require_trusted_devices)
 *
 * El enrolamiento (POST /auth/trusted_devices) está gateado del lado
 * servidor por account_session.created_at < 10min, así que debe ocurrir
 * durante /login. El token es persistente (expiración rolling de 90d) y
 * se guarda en el keychain.
 *
 * Ver anthropics/anthropic#274559 (spec), #310375 (B1b tenant RPCs),
 * #295987 (B2 Python routes), #307150 (C1' CCR v2 gate).
 *
 * Puerto fiel de `ccnmt: packages/bridge/src/trustedDevice.ts`.
 * `getOauthConfig`/`checkGate_CACHED_OR_BLOCKING`/
 * `getFeatureValue_CACHED_MAY_BE_STALE`/`isPolicyAllowed`/
 * `waitForPolicyLimitsToLoad`/`logForDebugging`/`errorMessage`/
 * `logForDiagnosticsNoPII`/`isEssentialTrafficOnly`/`getSecureStorage`/
 * `jsonStringify`/`getClaudeAIOAuthTokens` son sustitutos — ver
 * `internal/pendingCrossPackageDeps.ts`.
 */
import axios from 'axios'
import memoize from 'lodash-es/memoize.js'
import { hostname } from 'node:os'
import {
  checkGate_CACHED_OR_BLOCKING,
  errorMessage,
  getClaudeAIOAuthTokens,
  getFeatureValue_CACHED_MAY_BE_STALE,
  getOauthConfig,
  getSecureStorage,
  isEssentialTrafficOnly,
  isPolicyAllowed,
  jsonStringify,
  logForDebugging,
  logForDiagnosticsNoPII,
  waitForPolicyLimitsToLoad,
} from './internal/pendingCrossPackageDeps.js'

// Ant `ZJ8`
const TRUSTED_DEVICE_GATE = 'tengu_sessions_elevated_auth_enforcement'
// Ant `LJ8`
const TRUSTED_DEVICE_POLICY = 'require_trusted_devices'
// Ant `wO7`
const TRUSTED_DEVICE_PROACTIVE_DISABLE_GATE =
  'tengu_sessions_elevated_auth_disable_proactive_enrollment'
// Nombre del contador de telemetría `bridge_trusted_device_enroll` de
// ant. Cada call site abajo registra un evento `<COUNTER>_<reason>`
// que coincide con el patrón xH(counter, reason) / yH(counter) /
// G6(counter, reason) de ant, para que los dashboards de funnel-drop se
// alineen entre ccb y ant.
const ENROLL_COUNTER = 'bridge_trusted_device_enroll'

function reportFail(reason: string): void {
  // Ant usa dos códigos distintos: `xH` (fallo definitivo) vs `G6`
  // (warn / soft-fail). El archivo trustedDevice sólo usa `xH` para el
  // contador de enrolamiento, así que un único helper aquí alcanza.
  logForDiagnosticsNoPII('error', `${ENROLL_COUNTER}_${reason}`)
}

function reportSuccess(): void {
  logForDiagnosticsNoPII('info', `${ENROLL_COUNTER}_completed`)
}

// Ant `YgH` — verbatim
export const PROACTIVE_ENROLLMENT_DISABLED_MESSAGE =
  'Your organization requires Trusted Devices for Remote Control, but enrollment is temporarily disabled. Please try again later, or contact your administrator.'

// Mensaje `U$5` de ant, caso no-deshabilitado
export const TRUSTED_DEVICE_UNENROLLED_MESSAGE =
  'Your organization requires Trusted Devices for Remote Control, but this device is not enrolled. Please run `/login` in Claude Code to enroll this device.'

/**
 * Ant `U$H` — lector del kill-switch. Se usa tanto para omitir el
 * enrolamiento como para elegir el mensaje de error proactive-disabled
 * en `getTrustedDeviceUnenrolledReason`.
 */
function isProactiveEnrollmentDisabled(): boolean {
  return getFeatureValue_CACHED_MAY_BE_STALE(
    TRUSTED_DEVICE_PROACTIVE_DISABLE_GATE,
    false,
  )
}

/**
 * Ant `wgH` — gate combinado: bandera de GrowthBook Y política de la
 * org. Esta es la única fuente de verdad `isGateEnabled` que usan los 7
 * call sites de trustedDevice. El chequeo de dos ejes importa porque:
 *   - El gate de GrowthBook da a Anthropic un rollout escalonado por cuenta.
 *   - La política de la org da al admin del cliente un opt-out para su
 *     workspace.
 * AMBOS deben estar en on para que el camino de trusted-device se active.
 */
function isTrustedDeviceGateEnabled(): boolean {
  if (
    !getFeatureValue_CACHED_MAY_BE_STALE(TRUSTED_DEVICE_GATE, false)
  ) {
    return false
  }
  return isPolicyAllowed(TRUSTED_DEVICE_POLICY)
}

/**
 * Ant `JgH` — memoización de la lectura de keychain.
 * `getSecureStorage().read()` arranca un subproceso `security` de macOS
 * (~40ms) y bridgeApi.ts llama esto desde getHeaders() en cada
 * poll/heartbeat/ack. El override por env var
 * (`CLAUDE_TRUSTED_DEVICE_TOKEN`) opaca la lectura de keychain para que
 * los wrappers enterprise puedan inyectar un token pre-emitido sin tocar
 * el keychain del usuario.
 *
 * La caché la limpia `clearTrustedDeviceTokenCache` (`G$_`), y el camino
 * de enrolamiento exitoso (`VJ8` llama a cache.clear tras persistir).
 */
const readStoredTrustedDeviceToken = memoize((): string | undefined => {
  const envToken = process.env.CLAUDE_TRUSTED_DEVICE_TOKEN
  if (envToken) return envToken
  return getSecureStorage().read()?.trustedDeviceToken
})

/** Lectura pública para que call sites fuera de bridge puedan inspeccionar el valor cacheado. */
export function readStoredTrustedDeviceTokenForTesting(): string | undefined {
  return readStoredTrustedDeviceToken()
}

/**
 * Ant `PRH` — getter gateado del token. Devuelve undefined cuando el
 * gate combinado está off, para que los llamadores nunca envíen
 * accidentalmente un token obsoleto mientras la feature está
 * deshabilitada.
 */
export function getTrustedDeviceToken(): string | undefined {
  if (!isTrustedDeviceGateEnabled()) return undefined
  return readStoredTrustedDeviceToken()
}

/**
 * Ant `t66` — ¿este dispositivo tiene el gate activo pero no está
 * enrolado? Predicado puro que usa `getTrustedDeviceUnenrolledReason` y
 * cualquier superficie de UI que necesite mostrar un recordatorio de
 * enrolamiento.
 */
export function isTrustedDeviceUnenrolled(): boolean {
  if (!isTrustedDeviceGateEnabled()) return false
  if (readStoredTrustedDeviceToken()) return false
  return true
}

/**
 * Ant `U$5` — devuelve el mensaje visible al usuario cuando el
 * dispositivo debería estar enrolado y no lo está, o null si no hay
 * problema.
 *
 * Dos modos de fallo:
 *   - Deshabilitado del lado servidor (gate de disable proactivo activo) → mensaje temporal.
 *   - Dispositivo no enrolado (sin token guardado) → mensaje de correr /login.
 */
export function getTrustedDeviceUnenrolledReason(): string | null {
  if (!isTrustedDeviceUnenrolled()) return null
  if (isProactiveEnrollmentDisabled())
    return PROACTIVE_ENROLLMENT_DISABLED_MESSAGE
  return TRUSTED_DEVICE_UNENROLLED_MESSAGE
}

/** Ant `G$_` — invalidador de la caché de lectura de keychain. */
export function clearTrustedDeviceTokenCache(): void {
  readStoredTrustedDeviceToken.cache?.clear?.()
}

/**
 * Ant `kJ8` — limpia el token de dispositivo confiable guardado.
 * Crítico: el kill-switch proactive-disabled ABORTA la limpieza para
 * que durante una caída del endpoint de enrolamiento no se destruya un
 * token existente válido (la caída impediría re-enrolar, dejando al
 * usuario sin forma de recuperar el acceso al bridge hasta que la caída
 * termine).
 *
 * Best-effort: la escritura de keychain está envuelta en catch para que
 * un problema de permisos no pueda bloquear el flujo de login.
 *
 * Nota: ant usa `h1().mutate(fn => ...)` para read-modify-write atómico;
 * el secureStorage de ccb sólo expone `read()` + `update()`, así que hay
 * una ventana angosta donde una escritura concurrente de keychain podría
 * perderse. La ventana sólo se abre en /login (el llamador ya está
 * serializado), así que la carrera es teórica en la práctica.
 */
export function clearTrustedDeviceToken(): void {
  if (isProactiveEnrollmentDisabled()) return
  clearTrustedDeviceTokenCache()
  const secureStorage = getSecureStorage()
  try {
    const data = secureStorage.read()
    if (data?.trustedDeviceToken) {
      delete data.trustedDeviceToken
      secureStorage.update(data)
    }
  } catch {
    // best-effort
  }
}

/**
 * Ant `VJ8` — enrola este dispositivo vía POST /auth/trusted_devices y
 * persiste el token al keychain. Best-effort: registra y devuelve ante
 * un fallo para que los llamadores (hooks post-login) no bloqueen el
 * flujo de login.
 *
 * El servidor gatea el enrolamiento con account_session.created_at <
 * 10min, así que esto debe llamarse inmediatamente después de un /login
 * fresco. Llamarlo después (p. ej. enrolamiento perezoso ante un 403 de
 * /bridge) fallará con 403 stale_session.
 *
 * Orden exacto de chequeos de gate de ant (replicado aquí para paridad
 * de comportamiento):
 *   1. checkGate_CACHED_OR_BLOCKING(TRUSTED_DEVICE_GATE)
 *   2. isProactiveEnrollmentDisabled()
 *   3. precedencia de la env var CLAUDE_TRUSTED_DEVICE_TOKEN
 *   4. waitForPolicyLimitsToLoad() + isPolicyAllowed(require_trusted_devices)
 *   5. presencia de un access token OAuth
 *   6. opt-out de isEssentialTrafficOnly()
 *   7. POST /api/auth/trusted_devices
 *   8. Persiste el token + limpia la caché
 *
 * Cada salida temprana dispara el contador de telemetría
 * `bridge_trusted_device_enroll` coincidente para que los dashboards
 * puedan repartir el drop-off del funnel por causa.
 */
export async function enrollTrustedDevice(): Promise<void> {
  try {
    // 1. Gate de GrowthBook — checkGate_CACHED_OR_BLOCKING espera
    //    cualquier re-init en vuelo disparado por
    //    refreshGrowthBookAfterAuthChange en login.tsx.
    if (!(await checkGate_CACHED_OR_BLOCKING(TRUSTED_DEVICE_GATE))) {
      logForDebugging(
        `[trusted-device] Gate ${TRUSTED_DEVICE_GATE} is off, skipping enrollment`,
      )
      return
    }
    // 2. Kill-switch de caída.
    if (isProactiveEnrollmentDisabled()) {
      logForDebugging(
        `[trusted-device] Proactive enrollment disabled via ${TRUSTED_DEVICE_PROACTIVE_DISABLE_GATE}, skipping`,
      )
      return
    }
    // 3. Precedencia de env var — readStoredTrustedDeviceToken respeta
    //    la env var, así que enrolar escribiría un token permanentemente
    //    opacado.
    if (process.env.CLAUDE_TRUSTED_DEVICE_TOKEN) {
      logForDebugging(
        '[trusted-device] CLAUDE_TRUSTED_DEVICE_TOKEN env var is set, skipping enrollment (env var takes precedence)',
      )
      return
    }
    // 4. Gate de política de la org — ant explícitamente espera la
    //    carga de la política antes de chequear para que una carrera
    //    entre /login y el fetch de la política no dé un falso-fallo.
    await waitForPolicyLimitsToLoad()
    if (!isPolicyAllowed(TRUSTED_DEVICE_POLICY)) {
      logForDebugging(
        `[trusted-device] Org has not enabled ${TRUSTED_DEVICE_POLICY}, skipping enrollment`,
      )
      return
    }
    // 5. Access token OAuth.
    const accessToken = getClaudeAIOAuthTokens()?.accessToken
    if (!accessToken) {
      logForDebugging('[trusted-device] No OAuth token, skipping enrollment')
      return
    }
    // 6. Opt-out de sólo-tráfico-esencial (orgs HIPAA, etc).
    if (isEssentialTrafficOnly()) {
      logForDebugging(
        '[trusted-device] Essential traffic only, skipping enrollment',
      )
      return
    }

    // 7. POST /api/auth/trusted_devices.
    const baseUrl = getOauthConfig().BASE_API_URL
    let response
    try {
      response = await axios.post<{
        device_token?: string
        device_id?: string
      }>(
        `${baseUrl}/api/auth/trusted_devices`,
        { display_name: `Claude Code on ${hostname()} · ${process.platform}` },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
          validateStatus: s => s < 500,
        },
      )
    } catch (err: unknown) {
      logForDebugging(
        `[trusted-device] Enrollment request failed: ${errorMessage(err)}`,
      )
      reportFail('request_failed')
      return
    }

    if (response.status !== 200 && response.status !== 201) {
      logForDebugging(
        `[trusted-device] Enrollment failed ${response.status}: ${jsonStringify(response.data).slice(0, 200)}`,
      )
      reportFail('http_error')
      return
    }

    const token = response.data?.device_token
    if (!token || typeof token !== 'string') {
      logForDebugging(
        '[trusted-device] Enrollment response missing device_token field',
      )
      reportFail('missing_token')
      return
    }

    // 8. Persiste + invalida la caché.
    try {
      const secureStorage = getSecureStorage()
      const storageData = secureStorage.read()
      if (!storageData) {
        logForDebugging(
          '[trusted-device] Cannot read storage, skipping token persist',
        )
        reportFail('storage_failed')
        return
      }
      storageData.trustedDeviceToken = token
      const result = secureStorage.update(storageData)
      if (!result.success) {
        logForDebugging(
          `[trusted-device] Failed to persist token: ${result.warning ?? 'unknown'}`,
        )
        reportFail('storage_failed')
        return
      }
      clearTrustedDeviceTokenCache()
      logForDebugging(
        `[trusted-device] Enrolled device_id=${response.data.device_id ?? 'unknown'}`,
      )
      reportSuccess()
    } catch (err: unknown) {
      logForDebugging(
        `[trusted-device] Storage write failed: ${errorMessage(err)}`,
      )
      reportFail('storage_failed')
    }
  } catch (err: unknown) {
    logForDebugging(`[trusted-device] Enrollment error: ${errorMessage(err)}`)
    reportFail('unexpected_error')
  }
}
