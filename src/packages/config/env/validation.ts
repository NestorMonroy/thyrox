/**
 * Puerto de `ccnmt: packages/config/env/validation.ts` (47 líneas fuente).
 * Reimplementación fiel VERBATIM.
 *
 * Validador de entero acotado para variables de entorno. Valida una
 * variable de entorno contra un límite inferior/superior y devuelve un
 * resultado tipado; valores inválidos caen al default provisto con un log
 * de debug.
 */
import { tryGetConfigHostBindings } from '../host.ts'

export type EnvVarValidationResult = {
  effective: number
  status: 'valid' | 'capped' | 'invalid'
  message?: string
}

export function validateBoundedIntEnvVar(
  name: string,
  value: string | undefined,
  defaultValue: number,
  upperLimit: number,
): EnvVarValidationResult {
  if (!value) return { effective: defaultValue, status: 'valid' }
  const parsed = parseInt(value, 10)
  if (isNaN(parsed) || parsed <= 0) {
    const result: EnvVarValidationResult = {
      effective: defaultValue,
      status: 'invalid',
      message: `Invalid value "${value}" (using default: ${defaultValue})`,
    }
    tryGetConfigHostBindings().logDebug?.(`${name} ${result.message}`)
    return result
  }
  if (parsed > upperLimit) {
    const result: EnvVarValidationResult = {
      effective: upperLimit,
      status: 'capped',
      message: `Capped from ${parsed} to ${upperLimit}`,
    }
    tryGetConfigHostBindings().logDebug?.(`${name} ${result.message}`)
    return result
  }
  return { effective: parsed, status: 'valid' }
}
