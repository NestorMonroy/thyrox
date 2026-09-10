/**
 * Deteccion de gestor de paquetes para el CLI de Claude
 *
 * Puerto de `ccnmt: packages/updater/src/nativeInstaller/packageManagers.ts`
 * (357 líneas fuente, 100% portado). Divergencia declarada: `getPlatform`
 * aquí NO es el de `./platform.ts` (que devuelve `linux-x64`, etc. para
 * el instalador nativo) sino el de `@claude-code-how-works/config/platform`
 * en la fuente — que en este árbol SÍ está portado como
 * `@thyrox/config/platform.ts` con la misma forma
 * (`'macos'|'windows'|'wsl'|'linux'|'unknown'`, verificado contra su
 * `export type Platform` y `export const getPlatform`).
 */

import { readFile } from 'fs/promises'
import memoize from 'lodash-es/memoize.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { execFileNoThrow } from '@thyrox/shell/execFileNoThrow.js'
import { getPlatform } from '@thyrox/config/platform'

export type PackageManager =
  | 'homebrew'
  | 'winget'
  | 'pacman'
  | 'deb'
  | 'rpm'
  | 'apk'
  | 'mise'
  | 'asdf'
  | 'unknown'

/**
 * Parsea /etc/os-release para extraer los campos ID e ID_LIKE. ID_LIKE
 * identifica la familia de la distro (p.ej. Ubuntu tiene
 * ID_LIKE=debian), permitiendo saltarse execs de gestor de paquetes en
 * distros que no pueden tenerlos. Devuelve null si el archivo no es
 * legible (sistemas pre-systemd o no estandar); los llamadores caen al
 * exec en ese caso como fallback conservador.
 */
