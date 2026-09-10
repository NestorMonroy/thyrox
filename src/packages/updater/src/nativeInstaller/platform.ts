/**
 * Puerto de `ccnmt: packages/updater/src/nativeInstaller/platform.ts`
 * (34 líneas fuente, 100% portado). Módulo hoja: detección de plataforma
 * compartida entre `installer.ts` y `download.ts`. Extraído en la fuente
 * para romper el ciclo installer ↔ download.
 *
 * Divergencia declarada: la fuente lee `env.platform` de
 * `@claude-code-how-works/config/env/paths.ts` — ese archivo NO está
 * portado en `@thyrox/config` (su propio barrel `env/index.ts` lo
 * declara explícitamente fuera de alcance, ver su docstring). Se
 * reimplementa localmente la única línea que se necesitaba de `env`
 * (`process.platform` normalizado a `'win32'|'darwin'|'linux'`), con el
 * mismo criterio verbatim de la fuente — no se importa el módulo entero
 * por una constante de una línea.
 */

import { envDynamic } from '@thyrox/config/env/dynamic'
import { logForDebugging } from '@thyrox/local-observability/debug.js'

function _osPlatform(): 'win32' | 'darwin' | 'linux' {
  return process.platform === 'win32' || process.platform === 'darwin'
    ? process.platform
    : 'linux'
}

export function getPlatform(): string {
  const os = _osPlatform()

  const arch =
    process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'arm64' : null

  if (!arch) {
    const error = new Error(`Unsupported architecture: ${process.arch}`)
    logForDebugging(
      `Native installer does not support architecture: ${process.arch}`,
      { level: 'error' },
    )
    throw error
  }

  if (os === 'linux' && envDynamic.isMuslEnvironment()) {
    return `linux-${arch}-musl`
  }

  return `${os}-${arch}`
}

export function getBinaryName(platform: string): string {
  return platform.startsWith('win32') ? 'ccb.exe' : 'ccb'
}
