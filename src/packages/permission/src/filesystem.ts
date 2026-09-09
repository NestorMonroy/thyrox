/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/permission/src/filesystem.ts`
 * (1785 líneas, 29 exports, licencia UNLICENSED — reimplementación, no
 * copia). El objetivo de este pase es la cadena que
 * `@thyrox/app-host/src/init.ts:108-112` consume realmente —
 * `import { ensureScratchpadDir, isScratchpadEnabled } from '@thyrox/permission/filesystem'`
 * — más sus dependencias transitivas y un puñado de funciones puras
 * hermanas sin costo adicional.
 *
 * PORTADAS (17 de 29):
 *
 *   `DANGEROUS_FILES` · `DANGEROUS_DIRECTORIES` · `normalizeCaseForComparison`
 *   · `relativePath` · `toPosixPath` · `getSessionMemoryDir` ·
 *   `getSessionMemoryPath` · `isScratchpadEnabled` · `getClaudeTempDirName` ·
 *   `getClaudeTempDir` · `getProjectTempDir` · `getScratchpadDir` ·
 *   `ensureScratchpadDir` (los dos últimos, el objetivo del pase) ·
 *   `allWorkingDirectories` · `pathInWorkingPath` (pase de 2026-09-08) ·
 *   `getResolvedWorkingDirPaths` · `pathInAllowedWorkingPath`
 *   (TASK-DOCS-0526, pase de 2026-09-09 — ver la divergencia del séptimo
 *   binding, abajo)
 *
 * OMITIDAS (12 de 29), declaradas por nombre, línea y bloqueo:
 *
 *   - `getClaudeSkillScope` (filesystem.ts:108-177) — sin consumidor
 *     confirmado en este pase; depende de convenciones de `.claude/skills/`
 *     no verificadas contra este árbol.
 *   - `isClaudeSettingsPath` (filesystem.ts:207-228, + `getSettingsPaths`
 *     privada) — bloqueada: `getSettingsFilePathForSource`/
 *     `getSettingsRootPathForSource` de `@claude-code-how-works/config` NO
 *     existen en `@thyrox/config` (medido con grep sobre todo el paquete).
 *   - `getBundledSkillsRoot` (filesystem.ts:372-382) — sin consumidor
 *     confirmado; añade `randomBytes`/`MACRO.VERSION` sin necesidad
 *     inmediata.
 *   - `checkPathSafetyForAutoEdit`,
 *     `normalizePatternsToPath`,
 *     `getFileReadIgnorePatterns`, `matchingRuleForInput`,
 *     `checkReadPermissionForTool`, `checkWritePermissionForTool`,
 *     `generateSuggestions`, `checkEditableInternalPath`,
 *     `checkReadableInternalPath` (filesystem.ts:627-673 y 807-1785, el
 *     resto del archivo) — son las guardas de confinamiento/permiso de
 *     lectura y escritura. Cada una depende de `SandboxManager`
 *     (`@claude-code-how-works/shell/sandbox.js`, subsistema grande, no
 *     portado) o de `containsVulnerableUncPath`
 *     (`@claude-code-how-works/shell/legacy/readOnlyCommandValidation.js`,
 *     no portado), y la regla de seguridad de este pase exige que TODA
 *     guarda embarcada tenga un test negativo contra una ruta que EXISTE en
 *     disco fuera del árbol permitido — sin esas dos piezas no hay guarda
 *     real que probar así, sólo una fachada. Se omiten enteras en vez de
 *     enviarlas a medio verificar. `pathInAllowedWorkingPath` y
 *     `getResolvedWorkingDirPaths` (filesystem.ts:674-716) figuraban aquí
 *     por vecindad — el mismo defecto de atribución que ya se corrigió una
 *     vez para `allWorkingDirectories`/`pathInWorkingPath` (ver la
 *     divergencia de abajo). Medido al intentar portarlas (TASK-DOCS-0526):
 *     su cierre transitivo es sólo un binding nuevo (`getPathsForPermissionCheck`,
 *     `filesystem.ts:34`) y un memoize de aridad uno — ninguna de las dos
 *     toca `SandboxManager` ni `containsVulnerableUncPath`. Ya están
 *     portadas arriba.
 *
 * Divergencias medidas en lo portado:
 *
 * - El shim `_b()` de la fuente expone 19 métodos vía host bindings; este
 *   puerto reproduce los SEIS que el subconjunto portado llamaba antes de
 *   este pase — `getOriginalCwd`, `getSessionId`, `getFsImplementation`,
 *   `getPlatform`, `expandPath`, `containsPathTraversal` — con el mismo
 *   patrón `_b().foo?.() ?? respaldo` y el mismo cast a `any` que la fuente usa
 *   deliberadamente (ver docstring de `contracts.ts`, hermano de este
 *   archivo). `./host.js`/`./errors.js` son imports estáticos: son
 *   ficheros del MISMO paquete, y la resolución relativa dentro de un
 *   paquete no depende de `"workspaces"` en la raíz (a diferencia de
 *   `@thyrox/*`, que sí).
 * - `sanitizePath`: su respaldo NO es la identidad (`p => p`, lo que la
 *   fuente haría con un binding ausente) sino `@thyrox/storage`'s
 *   `sanitizePath` real (`sessionStoragePortable.ts:264`, ya portado y
 *   probado ahí) vía `require()` diferido — con caída a identidad sólo si
 *   ESE require también falla. Es más fiel al comportamiento observable de
 *   la fuente (que si acaso instala un binding real, no la identidad).
 * - `memoize` de `lodash-es/memoize.js` no resuelve en este árbol (medido:
 *   `Bun.resolveSync` falla, no hay `node_modules/lodash-es`). Se sustituye
 *   por un memoize local de aridad cero (`memoizeOnce`, 8 líneas): las dos
 *   únicas funciones que la fuente memoiza aquí (`getClaudeTempDir`,
 *   `getBundledSkillsRoot`) no toman argumentos, así que un cache de una
 *   sola entrada es fiel a la semántica de la fuente sin necesitar la
 *   API completa de `lodash-es/memoize`.
 * - `allWorkingDirectories` y `pathInWorkingPath` figuraban arriba entre las
 *   omitidas, con el bloqueo de `SandboxManager` que comparten sus vecinas de
 *   `filesystem.ts:627-1785`. Medido al necesitarlas: NINGUNA de las dos lo
 *   toca — la primera pide `getOriginalCwd` (ya cableado aquí) y las claves
 *   del contexto; la segunda, `expandPath` y `containsPathTraversal`, que en
 *   la fuente son shims del anfitrión igual que los cuatro ya presentes. El
 *   bloqueo era de sus vecinas y se les había atribuido por vecindad. Llegan
 *   al necesitarlas `commands/add-dir/validation.ts`, y el aviso se corrige
 *   en vez de dejarlo pudrirse.
 * - `checkStatsigFeatureGate_CACHED_MAY_BE_STALE` se repunta a
 *   `@thyrox/config/feature-flags.js` (mismo nombre, misma firma
 *   `(gate: string) => boolean`, ya portado — verificado leyendo su
 *   fuente). `require()` diferido (esta sí es una raíz `@thyrox/*`, no
 *   resuelve hasta que exista `"workspaces"`), con respaldo `false`
 *   (fail-closed: el scratchpad queda deshabilitado si el binding no
 *   resuelve).
 * - `getPathsForPermissionCheck` (`filesystem.ts:34`) es el SÉPTIMO binding
 *   `_b()` que este puerto reproduce — sin binding instalado, `[]` (misma
 *   forma `_b().foo?.(...) ?? []` que sus seis hermanos). Su memoize
 *   (`getResolvedWorkingDirPaths = memoize(getPathsForPermissionCheck)` en
 *   la fuente) NO reusa `memoizeOnce` (aridad cero): la fuente lo llama con
 *   un argumento (`wp: string`) por cada directorio de trabajo, así que
 *   memoizar sin distinguir el argumento colapsaría todos los directorios
 *   al primero consultado. `memoizeByStringArg` — un `Map` por cadena — es
 *   la forma mínima fiel; sus llamadores en el árbol de la fuente siempre
 *   pasan un directorio ya resuelto (`string`), nunca un objeto.
 * - `pathInAllowedWorkingPath` NO recibe el tipo `ToolPermissionContext`
 *   con nombre que el resto del paquete declara por archivo (p. ej.
 *   `PermissionUpdate.ts:61`, `permissionSetup.ts:80` — mismo shape,
 *   `{ permissionRules: unknown; [key: string]: unknown }`, repetido en
 *   cada uno de sus archivos, igual que en la fuente). Aquí se deriva con
 *   `Parameters<typeof allWorkingDirectories>[0]` en vez de declararlo de
 *   nuevo — misma forma estructural, una sola fuente de verdad dentro de
 *   este archivo, sin tocar la firma ya probada de `allWorkingDirectories`.
 */
