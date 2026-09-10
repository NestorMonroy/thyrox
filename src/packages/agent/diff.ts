/**
 * Constantes y helper puro de diff — porte de `ccnmt: packages/agent/diff.ts`.
 *
 * PORTE PARCIAL, declarado a propósito. La fuente exporta además
 * `countLinesChanged`, `getPatchFromContents` y `getPatchForDisplay`, que
 * dependen de la librería `diff` (npm) y de cuatro paquetes del monorepo de
 * origen —`@claude-code-how-works/local-observability`,
 * `@claude-code-how-works/app-host/bootstrap/state.js`,
 * `@claude-code-how-works/tool-registry` (tipos y utilidades) y
 * `@claude-code-how-works/storage/file.js`— ninguno presente en este árbol.
 * Lo único con test asignado aquí es el helper puro
 * (`adjustHunkLineNumbers`) y sus dos constantes; portar el resto exigiría
 * antes portar esos cuatro paquetes, que no son responsabilidad de este
 * porte. Se declara en vez de fabricar un porte parcial en silencio
 * (`porte-completo-no-parcial.md`).
 *
 * El tipo `StructuredPatchHunk` de la librería `diff` se declara aquí en
 * forma mínima —sólo los cuatro campos que `adjustHunkLineNumbers` toca—
 * para no depender de esa librería.
 */

export const CONTEXT_LINES = 3
export const DIFF_TIMEOUT_MS = 5_000

/** Forma mínima del hunk de un patch estructurado — ver nota de porte parcial arriba. */
export type StructuredPatchHunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

/**
 * Desplaza los números de línea de un hunk. Se usa cuando el diff se
 * calculó sobre una rebanada del archivo (p. ej. `readEditContext`) en vez
 * del archivo entero — quien llama pasa `ctx.lineOffset - 1` para convertir
 * de relativo-a-la-rebanada a relativo-al-archivo.
 */
export function adjustHunkLineNumbers(
  hunks: StructuredPatchHunk[],
  offset: number,
): StructuredPatchHunk[] {
  if (offset === 0) return hunks
  return hunks.map(h => ({
    ...h,
    oldStart: h.oldStart + offset,
    newStart: h.newStart + offset,
  }))
}
