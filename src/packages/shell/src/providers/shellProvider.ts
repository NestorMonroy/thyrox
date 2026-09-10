/**
 * Porte fiel de `ccnmt: packages/shell/src/providers/shellProvider.ts`.
 *
 * En la fuente este archivo DUPLICA verbatim los cinco símbolos de
 * `../types.ts` (`SHELL_TYPES`, `ShellType`, `DEFAULT_HOOK_SHELL`,
 * `ShellProvider`) — medido con `diff types.ts providers/shellProvider.ts`:
 * el único cambio es que aquí falta `ShellConfig`/`ExecOptions`/etc, que
 * SÍ están en `types.ts`. En vez de reproducir la duplicación (que en la
 * fuente parece un artefacto de refactor, no una decisión), este archivo
 * reexporta desde `../types.js` — mismo contenido, una sola fuente de
 * verdad.
 *
 * Porte COMPLETO: los cuatro símbolos que la fuente declara están
 * presentes (vía reexport).
 *
 * @module
 */
export {
  SHELL_TYPES,
  type ShellType,
  DEFAULT_HOOK_SHELL,
  type ShellProvider,
} from '../types.js'
