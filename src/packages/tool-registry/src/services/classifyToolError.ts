/**
 * Clasifica el error de una herramienta en una etiqueta apta para telemetría.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/services/classifyToolError.ts`
 * (40 líneas). Ese árbol declara `"license": "UNLICENSED"`: se reimplementa el
 * contrato, no se copia el cuerpo.
 *
 * El problema que resuelve es de compilación, no de diseño: en un build
 * minificado `error.constructor.name` queda como un identificador de tres
 * letras —`nJT`, `Chq`— que no dice nada en un tablero. Así que la etiqueta se
 * compone de lo que SÍ sobrevive al minificador:
 *
 *   1. `TelemetrySafeError` — su `telemetryMessage` ya está vetado por quien lo
 *      construyó, y se emite recortado.
 *   2. Error de `fs` — su `code` (`ENOENT`, `EACCES`) es un literal del runtime.
 *   3. Nombre de error propio, cuando es largo y no es el genérico `Error`. El
 *      umbral de longitud es lo que separa un nombre real de un identificador
 *      mangleado.
 *   4. Sin ninguno de los tres: `Error` — que es menos informativo pero no
 *      MIENTE, y es lo que un nombre de tres letras sí haría.
 *
 * Vive aparte de la ejecución de la herramienta para romper un ciclo: la
 * telemetría del resultado depende de esta función, y la ejecución depende de
 * la telemetría.
 */

import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from '@thyrox/local-observability/errorHelpers.js'

/** Longitud máxima del mensaje ya vetado que se emite. */
const TELEMETRY_MESSAGE_LIMIT = 200

/** Longitud máxima del nombre de error que se emite. */
const ERROR_NAME_LIMIT = 60

/**
 * Longitud a partir de la cual un nombre de error se considera real y no un
 * identificador mangleado por el minificador.
 */
const MANGLED_NAME_LENGTH = 3

export function classifyToolError(error: unknown): string {
  if (
    error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    return error.telemetryMessage.slice(0, TELEMETRY_MESSAGE_LIMIT)
  }

  if (error instanceof Error) {
    const errnoCode = getErrnoCode(error)
    if (typeof errnoCode === 'string') {
      return `Error:${errnoCode}`
    }
    const { name } = error
    if (name && name !== 'Error' && name.length > MANGLED_NAME_LENGTH) {
      return name.slice(0, ERROR_NAME_LIMIT)
    }
    return 'Error'
  }

  return 'UnknownError'
}
