/**
 * Porte fiel de
 * `ccnmt: packages/shell/src/legacy/resolveDefaultShell.ts`.
 *
 * Versión pre-DI de `../providers/resolveDefaultShell.ts` (mismo
 * hermano, otra generación): en vez de recibir el valor de settings por
 * inyección (`setGetSettingsFn`), importa `getInitialSettings`
 * directamente de `@thyrox/config/settings` — que SÍ existe y resuelve
 * en este árbol.
 *
 * Resuelve el shell por defecto para los comandos `!` de la caja de
 * entrada. Orden de resolución (docs/design/ps-shell-selection.md §4.2):
 * `settings.defaultShell` → `'bash'`. El default de plataforma es
 * `'bash'` en todas partes — no se voltea Windows a PowerShell
 * automáticamente.
 *
 * Porte COMPLETO: el único símbolo exportado de la fuente está
 * presente.
 *
 * @module
 */
import { getInitialSettings } from '@thyrox/config/settings'

export function resolveDefaultShell(): 'bash' | 'powershell' {
  const shell = getInitialSettings().defaultShell
  return shell === 'powershell' ? 'powershell' : 'bash'
}
