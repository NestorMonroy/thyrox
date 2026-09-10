/**
 * Recorta la salida de una tarea a lo que cabe en una respuesta del API.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/task/outputFormatting.ts`
 * (38 líneas). Ese árbol declara `"license": "UNLICENSED"`: se reimplementa el
 * contrato, no se copia el cuerpo.
 *
 * Se conserva la COLA, no la cabeza: en la salida de un trabajo largo lo que
 * importa es cómo terminó —el error, el resumen, el código de salida—, no cómo
 * arrancó. Y el recorte se anuncia con la ruta del archivo completo, así que la
 * cifra recortada nunca se lee como la salida entera.
 *
 * El límite se puede subir por entorno hasta un tope duro, no sin él: una
 * variable mal puesta no debe poder empujar megabytes al contexto del modelo.
 */

import { validateBoundedIntEnvVar } from '@thyrox/config/env/validation'
import { getTaskOutputPath } from '@thyrox/storage/task/diskOutput.js'

/** Tope duro: ni la variable de entorno puede pasar de aquí. */
export const TASK_MAX_OUTPUT_UPPER_LIMIT = 160_000

/** Lo que se emite cuando nadie declara nada. */
export const TASK_MAX_OUTPUT_DEFAULT = 32_000

export function getMaxTaskOutputLength(): number {
  return validateBoundedIntEnvVar(
    'TASK_MAX_OUTPUT_LENGTH',
    process.env.TASK_MAX_OUTPUT_LENGTH,
    TASK_MAX_OUTPUT_DEFAULT,
    TASK_MAX_OUTPUT_UPPER_LIMIT,
  ).effective
}

export function formatTaskOutput(
  output: string,
  taskId: string,
): { content: string; wasTruncated: boolean } {
  const maxLength = getMaxTaskOutputLength()
  if (output.length <= maxLength) {
    return { content: output, wasTruncated: false }
  }

  const header = `[Truncated. Full output: ${getTaskOutputPath(taskId)}]\n\n`
  const availableSpace = maxLength - header.length
  return { content: header + output.slice(-availableSpace), wasTruncated: true }
}
