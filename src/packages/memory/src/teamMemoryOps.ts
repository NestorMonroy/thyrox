/**
 * Puerto de `ccnmt: packages/memory/src/teamMemoryOps.ts` (verbatim).
 */
import { isTeamMemPath } from './teamMemPaths.js'

// Inlineado desde src/tools/{FileEditTool,FileWriteTool} para mantener a
// este archivo hoja de Wave-2 sin dependencia de src/. Las constantes son
// cadenas estables con el nombre de la herramienta.
const FILE_EDIT_TOOL_NAME = 'Edit'
const FILE_WRITE_TOOL_NAME = 'Write'

export { isTeamMemPath }

/**
 * Verifica si el uso de una herramienta de búsqueda apunta a archivos de
 * memoria de equipo, examinando su ruta.
 */
export function isTeamMemorySearch(toolInput: unknown): boolean {
  const input = toolInput as
    | { path?: string; pattern?: string; glob?: string }
    | undefined
  if (!input) return false
  if (input.path && isTeamMemPath(input.path)) return true
  return false
}

/**
 * Verifica si el uso de una herramienta Write o Edit apunta a un archivo de
 * memoria de equipo.
 */
export function isTeamMemoryWriteOrEdit(
  toolName: string,
  toolInput: unknown,
): boolean {
  if (toolName !== FILE_WRITE_TOOL_NAME && toolName !== FILE_EDIT_TOOL_NAME) {
    return false
  }
  const input = toolInput as { file_path?: string; path?: string } | undefined
  const filePath = input?.file_path ?? input?.path
  return filePath !== undefined && isTeamMemPath(filePath)
}

/**
 * Agrega partes del resumen de memoria de equipo al arreglo `parts`.
 * Encapsula toda la lógica verbo/cadena de memoria de equipo para
 * getSearchReadSummaryText.
 */
export function appendTeamMemorySummaryParts(
  memoryCounts: {
    teamMemoryReadCount?: number
    teamMemorySearchCount?: number
    teamMemoryWriteCount?: number
  },
  isActive: boolean,
  parts: string[],
): void {
  const teamReadCount = memoryCounts.teamMemoryReadCount ?? 0
  const teamSearchCount = memoryCounts.teamMemorySearchCount ?? 0
  const teamWriteCount = memoryCounts.teamMemoryWriteCount ?? 0
  if (teamReadCount > 0) {
    const verb = isActive
      ? parts.length === 0 ? 'Recalling' : 'recalling'
      : parts.length === 0 ? 'Recalled' : 'recalled'
    parts.push(
      `${verb} ${teamReadCount} team ${teamReadCount === 1 ? 'memory' : 'memories'}`,
    )
  }
  if (teamSearchCount > 0) {
    const verb = isActive
      ? parts.length === 0 ? 'Searching' : 'searching'
      : parts.length === 0 ? 'Searched' : 'searched'
    parts.push(`${verb} team memories`)
  }
  if (teamWriteCount > 0) {
    const verb = isActive
      ? parts.length === 0 ? 'Writing' : 'writing'
      : parts.length === 0 ? 'Wrote' : 'wrote'
    parts.push(
      `${verb} ${teamWriteCount} team ${teamWriteCount === 1 ? 'memory' : 'memories'}`,
    )
  }
}
