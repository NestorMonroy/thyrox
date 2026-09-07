/**
 * Funcionalidad de descarga para el instalador nativo
 *
 * Maneja la descarga de binarios de Claude desde varias fuentes:
 * - Paquetes NPM de Artifactory (ant-internal)
 * - Bucket GCS
 * - GitHub Releases (ruta por defecto de ccb)
 *
 * Puerto de `ccnmt: packages/updater/src/nativeInstaller/download.ts`
 * (490 líneas fuente, 100% portado en lógica).
 *
 * Divergencias declaradas, las dos del mismo origen — construcciones de
 * BUILD TIME del bundler propio de ccnmt, no módulos importables:
 *
 *   - `feature()` de `bun:bundle` — medido: `import('bun:bundle')` en
 *     este Bun (1.3.11) da `Cannot find package 'bundle'`. No es un
 *     paquete hermano ausente (rule #3 no aplica: no hay especificador
 *     de módulo hermano que resolver) — es una macro de bundling
 *     time-of-build de ccnmt. Se reimplementa localmente como lectura
 *     de variable de entorno (`CCB_FEATURE_<flag>`), documentado.
 *   - `MACRO.VERSION` / `MACRO.NATIVE_PACKAGE_URL` / `MACRO.PACKAGE_URL`
 *     — el global `MACRO` lo inyecta el bundler de ccnmt en tiempo de
 *     build (no hay declaración de módulo que lo provea). Se
 *     reimplementa localmente como un objeto leído de variables de
 *     entorno (`CCB_VERSION`, `CCB_NATIVE_PACKAGE_URL`,
 *     `CCB_PACKAGE_URL`), con el mismo nombre de campo.
 *   - `ReleaseChannel` — la fuente lo importa de
 *     `@claude-code-how-works/config` (bare); `@thyrox/config` no lo
 *     exporta (medido: 0 hits de `ReleaseChannel` en sus `.ts`). Se
 *     declara localmente con los dos únicos valores que este módulo
 *     valida (`'stable' | 'latest'`).
 */

import axios from 'axios'
import { join } from 'path'
import { logEvent } from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { execFileNoThrowWithCwd } from '@thyrox/shell/execFileNoThrow.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { logError } from '@thyrox/local-observability/log.js'
import { jsonStringify, writeFileSync } from '@thyrox/local-observability/slowOperations.js'
import { getBinaryName, getPlatform } from './platform.js'
import { streamBinaryDownload } from './streamBinaryDownload.js'

/** Ver docstring del módulo — sustituto local de `ReleaseChannel` de `@thyrox/config`. */
export type ReleaseChannel = 'stable' | 'latest'

/** Ver docstring del módulo — sustituto local de `feature()` de `bun:bundle`. */
function feature(flag: 'ALLOW_TEST_VERSIONS'): boolean {
  return process.env[`CCB_FEATURE_${flag}`] === '1'
}

/** Ver docstring del módulo — sustituto local del global `MACRO` de ccnmt. */
const MACRO = {
  VERSION: process.env.CCB_VERSION ?? '0.0.0',
  NATIVE_PACKAGE_URL: process.env.CCB_NATIVE_PACKAGE_URL ?? '',
  PACKAGE_URL: process.env.CCB_PACKAGE_URL ?? '',
}

const GCS_BUCKET_URL =
  'https://storage.googleapis.com/claude-code-how-works-how-works-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-how-works-how-works-releases'
const ARTIFACTORY_REGISTRY_URL =
  'https://artifactory.infra.ant.dev/artifactory/api/npm/npm-all/'

