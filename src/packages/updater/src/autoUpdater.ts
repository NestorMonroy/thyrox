/**
 * Puerto de `ccnmt: packages/updater/src/autoUpdater.ts` (792 líneas
 * fuente).
 *
 * Cobertura: TODOS los símbolos exportados (`isForceDowngradeEnabled`,
 * `getMaxVersionAndForceDowngrade`, `shouldForceDowngradeNow`,
 * `assertMinVersion`, `getMaxVersion`, `getMaxVersionMessage`,
 * `getCanaryVersion`, `shouldSkipVersion`, `getLockFilePath`,
 * `checkGlobalInstallPermissions`, `getLatestVersion`, `NpmDistTags`,
 * `getNpmDistTags`, `getLatestVersionFromGcs`,
 * `getLatestVersionFromHomebrew`, `getLatestVersionForBrew`,
 * `getGcsDistTags`, `getGithubDistTags`, `getVersionHistory`,
 * `installGlobalPackage`, `InstallStatus`, `AutoUpdaterResult`,
 * `MaxVersionConfig`). 100% de su lógica.
 *
 * Cinco divergencias declaradas, agrupadas por origen:
 *
 *   1. `getDynamicConfig_BLOCKS_ON_INIT` / `getDynamicConfig_CACHED_MAY_BE_STALE`
 *      (`config/feature-flags.ts`) — ver `./internal/dynamicConfigCompat.ts`.
 *   2. `env.isRunningWithBun()` / `env.isNpmFromWindowsPath()`
 *      (`config/env/paths.ts` + `config/bundledMode.ts`) — ver
 *      `./internal/envCompat.ts`.
 *   3. `getClaudeConfigHomeDir` (`config/env/utils.ts`, porte parcial
 *      declarado que no la incluye) — ver `./internal/envCompat.ts`.
 *   4. `gt`/`gte`/`lt`/`parseVersion` (`config/semver.ts`, ausente) —
 *      ver `./internal/semverCompat.ts`.
 *   5. `saveGlobalConfig` (`config/global/config.ts`) y
 *      `filterClaudeAliases`/`getShellConfigPaths`/`readFileLines`/
 *      `writeFileLines` (`shell/shellConfig.ts`) — AMBOS módulos enteros
 *      no existen en este árbol (medido con `Bun.resolveSync` desde
 *      este paquete: los dos dan "Cannot find module"). A diferencia de
 *      las cuatro divergencias de arriba —que SÍ se pudieron reimplementar
 *      localmente con fidelidad razonable—, éstas dos pertenecen de
 *      lleno al dominio de otro paquete (persistencia de config global;
 *      edición de rc files de shell) y reimplementarlas aquí sería
 *      duplicar, con el riesgo de una segunda fuente de verdad
 *      divergente sobre el mismo archivo `~/.claude.json` que
 *      `@thyrox/config` ya gestiona. Se resuelven con `require()`
 *      diferido en su único punto de uso cada una, con la razón medida
 *      en el comentario — la ÚNICA excepción admitida a "sin lazy
 *      imports".
 */

import axios from 'axios'
import { constants as fsConstants } from 'fs'
import { access, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import {
  getDynamicConfig_BLOCKS_ON_INIT,
  getDynamicConfig_CACHED_MAY_BE_STALE,
} from './internal/dynamicConfigCompat.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import {
  getClaudeConfigHomeDir,
  isNpmFromWindowsPath,
  isRunningWithBun,
} from './internal/envCompat.js'
import { ClaudeError, getErrnoCode, isENOENT } from '@thyrox/local-observability/errorHelpers.js'
import { execFileNoThrowWithCwd } from '@thyrox/shell/execFileNoThrow.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { logError } from '@thyrox/local-observability/logging'
import { gt, gte, lt, parseVersion } from './internal/semverCompat.js'
import { saveGlobalConfig } from '@thyrox/config/global/config.js'
import { tryGetShellConfig } from './internal/shellConfigCompat.js'
import { getInitialSettings } from '@thyrox/config/settings'
import { jsonParse } from '@thyrox/local-observability/slowOperations.js'
import type { ReleaseChannel } from './nativeInstaller/download.js'

