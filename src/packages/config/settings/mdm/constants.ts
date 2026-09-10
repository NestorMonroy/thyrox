/**
 * Puerto de `ccnmt: packages/config/settings/mdm/constants.ts` (81 líneas
 * fuente). Reimplementación fiel VERBATIM.
 *
 * Constantes compartidas y constructores de ruta para los módulos de
 * settings MDM. Este módulo tiene CERO imports pesados (sólo `os`) — seguro
 * de usar desde `rawRead.ts`. Tanto `rawRead.ts` como `settings.ts` (mdm)
 * importan de aquí para evitar duplicación.
 */

import { homedir, userInfo } from 'node:os'
import { join } from 'node:path'

/** Dominio de preferencia de macOS para perfiles MDM de Claude Code. */
const MACOS_PREFERENCE_DOMAIN = 'com.anthropic.claudecode'

/**
 * Rutas de registro de Windows para políticas MDM de Claude Code.
 *
 * Estas claves viven bajo SOFTWARE\Policies, que está en la lista de
 * claves compartidas WOW64 — tanto procesos de 32-bit como de 64-bit ven
 * los mismos valores sin redirección. No mover estas claves a
 * SOFTWARE\ClaudeCode, porque SOFTWARE está redirigida y los procesos de
 * 32-bit leerían silenciosamente desde WOW6432Node.
 * Ver: https://learn.microsoft.com/en-us/windows/win32/winprog64/shared-registry-keys
 */
export const WINDOWS_REGISTRY_KEY_PATH_HKLM =
  'HKLM\\SOFTWARE\\Policies\\ClaudeCode'
export const WINDOWS_REGISTRY_KEY_PATH_HKCU =
  'HKCU\\SOFTWARE\\Policies\\ClaudeCode'

/** Nombre del valor de registro de Windows que contiene el blob JSON de settings. */
export const WINDOWS_REGISTRY_VALUE_NAME = 'Settings'

/** Ruta al binario plutil de macOS. */
export const PLUTIL_PATH = '/usr/bin/plutil'

/** Argumentos para que plutil convierta plist a JSON por stdout (se añade la ruta del plist). */
export const PLUTIL_ARGS_PREFIX = ['-convert', 'json', '-o', '-', '--'] as const

/** Timeout de subproceso en milisegundos. */
export const MDM_SUBPROCESS_TIMEOUT_MS = 5000

/**
 * Construye la lista de rutas de plist de macOS en orden de prioridad (la
 * de mayor prioridad primero). Evalúa `process.env.USER_TYPE` al momento de
 * la llamada, para que las rutas sólo-ant se incluyan sólo cuando
 * corresponda.
 */
export function getMacOSPlistPaths(): Array<{ path: string; label: string }> {
  let username = ''
  try {
    username = userInfo().username
  } catch {
    // ignorar
  }

  const paths: Array<{ path: string; label: string }> = []

  if (username) {
    paths.push({
      path: `/Library/Managed Preferences/${username}/${MACOS_PREFERENCE_DOMAIN}.plist`,
      label: 'per-user managed preferences',
    })
  }

  paths.push({
    path: `/Library/Managed Preferences/${MACOS_PREFERENCE_DOMAIN}.plist`,
    label: 'device-level managed preferences',
  })

  // Permite preferencias escribibles por el usuario para testing local de MDM, sólo en builds de ant.
  if (process.env.USER_TYPE === 'ant') {
    paths.push({
      path: join(
        homedir(),
        'Library',
        'Preferences',
        `${MACOS_PREFERENCE_DOMAIN}.plist`,
      ),
      label: 'user preferences (ant-only)',
    })
  }

  return paths
}