async function getLatestVersionFromArtifactory(
  tag: string = 'latest',
): Promise<string> {
  const startTime = Date.now()
  const { stdout, code, stderr } = await execFileNoThrowWithCwd(
    'npm',
    [
      'view',
      `${MACRO.NATIVE_PACKAGE_URL}@${tag}`,
      'version',
      '--prefer-online',
      '--registry',
      ARTIFACTORY_REGISTRY_URL,
    ],
    {
      timeout: 30000,
      preserveOutputOnError: true,
    },
  )

  const latencyMs = Date.now() - startTime

  if (code !== 0) {
    logEvent('tengu_version_check_failure', {
      latency_ms: latencyMs,
      source_npm: true,
      exit_code: code,
    })
    const error = new Error(`npm view failed with code ${code}: ${stderr}`)
    logError(error)
    throw error
  }

  logEvent('tengu_version_check_success', {
    latency_ms: latencyMs,
    source_npm: true,
  })
  logForDebugging(
    `npm view ${MACRO.NATIVE_PACKAGE_URL}@${tag} version: ${stdout}`,
  )
  const latestVersion = stdout.trim()
  return latestVersion
}

export async function getLatestVersion(
  channelOrVersion: string,
): Promise<string> {
  // Version directa: el formato "v1.carus.NNN" de ccb O el semver
  // upstream "1.0.30". Ambos se aceptan como override directo — util
  // para `ccb install <version>`.
  if (
    /^v?\d+\.[a-z0-9]+\.\w+(-\S+)?$/i.test(channelOrVersion) ||
    /^v?\d+\.\d+\.\d+(-\S+)?$/.test(channelOrVersion)
  ) {
    const normalized = channelOrVersion.startsWith('v')
      ? channelOrVersion.slice(1)
      : channelOrVersion
    if (/^99\.99\./.test(normalized) && !feature('ALLOW_TEST_VERSIONS')) {
      throw new Error(
        `Version ${normalized} is not available for installation. Use 'stable' or 'latest'.`,
      )
    }
    return normalized
  }

  // Validacion de ReleaseChannel
  const channel = channelOrVersion as ReleaseChannel
  if (channel !== 'stable' && channel !== 'latest') {
    throw new Error(
      `Invalid channel: ${channelOrVersion}. Use 'stable' or 'latest'`,
    )
  }

  // Los usuarios ant-internal siguen usando Artifactory.
  if (process.env.USER_TYPE === 'ant') {
    const npmTag = channel === 'stable' ? 'stable' : 'latest'
    return getLatestVersionFromArtifactory(npmTag)
  }

  // default de ccb: GitHub Releases. El canal "stable" hoy tambien
  // mapea a "latest" — distinguirlos exige una convencion de nombre de
  // tag que aun no se ha establecido.
  const { fetchLatestReleaseTag } = await import('../githubReleases.js')
  const tag = await fetchLatestReleaseTag()
  // Descarta la "v" inicial para que las comparaciones de version contra
  // MACRO.VERSION funcionen (MACRO.VERSION es "1.carus.000", no "v1.carus.000").
  return tag.startsWith('v') ? tag.slice(1) : tag
}

