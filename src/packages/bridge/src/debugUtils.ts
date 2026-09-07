/**
 * Puerto fiel de `ccnmt: packages/bridge/src/debugUtils.ts`.
 * `logEvent`/`logForDebugging`/`errorMessage`/`jsonStringify` son
 * sustitutos — ver `internal/pendingCrossPackageDeps.ts`.
 * `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS` es
 * sólo-tipo (se borra al compilar) — se cita `@thyrox/local-observability`.
 */
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '@thyrox/local-observability/compat'
import {
  errorMessage,
  jsonStringify,
  logEvent,
  logForDebugging,
} from './internal/pendingCrossPackageDeps.js'

const DEBUG_MSG_LIMIT = 2000

const SECRET_FIELD_NAMES = [
  'session_ingress_token',
  'environment_secret',
  'access_token',
  'secret',
  'token',
]

const SECRET_PATTERN = new RegExp(
  `"(${SECRET_FIELD_NAMES.join('|')})"\\s*:\\s*"([^"]*)"`,
  'g',
)

const REDACT_MIN_LENGTH = 16

export function redactSecrets(s: string): string {
  return s.replace(SECRET_PATTERN, (_match, field: string, value: string) => {
    if (value.length < REDACT_MIN_LENGTH) {
      return `"${field}":"[REDACTED]"`
    }
    const redacted = `${value.slice(0, 8)}...${value.slice(-4)}`
    return `"${field}":"${redacted}"`
  })
}

/** Trunca una cadena para logging de debug, colapsando saltos de línea. */
export function debugTruncate(s: string): string {
  const flat = s.replace(/\n/g, '\\n')
  if (flat.length <= DEBUG_MSG_LIMIT) {
    return flat
  }
  return flat.slice(0, DEBUG_MSG_LIMIT) + `... (${flat.length} chars)`
}

/** Trunca un valor serializable a JSON para logging de debug. */
export function debugBody(data: unknown): string {
  const raw = typeof data === 'string' ? data : jsonStringify(data)
  const s = redactSecrets(raw)
  if (s.length <= DEBUG_MSG_LIMIT) {
    return s
  }
  return s.slice(0, DEBUG_MSG_LIMIT) + `... (${s.length} chars)`
}

/**
 * Extrae un mensaje de error descriptivo de un error de axios (o de
 * cualquier error). Para errores HTTP, apenda el mensaje del cuerpo de
 * respuesta del servidor si está disponible, ya que el mensaje por
 * defecto de axios sólo incluye el código de estado.
 */
export function describeAxiosError(err: unknown): string {
  const msg = errorMessage(err)
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: unknown } }).response
    if (response?.data && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>
      const detail =
        typeof data.message === 'string'
          ? data.message
          : typeof data.error === 'object' &&
              data.error &&
              'message' in data.error &&
              typeof (data.error as Record<string, unknown>).message ===
                'string'
            ? (data.error as Record<string, unknown>).message
            : undefined
      if (detail) {
        return `${msg}: ${detail}`
      }
    }
  }
  return msg
}

/**
 * Extrae el código de estado HTTP de un error de axios, si está
 * presente. Devuelve undefined para errores no-HTTP (p. ej. fallos de red).
 */
export function extractHttpStatus(err: unknown): number | undefined {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    (err as { response?: { status?: unknown } }).response &&
    typeof (err as { response: { status?: unknown } }).response.status ===
      'number'
  ) {
    return (err as { response: { status: number } }).response.status
  }
  return undefined
}

/**
 * Extrae un mensaje legible del cuerpo de respuesta de un error de la
 * API. Revisa `data.message` primero, luego `data.error.message`.
 */
export function extractErrorDetail(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  if ('message' in data && typeof data.message === 'string') {
    return data.message
  }
  if (
    'error' in data &&
    data.error !== null &&
    typeof data.error === 'object' &&
    'message' in data.error &&
    typeof data.error.message === 'string'
  ) {
    return data.error.message
  }
  return undefined
}

/**
 * Registra un skip de init del bridge — mensaje de debug + evento de
 * analytics `tengu_bridge_repl_skipped`. Centraliza el nombre del evento
 * y el cast de AnalyticsMetadata para que los call sites no repitan las
 * 5 líneas de boilerplate cada uno.
 */
export function logBridgeSkip(
  reason: string,
  debugMsg?: string,
  v2?: boolean,
): void {
  if (debugMsg) {
    logForDebugging(debugMsg)
  }
  logEvent('tengu_bridge_repl_skipped', {
    reason:
      reason as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    ...(v2 !== undefined && { v2 }),
  })
}
