import type { ModelUsage, SDKAssistantMessageError } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type { FastModeState } from '../contracts.js'
import { getAgentHostBindings } from '../host.js'

export function getInMemoryErrors(): unknown[] {
  return getAgentHostBindings().getInMemoryErrors?.() ?? []
}

export function categorizeRetryableAPIError(error: unknown): SDKAssistantMessageError {
  return getAgentHostBindings().categorizeRetryableAPIError?.(error) ?? 'unknown'
}

export function getTotalAPIDuration(): number {
  return getAgentHostBindings().getTotalAPIDuration?.() ?? 0
}

export function getTotalCost(): number {
  return getAgentHostBindings().getTotalCost?.() ?? 0
}

export function getModelUsage(): Record<string, ModelUsage> {
  return getAgentHostBindings().getModelUsage?.() ?? {}
}

export function getFastModeState(
  model: string,
  fastMode?: boolean,
): FastModeState {
  // Sin proveedor enlazado, fast mode no está activo: 'off', como devuelve
  // la propia `getFastModeState` cuando no se cumple ninguna condición.
  return getAgentHostBindings().getFastModeState?.(model, fastMode) ?? 'off'
}
