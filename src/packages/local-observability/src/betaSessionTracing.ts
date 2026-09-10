/**
 * Puerto de `ccnmt: packages/local-observability/src/betaSessionTracing.ts`
 * (12 líneas fuente, 100 % portado).
 */
export type { LLMRequestNewContext } from './telemetry/index.js'
export {
  addBetaInteractionAttributes,
  addBetaLLMRequestAttributes,
  addBetaLLMResponseAttributes,
  addBetaToolInputAttributes,
  addBetaToolResultAttributes,
  clearBetaTracingState,
  isBetaTracingEnabled,
  truncateContent,
} from './telemetry/index.js'
