/**
 * Puerto de `ccnmt: packages/config/wslWindowsSettings.ts` (140 líneas
 * fuente). Reimplementación fiel VERBATIM. Sin dependencias.
 *
 * El literal `/etc/claude-code-how-works-how-works/managed-settings.json` de
 * un comentario proviene tal cual de la fuente — mismo caso que
 * `managedPath.ts` y `product.ts` de este mismo pase; ver su nota.
 */
import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const HKLM_KEY = 'HKLM\\SOFTWARE\\Policies\\ClaudeCode'
const HKCU_KEY = 'HKCU\\SOFTWARE\\Policies\\ClaudeCode'
const HKLM_MANAGED_SETTINGS_PATH =
  '/mnt/c/Program Files/ClaudeCode/managed-settings.json'

/**
 * `E6_()` de ant — hoy fijo en falso en v2.1.136. Cuando ant reactive esto,
 * sustituir `WSL_CHAIN_ENABLED` por el check en vivo (probablemente
 * `isRunningInWsl()` u otra feature gate). El resto de este módulo es la
 * implementación que se vuelve activa.
 *
 * Historia: ant 2.1.131 tenía esto devolviendo `isRunningInWsl()`; en
 * 2.1.136 el cuerpo de la función se volvió `return !1` (un falso fijo). El
 * cambio deshabilitó la cadena WSL a la espera de un mecanismo de
 * subproceso más confiable (las consultas a reg.exe y las lecturas de
 * DrvFs estaban dando timeout en Win11 24H2 / WSL2 sin un modo de fallo
 * consistente).
 */
const WSL_CHAIN_ENABLED = false

function isWslChainEnabled(): boolean {
  // `E6_()` de ant: fijo en falso en v2.1.136. Se conserva la forma de la
  // función para que reactivarla en el futuro sea un cambio de constante.
  return WSL_CHAIN_ENABLED
}

function isRunningInWsl(): boolean {
  if (process.env.WSL_DISTRO_NAME) return true
  try {
    const ver = readFileSync('/proc/version', 'utf-8').toLowerCase()
    return ver.includes('microsoft') || ver.includes('wsl')
  } catch {
    return false
  }
}

async function readRegKeyValue(
  key: string,
  valueName: string,
): Promise<string | undefined> {
  // Usa cmd.exe vía interop DrvFs. WSL trae /mnt/c/Windows/System32 por defecto.
  try {
    const { stdout } = await execFileAsync(
      '/mnt/c/Windows/System32/reg.exe',
      ['query', key, '/v', valueName],
      { timeout: 5000 },
    )
    // Formato: "    valueName    REG_SZ    value"
    const match = new RegExp(
      `${valueName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+REG_[A-Z_]+\\s+(.+)`,
    ).exec(stdout)
    return match?.[1]?.trim()
  } catch {
    return undefined
  }
}

async function readWslInheritsFlag(key: string): Promise<boolean> {
  const raw = await readRegKeyValue(key, 'wslInheritsWindowsSettings')
  if (!raw) return false
  return /^(1|true)$/i.test(raw)
}

/**
 * Devuelve los settings de la cadena de política de Windows a superponer
 * sobre los managed-settings de Linux, o `null` cuando:
 *   - la feature de cadena WSL está deshabilitada (`E6_()` de ant === false)
 *   - no se ejecuta en WSL
 *   - `wslInheritsWindowsSettings` de la fuente admin no es `true`
 *   - `wslInheritsWindowsSettings` de HKCU no es `true` (opt-in de usuario)
 *
 * El corte temprano en `isWslChainEnabled()` refleja el guard
 * `if(!E6_()) return null;` de ant al inicio de cada sitio de lectura —
 * mantiene la función invocable pero rápidamente deshabilitada.
 */
export async function getWslInheritedWindowsSettings(): Promise<
  Record<string, unknown> | null
> {
  // Corte temprano `E6_() => false` de ant. Se conserva el resto del cuerpo
  // intacto para que la futura reactivación sea un cambio de una línea.
  if (!isWslChainEnabled()) return null
  if (!isRunningInWsl()) return null
  // Chequeo de fuente admin: el archivo O HKLM deben declarar el flag.
  let fileSettings: Record<string, unknown> | undefined
  if (existsSync(HKLM_MANAGED_SETTINGS_PATH)) {
    try {
      const raw = readFileSync(HKLM_MANAGED_SETTINGS_PATH, 'utf-8')
      fileSettings = JSON.parse(raw) as Record<string, unknown>
    } catch {
      // archivo admin malformado — sigue al chequeo de HKLM
    }
  }
  const fileFlag =
    fileSettings &&
    (fileSettings as { wslInheritsWindowsSettings?: boolean })
      .wslInheritsWindowsSettings === true
  const hklmFlag = await readWslInheritsFlag(HKLM_KEY)
  if (!fileFlag && !hklmFlag) return null

  // Opt-in de usuario: HKCU también debe tener el flag.
  const hkcuFlag = await readWslInheritsFlag(HKCU_KEY)
  if (!hkcuFlag) return null

  // Quita `wslInheritsWindowsSettings` del payload fusionado — el flag es
  // metadata sobre si aplicar la cadena, no un setting que deba propagarse
  // al `managedSettings` en vivo. `nAq` de ant hace la misma
  // desestructuración-y-recorte.
  const merged: Record<string, unknown> = {}
  if (fileSettings) {
    const { wslInheritsWindowsSettings: _strip, ...rest } = fileSettings
    void _strip
    Object.assign(merged, rest)
  }
  return merged
}
