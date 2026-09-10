/**
 * Porte fiel de `ccnmt: packages/shell/src/providers/outputLimits.ts`.
 *
 * Porte COMPLETO: los tres símbolos exportados de la fuente están
 * presentes.
 *
 * Divergencia medida: la fuente importa `validateBoundedIntEnvVar` de
 * `@claude-code-how-works/config/env/validation` — ese archivo
 * (`env/validation.ts`) NO existe en `@thyrox/config`. Su única
 * dependencia propia, `tryGetConfigHostBindings`, SÍ existe y resuelve
 * (`@thyrox/config/host`), así que aquí se reimplementa fielmente en
 * vez de bloquear: la lógica es idéntica a la fuente (`ccnmt:
 * packages/config/env/validation.ts`), sólo cambia dónde vive.
 *
 * @module
 */
import { tryGetConfigHostBindings } from '@thyrox/config/host'

type EnvVarValidationResult = {
  effective: number
  status: 'valid' | 'capped' | 'invalid'
  message?: string
}

function validateBoundedIntEnvVar(
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
      message: `Valor inválido "${value}" (usando el default: ${defaultValue})`,
    }
    tryGetConfigHostBindings().logDebug?.(`${name} ${result.message}`)
    return result
  }
  if (parsed > upperLimit) {
    const result: EnvVarValidationResult = {
      effective: upperLimit,
      status: 'capped',
      message: `Acotado de ${parsed} a ${upperLimit}`,
    }
    tryGetConfigHostBindings().logDebug?.(`${name} ${result.message}`)
    return result
  }
  return { effective: parsed, status: 'valid' }
}

export const BASH_MAX_OUTPUT_UPPER_LIMIT = 150_000
export const BASH_MAX_OUTPUT_DEFAULT = 30_000

export function getMaxOutputLength(): number {
  const result = validateBoundedIntEnvVar(
    'BASH_MAX_OUTPUT_LENGTH',
    process.env.BASH_MAX_OUTPUT_LENGTH,
    BASH_MAX_OUTPUT_DEFAULT,
    BASH_MAX_OUTPUT_UPPER_LIMIT,
  )
  return result.effective
}
