/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/permission/src/pathValidation.ts`
 * (478 líneas, 11 exports, licencia UNLICENSED — reimplementación, no
 * copia). El objetivo de este pase es `expandTilde`, consumidor real
 * confirmado en
 * `@thyrox/app-host/src/runtime/installPluginBindings.ts:355`
 * (`const { expandTilde } = require('@thyrox/permission/pathValidation.js')`).
 *
 * PORTADAS (7 de 11):
 *
 *   `FileOperationType` · `PathCheckResult` · `ResolvedPathCheckResult`
 *   (los tres tipos, sin dependencias) · `formatDirectoryList` ·
 *   `getGlobBaseDirectory` · `expandTilde` (el objetivo del pase) ·
 *   `isDangerousRemovalPath` (contrato de `D4e` del binario 2.1.275).
 *
 * OMITIDAS (4 de 11), declaradas por nombre, línea y bloqueo:
 *
 *   - `isPathInSandboxWriteAllowlist` (pathValidation.ts:93-131) —
 *     bloqueada por `SandboxManager`
 *     (`@claude-code-how-works/shell/sandbox.js`, subsistema no portado).
 *   - `isPathAllowed` (pathValidation.ts:133-262), `validateGlobPattern`
 *     (pathValidation.ts:262-324), `validatePath` (pathValidation.ts:366-478)
 *     — las tres dependen de seis funciones de `./filesystem.js`
 *     (`checkEditableInternalPath`, `checkPathSafetyForAutoEdit`,
 *     `checkReadableInternalPath`, `matchingRuleForInput`,
 *     `pathInAllowedWorkingPath`, `pathInWorkingPath`) que ese hermano
 *     declaró omitidas por la misma regla de seguridad (ver el docstring
 *     de `filesystem.ts`).
 *
 * Corregido al portar `isDangerousRemovalPath`: este encabezado la listaba
 * entre las que dependen de `./filesystem.js`, y el binario lo refuta. `D4e`
 * es autocontenida: sólo lee la plataforma, el home y la resolución de
 * enlaces del home. Ninguna de las seis funciones de `filesystem.js` aparece
 * en su cuerpo.
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
import { dirname } from 'node:path'
import { getPlatform } from '@thyrox/config/platform.js'
import { getFsImplementation, safeResolvePath } from '@thyrox/storage/fsOperations.js'

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

// Raíz de unidad de Windows (`C:`, `C:/`) y su hijo directo (`C:/Windows`).
const DRIVE_ROOT = /^[A-Za-z]:\/?$/
const DRIVE_CHILD = /^[A-Za-z]:\/[^/]+$/

// Plegado de mayúsculas del binario: además de `toLowerCase`, lleva la `ı`
// sin punto y la `ſ` larga a su forma ASCII, para que no sirvan de disfraz.
function foldCase(path: string): string {
  return path.toLowerCase().replace(/\u0131/g, 'i').replace(/\u017f/g, 's')
}

function toForwardSlashes(path: string): string {
  return path.replace(/[\\/]+/g, '/')
}

// El home canónico —tras resolver enlaces— por valor de home: el binario lo
// memoiza porque `realpath` toca el disco y la guarda corre por comando.
const canonicalHomeByHome = new Map<string, string>()
function canonicalHome(home: string): string {
  const cached = canonicalHomeByHome.get(home)
  if (cached !== undefined) return cached
  const resolved = toForwardSlashes(
    safeResolvePath(getFsImplementation(), home).resolvedPath,
  ).replace(/\/$/, '')
  canonicalHomeByHome.set(home, resolved)
  return resolved
}

/**
 * ¿Es peligroso borrar esta ruta? Comodines, la raíz y sus hijos directos,
 * raíces e hijos directos de unidad, y el home —literal o canónico—.
 * En macOS, `/private/{etc,var,tmp,home}` se lee como su alias sin `/private`.
 */
export function isDangerousRemovalPath(path: string): boolean {
  const slashed = toForwardSlashes(path)
  if (slashed === '*' || slashed.endsWith('/*')) return true

  const isMac = getPlatform() === 'macos'
  const unprivate = (p: string): string =>
    isMac ? p.replace(/^\/private\/(etc|var|tmp|home)(\/|$)/i, '/$1$2') : p
  const normalized = unprivate(slashed)
  const trimmed = normalized === '/' ? normalized : normalized.replace(/\/$/, '')

  if (trimmed === '/') return true
  if (DRIVE_ROOT.test(trimmed)) return true

  const home = unprivate(toForwardSlashes(homedir())).replace(/\/$/, '')
  if (foldCase(trimmed) === foldCase(home)) return true
  const canonical = canonicalHome(homedir())
  if (canonical !== home && foldCase(trimmed) === foldCase(canonical)) return true

  if (dirname(trimmed) === '/') return true
  if (DRIVE_CHILD.test(trimmed)) return true
  return false
}
