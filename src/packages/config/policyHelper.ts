/**
 * Puerto de `ccnmt: packages/config/policyHelper.ts` (321 líneas fuente).
 * Reimplementación fiel VERBATIM, salvo la resolución de dos deps
 * cruzadas: `logEvent` (`@thyrox/local-observability`, raíz) y
 * `logForDebugging` (`@thyrox/local-observability/debug.js`) se piden vía
 * `require()` diferido (`internal/pendingCrossPackageDeps.ts` —
 * `requireLocalObservabilityRoot`, ya existente
 * `requireLocalObservabilityDebug`), en vez de `import` estático — mismo
 * caso que el resto de este árbol: sin symlinks de workspace todavía.
 *
 * policyHelper — proveedor externo de settings managed vía binario
 * ejecutable.
 *
 * Puerto de ant v2.1.136 `fE_` (0686.js) + `mSH` (0687.js). Permite a un
 * admin de empresa embarcar una ruta de binario a través de fuentes de
 * settings controladas por admin; el CLI lanza ese binario, parsea un
 * envoltorio desde stdout, y fusiona el resultado en la caché de
 * managed-settings en vivo.
 *
 * Forma del envoltorio:
 *   { managedSettings?: object,
 *     claudeMd?: string,
 *     appendSystemPrompt?: string }
 *
 * Invariantes críticos de seguridad:
 *   - La config del helper SÓLO puede venir de fuentes propiedad de admin
 *     (`plist` / `hklm` / `file`). Una fuente escribible por usuario que
 *     declarara un helper sería un bypass del sandbox. Se aplica vía
 *     `applyPolicyHelper`, que toma la cadena `source` y rechaza vía
 *     `ALLOWED_POLICY_HELPER_SOURCES` (`OZ4` de ant).
 *   - `managedSettings.policyHelper` del helper se quita al volver, para
 *     que un helper hostil no pueda re-declararse a sí mismo
 *     recursivamente.
 *   - Un tope de salida (`nI6 = 1MB` de ant) termina al hijo temprano ante
 *     overflow de stdout.
 *   - Timeout por invocación (`qZ4 = 10s` de ant) acotado por `timeoutMs`
 *     de config.
 *   - Telemetría: `xH('settings_policy_helper', code)` por cada fallo,
 *     `yH('settings_policy_helper')` al éxito.
 *
 * Mapa de identificadores de ant (referencia cruzada para futuras cacerías
 * de bugs):
 *   rAq → applyPolicyHelper        — orquestador (entrypoint de este módulo)
 *   tAq → invokePolicyHelper       — driver del subproceso hijo
 *   TZ4 → validateHelperPath
 *   AZ4 → schedulePolicyHelperRefresh (re-poll por intervalo)
 *   OZ4 → ALLOWED_POLICY_HELPER_SOURCES
 *   KZ4 → policyHelperEnvelopeSchema
 *   oI6 → getPolicyHelperManagedSettings
 *   oAq → getPolicyHelperClaudeMd
 *   aAq → getPolicyHelperAppendSystemPrompt
 *   sAq → isPolicyHelperActive
 *   qZ4 → DEFAULT_POLICY_HELPER_TIMEOUT_MS (10s)
 *   nI6 → POLICY_HELPER_OUTPUT_CAP_BYTES (1MB)
 *   dfH → policyHelperState (a nivel de módulo)
 *   n6_ → refreshTimer
 *   iI6 → refreshInFlight
 */
import { spawn } from 'node:child_process'
import { isAbsolute } from 'node:path'
import { z } from 'zod/v4'
import {
  requireLocalObservabilityDebug,
  requireLocalObservabilityRoot,
} from './internal/pendingCrossPackageDeps.ts'

const { logEvent } = requireLocalObservabilityRoot()
const { logForDebugging } = requireLocalObservabilityDebug()

/** `qZ4` de ant — timeout por defecto del helper. */
const DEFAULT_POLICY_HELPER_TIMEOUT_MS = 10_000

/** `nI6` de ant — tope de bytes de stdout antes del kill forzado. */
const POLICY_HELPER_OUTPUT_CAP_BYTES = 1_048_576

/**
 * `OZ4` de ant — fuentes autorizadas a declarar un `policyHelper`. NO se
 * pueden añadir fuentes nuevas sin revisión de seguridad.
 */
export const ALLOWED_POLICY_HELPER_SOURCES = new Set([
  'plist',
  'hklm',
  'file',
])

export type PolicyHelperConfig = {
  path: string
  refreshIntervalMs?: number
  timeoutMs?: number
}

