/**
 * Porte de `ccnmt: packages/permission/src/filesystem.ts` (1785 líneas, 29
 * exports, licencia UNLICENSED — reimplementación, no copia). Sus 29 exports
 * están aquí o se reexportan desde el módulo que los aloja:
 *
 *   aquí       `DANGEROUS_FILES` · `DANGEROUS_DIRECTORIES` ·
 *              `normalizeCaseForComparison` · `relativePath` · `toPosixPath` ·
 *              `getSessionMemoryDir` · `getSessionMemoryPath` ·
 *              `isScratchpadEnabled` · `getClaudeTempDirName` ·
 *              `getClaudeTempDir` · `getProjectTempDir` · `getScratchpadDir` ·
 *              `ensureScratchpadDir` · `allWorkingDirectories` ·
 *              `pathInWorkingPath` · `getResolvedWorkingDirPaths` ·
 *              `pathInAllowedWorkingPath` (TASK-DOCS-0526)
 *   reexport   `matchingRuleForInput` · `getFileReadIgnorePatterns` ·
 *              `normalizePatternsToPath` (`./ruleMatching.ts`) ·
 *              `checkPathSafetyForAutoEdit` · `isSettingsFilePath`
 *              (`./pathSafety.ts`) · `checkEditableInternalPath` ·
 *              `checkReadableInternalPath` · `getBundledSkillsRoot`
 *              (`./internalPaths.ts`) · `checkReadPermissionForTool` ·
 *              `checkWritePermissionForTool` · `generateSuggestions` ·
 *              `getClaudeSkillScope` (`./fileToolPermissions.ts`, desde el
 *              contrato de 2.1.275: `_w`, `Wy`, `gyt`, `ku`)
 *
 * `init.ts` de `@thyrox/app-host` consume `ensureScratchpadDir` e
 * `isScratchpadEnabled`.
 *
 * Divergencias medidas:
 *
 * - El shim `_b()` de la fuente expone 19 métodos vía host bindings; este
 *   puerto reproduce los SIETE que llama —`getOriginalCwd`, `getSessionId`,
 *   `getFsImplementation`, `getPlatform`, `expandPath`,
 *   `containsPathTraversal` y `getPathsForPermissionCheck`
 *   (`filesystem.ts:34`)— con el mismo patrón `_b().foo?.() ?? respaldo` y el
 *   mismo cast a `any` que la fuente usa deliberadamente (ver el docstring de
 *   `contracts.ts`). Sin binding instalado, `getPathsForPermissionCheck` da
 *   `[]`.
 * - `sanitizePath`: su respaldo NO es la identidad (`p => p`, lo que la
 *   fuente haría con un binding ausente) sino el `sanitizePath` real de
 *   `@thyrox/storage` (`sessionStoragePortable.ts`) vía `require()` diferido,
 *   con caída a identidad sólo si ESE require también falla. Es más fiel al
 *   comportamiento observable de la fuente, que instala un binding real.
 * - `checkStatsigFeatureGate_CACHED_MAY_BE_STALE` se lee de
 *   `@thyrox/config/feature-flags.js` (mismo nombre y firma
 *   `(gate: string) => boolean`) por `require()` diferido, con respaldo
 *   `false`: si no resuelve, el scratchpad queda deshabilitado.
 * - `pathInAllowedWorkingPath` deriva su contexto con
 *   `Parameters<typeof allWorkingDirectories>[0]` en vez de declarar otra vez
 *   el `ToolPermissionContext` que cada archivo del paquete repite (igual que
 *   la fuente): misma forma estructural, una sola fuente de verdad aquí.
 */
import memoize from 'lodash-es/memoize.js'
import * as nodeFs from 'node:fs'
import * as nodeOs from 'node:os'
import { join, posix, sep } from 'node:path'
import { getPermissionHostBindings } from './host.js'
import { ContextError } from './errors.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _b = () => getPermissionHostBindings() as any

function getOriginalCwdDeferred(): string {
  try {
    return _b().getOriginalCwd?.() ?? process.cwd()
  } catch {
    return process.cwd()
  }
}

