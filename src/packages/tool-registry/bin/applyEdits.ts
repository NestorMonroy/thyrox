#!/usr/bin/env bun
/**
 * Aplica propuestas de edición sin tocar disco, con el aplicador de la
 * herramienta `Edit`: lo usa el lazo de `tsc` (`src/verify/file_edits.py`)
 * para construir el candidato de un porte de módulo.
 *
 * Entrada (stdin): `{"files": [{"path", "content": string | null, "edits":
 * [{old_string, new_string, replace_all?}]}]}` — `content` null es «el
 * archivo no existe».
 * Salida (stdout): `{"results": [{"path", "updatedFile"} | {"path", "error"}]}`.
 *
 * No hay una segunda implementación: la validación es la de
 * `FileEditTool.validateInput` en su orden (`FileEditTool.ts`) y la
 * aplicación es `getPatchForEdits` (`utils.ts`), el porte de `F` del binario
 * 2.1.281 (`chunk-0tkc8jg2.js`).
 *
 * Divergencia declarada: los mensajes llevan sólo su primera línea. La
 * herramienta añade `String: <old_string>` y, para un archivo ausente, el
 * directorio de trabajo; aquí no hay sesión ni directorio que nombrar.
 */
import { findActualString, getPatchForEdits } from '../src/tools/FileEditTool/utils.js'
import type { FileEdit } from '../src/tools/FileEditTool/types.js'

type ProposedFile = { path: string; content: string | null; edits: FileEdit[] }
type Result = { path: string; updatedFile: string } | { path: string; error: string }

/** Las reglas de `validateInput` que no dependen de sesión ni de disco. */
export function validateFirstEdit(content: string | null, edit: FileEdit): string | null {
  const { old_string, new_string, replace_all = false } = edit
  if (old_string === new_string) {
    return 'No changes to make: old_string and new_string are exactly the same.'
  }
  if (content === null) return old_string === '' ? null : 'File does not exist.'
  if (old_string === '') {
    return content.trim() === '' ? null : 'Cannot create new file - file already exists.'
  }
  const actual = findActualString(content, old_string)
  if (!actual) return 'String to replace not found in file.'
  const matches = content.split(actual).length - 1
  if (matches > 1 && !replace_all) {
    return `Found ${matches} matches of the string to replace, but replace_all is false. To replace all occurrences, set replace_all to true. To replace only one occurrence, please provide more context to uniquely identify the instance.`
  }
  return null
}

export function applyProposedFile(file: ProposedFile): Result {
  const first = file.edits[0]
  if (!first) return { path: file.path, error: 'No edits.' }
  const reason = validateFirstEdit(file.content, first)
  if (reason !== null) return { path: file.path, error: reason }
  const edits = file.edits.map(e => ({ ...e, replace_all: e.replace_all ?? false }))
  try {
    const { updatedFile } = getPatchForEdits({ filePath: file.path, fileContents: file.content ?? '', edits })
    return { path: file.path, updatedFile }
  } catch (error) {
    return { path: file.path, error: error instanceof Error ? error.message : String(error) }
  }
}

if (import.meta.main) {
  const input = JSON.parse(await Bun.stdin.text()) as { files: ProposedFile[] }
  process.stdout.write(JSON.stringify({ results: input.files.map(applyProposedFile) }))
}
