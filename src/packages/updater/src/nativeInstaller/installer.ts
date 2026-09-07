/**
 * Instalador nativo — instalador basado en archivos (docs/native-installer.md):
 * layout de directorio+symlink, activacion de version, locking
 * multi-proceso, fallback por mtime, soporte de build JS/nativo.
 *
 * Los bloques `catch {}` vacios son operaciones de filesystem best-effort:
 * sondas de stat, limpieza de temporales obsoletos, gc oportunista. El
 * lock + fallback de mtime garantiza reintento seguro en la siguiente
 * corrida; ninguno de estos errores bloquea la correctitud de la
 * instalacion, asi que se tragan en silencio.
 *
 * Puerto de `ccnmt: packages/updater/src/nativeInstaller/installer.ts`
 * (1794 líneas fuente).
 *
 * Cobertura: TODOS los símbolos exportados (`SetupMessage`,
 * `checkInstall`, `installLatest`, `lockCurrentVersion`,
 * `cleanupOldVersions`, `removeInstalledSymlink`, `cleanupShellAliases`,
 * `cleanupNpmInstallations`) y todos los helpers privados. 100% de su
 * lógica de orquestación.
 *
 * Divergencias declaradas — reusa los sustitutos ya creados por este
 * agente para `autoUpdater.ts`, más dos nuevos:
 *
 *   - `getGlobalConfig`/`saveGlobalConfig` (`config`, bare) → ver
 *     `./internal/globalConfigCompat.js` (ya usado por autoUpdater.ts).
 *   - `filterClaudeAliases`/`getShellConfigPaths`/`readFileLines`/
 *     `writeFileLines` (`shell/shellConfig.ts`) → ver
 *     `./internal/shellConfigCompat.js`.
 *   - `isVersionNewer` (`config/semver`) → `./internal/semverCompat.js`.
 *   - `getCurrentInstallationType`/`getShellType` (`repl`, paquete
 *     ENTERO ausente) → ver `./internal/replCompat.js`.
 *   - `env`/`envDynamic` (`config/env`, `config/env/dynamic`) — la
 *     fuente los importa y NUNCA LOS USA (medido:
 *     `grep -n "\benv\.\|envDynamic\." installer.ts` en ccnmt → 0
 *     hits). Se omiten — portar un import muerto no es cobertura, es
 *     ruido.
 */

import { constants as fsConstants, type Stats } from 'fs'
import {
  access,
  chmod,
  copyFile,
  lstat as _lstat,
  mkdir,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
  symlink,
  unlink,
  writeFile,
} from 'fs/promises'
import { homedir } from 'os'
import { basename, delimiter, dirname, join, resolve } from 'path'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import {
  getCanaryVersion,
  getMaxVersionAndForceDowngrade,
  shouldForceDowngradeNow,
  shouldSkipVersion,
} from '../autoUpdater.js'
import { registerCleanup } from '@thyrox/app-host/bootstrap/cleanupRegistry.js'
import { getGlobalConfig, saveGlobalConfig } from '../internal/globalConfigCompat.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getCurrentInstallationType, getShellType } from '../internal/replCompat.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { errorMessage, getErrnoCode, isENOENT, toError } from '@thyrox/local-observability/errorHelpers.js'
import { execFileNoThrowWithCwd } from '@thyrox/shell/execFileNoThrow.js'
import * as lockfile from '@thyrox/storage/lockfile.js'
import { logError } from '@thyrox/local-observability/log.js'
import { isVersionNewer } from '../internal/semverCompat.js'
import { tryGetShellConfig } from '../internal/shellConfigCompat.js'
import { sleep } from '@thyrox/config/sleep'
import {
  getUserBinDir,
  getXDGCacheHome,
  getXDGDataHome,
  getXDGStateHome,
} from '@thyrox/storage/xdg.js'
import { downloadVersion, getLatestVersion } from './download.js'
import {
  acquireProcessLifetimeLock,
  cleanupStaleLocks,
  isLockActive,
  isPidBasedLockingEnabled,
  readLockContent,
  withLock,
} from './pidLock.js'
import { getBinaryName, getPlatform } from './platform.js'
import { getLauncherOwnership } from './launcherOwnership.js'

/** Ver docstring del módulo — sustituto local del global `MACRO` de ccnmt. */
const MACRO = {
  VERSION: process.env.CCB_VERSION ?? '0.0.0',
  PACKAGE_URL: process.env.CCB_PACKAGE_URL ?? '',
}

// Total de binarios (protegidos + elegibles) a mantener en disco tras
// la limpieza. install.sh / install.ps1 usan el mismo numero, asi que
// los flujos manual + nativo concuerdan en huella de disco. Con 2:
// version corriendo activa + una previa para rollback.
const VERSION_RETENTION_COUNT = 2

// 7 dias en milisegundos - se usa para el timeout de obsolescencia del
// lock basado en mtime. Es lo bastante largo para sobrevivir duraciones
// de sleep de laptop mientras aun permite limpiar locks abandonados de
// procesos crasheados en un tiempo razonable.
const LOCK_STALE_MS = 7 * 24 * 60 * 60 * 1000

export type SetupMessage = {
  message: string
  userActionRequired: boolean
  type: 'path' | 'alias' | 'info' | 'error'
}

function getBaseDirectories() {
  const platform = getPlatform()
  const executableName = getBinaryName(platform)

  // ccb comparte la forma del layout XDG de Anthropic pero bajo su
  // propio nombre de directorio — calza con
  // `~/.local/share/ccb/versions/<version>` de install.sh, asi que el
  // instalador de bootstrap y el auto-updater dentro de la app escriben
  // al mismo lugar.
  return {
    versions: join(getXDGDataHome(), 'ccb', 'versions'),
    staging: join(getXDGCacheHome(), 'ccb', 'staging'),
    locks: join(getXDGStateHome(), 'ccb', 'locks'),
    executable: join(getUserBinDir(), executableName),
  }
}