const GCS_BUCKET_URL =
  'https://storage.googleapis.com/claude-code-how-works-how-works-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-how-works-how-works-releases'

/** Ver docstring del módulo — sustituto local del global `MACRO` de ccnmt. */
const MACRO = {
  VERSION: process.env.CCB_VERSION ?? '0.0.0',
  PACKAGE_URL: process.env.CCB_PACKAGE_URL ?? '',
  NATIVE_PACKAGE_URL: process.env.CCB_NATIVE_PACKAGE_URL ?? '',
}

class AutoUpdaterError extends ClaudeError {}

export type InstallStatus =
  | 'success'
  | 'no_permissions'
  | 'install_failed'
  | 'in_progress'

export type AutoUpdaterResult = {
  version: string | null
  status: InstallStatus
  notifications?: string[]
}

export type MaxVersionConfig = {
  external?: string
  ant?: string
  external_message?: string
  ant_message?: string
  /**
   * Puerto de ant v2.1.136 — cuando se combina con maxVersion
   * `external`/`ant`, habilita una ruta de downgrade forzado: el
   * auto-updater movera al usuario de una version mas nueva de vuelta a
   * `maxVersion`. El comportamiento por defecto (flag ausente o false)
   * es no-downgrade; el downgrade forzado solo se activa cuando esto es
   * explicitamente true. Actua como un kill-switch remoto — debe estar
   * conectado a telemetria (`tengu_auto_updater_forced_downgrade`) para
   * que los operadores vean cuando dispara.
   */
  external_force_downgrade?: boolean
  ant_force_downgrade?: boolean
}

/**
 * Devuelve si el downgrade forzado esta habilitado para el tipo de
 * usuario activo. Por defecto false. Companero de `getMaxVersion()` —
 * ambos deben ser true para que un downgrade dispare.
 */
export async function isForceDowngradeEnabled(): Promise<boolean> {
  const config = await getMaxVersionConfig()
  if (process.env.USER_TYPE === 'ant') {
    return config.ant_force_downgrade === true
  }
  return config.external_force_downgrade === true
}

/**
 * Snapshot combinado de config — espejo de ant `Lw_()` (3480.js). Una
 * sola llamada async devuelve tanto `{maxVersion, forceDowngradeEnabled}`
 * para que los consumidores no hagan dos viajes al servicio de feature-flag.
 *
 * Devuelve `{maxVersion: undefined, forceDowngradeEnabled: false}`
 * cuando la config falta o la version es invalida (calza con ant —
 * versiones invalidas se loguean via
 * `tengu_max_version_config_invalid` y se tratan como ausentes).
 */
export async function getMaxVersionAndForceDowngrade(): Promise<{
  maxVersion: string | undefined
  forceDowngradeEnabled: boolean
}> {
  const config = await getMaxVersionConfig()
  const maxVersion = await getMaxVersion()
  const forceDowngradeEnabled =
    process.env.USER_TYPE === 'ant'
      ? config.ant_force_downgrade === true
      : config.external_force_downgrade === true
  return { maxVersion, forceDowngradeEnabled }
}

/**
 * Puerto de ant `UK6` (3480.js). Decide si un downgrade forzado
 * realmente deberia disparar, comparando la version actual contra el
 * target. Devuelve true SOLO cuando `currentVersion > targetVersion`
 * (comparacion semver); una condicion "flag seteado pero el actual ya
 * es <= target" loguea y devuelve false (no hace falta downgrade, toma
 * la ruta normal de upgrade).
 *
 * `reason` es el contexto del llamador para la linea de log — los
 * valores espejan a ant:
 *   - `'native_update'`  → "Native installer: ..."
 *   - cualquier otro     → "AutoUpdater: ..."
 *
 * El parseo de version se delega a `gt()` (semver) que devuelve false
 * cuando cualquiera de los dos lados no es parseable.
 */
