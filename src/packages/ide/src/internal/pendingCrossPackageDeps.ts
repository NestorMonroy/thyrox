/**
 * Sustitutos locales para `@thyrox/ide`, en dos familias — igual que
 * `@thyrox/storage: src/internal/pendingCrossPackageDeps.ts` y
 * `@thyrox/config: internal/pendingCrossPackageDeps.ts`:
 *
 * 1. **Envoltorios de `require()` diferido** hacia paquetes hermanos que YA
 *    existen en este árbol (`config`, `local-observability`, `storage`,
 *    `app-host`, `agent`, `shell`). `@thyrox/*` resuelve desde este paquete,
 *    así que cada envoltorio llama al símbolo REAL ya portado —no es un stub
 *    que sustituya conducta— y se retira importándolo de forma estática.
 *
 * 2. **Reimplementación fiel recortada** de símbolos que NO existen en
 *    NINGÚN paquete hermano de este árbol todavía — el paquete completo
 *    (`tool-registry`) o el archivo concreto dentro de un paquete existente
 *    (`agent/jetbrains.ts`, `shell/genericProcessUtils.ts`,
 *    `config/plugin/{lspPluginIntegration,pluginLoader,types}.ts`,
 *    `config/env/paths.ts`, `config/semver.ts`, y las tres funciones de
 *    `agent/diff.ts`/`tool-registry/tools/FileEditTool/utils.ts` que
 *    `useDiffInIDE.ts` necesita). Cada bloque cita su origen en `ccnmt` y
 *    declara qué se omitió del archivo fuente y por qué.
 *
 * Y un tercer caso, aparte: `callIdeRpc` (`mcp-runtime/clientRuntime.ts`) —
 * punto de inyección con valor por defecto que lanza, porque ese módulo
 * está bloqueado incluso DENTRO de `@thyrox/mcp-runtime` (13 de 48 símbolos,
 * por ausencia de `tool-registry`; ver el `description` de su
 * `package.json`). Reimplementar `callMCPTool` aquí duplicaría un mecanismo
 * de 3179 líneas que no le pertenece a `ide`.
 */

import { homedir, platform as nodePlatform } from 'node:os'
import { join as pathJoin } from 'node:path'
import type { StructuredPatchHunk } from '@thyrox/agent/diff.js'
import type { IdeType } from '../ide.js'

// ─────────────────────────────────────────────────────────────────────────
// 1. Envoltorios de require() diferido — el paquete hermano YA existe
// ─────────────────────────────────────────────────────────────────────────

export function requireAppHostBootstrapCwd(): {
  getCwd: () => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/bootstrap/cwd.js')
}

/**
 * `getOriginalCwd` — sí existe en `@thyrox/app-host/bootstrap/state.ts`
 * (verificado: `export function getOriginalCwd(): string`). `getIsScrollDraining`
 * NO está en ese mismo archivo (porte parcial de otro agente) — se envuelve
 * aparte como punto de inyección más abajo, no aquí, para que su ausencia sea
 * visible en el call-site en vez de silenciosa.
 */
export function requireAppHostBootstrapState(): {
  getOriginalCwd: () => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/bootstrap/state.js')
}

export function requireConfigEnvUtils(): {
  isEnvTruthy: (envVar: string | boolean | undefined) => boolean
  readEnv: (name: string) => string | undefined
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/env/utils')
}

export function requireConfigPlatform(): {
  getPlatform: () => 'macos' | 'windows' | 'wsl' | 'linux' | 'unknown'
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/platform')
}

export function requireConfigSleep(): {
  sleep: (
    ms: number,
    signal?: AbortSignal,
    opts?: { throwOnAbort?: boolean; abortError?: () => Error; unref?: boolean },
  ) => Promise<void>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config/sleep')
}

export function requireStorageFsOperations(): {
  getFsImplementation: () => {
    readdir: (
      p: string,
    ) => Promise<Array<{ name: string; isDirectory(): boolean; isSymbolicLink(): boolean }>>
    stat: (p: string) => Promise<{ mtime: Date }>
    readFile: (p: string, opts?: { encoding?: string }) => Promise<string>
    readFileSync: (p: string, opts?: { encoding?: string }) => string
    unlink: (p: string) => Promise<void>
    cwd: () => string
    createWriteStream: (p: string) => NodeJS.WritableStream
  }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/fsOperations.js')
}

