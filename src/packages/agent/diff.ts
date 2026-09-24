/**
 * Diff de archivos para mostrar y contar cambios.
 *
 * Procedencia: `ccnmt: packages/agent/diff.ts`, contrastado con el binario
 * 2.1.275 (`chunk-q2gh92k2.js`, bloque que abre con `var R4e=3,Cxe=5000`).
 * Se reproduce el contrato, no el cuerpo:
 *
 * - `getPatchFromContents` (`ODe`): el patch entre dos contenidos. Escapa `&`
 *   y `$` con marcas antes de difear y las deshace en las líneas del
 *   resultado; `rawText` omite ese viaje, `convertTabs` pasa además las
 *   tabulaciones iniciales a espacios, y `singleHunk` usa un contexto de
 *   100 000 líneas para que todo el cambio quede en un hunk.
 * - `getPatchForDisplay` (`xB`): aplica las ediciones de una herramienta sobre
 *   el texto ya escapado —la primera aparición, o todas con `replace_all`— y
 *   reemplaza con una FUNCIÓN, así que un `$&` del texto nuevo no se
 *   interpreta como patrón de `String.replace`.
 * - `countLinesChanged` (`pre`): cuenta las líneas `+` y `-`, las suma al total
 *   de la sesión y al contador de líneas, y emite `tengu_file_changed`. Con un
 *   patch vacío cuenta el contenido entero.
 *
 * Divergencia declarada: en 2.1.275 `countLinesChanged` recibe el modelo como
 * segundo argumento y lo etiqueta en el contador. Los llamadores de este árbol
 * usan la forma de la referencia —`countLinesChanged(patch)` y
 * `countLinesChanged([], contenido)`—, y adoptar el orden del binario haría
 * que ese contenido se leyera como un nombre de modelo sin error. Se conserva
 * la forma de la referencia y el contador va sin la etiqueta de modelo.
 */
import { structuredPatch } from 'diff'
import { addToTotalLinesChanged, getLocCounter } from '@thyrox/app-host/bootstrap/state.js'
import { convertLeadingTabsToSpaces } from '@thyrox/storage/file.js'
import { logEvent } from './internal/logging.js'

export const CONTEXT_LINES = 3
export const DIFF_TIMEOUT_MS = 5_000

/** Un hunk de patch estructurado, con la forma de la librería `diff`. */
export type StructuredPatchHunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

/** Una edición de herramienta: el mismo contrato que `FileEditTool`. */
export type FileEdit = {
  old_string: string
  new_string: string
  replace_all?: boolean
}

const AMPERSAND_TOKEN = '<<:AMPERSAND_TOKEN:>>'
const DOLLAR_TOKEN = '<<:DOLLAR_TOKEN:>>'

function escapeForDiff(text: string): string {
  return text.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN)
}

function unescapeFromDiff(text: string): string {
  return text.replaceAll(AMPERSAND_TOKEN, '&').replaceAll(DOLLAR_TOKEN, '$')
}

/** Líneas de un texto: separadores de línea más uno, cero si está vacío. */
function lineCount(text: string | undefined): number {
  if (!text) return 0
  return text.split('\n').length
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

/**
 * Cuenta las líneas añadidas y retiradas de un patch y las registra en el
 * total de la sesión, en el contador de líneas y en `tengu_file_changed`.
 */
export function countLinesChanged(
  patch: StructuredPatchHunk[],
  newFileContent?: string,
  oldFileContent?: string,
): void {
  let added = 0
  let removed = 0
  if (patch.length === 0 && (newFileContent || oldFileContent)) {
    added = lineCount(newFileContent)
    removed = lineCount(oldFileContent)
  } else {
    for (const hunk of patch) {
      for (const line of hunk.lines) {
        if (line.startsWith('+')) added++
        else if (line.startsWith('-')) removed++
      }
    }
  }
  addToTotalLinesChanged(added, removed)
  getLocCounter()?.add(added, { type: 'added' })
  getLocCounter()?.add(removed, { type: 'removed' })
  logEvent('tengu_file_changed', { lines_added: added, lines_removed: removed })
}

/** El patch entre dos contenidos del mismo archivo. */
export function getPatchFromContents({
  filePath,
  oldContent,
  newContent,
  ignoreWhitespace = false,
  singleHunk = false,
  convertTabs = false,
  rawText = false,
}: {
  filePath: string
  oldContent: string
  newContent: string
  ignoreWhitespace?: boolean
  singleHunk?: boolean
  convertTabs?: boolean
  rawText?: boolean
}): StructuredPatchHunk[] {
  const prepare = rawText
    ? (text: string) => text
    : convertTabs
      ? (text: string) => escapeForDiff(convertLeadingTabsToSpaces(text))
      : escapeForDiff
  const patch = structuredPatch(filePath, filePath, prepare(oldContent), prepare(newContent), undefined, undefined, {
    ignoreWhitespace,
    context: singleHunk ? 100_000 : CONTEXT_LINES,
    timeout: DIFF_TIMEOUT_MS,
  })
  if (!patch) return []
  if (rawText) return patch.hunks
  return patch.hunks.map(hunk => ({ ...hunk, lines: hunk.lines.map(unescapeFromDiff) }))
}

/** El patch que resulta de aplicar `edits` a `fileContents`, para mostrarlo. */
export function getPatchForDisplay({
  filePath,
  fileContents,
  edits,
  ignoreWhitespace = false,
}: {
  filePath: string
  fileContents: string
  edits: FileEdit[]
  ignoreWhitespace?: boolean
}): StructuredPatchHunk[] {
  const original = escapeForDiff(convertLeadingTabsToSpaces(fileContents))
  const edited = edits.reduce((text, edit) => {
    const oldText = escapeForDiff(convertLeadingTabsToSpaces(edit.old_string))
    const newText = escapeForDiff(convertLeadingTabsToSpaces(edit.new_string))
    return edit.replace_all ? text.replaceAll(oldText, () => newText) : text.replace(oldText, () => newText)
  }, original)
  const patch = structuredPatch(filePath, filePath, original, edited, undefined, undefined, {
    context: CONTEXT_LINES,
    ignoreWhitespace,
    timeout: DIFF_TIMEOUT_MS,
  })
  if (!patch) return []
  return patch.hunks.map(hunk => ({ ...hunk, lines: hunk.lines.map(unescapeFromDiff) }))
}