export function shouldForceDowngradeNow(
  currentVersion: string,
  targetVersion: string,
  reason: 'native_update' | 'auto_updater',
): boolean {
  const tag = reason === 'native_update' ? 'Native installer' : 'AutoUpdater'
  let isAbove = false
  try {
    // Bun.semver.order lanza en input no-parseable; el
    // `uX8.parse(H)?.compare(_)` de ant devuelve null. Se calza el
    // contrato null via try/catch — no-parseable en cualquier lado ⇒ false.
    isAbove = gt(currentVersion, targetVersion)
  } catch {
    isAbove = false
  }
  if (isAbove) {
    logForDebugging(
      `${tag}: force-downgrade active — moving from ${currentVersion} to ${targetVersion}`,
    )
    return true
  }
  logForDebugging(
    `${tag}: force-downgrade flag set but current ${currentVersion} is not above ${targetVersion} — taking normal upgrade path`,
  )
  return false
}

/**
 * Chequea si la version actual cumple con la version minima requerida
 * de la config de Statsig. Termina el proceso con un mensaje de error
 * si la version es demasiado vieja.
 *
 * NOTA SOBRE VERSIONADO BASADO EN SHA:
 * Se usa versionado compatible con SemVer con formato de metadata de
 * build (X.X.X+SHA) para despliegue continuo. Segun las specs de
 * SemVer, la metadata de build (la parte +SHA) se ignora al comparar
 * versiones.
 *
 * Enfoque de versionado:
 * 1. Para requisitos/compatibilidad de version (assertMinVersion), se
 *    usa comparacion semver que ignora la metadata de build
 * 2. Para actualizaciones ('claude update'), se usa comparacion exacta
 *    de string para detectar cualquier cambio, incluido el SHA
 *    - Esto asegura que los usuarios siempre obtengan el ultimo build,
 *      incluso cuando solo el SHA cambia
 *    - La UI muestra claramente ambas versiones incluyendo la metadata de build
 *
 * Este enfoque mantiene simple la logica de comparacion de version
 * mientras mantiene trazabilidad via el SHA.
 */
export async function assertMinVersion(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  try {
    const versionConfig = await getDynamicConfig_BLOCKS_ON_INIT<{
      minVersion: string
    }>('tengu_version_config', { minVersion: '0.0.0' })

    if (
      versionConfig.minVersion &&
      lt(MACRO.VERSION, versionConfig.minVersion)
    ) {
      console.error(`
It looks like your version of Claude Code (${MACRO.VERSION}) needs an update.
A newer version (${versionConfig.minVersion} or higher) is required to continue.

To update, please run:
    claude update

This will ensure you have access to the latest features and improvements.
`)
      // `@thyrox/app-host/bootstrap/gracefulShutdown.js` resuelve como
      // especificador, pero SU PROPIO módulo falla al cargar: importa
      // `chalk` sin declararlo en `app-host/package.json` (medido:
      // `Bun.resolveSync('chalk', .../app-host)` → "Cannot find
      // package"; no es una ruta de este agente, no se corrige aquí).
      // Import diferido para no tumbar la carga de ESTE módulo por un
      // gap ajeno.
      try {
        const { gracefulShutdownSync } = await import(
          '@thyrox/app-host/bootstrap/gracefulShutdown.js'
        )
        gracefulShutdownSync(1)
      } catch (shutdownError) {
        logForDebugging(
          `assertMinVersion: gracefulShutdownSync no disponible, usando process.exit: ${shutdownError}`,
        )
        process.exit(1)
      }
    }
  } catch (error) {
    logError(error as Error)
  }
}

/**
 * Devuelve la version maxima permitida para el tipo de usuario actual.
 * Para ants, devuelve el campo `ant` (formato de version dev). Para
 * usuarios externos, devuelve el campo `external` (semver limpio). Se
 * usa como kill switch del lado del servidor para pausar auto-updates
 * durante incidentes. Devuelve undefined si no hay tope configurado.
 */