export function requireStoragePath(): {
  expandPath: (path: string, baseDir?: string) => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/path.js')
}

export function requireStorageFileRead(): {
  readFileSync: (filePath: string) => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/fileRead.js')
}

export function requireAgentAbortController(): {
  createAbortController: (maxListeners?: number) => AbortController
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/agent/abortController.js')
}

export function requireShellSubprocessEnv(): {
  subprocessEnv: () => NodeJS.ProcessEnv
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/shell/subprocessEnv.js')
}

export function requireShellExecFileNoThrow(): {
  execFileNoThrow: (
    command: string,
    args: string[],
    opts?: { env?: NodeJS.ProcessEnv },
  ) => Promise<{ stdout: string; stderr: string; code: number; error?: string }>
  execFileNoThrowWithCwd: (
    command: string,
    args: string[],
    opts?: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number },
  ) => Promise<{ stdout: string; stderr: string; code: number; error?: string }>
  execSyncWithDefaults: (
    command: string,
    optionsOrAbortSignal?: unknown,
    timeout?: number,
  ) => string | null
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/shell/execFileNoThrow.js')
}

/**
 * A diferencia de los demás envoltorios de arriba, `logError`/`logForDebugging`
 * NUNCA dejan escalar el `require()` fallido — loguear es la única clase de
 * dependencia donde un fallback silencioso es correcto (mismo criterio que
 * `@thyrox/config: internal/pendingCrossPackageDeps.ts`).
 */
export function requireLocalObservabilityLogging(): {
  logError: (error: unknown) => void
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@thyrox/local-observability/logging')
  } catch {
    return { logError: (error: unknown) => console.error(error) }
  }
}

export function requireLocalObservabilityDebug(): {
  logForDebugging: (
    message: string,
    options?: { level?: 'warn' | 'error' },
  ) => void
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@thyrox/local-observability/debug.js')
  } catch {
    return { logForDebugging: () => {} }
  }
}

export function requireLocalObservabilityErrorHelpers(): {
  errorMessage: (e: unknown) => string
  toError: (e: unknown) => Error
  isENOENT: (e: unknown) => boolean
  isFsInaccessible: (e: unknown) => e is NodeJS.ErrnoException
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/local-observability/errorHelpers.js')
}

export function requireLocalObservabilitySlowOperations(): {
  jsonParse: typeof JSON.parse
  jsonStringify: typeof JSON.stringify
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/local-observability/slowOperations.js')
}

