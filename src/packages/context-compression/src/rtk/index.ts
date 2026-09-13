/**
 * Registro de filtros RTK y su punto de entrada -- `applyRtk`. El registro
 * inicial cubre los comandos que este mismo arbol produce en sus tool_result
 * mas ruidosos: git (status/diff/log), pytest, `bun test`, `tsc`, y una
 * reserva generica. El resto de los 49 filtros de OmniRoute (docker, aws,
 * kubectl, terraform, linters de otros lenguajes, etc.) queda DEFERIDO --
 * declarado en `package.json`, no omitido en silencio -- porque este arbol
 * no ejecuta ninguno de esos comandos hoy. Ampliar el registro es agregar un
 * archivo a `filters/` y una linea aqui.
 */
import type { RtkFilter, LineFilterResult } from './types.ts'
import { applyLineFilter } from './lineFilter.ts'
import { selectFilter } from './commandDetector.ts'
import { gitStatus } from './filters/gitStatus.ts'
import { gitDiff } from './filters/gitDiff.ts'
import { gitLog } from './filters/gitLog.ts'
import { testPytest } from './filters/testPytest.ts'
import { testBun } from './filters/testBun.ts'
import { buildTypescript } from './filters/buildTypescript.ts'
import { genericOutput } from './filters/genericOutput.ts'

export const RTK_FILTERS: RtkFilter[] = [
  gitStatus,
  gitDiff,
  gitLog,
  testPytest,
  testBun,
  buildTypescript,
  genericOutput,
]

export type RtkApplyResult = LineFilterResult & { filtroId: string | null; confianza: number }

/**
 * Selecciona el filtro que mejor matchea y lo aplica. Si ninguno matchea
 * (confianza 0), devuelve el texto sin tocar -- RTK sólo actua sobre salida
 * que reconoce, nunca "a ciegas" sobre texto arbitrario (esa es tarea de
 * Lite, ver `../lite.ts`).
 */
export function applyRtk(texto: string, comando?: string | null): RtkApplyResult {
  const seleccion = selectFilter(texto, RTK_FILTERS, comando)
  if (!seleccion) {
    return { texto, lineasQuitadas: 0, reglasAplicadas: [], filtroId: null, confianza: 0 }
  }
  const resultado = applyLineFilter(texto, seleccion.filtro)
  return { ...resultado, filtroId: seleccion.filtro.id, confianza: seleccion.deteccion.confianza }
}

export { applyLineFilter, stripAnsi } from './lineFilter.ts'
export { selectFilter, detectCommandFromText } from './commandDetector.ts'
export { smartTruncate } from './smartTruncate.ts'
export type { RtkFilter, LineFilterResult, CommandDetectionResult } from './types.ts'
