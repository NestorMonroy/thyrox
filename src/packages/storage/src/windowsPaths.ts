import { execSync } from 'node:child_process'
import * as path from 'path'
import * as pathWin32 from 'path/win32'
import {
  getCwd,
  getPlatform,
  logForDebugging,
  memoize,
  memoizeWithLRU,
} from './internal/pendingCrossPackageDeps.js'

/**
 * Adaptación de `ccnmt: packages/storage/src/windowsPaths.ts`. Las
 * conversiones Windows ↔ POSIX (`windowsPathToPosixPath`,
 * `posixPathToWindowsPath`) son fieles a la fuente, símbolo por símbolo.
 *
 * Sustituciones — ver `./internal/pendingCrossPackageDeps.ts` para el
 * porqué de cada una (`getCwd`, `getPlatform`, `memoize`, `memoizeWithLRU`,
 * `logForDebugging`). Aquí sólo `execSync`: la fuente la trae de
 * `@claude-code-how-works/shell/execSyncWrapper.js` (un wrapper de
 * tipos/seguridad); este porte usa `node:child_process`'s `execSync`
 * directo — mismo built-in que el wrapper envuelve, con la misma firma
 * para las dos llamadas que aquí se hacen (`stdio: 'pipe'`,
 * `encoding: 'utf8'`).
 */

/**
 * Revisa si un archivo o directorio existe en Windows usando el comando dir.
 * @param path - La ruta a revisar
 * @returns true si la ruta existe, false en otro caso
 */
function checkPathExists(path: string): boolean {
  try {
    execSync(`dir "${path}"`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/**
 * Encuentra un ejecutable usando where.exe en Windows.
 * @param executable - El nombre del ejecutable a encontrar
 * @returns La ruta al ejecutable o null si no se encuentra
 */
function findExecutable(executable: string): string | null {
  // Para git, revisa primero las ubicaciones de instalación comunes.
  if (executable === 'git') {
    const defaultLocations = [
      // revisa 64 bit antes que 32 bit
      'C:\\Program Files\\Git\\cmd\\git.exe',
      'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
      // deliberadamente NO se busca
      // C:\Program Files\Git\mingw64\bin\git.exe porque ese directorio son
      // las herramientas "crudas" sin el entorno configurado
    ]

    for (const location of defaultLocations) {
      if (checkPathExists(location)) {
        return location
      }
    }
  }

  // Recae en where.exe.
  try {
    const result = execSync(`where.exe ${executable}`, {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim()

    // SEGURIDAD: filtra cualquier resultado del directorio actual para
    // evitar ejecutar un git.bat/cmd/exe malicioso.
    const paths = result.split('\r\n').filter(Boolean)
    const cwd = getCwd().toLowerCase()

    for (const candidatePath of paths) {
      // Normaliza y compara rutas para asegurar que no estamos en el
      // directorio actual.
      const normalizedPath = path.resolve(candidatePath).toLowerCase()
      const pathDir = path.dirname(normalizedPath).toLowerCase()

      // Salta si el ejecutable está en el directorio de trabajo actual.
      if (pathDir === cwd || normalizedPath.startsWith(cwd + path.sep)) {
        logForDebugging(
          `Skipping potentially malicious executable in current directory: ${candidatePath}`,
        )
        continue
      }

      // Retorna la primera ruta válida que no esté en el directorio actual.
      return candidatePath
    }

    return null
  } catch {
    return null
  }
}

/**
 * Si es Windows, fija la variable de entorno SHELL a la ruta de git-bash.
 * La usan BashTool y Shell.ts para comandos de shell del usuario. COMSPEC
 * se deja sin tocar para la ejecución de procesos del sistema.
 *
 * Cuando no se encuentra git-bash, SHELL se deja sin fijar (o con su valor
 * previo). La ejecución de bash mostrará un error claro cuando un comando
 * bash de verdad se ejecute; los comandos de PowerShell y herramientas
 * que no son shell siguen totalmente usables.
 */
export function setShellIfWindows(): void {
  if (getPlatform() === 'windows') {
    const gitBashPath = findGitBashPath()
    if (gitBashPath) {
      process.env.SHELL = gitBashPath
      logForDebugging(`Using bash path: "${gitBashPath}"`)
    } else {
      logForDebugging(
        'Git Bash not found — bash commands will fail; PowerShell and other tools remain available.',
        { level: 'warn' },
      )
    }
  }
}

/**
 * Encuentra la ruta donde existe `bash.exe` incluido con git-bash.
 * Retorna null cuando no se encuentra git-bash — quien llama decide si
 * eso es fatal para su caso de uso específico (p. ej. un hook de bash
 * falla, pero los hooks de PowerShell y herramientas que no son shell
 * siguen funcionando).
 */
export const findGitBashPath = memoize((): string | null => {
  if (process.env.CLAUDE_CODE_GIT_BASH_PATH) {
    if (checkPathExists(process.env.CLAUDE_CODE_GIT_BASH_PATH)) {
      return process.env.CLAUDE_CODE_GIT_BASH_PATH
    }
    console.error(
      `Claude Code was unable to find CLAUDE_CODE_GIT_BASH_PATH path "${process.env.CLAUDE_CODE_GIT_BASH_PATH}"`,
    )
    return null
  }

  const gitPath = findExecutable('git')
  if (gitPath) {
    const bashPath = pathWin32.join(gitPath, '..', '..', 'bin', 'bash.exe')
    if (checkPathExists(bashPath)) {
      return bashPath
    }
  }

  return null
})

/** Convierte una ruta de Windows a una ruta POSIX usando JS puro. */
export const windowsPathToPosixPath = memoizeWithLRU(
  (windowsPath: string): string => {
    // Rutas UNC: \\server\share -> //server/share
    if (windowsPath.startsWith('\\\\')) {
      return windowsPath.replace(/\\/g, '/')
    }
    // Rutas con letra de unidad: C:\Users\foo -> /c/Users/foo
    const match = windowsPath.match(/^([A-Za-z]):[/\\]/)
    if (match) {
      const driveLetter = match[1]!.toLowerCase()
      return '/' + driveLetter + windowsPath.slice(2).replace(/\\/g, '/')
    }
    // Ya POSIX o relativo — sólo invierte las barras.
    return windowsPath.replace(/\\/g, '/')
  },
  (p: string) => p,
  500,
)

/** Convierte una ruta POSIX a una ruta de Windows usando JS puro. */
export const posixPathToWindowsPath = memoizeWithLRU(
  (posixPath: string): string => {
    // Rutas UNC: //server/share -> \\server\share
    if (posixPath.startsWith('//')) {
      return posixPath.replace(/\//g, '\\')
    }
    // Formato /cygdrive/c/...
    const cygdriveMatch = posixPath.match(/^\/cygdrive\/([A-Za-z])(\/|$)/)
    if (cygdriveMatch) {
      const driveLetter = cygdriveMatch[1]!.toUpperCase()
      const rest = posixPath.slice(('/cygdrive/' + cygdriveMatch[1]).length)
      return driveLetter + ':' + (rest || '\\').replace(/\//g, '\\')
    }
    // Formato /c/... (MSYS2/Git Bash)
    const driveMatch = posixPath.match(/^\/([A-Za-z])(\/|$)/)
    if (driveMatch) {
      const driveLetter = driveMatch[1]!.toUpperCase()
      const rest = posixPath.slice(2)
      return driveLetter + ':' + (rest || '\\').replace(/\//g, '\\')
    }
    // Ya Windows o relativo — sólo invierte las barras.
    return posixPath.replace(/\//g, '\\')
  },
  (p: string) => p,
  500,
)