function getSessionIdDeferred(): string {
  try {
    return _b().getSessionId?.() ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function getFsImplementationDeferred(): typeof nodeFs {
  try {
    return _b().getFsImplementation?.() ?? nodeFs
  } catch {
    return nodeFs
  }
}

function getPlatformDeferred(): string {
  try {
    const bound = _b().getPlatform?.()
    if (bound) return bound
  } catch {
    // sigue al respaldo local
  }
  return process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux'
}

function sanitizePathDeferred(path: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/storage/sessionStoragePortable.js') as { sanitizePath: (p: string) => string }).sanitizePath(path)
  } catch {
    return path
  }
}

function checkStatsigFeatureGateDeferred(gate: string): boolean {
  try {
    return (
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@thyrox/config/feature-flags.js') as {
        checkStatsigFeatureGate_CACHED_MAY_BE_STALE: (gate: string) => boolean
      }
    ).checkStatsigFeatureGate_CACHED_MAY_BE_STALE(gate)
  } catch {
    return false
  }
}

function windowsPathToPosixPath(p: string): string {
  return p.replace(/\\/g, '/')
}

/** Archivos peligrosos de proteger de edición automática. */
export const DANGEROUS_FILES = [
  '.gitconfig',
  '.gitmodules',
  '.bashrc',
  '.bash_profile',
  '.zshrc',
  '.zprofile',
  '.profile',
  '.ripgreprc',
  '.mcp.json',
  '.claude.json',
] as const

/** Directorios peligrosos de proteger de edición automática. */
export const DANGEROUS_DIRECTORIES = ['.git', '.vscode', '.idea', '.claude'] as const

export function normalizeCaseForComparison(path: string): string {
  return path.toLowerCase()
}

export function relativePath(from: string, to: string): string {
  if (getPlatformDeferred() === 'windows') {
    return posix.relative(windowsPathToPosixPath(from), windowsPathToPosixPath(to))
  }
  return posix.relative(from, to)
}

export function toPosixPath(path: string): string {
  if (getPlatformDeferred() === 'windows') {
    return windowsPathToPosixPath(path)
  }
  return path
}

/**
 * Directorio de memoria de sesión, con separador final.
 * Formato: `{projectDir}/{sessionId}/session-memory/`
 *
 * Divergencia: `getProjectDir(getCwd())` de la fuente se simplifica a
 * `getOriginalCwd()` — `getProjectDir` (resuelto del cwd a un directorio de
 * proyecto canónico) es una pieza del subsistema no portado en este pase;
 * usar el cwd directamente es una aproximación conservadora documentada,
 * no una omisión silenciosa.
 */
export function getSessionMemoryDir(): string {
  return join(getOriginalCwdDeferred(), getSessionIdDeferred(), 'session-memory') + sep
}

export function getSessionMemoryPath(): string {
  return join(getSessionMemoryDir(), 'summary.md')
}

/**
 * ¿Está habilitada la característica de scratchpad? Gobernada por el gate
 * Statsig `tengu_scratch`.
 */
export function isScratchpadEnabled(): boolean {
  return checkStatsigFeatureGateDeferred('tengu_scratch')
}

/**
 * Nombre del directorio temporal de thyrox, específico por usuario.
 * En Unix: `claude-{uid}` (evita conflictos de permisos multi-usuario).
 * En Windows: `claude` (`tmpdir()` ya es por usuario).
 */
export function getClaudeTempDirName(): string {
  if (getPlatformDeferred() === 'windows') {
    return 'claude'
  }
  const uid = process.getuid?.() ?? 0
  return `claude-${uid}`
}

/**
 * Ruta del directorio temporal de thyrox, con symlinks resueltos.
 * Usa `THYROX_CODE_TMPDIR` si está definida; si no, `/tmp` en Unix o
 * `tmpdir()` en Windows.
 */
export const getClaudeTempDir = memoize((): string => {
  const baseTmpDir =
    process.env.THYROX_CODE_TMPDIR ||
    (getPlatformDeferred() === 'windows' ? nodeOs.tmpdir() : '/tmp')

  const fs = getFsImplementationDeferred()
  let resolvedBaseTmpDir = baseTmpDir
  try {
    resolvedBaseTmpDir = fs.realpathSync(baseTmpDir)
  } catch {
    // Si la resolución falla, se usa la ruta original.
  }

  return join(resolvedBaseTmpDir, getClaudeTempDirName()) + sep
})