async function downloadVersionFromArtifactory(
  version: string,
  stagingPath: string,
) {
  const fs = getFsImplementation()

  // Si llegamos aqui, somos dueños del lock y podemos borrar una
  // descarga parcial
  await fs.rm(stagingPath, { recursive: true, force: true })

  // Obtiene el nombre de paquete especifico de la plataforma
  const platform = getPlatform()
  const platformPackageName = `${MACRO.NATIVE_PACKAGE_URL}-${platform}`

  // Obtiene el hash de integridad para el paquete especifico de la plataforma
  logForDebugging(
    `Fetching integrity hash for ${platformPackageName}@${version}`,
  )
  const {
    stdout: integrityOutput,
    code,
    stderr,
  } = await execFileNoThrowWithCwd(
    'npm',
    [
      'view',
      `${platformPackageName}@${version}`,
      'dist.integrity',
      '--registry',
      ARTIFACTORY_REGISTRY_URL,
    ],
    {
      timeout: 30000,
      preserveOutputOnError: true,
    },
  )

  if (code !== 0) {
    throw new Error(`npm view integrity failed with code ${code}: ${stderr}`)
  }

  const integrity = integrityOutput.trim()
  if (!integrity) {
    throw new Error(
      `Failed to fetch integrity hash for ${platformPackageName}@${version}`,
    )
  }

  logForDebugging(`Got integrity hash for ${platform}: ${integrity}`)

  // Crea un proyecto npm aislado en staging
  await fs.mkdir(stagingPath)

  const packageJson = {
    name: 'claude-native-installer',
    version: '0.0.1',
    dependencies: {
      [MACRO.NATIVE_PACKAGE_URL!]: version,
    },
  }

  // Crea package-lock.json con verificacion de integridad para el
  // paquete especifico de la plataforma
  const packageLock = {
    name: 'claude-native-installer',
    version: '0.0.1',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: 'claude-native-installer',
        version: '0.0.1',
        dependencies: {
          [MACRO.NATIVE_PACKAGE_URL!]: version,
        },
      },
      [`node_modules/${MACRO.NATIVE_PACKAGE_URL}`]: {
        version: version,
        optionalDependencies: {
          [platformPackageName]: version,
        },
      },
      [`node_modules/${platformPackageName}`]: {
        version: version,
        integrity: integrity,
      },
    },
  }

  writeFileSync(
    join(stagingPath, 'package.json'),
    jsonStringify(packageJson, null, 2),
    { encoding: 'utf8', flush: true },
  )

  writeFileSync(
    join(stagingPath, 'package-lock.json'),
    jsonStringify(packageLock, null, 2),
    { encoding: 'utf8', flush: true },
  )

  // Instala con npm - verificara la integridad desde package-lock.json.
  // Usa --prefer-online para forzar chequeos de metadata frescos, ayuda
  // con retrasos de replicacion de Artifactory
  const result = await execFileNoThrowWithCwd(
    'npm',
    ['ci', '--prefer-online', '--registry', ARTIFACTORY_REGISTRY_URL],
    {
      timeout: 60000,
      preserveOutputOnError: true,
      cwd: stagingPath,
    },
  )

  if (result.code !== 0) {
    throw new Error(`npm ci failed with code ${result.code}: ${result.stderr}`)
  }

  logForDebugging(
    `Successfully downloaded and verified ${MACRO.NATIVE_PACKAGE_URL}@${version}`,
  )
}

// Timeout de estancamiento: aborta si no se reciben bytes por esta duracion
const DEFAULT_STALL_TIMEOUT_MS = 60000 // 60 segundos
function getStallTimeoutMs(): number {
  return (
    Number(process.env.CLAUDE_CODE_STALL_TIMEOUT_MS_FOR_TESTING) ||
    DEFAULT_STALL_TIMEOUT_MS
  )
}

/**
 * Logica comun para descargar y verificar un binario. Incluye deteccion
 * de estancamiento (aborta si no hay bytes por 60s) y logica de reintento.
 */
async function downloadAndVerifyBinary(
  binaryUrl: string,
  expectedChecksum: string,
  binaryPath: string,
  requestConfig: Record<string, unknown> = {},
  skipChecksum: boolean = false,
) {
  await streamBinaryDownload({
    binaryUrl,
    expectedChecksum,
    binaryPath,
    requestConfig,
    skipChecksum,
    stallTimeoutMs: getStallTimeoutMs(),
  })
}