export async function getMaxVersion(): Promise<string | undefined> {
  const config = await getMaxVersionConfig()
  const raw =
    process.env.USER_TYPE === 'ant'
      ? config.ant || undefined
      : config.external || undefined
  if (!raw) return undefined
  // Ant `Lw_`: `uX8.parse(q)?.version ?? void 0`. El valor provisto por
  // el servidor puede estar malformado (typo, string solo-metadata-de-build,
  // etc.); si no parsea, loguea telemetria y devuelve undefined para
  // que los consumidores no comparen contra basura.
  const parsed = parseVersion(raw)
  if (!parsed) {
    logForDebugging(
      `tengu_max_version_config has invalid version '${raw}' — ignoring`,
      { level: 'error' },
    )
    logEvent('tengu_max_version_config_invalid', {
      raw_value:
        raw as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return undefined
  }
  return parsed
}

/**
 * Devuelve el mensaje impulsado por el servidor que explica el problema
 * conocido, si esta configurado. Se muestra en el banner de advertencia
 * cuando la version actual excede la version maxima permitida.
 */
export async function getMaxVersionMessage(): Promise<string | undefined> {
  const config = await getMaxVersionConfig()
  if (process.env.USER_TYPE === 'ant') {
    return config.ant_message || undefined
  }
  return config.external_message || undefined
}

async function getMaxVersionConfig(): Promise<MaxVersionConfig> {
  try {
    return await getDynamicConfig_BLOCKS_ON_INIT<MaxVersionConfig>(
      'tengu_max_version_config',
      {},
    )
  } catch (error) {
    logError(error as Error)
    return {}
  }
}

/**
 * Ant `BV5` (3486.js) — puerto byte-por-byte. SINCRONO y lee la config
 * de GrowthBook CACHED-MAY-BE-STALE (NO bloqueante). El instalador
 * nativo se salta rapido el chequeo de canary cuando GrowthBook aun no
 * cargo — ant lo diseño explicitamente asi para que un GB init lento no
 * estanque `claude install`.
 *
 * `_27.valid()` es el `valid()` de semver de npm: devuelve el string de
 * version canonico limpio (p.ej. "1.2.3") o `null`. El `parseVersion()`
 * de ccb tiene la misma forma (devuelve `string | undefined`); se
 * coalesce a null para calzar el contrato de ant exactamente.
 */
export function getCanaryVersion(): string | null {
  try {
    const config = getDynamicConfig_CACHED_MAY_BE_STALE<{ external?: string }>(
      'tengu_canary',
      {},
    )
    const raw = config.external
    if (typeof raw !== 'string') return null
    return parseVersion(raw) ?? null
  } catch (error) {
    logForDebugging(
      `getCanaryVersion: GB read failed, falling through: ${(error as Error).message}`,
    )
    return null
  }
}

/**
 * Salta una version target que esta debajo del setting `minimumVersion`
 * del usuario. El `O7H` (3480.js) de ant usa el `lR` de semver de npm
 * con `{loose:true}` que devuelve `false` para input no-parseable.
 * Bun.semver.order (bajo el `gte` de ccb) lanza en no-parseable — se
 * envuelve en try/catch y se cae a `true` (saltar) para mantener el
 * updater no-fatal ante settings de minimumVersion malos (p.ej. el
 * calver legacy `1.carus.000` de ccb).
 */
export function shouldSkipVersion(targetVersion: string): boolean {
  const settings = getInitialSettings()
  const minimumVersion = (settings as { minimumVersion?: string } | undefined)
    ?.minimumVersion
  if (!minimumVersion) return false
  let shouldSkip: boolean
  try {
    shouldSkip = !gte(targetVersion, minimumVersion)
  } catch {
    shouldSkip = true
  }
  if (shouldSkip) {
    logForDebugging(
      `Skipping update to ${targetVersion} - below minimumVersion ${minimumVersion}`,
    )
  }
  return shouldSkip
}

// Archivo de lock para el auto-updater, para prevenir updates concurrentes
const LOCK_TIMEOUT_MS = 5 * 60 * 1000 // timeout de 5 minutos para locks

/**
 * Obtiene la ruta al archivo de lock.
 * Es una funcion para asegurar que se evalue en runtime, despues del
 * setup de test
 */
export function getLockFilePath(): string {
  return join(getClaudeConfigHomeDir(), '.update.lock')
}

/**
 * Intenta adquirir un lock para el auto-updater
 * @returns true si el lock se adquirio, false si otro proceso lo tiene
 */
async function acquireLock(): Promise<boolean> {
  const fs = getFsImplementation()
  const lockPath = getLockFilePath()

  // Chequea si hay un lock existente: 1 stat() en el camino feliz (lock
  // fresco o ENOENT), 2 en la recuperacion de lock obsoleto
  // (re-verifica la obsolescencia inmediatamente antes de unlink).
  try {
    const stats = await fs.stat(lockPath)
    const age = Date.now() - stats.mtimeMs
    if (age < LOCK_TIMEOUT_MS) {
      return false
    }
    // El lock esta obsoleto, se remueve antes de tomarlo. Se
    // re-verifica la obsolescencia inmediatamente antes de unlink para
    // cerrar una carrera TOCTOU: si dos procesos observan el lock
    // obsoleto, A hace unlink + escribe un lock fresco, luego B haria
    // unlink del lock fresco de A y ambos creerian tenerlo. Un lock
    // fresco tiene un mtime reciente, asi que re-chequear la
    // obsolescencia hace que B se retire.
    try {
      const recheck = await fs.stat(lockPath)
      if (Date.now() - recheck.mtimeMs < LOCK_TIMEOUT_MS) {
        return false
      }
      await fs.unlink(lockPath)
    } catch (err) {
      if (!isENOENT(err)) {
        logError(err as Error)
        return false
      }
    }
  } catch (err) {
    if (!isENOENT(err)) {
      logError(err as Error)
      return false
    }
    // ENOENT: no hay archivo de lock, se procede a crear uno
  }

  // Crea el archivo de lock atomicamente con O_EXCL (flag: 'wx'). Si
  // otro proceso gana la carrera y lo crea primero, se obtiene EEXIST y
  // se retira. Lazy-mkdir del dir de config en ENOENT.
  try {
    await writeFile(lockPath, `${process.pid}`, {
      encoding: 'utf8',
      flag: 'wx',
    })
    return true
  } catch (err) {
    const code = getErrnoCode(err)
    if (code === 'EEXIST') {
      return false
    }
    if (code === 'ENOENT') {
      try {
        // fs.mkdir de getFsImplementation() siempre es recursive:true y
        // traga EEXIST internamente, asi que una carrera de creacion de
        // directorio no puede llegar al catch de abajo — solo el
        // EEXIST de writeFile (contencion de lock real) puede.
        await fs.mkdir(getClaudeConfigHomeDir())
        await writeFile(lockPath, `${process.pid}`, {
          encoding: 'utf8',
          flag: 'wx',
        })
        return true
      } catch (mkdirErr) {
        if (getErrnoCode(mkdirErr) === 'EEXIST') {
          return false
        }
        logError(mkdirErr as Error)
        return false
      }
    }
    logError(err as Error)
    return false
  }
}

/**
 * Libera el lock de update si esta en poder de este proceso
 */
async function releaseLock(): Promise<void> {
  const fs = getFsImplementation()
  const lockPath = getLockFilePath()
  try {
    const lockData = await fs.readFile(lockPath, { encoding: 'utf8' })
    if (lockData === `${process.pid}`) {
      await fs.unlink(lockPath)
    }
  } catch (err) {
    if (isENOENT(err)) {
      return
    }
    logError(err as Error)
  }
}

async function getInstallationPrefix(): Promise<string | null> {
  // Corre desde el directorio home para evitar leer .npmrc/.bunfig.toml
  // a nivel de proyecto
  const isBun = isRunningWithBun()
  let prefixResult = null
  if (isBun) {
    prefixResult = await execFileNoThrowWithCwd('bun', ['pm', 'bin', '-g'], {
      cwd: homedir(),
    })
  } else {
    prefixResult = await execFileNoThrowWithCwd(
      'npm',
      ['-g', 'config', 'get', 'prefix'],
      { cwd: homedir() },
    )
  }
  if (prefixResult.code !== 0) {
    logError(new Error(`Failed to check ${isBun ? 'bun' : 'npm'} permissions`))
    return null
  }
  return prefixResult.stdout.trim()
}

export async function checkGlobalInstallPermissions(): Promise<{
  hasPermissions: boolean
  npmPrefix: string | null
}> {
  try {
    const prefix = await getInstallationPrefix()
    if (!prefix) {
      return { hasPermissions: false, npmPrefix: null }
    }
    try {
      await access(prefix, fsConstants.W_OK)
      return { hasPermissions: true, npmPrefix: prefix }
    } catch {
      logError(
        new AutoUpdaterError(
          'Insufficient permissions for global npm install.',
        ),
      )
      return { hasPermissions: false, npmPrefix: prefix }
    }
  } catch (error) {
    logError(error as Error)
    return { hasPermissions: false, npmPrefix: null }
  }
}

export async function getLatestVersion(
  channel: ReleaseChannel,
): Promise<string | null> {
  // default de ccb: GitHub Releases. La ruta de npm de abajo se
  // mantiene solo para usuarios ant-internal; MACRO.PACKAGE_URL esta
  // vacio en este build asi que la llamada npm fallaria de todos modos.
  if (process.env.USER_TYPE !== 'ant') {
    try {
      const { fetchLatestReleaseTag } = await import(
        './githubReleases.js'
      )
      const tag = await fetchLatestReleaseTag()
      // Descarta la "v" inicial — MACRO.VERSION es "1.carus.000", no "v1.carus.000".
      return tag.startsWith('v') ? tag.slice(1) : tag
    } catch (error) {
      logForDebugging(`getLatestVersion: GitHub fetch failed: ${error}`)
      return null
    }
  }

  const npmTag = channel === 'stable' ? 'stable' : 'latest'

  // Corre desde el directorio home para evitar leer un .npmrc de nivel
  // de proyecto que podria estar maliciosamente elaborado para
  // redirigir al registro de un atacante
  const result = await execFileNoThrowWithCwd(
    'npm',
    ['view', `${MACRO.PACKAGE_URL}@${npmTag}`, 'version', '--prefer-online'],
    { abortSignal: AbortSignal.timeout(5000), cwd: homedir() },
  )
  if (result.code !== 0) {
    logForDebugging(`npm view failed with code ${result.code}`)
    if (result.stderr) {
      logForDebugging(`npm stderr: ${result.stderr.trim()}`)
    } else {
      logForDebugging('npm stderr: (empty)')
    }
    if (result.stdout) {
      logForDebugging(`npm stdout: ${result.stdout.trim()}`)
    }
    return null
  }
  return result.stdout.trim()
}

export type NpmDistTags = {
  latest: string | null
  stable: string | null
}

/**
 * Obtiene los dist-tags de npm (versiones latest y stable) del
 * registro. Lo usa el comando doctor para mostrar a los usuarios que
 * versiones estan disponibles.
 */
export async function getNpmDistTags(): Promise<NpmDistTags> {
  // Corre desde el directorio home para evitar leer un .npmrc de nivel de proyecto
  const result = await execFileNoThrowWithCwd(
    'npm',
    ['view', MACRO.PACKAGE_URL, 'dist-tags', '--json', '--prefer-online'],
    { abortSignal: AbortSignal.timeout(5000), cwd: homedir() },
  )

  if (result.code !== 0) {
    logForDebugging(`npm view dist-tags failed with code ${result.code}`)
    return { latest: null, stable: null }
  }

  try {
    const parsed = jsonParse(result.stdout.trim()) as Record<string, unknown>
    return {
      latest: typeof parsed.latest === 'string' ? parsed.latest : null,
      stable: typeof parsed.stable === 'string' ? parsed.stable : null,
    }
  } catch (error) {
    logForDebugging(`Failed to parse dist-tags: ${error}`)
    return { latest: null, stable: null }
  }
}

/**
 * Obtiene la ultima version del bucket GCS para un canal de release
 * dado. Lo usan instalaciones sin npm (p.ej. instalaciones por gestor
 * de paquetes).
 */
export async function getLatestVersionFromGcs(
  channel: ReleaseChannel,
): Promise<string | null> {
  try {
    const response = await axios.get(`${GCS_BUCKET_URL}/${channel}`, {
      timeout: 5000,
      responseType: 'text',
    })
    return response.data.trim()
  } catch (error) {
    logForDebugging(`Failed to fetch ${channel} from GCS: ${error}`)
    return null
  }
}

/**
 * Puerto de ant v2.1.136 `XV5` (3480.js). Lee la version publicada del
 * cask desde formulae.brew.sh. La formula de Homebrew publica versiones
 * nuevas en su propia cadencia (updates manuales de cask por el
 * mantenedor), asi que la version que devuelve puede rezagarse del
 * puntero GCS por horas. Se cae a GCS cuando la API de brew falla o no
 * devuelve nada — ver `getLatestVersionForBrew` abajo.
 */
export async function getLatestVersionFromHomebrew(
  formulaName: string,
): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://formulae.brew.sh/api/cask/${formulaName}.json`,
      { timeout: 5000, responseType: 'json' },
    )
    const version = (response.data as { version?: unknown })?.version
    return typeof version === 'string' ? version : null
  } catch (error) {
    logForDebugging(
      `Failed to fetch ${formulaName} from formulae.brew.sh: ${error}`,
    )
    return null
  }
}

