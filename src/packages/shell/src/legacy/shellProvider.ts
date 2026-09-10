/**
 * Porte fiel de `ccnmt: packages/shell/src/legacy/shellProvider.ts`.
 *
 * Medido byte a byte contra `providers/shellProvider.ts` en la fuente
 * (`diff legacy/shellProvider.ts providers/shellProvider.ts` → sin
 * diferencias) — mismo caso que `legacy/outputLimits.ts`, hermano de
 * este archivo: dos rutas para el mismo contenido. Se reexporta en vez
 * de duplicar.
 *
 * Porte COMPLETO: los cuatro símbolos de la fuente están presentes (vía
 * reexport, que a su vez reexporta de `../types.js` — ver el docstring
 * de `../providers/shellProvider.ts`).
 *
 * @module
 */
export {
  SHELL_TYPES,
  type ShellType,
  DEFAULT_HOOK_SHELL,
  type ShellProvider,
} from '../providers/shellProvider.js'
