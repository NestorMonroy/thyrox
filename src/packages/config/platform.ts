/**
 * Puerto de `ccnmt: packages/config/platform.ts` (150 líneas fuente).
 * Detección de plataforma (macOS/Windows/WSL/Linux), versión de WSL,
 * distro de Linux, y detección de VCS por marcadores de directorio.
 * Reimplementación fiel.
 *
 * `readdir`/`readFile` de `fs/promises` y `release` de `os` son built-ins de
 * Node, resuelven tal cual. Repuntados vía `require()` diferido
 * (`./internal/pendingCrossPackageDeps.ts`, con la razón medida en su propio
 * docstring):
 * - `getFsImplementation` — `@thyrox/storage/fsOperations.js` no resuelve de
 *   forma estática por falta de symlinks de workspace (el símbolo SÍ existe
 *   en el paquete).
 * - `logError` — mismo caso, `@thyrox/local-observability/logging`.
 *
 * La detección es un objeto, no funciones memoizadas: `PlatformDetector`
 * porta la clase `S` de 2.1.283 y su cebado asíncrono en `init()`
 * (`primePlatform`). Ver su docstring.
 */

import { readdir, readFile } from 'fs/promises'
import { release as osRelease } from 'os'
import {
  requireLocalObservabilityDebug,
  requireLocalObservabilityLogging,
  requireStorageFsOperations,
} from './internal/pendingCrossPackageDeps.js'

export type Platform = 'macos' | 'windows' | 'wsl' | 'linux' | 'unknown'

export const SUPPORTED_PLATFORMS: Platform[] = ['macos', 'wsl']

/**
 * Lo que el detector necesita del proceso. La fuente lo inyecta igual
 * (`p()`: `platform`, `env`, `readProcVersionSync`, `readProcVersion`,
 * `osRelease`, `readOsRelease`); aquí permite probar el flujo sin tocar
 * `process` ni el disco.
 */
export type PlatformSources = {
  platform: string
  env: Record<string, string | undefined>
  /** Ya en minúsculas, o `undefined` si no se pudo leer. */
  readProcVersionSync: () => string | undefined
  readProcVersion: () => Promise<string>
  osRelease: () => string
  readOsRelease: () => Promise<string>
}

export type LinuxDistroInfo = {
  linuxDistroId?: string
  linuxDistroVersion?: string
  linuxKernel?: string
}

function kernelSaysWsl(kernel: string): boolean {
  return kernel.includes('microsoft') || kernel.includes('wsl')
}

/**
 * Puerto de la clase `S` de 2.1.283 (`chunk-fmsbxtrp.js`). `/proc/version`
 * se lee una sola vez (`kernelString`) y sirve a `getPlatform` y a
 * `getWslVersion`. `prime()` lo lee de forma asíncrona al arrancar y anula lo
 * ya decidido; la lectura síncrona queda para quien pregunte antes.
 */
export class PlatformDetector {
  private primedProcVersion: string | undefined
  private fallbackProcVersion: string | undefined
  private fallbackProcVersionRead = false
  private platform: Platform | undefined
  private wslVersion: string | undefined | null = null
  private macOSMajorVersion: number | undefined | null = null
  private linuxDistroInfo: Promise<LinuxDistroInfo | undefined> | undefined

  constructor(private readonly sources: PlatformSources) {}

  private kernelString(): string | undefined {
    if (this.primedProcVersion !== undefined) return this.primedProcVersion
    if (!this.fallbackProcVersionRead) {
      this.fallbackProcVersion = this.sources.readProcVersionSync()
      this.fallbackProcVersionRead = true
    }
    return this.fallbackProcVersion
  }

  getPlatform(): Platform {
    if (this.platform !== undefined) return this.platform
    try {
      if (this.sources.platform === 'darwin') this.platform = 'macos'
      else if (this.sources.platform === 'win32') this.platform = 'windows'
      else if (this.sources.platform === 'linux') {
        // Las variables que WSL exporta deciden antes que `/proc/version`.
        if (this.sources.env.WSL_DISTRO_NAME || this.sources.env.WSL_INTEROP) {
          this.platform = 'wsl'
        } else {
          const kernel = this.kernelString()
          this.platform = kernel !== undefined && kernelSaysWsl(kernel) ? 'wsl' : 'linux'
        }
      } else this.platform = 'unknown'
    } catch (error) {
      requireLocalObservabilityLogging().logError(error)
      this.platform = 'unknown'
    }
    return this.platform
  }

