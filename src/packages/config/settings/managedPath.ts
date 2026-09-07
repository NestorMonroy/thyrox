/**
 * Puerto de `ccnmt: packages/config/settings/managedPath.ts` (43 líneas
 * fuente). Reimplementación fiel VERBATIM.
 *
 * `lodash-es` resuelve en este árbol (dependencia real, verificado) — se
 * importa estático.
 *
 * El literal `/etc/claude-code-how-works-how-works` proviene tal cual de la
 * fuente (`ccnmt`) — es consistente con `remote/index.ts` de este mismo
 * paquete, ya portado por un agente anterior con el mismo literal. Se
 * conserva por fidelidad y por coherencia con lo ya comprometido; no se
 * investigó aquí si es o no un artefacto de sustitución de texto de la
 * fuente (ver el informe de esta tarea).
 */
import memoize from 'lodash-es/memoize.js'
import { join } from 'node:path'

// La fuente define su propio check de plataforma, estrecho, en vez de
// arrastrar `platform.ts` (que trae detección WSL + dependencias de fs que
// esta necesidad no requiere). El util completo de plataforma se queda en
// su ubicación actual para los call sites que sí necesitan discriminar WSL.
function getManagedSettingsPlatform(): 'macos' | 'windows' | 'other' {
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'win32') return 'windows'
  return 'other'
}

/**
 * Ruta al directorio de settings administrados, según la plataforma
 * actual.
 */
export const getManagedFilePath = memoize(function (): string {
  // Permite override para testing/demos (sólo ant, eliminado en builds externos).
  if (
    process.env.USER_TYPE === 'ant' &&
    process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH
  ) {
    return process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH
  }

  switch (getManagedSettingsPlatform()) {
    case 'macos':
      return '/Library/Application Support/ClaudeCode'
    case 'windows':
      return 'C:\\Program Files\\ClaudeCode'
    default:
      return '/etc/claude-code-how-works-how-works'
  }
})

/**
 * Ruta al directorio drop-in `managed-settings.d/`. `managed-settings.json`
 * se fusiona primero (base), y luego los archivos de este directorio se
 * fusionan alfabéticamente por encima (los drop-in sobreescriben la base,
 * gana el archivo posterior).
 */
export const getManagedSettingsDropInDir = memoize(function (): string {
  return join(getManagedFilePath(), 'managed-settings.d')
})
