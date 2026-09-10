/**
 * Puerto de `ccnmt: packages/ide/src/ide.ts`.
 *
 * `Client` de `@modelcontextprotocol/sdk/client/index.js` es sólo TIPO
 * (erasado). `ConnectedMCPServer`/`MCPServerConnection` de
 * `@thyrox/mcp-runtime/types.js` también son TIPOS.
 *
 * `callIdeRpc` (de `@thyrox/mcp-runtime/clientRuntime.js`) es un punto de
 * inyección: ese archivo está BLOQUEADO dentro del propio
 * `@thyrox/mcp-runtime` (13/48 símbolos, por ausencia de `tool-registry`).
 * Ver el bloque 3 de `internal/pendingCrossPackageDeps.ts`.
 *
 * El resto de dependencias cruzadas (`@thyrox/{agent,app-host,config,
 * local-observability,shell,storage}`) SÍ existen en este árbol, pero
 * resuelven vía `require()` diferido porque `@thyrox/ide` no es miembro de
 * `src/packages/package.json:workspaces` todavía — ver la cabecera de
 * `internal/pendingCrossPackageDeps.ts` para la verificación en vivo.
 *
 * `memoize`/`capitalize` de `lodash-es` — sustituto local (mismo criterio
 * que `@thyrox/storage`: no se instala `lodash-es` como dependencia npm nueva).
 */
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import axios from 'axios'
import { execa } from 'execa'
import { createConnection } from 'net'
import * as os from 'os'
import { basename, join, sep as pathSeparator, resolve } from 'path'
import type {
  ConnectedMCPServer,
  MCPServerConnection,
} from '@thyrox/mcp-runtime/types.js'
import {
  callIdeRpc,
  capitalize,
  env,
  envDynamic,
  getAncestorPidsAsync,
  getClaudeConfigHomeDir,
  getGlobalConfig,
  getIsScrollDraining,
  isJetBrainsPluginInstalledCached,
  lt,
  memoize,
  requireAgentAbortController,
  requireAppHostBootstrapState,
  requireConfigEnvUtils,
  requireConfigPlatform,
  requireConfigSleep,
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilityLogging,
  requireLocalObservabilityRoot,
  requireLocalObservabilitySlowOperations,
  requireShellExecFileNoThrow,
  requireStorageFsOperations,
  saveGlobalConfig,
} from './internal/pendingCrossPackageDeps.js'
import { checkWSLDistroMatch, WindowsToWSLConverter } from './idePathConversion.js'

// Lazy: IdeOnboardingDialog.tsx trae React/ink; sólo hace falta en el
// camino interactivo de onboarding. El paquete `repl` no existe en este
// árbol — el `require()` diferido lanzará si de verdad se invoca, que es
// exactamente el mismo desenlace que en la fuente cuando el módulo no está
// disponible («el módulo no está portado»: rule 3, ver el prompt de esta tarea).
/* eslint-disable @typescript-eslint/no-require-imports */
const ideOnboardingDialog = (): { hasIdeOnboardingDialogBeenShown(): boolean } =>
  require('@thyrox/repl/components/IdeOnboardingDialog.js')
/* eslint-enable @typescript-eslint/no-require-imports */

// Constante de build-time inyectada por Bun.build({ define }); undefined en
// desarrollo. Declarada en línea, igual que `@thyrox/local-observability:
// src/sentry.ts` — así este paquete no depende de un `.d.ts` global.
declare const MACRO: { VERSION: string } | undefined

