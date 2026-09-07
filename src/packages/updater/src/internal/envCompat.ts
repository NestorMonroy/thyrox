/**
 * Puerto local de piezas puntuales de
 * `ccnmt: packages/config/env/paths.ts` y `ccnmt: packages/config/bundledMode.ts`.
 * Ninguno de los dos archivos existe en `@thyrox/config` (medido: `find
 * src/packages/config -iname 'paths.ts' -o -iname 'bundledMode.ts'` → 0
 * archivos). `autoUpdater.ts` sólo necesita tres símbolos de esos dos
 * módulos; se reimplementan aquí, dentro de las rutas de este agente,
 * verbatim contra la fuente donde el mecanismo lo permite:
 *
 *   - `isRunningWithBun()` — `ccnmt: packages/config/bundledMode.ts:7-10`,
 *     verbatim (`process.versions.bun !== undefined`).
 *   - `isNpmFromWindowsPath()` — `ccnmt: packages/config/env/paths.ts:90-106`,
 *     con DOS divergencias: `isWslEnvironment()` se sustituye por
 *     `getPlatform() === 'wsl'` de `@thyrox/config/platform.ts` (que ya
 *     porta la misma detección — ver su docstring), y `findExecutable`
 *     se sustituye por `which()` de `@thyrox/shell/which.js` (misma
 *     idea: resuelve la ruta real del ejecutable).
 *   - `getClaudeConfigHomeDir()` — el `config/env/utils.ts` de este árbol
 *     es un porte PARCIAL DECLARADO que no lo incluye (ver su propio
 *     docstring). Se reimplementa verbatim contra
 *     `ccnmt: packages/config/env/utils.ts`.
 */

import { homedir } from 'os'
import { join } from 'path'
import memoize from 'lodash-es/memoize.js'
import { getPlatform } from '@thyrox/config/platform'
import { which } from '@thyrox/shell/which.js'

export function isRunningWithBun(): boolean {
  return process.versions.bun !== undefined
}

let _npmFromWindowsPathCache: boolean | undefined

export async function isNpmFromWindowsPath(): Promise<boolean> {
  if (_npmFromWindowsPathCache !== undefined) {
    return _npmFromWindowsPathCache
  }
  try {
    // Solo es relevante en entorno WSL
    if (getPlatform() !== 'wsl') {
      _npmFromWindowsPathCache = false
      return false
    }

    // Encuentra la ruta real del ejecutable npm
    const cmd = await which('npm')

    // Si npm esta en la ruta de Windows, empezara con /mnt/c/
    _npmFromWindowsPathCache = cmd?.startsWith('/mnt/c/') ?? false
    return _npmFromWindowsPathCache
  } catch {
    // Si hay un error, se asume que no es de Windows
    _npmFromWindowsPathCache = false
    return false
  }
}

export const getClaudeConfigHomeDir = memoize(
  (): string => {
    return (
      process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
    ).normalize('NFC')
  },
  () => process.env.CLAUDE_CONFIG_DIR,
)
