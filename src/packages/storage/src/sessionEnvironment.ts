/**
 * Puerto COMPLETO de `ccnmt: packages/storage/src/sessionEnvironment.ts`
 * (167 líneas fuente). Carga scripts de entorno de sesión que los hooks
 * (`Setup`, `SessionStart`, `CwdChanged`, `FileChanged`) escriben como
 * archivos `.sh` en `~/.claude/session-env/<sessionId>/`, para
 * activar/desactivar venv/conda entre invocaciones de shell.
 *
 * Cinco dependencias hermanas ausentes:
 *
 *  - `getSessionId` (`app-host/bootstrap/state.js`) — se importa de
 *    `./sessionPaths.js` (uno de mis 14 módulos), no se reimplementa.
 *  - `getClaudeConfigHomeDir` (`config/env/utils`) — reimplementación
 *    PRIVADA fiel (mismo cuerpo que ya usan `projectPurge.ts` y
 *    `sessionPaths.ts` de este paquete — cada archivo la duplica a
 *    propósito, aislamiento de working tree por tanda).
 *  - `errorMessage`/`getErrnoCode`
 *    (`local-observability/errorHelpers.js`) — fieles, tres líneas cada
 *    una.
 *
 * `logForDebugging` y `readEnv` SÍ se reusan de verdad: se importan de
 * `./internal/pendingCrossPackageDeps.js`, sustitutos ya presentes en
 * este paquete — no se duplican. `getPlatform` de ese mismo shim SÍ se
 * reusa como valor por defecto, pero envuelto en un DI local
 * (`setGetPlatformFn`) — el shim lee `process.platform` sin setter, y sin
 * uno no hay forma de ejercitar en test la rama Windows de
 * `getSessionEnvironmentScript` (el contenedor de esta tarea corre
 * Linux).
 */
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import {
  getPlatform as getPlatformDefault,
  logForDebugging,
  readEnv,
} from './internal/pendingCrossPackageDeps.js'
import { getSessionId } from './sessionPaths.js'

let _getPlatform: typeof getPlatformDefault = getPlatformDefault
export function setGetPlatformFn(fn: typeof getPlatformDefault): void {
  _getPlatform = fn
}

function getClaudeConfigHomeDir(): string {
  return (process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')).normalize(
    'NFC',
  )
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

// Estados de caché:
// undefined = aún no cargado (hay que revisar disco)
// null = ya se revisó disco, no existen archivos (no volver a revisar)
// string = cargado y cacheado (usar el valor cacheado)
let sessionEnvScript: string | null | undefined

export async function getSessionEnvDirPath(): Promise<string> {
  const sessionEnvDir = join(
    getClaudeConfigHomeDir(),
    'session-env',
    getSessionId(),
  )
  await mkdir(sessionEnvDir, { recursive: true })
  return sessionEnvDir
}

export async function getHookEnvFilePath(
  hookEvent: 'Setup' | 'SessionStart' | 'CwdChanged' | 'FileChanged',
  hookIndex: number,
): Promise<string> {
  const prefix = hookEvent.toLowerCase()
  return join(await getSessionEnvDirPath(), `${prefix}-hook-${hookIndex}.sh`)
}

export async function clearCwdEnvFiles(): Promise<void> {
  try {
    const dir = await getSessionEnvDirPath()
    const files = await readdir(dir)
    await Promise.all(
      files
        .filter(
          f =>
            (f.startsWith('filechanged-hook-') ||
              f.startsWith('cwdchanged-hook-')) &&
            HOOK_ENV_REGEX.test(f),
        )
        .map(f => writeFile(join(dir, f), '')),
    )
  } catch (e: unknown) {
    const code = getErrnoCode(e)
    if (code !== 'ENOENT') {
      logForDebugging(`Failed to clear cwd env files: ${errorMessage(e)}`)
    }
  }
}

export function invalidateSessionEnvCache(): void {
  logForDebugging('Invalidating session environment cache')
  sessionEnvScript = undefined
}

export async function getSessionEnvironmentScript(): Promise<string | null> {
  if (_getPlatform() === 'windows') {
    logForDebugging('Session environment not yet supported on Windows')
    return null
  }

  if (sessionEnvScript !== undefined) {
    return sessionEnvScript
  }

  const scripts: string[] = []

  // Revisa CLAUDE_ENV_FILE pasado desde el proceso padre (p. ej. el
  // corredor de trayectorias HFI). Esto permite que la activación de
  // venv/conda persista entre comandos de shell.
  const envFile = readEnv('CLAUDE_ENV_FILE')
  if (envFile) {
    try {
      const envScript = (await readFile(envFile, 'utf8')).trim()
      if (envScript) {
        scripts.push(envScript)
        logForDebugging(
          `Session environment loaded from CLAUDE_ENV_FILE: ${envFile} (${envScript.length} chars)`,
        )
      }
    } catch (e: unknown) {
      const code = getErrnoCode(e)
      if (code !== 'ENOENT') {
        logForDebugging(`Failed to read CLAUDE_ENV_FILE: ${errorMessage(e)}`)
      }
    }
  }

  // Carga los archivos de entorno de hook del directorio de sesión.
  const sessionEnvDir = await getSessionEnvDirPath()
  try {
    const files = await readdir(sessionEnvDir)
    // Se ordenan los archivos de entorno de hook según el orden en que
    // aparecen listados en settings.json, para que el entorno resultante
    // sea determinista.
    const hookFiles = files
      .filter(f => HOOK_ENV_REGEX.test(f))
      .sort(sortHookEnvFiles)

    for (const file of hookFiles) {
      const filePath = join(sessionEnvDir, file)
      try {
        const content = (await readFile(filePath, 'utf8')).trim()
        if (content) {
          scripts.push(content)
        }
      } catch (e: unknown) {
        const code = getErrnoCode(e)
        if (code !== 'ENOENT') {
          logForDebugging(
            `Failed to read hook file ${filePath}: ${errorMessage(e)}`,
          )
        }
      }
    }

    if (hookFiles.length > 0) {
      logForDebugging(
        `Session environment loaded from ${hookFiles.length} hook file(s)`,
      )
    }
  } catch (e: unknown) {
    const code = getErrnoCode(e)
    if (code !== 'ENOENT') {
      logForDebugging(
        `Failed to load session environment from hooks: ${errorMessage(e)}`,
      )
    }
  }

  if (scripts.length === 0) {
    logForDebugging('No session environment scripts found')
    sessionEnvScript = null
    return sessionEnvScript
  }

  sessionEnvScript = scripts.join('\n')
  logForDebugging(
    `Session environment script ready (${sessionEnvScript.length} chars total)`,
  )
  return sessionEnvScript
}

const HOOK_ENV_PRIORITY: Record<string, number> = {
  setup: 0,
  sessionstart: 1,
  cwdchanged: 2,
  filechanged: 3,
}
const HOOK_ENV_REGEX =
  /^(setup|sessionstart|cwdchanged|filechanged)-hook-(\d+)\.sh$/

function sortHookEnvFiles(a: string, b: string): number {
  const aMatch = a.match(HOOK_ENV_REGEX)
  const bMatch = b.match(HOOK_ENV_REGEX)
  const aType = aMatch?.[1] || ''
  const bType = bMatch?.[1] || ''
  if (aType !== bType) {
    return (HOOK_ENV_PRIORITY[aType] ?? 99) - (HOOK_ENV_PRIORITY[bType] ?? 99)
  }
  const aIndex = parseInt(aMatch?.[2] || '0', 10)
  const bIndex = parseInt(bMatch?.[2] || '0', 10)
  return aIndex - bIndex
}
