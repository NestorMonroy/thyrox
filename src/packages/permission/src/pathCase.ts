/**
 * Pliegue de mayúsculas para comparar rutas, en un módulo hoja.
 *
 * Vive aparte de `ruleMatching` porque `pathSafety` lo necesita y no puede
 * importar `ruleMatching`: esa arista cerraba el ciclo
 * `pathSafety → ruleMatching → permissions → … → internalPaths → pathSafety`,
 * e `internalPaths` leía `SENSITIVE_FILES` antes de que `pathSafety` la
 * inicializara cuando la carga entraba por `pathSafety`. Este módulo no
 * importa nada, así que no puede volver a formar parte de un ciclo.
 */

/** Pliegue de mayúsculas para comparar rutas (≙ `_o`). */
export function foldPathCase(path: string): string {
  return path.toLowerCase().replace(/ı/g, 'i').replace(/ſ/g, 's')
}