// ide antes tenía su propia copia. Se usa el probe canónico de shell —
// misma semántica (EPERM → false, conservador para recuperación de lockfiles).
function isProcessRunning(pid: number): boolean {
  if (pid <= 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// Devuelve una función que obtiene de forma lazy la cadena de PIDs
// ancestros de nuestro proceso, cacheando dentro de la vida del closure.
// Quien llama debe acotar esto a un único pase de detección — los PIDs se
// reciclan y el árbol de procesos cambia con el tiempo.
function makeAncestorPidLookup(): () => Promise<Set<number>> {
  let promise: Promise<Set<number>> | null = null
  return () => {
    if (!promise) {
      promise = getAncestorPidsAsync(process.ppid, 10).then(
        pids => new Set(pids),
      )
    }
    return promise
  }
}

type LockfileJsonContent = {
  workspaceFolders?: string[]
  pid?: number
  ideName?: string
  transport?: 'ws' | 'sse'
  runningInWindows?: boolean
  authToken?: string
}

type IdeLockfileInfo = {
  workspaceFolders: string[]
  port: number
  pid?: number
  ideName?: string
  useWebSocket: boolean
  runningInWindows: boolean
  authToken?: string
}

export type DetectedIDEInfo = {
  name: string
  port: number
  workspaceFolders: string[]
  url: string
  isValid: boolean
  authToken?: string
  ideRunningInWindows?: boolean
}

export type IdeType =
  | 'cursor'
  | 'windsurf'
  | 'vscode'
  | 'pycharm'
  | 'intellij'
  | 'webstorm'
  | 'phpstorm'
  | 'rubymine'
  | 'clion'
  | 'goland'
  | 'rider'
  | 'datagrip'
  | 'appcode'
  | 'dataspell'
  | 'aqua'
  | 'gateway'
  | 'fleet'
  | 'androidstudio'

type IdeConfig = {
  ideKind: 'vscode' | 'jetbrains'
  displayName: string
  processKeywordsMac: string[]
  processKeywordsWindows: string[]
  processKeywordsLinux: string[]
}

const supportedIdeConfigs: Record<IdeType, IdeConfig> = {
  cursor: {
    ideKind: 'vscode',
    displayName: 'Cursor',
    processKeywordsMac: ['Cursor Helper', 'Cursor.app'],
    processKeywordsWindows: ['cursor.exe'],
    processKeywordsLinux: ['cursor'],
  },
  windsurf: {
    ideKind: 'vscode',
    displayName: 'Windsurf',
    processKeywordsMac: ['Windsurf Helper', 'Windsurf.app'],
    processKeywordsWindows: ['windsurf.exe'],
    processKeywordsLinux: ['windsurf'],
  },
  vscode: {
    ideKind: 'vscode',
    displayName: 'VS Code',
    processKeywordsMac: ['Visual Studio Code', 'Code Helper'],
    processKeywordsWindows: ['code.exe'],
    processKeywordsLinux: ['code'],
  },
  intellij: {
    ideKind: 'jetbrains',
    displayName: 'IntelliJ IDEA',
    processKeywordsMac: ['IntelliJ IDEA'],
    processKeywordsWindows: ['idea64.exe'],
    processKeywordsLinux: ['idea', 'intellij'],
  },
  pycharm: {
    ideKind: 'jetbrains',
    displayName: 'PyCharm',
    processKeywordsMac: ['PyCharm'],
    processKeywordsWindows: ['pycharm64.exe'],
    processKeywordsLinux: ['pycharm'],
  },
  webstorm: {
    ideKind: 'jetbrains',
    displayName: 'WebStorm',
    processKeywordsMac: ['WebStorm'],
    processKeywordsWindows: ['webstorm64.exe'],
    processKeywordsLinux: ['webstorm'],
  },
  phpstorm: {
    ideKind: 'jetbrains',
    displayName: 'PhpStorm',
    processKeywordsMac: ['PhpStorm'],
    processKeywordsWindows: ['phpstorm64.exe'],
    processKeywordsLinux: ['phpstorm'],
  },
  rubymine: {
    ideKind: 'jetbrains',
    displayName: 'RubyMine',
    processKeywordsMac: ['RubyMine'],
    processKeywordsWindows: ['rubymine64.exe'],
    processKeywordsLinux: ['rubymine'],
  },
  clion: {
    ideKind: 'jetbrains',
    displayName: 'CLion',
    processKeywordsMac: ['CLion'],
    processKeywordsWindows: ['clion64.exe'],
    processKeywordsLinux: ['clion'],
  },
  goland: {
    ideKind: 'jetbrains',
    displayName: 'GoLand',
    processKeywordsMac: ['GoLand'],
    processKeywordsWindows: ['goland64.exe'],
    processKeywordsLinux: ['goland'],
  },
  rider: {
    ideKind: 'jetbrains',
    displayName: 'Rider',
    processKeywordsMac: ['Rider'],
    processKeywordsWindows: ['rider64.exe'],
    processKeywordsLinux: ['rider'],
  },
  datagrip: {
    ideKind: 'jetbrains',
    displayName: 'DataGrip',
    processKeywordsMac: ['DataGrip'],
    processKeywordsWindows: ['datagrip64.exe'],
    processKeywordsLinux: ['datagrip'],
  },
  appcode: {
    ideKind: 'jetbrains',
    displayName: 'AppCode',
    processKeywordsMac: ['AppCode'],
    processKeywordsWindows: ['appcode.exe'],
    processKeywordsLinux: ['appcode'],
  },
  dataspell: {
    ideKind: 'jetbrains',
    displayName: 'DataSpell',
    processKeywordsMac: ['DataSpell'],
    processKeywordsWindows: ['dataspell64.exe'],
    processKeywordsLinux: ['dataspell'],
  },
  aqua: {
    ideKind: 'jetbrains',
    displayName: 'Aqua',
    processKeywordsMac: [], // No se auto-detecta porque aqua es demasiado común.
    processKeywordsWindows: ['aqua64.exe'],
    processKeywordsLinux: [],
  },
  gateway: {
    ideKind: 'jetbrains',
    displayName: 'Gateway',
    processKeywordsMac: [], // No se auto-detecta porque gateway es demasiado común.
    processKeywordsWindows: ['gateway64.exe'],
    processKeywordsLinux: [],
  },
  fleet: {
    ideKind: 'jetbrains',
    displayName: 'Fleet',
    processKeywordsMac: [], // No se auto-detecta porque fleet es demasiado común.
    processKeywordsWindows: ['fleet.exe'],
    processKeywordsLinux: [],
  },
  androidstudio: {
    ideKind: 'jetbrains',
    displayName: 'Android Studio',
    processKeywordsMac: ['Android Studio'],
    processKeywordsWindows: ['studio64.exe'],
    processKeywordsLinux: ['android-studio'],
  },
}

export function isVSCodeIde(ide: IdeType | null): boolean {
  if (!ide) return false
  const config = supportedIdeConfigs[ide]
  return config && config.ideKind === 'vscode'
}

export function isJetBrainsIde(ide: IdeType | null): boolean {
  if (!ide) return false
  const config = supportedIdeConfigs[ide]
  return config && config.ideKind === 'jetbrains'
}

export const isSupportedVSCodeTerminal = memoize(() => {
  return isVSCodeIde(env.terminal as IdeType)
})

export const isSupportedJetBrainsTerminal = memoize(() => {
  return isJetBrainsIde(envDynamic.terminal as IdeType)
})

export const isSupportedTerminal = memoize(() => {
  return (
    isSupportedVSCodeTerminal() ||
    isSupportedJetBrainsTerminal() ||
    Boolean(process.env.FORCE_CODE_TERMINAL)
  )
})

export function getTerminalIdeType(): IdeType | null {
  if (!isSupportedTerminal()) {
    return null
  }
  return env.terminal as IdeType
}

/**
 * Obtiene los lockfiles de IDE ordenados desde el directorio ~/.claude/ide
 * @returns Array de rutas completas de lockfile ordenadas por fecha de modificación (más reciente primero).
 */
export async function getSortedIdeLockfiles(): Promise<string[]> {
  const { logError } = requireLocalObservabilityLogging()
  const { isFsInaccessible } = requireLocalObservabilityErrorHelpers()

  try {
    const ideLockFilePaths = await getIdeLockfilesPaths()

    // Recolecta todos los lockfiles de todos los directorios.
    const allLockfiles: Array<{ path: string; mtime: Date }>[] =
      await Promise.all(
        ideLockFilePaths.map(async ideLockFilePath => {
          try {
            const entries = await requireStorageFsOperations()
              .getFsImplementation()
              .readdir(ideLockFilePath)
            const lockEntries = entries.filter(file =>
              file.name.endsWith('.lock'),
            )
            // Hace stat de todos los lockfiles en paralelo; se saltan los que fallen.
            const stats = await Promise.all(
              lockEntries.map(async file => {
                const fullPath = join(ideLockFilePath, file.name)
                try {
                  const fileStat = await requireStorageFsOperations()
                    .getFsImplementation()
                    .stat(fullPath)
                  return { path: fullPath, mtime: fileStat.mtime }
                } catch {
                  return null
                }
              }),
            )
            return stats.filter(
              (s): s is { path: string; mtime: Date } => s !== null,
            )
          } catch (error) {
            // Las rutas candidatas se agregan sin comprobar existencia
            // antes, así que directorios ausentes/inaccesibles son
            // esperados aquí - se saltan en silencio.
            if (!isFsInaccessible(error)) {
              logError(error)
            }
            return []
          }
        }),
      )

    // Aplana y ordena todos los lockfiles por fecha de última modificación (más reciente primero).
    return allLockfiles
      .flat()
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .map(file => file.path)
  } catch (error) {
    logError(error as Error)
    return []
  }
}

async function readIdeLockfile(path: string): Promise<IdeLockfileInfo | null> {
  const { logError } = requireLocalObservabilityLogging()
  const { jsonParse } = requireLocalObservabilitySlowOperations()

  try {
    const content = await requireStorageFsOperations()
      .getFsImplementation()
      .readFile(path, { encoding: 'utf-8' })

    let workspaceFolders: string[] = []
    let pid: number | undefined
    let ideName: string | undefined
    let useWebSocket = false
    let runningInWindows = false
    let authToken: string | undefined

    try {
      const parsedContent = jsonParse(content) as LockfileJsonContent
      if (parsedContent.workspaceFolders) {
        workspaceFolders = parsedContent.workspaceFolders
      }
      pid = parsedContent.pid
      ideName = parsedContent.ideName
      useWebSocket = parsedContent.transport === 'ws'
      runningInWindows = parsedContent.runningInWindows === true
      authToken = parsedContent.authToken
    } catch (_) {
      // Formato antiguo - sólo una lista de rutas.
      workspaceFolders = content.split('\n').map(line => line.trim())
    }

    // Extrae el puerto del nombre de archivo (p. ej. 12345.lock -> 12345).
    const filename = path.split(pathSeparator).pop()
    if (!filename) return null

    const port = filename.replace('.lock', '')

    return {
      workspaceFolders,
      port: parseInt(port, 10),
      pid,
      ideName,
      useWebSocket,
      runningInWindows,
      authToken,
    }
  } catch (error) {
    logError(error as Error)
    return null
  }
}

/**
 * Comprueba si la conexión al IDE responde, probando si el puerto está abierto.
 * @param host Host al que conectar.
 * @param port Puerto al que conectar.
 * @param timeout Timeout opcional en milisegundos (por defecto 500ms).
 * @returns `true` si el puerto está abierto, `false` en caso contrario.
 */
async function checkIdeConnection(
  host: string,
  port: number,
  timeout = 500,
): Promise<boolean> {
  try {
    return new Promise(resolve => {
      const socket = createConnection({
        host: host,
        port: port,
        timeout: timeout,
      })

      socket.on('connect', () => {
        socket.destroy()
        void resolve(true)
      })

      socket.on('error', () => {
        void resolve(false)
      })

      socket.on('timeout', () => {
        socket.destroy()
        void resolve(false)
      })
    })
  } catch (_) {
    // URL inválida u otros errores.
    return false
  }
}

/**
 * Resuelve la ruta USERPROFILE de Windows. WSL a menudo no propaga
 * USERPROFILE, así que se recurre a invocar powershell.exe. Ese spawn tarda
 * ~500ms–2s en frío; el valor es estático por sesión.
 */
const getWindowsUserProfile = memoize(async (): Promise<string | undefined> => {
  if (process.env.USERPROFILE) return process.env.USERPROFILE
  const { execFileNoThrow } = requireShellExecFileNoThrow()
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { stdout, code } = await execFileNoThrow('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    '$env:USERPROFILE',
  ])
  if (code === 0 && stdout.trim()) return stdout.trim()
  logForDebugging(
    'Unable to get Windows USERPROFILE via PowerShell - IDE detection may be incomplete',
  )
  return undefined
})

/**
 * Obtiene la ruta de los directorios de lockfile de IDE potenciales, según
 * la plataforma. Las rutas no se comprueban por existencia previamente —
 * quien las consume hace readdir sobre cada una y maneja ENOENT.
 * Comprobar con stat() antes duplicaría syscalls, y en WSL (donde el
 * acceso a /mnt/c es 2-10x más lento) el loop de stat por directorio de
 * usuario agrandaba la latencia de arranque.
 */
export async function getIdeLockfilesPaths(): Promise<string[]> {
  const { logError } = requireLocalObservabilityLogging()
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { errorMessage, isFsInaccessible } = requireLocalObservabilityErrorHelpers()
  const { getPlatform } = requireConfigPlatform()

  const paths: string[] = [join(getClaudeConfigHomeDir(), 'ide')]

  if (getPlatform() !== 'wsl') {
    return paths
  }

  // Para Windows, se usan heurísticas para encontrar las rutas potenciales.
  // Ver https://learn.microsoft.com/en-us/windows/wsl/filesystems

  const windowsHome = await getWindowsUserProfile()

  if (windowsHome) {
    const converter = new WindowsToWSLConverter(process.env.WSL_DISTRO_NAME)
    const wslPath = converter.toLocalPath(windowsHome)
    paths.push(resolve(wslPath, '.claude', 'ide'))
  }

  // Construye la ruta basada en las ubicaciones estándar de Windows WSL.
  // Esto puede fallar si el usuario actual no tiene permiso "List folder
  // contents" sobre C:\Users.
  try {
    const usersDir = '/mnt/c/Users'
    const userDirs = await requireStorageFsOperations()
      .getFsImplementation()
      .readdir(usersDir)

    for (const user of userDirs) {
      // Se saltan archivos (p. ej. desktop.ini) — readdir sobre una ruta
      // de archivo lanza ENOTDIR. isFsInaccessible cubre ENOTDIR, pero
      // pre-filtrar aquí evita el costo de intentar readdir sobre no-directorios.
      // Se conservan los symlinks porque Windows crea junction points para
      // los perfiles de usuario.
      if (!user.isDirectory() && !user.isSymbolicLink()) {
        continue
      }
      if (
        user.name === 'Public' ||
        user.name === 'Default' ||
        user.name === 'Default User' ||
        user.name === 'All Users'
      ) {
        continue // Se saltan los directorios de sistema.
      }
      paths.push(join(usersDir, user.name, '.claude', 'ide'))
    }
  } catch (error: unknown) {
    if (isFsInaccessible(error)) {
      // Esperado en WSL cuando la unidad C: no está montada o el usuario no tiene permisos.
      logForDebugging(
        `WSL IDE lockfile path detection failed (${(error as NodeJS.ErrnoException).code}): ${errorMessage(error)}`,
      )
    } else {
      logError(error)
    }
  }
  return paths
}

/**
 * Limpia lockfiles de IDE obsoletos:
 * - Remueve lockfiles de procesos que ya no corren.
 * - Remueve lockfiles de puertos que no responden.
 */
export async function cleanupStaleIdeLockfiles(): Promise<void> {
  const { logError } = requireLocalObservabilityLogging()
  const { getPlatform } = requireConfigPlatform()

  try {
    const lockfiles = await getSortedIdeLockfiles()

    for (const lockfilePath of lockfiles) {
      const lockfileInfo = await readIdeLockfile(lockfilePath)

      if (!lockfileInfo) {
        // Si no se puede leer el lockfile, se borra.
        try {
          await requireStorageFsOperations().getFsImplementation().unlink(lockfilePath)
        } catch (error) {
          logError(error as Error)
        }
        continue
      }

      const host = await detectHostIP(
        lockfileInfo.runningInWindows,
        lockfileInfo.port,
      )

      let shouldDelete = false

      if (lockfileInfo.pid) {
        // Comprueba si el proceso sigue corriendo.
        if (!isProcessRunning(lockfileInfo.pid)) {
          if (getPlatform() !== 'wsl') {
            shouldDelete = true
          } else {
            // El PID puede no ser confiable en wsl, así que también se comprueba la conexión.
            const isResponding = await checkIdeConnection(
              host,
              lockfileInfo.port,
            )
            if (!isResponding) {
              shouldDelete = true
            }
          }
        }
      } else {
        // Sin PID, se comprueba si la URL responde.
        const isResponding = await checkIdeConnection(host, lockfileInfo.port)
        if (!isResponding) {
          shouldDelete = true
        }
      }

      if (shouldDelete) {
        try {
          await requireStorageFsOperations().getFsImplementation().unlink(lockfilePath)
        } catch (error) {
          logError(error as Error)
        }
      }
    }
  } catch (error) {
    logError(error as Error)
  }
}

export interface IDEExtensionInstallationStatus {
  installed: boolean
  error: string | null
  installedVersion: string | null
  ideType: IdeType | null
}

export async function maybeInstallIDEExtension(
  ideType: IdeType,
): Promise<IDEExtensionInstallationStatus | null> {
  const { logError } = requireLocalObservabilityLogging()
  const { logEvent } = requireLocalObservabilityRoot()

  try {
    // Instala/actualiza la extensión.
    const installedVersion = await installIDEExtension(ideType)
    // Sólo se rastrean las instalaciones exitosas.
    logEvent('tengu_ext_installed', {})

    // Fija diffTool a "auto" si todavía no se fijó.
    const globalConfig = getGlobalConfig()
    if (!globalConfig.diffTool) {
      saveGlobalConfig(current => ({ ...current, diffTool: 'auto' }))
    }
    return {
      installed: true,
      error: null,
      installedVersion,
      ideType: ideType,
    }
  } catch (error) {
    logEvent('tengu_ext_install_error', {})
    // Maneja errores de instalación.
    const errorMessage = error instanceof Error ? error.message : String(error)
    logError(error as Error)
    return {
      installed: false,
      error: errorMessage,
      installedVersion: null,
      ideType: ideType,
    }
  }
}

let currentIDESearch: AbortController | null = null

export async function findAvailableIDE(): Promise<DetectedIDEInfo | null> {
  const { sleep } = requireConfigSleep()
  const { createAbortController } = requireAgentAbortController()

  if (currentIDESearch) {
    currentIDESearch.abort()
  }
  currentIDESearch = createAbortController()
  const signal = currentIDESearch.signal

  // Se limpian primero los lockfiles de IDE obsoletos, para no comprobarlos siquiera.
  await cleanupStaleIdeLockfiles()
  const startTime = Date.now()
  while (Date.now() - startTime < 30_000 && !signal.aborted) {
    // Se salta la iteración durante el drenado de scroll — detectIDEs lee
    // lockfiles + invoca ps, compitiendo por el event loop con los frames
    // de scroll. El próximo tick tras asentarse el scroll retoma la búsqueda.
    if (getIsScrollDraining()) {
      await sleep(1000, signal)
      continue
    }
    const ides = await detectIDEs(false)
    if (signal.aborted) {
      return null
    }
    // Se devuelve el IDE si y sólo si hay exactamente una coincidencia; si
    // no, el usuario debe usar /ide para elegir un IDE. Al correr desde
    // una terminal integrada soportada, detectIDEs() debería devolver a lo
    // sumo un IDE.
    if (ides.length === 1) {
      return ides[0]!
    }
    await sleep(1000, signal)
  }
  return null
}

/**
 * Detecta IDEs que tienen una extensión/plugin corriendo.
 * @param includeInvalid Si es `true`, también devuelve IDEs inválidos (es
 * decir, cuando el directorio de workspace no coincide con el cwd).
 */
export async function detectIDEs(
  includeInvalid: boolean,
): Promise<DetectedIDEInfo[]> {
  const { logError } = requireLocalObservabilityLogging()
  const { isEnvTruthy } = requireConfigEnvUtils()
  const { getPlatform } = requireConfigPlatform()

  const detectedIDEs: DetectedIDEInfo[] = []

  try {
    // Obtiene CLAUDE_CODE_SSE_PORT, si está fijado.
    const ssePort = process.env.CLAUDE_CODE_SSE_PORT
    const envPort = ssePort ? parseInt(ssePort, 10) : null

    // Obtiene el directorio de trabajo actual, normalizado a NFC para
    // comparación consistente. macOS devuelve rutas NFD (Unicode
    // descompuesto), mientras que IDEs como VS Code reportan rutas NFC
    // (Unicode compuesto). Sin normalización, rutas con caracteres
    // acentuados/CJK no coinciden.
    const cwd = requireAppHostBootstrapState().getOriginalCwd().normalize('NFC')

    // Obtiene los lockfiles ordenados (rutas completas) y los lee todos en
    // paralelo. findAvailableIDE() hace polling de esto cada 1s hasta por
    // 30s; el I/O serial aquí aparecía como ~500ms de self-time en CPU profiles.
    const lockfiles = await getSortedIdeLockfiles()
    const lockfileInfos = await Promise.all(lockfiles.map(readIdeLockfile))

    // El recorrido de ancestros invoca procesos (ps en loop, hasta 10x). Se
    // hace lazy y de un solo disparo por llamada a detectIDEs(); con el
    // orden de comprobar workspace primero de abajo, esto a menudo nunca
    // se dispara.
    const getAncestors = makeAncestorPidLookup()
    const needsAncestryCheck = getPlatform() !== 'wsl' && isSupportedTerminal()

    // Intenta encontrar un lockfile que contenga nuestro directorio de trabajo actual.
    for (const lockfileInfo of lockfileInfos) {
      if (!lockfileInfo) continue

      let isValid = false
      if (isEnvTruthy(process.env.CLAUDE_CODE_IDE_SKIP_VALID_CHECK)) {
        isValid = true
      } else if (lockfileInfo.port === envPort) {
        // Si el puerto coincide con la variable de entorno, se marca como válido sin importar el directorio.
        isValid = true
      } else {
        // Si no, se comprueba si el directorio de trabajo actual está dentro de los workspace folders.
        isValid = lockfileInfo.workspaceFolders.some(idePath => {
          if (!idePath) return false

          let localPath = idePath

          // Maneja la conversión de rutas específica de WSL y el matching de distro.
          if (
            getPlatform() === 'wsl' &&
            lockfileInfo.runningInWindows &&
            process.env.WSL_DISTRO_NAME
          ) {
            // Comprueba mismatch de distro de WSL.
            if (!checkWSLDistroMatch(idePath, process.env.WSL_DISTRO_NAME)) {
              return false
            }

            // Intenta tanto la ruta original como la convertida.
            // Esto maneja el caso en que el IDE reporte cualquiera de los dos formatos.
            const resolvedOriginal = resolve(localPath).normalize('NFC')
            if (
              cwd === resolvedOriginal ||
              cwd.startsWith(resolvedOriginal + pathSeparator)
            ) {
              return true
            }

            // Convierte la ruta del IDE en Windows a ruta local de WSL y la comprueba también.
            const converter = new WindowsToWSLConverter(
              process.env.WSL_DISTRO_NAME,
            )
            localPath = converter.toLocalPath(idePath)
          }

          const resolvedPath = resolve(localPath).normalize('NFC')

          // En Windows, se normalizan rutas para comparación case-insensitive de la letra de unidad.
          if (getPlatform() === 'windows') {
            const normalizedCwd = cwd.replace(/^[a-zA-Z]:/, match =>
              match.toUpperCase(),
            )
            const normalizedResolvedPath = resolvedPath.replace(
              /^[a-zA-Z]:/,
              match => match.toUpperCase(),
            )
            return (
              normalizedCwd === normalizedResolvedPath ||
              normalizedCwd.startsWith(normalizedResolvedPath + pathSeparator)
            )
          }

          return (
            cwd === resolvedPath || cwd.startsWith(resolvedPath + pathSeparator)
          )
        })
      }

      if (!isValid && !includeInvalid) {
        continue
      }

      // Comprobación de ancestría de PID: al correr en la terminal
      // integrada de un IDE soportado, se asegura que el IDE de este
      // lockfile sea de verdad nuestro padre. Esto desambigua cuando hay
      // varias ventanas de IDE con workspace folders solapados. Corre
      // DESPUÉS de la comprobación de workspace, así que los lockfiles que
      // no coinciden la saltan por completo — antes esto invocaba
      // procesos una vez por lockfile y dominaba los CPU profiles durante
      // el polling de findAvailableIDE().
      if (needsAncestryCheck) {
        const portMatchesEnv = envPort !== null && lockfileInfo.port === envPort
        if (!portMatchesEnv) {
          if (!lockfileInfo.pid || !isProcessRunning(lockfileInfo.pid)) {
            continue
          }
          if (process.ppid !== lockfileInfo.pid) {
            const ancestors = await getAncestors()
            if (!ancestors.has(lockfileInfo.pid)) {
              continue
            }
          }
        }
      }

      const ideName =
        lockfileInfo.ideName ??
        (isSupportedTerminal() ? toIDEDisplayName(envDynamic.terminal) : 'IDE')

      const host = await detectHostIP(
        lockfileInfo.runningInWindows,
        lockfileInfo.port,
      )
      let url
      if (lockfileInfo.useWebSocket) {
        url = `ws://${host}:${lockfileInfo.port}`
      } else {
        url = `http://${host}:${lockfileInfo.port}/sse`
      }

      detectedIDEs.push({
        url: url,
        name: ideName,
        workspaceFolders: lockfileInfo.workspaceFolders,
        port: lockfileInfo.port,
        isValid: isValid,
        authToken: lockfileInfo.authToken,
        ideRunningInWindows: lockfileInfo.runningInWindows,
      })
    }

    // El envPort debería estar definido para las terminales de IDE
    // soportadas. Si hay una extensión con un envPort coincidente, se
    // aísla y se devuelve esa, si no se devuelven todas las válidas.
    if (!includeInvalid && envPort) {
      const envPortMatch = detectedIDEs.filter(
        ide => ide.isValid && ide.port === envPort,
      )
      if (envPortMatch.length === 1) {
        return envPortMatch
      }
    }
  } catch (error) {
    logError(error as Error)
  }

  return detectedIDEs
}

export async function maybeNotifyIDEConnected(client: Client) {
  await client.notification({
    method: 'ide_connected',
    params: {
      pid: process.pid,
    },
  })
}

export function hasAccessToIDEExtensionDiffFeature(
  mcpClients: MCPServerConnection[],
): boolean {
  // Comprueba si hay un cliente de IDE conectado en la lista de clientes MCP dada.
  return mcpClients.some(
    client => client.type === 'connected' && client.name === 'ide',
  )
}

const EXTENSION_ID =
  process.env.USER_TYPE === 'ant'
    ? 'anthropic.claude-code-how-works-how-works-internal'
    : 'anthropic.claude-code-how-works-how-works'

export async function isIDEExtensionInstalled(
  ideType: IdeType,
): Promise<boolean> {
  const { execFileNoThrowWithCwd } = requireShellExecFileNoThrow()

  if (isVSCodeIde(ideType)) {
    const command = await getVSCodeIDECommand(ideType)
    if (command) {
      try {
        const result = await execFileNoThrowWithCwd(
          command,
          ['--list-extensions'],
          {
            env: getInstallationEnv(),
          },
        )
        if (result.stdout?.includes(EXTENSION_ID)) {
          return true
        }
      } catch {
        // se traga el error
      }
    }
  } else if (isJetBrainsIde(ideType)) {
    return await isJetBrainsPluginInstalledCached(ideType)
  }
  return false
}

async function installIDEExtension(ideType: IdeType): Promise<string | null> {
  const { execFileNoThrowWithCwd } = requireShellExecFileNoThrow()

  if (isVSCodeIde(ideType)) {
    const command = await getVSCodeIDECommand(ideType)

    if (command) {
      if (process.env.USER_TYPE === 'ant') {
        return await installFromArtifactory(command)
      }
      let version = await getInstalledVSCodeExtensionVersion(command)
      // Si no está instalada o la versión es más vieja que la incluida,
      if (!version || lt(version, getClaudeCodeVersion())) {
        // `code` puede crashear si se invoca demasiado rápido en sucesión.
        const { sleep } = requireConfigSleep()
        await sleep(500)
        const result = await execFileNoThrowWithCwd(
          command,
          ['--force', '--install-extension', 'anthropic.claude-code-how-works-how-works'],
          {
            env: getInstallationEnv(),
          },
        )
        if (result.code !== 0) {
          throw new Error(`${result.code}: ${result.error} ${result.stderr}`)
        }
        version = getClaudeCodeVersion()
      }
      return version
    }
  }
  // Sin instalación automática para IDEs de JetBrains, ya que no está
  // soportado en builds nativos. Se muestra un aviso destacado para que
  // descarguen desde el marketplace.
  return null
}

function getInstallationEnv(): NodeJS.ProcessEnv | undefined {
  const { getPlatform } = requireConfigPlatform()
  // Cursor en Linux puede implementar incorrectamente el comando `code` y
  // en realidad lanzar la UI. Se hace que esto falle si sucede, limpiando
  // la variable de entorno DISPLAY.
  if (getPlatform() === 'linux') {
    return {
      ...process.env,
      DISPLAY: '',
    }
  }
  return undefined
}

function getClaudeCodeVersion() {
  return typeof MACRO !== 'undefined' ? MACRO.VERSION : '0.0.0'
}

async function getInstalledVSCodeExtensionVersion(
  command: string,
): Promise<string | null> {
  const { execFileNoThrow } = requireShellExecFileNoThrow()
  const { stdout } = await execFileNoThrow(
    command,
    ['--list-extensions', '--show-versions'],
    {
      env: getInstallationEnv(),
    },
  )
  const lines = stdout?.split('\n') || []
  for (const line of lines) {
    const [extensionId, version] = line.split('@')
    if (extensionId === 'anthropic.claude-code-how-works-how-works' && version) {
      return version
    }
  }
  return null
}

function getVSCodeIDECommandByParentProcess(): string | null {
  const { getPlatform } = requireConfigPlatform()
  try {
    const platform = getPlatform()

    // Sólo soportado en OSX, donde Cursor puede registrarse como el
    // comando 'code'.
    if (platform !== 'macos') {
      return null
    }

    let pid = process.ppid

    // Recorre el árbol de procesos hacia arriba para encontrar la app real.
    for (let i = 0; i < 10; i++) {
      if (!pid || pid === 0 || pid === 1) break

      // Obtiene el comando para este PID
      // (esta función ya retornó si no corre en macos)
      const { execSyncWithDefaults } = requireShellExecFileNoThrow()
      const command = execSyncWithDefaults(
        `ps -o command= -p ${pid}`,
      )?.trim()

      if (command) {
        // Comprueba aplicaciones conocidas y extrae la ruta hasta e incluyendo .app
        const appNames = {
          'Visual Studio Code.app': 'code',
          'Cursor.app': 'cursor',
          'Windsurf.app': 'windsurf',
          'Visual Studio Code - Insiders.app': 'code',
          'VSCodium.app': 'codium',
        }
        const pathToExecutable = '/Contents/MacOS/Electron'

        for (const [appName, executableName] of Object.entries(appNames)) {
          const appIndex = command.indexOf(appName + pathToExecutable)
          if (appIndex !== -1) {
            // Extrae la ruta desde el inicio hasta el final del nombre .app.
            const folderPathEnd = appIndex + appName.length
            // Todos son variantes conocidas de VSCode con la misma estructura.
            return (
              command.substring(0, folderPathEnd) +
              '/Contents/Resources/app/bin/' +
              executableName
            )
          }
        }
      }

      // Obtiene el PID padre (esta función ya retornó si no corre en macos).
      const ppidStr = execSyncWithDefaults(
        `ps -o ppid= -p ${pid}`,
      )?.trim()
      if (!ppidStr) {
        break
      }
      pid = parseInt(ppidStr.trim(), 10)
    }

    return null
  } catch {
    return null
  }
}
async function getVSCodeIDECommand(ideType: IdeType): Promise<string | null> {
  const { getPlatform } = requireConfigPlatform()
  const parentExecutable = getVSCodeIDECommandByParentProcess()
  if (parentExecutable) {
    // Verifica que el ejecutable padre realmente exista.
    try {
      await requireStorageFsOperations().getFsImplementation().stat(parentExecutable)
      return parentExecutable
    } catch {
      // El ejecutable padre no existe.
    }
  }

  // En Windows, se pide explícitamente el wrapper .cmd. VS Code 1.110.0
  // empezó a anteponer la raíz de instalación (que contiene Code.exe, el
  // binario GUI de Electron) por delante de bin\ (que contiene code.cmd,
  // el wrapper de CLI) en el PATH de la terminal integrada cuando se
  // lanza vía accesos directos del Menú Inicio/barra de tareas. Un
  // 'code' pelado entonces resuelve a Code.exe vía PATHEXT, lo cual abre
  // una nueva ventana del editor en vez de correr el CLI. Pedir
  // 'code.cmd' fuerza a cross-spawn/which a saltarse Code.exe. Ver
  // microsoft/vscode#299416 (arreglado en Insiders) y
  // anthropics/claude-code-how-works-how-works#30975.
  const ext = getPlatform() === 'windows' ? '.cmd' : ''
  switch (ideType) {
    case 'vscode':
      return 'code' + ext
    case 'cursor':
      return 'cursor' + ext
    case 'windsurf':
      return 'windsurf' + ext
    default:
      break
  }
  return null
}

export async function isCursorInstalled(): Promise<boolean> {
  const { execFileNoThrow } = requireShellExecFileNoThrow()
  const result = await execFileNoThrow('cursor', ['--version'])
  return result.code === 0
}

export async function isWindsurfInstalled(): Promise<boolean> {
  const { execFileNoThrow } = requireShellExecFileNoThrow()
  const result = await execFileNoThrow('windsurf', ['--version'])
  return result.code === 0
}

export async function isVSCodeInstalled(): Promise<boolean> {
  const { execFileNoThrow } = requireShellExecFileNoThrow()
  const result = await execFileNoThrow('code', ['--help'])
  // Comprueba si el output indica que en efecto es Visual Studio Code.
  return (
    result.code === 0 && Boolean(result.stdout?.includes('Visual Studio Code'))
  )
}

// Caché de resultados de detección de IDE.
let cachedRunningIDEs: IdeType[] | null = null

/**
 * Implementación interna de detección de IDE.
 */
async function detectRunningIDEsImpl(): Promise<IdeType[]> {
  const { logError } = requireLocalObservabilityLogging()
  const { getPlatform } = requireConfigPlatform()

  const runningIDEs: IdeType[] = []

  try {
    const platform = getPlatform()
    if (platform === 'macos') {
      // En macOS, se usa ps con matching de nombre de proceso.
      const result = await execa(
        'ps aux | grep -E "Visual Studio Code|Code Helper|Cursor Helper|Windsurf Helper|IntelliJ IDEA|PyCharm|WebStorm|PhpStorm|RubyMine|CLion|GoLand|Rider|DataGrip|AppCode|DataSpell|Aqua|Gateway|Fleet|Android Studio" | grep -v grep',
        { shell: true, reject: false },
      )
      const stdout = result.stdout ?? ''
      for (const [ide, config] of Object.entries(supportedIdeConfigs)) {
        for (const keyword of config.processKeywordsMac) {
          if (stdout.includes(keyword)) {
            runningIDEs.push(ide as IdeType)
            break
          }
        }
      }
    } else if (platform === 'windows') {
      // En Windows, se usa tasklist con findstr para varios patrones.
      const result = await execa(
        'tasklist | findstr /I "Code.exe Cursor.exe Windsurf.exe idea64.exe pycharm64.exe webstorm64.exe phpstorm64.exe rubymine64.exe clion64.exe goland64.exe rider64.exe datagrip64.exe appcode.exe dataspell64.exe aqua64.exe gateway64.exe fleet.exe studio64.exe"',
        { shell: true, reject: false },
      )
      const stdout = result.stdout ?? ''

      const normalizedStdout = stdout.toLowerCase()

      for (const [ide, config] of Object.entries(supportedIdeConfigs)) {
        for (const keyword of config.processKeywordsWindows) {
          if (normalizedStdout.includes(keyword.toLowerCase())) {
            runningIDEs.push(ide as IdeType)
            break
          }
        }
      }
    } else if (platform === 'linux') {
      // En Linux, se usa ps con matching de nombre de proceso.
      const result = await execa(
        'ps aux | grep -E "code|cursor|windsurf|idea|pycharm|webstorm|phpstorm|rubymine|clion|goland|rider|datagrip|dataspell|aqua|gateway|fleet|android-studio" | grep -v grep',
        { shell: true, reject: false },
      )
      const stdout = result.stdout ?? ''

      const normalizedStdout = stdout.toLowerCase()

      for (const [ide, config] of Object.entries(supportedIdeConfigs)) {
        for (const keyword of config.processKeywordsLinux) {
          if (normalizedStdout.includes(keyword)) {
            if (ide !== 'vscode') {
              runningIDEs.push(ide as IdeType)
              break
            } else if (
              !normalizedStdout.includes('cursor') &&
              !normalizedStdout.includes('appcode')
            ) {
              // Caso especial para keywords conflictivas de algunos IDEs.
              runningIDEs.push(ide as IdeType)
              break
            }
          }
        }
      }
    }
  } catch (error) {
    // Si la detección de procesos falla, se devuelve un array vacío.
    logError(error as Error)
  }

  return runningIDEs
}

/**
 * Detecta IDEs corriendo y devuelve un array de IdeType para los que están
 * corriendo. Hace una detección fresca (~150ms) y actualiza la caché para
 * llamadas subsecuentes a detectRunningIDEsCached().
 */
export async function detectRunningIDEs(): Promise<IdeType[]> {
  const result = await detectRunningIDEsImpl()
  cachedRunningIDEs = result
  return result
}

/**
 * Devuelve los resultados en caché de detección de IDE, o realiza la
 * detección si la caché está vacía. Se usa para caminos sensibles a
 * rendimiento como tips, donde no hace falta un resultado fresco.
 */
export async function detectRunningIDEsCached(): Promise<IdeType[]> {
  if (cachedRunningIDEs === null) {
    return detectRunningIDEs()
  }
  return cachedRunningIDEs
}

/**
 * Resetea la caché de detectRunningIDEsCached. Exportado para tests -
 * permite resetear el estado entre tests.
 */
export function resetDetectRunningIDEs(): void {
  cachedRunningIDEs = null
}

export function getConnectedIdeName(
  mcpClients: MCPServerConnection[],
): string | null {
  const ideClient = mcpClients.find(
    client => client.type === 'connected' && client.name === 'ide',
  )
  return getIdeClientName(ideClient)
}

export function getIdeClientName(
  ideClient?: MCPServerConnection,
): string | null {
  const config = ideClient?.config
  return config?.type === 'sse-ide' || config?.type === 'ws-ide'
    ? config.ideName
    : isSupportedTerminal()
      ? toIDEDisplayName(envDynamic.terminal)
      : null
}

const EDITOR_DISPLAY_NAMES: Record<string, string> = {
  code: 'VS Code',
  cursor: 'Cursor',
  windsurf: 'Windsurf',
  antigravity: 'Antigravity',
  vi: 'Vim',
  vim: 'Vim',
  nano: 'nano',
  notepad: 'Notepad',
  'start /wait notepad': 'Notepad',
  emacs: 'Emacs',
  subl: 'Sublime Text',
  atom: 'Atom',
}

export function toIDEDisplayName(terminal: string | null): string {
  if (!terminal) return 'IDE'

  const config = supportedIdeConfigs[terminal as IdeType]
  if (config) {
    return config.displayName
  }

  // Comprueba nombres de comando de editor (match exacto primero).
  const editorName = EDITOR_DISPLAY_NAMES[terminal.toLowerCase().trim()]
  if (editorName) {
    return editorName
  }

  // Extrae el nombre del comando de la ruta/argumentos (p. ej.
  // "/usr/bin/code --wait" -> "code").
  const command = terminal.split(' ')[0]
  const commandName = command ? basename(command).toLowerCase() : null
  if (commandName) {
    const mappedName = EDITOR_DISPLAY_NAMES[commandName]
    if (mappedName) {
      return mappedName
    }
    // Alternativa: capitaliza el basename del comando.
    return capitalize(commandName)
  }

  // Alternativa: capitaliza la primera letra.
  return capitalize(terminal)
}

export { callIdeRpc }

/**
 * Obtiene el cliente de IDE conectado de una lista de clientes MCP.
 * @param mcpClients - Array de clientes MCP envueltos.
 * @returns El cliente de IDE conectado, o `undefined` si no se encuentra.
 */
export function getConnectedIdeClient(
  mcpClients?: MCPServerConnection[],
): ConnectedMCPServer | undefined {
  if (!mcpClients) {
    return undefined
  }

  const ideClient = mcpClients.find(
    client => client.type === 'connected' && client.name === 'ide',
  )

  // Type guard para asegurar que se devuelve el tipo correcto.
  return ideClient?.type === 'connected' ? ideClient : undefined
}

/**
 * Notifica al IDE que se envió un nuevo prompt. Esto dispara acciones
 * específicas del IDE, como cerrar todas las pestañas de diff.
 */
export async function closeOpenDiffs(
  ideClient: ConnectedMCPServer,
): Promise<void> {
  try {
    await callIdeRpc('closeAllDiffTabs', {}, ideClient)
  } catch (_) {
    // Se ignoran los errores en silencio al cerrar las pestañas de diff.
    // Esto previene excepciones si el IDE no soporta esta operación.
  }
}

/**
 * Inicializa la detección de IDE y la instalación de extensión, y luego
 * llama al callback provisto con la información del IDE detectado y el
 * estado de instalación.
 * @param ideToInstallExtension El IDE al que instalar la extensión (si se
 * instala desde una terminal externa).
 * @param onIdeDetected Callback a llamar cuando se detecta un IDE (incluido null).
 * @param onInstallationComplete Callback a llamar cuando la instalación de
 * la extensión termina.
 */
export async function initializeIdeIntegration(
  onIdeDetected: (ide: DetectedIDEInfo | null) => void,
  ideToInstallExtension: IdeType | null,
  onShowIdeOnboarding: () => void,
  onInstallationComplete: (
    status: IDEExtensionInstallationStatus | null,
  ) => void,
): Promise<void> {
  const { isEnvTruthy } = requireConfigEnvUtils()

  // No se espera, para no bloquear el arranque, pero se devuelve una
  // promesa que se resuelve con el estado.
  void findAvailableIDE().then(onIdeDetected)

  const shouldAutoInstall = getGlobalConfig().autoInstallIdeExtension ?? true
  if (
    !isEnvTruthy(process.env.CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL) &&
    shouldAutoInstall
  ) {
    const ideType = ideToInstallExtension ?? getTerminalIdeType()
    if (ideType) {
      if (isVSCodeIde(ideType)) {
        void isIDEExtensionInstalled(ideType).then(async isAlreadyInstalled => {
          void maybeInstallIDEExtension(ideType)
            .catch(error => {
              const ideInstallationStatus: IDEExtensionInstallationStatus = {
                installed: false,
                error: error.message || 'Installation failed',
                installedVersion: null,
                ideType: ideType,
              }
              return ideInstallationStatus
            })
            .then(status => {
              onInstallationComplete(status)

              if (status?.installed) {
                // Si se instaló y todavía no tenemos un IDE, se busca de nuevo.
                void findAvailableIDE().then(onIdeDetected)
              }

              if (
                !isAlreadyInstalled &&
                status?.installed === true &&
                !ideOnboardingDialog().hasIdeOnboardingDialogBeenShown()
              ) {
                onShowIdeOnboarding()
              }
            })
        })
      } else if (isJetBrainsIde(ideType)) {
        // Siempre se comprueba la instalación, para poblar la caché
        // síncrona que usan los status notices.
        void isIDEExtensionInstalled(ideType).then(async installed => {
          if (
            installed &&
            !ideOnboardingDialog().hasIdeOnboardingDialogBeenShown()
          ) {
            onShowIdeOnboarding()
          }
        })
      }
    }
  }
}

/**
 * Detecta la IP de host a usar para conectar con la extensión.
 */
const detectHostIP = memoize(
  async (isIdeRunningInWindows: boolean, port: number) => {
    const { getPlatform } = requireConfigPlatform()

    if (process.env.CLAUDE_CODE_IDE_HOST_OVERRIDE) {
      return process.env.CLAUDE_CODE_IDE_HOST_OVERRIDE
    }

    if (getPlatform() !== 'wsl' || !isIdeRunningInWindows) {
      return '127.0.0.1'
    }

    // Si corremos bajo la VM de WSL2 pero la extensión/plugin corre en
    // Windows, se debe usar una dirección IP distinta para conectar con
    // la extensión. https://learn.microsoft.com/en-us/windows/wsl/networking
    try {
      const routeResult = await execa('ip route show | grep -i default', {
        shell: true,
        reject: false,
      })
      if (routeResult.exitCode === 0 && routeResult.stdout) {
        const gatewayMatch = routeResult.stdout.match(
          /default via (\d+\.\d+\.\d+\.\d+)/,
        )
        if (gatewayMatch) {
          const gatewayIP = gatewayMatch[1]!
          if (await checkIdeConnection(gatewayIP, port)) {
            return gatewayIP
          }
        }
      }
    } catch (_) {
      // Se suprime cualquier error.
    }

    // Se cae a la dirección por defecto si no se encuentra nada.
    return '127.0.0.1'
  },
  (isIdeRunningInWindows, port) => `${isIdeRunningInWindows}:${port}`,
)

async function installFromArtifactory(command: string): Promise<string> {
  const { logError } = requireLocalObservabilityLogging()
  const { getFsImplementation } = requireStorageFsOperations()
  const { sleep } = requireConfigSleep()

  // Lee el token de auth desde ~/.npmrc.
  const npmrcPath = join(os.homedir(), '.npmrc')
  let authToken: string | null = null
  const fs = getFsImplementation()

  try {
    const npmrcContent = await fs.readFile(npmrcPath, {
      encoding: 'utf8',
    })
    const lines = npmrcContent.split('\n')
    for (const line of lines) {
      // Busca la línea de token de auth de artifactory.
      const match = line.match(
        /\/\/artifactory\.infra\.ant\.dev\/artifactory\/api\/npm\/npm-all\/:_authToken=(.+)/,
      )
      if (match && match[1]) {
        authToken = match[1].trim()
        break
      }
    }
  } catch (error) {
    logError(error as Error)
    throw new Error(`Failed to read npm authentication: ${error}`)
  }

  if (!authToken) {
    throw new Error('No artifactory auth token found in ~/.npmrc')
  }

  // Obtiene la versión desde artifactory.
  const versionUrl =
    'https://artifactory.infra.ant.dev/artifactory/armorcode-claude-code-how-works-how-works-internal/claude-vscode-releases/stable'

  try {
    const versionResponse = await axios.get(versionUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    const version = versionResponse.data.trim()
    if (!version) {
      throw new Error('No version found in artifactory response')
    }

    // Descarga el archivo .vsix desde artifactory.
    const vsixUrl = `https://artifactory.infra.ant.dev/artifactory/armorcode-claude-code-how-works-how-works-internal/claude-vscode-releases/${version}/claude-code-how-works-how-works.vsix`
    const tempVsixPath = join(
      os.tmpdir(),
      `claude-code-how-works-how-works-${version}-${Date.now()}.vsix`,
    )

    try {
      const vsixResponse = await axios.get(vsixUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        responseType: 'stream',
      })

      // Escribe el archivo descargado a disco.
      const writeStream = getFsImplementation().createWriteStream(tempVsixPath)
      await new Promise<void>((resolve, reject) => {
        vsixResponse.data.pipe(writeStream)
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
      })

      // Instala el archivo .vsix.
      // Se agrega un delay para evitar crashes del comando code.
      await sleep(500)

      const { execFileNoThrowWithCwd } = requireShellExecFileNoThrow()
      const result = await execFileNoThrowWithCwd(
        command,
        ['--force', '--install-extension', tempVsixPath],
        {
          env: getInstallationEnv(),
        },
      )

      if (result.code !== 0) {
        throw new Error(`${result.code}: ${result.error} ${result.stderr}`)
      }

      return version
    } finally {
      // Limpia el archivo temporal.
      try {
        await fs.unlink(tempVsixPath)
      } catch {
        // Se ignoran errores de limpieza.
      }
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to fetch extension version from artifactory: ${error.message}`,
      )
    }
    throw error
  }
}