  getWslVersion(): string | undefined {
    if (this.wslVersion !== null) return this.wslVersion
    if (this.sources.platform !== 'linux') {
      this.wslVersion = undefined
      return undefined
    }
    const kernel = this.kernelString()
    if (kernel === undefined) {
      this.wslVersion = undefined
      return undefined
    }
    // Marcador explícito (p. ej. "wsl2"); si sólo dice "microsoft", WSL1
    // (el formato original: "4.4.0-19041-Microsoft").
    const match = kernel.match(/wsl(\d+)/)
    if (match && match[1]) this.wslVersion = match[1]
    else if (kernel.includes('microsoft')) this.wslVersion = '1'
    else this.wslVersion = undefined
    return this.wslVersion
  }

  getMacOSMajorVersion(): number | undefined {
    if (this.macOSMajorVersion !== null) return this.macOSMajorVersion
    if (this.sources.platform !== 'darwin') {
      this.macOSMajorVersion = undefined
      return undefined
    }
    // Darwin N corresponde a macOS N - 9 (Darwin 23 → macOS 14).
    const match = this.sources.osRelease().match(/^(\d+)\./)
    this.macOSMajorVersion = match && match[1] ? parseInt(match[1], 10) - 9 : undefined
    return this.macOSMajorVersion
  }

  getLinuxDistroInfo(): Promise<LinuxDistroInfo | undefined> {
    return (this.linuxDistroInfo ??= this.readLinuxDistroInfo())
  }

  private async readLinuxDistroInfo(): Promise<LinuxDistroInfo | undefined> {
    if (this.sources.platform !== 'linux') return undefined
    const result: LinuxDistroInfo = { linuxKernel: this.sources.osRelease() }
    try {
      const content = await this.sources.readOsRelease()
      for (const line of content.split('\n')) {
        const match = line.match(/^(ID|VERSION_ID)=(.*)$/)
        if (match && match[1] && match[2]) {
          const value = match[2].replace(/^"|"$/g, '')
          if (match[1] === 'ID') result.linuxDistroId = value
          else result.linuxDistroVersion = value
        }
      }
    } catch {
      // /etc/os-release puede no existir en todos los sistemas Linux.
    }
    return result
  }

  async prime(): Promise<void> {
    if (this.primedProcVersion !== undefined || this.sources.platform !== 'linux') return
    try {
      this.primedProcVersion = (await this.sources.readProcVersion()).toLowerCase()
    } catch (error) {
      requireLocalObservabilityDebug().logForDebugging(
        `Failed to read /proc/version for WSL detection: ${error}`,
        { level: 'error' },
      )
      return
    }
    this.platform = undefined
    this.wslVersion = null
  }
}

function readProcVersionSync(): string | undefined {
  try {
    return requireStorageFsOperations()
      .getFsImplementation()
      .readFileSync('/proc/version', { encoding: 'utf8' })
      .toLowerCase()
  } catch {
    return undefined
  }
}

let detector: PlatformDetector | undefined

/** El único detector del proceso, como `p()` en la fuente. */
export function getPlatformDetector(): PlatformDetector {
  return (detector ??= new PlatformDetector({
    platform: process.platform,
    env: process.env,
    readProcVersionSync,
    readProcVersion: () => readFile('/proc/version', { encoding: 'utf8' }),
    osRelease,
    readOsRelease: () => readFile('/etc/os-release', 'utf8'),
  }))
}

/** Sólo para pruebas: el siguiente acceso vuelve a leer `process` y el disco. */
export function resetPlatformDetectorForTesting(): void {
  detector = undefined
}

export function getPlatform(): Platform {
  return getPlatformDetector().getPlatform()
}

export function getWslVersion(): string | undefined {
  return getPlatformDetector().getWslVersion()
}

export function getMacOSMajorVersion(): number | undefined {
  return getPlatformDetector().getMacOSMajorVersion()
}

export function getLinuxDistroInfo(): Promise<LinuxDistroInfo | undefined> {
  return getPlatformDetector().getLinuxDistroInfo()
}

/** Lo que `init()` corre al arrancar (`pBo` en la fuente). */
export function primePlatform(): Promise<void> {
  return getPlatformDetector().prime()
}

const VCS_MARKERS: Array<[string, string]> = [
  ['.git', 'git'],
  ['.hg', 'mercurial'],
  ['.svn', 'svn'],
  ['.p4config', 'perforce'],
  ['$tf', 'tfs'],
  ['.tfvc', 'tfs'],
  ['.jj', 'jujutsu'],
  ['.sl', 'sapling'],
]

export async function detectVcs(dir?: string): Promise<string[]> {
  const detected = new Set<string>()

  // Comprueba Perforce vía variable de entorno.
  if (process.env.P4PORT) {
    detected.add('perforce')
  }

  try {
    const targetDir = dir ?? requireStorageFsOperations().getFsImplementation().cwd()
    const entries = new Set(await readdir(targetDir))
    for (const [marker, vcs] of VCS_MARKERS) {
      if (entries.has(marker)) {
        detected.add(vcs)
      }
    }
  } catch {
    // El directorio puede no ser legible.
  }

  return [...detected]
}