async function downloadVersionFromBinaryRepo(
  version: string,
  stagingPath: string,
  baseUrl: string,
  authConfig?: {
    auth?: { username: string; password: string }
    headers?: Record<string, string>
  },
) {
  const fs = getFsImplementation()

  // Si llegamos aqui, somos dueños del lock y podemos borrar una
  // descarga parcial
  await fs.rm(stagingPath, { recursive: true, force: true })

  // Obtiene la plataforma
  const platform = getPlatform()
  const startTime = Date.now()

  // Registra el inicio del intento de descarga
  logEvent('tengu_binary_download_attempt', {})

  // Obtiene el manifest para el checksum
  let manifest
  try {
    const manifestResponse = await axios.get(
      `${baseUrl}/${version}/manifest.json`,
      {
        timeout: 10000,
        responseType: 'json',
        ...authConfig,
      },
    )
    manifest = manifestResponse.data
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    let httpStatus: number | undefined
    if (axios.isAxiosError(error) && error.response) {
      httpStatus = error.response.status
    }

    logEvent('tengu_binary_manifest_fetch_failure', {
      latency_ms: latencyMs,
      http_status: httpStatus,
      is_timeout: errorMessage.includes('timeout'),
    })
    logError(
      new Error(
        `Failed to fetch manifest from ${baseUrl}/${version}/manifest.json: ${errorMessage}`,
      ),
    )
    throw error
  }

  const platformInfo = manifest.platforms[platform]

  if (!platformInfo) {
    logEvent('tengu_binary_platform_not_found', {})
    throw new Error(
      `Platform ${platform} not found in manifest for version ${version}`,
    )
  }

  const expectedChecksum = platformInfo.checksum

  // Tanto GCS como el bucket generico usan el mismo layout:
  // ${baseUrl}/${version}/${platform}/${binaryName}
  const binaryName = getBinaryName(platform)
  const binaryUrl = `${baseUrl}/${version}/${platform}/${binaryName}`

  // Escribe a staging
  await fs.mkdir(stagingPath)
  const binaryPath = join(stagingPath, binaryName)

  try {
    await downloadAndVerifyBinary(
      binaryUrl,
      expectedChecksum,
      binaryPath,
      authConfig || {},
    )
    const latencyMs = Date.now() - startTime
    logEvent('tengu_binary_download_success', {
      latency_ms: latencyMs,
    })
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    let httpStatus: number | undefined
    if (axios.isAxiosError(error) && error.response) {
      httpStatus = error.response.status
    }

    logEvent('tengu_binary_download_failure', {
      latency_ms: latencyMs,
      http_status: httpStatus,
      is_timeout: errorMessage.includes('timeout'),
      is_checksum_mismatch: errorMessage.includes('Checksum mismatch'),
    })
    logError(
      new Error(`Failed to download binary from ${binaryUrl}: ${errorMessage}`),
    )
    throw error
  }
}

export async function downloadVersion(
  version: string,
  stagingPath: string,
): Promise<'npm' | 'binary'> {
  // Las versiones de fixture de test enrutan al bucket sentinela
  // privado. DCE'd en todos los builds publicados — el string
  // 'claude-code-how-works-how-works-ci-sentinel' y la llamada a gcloud
  // nunca existen en los binarios compilados.
  if (feature('ALLOW_TEST_VERSIONS') && /^99\.99\./.test(version)) {
    const { stdout } = await execFileNoThrowWithCwd('gcloud', [
      'auth',
      'print-access-token',
    ])
    await downloadVersionFromBinaryRepo(
      version,
      stagingPath,
      'https://storage.googleapis.com/claude-code-how-works-how-works-ci-sentinel',
      { headers: { Authorization: `Bearer ${stdout.trim()}` } },
    )
    return 'binary'
  }

  if (process.env.USER_TYPE === 'ant') {
    await downloadVersionFromArtifactory(version, stagingPath)
    return 'npm'
  }

  // default de ccb: descarga el binario especifico de plataforma desde
  // GitHub Releases.
  await downloadVersionFromGithubReleases(version, stagingPath)
  return 'binary'
}

/**
 * Adaptador de GitHub Releases para ccb. Distinto del
 * downloadVersionFromBinaryRepo del upstream (que espera un
 * manifest.json con checksums por plataforma) — GitHub Releases guarda
 * cada binario de plataforma como un asset plano, con archivos .sha256
 * hermanos opcionales para verificacion.
 */
