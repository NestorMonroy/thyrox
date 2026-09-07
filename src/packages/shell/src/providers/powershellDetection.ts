/**
 * Porte fiel de
 * `ccnmt: packages/shell/src/providers/powershellDetection.ts`.
 *
 * Porte COMPLETO: los cinco símbolos exportados de la fuente están
 * presentes (`findPowerShell`, `getCachedPowerShellPath`,
 * `PowerShellEdition`, `getPowerShellEdition`, `resetPowerShellCache`).
 *
 * @module
 */
import { realpath, stat } from 'node:fs/promises'
import { getPlatform } from '@thyrox/config/platform'
import { which } from '../which.js'

async function probePath(p: string): Promise<string | null> {
  try {
    return (await stat(p)).isFile() ? p : null
  } catch {
    return null
  }
}

/**
 * Intenta encontrar PowerShell en el sistema vía PATH. Prefiere `pwsh`
 * (PowerShell Core 7+), y cae a `powershell` (5.1).
 *
 * En Linux, si PATH resuelve a un lanzador de snap (/snap/…) —
 * directamente o vía una cadena de symlinks como
 * /usr/bin/pwsh → /snap/bin/pwsh — se sondean ubicaciones de instalación
 * apt/rpm conocidas en su lugar: el lanzador de snap puede colgarse en
 * subprocesos mientras snapd inicializa el confinamiento, pero el
 * binario real en /opt/microsoft/powershell/7/pwsh es confiable. En
 * Windows/macOS, PATH basta.
 */
export async function findPowerShell(
  _signal?: AbortSignal,
): Promise<string | null> {
  const pwshPath = await which('pwsh')
  if (pwshPath) {
    // El lanzador de snap se cuelga en subprocesos. Se prefiere el
    // binario directo. Se comprueban tanto la entrada de PATH resuelta
    // como su destino de symlink: en algunas distros /usr/bin/pwsh es un
    // symlink a /snap/bin/pwsh, que evadiría un `startsWith('/snap/')`
    // ingenuo sobre el resultado de `which()`.
    if (getPlatform() === 'linux') {
      const resolved = await realpath(pwshPath).catch(() => pwshPath)
      if (pwshPath.startsWith('/snap/') || resolved.startsWith('/snap/')) {
        const direct =
          (await probePath('/opt/microsoft/powershell/7/pwsh')) ??
          (await probePath('/usr/bin/pwsh'))
        if (direct) {
          const directResolved = await realpath(direct).catch(() => direct)
          if (
            !direct.startsWith('/snap/') &&
            !directResolved.startsWith('/snap/')
          ) {
            return direct
          }
        }
      }
    }
    return pwshPath
  }

  const powershellPath = await which('powershell')
  if (powershellPath) {
    return powershellPath
  }

  return null
}

let cachedPowerShellPath: Promise<string | null> | null = null

/**
 * Devuelve la ruta de PowerShell cacheada. Promesa memoizada que resuelve
 * a la ruta del ejecutable de PowerShell o `null`.
 */
export function getCachedPowerShellPath(): Promise<string | null> {
  if (!cachedPowerShellPath) {
    cachedPowerShellPath = findPowerShell()
  }
  return cachedPowerShellPath
}

export type PowerShellEdition = 'core' | 'desktop'

/**
 * Infiere la edición de PowerShell a partir del nombre del binario, sin
 * lanzarlo.
 * - `pwsh` / `pwsh.exe` → 'core' (PowerShell 7+: soporta `&&`, `||`,
 *   `?:`, `??`)
 * - `powershell` / `powershell.exe` → 'desktop' (Windows PowerShell 5.1:
 *   sin operadores de encadenamiento de pipeline, bug de
 *   stderr-establece-`$?`, codificación UTF-16 por defecto)
 *
 * PowerShell 6 (también `pwsh`, sin `&&`) lleva EOL desde 2020 y no es un
 * objetivo de instalación realista, así que 'core' implica con
 * seguridad la semántica 7+.
 *
 * Lo usa el prompt del tool para dar guía de sintaxis adecuada a la
 * versión, para que el modelo no emita `cmd1 && cmd2` en 5.1 (error de
 * parseo) ni evite `&&` en 7+, donde es el operador correcto de
 * cortocircuito.
 */
export async function getPowerShellEdition(
  _signal?: AbortSignal,
): Promise<PowerShellEdition | null> {
  const p = await getCachedPowerShellPath()
  if (!p) return null
  // basename sin extensión, sin distinguir mayúsculas. Cubre:
  //   C:\Program Files\PowerShell\7\pwsh.exe
  //   /opt/microsoft/powershell/7/pwsh
  //   C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
  const base = p
    .split(/[/\\]/)
    .pop()!
    .toLowerCase()
    .replace(/\.exe$/, '')
  return base === 'pwsh' ? 'core' : 'desktop'
}

/**
 * Resetea la caché de la ruta de PowerShell. Sólo para tests.
 */
export function resetPowerShellCache(): void {
  cachedPowerShellPath = null
}
