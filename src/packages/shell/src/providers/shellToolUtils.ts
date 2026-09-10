/**
 * Porte fiel de
 * `ccnmt: packages/shell/src/providers/shellToolUtils.ts`.
 *
 * Porte COMPLETO: los dos símbolos exportados de la fuente están
 * presentes (`SHELL_TOOL_NAMES`, `isPowerShellToolEnabled`).
 *
 * Divergencia medida: la fuente declara `BASH_TOOL_NAME`/
 * `POWERSHELL_TOOL_NAME` como constantes locales (`'Bash'`/`'PowerShell'`)
 * en vez de importarlas de `tool-registry` — igual que aquí, ese paquete
 * no existe en este árbol. `isEnvDefinedFalsy` se resuelve vía
 * `requireConfigEnvUtils()` de `../internal/pendingCrossPackageDeps.js`:
 * el archivo `@thyrox/config/env/utils.ts` SÍ existe, pero ese único
 * símbolo no está portado ahí todavía (ver el docstring del wrapper).
 *
 * @module
 */
import { getPlatform } from '@thyrox/config/platform'
import { requireConfigEnvUtils } from '../internal/pendingCrossPackageDeps.js'

const BASH_TOOL_NAME = 'Bash'
const POWERSHELL_TOOL_NAME = 'PowerShell'

export const SHELL_TOOL_NAMES: string[] = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME]

/**
 * Gate en tiempo de ejecución para PowerShellTool. Sólo Windows (el motor
 * de permisos usa normalizaciones de ruta específicas de Win32).
 * Habilitado por defecto en Windows (opt-out con
 * `CLAUDE_CODE_USE_POWERSHELL_TOOL=0`).
 *
 * Lo usan `tools.ts` (visibilidad en la lista de tools), el ruteo de `!`
 * de un comando de bash, y el ruteo de frontmatter de skill, para que el
 * gate sea consistente en todos los caminos que invocan
 * `PowerShellTool.call()`.
 */
export function isPowerShellToolEnabled(): boolean {
  if (getPlatform() !== 'windows') return false
  return !requireConfigEnvUtils().isEnvDefinedFalsy(
    process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL,
  )
}
