/**
 * Puerto de `ccnmt: packages/config/timeouts.ts` (39 líneas fuente).
 * Reimplementación fiel VERBATIM. Sin dependencias.
 */

const DEFAULT_TIMEOUT_MS = 120_000 // 2 minutos
const MAX_TIMEOUT_MS = 600_000 // 10 minutos

type EnvLike = Record<string, string | undefined>

/**
 * Obtiene el timeout por defecto para operaciones de bash, en milisegundos.
 * Revisa la variable de entorno `BASH_DEFAULT_TIMEOUT_MS` o devuelve el
 * default de 2 minutos.
 * @param env variables de entorno a revisar (por defecto `process.env`).
 */
export function getDefaultBashTimeoutMs(env: EnvLike = process.env): number {
  const envValue = env.BASH_DEFAULT_TIMEOUT_MS
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return DEFAULT_TIMEOUT_MS
}

/**
 * Obtiene el timeout máximo para operaciones de bash, en milisegundos.
 * Revisa la variable de entorno `BASH_MAX_TIMEOUT_MS` o devuelve el default
 * de 10 minutos.
 * @param env variables de entorno a revisar (por defecto `process.env`).
 */
export function getMaxBashTimeoutMs(env: EnvLike = process.env): number {
  const envValue = env.BASH_MAX_TIMEOUT_MS
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (!isNaN(parsed) && parsed > 0) {
      // Garantiza que el máximo sea al menos tan grande como el default.
      return Math.max(parsed, getDefaultBashTimeoutMs(env))
    }
  }
  // Garantiza siempre que el máximo sea al menos tan grande como el default.
  return Math.max(MAX_TIMEOUT_MS, getDefaultBashTimeoutMs(env))
}
