/**
 * Seis fachadas hacia el sobre de resultado del SDK — porte de
 * `ccnmt: packages/agent/internal/sdkRuntime.ts`.
 *
 * Cada una tiene un default determinista cuando el host no instaló el
 * binding, y el default importa tanto como la delegación: `getTotalCost`
 * y `getTotalAPIDuration` caen en cero numérico (el sobre los suma/
 * multiplica), `getInMemoryErrors` en `[]` (se itera sin riesgo),
 * `getModelUsage` en `{}` (se esparce dentro de un objeto), y
 * `categorizeRetryableAPIError` hace eco del error original — nunca se
 * traga uno que el host no supo clasificar. `getFastModeState` es el
 * único que cae en `null` en vez de un valor "vacío" del mismo tipo,
 * porque `null` distingue "sin host que clasifique" de "undefined", que
 * el llamador comprueba con `=== null`.
 */
import { getAgentHostBindings } from '../host.ts'

export function getInMemoryErrors(): unknown[] {
  return getAgentHostBindings().getInMemoryErrors?.() ?? []
}

export function categorizeRetryableAPIError(error: unknown): unknown {
  return getAgentHostBindings().categorizeRetryableAPIError?.(error) ?? error
}

export function getTotalAPIDuration(): number {
  return getAgentHostBindings().getTotalAPIDuration?.() ?? 0
}

export function getTotalCost(): number {
  return getAgentHostBindings().getTotalCost?.() ?? 0
}

export function getModelUsage(): Record<string, unknown> {
  return getAgentHostBindings().getModelUsage?.() ?? {}
}

export function getFastModeState(
  model: string,
  fastMode?: boolean,
): unknown {
  return getAgentHostBindings().getFastModeState?.(model, fastMode) ?? null
}