/**
 * Ruta del directorio temporal del proyecto, con separador final.
 * Formato: `/tmp/claude-{uid}/{cwd-sanitizado}/`
 */
export function getProjectTempDir(): string {
  return join(getClaudeTempDir(), sanitizePathDeferred(getOriginalCwdDeferred())) + sep
}

/**
 * Ruta del directorio scratchpad de la sesión actual.
 * Formato: `/tmp/claude-{uid}/{cwd-sanitizado}/{sessionId}/scratchpad/`
 */
export function getScratchpadDir(): string {
  return join(getProjectTempDir(), getSessionIdDeferred(), 'scratchpad')
}

/**
 * Asegura que el directorio scratchpad exista para la sesión actual, con
 * permisos restringidos (0o700). Es el objetivo confirmado de este pase —
 * consumido por `@thyrox/app-host/src/init.ts`.
 * @throws {ContextError} si la característica scratchpad no está habilitada.
 */
export async function ensureScratchpadDir(signal?: AbortSignal): Promise<string> {
  // `signal` no se usa en el cuerpo — misma firma que la fuente, sin
  // reenviarlo (la fuente tampoco lo reenvía a `fs.mkdir`).
  void signal
  if (!isScratchpadEnabled()) {
    throw new ContextError('Scratchpad directory feature is not enabled')
  }

  const fs = getFsImplementationDeferred()
  const scratchpadDir = getScratchpadDir()

  await fs.promises.mkdir(scratchpadDir, { recursive: true, mode: 0o700 })

  return scratchpadDir
}


// ---------------------------------------------------------------------------
// Directorios de trabajo — `filesystem.ts:674-751` de la fuente.
//
// Llegan en un pase posterior al resto del módulo porque su consumidor
// (`commands/add-dir/validation.ts`) no existía. El bloqueo era NUESTRO, no
// de la fuente: este archivo declara un porte parcial de 13 de 29 símbolos, y
// éstos dos estaban entre los 16 que faltaban.
// ---------------------------------------------------------------------------

/** Igual que en la fuente: los dos salen del anfitrión, con respaldo inerte. */
function expandPathDeferred(p: string, cwd?: string): string {
  return _b().expandPath?.(p, cwd ?? getOriginalCwdDeferred()) ?? p
}

function containsPathTraversalDeferred(p: string): boolean {
  return _b().containsPathTraversal?.(p) ?? false
}

/**
 * Séptimo binding `_b()` reproducido (de 19) — `filesystem.ts:34` de la
 * fuente. Sin binding instalado, `[]` — que es lo que hace vacuamente
 * `.every()` sobre `pathsToCheck` cuando nadie lo instala (ver el caso de
 * control en `pathInAllowedWorkingPath.test.ts`).
 */
function getPathsForPermissionCheckDeferred(path: string): string[] {
  try {
    return _b().getPathsForPermissionCheck?.(path) ?? []
  } catch {
    return []
  }
}

/**
 * Todos los directorios de trabajo de una sesión.
 *
 * El cwd original SIEMPRE está, aunque el contexto no declare ninguno: sin él
 * una sesión recién abierta no podría leer su propio proyecto. Es un conjunto
 * porque un adicional puede coincidir con el cwd, y contarlo dos veces haría
 * que el mensaje de «ya está cubierto» dependiera del orden.
 */
export function allWorkingDirectories(context: {
  additionalWorkingDirectories: Map<string, unknown>
  [key: string]: unknown
}): Set<string> {
  return new Set([
    getOriginalCwdDeferred(),
    ...context.additionalWorkingDirectories.keys(),
  ])
}

type ToolPermissionContext = Parameters<typeof allWorkingDirectories>[0]

/**
 * Directorios de trabajo resueltos y memoizados — misma cadena que la
 * fuente documenta: son estables por sesión, así que memoizar evita repetir
 * `existsSync`/`lstatSync`/`realpathSync` en cada verificación de permiso.
 * Exportado (como en la fuente) para que un test/preload pueda limpiar la
 * caché entre shards.
 */
export const getResolvedWorkingDirPaths = memoize(
  getPathsForPermissionCheckDeferred,
)

