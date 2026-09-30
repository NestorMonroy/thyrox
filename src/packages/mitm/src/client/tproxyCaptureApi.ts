/**
 * El cliente del modo de captura con descifrado (TPROXY) sobre la ruta local
 * `/api/tools/agent-bridge/tproxy`: GET estado, POST arranque, DELETE parada.
 *
 * Porte de `omniroute: src/lib/inspector/tproxyCaptureApi.ts` (MIT).
 */
import type { CaptureManagerStatus } from '../tproxy/captureManager.ts'
import { jsonBody, type LocalApiClient } from './localApi.ts'

export const TPROXY_ROUTE = '/api/tools/agent-bridge/tproxy'

/** Los ajustes opcionales del arranque y la contraseña de sudo (sin root). */
export interface StartTproxyOptions {
  sudoPassword?: string
  dport?: number
  onPort?: number
  mark?: number
  routeTable?: number
  bypassMark?: number
}

export function fetchTproxyStatus(client: LocalApiClient): Promise<CaptureManagerStatus> {
  return client.requestJson<CaptureManagerStatus>(TPROXY_ROUTE)
}

export async function startTproxyCaptureMode(
  client: LocalApiClient,
  options: StartTproxyOptions = {},
): Promise<CaptureManagerStatus> {
  const r = await client.requestJson<{ ok: boolean; status: CaptureManagerStatus }>(TPROXY_ROUTE, {
    method: 'POST',
    ...jsonBody(options),
  })
  return r.status
}

export async function stopTproxyCaptureMode(client: LocalApiClient): Promise<CaptureManagerStatus> {
  const r = await client.requestJson<{ ok: boolean; status: CaptureManagerStatus }>(TPROXY_ROUTE, { method: 'DELETE' })
  return r.status
}
