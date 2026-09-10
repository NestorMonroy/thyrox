/**
 * Bloqueo de versión basado en PID
 *
 * Este módulo provee bloqueo basado en PID para versiones de Claude Code
 * en ejecución. A diferencia del bloqueo basado en mtime (que puede
 * mantener bloqueos hasta 30 días después de un crash), el bloqueo
 * basado en PID puede detectar de inmediato cuándo un proceso ya no
 * está corriendo.
 *
 * Los archivos de lock contienen JSON con el PID y metadata, y la
 * obsolescencia se determina chequeando si el proceso sigue vivo.
 *
 * Puerto de `ccnmt: packages/updater/src/nativeInstaller/pidLock.ts`
 * (433 líneas fuente).
 *
 * Cobertura: 100% de los símbolos exportados por la fuente. Dos
 * divergencias de import declaradas:
 *
 *   - `isEnvDefinedFalsy` — la fuente la importa de
 *     `config/env/utils.ts`, cuyo puerto en este árbol es PARCIAL
 *     DECLARADO (ver su propio docstring: sólo porta las 3 funciones
 *     que `shell/subprocessEnv.ts` ejercita). Se reimplementa aquí
 *     localmente, verbatim contra la fuente.
 *   - `getProcessCommand` — la fuente la importa de
 *     `shell/genericProcessUtils.ts`, que NO existe en
 *     `@thyrox/shell` (medido: 0 archivos `genericProcessUtils*` bajo
 *     `src/packages/shell`). Se reimplementa localmente usando
 *     `execSyncWithDefaults` (que sí está portado, re-exportado desde
 *     `@thyrox/shell/execFileNoThrow.js`), con el mismo cuerpo que la
 *     fuente (`ccnmt: packages/shell/src/genericProcessUtils.ts:120-133`).
 */

import { basename, join } from 'path'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { isENOENT, toError } from '@thyrox/local-observability/errorHelpers.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { execSyncWithDefaults } from '@thyrox/shell/execFileNoThrow.js'
import { logError } from '@thyrox/local-observability/log.js'
import {
  jsonParse,
  jsonStringify,
  writeFileSync,
} from '@thyrox/local-observability/slowOperations.js'

/**
 * Ver docstring del módulo. Puerto local de `isEnvDefinedFalsy`, verbatim
 * contra `ccnmt: packages/config/env/utils.ts` — interpreta un valor de
 * variable de entorno como "falso explícito" (`0`, `false`, `no`, `off`,
 * sin distinguir mayúsculas, con espacios al margen).
 */
function isEnvDefinedFalsy(envVar: string | boolean | undefined): boolean {
  if (envVar === undefined) return false
  const normalized = String(envVar).trim().toLowerCase()
  return ['0', 'false', 'no', 'off'].includes(normalized)
}

/**
 * Ver docstring del módulo. Puerto local de `getProcessCommand`, verbatim
 * contra `ccnmt: packages/shell/src/genericProcessUtils.ts:120-133`.
 */
function getProcessCommand(pid: string | number): string | null {
  try {
    const pidStr = String(pid)
    const command =
      process.platform === 'win32'
        ? `powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId=${pidStr}\\").CommandLine"`
        : `ps -o command= -p ${pidStr}`

    const result = execSyncWithDefaults(command, { timeout: 1000 })
    return result ? result.trim() : null
  } catch {
    return null
  }
}

/**
 * Chequea si el bloqueo de version basado en PID esta habilitado.
 * Cuando esta deshabilitado, cae al bloqueo basado en mtime (timeout de
 * 30 dias).
 *
 * Controlado por gate de GrowthBook con override local:
 * - Setea ENABLE_PID_BASED_VERSION_LOCKING=true para forzar habilitarlo
 * - Setea ENABLE_PID_BASED_VERSION_LOCKING=false para forzar deshabilitarlo
 * - Si no esta seteado, el gate de GrowthBook (tengu_pid_based_version_locking) controla el rollout
 */
export function isPidBasedLockingEnabled(): boolean {
  const envVar = process.env.ENABLE_PID_BASED_VERSION_LOCKING
  // Si la env var esta seteada explicitamente, respetarla
  if (isEnvTruthy(envVar)) {
    return true
  }
  if (isEnvDefinedFalsy(envVar)) {
    return false
  }
  // GrowthBook controla el rollout gradual (devuelve false para usuarios externos)
  return getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_pid_based_version_locking',
    false,
  )
}

/**
 * Contenido guardado en un archivo de lock de version
 */
export type VersionLockContent = {
  pid: number
  version: string
  execPath: string
  acquiredAt: number // timestamp de cuando se adquirio el lock
}

/**
 * Informacion sobre un lock para propositos de diagnostico
 */
export type LockInfo = {
  version: string
  pid: number
  isProcessRunning: boolean
  execPath: string
  acquiredAt: Date
  lockFilePath: string
}

// Timeout de obsolescencia de respaldo (2 horas) - se usa cuando el
// chequeo de PID es inconcluso. Es mucho mas corto que el timeout
// anterior de 30 dias pero aun asi permite casos borde como
// filesystems de red donde el chequeo de PID podria fallar
const FALLBACK_STALE_MS = 2 * 60 * 60 * 1000