/**
 * ¿Está `path` dentro de ALGÚN directorio de trabajo permitido?
 *
 * `precomputedPathsToCheck` existe para evitar recomputar
 * `existsSync`/`lstatSync`/`realpathSync` cuando el llamador ya calculó las
 * rutas a verificar antes (la fuente lo hilvana
 * `checkWritePermissionForTool` → `checkPathSafetyForAutoEdit` →
 * `pathInAllowedWorkingPath`, tres sitios que en este árbol NO se portan —
 * ver el docstring del módulo). Sin él, se recomputa aquí mismo.
 *
 * Vacuo por diseño: si `pathsToCheck` queda vacío (sin el binding
 * `getPathsForPermissionCheck` instalado, o con un `path` cuyo binding
 * decide que no hay nada que verificar), `.every()` sobre un arreglo vacío
 * es `true` — la fuente hace exactamente lo mismo. No es un fail-open del
 * puerto: es el comportamiento documentado de la fuente cuando el anfitrión
 * no declara el binding.
 */
export function pathInAllowedWorkingPath(
  path: string,
  toolPermissionContext: ToolPermissionContext,
  precomputedPathsToCheck?: readonly string[],
): boolean {
  const pathsToCheck =
    precomputedPathsToCheck ?? getPathsForPermissionCheckDeferred(path)

  const workingPaths = Array.from(
    allWorkingDirectories(toolPermissionContext),
  ).flatMap(wp => getResolvedWorkingDirPaths(wp))

  return pathsToCheck.every(pathToCheck =>
    workingPaths.some(workingPath =>
      pathInWorkingPath(pathToCheck, workingPath),
    ),
  )
}

/**
 * Si una ruta cae DENTRO de un directorio de trabajo.
 *
 * La dirección importa y no es simétrica: la hija está dentro del padre, y el
 * padre no está dentro de la hija. Sin esa asimetría, declarar un directorio
 * de trabajo hondo autorizaría todo lo que está por encima de él.
 *
 * Dos normalizaciones antes de comparar, y las dos son de seguridad:
 *
 * 1. Los enlaces de macOS (`/private/var` → `/var`, `/private/tmp` → `/tmp`),
 *    porque el sistema entrega unas veces una forma y otras la otra.
 * 2. La caja, porque en un sistema de archivos que no la distingue —macOS,
 *    Windows— comparar con caja permitiría esquivar la comprobación
 *    escribiendo `.cLauDe` en vez de `.claude`.
 */
export function pathInWorkingPath(path: string, workingPath: string): boolean {
  const absolutePath = expandPathDeferred(path)
  const absoluteWorkingPath = expandPathDeferred(workingPath)

  const normalizedPath = absolutePath
    .replace(/^\/private\/var\//, '/var/')
    .replace(/^\/private\/tmp(\/|$)/, '/tmp$1')
  const normalizedWorkingPath = absoluteWorkingPath
    .replace(/^\/private\/var\//, '/var/')
    .replace(/^\/private\/tmp(\/|$)/, '/tmp$1')

  const caseNormalizedPath = normalizeCaseForComparison(normalizedPath)
  const caseNormalizedWorkingPath = normalizeCaseForComparison(
    normalizedWorkingPath,
  )

  const relative = relativePath(caseNormalizedWorkingPath, caseNormalizedPath)

  if (relative === '') return true
  if (containsPathTraversalDeferred(relative)) return false

  // Una relativa absoluta significa que no hay camino de uno a otro.
  return !posix.isAbsolute(relative)
}

// El compilador de reglas de archivo de 2.1.275 vive en su propio módulo;
// los consumidores lo importan desde aquí, como en la fuente.
export { checkPathSafetyForAutoEdit, isSettingsFilePath } from './pathSafety.js'
export {
  checkEditableInternalPath,
  checkReadableInternalPath,
  getBundledSkillsRoot,
} from './internalPaths.js'
export {
  getFileReadIgnorePatterns,
  matchingRuleForInput,
  normalizePatternsToPath,
} from './ruleMatching.js'
export {
  checkReadPermissionForTool,
  checkWritePermissionForTool,
  generateSuggestions,
  getClaudeSkillScope,
} from './fileToolPermissions.js'