async function isPossibleClaudeBinary(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath)
    // antes de la descarga, el archivo de lock de version (en el mismo
    // filePath) tendra tamaño 0. Ademas se permiten tamaños chicos
    // porque se quiere tratar scripts wrapper pequeños como validos
    if (!stats.isFile() || stats.size === 0) {
      return false
    }

    // Chequea si el archivo es ejecutable. Nota: en Windows, esto
    // depende de extensiones de archivo (.exe, .bat, .cmd) y permisos
    // ACL en vez de los bits de permiso Unix, asi que puede no
    // funcionar perfectamente para todos los ejecutables en Windows.
    await access(filePath, fsConstants.X_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Descarta una "v" inicial de un string de version. Los tags de release
 * de GitHub la llevan (p.ej. 'v26.4.19'); los nombres de slot binario en
 * disco NO — '26.4.19' pelado calza con el layout de install.sh Y con
 * la version auto-reportada del binario (`MACRO.VERSION` es pelado).
 * Sin esto, el auto-updater escribiria 'versions/v26.4.19' mientras
 * install.sh escribe 'versions/26.4.19', y el target del symlink
 * saltaria entre los dos namespaces en cada pase de instalacion.
 * Idempotente — las versiones peladas pasan sin cambio.
 */
function bareVersion(version: string): string {
  return version.replace(/^v/, '')
}

async function getVersionPaths(version: string) {
  const dirs = getBaseDirectories()

  // Crea directorios, pero no la ruta del ejecutable (que es un archivo)
  const dirsToCreate = [dirs.versions, dirs.staging, dirs.locks]
  await Promise.all(dirsToCreate.map(dir => mkdir(dir, { recursive: true })))

  // Asegura que el directorio padre del ejecutable exista
  const executableParentDir = dirname(dirs.executable)
  await mkdir(executableParentDir, { recursive: true })

  const slot = bareVersion(version)
  const installPath = join(dirs.versions, slot)

  // Crea un archivo vacio si no existe
  try {
    await stat(installPath)
  } catch {
    await writeFile(installPath, '', { encoding: 'utf8' })
  }

  return {
    stagingPath: join(dirs.staging, slot),
    installPath,
  }
}

// Ejecuta un callback mientras se mantiene un lock sobre un archivo de
// version. Devuelve false si el archivo ya esta bloqueado, true si el
// callback se ejecuto
async function tryWithVersionLock(
  versionFilePath: string,
  callback: () => void | Promise<void>,
  retries = 0,
): Promise<boolean> {
  const dirs = getBaseDirectories()

  const lockfilePath = getLockFilePathFromVersionPath(dirs, versionFilePath)

  // Asegura que el directorio de locks exista
  await mkdir(dirs.locks, { recursive: true })

  if (isPidBasedLockingEnabled()) {
    // Usa locking basado en PID con reintentos opcionales
    let attempts = 0
    const maxAttempts = retries + 1
    const minTimeout = retries > 0 ? 1000 : 100
    const maxTimeout = retries > 0 ? 5000 : 500

    while (attempts < maxAttempts) {
      const success = await withLock(
        versionFilePath,
        lockfilePath,
        async () => {
          try {
            await callback()
          } catch (error) {
            logError(error)
            throw error
          }
        },
      )

      if (success) {
        logEvent('tengu_version_lock_acquired', {
          is_pid_based: true,
          is_lifetime_lock: false,
          attempts: attempts + 1,
        })
        return true
      }

      attempts++
      if (attempts < maxAttempts) {
        // Espera antes de reintentar con backoff exponencial
        const timeout = Math.min(
          minTimeout * 2 ** (attempts - 1),
          maxTimeout,
        )
        await sleep(timeout)
      }
    }

    logEvent('tengu_version_lock_failed', {
      is_pid_based: true,
      is_lifetime_lock: false,
      attempts: maxAttempts,
    })
    logLockAcquisitionError(
      versionFilePath,
      new Error('Lock held by another process'),
    )
    return false
  }

  // Usa locking basado en mtime (proper-lockfile) con timeout de
  // obsolescencia de 30 dias
  let release: (() => Promise<void>) | null = null
  try {
    // Fase de adquisicion de lock - captura errores de lock y devuelve false
    // Usa 30 dias para obsolescencia para calzar con lockCurrentVersion() -
    // esto asegura que nunca se considere obsoleto el lock de un proceso
    // en ejecucion durante uso normal (incluido sleep de laptop). 30 dias
    // permite limpieza eventual de locks abandonados de procesos
    // crasheados mientras es lo bastante largo para cualquier sesion realista.
    try {
      release = await lockfile.lock(versionFilePath, {
        stale: LOCK_STALE_MS,
        retries: {
          retries,
          minTimeout: retries > 0 ? 1000 : 100,
          maxTimeout: retries > 0 ? 5000 : 500,
        },
        lockfilePath,
        // Maneja el compromiso de lock con gracia para prevenir
        // unhandled rejections. Esto puede pasar si otro proceso borra
        // el directorio de lock mientras lo tenemos
        onCompromised: (err: Error) => {
          logForDebugging(
            `NON-FATAL: Version lock was compromised during operation: ${err.message}`,
            { level: 'info' },
          )
        },
      })
    } catch (lockError) {
      logEvent('tengu_version_lock_failed', {
        is_pid_based: false,
        is_lifetime_lock: false,
      })
      logLockAcquisitionError(versionFilePath, lockError)
      return false
    }

    // Fase de operacion - loguea errores pero deja que se propaguen
    try {
      await callback()
      logEvent('tengu_version_lock_acquired', {
        is_pid_based: false,
        is_lifetime_lock: false,
      })
      return true
    } catch (error) {
      logError(error)
      throw error
    }
  } finally {
    if (release) {
      await release()
    }
  }
}

async function atomicMoveToInstallPath(
  stagedBinaryPath: string,
  installPath: string,
) {
  // Crea el directorio de instalacion si no existe
  await mkdir(dirname(installPath), { recursive: true })

  // Mueve de staging a la ubicacion final atomicamente
  const tempInstallPath = `${installPath}.tmp.${process.pid}.${Date.now()}`

  try {
    // Copia a un temporal junto a la ruta de instalacion, luego rename.
    // Un rename directo desde staging fallaria con EXDEV si staging e
    // install estan en filesystems distintos.
    await copyFile(stagedBinaryPath, tempInstallPath)
    await chmod(tempInstallPath, 0o755)
    await rename(tempInstallPath, installPath)
    logForDebugging(`Atomically installed binary to ${installPath}`)
  } catch (error) {
    // Limpia el archivo temporal si existe
    try {
      await unlink(tempInstallPath)
    } catch {
      // Ignora errores de limpieza
    }
    throw error
  }
}

async function installVersionFromPackage(
  stagingPath: string,
  installPath: string,
) {
  try {
    // Extrae el binario de la estructura de paquete npm en staging
    const nodeModulesDir = join(stagingPath, 'node_modules', '@anthropic-ai')
    const entries = await readdir(nodeModulesDir)
    const nativePackage = entries.find((entry: string) =>
      entry.startsWith('claude-cli-native-'),
    )

    if (!nativePackage) {
      logEvent('tengu_native_install_package_failure', {
        stage_find_package: true,
        error_package_not_found: true,
      })
      const error = new Error('Could not find platform-specific native package')
      throw error
    }

    const stagedBinaryPath = join(nodeModulesDir, nativePackage, 'cli')

    try {
      await stat(stagedBinaryPath)
    } catch {
      logEvent('tengu_native_install_package_failure', {
        stage_binary_exists: true,
        error_binary_not_found: true,
      })
      const error = new Error('Native binary not found in staged package')
      throw error
    }

    await atomicMoveToInstallPath(stagedBinaryPath, installPath)

    // Limpia el directorio de staging
    await rm(stagingPath, { recursive: true, force: true })

    logEvent('tengu_native_install_package_success', {})
  } catch (error) {
    // Loguea si no se ha logueado ya arriba
    const msg = errorMessage(error)
    if (
      !msg.includes('Could not find platform-specific') &&
      !msg.includes('Native binary not found')
    ) {
      logEvent('tengu_native_install_package_failure', {
        stage_atomic_move: true,
        error_move_failed: true,
      })
    }
    logError(toError(error))
    throw error
  }
}

async function installVersionFromBinary(
  stagingPath: string,
  installPath: string,
) {
  try {
    // Para descargas de binario directo (GCS, bucket generico), el
    // binario esta directamente en staging
    const platform = getPlatform()
    const binaryName = getBinaryName(platform)
    const stagedBinaryPath = join(stagingPath, binaryName)

    try {
      await stat(stagedBinaryPath)
    } catch {
      logEvent('tengu_native_install_binary_failure', {
        stage_binary_exists: true,
        error_binary_not_found: true,
      })
      const error = new Error('Staged binary not found')
      throw error
    }

    await atomicMoveToInstallPath(stagedBinaryPath, installPath)

    // Limpia el directorio de staging
    await rm(stagingPath, { recursive: true, force: true })

    logEvent('tengu_native_install_binary_success', {})
  } catch (error) {
    if (!errorMessage(error).includes('Staged binary not found')) {
      logEvent('tengu_native_install_binary_failure', {
        stage_atomic_move: true,
        error_move_failed: true,
      })
    }
    logError(toError(error))
    throw error
  }
}

async function installVersion(
  stagingPath: string,
  installPath: string,
  downloadType: 'npm' | 'binary',
) {
  // Usa el tipo de descarga explicito en vez de adivinar
  if (downloadType === 'npm') {
    await installVersionFromPackage(stagingPath, installPath)
  } else {
    await installVersionFromBinary(stagingPath, installPath)
  }
}

/**
 * Realiza la operacion central de update: descarga (si hace falta),
 * instala, y actualiza el symlink. Devuelve si se realizo una
 * instalacion nueva (vs solo actualizar el symlink).
 */
async function performVersionUpdate(
  version: string,
  forceReinstall: boolean,
): Promise<boolean> {
  const { stagingPath: baseStagingPath, installPath } =
    await getVersionPaths(version)
  const { executable: executablePath } = getBaseDirectories()

  // Para updates sin lock, usa una ruta de staging unica para evitar
  // conflictos entre descargas concurrentes
  const stagingPath = isEnvTruthy(process.env.ENABLE_LOCKLESS_UPDATES)
    ? `${baseStagingPath}.${process.pid}.${Date.now()}`
    : baseStagingPath

  // Solo descarga si no esta ya instalado (o si es force reinstall)
  const needsInstall = !(await versionIsAvailable(version)) || forceReinstall
  if (needsInstall) {
    logForDebugging(
      forceReinstall
        ? `Force reinstalling native installer version ${version}`
        : `Downloading native installer version ${version}`,
    )
    const downloadType = await downloadVersion(version, stagingPath)
    await installVersion(stagingPath, installPath, downloadType)
  } else {
    logForDebugging(`Version ${version} already installed, updating symlink`)
  }

  // Crea un symlink directo de ~/.local/bin/claude al binario de la version
  await removeDirectoryIfEmpty(executablePath)
  await updateSymlink(executablePath, installPath)

  // Verifica que el ejecutable realmente se creo/actualizo
  if (!(await isPossibleClaudeBinary(executablePath))) {
    let installPathExists = false
    try {
      await stat(installPath)
      installPathExists = true
    } catch {
      // installPath no existe
    }
    throw new Error(
      `Failed to create executable at ${executablePath}. ` +
        `Source file exists: ${installPathExists}. ` +
        `Check write permissions to ${executablePath}.`,
    )
  }
  return needsInstall
}

async function versionIsAvailable(version: string): Promise<boolean> {
  const { installPath } = await getVersionPaths(version)
  return isPossibleClaudeBinary(installPath)
}

async function updateLatest(
  channelOrVersion: string,
  forceReinstall: boolean = false,
): Promise<{
  success: boolean
  latestVersion: string
  lockFailed?: boolean
  lockHolderPid?: number
}> {
  const startTime = Date.now()
  const { executable: executablePath } = getBaseDirectories()

  // Puerto de la seleccion de target de ant v2.1.136 `UV5` (3486.js):
  //   1. Carga {maxVersion, forceDowngradeEnabled} en un solo viaje.
  //   2. El downgrade forzado es elegible SOLO cuando:
  //      - `forceDowngradeEnabled` es true
  //      - NO forceReinstall (los pins explicitos de version se saltan este guard)
  //      - channelOrVersion es un nombre de canal (p.ej. 'latest'/'stable'),
  //        no un semver fijado.
  //      - maxVersion esta seteado
  //      - shouldForceDowngradeNow dice que current > maxVersion (ant UK6)
  //   3. Cuando es elegible, target = maxVersion; si no, getLatestVersion.
  const isPinnedVersion = /^v?\d+\.\d+\.\d+(-\S+)?$/.test(channelOrVersion)
  const { maxVersion, forceDowngradeEnabled } =
    await getMaxVersionAndForceDowngrade()
  const isForceDowngrade =
    forceDowngradeEnabled &&
    !forceReinstall &&
    !isPinnedVersion &&
    !!maxVersion &&
    shouldForceDowngradeNow(MACRO.VERSION, maxVersion, 'native_update')
  let version = isForceDowngrade
    ? (maxVersion as string)
    : await getLatestVersion(channelOrVersion)

  logForDebugging(`Checking for native installer update to version ${version}`)

  // Override de canary de ant `UV5`: cuando `channelOrVersion === 'latest'`
  // Y el force-downgrade no esta activo, consulta el flag de GrowthBook
  // `tengu_canary`. Si hay una version canary seteada Y es mas nueva que
  // el target resuelto de otro modo Y no esta arriba de maxVersion, la
  // sobreescribe. Esto le permite a ant escalonar un build nativo nuevo
  // en un subconjunto de usuarios antes de subir `latest`. Se salta para
  // pins de version explicitos / canal 'stable'.
  if (channelOrVersion === 'latest' && !isForceDowngrade) {
    const canary = getCanaryVersion()
    const canaryExceedsMax =
      canary !== null && maxVersion !== undefined && isVersionNewer(canary, maxVersion)
    if (canary && isVersionNewer(canary, version) && !canaryExceedsMax) {
      logForDebugging(
        `Native installer: canary ${canary} active, overriding ${version}`,
      )
      version = canary
    } else if (canaryExceedsMax) {
      logForDebugging(
        `Native installer: canary ${canary} exceeds maxVersion ${maxVersion}, not applying`,
      )
    }
  }

  // Ruta solo-tope: cuando no se esta force-downgrading pero maxVersion
  // topa a latest, fija a maxVersion (se salta entero si ya esta en/arriba).
  if (!isForceDowngrade && !forceReinstall && maxVersion) {
    if (isVersionNewer(version, maxVersion)) {
      logForDebugging(
        `Native installer: maxVersion ${maxVersion} is set, capping update from ${version} to ${maxVersion}`,
      )
      if (!isVersionNewer(maxVersion, MACRO.VERSION)) {
        logForDebugging(
          `Native installer: current version ${MACRO.VERSION} is already at or above maxVersion ${maxVersion}, skipping update`,
        )
        logEvent('tengu_native_update_skipped_max_version', {
          latency_ms: Date.now() - startTime,
          max_version:
            maxVersion as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          available_version:
            version as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return { success: true, latestVersion: version }
      }
      version = maxVersion
    }
  }

  // Ant `UV5`: dispara `tengu_native_update_forced_downgrade` DESPUES de
  // que el target esta fijado, ANTES de que la instalacion realmente
  // corra. Calza con el orden `if(z) d("tengu_native_update_forced_downgrade",...)`
  // para que los operadores vean el evento sin importar si la
  // instalacion tiene exito o topa un lock.
  if (isForceDowngrade) {
    logEvent('tengu_native_update_forced_downgrade', {
      from_version:
        MACRO.VERSION as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      to_version:
        version as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
  }

  // Salida temprana: si ya se esta corriendo esta version exacta Y tanto
  // el binario de version como el ejecutable existen y son validos. Hay
  // que seguir si el ejecutable no existe, es invalido (p.ej.
  // vacio/corrupto de una instalacion fallida), o se esta corriendo via npx.
  if (
    !forceReinstall &&
    version === MACRO.VERSION &&
    (await versionIsAvailable(version)) &&
    (await isPossibleClaudeBinary(executablePath))
  ) {
    logForDebugging(`Found ${version} at ${executablePath}, skipping install`)
    logEvent('tengu_native_update_complete', {
      latency_ms: Date.now() - startTime,
      was_new_install: false,
      was_force_reinstall: false,
      was_already_running: true,
    })
    return { success: true, latestVersion: version }
  }

  // Chequea si esta version deberia saltarse por el setting minimumVersion
  if (!forceReinstall && shouldSkipVersion(version)) {
    logEvent('tengu_native_update_skipped_minimum_version', {
      latency_ms: Date.now() - startTime,
      target_version:
        version as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return { success: true, latestVersion: version }
  }

  // Trackea si realmente se esta instalando o solo re-symlinkeando
  let wasNewInstall = false
  let latencyMs: number

  if (isEnvTruthy(process.env.ENABLE_LOCKLESS_UPDATES)) {
    // Sin lock: confia en operaciones atomicas, los errores se propagan
    wasNewInstall = await performVersionUpdate(version, forceReinstall)
    latencyMs = Date.now() - startTime
  } else {
    // Updates basados en lock
    const { installPath } = await getVersionPaths(version)
    // Si es force reinstall, remueve cualquier lock existente para
    // saltarse locks obsoletos
    if (forceReinstall) {
      await forceRemoveLock(installPath)
    }

    const lockAcquired = await tryWithVersionLock(
      installPath,
      async () => {
        wasNewInstall = await performVersionUpdate(version, forceReinstall)
      },
      3, // reintentos
    )

    latencyMs = Date.now() - startTime

    // La adquisicion de lock fallo - obtiene el PID del tenedor del
    // lock para el mensaje de error
    if (!lockAcquired) {
      const dirs = getBaseDirectories()
      let lockHolderPid: number | undefined
      if (isPidBasedLockingEnabled()) {
        const lockfilePath = getLockFilePathFromVersionPath(dirs, installPath)
        if (isLockActive(lockfilePath)) {
          lockHolderPid = readLockContent(lockfilePath)?.pid
        }
      }
      logEvent('tengu_native_update_lock_failed', {
        latency_ms: latencyMs,
        lock_holder_pid: lockHolderPid,
      })
      return {
        success: false,
        latestVersion: version,
        lockFailed: true,
        lockHolderPid,
      }
    }
  }

  logEvent('tengu_native_update_complete', {
    latency_ms: latencyMs,
    was_new_install: wasNewInstall,
    was_force_reinstall: forceReinstall,
  })
  logForDebugging(`Successfully updated to version ${version}`)
  return { success: true, latestVersion: version }
}

// Exportado para testing
async function removeDirectoryIfEmpty(path: string): Promise<void> {
  // rmdir sola maneja todos los casos: ENOTDIR si path es un archivo,
  // ENOTEMPTY si el directorio no esta vacio, ENOENT si falta. No hace
  // falta stat+readdir primero.
  try {
    await rmdir(path)
    logForDebugging(`Removed empty directory at ${path}`)
  } catch (error) {
    const code = getErrnoCode(error)
    // Casos esperados (no-es-dir, falta, no-vacio) — se saltan en
    // silencio. ENOTDIR es la ruta normal: executablePath tipicamente
    // es un symlink.
    if (code !== 'ENOTDIR' && code !== 'ENOENT' && code !== 'ENOTEMPTY') {
      logForDebugging(`Could not remove directory at ${path}: ${error}`)
    }
  }
}

async function updateSymlink(
  symlinkPath: string,
  targetPath: string,
): Promise<boolean> {
  const platform = getPlatform()
  const isWindows = platform.startsWith('win32')

  // En Windows, copia el ejecutable directamente en vez de crear un symlink
  if (isWindows) {
    try {
      // Asegura que el directorio padre exista
      const parentDir = dirname(symlinkPath)
      await mkdir(parentDir, { recursive: true })

      // Chequea si el archivo ya existe y tiene el mismo contenido
      let existingStats: Stats | undefined
      try {
        existingStats = await stat(symlinkPath)
      } catch {
        // symlinkPath no existe
      }

      if (existingStats) {
        try {
          const targetStats = await stat(targetPath)
          // Si los tamaños calzan, se asume que los archivos son los
          // mismos (evita leer archivos grandes)
          if (existingStats.size === targetStats.size) {
            return false
          }
        } catch {
          // Sigue con la copia si no se puede comparar
        }
        // Usa la estrategia de rename para manejar el file locking en Windows
        // Rename siempre funciona incluso para ejecutables en ejecucion, a diferencia de delete
        const oldFileName = `${symlinkPath}.old.${Date.now()}`
        await rename(symlinkPath, oldFileName)

        // Intenta copiar el nuevo ejecutable, con rollback en caso de fallo
        try {
          await copyFile(targetPath, symlinkPath)
          // Exito - intenta limpieza inmediata del archivo viejo (no-bloqueante)
          try {
            await unlink(oldFileName)
          } catch {
            // El archivo aun corre - ignora, Windows lo limpiara eventualmente
          }
        } catch (copyError) {
          // La copia fallo - restaura el ejecutable viejo
          try {
            await rename(oldFileName, symlinkPath)
          } catch (restoreError) {
            // Critico: el usuario se quedo sin ejecutable funcional -
            // prioriza el error de restauracion
            const errorWithCause = new Error(
              `Failed to restore old executable: ${restoreError}`,
              { cause: copyError },
            )
            logError(errorWithCause)
            throw errorWithCause
          }
          throw copyError
        }
      } else {
        // Instalacion primera vez (sin archivo existente para renombrar)
        // Copia el ejecutable directamente; maneja ENOENT del propio
        // copyFile en vez de un pre-chequeo stat() (evita TOCTOU + syscall extra)
        try {
          await copyFile(targetPath, symlinkPath)
        } catch (e) {
          if (isENOENT(e)) {
            throw new Error(`Source file does not exist: ${targetPath}`)
          }
          throw e
        }
      }
      // chmod no hace falta en Windows - la ejecutabilidad la determina la extension .exe
      return true
    } catch (error) {
      logError(
        new Error(
          `Failed to copy executable from ${targetPath} to ${symlinkPath}: ${error}`,
        ),
      )
      return false
    }
  }

  // Las instalaciones no-Windows usan un symlink lanzador.
  const parentDir = dirname(symlinkPath)
  try {
    await mkdir(parentDir, { recursive: true })
    logForDebugging(`Created directory ${parentDir} for symlink`)
  } catch (mkdirError) {
    logError(
      new Error(`Failed to create directory ${parentDir}: ${mkdirError}`),
    )
    return false
  }

  try {
    let symlinkExists = false
    try {
      await stat(symlinkPath)
      symlinkExists = true
    } catch {}

    if (symlinkExists) {
      if ((await getLauncherOwnership(symlinkPath, targetPath)) === 'external') {
        logForDebugging(`Preserving externally managed launcher at ${symlinkPath}`)
        return false
      }
      try {
        const currentTarget = await readlink(symlinkPath)
        const resolvedCurrentTarget = resolve(
          dirname(symlinkPath),
          currentTarget,
        )
        const resolvedTargetPath = resolve(targetPath)

        if (resolvedCurrentTarget === resolvedTargetPath) {
          return false
        }
      } catch {
        // La ruta existe pero no es un symlink - se removera abajo
      }

      // Remueve el archivo/symlink existente antes de crear uno nuevo
      await unlink(symlinkPath)
    }
  } catch (error) {
    logError(new Error(`Failed to check/remove existing symlink: ${error}`))
  }

  // Crea y luego renombra atomicamente para que updates concurrentes
  // nunca expongan un hueco.
  const tempSymlink = `${symlinkPath}.tmp.${process.pid}.${Date.now()}`
  try {
    await symlink(targetPath, tempSymlink)

    // Renombra atomicamente al nombre final (reemplaza el existente)
    await rename(tempSymlink, symlinkPath)
    logForDebugging(
      `Atomically updated symlink ${symlinkPath} -> ${targetPath}`,
    )
    return true
  } catch (error) {
    // Limpia el symlink temporal si existe
    try {
      await unlink(tempSymlink)
    } catch {
      // Ignora errores de limpieza
    }
    logError(
      new Error(
        `Failed to create symlink from ${symlinkPath} to ${targetPath}: ${error}`,
      ),
    )
    return false
  }
}

export async function checkInstall(
  force: boolean = false,
): Promise<SetupMessage[]> {
  // Se saltan todos los chequeos de instalacion si se deshabilita via
  // variable de entorno
  if (isEnvTruthy(process.env.DISABLE_INSTALLATION_CHECKS)) {
    return []
  }

  // Obtiene el tipo de instalacion real y la config
  const installationType = await getCurrentInstallationType()

  // Se saltan los chequeos para builds de desarrollo - config.installMethod
  // de una instalacion nativa previa no deberia disparar advertencias al
  // correr builds de dev
  if (installationType === 'development') {
    return []
  }

  const config = getGlobalConfig() as { installMethod?: string }

  // Solo muestra advertencias si:
  // 1. El usuario realmente esta corriendo desde una instalacion nativa, O
  // 2. El usuario explicitamente seteo installMethod a 'native' en la
  //    config (estan intentando usar nativo)
  // 3. force es true (se usa durante el proceso de instalacion)
  const shouldCheckNative =
    force || installationType === 'native' || config.installMethod === 'native'

  if (!shouldCheckNative) {
    return []
  }

  const dirs = getBaseDirectories()
  const messages: SetupMessage[] = []
  const localBinDir = dirname(dirs.executable)
  const resolvedLocalBinPath = resolve(localBinDir)
  const platform = getPlatform()
  const isWindows = platform.startsWith('win32')

  // Chequea si el directorio bin existe
  try {
    await access(localBinDir)
  } catch {
    messages.push({
      message: `installMethod is native, but directory ${localBinDir} does not exist`,
      userActionRequired: true,
      type: 'error',
    })
  }

  // Chequea si el ejecutable claude existe y es valido.
  // En no-Windows, llama readlink directamente y enruta el errno —
  // ENOENT significa que el ejecutable falta, EINVAL que existe pero no
  // es un symlink. Esto evita un TOCTOU access()→readlink() donde borrar
  // entre las dos llamadas produce un diagnostico enganoso "Not a symlink".
  // isPossibleClaudeBinary stattea la ruta internamente, asi que no se
  // pre-chequea con access() — eso seria un TOCTOU entre access y el stat.
  if (isWindows) {
    // En Windows es un ejecutable copiado, no un symlink
    if (!(await isPossibleClaudeBinary(dirs.executable))) {
      messages.push({
        message: `installMethod is native, but claude command is missing or invalid at ${dirs.executable}`,
        userActionRequired: true,
        type: 'error',
      })
    }
  } else {
    try {
      const target = await readlink(dirs.executable)
      const absoluteTarget = resolve(dirname(dirs.executable), target)
      if (!(await isPossibleClaudeBinary(absoluteTarget))) {
        messages.push({
          message: `Claude symlink points to missing or invalid binary: ${target}`,
          userActionRequired: true,
          type: 'error',
        })
      }
    } catch (e) {
      if (isENOENT(e)) {
        messages.push({
          message: `installMethod is native, but claude command not found at ${dirs.executable}`,
          userActionRequired: true,
          type: 'error',
        })
      } else {
        // EINVAL (no es symlink) u otro — chequea como binario regular
        if (!(await isPossibleClaudeBinary(dirs.executable))) {
          messages.push({
            message: `${dirs.executable} exists but is not a valid Claude binary`,
            userActionRequired: true,
            type: 'error',
          })
        }
      }
    }
  }

  // Chequea si el directorio bin esta en PATH
  const isInCurrentPath = (process.env.PATH || '')
    .split(delimiter)
    .some(entry => {
      try {
        const resolvedEntry = resolve(entry)
        // En Windows, hace comparacion case-insensitive para rutas
        if (isWindows) {
          return (
            resolvedEntry.toLowerCase() === resolvedLocalBinPath.toLowerCase()
          )
        }
        return resolvedEntry === resolvedLocalBinPath
      } catch {
        return false
      }
    })

  if (!isInCurrentPath) {
    if (isWindows) {
      // Instrucciones de PATH especificas de Windows
      const windowsBinPath = localBinDir.replace(/\//g, '\\')
      messages.push({
        message: `Native installation exists but ${windowsBinPath} is not in your PATH. Add it by opening: System Properties → Environment Variables → Edit User PATH → New → Add the path above. Then restart your terminal.`,
        userActionRequired: true,
        type: 'path',
      })
    } else {
      // Instrucciones de PATH estilo Unix
      const shellType = getShellType()
      const configPaths = tryGetShellConfig()?.getShellConfigPaths() ?? {}
      const configFile = configPaths[shellType as keyof typeof configPaths]
      const displayPath = configFile
        ? configFile.replace(homedir(), '~')
        : 'your shell config file'

      messages.push({
        message: `Native installation exists but ~/.local/bin is not in your PATH. Run:\n\necho 'export PATH="$HOME/.local/bin:$PATH"' >> ${displayPath} && source ${displayPath}`,
        userActionRequired: true,
        type: 'path',
      })
    }
  }

  return messages
}

type InstallLatestResult = {
  latestVersion: string | null
  wasUpdated: boolean
  lockFailed?: boolean
  lockHolderPid?: number
}

// Guard singleflight en proceso. NativeAutoUpdater se remonta cada vez
// que el overlay de sugerencias del prompt togglea
// (PromptInput.tsx:2916), y el guard isUpdating no sobrevive al
// remonte. Cada remonte disparaba una descarga fresca de 271MB mientras
// las anteriores seguian en vuelo. Telemetria: la sesion 42fed33f vio
// arrayBuffers subir a 91GB a ~650MB/s.
let inFlightInstall: Promise<InstallLatestResult> | null = null

export function installLatest(
  channelOrVersion: string,
  forceReinstall: boolean = false,
): Promise<InstallLatestResult> {
  if (forceReinstall) {
    return installLatestImpl(channelOrVersion, forceReinstall)
  }
  if (inFlightInstall) {
    logForDebugging('installLatest: joining in-flight call')
    return inFlightInstall
  }
  const promise = installLatestImpl(channelOrVersion, forceReinstall)
  inFlightInstall = promise
  const clear = (): void => {
    inFlightInstall = null
  }
  void promise.then(clear, clear)
  return promise
}

async function installLatestImpl(
  channelOrVersion: string,
  forceReinstall: boolean = false,
): Promise<InstallLatestResult> {
  const updateResult = await updateLatest(channelOrVersion, forceReinstall)

  if (!updateResult.success) {
    return {
      latestVersion: null,
      wasUpdated: false,
      lockFailed: updateResult.lockFailed,
      lockHolderPid: updateResult.lockHolderPid,
    }
  }

  // La instalacion tuvo exito (el return temprano de arriba cubre el
  // fallo). Marca como nativo y deshabilita el auto-updater legacy para
  // proteger symlinks.
  const config = getGlobalConfig() as { installMethod?: string }
  if (config.installMethod !== 'native') {
    saveGlobalConfig(current => ({
      ...current,
      installMethod: 'native',
      // Deshabilita el auto-updater legacy para prevenir que sesiones
      // npm borren symlinks nativos. Las instalaciones nativas usan
      // NativeAutoUpdater en su lugar, que respeta la instalacion nativa.
      autoUpdates: false,
      // Marca esto como basado-en-proteccion, no preferencia del usuario
      autoUpdatesProtectedForNative: true,
    }))
    logForDebugging(
      'Native installer: Set installMethod to "native" and disabled legacy auto-updater for protection',
    )
  }

  void cleanupOldVersions()

  return {
    latestVersion: updateResult.latestVersion,
    wasUpdated: updateResult.success,
    lockFailed: false,
  }
}

async function getVersionFromSymlink(
  symlinkPath: string,
): Promise<string | null> {
  try {
    const target = await readlink(symlinkPath)
    const absoluteTarget = resolve(dirname(symlinkPath), target)
    if (await isPossibleClaudeBinary(absoluteTarget)) {
      return absoluteTarget
    }
  } catch {
    // No es symlink / no existe / el target no existe
  }
  return null
}

function getLockFilePathFromVersionPath(
  dirs: ReturnType<typeof getBaseDirectories>,
  versionPath: string,
) {
  const versionName = basename(versionPath)
  return join(dirs.locks, `${versionName}.lock`)
}

/**
 * Adquiere un lock sobre la version actualmente en ejecucion para
 * prevenir que se borre. Este lock se mantiene por toda la vida del proceso.
 *
 * Usa locking basado en PID (cuando esta habilitado) que puede detectar
 * inmediatamente procesos crasheados (a diferencia del locking basado
 * en mtime que requiere un timeout de 30 dias)
 */
export async function lockCurrentVersion(): Promise<void> {
  const dirs = getBaseDirectories()

  // Solo bloquea si se esta corriendo desde el directorio de versions
  if (!process.execPath.includes(dirs.versions)) {
    return
  }

  const versionPath = resolve(process.execPath)
  try {
    const lockfilePath = getLockFilePathFromVersionPath(dirs, versionPath)

    // Asegura que el directorio de locks exista
    await mkdir(dirs.locks, { recursive: true })

    if (isPidBasedLockingEnabled()) {
      // Adquiere el lock basado en PID y lo mantiene por la vida del proceso
      // El locking basado en PID permite deteccion inmediata de procesos
      // crasheados mientras aun sobrevive al sleep de laptop (el
      // proceso se suspende pero el PID existe)
      const acquired = await acquireProcessLifetimeLock(
        versionPath,
        lockfilePath,
      )

      if (!acquired) {
        logEvent('tengu_version_lock_failed', {
          is_pid_based: true,
          is_lifetime_lock: true,
        })
        logLockAcquisitionError(
          versionPath,
          new Error('Lock already held by another process'),
        )
        return
      }

      logEvent('tengu_version_lock_acquired', {
        is_pid_based: true,
        is_lifetime_lock: true,
      })
      logForDebugging(`Acquired PID lock on running version: ${versionPath}`)
    } else {
      // Adquiere un lock basado en mtime y nunca lo libera (hasta que
      // el proceso termine). Usa 30 dias para obsolescencia para
      // prevenir que el lock se considere obsoleto durante uso normal.
      // Esto es critico porque el sleep de laptop suspende el proceso,
      // deteniendo el heartbeat de mtime. 30 dias es lo bastante largo
      // para cualquier sesion realista mientras aun permite la limpieza
      // eventual de locks abandonados.
      let release: (() => Promise<void>) | undefined
      try {
        release = await lockfile.lock(versionPath, {
          stale: LOCK_STALE_MS,
          retries: 0, // No reintenta - si no se puede lockear, esta bien
          lockfilePath,
          // Maneja el compromiso de lock con gracia (p.ej. si otro
          // proceso borra el directorio de lock)
          onCompromised: (err: Error) => {
            logForDebugging(
              `NON-FATAL: Lock on running version was compromised: ${err.message}`,
              { level: 'info' },
            )
          },
        })
        logEvent('tengu_version_lock_acquired', {
          is_pid_based: false,
          is_lifetime_lock: true,
        })
        logForDebugging(
          `Acquired mtime-based lock on running version: ${versionPath}`,
        )

        // Libera el lock explicitamente; la limpieza de proper-lockfile
        // no es confiable con signal-exit v3+v4
        registerCleanup(async () => {
          try {
            await release?.()
          } catch {
            // El lock puede ya estar liberado
          }
        })
      } catch (lockError) {
        if (isENOENT(lockError)) {
          logForDebugging(
            `Cannot lock current version - file does not exist: ${versionPath}`,
            { level: 'info' },
          )
          return
        }
        logEvent('tengu_version_lock_failed', {
          is_pid_based: false,
          is_lifetime_lock: true,
        })
        logLockAcquisitionError(versionPath, lockError)
        return
      }
    }
  } catch (error) {
    if (isENOENT(error)) {
      logForDebugging(
        `Cannot lock current version - file does not exist: ${versionPath}`,
        { level: 'info' },
      )
      return
    }
    // Cae de vuelta al comportamiento previo donde no se adquiere un
    // lock sobre una version en ejecucion. Esto funciona ~mayormente
    // pero usar binarios nativos como ripgrep fallara
    logForDebugging(
      `NON-FATAL: Failed to lock current version during execution ${errorMessage(error)}`,
      { level: 'info' },
    )
  }
}

function logLockAcquisitionError(versionPath: string, lockError: unknown) {
  logError(
    new Error(
      `NON-FATAL: Lock acquisition failed for ${versionPath} (expected in multi-process scenarios)`,
      { cause: lockError },
    ),
  )
}

/**
 * Fuerza el borrado de un archivo de lock para una ruta de version dada.
 * Se usa cuando se especifica --force para saltarse locks obsoletos.
 */
async function forceRemoveLock(versionFilePath: string): Promise<void> {
  const dirs = getBaseDirectories()
  const lockfilePath = getLockFilePathFromVersionPath(dirs, versionFilePath)

  try {
    await unlink(lockfilePath)
    logForDebugging(`Force-removed lock file at ${lockfilePath}`)
  } catch (error) {
    // Loguea pero no lanza - de todos modos se intentara adquirir el lock
    logForDebugging(`Failed to force-remove lock file: ${errorMessage(error)}`)
  }
}

export async function cleanupOldVersions(): Promise<void> {
  // Cede el turno para asegurar que no se bloquee el arranque
  await Promise.resolve()

  const dirs = getBaseDirectories()
  const oneHourAgo = Date.now() - 3600000

  // Limpia ejecutables renombrados viejos en Windows (ya no corren al arranque)
  if (getPlatform().startsWith('win32')) {
    const executableDir = dirname(dirs.executable)
    try {
      const files = await readdir(executableDir)
      let cleanedCount = 0
      for (const file of files) {
        if (!/^claude\.exe\.old\.\d+$/.test(file)) continue
        try {
          await unlink(join(executableDir, file))
          cleanedCount++
        } catch {
          // El archivo podria seguir en uso por otro proceso
        }
      }
      if (cleanedCount > 0) {
        logForDebugging(
          `Cleaned up ${cleanedCount} old Windows executables on startup`,
        )
      }
    } catch (error) {
      if (!isENOENT(error)) {
        logForDebugging(`Failed to clean up old Windows executables: ${error}`)
      }
    }
  }

  // Limpia directorios de staging huerfanos de mas de 1 hora
  try {
    const stagingEntries = await readdir(dirs.staging)
    let stagingCleanedCount = 0
    for (const entry of stagingEntries) {
      const stagingPath = join(dirs.staging, entry)
      try {
        // stat() es load-bearing aqui (se necesita mtime). Hay un
        // TOCTOU teorico donde un instalador concurrente podria
        // refrescar un dir de staging obsoleto entre stat y rm — pero
        // el umbral de 1 hora hace esto extremadamente improbable, y
        // rm({force:true}) tolera el borrado concurrente.
        const stats = await stat(stagingPath)
        if (stats.mtime.getTime() < oneHourAgo) {
          await rm(stagingPath, { recursive: true, force: true })
          stagingCleanedCount++
          logForDebugging(`Cleaned up old staging directory: ${entry}`)
        }
      } catch {
        // Ignora errores individuales
      }
    }
    if (stagingCleanedCount > 0) {
      logForDebugging(
        `Cleaned up ${stagingCleanedCount} orphaned staging directories`,
      )
      logEvent('tengu_native_staging_cleanup', {
        cleaned_count: stagingCleanedCount,
      })
    }
  } catch (error) {
    if (!isENOENT(error)) {
      logForDebugging(`Failed to clean up staging directories: ${error}`)
    }
  }

  // Limpia locks PID obsoletos (procesos crasheados) — cleanupStaleLocks maneja ENOENT
  if (isPidBasedLockingEnabled()) {
    const staleLocksCleaned = cleanupStaleLocks(dirs.locks)
    if (staleLocksCleaned > 0) {
      logForDebugging(`Cleaned up ${staleLocksCleaned} stale version locks`)
      logEvent('tengu_native_stale_locks_cleanup', {
        cleaned_count: staleLocksCleaned,
      })
    }
  }

  // Un solo readdir del directorio de versions. Particiona en archivos
  // temp vs binarios candidatos, stateando cada entrada como maximo una vez.
  let versionEntries: string[]
  try {
    versionEntries = await readdir(dirs.versions)
  } catch (error) {
    if (!isENOENT(error)) {
      logForDebugging(`Failed to readdir versions directory: ${error}`)
    }
    return
  }

  type VersionInfo = {
    name: string
    path: string
    resolvedPath: string
    mtime: Date
  }
  const versionFiles: VersionInfo[] = []
  let tempFilesCleanedCount = 0

  for (const entry of versionEntries) {
    const entryPath = join(dirs.versions, entry)
    if (/\.tmp\.\d+\.\d+$/.test(entry)) {
      // Archivo temp de instalacion huerfano — patron: {version}.tmp.{pid}.{timestamp}
      try {
        const stats = await stat(entryPath)
        if (stats.mtime.getTime() < oneHourAgo) {
          await unlink(entryPath)
          tempFilesCleanedCount++
          logForDebugging(`Cleaned up orphaned temp install file: ${entry}`)
        }
      } catch {
        // Ignora errores individuales
      }
      continue
    }
    // Binario version candidato — statea una vez, reusa para isFile/size/mtime/mode
    try {
      const stats = await stat(entryPath)
      if (!stats.isFile()) continue
      if (
        process.platform !== 'win32' &&
        stats.size > 0 &&
        (stats.mode & 0o111) === 0
      ) {
        // Chequea la ejecutabilidad via los bits de modo del resultado
        // de stat ya existente — evita una segunda syscall
        // (access(X_OK)) y la ventana TOCTOU entre stat y access. Se
        // salta en Windows: libuv solo setea bits de ejecucion para
        // .exe/.com/.bat/.cmd, pero los archivos de version son
        // strings semver sin extension (p.ej. "1.2.3"), asi que este
        // chequeo los rechazaria a todos. El access(X_OK) previo
        // pasaba cualquier archivo legible en Windows de todos modos.
        continue
      }
      versionFiles.push({
        name: entry,
        path: entryPath,
        resolvedPath: resolve(entryPath),
        mtime: stats.mtime,
      })
    } catch {
      // Se saltan archivos que no se pueden statear
    }
  }

  if (tempFilesCleanedCount > 0) {
    logForDebugging(
      `Cleaned up ${tempFilesCleanedCount} orphaned temp install files`,
    )
    logEvent('tengu_native_temp_files_cleanup', {
      cleaned_count: tempFilesCleanedCount,
    })
  }

  if (versionFiles.length === 0) {
    return
  }

  try {
    // Identifica las versiones protegidas
    const currentBinaryPath = process.execPath
    const protectedVersions = new Set<string>()
    if (currentBinaryPath && currentBinaryPath.includes(dirs.versions)) {
      protectedVersions.add(resolve(currentBinaryPath))
    }

    const currentSymlinkVersion = await getVersionFromSymlink(dirs.executable)
    if (currentSymlinkVersion) {
      protectedVersions.add(currentSymlinkVersion)
    }

    // Protege versiones con locks activos (corriendo en otros procesos)
    for (const v of versionFiles) {
      if (protectedVersions.has(v.resolvedPath)) continue

      const lockFilePath = getLockFilePathFromVersionPath(dirs, v.resolvedPath)
      let hasActiveLock = false
      if (isPidBasedLockingEnabled()) {
        hasActiveLock = isLockActive(lockFilePath)
      } else {
        try {
          hasActiveLock = await lockfile.check(v.resolvedPath, {
            stale: LOCK_STALE_MS,
            lockfilePath: lockFilePath,
          })
        } catch {
          hasActiveLock = false
        }
      }
      if (hasActiveLock) {
        protectedVersions.add(v.resolvedPath)
        logForDebugging(`Protecting locked version from cleanup: ${v.name}`)
      }
    }

    // Versiones elegibles: no protegidas, ordenadas newest-first (reusa mtime cacheado)
    const eligibleVersions = versionFiles
      .filter(v => !protectedVersions.has(v.resolvedPath))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

    // Mantiene como maximo VERSION_RETENTION_COUNT binarios totales
    // (protegidos + elegibles). Las versiones protegidas siempre se
    // quedan; las elegibles llenan los slots restantes, las mas viejas
    // mas alla de eso se borran. Sin restar el conteo protegido, una
    // instalacion donde tanto el binario previo-en-ejecucion COMO el
    // binario recien-instalado estan protegidos igual reservaria 2
    // slots MAS para versiones elegibles, asi que la huella de disco
    // creceria sin limite.
    const slotsForEligible = Math.max(
      0,
      VERSION_RETENTION_COUNT - protectedVersions.size,
    )
    const versionsToDelete = eligibleVersions.slice(slotsForEligible)

    if (versionsToDelete.length === 0) {
      logEvent('tengu_native_version_cleanup', {
        total_count: versionFiles.length,
        deleted_count: 0,
        protected_count: protectedVersions.size,
        retained_count: VERSION_RETENTION_COUNT,
        lock_failed_count: 0,
        error_count: 0,
      })
      return
    }

    let deletedCount = 0
    let lockFailedCount = 0
    let errorCount = 0

    await Promise.all(
      versionsToDelete.map(async version => {
        try {
          const deleted = await tryWithVersionLock(version.path, async () => {
            await unlink(version.path)
          })
          if (deleted) {
            deletedCount++
          } else {
            lockFailedCount++
            logForDebugging(
              `Skipping deletion of ${version.name} - locked by another process`,
            )
          }
        } catch (error) {
          errorCount++
          logError(
            new Error(`Failed to delete version ${version.name}: ${error}`),
          )
        }
      }),
    )

    logEvent('tengu_native_version_cleanup', {
      total_count: versionFiles.length,
      deleted_count: deletedCount,
      protected_count: protectedVersions.size,
      retained_count: VERSION_RETENTION_COUNT,
      lock_failed_count: lockFailedCount,
      error_count: errorCount,
    })
  } catch (error) {
    if (!isENOENT(error)) {
      logError(new Error(`Version cleanup failed: ${error}`))
    }
  }
}

/**
 * Chequea si una ruta dada esta gestionada por npm
 * @param executablePath - La ruta a chequear (puede ser un symlink)
 * @returns true si la ruta esta gestionada por npm, false en otro caso
 */
async function isNpmSymlink(executablePath: string): Promise<boolean> {
  // Puerto byte-por-byte de ant `cV5` (3486.js):
  //   async function cV5(H){
  //     let _=await uK.realpath(H);
  //     return _.endsWith(".js")||_.includes("node_modules")
  //   }
  //
  // ant hace realpath() incondicionalmente — funciona para symlinks,
  // hard links, y bind mounts en Linux + firmlinks de APFS en macOS. La
  // impl previa de ccb gateaba en lstat().isSymbolicLink() que
  // mis-clasificaba silenciosamente instalaciones con hard link (y
  // agregaba una syscall extra).
  //
  // ENOENT se propaga al llamador (removeInstalledSymlink envuelve en
  // try y trata ENOENT como un no-op exitoso, calzando con ant).
  const targetPath = await realpath(executablePath)
  return targetPath.endsWith('.js') || targetPath.includes('node_modules')
}

/**
 * Remueve el symlink de claude del directorio ejecutable
 * Se usa al cambiar de la instalacion nativa a otra
 * Solo removera si es un symlink de binario nativo, no archivos JS
 * gestionados por npm
 */
export async function removeInstalledSymlink(): Promise<void> {
  const dirs = getBaseDirectories()

  // Puerto byte-por-byte de ant `Cw_` (3486.js). Dispara el evento
  // `tengu_native_remove_symlink_outcome` en tres lugares:
  //   - skip por gestion de npm (exito)
  //   - exito de unlink
  //   - ENOENT (tambien exito — nada que remover)
  //   - cualquier otro error → outcome:'unlink_failed'
  // La impl previa de ccb no tenia telemetria, asi que el dashboard no
  // podia decir si los cambios de metodo de instalacion realmente
  // limpiaban.
  try {
    if (await isNpmSymlink(dirs.executable)) {
      logForDebugging(
        `Skipping removal of ${dirs.executable} - appears to be npm-managed`,
      )
      logEvent('tengu_native_remove_symlink_outcome', {
        outcome:
          'skipped_npm_managed' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      return
    }

    await unlink(dirs.executable)
    logForDebugging(`Removed claude symlink at ${dirs.executable}`)
    logEvent('tengu_native_remove_symlink_outcome', {
      outcome:
        'removed' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
  } catch (error) {
    if (isENOENT(error)) {
      // ant trata ENOENT como exito (no-op) — el archivo ya no estaba.
      logEvent('tengu_native_remove_symlink_outcome', {
        outcome:
          'enoent_already_gone' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      return
    }
    logError(new Error(`Failed to remove claude symlink: ${error}`))
    logEvent('tengu_native_remove_symlink_outcome', {
      outcome:
        'unlink_failed' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
  }
}

/**
 * Limpia aliases viejos de claude de los archivos de configuracion de
 * shell. Solo maneja el borrado de aliases, no el setup de PATH
 */
export async function cleanupShellAliases(): Promise<SetupMessage[]> {
  const messages: SetupMessage[] = []
  const shellConfig = tryGetShellConfig()
  if (!shellConfig) {
    return messages
  }
  const configMap = shellConfig.getShellConfigPaths()

  for (const [shellType, configFile] of Object.entries(configMap)) {
    try {
      const lines = await shellConfig.readFileLines(configFile)
      if (!lines) continue

      const { filtered, hadAlias } = shellConfig.filterClaudeAliases(lines)

      if (hadAlias) {
        await shellConfig.writeFileLines(configFile, filtered)
        messages.push({
          message: `Removed claude alias from ${configFile}. Run: unalias claude`,
          userActionRequired: true,
          type: 'alias',
        })
        logForDebugging(`Cleaned up claude alias from ${shellType} config`)
      }
    } catch (error) {
      logError(error)
      messages.push({
        message: `Failed to clean up ${configFile}: ${error}`,
        userActionRequired: false,
        type: 'error',
      })
    }
  }

  return messages
}

async function manualRemoveNpmPackage(
  packageName: string,
): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    // Obtiene el prefijo global de npm
    const prefixResult = await execFileNoThrowWithCwd('npm', [
      'config',
      'get',
      'prefix',
    ])
    if (prefixResult.code !== 0 || !prefixResult.stdout) {
      return {
        success: false,
        error: 'Failed to get npm global prefix',
      }
    }

    const globalPrefix = prefixResult.stdout.trim()
    let manuallyRemoved = false

    // Helper para intentar remover un archivo. unlink sola es
    // suficiente — lanza ENOENT si el archivo falta, que el catch
    // maneja identicamente. Un pre-chequeo stat() agregaria una syscall
    // y una ventana TOCTOU donde una limpieza concurrente causa un
    // falso-negativo en el return.
    async function tryRemove(filePath: string, description: string) {
      try {
        await unlink(filePath)
        logForDebugging(`Manually removed ${description}: ${filePath}`)
        return true
      } catch {
        return false
      }
    }

    if (getPlatform().startsWith('win32')) {
      // Windows - solo remueve ejecutables, no el directorio de paquete
      const binCmd = join(globalPrefix, 'claude.cmd')
      const binPs1 = join(globalPrefix, 'claude.ps1')
      const binExe = join(globalPrefix, 'claude')

      if (await tryRemove(binCmd, 'bin script')) {
        manuallyRemoved = true
      }

      if (await tryRemove(binPs1, 'PowerShell script')) {
        manuallyRemoved = true
      }

      if (await tryRemove(binExe, 'bin executable')) {
        manuallyRemoved = true
      }
    } else {
      // Unix/Mac - solo remueve el symlink, no el directorio de paquete
      const binSymlink = join(globalPrefix, 'bin', 'claude')

      if (await tryRemove(binSymlink, 'bin symlink')) {
        manuallyRemoved = true
      }
    }

    if (manuallyRemoved) {
      logForDebugging(`Successfully removed ${packageName} manually`)
      const nodeModulesPath = getPlatform().startsWith('win32')
        ? join(globalPrefix, 'node_modules', packageName)
        : join(globalPrefix, 'lib', 'node_modules', packageName)

      return {
        success: true,
        warning: `${packageName} executables removed, but node_modules directory was left intact for safety. You may manually delete it later at: ${nodeModulesPath}`,
      }
    } else {
      return { success: false }
    }
  } catch (manualError) {
    logForDebugging(`Manual removal failed: ${manualError}`, {
      level: 'error',
    })
    return {
      success: false,
      error: `Manual removal failed: ${manualError}`,
    }
  }
}

async function attemptNpmUninstall(
  packageName: string,
): Promise<{ success: boolean; error?: string; warning?: string }> {
  const { code, stderr } = await execFileNoThrowWithCwd(
    'npm',
    ['uninstall', '-g', packageName],
    { cwd: process.cwd() },
  )

  if (code === 0) {
    logForDebugging(`Removed global npm installation of ${packageName}`)
    return { success: true }
  } else if (stderr && !stderr.includes('npm ERR! code E404')) {
    // Chequea el error ENOTEMPTY e intenta remocion manual
    if (stderr.includes('npm error code ENOTEMPTY')) {
      logForDebugging(
        `Failed to uninstall global npm package ${packageName}: ${stderr}`,
        { level: 'error' },
      )
      logForDebugging(`Attempting manual removal due to ENOTEMPTY error`)

      const manualResult = await manualRemoveNpmPackage(packageName)
      if (manualResult.success) {
        return { success: true, warning: manualResult.warning }
      } else if (manualResult.error) {
        return {
          success: false,
          error: `Failed to remove global npm installation of ${packageName}: ${stderr}. Manual removal also failed: ${manualResult.error}`,
        }
      }
    }

    // Solo reporta como error si no es un error de "package not found"
    logForDebugging(
      `Failed to uninstall global npm package ${packageName}: ${stderr}`,
      { level: 'error' },
    )
    return {
      success: false,
      error: `Failed to remove global npm installation of ${packageName}: ${stderr}`,
    }
  }

  return { success: false } // Paquete no encontrado, no es un error
}

export async function cleanupNpmInstallations(): Promise<{
  removed: number
  errors: string[]
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []
  let removed = 0

  // Siempre intenta remover @anthropic-ai/claude-code-how-works-how-works
  const codePackageResult = await attemptNpmUninstall(
    '@anthropic-ai/claude-code-how-works-how-works',
  )
  if (codePackageResult.success) {
    removed++
    if (codePackageResult.warning) {
      warnings.push(codePackageResult.warning)
    }
  } else if (codePackageResult.error) {
    errors.push(codePackageResult.error)
  }

  // Tambien intenta remover MACRO.PACKAGE_URL si esta definido y es distinto
  if (MACRO.PACKAGE_URL && MACRO.PACKAGE_URL !== '@anthropic-ai/claude-code-how-works-how-works') {
    const macroPackageResult = await attemptNpmUninstall(MACRO.PACKAGE_URL)
    if (macroPackageResult.success) {
      removed++
      if (macroPackageResult.warning) {
        warnings.push(macroPackageResult.warning)
      }
    } else if (macroPackageResult.error) {
      errors.push(macroPackageResult.error)
    }
  }

  // Chequea instalacion local en ~/.claude/local
  const localInstallDir = join(homedir(), '.claude', 'local')

  try {
    await rm(localInstallDir, { recursive: true })
    removed++
    logForDebugging(`Removed local installation at ${localInstallDir}`)
  } catch (error) {
    if (!isENOENT(error)) {
      errors.push(`Failed to remove ${localInstallDir}: ${error}`)
      logForDebugging(`Failed to remove local installation: ${error}`, {
        level: 'error',
      })
    }
  }

  return { removed, errors, warnings }
}