/**
 * Chequea si un proceso con el PID dado esta corriendo actualmente.
 * Usa la señal 0 que no envia una señal real sino que chequea si se puede
 */
export function isProcessRunning(pid: number): boolean {
  // El PID 0 es especial - se refiere al grupo de procesos actual, no a
  // un proceso real. El PID 1 es init/systemd y siempre esta corriendo
  // pero no deberia considerarse para locks
  if (pid <= 1) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Valida que un proceso en ejecucion sea realmente un proceso de Claude.
 * Ayuda a mitigar problemas de reuso de PID
 */
function isClaudeProcess(pid: number, expectedExecPath: string): boolean {
  if (!isProcessRunning(pid)) {
    return false
  }

  // Si el PID calza con nuestro proceso actual, sabemos que es valido.
  // Esto maneja entornos de test donde el comando podria no contener 'claude'
  if (pid === process.pid) {
    return true
  }

  try {
    const command = getProcessCommand(pid)
    if (!command) {
      // Si no se puede obtener el comando, confiar en el chequeo de PID.
      // Es conservador - preferimos no borrar una version en ejecucion
      return true
    }

    // Chequea si el comando contiene 'claude' o el exec path esperado
    const normalizedCommand = command.toLowerCase()
    const normalizedExecPath = expectedExecPath.toLowerCase()

    return (
      normalizedCommand.includes('claude') ||
      normalizedCommand.includes(normalizedExecPath)
    )
  } catch {
    // Si el chequeo de comando falla, confiar en el chequeo de PID
    return true
  }
}

/**
 * Lee y parsea el contenido de un archivo de lock
 */
export function readLockContent(
  lockFilePath: string,
): VersionLockContent | null {
  const fs = getFsImplementation()

  try {
    const content = fs.readFileSync(lockFilePath, { encoding: 'utf8' })
    if (!content || content.trim() === '') {
      return null
    }

    const parsed = jsonParse(content) as VersionLockContent

    // Valida los campos requeridos
    if (typeof parsed.pid !== 'number' || !parsed.version || !parsed.execPath) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * Chequea si un archivo de lock representa un lock activo (proceso aun corriendo)
 */
export function isLockActive(lockFilePath: string): boolean {
  const content = readLockContent(lockFilePath)

  if (!content) {
    return false
  }

  const { pid, execPath } = content

  // Chequeo primario: ¿el proceso esta corriendo?
  if (!isProcessRunning(pid)) {
    return false
  }

  // Validacion secundaria: ¿es realmente un proceso de Claude?
  // Ayuda con escenarios de reuso de PID
  if (!isClaudeProcess(pid, execPath)) {
    logForDebugging(
      `Lock PID ${pid} is running but does not appear to be Claude - treating as stale`,
    )
    return false
  }

  // Respaldo: si el lock es muy viejo (> 2 horas) y no se puede validar
  // el comando, ser conservador y considerarlo potencialmente obsoleto.
  // Maneja casos borde como filesystems de red
  const fs = getFsImplementation()
  try {
    const stats = fs.statSync(lockFilePath)
    const age = Date.now() - stats.mtimeMs
    if (age > FALLBACK_STALE_MS) {
      // Doble-chequeo de que aun se puede ver el proceso
      if (!isProcessRunning(pid)) {
        return false
      }
    }
  } catch {
    // Si no se puede stat el archivo, confiar en el chequeo de PID
  }

  return true
}

/**
 * Escribe el contenido del lock a un archivo atomicamente
 */
function writeLockFile(
  lockFilePath: string,
  content: VersionLockContent,
): void {
  const fs = getFsImplementation()
  const tempPath = `${lockFilePath}.tmp.${process.pid}.${Date.now()}`

  try {
    writeFileSync(tempPath, jsonStringify(content, null, 2), {
      encoding: 'utf8',
      flush: true,
    })
    fs.renameSync(tempPath, lockFilePath)
  } catch (error) {
    // Limpia el archivo temporal en caso de fallo (best-effort)
    try {
      fs.unlinkSync(tempPath)
    } catch {
      // Ignora errores de limpieza (ENOENT esperado si el write fallo antes de crear el archivo)
    }
    throw error
  }
}

/**
 * Intenta adquirir un lock sobre un archivo de version.
 * Devuelve una funcion de release si tuvo exito, null si el lock ya esta tomado
 */
export async function tryAcquireLock(
  versionPath: string,
  lockFilePath: string,
): Promise<(() => void) | null> {
  const fs = getFsImplementation()
  const versionName = basename(versionPath)

  // Chequea si hay un lock activo existente (incluyendo de nuestro propio
  // proceso). Usa isLockActive para consistencia con la limpieza - chequea
  // tanto que el PID este corriendo COMO que sea realmente un proceso de
  // Claude (para manejar escenarios de reuso de PID)
  if (isLockActive(lockFilePath)) {
    const existingContent = readLockContent(lockFilePath)
    logForDebugging(
      `Cannot acquire lock for ${versionName} - held by PID ${existingContent?.pid}`,
    )
    return null
  }

  // Intenta adquirir el lock
  const lockContent: VersionLockContent = {
    pid: process.pid,
    version: versionName,
    execPath: process.execPath,
    acquiredAt: Date.now(),
  }

  try {
    writeLockFile(lockFilePath, lockContent)

    // Verifica que realmente obtuvimos el lock (chequeo de condicion de carrera)
    const verifyContent = readLockContent(lockFilePath)
    if (verifyContent?.pid !== process.pid) {
      // Otro proceso gano la carrera
      return null
    }

    logForDebugging(`Acquired PID lock for ${versionName} (PID ${process.pid})`)

    // Devuelve la funcion de release
    return () => {
      try {
        // Solo libera si aun somos dueños del lock
        const currentContent = readLockContent(lockFilePath)
        if (currentContent?.pid === process.pid) {
          fs.unlinkSync(lockFilePath)
          logForDebugging(`Released PID lock for ${versionName}`)
        }
      } catch (error) {
        logForDebugging(`Failed to release lock for ${versionName}: ${error}`)
      }
    }
  } catch (error) {
    logForDebugging(`Failed to acquire lock for ${versionName}: ${error}`)
    return null
  }
}

/**
 * Adquiere un lock y lo mantiene por la vida del proceso.
 * Se usa para bloquear la version actualmente en ejecucion
 */
export async function acquireProcessLifetimeLock(
  versionPath: string,
  lockFilePath: string,
): Promise<boolean> {
  const release = await tryAcquireLock(versionPath, lockFilePath)

  if (!release) {
    return false
  }

  // Registra la limpieza en la salida del proceso
  const cleanup = () => {
    try {
      release()
    } catch {
      // Ignora errores durante la salida del proceso
    }
  }

  process.on('exit', cleanup)
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  // No llama a release() - queremos mantener el lock hasta que el proceso termine
  return true
}

/**
 * Ejecuta un callback mientras se mantiene un lock.
 * Devuelve true si el callback se ejecuto, false si no se pudo adquirir el lock
 */
export async function withLock(
  versionPath: string,
  lockFilePath: string,
  callback: () => void | Promise<void>,
): Promise<boolean> {
  const release = await tryAcquireLock(versionPath, lockFilePath)

  if (!release) {
    return false
  }

  try {
    await callback()
    return true
  } finally {
    release()
  }
}

/**
 * Obtiene informacion sobre todos los locks de version para diagnostico
 */
export function getAllLockInfo(locksDir: string): LockInfo[] {
  const fs = getFsImplementation()
  const lockInfos: LockInfo[] = []

  try {
    const lockFiles = fs
      .readdirStringSync(locksDir)
      .filter((f: string) => f.endsWith('.lock'))

    for (const lockFile of lockFiles) {
      const lockFilePath = join(locksDir, lockFile)
      const content = readLockContent(lockFilePath)

      if (content) {
        lockInfos.push({
          version: content.version,
          pid: content.pid,
          isProcessRunning: isProcessRunning(content.pid),
          execPath: content.execPath,
          acquiredAt: new Date(content.acquiredAt),
          lockFilePath,
        })
      }
    }
  } catch (error) {
    if (isENOENT(error)) {
      return lockInfos
    }
    logError(toError(error))
  }

  return lockInfos
}

/**
 * Limpia locks obsoletos (locks donde el proceso ya no esta corriendo).
 * Devuelve el numero de locks limpiados
 *
 * Maneja tanto:
 * - Locks basados en PID (archivos que contienen JSON con el PID)
 * - Locks legacy de proper-lockfile (directorios creados por el bloqueo basado en mtime)
 */
export function cleanupStaleLocks(locksDir: string): number {
  const fs = getFsImplementation()
  let cleanedCount = 0

  try {
    const lockEntries = fs
      .readdirStringSync(locksDir)
      .filter((f: string) => f.endsWith('.lock'))

    for (const lockEntry of lockEntries) {
      const lockFilePath = join(locksDir, lockEntry)

      try {
        const stats = fs.lstatSync(lockFilePath)

        if (stats.isDirectory()) {
          // Lock legacy de directorio proper-lockfile - siempre se
          // remueve cuando el bloqueo basado en PID esta habilitado,
          // porque vienen de un mecanismo de bloqueo distinto
          fs.rmSync(lockFilePath, { recursive: true, force: true })
          cleanedCount++
          logForDebugging(`Cleaned up legacy directory lock: ${lockEntry}`)
        } else if (!isLockActive(lockFilePath)) {
          // Lock de archivo basado en PID sin proceso en ejecucion
          fs.unlinkSync(lockFilePath)
          cleanedCount++
          logForDebugging(`Cleaned up stale lock: ${lockEntry}`)
        }
      } catch {
        // Ignora errores de limpieza individuales
      }
    }
  } catch (error) {
    if (isENOENT(error)) {
      return 0
    }
    logError(toError(error))
  }

  return cleanedCount
}
