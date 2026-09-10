/**
 * Porte fiel de
 * `ccnmt: packages/shell/src/providers/resolveDefaultShell.ts`.
 *
 * Resuelve el shell por defecto para los comandos `!` de la caja de
 * entrada.
 *
 * Orden de resolución (docs/design/ps-shell-selection.md §4.2):
 *   settings.defaultShell → 'bash'
 *
 * El default de plataforma es 'bash' en todas partes — NO se voltea
 * automáticamente Windows a PowerShell (rompería a usuarios existentes
 * de Windows con hooks de bash).
 *
 * Porte COMPLETO: los dos símbolos exportados de la fuente están
 * presentes, con el mismo punto de inyección por función (`settings`
 * se recibe vía `setGetSettingsFn`, no por import directo de
 * `@thyrox/config/settings` — mismo patrón DI que el resto del
 * paquete).
 *
 * @module
 */

type SettingsLike = { defaultShell?: 'bash' | 'powershell' }

let _getSettings: () => SettingsLike = () => ({})

export function setGetSettingsFn(fn: () => SettingsLike): void {
  _getSettings = fn
}

export function resolveDefaultShell(): 'bash' | 'powershell' {
  return _getSettings().defaultShell ?? 'bash'
}
