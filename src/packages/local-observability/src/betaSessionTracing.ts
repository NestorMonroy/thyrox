// Canonical owner is @thyrox/local-observability/telemetry.
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
