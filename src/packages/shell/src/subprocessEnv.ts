import { getAllEnv, isEnvTruthy, readEnv } from '@thyrox/config/env/utils'

/**
 * Construye el entorno de un subproceso, aplicando los cribados de
 * seguridad correspondientes.
 *
 * Puerto completo de `claude-code-nestor-monroy-tools:
 * packages/shell/src/subprocessEnv.ts` — los dos exports de la fuente
 * (`registerUpstreamProxyEnvFn`, `subprocessEnv`) están cubiertos por
 * `subprocessEnv.test.ts`.
 *
 * @module
 */

/**
 * Variables de entorno a retirar de subprocesos cuando se corre dentro de
 * GitHub Actions. Evita que una inyección de prompt exfiltre secretos vía
 * expansión de shell en comandos de la herramienta Bash.
 */
const GHA_SUBPROCESS_SCRUB = [
  'ANTHROPIC_API_KEY',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_FOUNDRY_API_KEY',
  'ANTHROPIC_CUSTOM_HEADERS',
  'OTEL_EXPORTER_OTLP_HEADERS',
  'OTEL_EXPORTER_OTLP_LOGS_HEADERS',
  'OTEL_EXPORTER_OTLP_METRICS_HEADERS',
  'OTEL_EXPORTER_OTLP_TRACES_HEADERS',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_BEARER_TOKEN_BEDROCK',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'AZURE_CLIENT_SECRET',
  'AZURE_CLIENT_CERTIFICATE_PATH',
  'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'ACTIONS_ID_TOKEN_REQUEST_URL',
  'ACTIONS_RUNTIME_TOKEN',
  'ACTIONS_RUNTIME_URL',
  'ALL_INPUTS',
  'OVERRIDE_GITHUB_TOKEN',
  'DEFAULT_WORKFLOW_TOKEN',
  'SSH_SIGNING_KEY',
] as const

/**
 * Variables que SIEMPRE se retiran del entorno del subproceso, sin
 * importar el cribado de GHA. Tres categorías:
 *
 * 1. Tokens de autenticación — inyectados sólo para el hijo en segundo
 *    plano; no deben filtrarse a subprocesos de bash ni a scripts de hook.
 * 2. Marcadores de control de proceso — etiquetas de sesión en background
 *    o de reanudación; una invocación anidada quedaría mal etiquetada.
 * 3. Telemetría: todo `OTEL_*` (con match de prefijo más abajo).
 */
const ALWAYS_SCRUB = [
  'CLAUDE_CODE_OAUTH_TOKEN',
  'CLAUDE_CODE_SUBSCRIPTION_TYPE',
  'CLAUDE_CODE_RATE_LIMIT_TIER',
  'CLAUDE_CODE_SESSION_KIND',
  'CLAUDE_BG_SOURCE',
  'CLAUDE_BG_ISOLATION',
  'CLAUDE_BG_BACKEND',
  'CLAUDE_CODE_SESSION_NAME',
  'CLAUDE_CODE_BG_JOB_SHORT',
  'CLAUDE_CODE_RESUME_INTERRUPTED_TURN',
  'CLAUDE_JOB_DIR',
] as const

// Se registra tras importar dinámicamente el módulo de proxy ascendente en
// sesiones que lo requieran.
let getUpstreamProxyEnv: (() => Record<string, string>) | undefined

export function registerUpstreamProxyEnvFn(
  fn: () => Record<string, string>,
): void {
  getUpstreamProxyEnv = fn
}

/**
 * Construye el entorno de un subproceso. Pasar un `env` explícito evita
 * leer `process.env` real (uso en tests — así se elimina la necesidad de
 * mockear el módulo de utilidades de entorno, que en bun-test es
 * proceso-wide y contamina otros archivos de test). Los llamadores de
 * producción omiten el parámetro y la función lee directo de
 * `getAllEnv()`/`readEnv()`.
 */
export function subprocessEnv(
  env?: Record<string, string | undefined>,
): NodeJS.ProcessEnv {
  const baseEnv = env ?? getAllEnv()
  const scrubFlag = env
    ? env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB
    : readEnv('CLAUDE_CODE_SUBPROCESS_ENV_SCRUB')
  const proxyEnv = getUpstreamProxyEnv?.() ?? {}

  // ALWAYS_SCRUB aplica sin importar la bandera de GHA. Sólo se construye
  // un objeto nuevo si de verdad hay algo que retirar; si no, se devuelve
  // baseEnv sin tocar (camino rápido).
  const needsAlwaysScrub = ALWAYS_SCRUB.some(k => k in baseEnv)
  const needsOtelScrub = Object.keys(baseEnv).some(k => k.startsWith('OTEL_'))
  const needsProxy = Object.keys(proxyEnv).length > 0
  const needsGhaScrub = isEnvTruthy(scrubFlag)

  if (!needsAlwaysScrub && !needsOtelScrub && !needsProxy && !needsGhaScrub) {
    return baseEnv as NodeJS.ProcessEnv
  }

  const merged: NodeJS.ProcessEnv = { ...baseEnv, ...proxyEnv }
  for (const k of ALWAYS_SCRUB) {
    delete merged[k]
  }
  // Cribado de prefijo OTEL_* — se recorre cada clave.
  for (const k of Object.keys(merged)) {
    if (k.startsWith('OTEL_')) delete merged[k]
  }
  if (needsGhaScrub) {
    for (const k of GHA_SUBPROCESS_SCRUB) {
      delete merged[k]
      delete merged[`INPUT_${k}`]
    }
  }
  return merged
}
