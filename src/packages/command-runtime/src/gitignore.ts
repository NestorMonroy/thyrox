/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/command-runtime/src/gitignore.ts`.
 *
 * La fuente exporta tres simbolos. Este archivo porta solo el que su test
 * ejercita:
 *
 *   - `getGlobalGitignorePath` — portado completo (`homedir` + `join`, sin
 *     dependencias externas al modulo).
 *
 * Quedan SIN portar, por divergencia de alcance declarada:
 *
 *   - `isPathGitignored` — depende de
 *     `@claude-code-how-works/shell/execFileNoThrow.js` (el paquete `shell`
 *     no existe en este arbol).
 *   - `addFileGlobRuleToGitignore` — depende ademas de
 *     `@claude-code-how-works/app-host/bootstrap/cwd.js`,
 *     `@claude-code-how-works/local-observability/errorHelpers.js`,
 *     `@claude-code-how-works/storage/git.js` y
 *     `@claude-code-how-works/local-observability/logging` — cuatro
 *     paquetes que tampoco existen en `thyrox` (`app-host`,
 *     `local-observability`, `shell`, `storage`).
 *
 * Ninguno de los cuatro esta en el alcance de este agente (command-runtime
 * solamente) ni tiene consumidor en este repo todavia. Su porte queda
 * pendiente de que esos paquetes existan.
 */
import { homedir } from 'os'
import { join } from 'path'

/**
 * Obtiene la ruta al archivo gitignore global (.config/git/ignore)
 * @returns La ruta al archivo gitignore global
 */
export function getGlobalGitignorePath(): string {
  return join(homedir(), '.config', 'git', 'ignore')
}