/**
 * Puerto de ant v2.1.136 `FK6` (3480.js). Para instalaciones de cask de
 * Homebrew la fuente canonica de verdad es
 * `formulae.brew.sh/api/cask/<name>.json` (asi el auto-updater concuerda
 * con lo que `brew upgrade --cask` realmente obtendria). Cae al puntero
 * de canal GCS cuando la API de brew falla, para que los usuarios en
 * formulas de canal dev no queden atascados.
 */
export async function getLatestVersionForBrew(
  formulaName: string,
  channel: ReleaseChannel,
): Promise<string | null> {
  const [brew, gcs] = await Promise.all([
    getLatestVersionFromHomebrew(formulaName),
    getLatestVersionFromGcs(channel),
  ])
  return brew ?? gcs
}

/**
 * Obtiene versiones disponibles del bucket GCS (para instalaciones
 * nativas). Obtiene los punteros de canal latest y stable.
 */
export async function getGcsDistTags(): Promise<NpmDistTags> {
  const [latest, stable] = await Promise.all([
    getLatestVersionFromGcs('latest'),
    getLatestVersionFromGcs('stable'),
  ])

  return { latest, stable }
}

// Dist-tags para instalaciones nativas de ccb (panel "Updates" del
// doctor). Fachada delgada sobre githubReleases — reexpuesta aqui para
// que la pantalla de doctor obtenga las tres fuentes de dist-tag
// (GCS/npm/GitHub) desde un solo entrypoint sin agrandar el presupuesto
// de superficie de export del paquete. El import dinamico espeja
// getLatestVersion arriba y mantiene el borde autoUpdater→githubReleases
// fuera del grafo de ciclos estatico.
export async function getGithubDistTags(): Promise<NpmDistTags> {
  const { getGithubDistTags: impl } = await import('./githubReleases.js')
  return impl()
}