async function downloadVersionFromGithubReleases(
  version: string,
  stagingPath: string,
): Promise<void> {
  const fs = getFsImplementation()
  await fs.rm(stagingPath, { recursive: true, force: true })

  const platform = getPlatform()
  const startTime = Date.now()
  logEvent('tengu_binary_download_attempt', {})

  const { fetchAssetSha256, getAssetDownloadUrl, getAssetNameForPlatform } =
    await import('../githubReleases.js')

  // La forma del tag en GitHub es "v<version>"; se aceptan ambas formas
  // en los llamadores de download.ts, asi que siempre se re-antepone la
  // v si falta.
  const tag = version.startsWith('v') ? version : `v${version}`
  const assetName = getAssetNameForPlatform(platform)
  const binaryUrl = getAssetDownloadUrl(tag, assetName)

  // Exigencia del hermano .sha256:
  //   - v26.x.x y posteriores: REQUERIDO. release.yml emite .sha256 para
  //     cada binario; si el fetch devuelve null en un tag v26+, o es un
  //     release roto (rehusar instalar) o es un ataque MITM activo que
  //     borro el archivo de checksum (rehusar con mas fuerza).
  //   - v1.carus.000: unico release historico sin .sha256 (publicado
  //     antes de que se conectara el paso de checksum). Todos los
  //     v1.carus.NNN posteriores lo tienen. El auto-update ya movio a
  //     todos mas alla de esta version hace tiempo.
  //   - Otras formas de tag no reconocidas: fallback solo-TLS (defensivo
  //     — no deberia ocurrir en la practica ya que la descarga esta
  //     gateada por isVersionNewer).
  // Corrida de auditoria 2026-05-04: 107/107 releases chequeados, solo
  // v1.carus.000 carece de .sha256 — confirma la seguridad de este gate.
  const expectedChecksum = await fetchAssetSha256(tag, assetName)
  // Major >= 10. Excluye v1.x (carus legacy + ant upstream) y v2-v9.
  // El esquema CalVer de ccb es v<año-2-digitos>.<mes>.<n>, asi que
  // cualquier major >= 10 es un release de ccb — ninguno de los cuales
  // se ha publicado sin .sha256 excepto el primerisimo v1.carus.000.
  const isModernTag = /^v(?:[1-9]\d+|\d{3,})\./.test(tag)
  if (expectedChecksum === null && isModernTag) {
    throw new Error(
      `Refusing to install ${tag}: missing .sha256 sibling. ` +
        `Modern releases (v26+) must publish a checksum file. ` +
        `Either the release is broken or the checksum was stripped in transit.`,
    )
  }

  // El layout local calza con el upstream de Anthropic:
  // `staging/<version>/<binaryName>`. installer.ts luego mueve
  // atomicamente el binario a `versions/<version>` (un archivo, no un
  // directorio — getVersionPaths lo aplana antes de publicar).
  const binaryName = getBinaryName(platform)
  await fs.mkdir(stagingPath)
  const binaryPath = join(stagingPath, binaryName)

  try {
    await downloadAndVerifyBinary(
      binaryUrl,
      expectedChecksum ?? '',
      binaryPath,
      {},
      // Solo los tags legacy estilo v1.carus.000 llegan a esta rama con
      // null — los tags modernos lanzan arriba.
      expectedChecksum === null,
    )
    const latencyMs = Date.now() - startTime
    logEvent('tengu_binary_download_success', { latency_ms: latencyMs })
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    let httpStatus: number | undefined
    if (axios.isAxiosError(error) && error.response) {
      httpStatus = error.response.status
    }
    logEvent('tengu_binary_download_failure', {
      latency_ms: latencyMs,
      http_status: httpStatus,
      is_timeout: errorMessage.includes('timeout'),
      is_checksum_mismatch: errorMessage.includes('Checksum mismatch'),
    })
    logError(
      new Error(`Failed to download ${binaryUrl}: ${errorMessage}`),
    )
    throw error
  }
}