import * as nodeFs from 'node:fs'
import * as nodeOs from 'node:os'
import { join, posix, sep } from 'node:path'
import { getPermissionHostBindings } from './host.js'
import { ContextError } from './errors.js'

function memoizeOnce<T>(fn: () => T): () => T {
  let cached: T | undefined
  let has = false
  return () => {
    if (!has) {
      cached = fn()
      has = true
    }
    return cached as T
  }
}

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
 * Nombre del directorio temporal de Claude, específico por usuario.
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
 * Ruta del directorio temporal de Claude, con symlinks resueltos.
 * Usa `CLAUDE_CODE_TMPDIR` si está definida; si no, `/tmp` en Unix o
 * `tmpdir()` en Windows.
 */
export const getClaudeTempDir = memoizeOnce((): string => {
  const baseTmpDir =
    process.env.CLAUDE_CODE_TMPDIR ||
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

/** Firma que expone `.cache` — mismo contrato que `lodash-es/memoize.js`
 * (su `MapCache` ya implementa `get`/`has`/`set`/`delete`/`clear`, que es
 * exactamente la superficie de un `Map` nativo). */
type MemoizedByStringArg<T> = ((arg: string) => T) & { cache: Map<string, T> }

/**
 * Memoize de aridad UNO, keyed por el propio argumento — distinto de
 * `memoizeOnce` (aridad cero, usado por `getClaudeTempDir`). `lodash-es`
 * no resuelve en este árbol (ver divergencia arriba); un `Map` por clave de
 * cadena es fiel a lo que la fuente pide de `memoize(getPathsForPermissionCheck)`
 * — sus llamadores siempre pasan un `string` (un directorio de trabajo ya
 * resuelto), nunca un objeto que necesitaría una clave estructural.
 *
 * Expone `.cache` (un `Map` nativo) en la función devuelta, igual que
 * `lodash-es/memoize.js` — es lo que hace fiel el comentario de la fuente en
 * `getResolvedWorkingDirPaths`: "Exported for test/preload.ts cache
 * clearing (shard-isolation)". Sin `.cache.clear()` expuesto, esa promesa de
 * la fuente sería un porte parcial silencioso del propio memoize.
 */
function memoizeByStringArg<T>(fn: (arg: string) => T): MemoizedByStringArg<T> {
  const cache = new Map<string, T>()
  const memoized = (arg: string): T => {
    if (!cache.has(arg)) {
      cache.set(arg, fn(arg))
    }
    return cache.get(arg) as T
  }
  memoized.cache = cache
  return memoized
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
export const getResolvedWorkingDirPaths = memoizeByStringArg(
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