/**
 * Obtiene el historial de versiones del registro npm (feature ant-only)
 * Devuelve versiones ordenadas newest-first, limitadas al conteo especificado
 *
 * Usa NATIVE_PACKAGE_URL cuando esta disponible porque:
 * 1. La instalacion nativa es el metodo de instalacion primario para usuarios ant
 * 2. No todas las versiones de paquete JS tienen paquetes nativos correspondientes
 * 3. Esto previene que el rollback liste versiones sin binarios nativos
 */
export async function getVersionHistory(limit: number): Promise<string[]> {
  if (process.env.USER_TYPE !== 'ant') {
    return []
  }

  // Usa la URL de paquete nativo cuando esta disponible para asegurar
  // que solo se muestren versiones con binarios nativos (no todas las
  // versiones de paquete JS tienen builds nativos)
  const packageUrl = MACRO.NATIVE_PACKAGE_URL || MACRO.PACKAGE_URL

  // Corre desde el directorio home para evitar leer un .npmrc de nivel de proyecto
  const result = await execFileNoThrowWithCwd(
    'npm',
    ['view', packageUrl, 'versions', '--json', '--prefer-online'],
    // Timeout mas largo para la lista de versiones
    { abortSignal: AbortSignal.timeout(30000), cwd: homedir() },
  )

  if (result.code !== 0) {
    logForDebugging(`npm view versions failed with code ${result.code}`)
    if (result.stderr) {
      logForDebugging(`npm stderr: ${result.stderr.trim()}`)
    }
    return []
  }

  try {
    const versions = jsonParse(result.stdout.trim()) as string[]
    // Toma las ultimas N versiones, luego invierte para tener newest-first
    return versions.slice(-limit).reverse()
  } catch (error) {
    logForDebugging(`Failed to parse version history: ${error}`)
    return []
  }
}