export type PolicyHelperOutput = {
  managedSettings?: Record<string, unknown>
  claudeMd?: string
  appendSystemPrompt?: string
}

/**
 * `KZ4` de ant — forma del envoltorio parseado del stdout del helper.
 * Objeto laxo porque el helper puede emitir campos de debug adicionales
 * que se ignoran.
 */
const policyHelperEnvelopeSchema = z.looseObject({
  managedSettings: z.unknown().optional(),
  claudeMd: z.string().optional(),
  appendSystemPrompt: z.string().optional(),
})

/** Códigos de fallo de ant — emitidos como segundo argumento de `xH(scope, code)`. */
export type PolicyHelperFailureCode =
  | 'bad_path'
  | 'bad_source'
  | 'exit_nonzero'
  | 'oversize'
  | 'parse_failed'
  | 'envelope_invalid'
  | 'schema_rejected'
  | 'refresh_failed'

/**
 * Estado a nivel de módulo que espeja `dfH` de ant. Guarda la última
 * salida del helper aceptada + la config que se usó para producirla (para
 * que el loop de refresh pueda re-invocar con los mismos argumentos).
 */
type PolicyHelperState = {
  config: PolicyHelperConfig
  output: PolicyHelperOutput
}
let policyHelperState: PolicyHelperState | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null
let refreshInFlight = false
const refreshListeners: Set<() => void> = new Set()

/**
 * `xH('settings_policy_helper', code)` de ant — evento de resultado de
 * fallo. Se envuelve aquí para que los llamadores no tengan que recordar
 * la etiqueta de scope.
 */
function logFailure(
  code: PolicyHelperFailureCode,
  extra: Record<string, unknown> = {},
): void {
  logEvent('settings_policy_helper', {
    failure_code: code,
    ...extra,
  })
}

/**
 * `yH('settings_policy_helper')` de ant — evento de resultado de éxito.
 */
function logSuccess(extra: Record<string, unknown> = {}): void {
  logEvent('settings_policy_helper_success', {
    ...extra,
  })
}

/**
 * `TZ4` de ant. Valida una ruta de binario helper. Devuelve `null` en
 * éxito o una cadena de error legible en fallo. Devolver el mensaje (no
 * lanzar) coincide con el contrato de ant — el llamador lo convierte en un
 * fallo `xH('bad_path')` con el mensaje embebido.
 */
export function validateHelperPath(path: string): string | null {
  if (!path || path.length === 0) {
    return 'path must be non-empty'
  }
  if (!isAbsolute(path)) {
    return `path must be absolute: ${path}`
  }
  if (process.platform === 'win32' && !/\.exe$/i.test(path)) {
    return `path must end in .exe on Windows: ${path}`
  }
  return null
}

/**
 * `OZ4.has(source)` de ant. Devuelve verdadero cuando la fuente de
 * settings nombrada tiene permiso para declarar un `policyHelper`. Una
 * fuente `null` (sin procedencia) se rechaza — sólo fuentes controladas
 * por admin pueden instalar un helper.
 */
export function isAdminPolicySource(source: string | null | undefined): boolean {
  if (source === null || source === undefined) return false
  return ALLOWED_POLICY_HELPER_SOURCES.has(source)
}

/**
 * `tAq` de ant. Invoca el binario helper una vez y parsea su salida.
 * Devuelve `{output}` en éxito o `{error, code}` en fallo. El llamador
 * (`rAq` de ant / nuestro `applyPolicyHelper`) es responsable de persistir
 * el resultado y disparar la telemetría correspondiente.
 */
export async function invokePolicyHelper(
  config: PolicyHelperConfig,
): Promise<
  | { output: PolicyHelperOutput }
  | { error: string; code: PolicyHelperFailureCode }
> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_POLICY_HELPER_TIMEOUT_MS
  // `f8(H.path, [], { timeout: _, maxBuffer: nI6+1, ... })` de ant devuelve
  // `{stdout, stderr, code, error}` con stdout siendo el payload COMPLETO
  // hasta maxBuffer. Se espeja con un loop de spawn que acumula chunks
  // como Buffers (NO cadenas) y mide bytes vía `Buffer.byteLength` —
  // crítico: la implementación vieja usaba
  // `stdout.length + chunk.length` mezclando conteo de code-units de
  // cadena JS y conteo de bytes de Buffer, lo que silenciosamente
  // subcontaba texto UTF-8 multi-byte y dejaba que el helper excediera el tope.
  const stdoutChunks: Buffer[] = []
  const stderrChunks: Buffer[] = []
  let stdoutBytes = 0
  let oversized = false
  return await new Promise<
    | { output: PolicyHelperOutput }
    | { error: string; code: PolicyHelperFailureCode }
  >(resolve => {
    let child
    try {
      child = spawn(config.path, [], {
        env: {
          ...process.env,
          // ant embarca `CLAUDE_CODE_VERSION` desde la constante de tiempo
          // de build. ccb la espeja vía la variable de entorno
          // `CLAUDE_CODE_VERSION`, así que el helper ve la versión que lo
          // invocó.
          CLAUDE_CODE_VERSION: process.env.CLAUDE_CODE_VERSION ?? 'dev',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (e) {
      resolve({
        error: `spawn failed: ${(e as Error).message}`,
        code: 'exit_nonzero',
      })
      return
    }
    const t = setTimeout(() => {
      try {
        child.kill('SIGTERM')
      } catch {
        // ya terminó
      }
    }, timeoutMs)
    t.unref?.()
    child.stdout?.on('data', (chunk: Buffer) => {
      // Acepta el chunk primero, LUEGO comprueba el tope y sale. El
      // `f8(maxBuffer: nI6+1)` de ant semánticamente conserva hasta `nI6+1`
      // bytes y luego el handler de close hace `byteLength > nI6` — ese
      // byte extra es cómo discrimina "exactamente en el tope" de "por
      // encima del tope". Se espeja deteniendo la lectura en el mismo
      // límite.
      stdoutChunks.push(chunk)
      stdoutBytes += chunk.length
      if (stdoutBytes > POLICY_HELPER_OUTPUT_CAP_BYTES) {
        oversized = true
        try {
          child.kill('SIGTERM')
        } catch {
          // ya terminó
        }
      }
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })
    child.on('close', code => {
      clearTimeout(t)
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8')
      const stderr = Buffer.concat(stderrChunks).toString('utf-8')
      // ant loguea stderr sin importar éxito/fallo, a nivel debug.
      if (stderr) {
        logForDebugging(`policyHelper stderr: ${stderr}`)
      }
      if (oversized) {
        resolve({
          error: `stdout exceeded ${POLICY_HELPER_OUTPUT_CAP_BYTES} bytes`,
          code: 'oversize',
        })
        return
      }
      if (code !== 0) {
        resolve({
          error: `exited with code ${code}: ${stderr || stdout || ''}`,
          code: 'exit_nonzero',
        })
        return
      }
      // ant re-chequea el tope de bytes al cerrar (defensa contra que
      // `maxBuffer=nI6+1` deje pasar un byte).
      if (Buffer.byteLength(stdout, 'utf-8') > POLICY_HELPER_OUTPUT_CAP_BYTES) {
        resolve({
          error: `stdout exceeded ${POLICY_HELPER_OUTPUT_CAP_BYTES} bytes`,
          code: 'oversize',
        })
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(stdout)
      } catch {
        resolve({
          error: 'stdout is not valid JSON',
          code: 'parse_failed',
        })
        return
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        resolve({
          error: 'stdout is not a JSON object',
          code: 'parse_failed',
        })
        return
      }
      const result = policyHelperEnvelopeSchema.safeParse(parsed)
      if (!result.success) {
        resolve({
          error: `invalid envelope: ${result.error.message}`,
          code: 'envelope_invalid',
        })
        return
      }
      // Construye la salida tipada. ant quita `policyHelper` del
      // `managedSettings` devuelto para que el helper no pueda
      // re-declararse recursivamente; hacemos lo mismo. ant además clona
      // (`NV` = structuredClone) el `managedSettings` del helper antes de
      // recortar, para que mutaciones sobre nuestro valor de retorno no se
      // filtren de vuelta al envoltorio parseado. Se copia hondo vía JSON
      // ya que se acaba de parsear desde JSON y se sabe que es
      // plain-JSON-safe.
      const output: PolicyHelperOutput = {}
      const ms = result.data.managedSettings
      if (ms !== undefined) {
        if (!ms || typeof ms !== 'object' || Array.isArray(ms)) {
          resolve({
            error: 'managedSettings must be an object',
            code: 'schema_rejected',
          })
          return
        }
        const cloned = JSON.parse(JSON.stringify(ms)) as Record<string, unknown>
        const { policyHelper: _strip, ...rest } = cloned
        void _strip
        output.managedSettings = rest
      }
      if (result.data.claudeMd !== undefined) {
        output.claudeMd = result.data.claudeMd
      }
      if (result.data.appendSystemPrompt !== undefined) {
        output.appendSystemPrompt = result.data.appendSystemPrompt
      }
      resolve({ output })
    })
    child.on('error', err => {
      clearTimeout(t)
      resolve({
        error: `spawn error: ${err.message}`,
        code: 'exit_nonzero',
      })
    })
  })
}

/**
 * `rAq` de ant. Orquestador: toma los settings fusionados + la fuente de
 * la que vienen, valida que la fuente esté controlada por admin, corre
 * `validateHelperPath`, lanza el helper, persiste el resultado en el
 * estado a nivel de módulo, arma el intervalo de refresh, y devuelve
 * `null` en éxito o una cadena de error apta para mostrar al usuario.
 *
 * El llamador (el loader de mdm/settings) decide si expone el error.
 */
export async function applyPolicyHelper(
  settings: { policyHelper?: unknown } | null | undefined,
  source: string | null | undefined,
): Promise<string | null> {
  const cfg = settings?.policyHelper as PolicyHelperConfig | undefined
  if (!cfg) return null
  if (!isAdminPolicySource(source)) {
    logFailure('bad_source', {
      source: source ?? 'unknown',
    })
    logForDebugging(
      `policyHelper ignored: delivered via non-admin source '${source ?? 'unknown'}'`,
    )
    return null
  }
  const pathError = validateHelperPath(cfg.path)
  if (pathError) {
    logFailure('bad_path')
    return `policyHelper failed: ${pathError}`
  }
  const result = await invokePolicyHelper(cfg)
  if ('error' in result) {
    logFailure(result.code)
    return `policyHelper failed: ${result.error}`
  }
  policyHelperState = { config: cfg, output: result.output }
  logSuccess()
  schedulePolicyHelperRefresh(cfg)
  logForDebugging(
    `policyHelper applied (keys: ${Object.keys(result.output).join(',')})`,
  )
  return null
}

/**
 * `AZ4` de ant. Arma un `setInterval` que re-invoca al helper cada
 * `refreshIntervalMs`. La re-entrada se protege con `refreshInFlight`,
 * para que un helper lento no apile invocaciones solapadas. El timer se
 * hace `.unref()` para que nunca mantenga a Node vivo por sí solo.
 */
function schedulePolicyHelperRefresh(config: PolicyHelperConfig): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  const intervalMs = config.refreshIntervalMs ?? 0
  if (intervalMs <= 0) return
  refreshTimer = setInterval(() => {
    if (refreshInFlight) return
    refreshInFlight = true
    void invokePolicyHelper(config)
      .then(r => {
        if ('error' in r) {
          logFailure('refresh_failed', {
            error_code: r.code,
          })
          return
        }
        if (policyHelperState) {
          policyHelperState = { ...policyHelperState, output: r.output }
          for (const fn of refreshListeners) {
            try {
              fn()
            } catch {
              // una excepción de listener no debe romper el loop de refresh.
            }
          }
        }
      })
      .finally(() => {
        refreshInFlight = false
      })
  }, intervalMs)
  refreshTimer.unref?.()
}

/** Sólo test: detiene el timer de refresh (para que el proceso de test salga). */
export function stopPolicyHelperRefreshForTesting(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  refreshInFlight = false
}

/**
 * Se suscribe a eventos de refresh. Devuelve una función de
 * desuscripción. ant dispara `uSH.emit("policySettings")` + `rI6.emit()`
 * — los listeners aquí cubren la misma necesidad (notificar a los
 * consumidores que `managedSettings` puede haber cambiado).
 */
export function onPolicyHelperRefresh(listener: () => void): () => void {
  refreshListeners.add(listener)
  return () => {
    refreshListeners.delete(listener)
  }
}

/** `oI6` de ant. */
export function getPolicyHelperManagedSettings():
  | Record<string, unknown>
  | null {
  return policyHelperState?.output.managedSettings ?? null
}

/** `oAq` de ant. */
export function getPolicyHelperClaudeMd(): string | null {
  return policyHelperState?.output.claudeMd ?? null
}

/** `aAq` de ant. */
export function getPolicyHelperAppendSystemPrompt(): string | null {
  return policyHelperState?.output.appendSystemPrompt ?? null
}

/** `sAq` de ant. */
export function isPolicyHelperActive(): boolean {
  return policyHelperState !== null
}

/**
 * Sólo test: limpia el estado a nivel de módulo.
 */
export function _resetPolicyHelperForTesting(): void {
  policyHelperState = null
  stopPolicyHelperRefreshForTesting()
  refreshListeners.clear()
}
