/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/permission/src/pathValidation.ts`
 * (478 líneas, 11 exports, licencia UNLICENSED — reimplementación, no
 * copia). El objetivo de este pase es `expandTilde`, consumidor real
 * confirmado en
 * `@thyrox/app-host/src/runtime/installPluginBindings.ts:355`
 * (`const { expandTilde } = require('@thyrox/permission/pathValidation.js')`).
 *
 * PORTADAS (6 de 11):
 *
 *   `FileOperationType` · `PathCheckResult` · `ResolvedPathCheckResult`
 *   (los tres tipos, sin dependencias) · `formatDirectoryList` ·
 *   `getGlobBaseDirectory` · `expandTilde` (el objetivo del pase)
 *
 * OMITIDAS (5 de 11), declaradas por nombre, línea y bloqueo:
 *
 *   - `isPathInSandboxWriteAllowlist` (pathValidation.ts:93-131) —
 *     bloqueada por `SandboxManager`
 *     (`@claude-code-how-works/shell/sandbox.js`, subsistema no portado).
 *   - `isPathAllowed` (pathValidation.ts:133-262), `validateGlobPattern`
 *     (pathValidation.ts:262-324), `isDangerousRemovalPath`
 *     (pathValidation.ts:324-366), `validatePath` (pathValidation.ts:366-478)
 *     — las cuatro dependen de seis funciones de `./filesystem.js`
 *     (`checkEditableInternalPath`, `checkPathSafetyForAutoEdit`,
 *     `checkReadableInternalPath`, `matchingRuleForInput`,
 *     `pathInAllowedWorkingPath`, `pathInWorkingPath`) que ese hermano
 *     declaró omitidas por la misma regla de seguridad (ver el docstring
 *     de `filesystem.ts`: toda guarda embarcada necesita un test negativo
 *     contra una ruta real fuera del árbol permitido, y esas seis dependen
 *     de `SandboxManager`/`containsVulnerableUncPath`, no portados). Sin
 *     esas seis, estas cuatro no tienen sobre qué apoyarse.
 *
 * Divergencia medida y documentada en `expandTilde`: la fuente lo importa
 * de `@claude-code-how-works/config/utils/expandTilde.js` y lo
 * re-exporta — ese archivo YA ESTÁ PORTADO en este árbol
 * (`@thyrox/config/utils/expandTilde.ts`, verificado leyendo su fuente:
 * misma firma, mismo cuerpo). No se importa desde ahí porque el
 * especificador `@thyrox/*` no resuelve todavía (falta `"workspaces"` en
 * la raíz) y este es un valor (no un tipo, no se borra en tiempo de
 * ejecución) — envolverlo en un `require()` diferido para una función de
 * 10 líneas sin dependencias añadiría una capa de indirección que no
 * compra nada. Se inlinea aquí, verbatim contra la fuente confirmada.
 */
import { homedir } from 'node:os'

const MAX_DIRS_TO_LIST = 5
const GLOB_PATTERN_REGEX = /[*?[\]{}]/

export type FileOperationType = 'read' | 'write' | 'create'

// `decisionReason` es `unknown` aquí, no el `PermissionDecisionReason` real
// de la fuente (`PermissionResult.ts`, discriminated union grande, no leído
// ni portado en este pase — nada del subconjunto portado construye este
// campo). Fabricar una forma sin haberla verificado sería peor que
// declararla desconocida.
export type PathCheckResult = {
  allowed: boolean
  decisionReason?: unknown
}

export type ResolvedPathCheckResult = PathCheckResult & {
  resolvedPath: string
}

export function formatDirectoryList(directories: string[]): string {
  const dirCount = directories.length

  if (dirCount <= MAX_DIRS_TO_LIST) {
    return directories.map(dir => `'${dir}'`).join(', ')
  }

  const firstDirs = directories
    .slice(0, MAX_DIRS_TO_LIST)
    .map(dir => `'${dir}'`)
    .join(', ')

  return `${firstDirs}, and ${dirCount - MAX_DIRS_TO_LIST} more`
}

function getPlatformDeferred(): string {
  return process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux'
}

/**
 * Extrae el directorio base de un patrón glob. P. ej. "/ruta/a/*.txt"
 * devuelve "/ruta/a".
 */
export function getGlobBaseDirectory(path: string): string {
  const globMatch = path.match(GLOB_PATTERN_REGEX)
  if (!globMatch || globMatch.index === undefined) {
    return path
  }

  const beforeGlob = path.substring(0, globMatch.index)

  const lastSepIndex =
    getPlatformDeferred() === 'windows'
      ? Math.max(beforeGlob.lastIndexOf('/'), beforeGlob.lastIndexOf('\\'))
      : beforeGlob.lastIndexOf('/')
  if (lastSepIndex === -1) return '.'

  return beforeGlob.substring(0, lastSepIndex) || '/'
}

/**
 * Expande el `~` inicial de una ruta al directorio home del usuario.
 * `~usuario` NO se expande, por seguridad.
 */
export function expandTilde(path: string): string {
  if (
    path === '~' ||
    path.startsWith('~/') ||
    (process.platform === 'win32' && path.startsWith('~\\'))
  ) {
    return homedir() + path.slice(1)
  }
  return path
}