export async function installGlobalPackage(
  specificVersion?: string | null,
): Promise<InstallStatus> {
  if (!(await acquireLock())) {
    logError(
      new AutoUpdaterError('Another process is currently installing an update'),
    )
    // Loguea la contencion de lock
    logEvent('tengu_auto_updater_lock_contention', {
      pid: process.pid,
      currentVersion:
        MACRO.VERSION as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return 'in_progress'
  }

  try {
    await removeClaudeAliasesFromShellConfigs()
    // Chequea si se esta usando npm de la ruta de Windows en WSL
    if (!isRunningWithBun() && (await isNpmFromWindowsPath())) {
      logError(new Error('Windows NPM detected in WSL environment'))
      logEvent('tengu_auto_updater_windows_npm_in_wsl', {
        currentVersion:
          MACRO.VERSION as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      console.error(`
Error: Windows NPM detected in WSL

You're running Claude Code in WSL but using the Windows NPM installation from /mnt/c/.
This configuration is not supported for updates.

To fix this issue:
  1. Install Node.js within your Linux distribution: e.g. sudo apt install nodejs npm
  2. Make sure Linux NPM is in your PATH before the Windows version
  3. Try updating again with 'claude update'
`)
      return 'install_failed'
    }

    const { hasPermissions } = await checkGlobalInstallPermissions()
    if (!hasPermissions) {
      return 'no_permissions'
    }

    // Usa la version especifica si se dio, si no usa la ultima
    const packageSpec = specificVersion
      ? `${MACRO.PACKAGE_URL}@${specificVersion}`
      : MACRO.PACKAGE_URL

    // Corre desde el directorio home para evitar leer .npmrc/.bunfig.toml
    // de nivel de proyecto que podrian estar maliciosamente elaborados
    // para redirigir al registro de un atacante
    const packageManager = isRunningWithBun() ? 'bun' : 'npm'
    const installResult = await execFileNoThrowWithCwd(
      packageManager,
      ['install', '-g', packageSpec],
      { cwd: homedir() },
    )
    if (installResult.code !== 0) {
      const error = new AutoUpdaterError(
        `Failed to install new version of claude: ${installResult.stdout} ${installResult.stderr}`,
      )
      logError(error)
      return 'install_failed'
    }

    // Setea installMethod a 'global' para trackear instalaciones
    // globales de npm. Desde #260 escribe de verdad: el sustituto que
    // lo dejaba en no-op declarado quedó retirado.
    saveGlobalConfig(current => ({
      ...current,
      installMethod: 'global',
    }))

    return 'success'
  } finally {
    // Asegura que siempre se libere el lock
    await releaseLock()
  }
}

/**
 * Remueve los aliases de claude de los archivos de configuracion de
 * shell. Ayuda a limpiar metodos de instalacion viejos al cambiar a
 * instalacion nativa o npm global.
 *
 * Ver docstring del módulo — usa `tryGetShellConfig()`, que devuelve
 * `null` si `@thyrox/shell/shellConfig.js` no existe.
 */
async function removeClaudeAliasesFromShellConfigs(): Promise<void> {
  const shellConfig = tryGetShellConfig()
  if (!shellConfig) {
    logForDebugging(
      `removeClaudeAliasesFromShellConfigs: '@thyrox/shell/shellConfig.js' ausente, se omite`,
    )
    return
  }

  const configMap = shellConfig.getShellConfigPaths()

  // Procesa cada archivo de config de shell
  for (const [, configFile] of Object.entries(configMap)) {
    try {
      const lines = await shellConfig.readFileLines(configFile)
      if (!lines) continue

      const { filtered, hadAlias } = shellConfig.filterClaudeAliases(lines)

      if (hadAlias) {
        await shellConfig.writeFileLines(configFile, filtered)
        logForDebugging(`Removed claude alias from ${configFile}`)
      }
    } catch (error) {
      // No falla la operacion entera si un archivo no se puede procesar
      logForDebugging(`Failed to remove alias from ${configFile}: ${error}`, {
        level: 'error',
      })
    }
  }
}
