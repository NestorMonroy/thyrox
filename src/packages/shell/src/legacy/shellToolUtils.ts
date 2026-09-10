/**
 * Porte fiel de `ccnmt: packages/shell/src/legacy/shellToolUtils.ts`.
 *
 * Versión pre-DI de `../providers/shellToolUtils.ts` (mismo hermano):
 * la fuente importa `BASH_TOOL_NAME`/`POWERSHELL_TOOL_NAME` de
 * `tool-registry` en vez de declararlos localmente. Ese paquete no
 * existe en este árbol (mismo caso que `../providers/shellToolUtils.ts`
 * — ver su docstring), así que aquí también se declaran localmente con
 * los mismos valores conocidos y estables (`'Bash'`/`'PowerShell'`).
 *
 * Porte COMPLETO: los dos símbolos exportados de la fuente están
 * presentes.
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
 * `CLAUDE_CODE_USE_POWERSHELL_TOOL=0`); ccb es el build first-party y
 * trata a PowerShell como shell de primera clase junto a Bash.
 *
 * Lo usan `tools.ts` (visibilidad en la lista de tools),
 * `processBashCommand` (ruteo de `!`), y `promptShellExecution` (ruteo
 * de frontmatter de skill), para que el gate sea consistente en todos
 * los caminos que invocan `PowerShellTool.call()`.
 */
export function isPowerShellToolEnabled(): boolean {
  if (getPlatform() !== 'windows') return false
  return !requireConfigEnvUtils().isEnvDefinedFalsy(
    process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL,
  )
}
