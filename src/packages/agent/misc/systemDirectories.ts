/**
 * Porte PARCIAL de `ccnmt: packages/agent/misc/systemDirectories.ts`.
 *
 * DIVERGENCIA DE ALCANCE, declarada. La fuente importa `getPlatform`
 * (con deteccion de WSL via `/proc/version`) de
 * `@claude-code-how-works/config/platform` y `logForDebugging` de
 * `@claude-code-how-works/local-observability/debug.js`. Ninguno de
 * los dos paquetes vive en este arbol, y el test de origen **siempre**
 * pasa `platform` explicito en `options`, asi que ninguna de las dos
 * rutas por defecto se ejercita.
 *
 * Se reimplementa aqui un `Platform` local identico (mismos cinco
 * valores) y un `getDefaultPlatform()` minimo — sin deteccion de WSL
 * via `/proc/version`, que exigiria portar el paquete `config`
 * entero para un camino que ningun test cubre — mas un logger de
 * depuracion trivial en vez de portar `local-observability`.
 */

import { join } from 'path'
import { homedir } from 'os'

export type Platform = 'macos' | 'windows' | 'wsl' | 'linux' | 'unknown'

/** Deteccion minima por `process.platform`. No distingue WSL de Linux
 *  (la fuente lo hace leyendo `/proc/version`) — ver la divergencia
 *  declarada arriba. */
function getDefaultPlatform(): Platform {
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'linux') return 'linux'
  return 'unknown'
}

/** Logger de depuracion trivial, en vez de portar `local-observability`. */
function logForDebugging(message: string): void {
  if (process.env.THYROX_DEBUG) console.error(message)
}

export type SystemDirectories = {
  HOME: string
  DESKTOP: string
  DOCUMENTS: string
  DOWNLOADS: string
  [key: string]: string // Firma de indice para compatibilidad con Record<string, string>
}

type EnvLike = Record<string, string | undefined>

type SystemDirectoriesOptions = {
  env?: EnvLike
  homedir?: string
  platform?: Platform
}

/**
 * Obtiene los directorios del sistema entre plataformas.
 * Maneja las diferencias entre Windows, macOS, Linux y WSL.
 * @param options anulaciones opcionales para pruebas (env, homedir, platform)
 */
export function getSystemDirectories(
  options?: SystemDirectoriesOptions,
): SystemDirectories {
  const platform = options?.platform ?? getDefaultPlatform()
  const homeDir = options?.homedir ?? homedir()
  const env = options?.env ?? process.env

  // Rutas por defecto usadas por la mayoria de las plataformas.
  const defaults: SystemDirectories = {
    HOME: homeDir,
    DESKTOP: join(homeDir, 'Desktop'),
    DOCUMENTS: join(homeDir, 'Documents'),
    DOWNLOADS: join(homeDir, 'Downloads'),
  }

  switch (platform) {
    case 'windows': {
      // Windows: usa USERPROFILE si esta disponible (maneja nombres de
      // carpeta localizados).
      const userProfile = env.USERPROFILE || homeDir
      return {
        HOME: homeDir,
        DESKTOP: join(userProfile, 'Desktop'),
        DOCUMENTS: join(userProfile, 'Documents'),
        DOWNLOADS: join(userProfile, 'Downloads'),
      }
    }

    case 'linux':
    case 'wsl': {
      // Linux/WSL: primero verifica la especificacion XDG Base Directory.
      return {
        HOME: homeDir,
        DESKTOP: env.XDG_DESKTOP_DIR || defaults.DESKTOP,
        DOCUMENTS: env.XDG_DOCUMENTS_DIR || defaults.DOCUMENTS,
        DOWNLOADS: env.XDG_DOWNLOAD_DIR || defaults.DOWNLOADS,
      }
    }

    case 'macos':
    default: {
      // macOS y plataformas desconocidas usan las rutas estandar.
      if (platform === 'unknown') {
        logForDebugging(`Plataforma desconocida detectada, usando rutas por defecto`)
      }
      return defaults
    }
  }
}