export function requireLocalObservabilityRoot(): {
  logEvent: (name: string, metadata?: Record<string, unknown>) => void
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@thyrox/local-observability')
  } catch {
    return { logEvent: () => {} }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 2b. Reimplementación fiel — config/env/paths.ts (`env`): su original,
//     `@thyrox/config/env`, cerraría un ciclo de módulos con este paquete
//     (`hooks/useIdeSelection.ts`). `ide.ts` sólo lee `env.terminal`; el
//     propio `@thyrox/config/env/dynamic.ts` ya degrada a `terminal: null`
//     cuando `./paths.js` no resuelve — aquí se reproduce esa MISMA rama
//     degradada. `envDynamic` sí se importa de `@thyrox/config/env/dynamic`.
// ─────────────────────────────────────────────────────────────────────────

export const env: { terminal: string | null } = { terminal: null }

// ─────────────────────────────────────────────────────────────────────────
// 2e. Reimplementación fiel — lodash-es/{memoize,capitalize}.js: siguiendo
//     el precedente de `@thyrox/storage` ("no se instala lodash-es"), se
//     sustituyen localmente en vez de declarar una dependencia npm nueva.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mismo contrato que `lodash-es/memoize.js`: llave = primer argumento, salvo
 * que se dé un `resolver` — entonces la llave es lo que el resolver devuelva
 * para esos mismos argumentos (usado por `ide.ts:detectHostIP`, que memoiza
 * por el par `isIdeRunningInWindows:port`, no sólo por el primer booleano).
 */
export function memoize<Args extends unknown[], Result>(
  f: (...args: Args) => Result,
  resolver?: (...args: Args) => unknown,
): (...args: Args) => Result {
  const cache = new Map<unknown, Result>()
  return (...args: Args): Result => {
    const key = resolver ? resolver(...args) : args[0]
    if (cache.has(key)) return cache.get(key) as Result
    const result = f(...args)
    cache.set(key, result)
    return result
  }
}

// homonym capitalize: 2.1.283 (`chunk-5t3x93y6.js`, `QPt = x4`) usa la de lodash, que baja el resto a minúsculas; `@thyrox/output/utils/stringUtils.js` no lo hace (`str.charAt(0).toUpperCase() + str.slice(1)`), así que importarla cambiaría `toIDEDisplayName`.
/** Mismo contrato que `lodash-es/capitalize.js`: primera letra en mayúscula, resto en minúscula. */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// ─────────────────────────────────────────────────────────────────────────
// 2f. Reimplementación fiel — shell/genericProcessUtils.ts: el archivo no
//     existe en `@thyrox/shell` (confirmado con `find`, no sólo con
//     `Bun.resolveSync`). Recorte a los dos símbolos que `ide.ts` usa —
//     `killProcessTree`/`getChildPids`/`getAncestorCommandsAsync` quedan
//     fuera, ningún módulo de este porte los necesita.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Puerto de `ccnmt: packages/shell/src/genericProcessUtils.ts`
 * (`isProcessRunning`, verbatim). PID ≤ 1 devuelve `false` (0 es el grupo
 * de proceso actual, 1 es init). `process.kill(pid, 0)` lanza `EPERM`
 * cuando el proceso existe pero pertenece a otro usuario — se reporta como
 * "no corriendo", que es conservador para recuperación de locks (no se le
 * roba un lock vivo a otro usuario).
 */
export function isProcessRunning(pid: number): boolean {
  if (pid <= 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Puerto de `ccnmt: packages/shell/src/genericProcessUtils.ts`
 * (`getAncestorPidsAsync`, verbatim salvo la fuente de
 * `execFileNoThrowWithCwd`, que aquí llega por `require()` diferido).
 * Obtiene la cadena de PIDs ancestros (hasta `maxDepth` niveles) mediante un
 * único spawn de shell en vez de N llamadas secuenciales a `ps`.
 */
export async function getAncestorPidsAsync(
  pid: string | number,
  maxDepth = 10,
): Promise<number[]> {
  const { execFileNoThrowWithCwd } = requireShellExecFileNoThrow()

  if (process.platform === 'win32') {
    const script = `
      $pid = ${String(pid)}
      $ancestors = @()
      for ($i = 0; $i -lt ${maxDepth}; $i++) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$pid" -ErrorAction SilentlyContinue
        if (-not $proc -or -not $proc.ParentProcessId -or $proc.ParentProcessId -eq 0) { break }
        $pid = $proc.ParentProcessId
        $ancestors += $pid
      }
      $ancestors -join ','
    `.trim()

    const result = await execFileNoThrowWithCwd(
      'powershell.exe',
      ['-NoProfile', '-Command', script],
      { timeout: 3000 },
    )
    if (result.code !== 0 || !result.stdout?.trim()) {
      return []
    }
    return result.stdout
      .trim()
      .split(',')
      .filter(Boolean)
      .map(p => parseInt(p, 10))
      .filter(p => !isNaN(p))
  }

  const script = `pid=${String(pid)}; for i in $(seq 1 ${maxDepth}); do ppid=$(ps -o ppid= -p $pid 2>/dev/null | tr -d ' '); if [ -z "$ppid" ] || [ "$ppid" = "0" ] || [ "$ppid" = "1" ]; then break; fi; echo $ppid; pid=$ppid; done`

  const result = await execFileNoThrowWithCwd('sh', ['-c', script], {
    timeout: 3000,
  })
  if (result.code !== 0 || !result.stdout?.trim()) {
    return []
  }
  return result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(p => parseInt(p, 10))
    .filter(p => !isNaN(p))
}

// ─────────────────────────────────────────────────────────────────────────
// 2g. Reimplementación fiel — agent/jetbrains.ts: el archivo no existe en
//     `@thyrox/agent` (confirmado con `find`). Puerto COMPLETO de las 192
//     líneas fuente — es autocontenido salvo `storage/fsOperations.js`
//     (existe, vía require diferido de arriba) y `config/env/utils.js`'s
//     `readEnv` (idem). El `IdeType` de la fuente venía de `ide/ide.js`
//     (import cruzado hacia ESTE MISMO paquete en la fuente, porque
//     `jetbrains.ts` vive en `agent` en ccnmt) — aquí se usa el tipo local,
//     sin necesidad de romper ningún ciclo.
// ─────────────────────────────────────────────────────────────────────────

const JETBRAINS_PLUGIN_PREFIX = 'claude-code-how-works-jetbrains-plugin'

const JETBRAINS_IDE_NAME_TO_DIR: { [key: string]: string[] } = {
  pycharm: ['PyCharm'],
  intellij: ['IntelliJIdea', 'IdeaIC'],
  webstorm: ['WebStorm'],
  phpstorm: ['PhpStorm'],
  rubymine: ['RubyMine'],
  clion: ['CLion'],
  goland: ['GoLand'],
  rider: ['Rider'],
  datagrip: ['DataGrip'],
  appcode: ['AppCode'],
  dataspell: ['DataSpell'],
  aqua: ['Aqua'],
  gateway: ['Gateway'],
  fleet: ['Fleet'],
  androidstudio: ['AndroidStudio'],
}

/**
 * Construye las rutas de directorio de plugins comunes por plataforma. Ver
 * https://www.jetbrains.com/help/pycharm/directories-used-by-the-ide-to-store-settings-caches-plugins-and-logs.html#plugins-directory
 */
function buildCommonPluginDirectoryPaths(ideName: string): string[] {
  const homeDir = homedir()
  const directories: string[] = []
  const idePatterns = JETBRAINS_IDE_NAME_TO_DIR[ideName.toLowerCase()]
  if (!idePatterns) {
    return directories
  }

  const { readEnv } = requireConfigEnvUtils()
  const appData = readEnv('APPDATA') || pathJoin(homeDir, 'AppData', 'Roaming')
  const localAppData =
    readEnv('LOCALAPPDATA') || pathJoin(homeDir, 'AppData', 'Local')

  switch (nodePlatform()) {
    case 'darwin':
      directories.push(
        pathJoin(homeDir, 'Library', 'Application Support', 'JetBrains'),
        pathJoin(homeDir, 'Library', 'Application Support'),
      )
      if (ideName.toLowerCase() === 'androidstudio') {
        directories.push(
          pathJoin(homeDir, 'Library', 'Application Support', 'Google'),
        )
      }
      break

    case 'win32':
      directories.push(
        pathJoin(appData, 'JetBrains'),
        pathJoin(localAppData, 'JetBrains'),
        pathJoin(appData),
      )
      if (ideName.toLowerCase() === 'androidstudio') {
        directories.push(pathJoin(localAppData, 'Google'))
      }
      break

    case 'linux':
      directories.push(
        pathJoin(homeDir, '.config', 'JetBrains'),
        pathJoin(homeDir, '.local', 'share', 'JetBrains'),
      )
      for (const pattern of idePatterns) {
        directories.push(pathJoin(homeDir, '.' + pattern))
      }
      if (ideName.toLowerCase() === 'androidstudio') {
        directories.push(pathJoin(homeDir, '.config', 'Google'))
      }
      break
    default:
      break
  }

  return directories
}

/** Busca los directorios de plugin que realmente existen en disco. */
async function detectJetBrainsPluginDirectories(
  ideName: string,
): Promise<string[]> {
  const foundDirectories: string[] = []
  const fs = requireStorageFsOperations().getFsImplementation()

  const pluginDirPaths = buildCommonPluginDirectoryPaths(ideName)
  const idePatterns = JETBRAINS_IDE_NAME_TO_DIR[ideName.toLowerCase()]
  if (!idePatterns) {
    return foundDirectories
  }

  // Precompilado una sola vez — idePatterns es invariante entre baseDirs.
  const regexes = idePatterns.map(p => new RegExp('^' + p))

  for (const baseDir of pluginDirPaths) {
    try {
      const entries = await fs.readdir(baseDir)
      for (const regex of regexes) {
        for (const entry of entries) {
          if (!regex.test(entry.name)) continue
          // También acepta symlinks — dirent.isDirectory() es false para
          // symlinks, pero usuarios de GNU stow enlazan así sus configs de
          // JetBrains. Los fs.stat() posteriores filtran los que no apunten
          // a un directorio.
          if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
          const dir = pathJoin(baseDir, entry.name)
          // Linux es el único SO sin directorio de plugins separado.
          if (nodePlatform() === 'linux') {
            foundDirectories.push(dir)
            continue
          }
          const pluginDir = pathJoin(dir, 'plugins')
          try {
            await fs.stat(pluginDir)
            foundDirectories.push(pluginDir)
          } catch {
            // El directorio de plugins no existe, se omite.
          }
        }
      }
    } catch {
      // El readdir del directorio padre falló (no existe en esta
      // plataforma) — best-effort, no todos los layouts de config de
      // JetBrains están presentes.
    }
  }

  return foundDirectories.filter(
    (dir, index) => foundDirectories.indexOf(dir) === index,
  )
}

async function isJetBrainsPluginInstalled(ideType: IdeType): Promise<boolean> {
  const pluginDirs = await detectJetBrainsPluginDirectories(ideType)
  for (const dir of pluginDirs) {
    const pluginPath = pathJoin(dir, JETBRAINS_PLUGIN_PREFIX)
    try {
      await requireStorageFsOperations().getFsImplementation().stat(pluginPath)
      return true
    } catch {
      // El plugin no está en este directorio, se sigue con el próximo.
    }
  }
  return false
}

const jetBrainsPluginInstalledCache = new Map<IdeType, boolean>()
const jetBrainsPluginInstalledPromiseCache = new Map<IdeType, Promise<boolean>>()

async function isJetBrainsPluginInstalledMemoized(
  ideType: IdeType,
  forceRefresh = false,
): Promise<boolean> {
  if (!forceRefresh) {
    const existing = jetBrainsPluginInstalledPromiseCache.get(ideType)
    if (existing) {
      return existing
    }
  }
  const promise = isJetBrainsPluginInstalled(ideType).then(result => {
    jetBrainsPluginInstalledCache.set(ideType, result)
    return result
  })
  jetBrainsPluginInstalledPromiseCache.set(ideType, promise)
  return promise
}

export async function isJetBrainsPluginInstalledCached(
  ideType: IdeType,
  forceRefresh = false,
): Promise<boolean> {
  if (forceRefresh) {
    jetBrainsPluginInstalledCache.delete(ideType)
    jetBrainsPluginInstalledPromiseCache.delete(ideType)
  }
  return isJetBrainsPluginInstalledMemoized(ideType, forceRefresh)
}

/**
 * Devuelve el resultado en caché de `isJetBrainsPluginInstalled` de forma
 * síncrona. Devuelve `false` si el resultado todavía no se resolvió. Sólo
 * para contextos síncronos (p. ej. checks de `isActive` de status notices).
 */
export function isJetBrainsPluginInstalledCachedSync(ideType: IdeType): boolean {
  return jetBrainsPluginInstalledCache.get(ideType) ?? false
}

// ─────────────────────────────────────────────────────────────────────────
// 2h. Reimplementación fiel — agent/diff.ts (getPatchFromContents /
//     getPatchForDisplay) + tool-registry/tools/FileEditTool/utils.ts
//     (applyEditToFile / getPatchForEdits / getEditsForPatch).
//
//     `@thyrox/agent/diff.ts` YA existe pero es un PORTE PARCIAL declarado
//     a propósito (ver su propio docstring): sólo porta
//     `adjustHunkLineNumbers` + las dos constantes; `getPatchFromContents`/
//     `getPatchForDisplay` quedaron fuera porque exigían portar cuatro
//     paquetes hermanos primero. `useDiffInIDE.ts` SÍ las necesita, así que
//     se recortan aquí — mismo criterio que ese propio docstring describe
//     ("portar el resto exige antes portar esos paquetes, que no es
//     responsabilidad de ESE porte"; aquí sí lo es, para el subconjunto que
//     usamos).
//
//     `tool-registry/tools/FileEditTool/utils.ts` (775 líneas) no se porta
//     entero — sólo `applyEditToFile`/`getPatchForEdits`/`getEditsForPatch`,
//     que es lo que `useDiffInIDE.ts` importa. Quedan fuera (no las usa
//     ningún módulo de este paquete): `normalizeQuotes`, `stripTrailingWhitespace`,
//     `findActualString`, `preserveQuoteStyle`, `getPatchForEdit` (singular),
//     `getSnippetFor*`, `normalizeFileEditInput`, `areFileEdits*Equivalent`.
// ─────────────────────────────────────────────────────────────────────────

/** Puerto de `ccnmt: packages/storage/src/file.ts:125-130` (verbatim). */
function convertLeadingTabsToSpaces(content: string): string {
  if (!content.includes('\t')) return content
  return content.replace(/^\t+/gm, _ => '  '.repeat(_.length))
}

// El diff usa & y $ como tokens especiales en el reemplazo de String.replace;
// se escapan antes de correr `diff` y se desescapan después.
const AMPERSAND_TOKEN = '<<:AMPERSAND_TOKEN:>>'
const DOLLAR_TOKEN = '<<:DOLLAR_TOKEN:>>'

function escapeForDiff(s: string): string {
  return s.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN)
}

function unescapeFromDiff(s: string): string {
  return s.replaceAll(AMPERSAND_TOKEN, '&').replaceAll(DOLLAR_TOKEN, '$')
}

/** Puerto de `ccnmt: packages/agent/diff.ts` (`getPatchFromContents`, verbatim). */
export function getPatchFromContents({
  filePath,
  oldContent,
  newContent,
  ignoreWhitespace = false,
  singleHunk = false,
}: {
  filePath: string
  oldContent: string
  newContent: string
  ignoreWhitespace?: boolean
  singleHunk?: boolean
}): StructuredPatchHunk[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { structuredPatch } = require('diff') as typeof import('diff')
  const result = structuredPatch(
    filePath,
    filePath,
    escapeForDiff(oldContent),
    escapeForDiff(newContent),
    undefined,
    undefined,
    {
      ignoreWhitespace,
      context: singleHunk ? 100_000 : 3,
      timeout: 5_000,
    },
  )
  if (!result) {
    return []
  }
  return result.hunks.map(hunk => ({
    ...hunk,
    lines: hunk.lines.map(unescapeFromDiff),
  }))
}

type FileEditForPatch = {
  old_string: string
  new_string: string
  replace_all?: boolean
}

/** Puerto de `ccnmt: packages/agent/diff.ts` (`getPatchForDisplay`, verbatim). */
function getPatchForDisplay({
  filePath,
  fileContents,
  edits,
  ignoreWhitespace = false,
}: {
  filePath: string
  fileContents: string
  edits: FileEditForPatch[]
  ignoreWhitespace?: boolean
}): StructuredPatchHunk[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { structuredPatch } = require('diff') as typeof import('diff')
  const preparedFileContents = escapeForDiff(
    convertLeadingTabsToSpaces(fileContents),
  )
  const result = structuredPatch(
    filePath,
    filePath,
    preparedFileContents,
    edits.reduce((p, edit) => {
      const { old_string, new_string } = edit
      const replace_all = 'replace_all' in edit ? edit.replace_all : false
      const escapedOldString = escapeForDiff(
        convertLeadingTabsToSpaces(old_string),
      )
      const escapedNewString = escapeForDiff(
        convertLeadingTabsToSpaces(new_string),
      )
      return replace_all
        ? p.replaceAll(escapedOldString, () => escapedNewString)
        : p.replace(escapedOldString, () => escapedNewString)
    }, preparedFileContents),
    undefined,
    undefined,
    { context: 3, ignoreWhitespace, timeout: 5_000 },
  )
  if (!result) {
    return []
  }
  return result.hunks.map(hunk => ({
    ...hunk,
    lines: hunk.lines.map(unescapeFromDiff),
  }))
}

/**
 * Puerto de
 * `ccnmt: packages/tool-registry/src/tools/FileEditTool/utils.ts:206-232`
 * (`applyEditToFile`, verbatim).
 */
export function applyEditToFile(
  originalContent: string,
  oldString: string,
  newString: string,
  replaceAll = false,
): string {
  const f = replaceAll
    ? (content: string, search: string, replace: string) =>
        content.replaceAll(search, () => replace)
    : (content: string, search: string, replace: string) =>
        content.replace(search, () => replace)

  if (newString !== '') {
    return f(originalContent, oldString, newString)
  }

  const stripTrailingNewline =
    !oldString.endsWith('\n') && originalContent.includes(oldString + '\n')

  return stripTrailingNewline
    ? f(originalContent, oldString + '\n', newString)
    : f(originalContent, oldString, newString)
}

/**
 * Puerto de
 * `ccnmt: packages/tool-registry/src/tools/FileEditTool/utils.ts:262-322`
 * (`getPatchForEdits`, verbatim salvo el comentario de la optimización, que
 * ya está incorporado en la fuente).
 */
export function getPatchForEdits({
  filePath,
  fileContents,
  edits,
}: {
  filePath: string
  fileContents: string
  edits: FileEditForPatch[]
}): { patch: StructuredPatchHunk[]; updatedFile: string } {
  let updatedFile = fileContents
  const appliedNewStrings: string[] = []

  // Caso especial de archivo vacío.
  if (
    !fileContents &&
    edits.length === 1 &&
    edits[0] &&
    edits[0].old_string === '' &&
    edits[0].new_string === ''
  ) {
    const patch = getPatchForDisplay({
      filePath,
      fileContents,
      edits: [{ old_string: fileContents, new_string: updatedFile, replace_all: false }],
    })
    return { patch, updatedFile: '' }
  }

  for (const edit of edits) {
    const oldStringToCheck = edit.old_string.replace(/\n+$/, '')

    for (const previousNewString of appliedNewStrings) {
      if (
        oldStringToCheck !== '' &&
        previousNewString.includes(oldStringToCheck)
      ) {
        throw new Error(
          'Cannot edit file: old_string is a substring of a new_string from a previous edit.',
        )
      }
    }

    const previousContent = updatedFile
    updatedFile =
      edit.old_string === ''
        ? edit.new_string
        : applyEditToFile(
            updatedFile,
            edit.old_string,
            edit.new_string,
            edit.replace_all,
          )

    if (updatedFile === previousContent) {
      throw new Error('String not found in file. Failed to apply edit.')
    }

    appliedNewStrings.push(edit.new_string)
  }

  if (updatedFile === fileContents) {
    throw new Error(
      'Original and edited file match exactly. Failed to apply edit.',
    )
  }

  const patch = getPatchFromContents({
    filePath,
    oldContent: convertLeadingTabsToSpaces(fileContents),
    newContent: convertLeadingTabsToSpaces(updatedFile),
  })

  return { patch, updatedFile }
}

/**
 * Puerto de
 * `ccnmt: packages/tool-registry/src/tools/FileEditTool/utils.ts:495-522`
 * (`getEditsForPatch`, verbatim).
 */
export function getEditsForPatch(
  patch: StructuredPatchHunk[],
): FileEditForPatch[] {
  return patch.map(hunk => {
    const oldLines: string[] = []
    const newLines: string[] = []

    for (const line of hunk.lines) {
      if (line.startsWith(' ')) {
        oldLines.push(line.slice(1))
        newLines.push(line.slice(1))
      } else if (line.startsWith('-')) {
        oldLines.push(line.slice(1))
      } else if (line.startsWith('+')) {
        newLines.push(line.slice(1))
      }
    }

    return {
      old_string: oldLines.join('\n'),
      new_string: newLines.join('\n'),
      replace_all: false,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────
// 2i. Reimplementación fiel — config/plugin/lspPluginIntegration.ts /
//     pluginLoader.ts / types.ts: ninguno de los tres existe en
//     `@thyrox/config` (sólo `plugin/{builtin,pluginOperations,_deps}.ts`).
//     `lsp/config.ts` sólo necesita "sin plugins habilitados todavía" —
//     devolver una lista vacía es el mismo desenlace observable que
//     `loadAllPluginsCacheOnly()` tendría en un árbol sin plugins
//     registrados (la fuente misma trata "0 plugins" como caso normal, no
//     de error).
// ─────────────────────────────────────────────────────────────────────────

export type PluginErrorLike = { message: string }

export async function loadAllPluginsCacheOnly(): Promise<{
  enabled: Array<{ name: string }>
}> {
  return { enabled: [] }
}

export async function getPluginLspServers(
  _plugin: { name: string },
  _errors: PluginErrorLike[],
): Promise<Record<string, unknown>> {
  return {}
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Punto de inyección — host bindings que no tienen sustituto razonable
// ─────────────────────────────────────────────────────────────────────────

/**
 * `getIsScrollDraining` — de `app-host/bootstrap/state.ts`, AUSENTE de ese
 * archivo en este árbol (porte parcial de otro agente). Default
 * conservador: `false` (nunca "drenando scroll") — `findAvailableIDE()` lo
 * usa sólo para saltar una iteración de polling durante el drenado de
 * scroll del REPL; con `false` simplemente pierde esa optimización de
 * rendimiento, nunca cambia el resultado. Setter para cuando `app-host`
 * porte el símbolo real.
 */
let _getIsScrollDraining: () => boolean = () => false
export function getIsScrollDraining(): boolean {
  return _getIsScrollDraining()
}
export function setGetIsScrollDrainingFn(fn: () => boolean): void {
  _getIsScrollDraining = fn
}

// Re-exportado para que otros módulos del paquete puedan citar el tipo sin
// depender directamente de `@thyrox/agent/diff.js`.
export type { StructuredPatchHunk }
