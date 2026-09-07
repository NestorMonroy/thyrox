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
 * `memoize` — `lodash-es` no está instalado en este árbol; sustituto local
 * en `pendingCrossPackageDeps.ts` con el mismo contrato (llave = primer
 * argumento).
 */

import { readdir, readFile } from 'fs/promises'
import { release as osRelease } from 'os'
import {
  memoize,
  requireLocalObservabilityLogging,
  requireStorageFsOperations,
} from './internal/pendingCrossPackageDeps.js'

export type Platform = 'macos' | 'windows' | 'wsl' | 'linux' | 'unknown'

export const SUPPORTED_PLATFORMS: Platform[] = ['macos', 'wsl']

export const getPlatform = memoize((): Platform => {
  try {
    if (process.platform === 'darwin') {
      return 'macos'
    }

    if (process.platform === 'win32') {
      return 'windows'
    }

    if (process.platform === 'linux') {
      // Comprueba si corre en WSL (Windows Subsystem for Linux).
      try {
        const procVersion = requireStorageFsOperations()
          .getFsImplementation()
          .readFileSync('/proc/version', { encoding: 'utf8' })
        if (
          procVersion.toLowerCase().includes('microsoft') ||
          procVersion.toLowerCase().includes('wsl')
        ) {
          return 'wsl'
        }
      } catch (error) {
        // Error leyendo /proc/version — se asume Linux normal.
        requireLocalObservabilityLogging().logError(error)
      }

      // Linux normal.
      return 'linux'
    }

    // Plataforma desconocida.
    return 'unknown'
  } catch (error) {
    requireLocalObservabilityLogging().logError(error)
    return 'unknown'
  }
})

export const getWslVersion = memoize((): string | undefined => {
  // Sólo se comprueba WSL en sistemas Linux.
  if (process.platform !== 'linux') {
    return undefined
  }
  try {
    const procVersion = requireStorageFsOperations()
      .getFsImplementation()
      .readFileSync('/proc/version', { encoding: 'utf8' })

    // Primero busca marcadores explícitos de versión WSL (p. ej. "WSL2").
    const wslVersionMatch = procVersion.match(/WSL(\d+)/i)
    if (wslVersionMatch && wslVersionMatch[1]) {
      return wslVersionMatch[1]
    }

    // Sin marcador explícito pero con "microsoft" — se asume WSL1.
    // Cubre el formato original de WSL1: "4.4.0-19041-Microsoft".
    if (procVersion.toLowerCase().includes('microsoft')) {
      return '1'
    }

    // No es WSL o no se pudo determinar la versión.
    return undefined
  } catch (error) {
    requireLocalObservabilityLogging().logError(error)
    return undefined
  }
})

export type LinuxDistroInfo = {
  linuxDistroId?: string
  linuxDistroVersion?: string
  linuxKernel?: string
}

export const getLinuxDistroInfo = memoize(
  async (): Promise<LinuxDistroInfo | undefined> => {
    if (process.platform !== 'linux') {
      return undefined
    }

    const result: LinuxDistroInfo = {
      linuxKernel: osRelease(),
    }

    try {
      const content = await readFile('/etc/os-release', 'utf8')
      for (const line of content.split('\n')) {
        const match = line.match(/^(ID|VERSION_ID)=(.*)$/)
        if (match && match[1] && match[2]) {
          const value = match[2].replace(/^"|"$/g, '')
          if (match[1] === 'ID') {
            result.linuxDistroId = value
          } else {
            result.linuxDistroVersion = value
          }
        }
      }
    } catch {
      // /etc/os-release puede no existir en todos los sistemas Linux.
    }

    return result
  },
)

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
