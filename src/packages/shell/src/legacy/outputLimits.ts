/**
 * Porte fiel de `ccnmt: packages/shell/src/legacy/outputLimits.ts`.
 *
 * Medido byte a byte contra `providers/outputLimits.ts` en la fuente
 * (`diff legacy/outputLimits.ts providers/outputLimits.ts` → sin
 * diferencias): son el mismo archivo bajo dos rutas — artefacto del
 * refactor legacy→providers, no una divergencia real. Se reexporta en
 * vez de duplicar la implementación, para que ambos módulos porten la
 * misma única fuente de verdad.
 *
 * Porte COMPLETO: los tres símbolos de la fuente están presentes (vía
 * reexport).
 *
 * @module
 */
export {
  BASH_MAX_OUTPUT_DEFAULT,
  BASH_MAX_OUTPUT_UPPER_LIMIT,
  getMaxOutputLength,
} from '../providers/outputLimits.js'
