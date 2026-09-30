import { getAgentHostBindings } from '../host.js'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../internalTypes.js'

// `undefined` es "no medido": la clave no viaja en el evento. Sin él, un
// campo opcional (los conteos de la compactación) sólo cabía como un 0 que
// nadie midió.
type AgentAnalyticsMetadata = Record<
  string,
  | string
  | number
  | boolean
  | undefined
  | AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
>

export type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS }

/** El contrato del anfitrión no admite `undefined`: la clave no medida no se envía. */
export function measuredOnly(
  metadata: AgentAnalyticsMetadata,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean>
}

export function logEvent(
  event: string,
  metadata: AgentAnalyticsMetadata,
): void {
  getAgentHostBindings().logEvent?.(event, measuredOnly(metadata))
}

export function logError(error: unknown): void {
  const logger = getAgentHostBindings().logError
  if (logger) {
    logger(error)
    return
  }
  console.error(error)
}

export function logAntError(message: string, error: unknown): void {
  const logger = getAgentHostBindings().logAntError
  if (logger) {
    logger(message, error)
    return
  }
  console.error(message, error)
}

export function logForDebugging(
  message: string,
  metadata?: unknown,
): void {
  getAgentHostBindings().logDebug?.(message, metadata)
}