export const getOsRelease = memoize(
  async (): Promise<{ id: string; idLike: string[] } | null> => {
    try {
      const content = await readFile('/etc/os-release', 'utf8')
      const idMatch = content.match(/^ID=["']?(\S+?)["']?\s*$/m)
      const idLikeMatch = content.match(/^ID_LIKE=["']?(.+?)["']?\s*$/m)
      return {
        id: idMatch?.[1] ?? '',
        idLike: idLikeMatch?.[1]?.split(' ') ?? [],
      }
    } catch {
      return null
    }
  },
)

function isDistroFamily(
  osRelease: { id: string; idLike: string[] },
  families: string[],
): boolean {
  return (
    families.includes(osRelease.id) ||
    osRelease.idLike.some(like => families.includes(like))
  )
}

/**
 * Detecta si la instancia de Claude en ejecucion se instalo via mise
 * (un gestor de versiones de herramientas poliglota) chequeando si la
 * ruta del ejecutable esta dentro de un directorio de installs de mise.
 *
 * mise instala en: ~/.local/share/mise/installs/<tool>/<version>/
 */
export function detectMise(): boolean {
  const execPath = process.execPath || process.argv[0] || ''

  // Chequea si el ejecutable esta dentro de un directorio de installs de mise
  if (/[/\\]mise[/\\]installs[/\\]/i.test(execPath)) {
    logForDebugging(`Detected mise installation: ${execPath}`)
    return true
  }

  return false
}

/**
 * Detecta si la instancia de Claude en ejecucion se instalo via asdf
 * (otro gestor de versiones de herramientas poliglota) chequeando si la
 * ruta del ejecutable esta dentro de un directorio de installs de asdf.
 *
 * asdf instala en: ~/.asdf/installs/<tool>/<version>/
 */
export function detectAsdf(): boolean {
  const execPath = process.execPath || process.argv[0] || ''

  // Chequea si el ejecutable esta dentro de un directorio de installs de asdf
  if (/[/\\]\.?asdf[/\\]installs[/\\]/i.test(execPath)) {
    logForDebugging(`Detected asdf installation: ${execPath}`)
    return true
  }

  return false
}

/**
 * Detecta si la instancia de Claude en ejecucion se instalo via Homebrew
 * chequeando si la ruta del ejecutable esta dentro de un directorio
 * Caskroom de Homebrew.
 *
 * Nota: se chequea especificamente Caskroom porque npm tambien puede
 * instalarse via Homebrew, lo que pondria paquetes globales de npm bajo
 * el mismo prefijo de Homebrew (p.ej. /opt/homebrew/lib/node_modules).
 * Hay que distinguir entre:
 * - Homebrew cask: /opt/homebrew/Caskroom/claude-code-how-works-how-works/...
 * - npm-global (via el npm de Homebrew): /opt/homebrew/lib/node_modules/@anthropic-ai/...
 */
export function detectHomebrew(): boolean {
  const platform = getPlatform()

  // Homebrew es solo para macOS y Linux
  if (platform !== 'macos' && platform !== 'linux' && platform !== 'wsl') {
    return false
  }

  // Obtiene la ruta del ejecutable actualmente en ejecucion
  const execPath = process.execPath || process.argv[0] || ''

  // Chequea si el ejecutable esta dentro de un directorio Caskroom de
  // Homebrew. Especifico de instalaciones cask de Homebrew
  if (execPath.includes('/Caskroom/')) {
    logForDebugging(`Detected Homebrew cask installation: ${execPath}`)
    return true
  }

  return false
}

/**
 * Puerto de ant v2.1.136 `Vw_` (3481.js). Extrae el nombre del cask de
 * Homebrew (p.ej. `claude-code-how-works-how-works` o
 * `claude-code-how-works-how-works@latest`) de la ruta Caskroom del
 * ejecutable en ejecucion. Devuelve null cuando el ejecutable no esta
 * dentro de un directorio Caskroom.
 *
 * Forma de la ruta: `/opt/homebrew/Caskroom/<cask-name>/<version>/...`
 *
 * Es la unica forma de distinguir entre usuarios que instalaron el cask
 * estable `claude-code-how-works-how-works` de los que instalaron
 * `claude-code-how-works-how-works@latest` (que sigue el canal
 * bleeding-edge). El auto-updater de gestor de paquetes usa el nombre de
 * la formula tanto para obtener la version correcta de
 * formulae.brew.sh COMO para construir el comando
 * `brew upgrade --cask <name>` correcto, ya que
 * `brew upgrade --cask claude-code-how-works-how-works` no tocara
 * `claude-code-how-works-how-works@latest`.
 */
export function detectBrewFormulaName(): string | null {
  const execPath = process.execPath || process.argv[0] || ''
  return execPath.match(/\/Caskroom\/([^/]+)\//)?.[1] ?? null
}

/**
 * Detecta si la instancia de Claude en ejecucion se instalo via winget
 * chequeando si la ruta del ejecutable esta dentro de un directorio de WinGet.
 *
 * winget instala en:
 * - Usuario: %LOCALAPPDATA%\Microsoft\WinGet\Packages
 * - Sistema: C:\Program Files\WinGet\Packages
 * Y crea links en: %LOCALAPPDATA%\Microsoft\WinGet\Links\
 */
export function detectWinget(): boolean {
  const platform = getPlatform()

  // Winget es solo para Windows
  if (platform !== 'windows') {
    return false
  }

  const execPath = process.execPath || process.argv[0] || ''

  // Chequea rutas de WinGet (maneja ambos tipos de barra)
  const wingetPatterns = [
    /Microsoft[/\\]WinGet[/\\]Packages/i,
    /Microsoft[/\\]WinGet[/\\]Links/i,
  ]

  for (const pattern of wingetPatterns) {
    if (pattern.test(execPath)) {
      logForDebugging(`Detected winget installation: ${execPath}`)
      return true
    }
  }

  return false
}

/**
 * Detecta si la instancia de Claude en ejecucion se instalo via pacman
 * consultando la base de datos de pacman por propiedad de archivo.
 *
 * Se gatea por la familia de distro Arch antes de invocar pacman. En
 * otras distros como Ubuntu/Debian, 'pacman' en PATH puede resolver al
 * juego pacman (/usr/games/pacman) en vez del gestor de paquetes de Arch.
 */
export const detectPacman = memoize(async (): Promise<boolean> => {
  const platform = getPlatform()

  if (platform !== 'linux') {
    return false
  }

  const osRelease = await getOsRelease()
  if (osRelease && !isDistroFamily(osRelease, ['arch'])) {
    return false
  }

  const execPath = process.execPath || process.argv[0] || ''

  const result = await execFileNoThrow('pacman', ['-Qo', execPath], {
    timeout: 5000,
    useCwd: false,
  })

  if (result.code === 0 && result.stdout) {
    logForDebugging(`Detected pacman installation: ${result.stdout.trim()}`)
    return true
  }

  return false
})

/**
 * Detecta si la instancia de Claude en ejecucion se instalo via un
 * paquete .deb consultando la base de datos de dpkg por propiedad de
 * archivo.
 *
 * Se usa `dpkg -S <execPath>` para chequear si el ejecutable pertenece a
 * un paquete gestionado por dpkg.
 */
export const detectDeb = memoize(async (): Promise<boolean> => {
  const platform = getPlatform()

  if (platform !== 'linux') {
    return false
  }

  const osRelease = await getOsRelease()
  if (osRelease && !isDistroFamily(osRelease, ['debian'])) {
    return false
  }

  const execPath = process.execPath || process.argv[0] || ''

  const result = await execFileNoThrow('dpkg', ['-S', execPath], {
    timeout: 5000,
    useCwd: false,
  })

  if (result.code === 0 && result.stdout) {
    logForDebugging(`Detected deb installation: ${result.stdout.trim()}`)
    return true
  }

  return false
})

/**
 * Detecta si la instancia de Claude en ejecucion se instalo via un
 * paquete RPM consultando la base de datos de RPM por propiedad de
 * archivo.
 *
 * Se usa `rpm -qf <execPath>` para chequear si el ejecutable pertenece a
 * un paquete RPM.
 */
export const detectRpm = memoize(async (): Promise<boolean> => {
  const platform = getPlatform()

  if (platform !== 'linux') {
    return false
  }

  const osRelease = await getOsRelease()
  if (osRelease && !isDistroFamily(osRelease, ['fedora', 'rhel', 'suse'])) {
    return false
  }

  const execPath = process.execPath || process.argv[0] || ''

  const result = await execFileNoThrow('rpm', ['-qf', execPath], {
    timeout: 5000,
    useCwd: false,
  })

  if (result.code === 0 && result.stdout) {
    logForDebugging(`Detected rpm installation: ${result.stdout.trim()}`)
    return true
  }

  return false
})

/**
 * Detecta si la instancia de Claude en ejecucion se instalo via Alpine
 * APK consultando la base de datos de apk por propiedad de archivo.
 *
 * Se usa `apk info --who-owns <execPath>` para chequear si el
 * ejecutable pertenece a un paquete gestionado por apk.
 */
export const detectApk = memoize(async (): Promise<boolean> => {
  const platform = getPlatform()

  if (platform !== 'linux') {
    return false
  }

  const osRelease = await getOsRelease()
  if (osRelease && !isDistroFamily(osRelease, ['alpine'])) {
    return false
  }

  const execPath = process.execPath || process.argv[0] || ''

  const result = await execFileNoThrow(
    'apk',
    ['info', '--who-owns', execPath],
    {
      timeout: 5000,
      useCwd: false,
    },
  )

  if (result.code === 0 && result.stdout) {
    logForDebugging(`Detected apk installation: ${result.stdout.trim()}`)
    return true
  }

  return false
})

/**
 * Funcion memoizada para detectar que gestor de paquetes instalo Claude.
 * Devuelve 'unknown' si no se detecta ningun gestor de paquetes
 */
export const getPackageManager = memoize(async (): Promise<PackageManager> => {
  if (detectHomebrew()) {
    return 'homebrew'
  }

  if (detectWinget()) {
    return 'winget'
  }

  if (detectMise()) {
    return 'mise'
  }

  if (detectAsdf()) {
    return 'asdf'
  }

  if (await detectPacman()) {
    return 'pacman'
  }

  if (await detectApk()) {
    return 'apk'
  }

  if (await detectDeb()) {
    return 'deb'
  }

  if (await detectRpm()) {
    return 'rpm'
  }

  return 'unknown'
})
