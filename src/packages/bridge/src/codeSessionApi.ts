/**
 * Wrappers HTTP delgados para la API de code-session de CCR v2.
 *
 * Archivo separado de remoteBridgeCore.ts para que el subpath /bridge
 * del SDK pueda exportar createCodeSession + fetchRemoteCredentials sin
 * empaquetar el árbol pesado del CLI (analytics, transporte, etc.). Los
 * llamadores proveen accessToken + baseUrl explícitos — sin auth ni
 * lecturas de config implícitas.
 *
 * Puerto fiel de `ccnmt: packages/bridge/src/codeSessionApi.ts`.
 * `logForDebugging`/`errorMessage`/`jsonStringify` son sustitutos — ver
 * `internal/pendingCrossPackageDeps.ts`.
 */
import axios from 'axios'
import {
  errorMessage,
  jsonStringify,
  logForDebugging,
} from './internal/pendingCrossPackageDeps.js'
import { extractErrorDetail } from './debugUtils.js'

const ANTHROPIC_VERSION = '2023-06-01'

function oauthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
  }
}

export async function createCodeSession(
  baseUrl: string,
  accessToken: string,
  title: string,
  timeoutMs: number,
  tags?: string[],
): Promise<string | null> {
  const url = `${baseUrl}/v1/code/sessions`
  let response
  try {
    response = await axios.post(
      url,
      // bridge: {} es la señal positiva para el oneof del runner —
      // omitirlo (o enviar environment_id: "") ahora da 400. BridgeRunner
      // hoy es un mensaje vacío; es un placeholder para futuras opciones
      // específicas de bridge.
      { title, bridge: {}, ...(tags?.length ? { tags } : {}) },
      {
        headers: oauthHeaders(accessToken),
        timeout: timeoutMs,
        validateStatus: s => s < 500,
      },
    )
  } catch (err: unknown) {
    logForDebugging(
      `[code-session] Session create request failed: ${errorMessage(err)}`,
    )
    return null
  }

  if (response.status !== 200 && response.status !== 201) {
    const detail = extractErrorDetail(response.data)
    logForDebugging(
      `[code-session] Session create failed ${response.status}${detail ? `: ${detail}` : ''}`,
    )
    return null
  }

  const data: unknown = response.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('session' in data) ||
    !data.session ||
    typeof data.session !== 'object' ||
    !('id' in data.session) ||
    typeof data.session.id !== 'string' ||
    !data.session.id.startsWith('cse_')
  ) {
    logForDebugging(
      `[code-session] No session.id (cse_*) in response: ${jsonStringify(data).slice(0, 200)}`,
    )
    return null
  }
  return data.session.id
}

/**
 * Credenciales de POST /bridge. El JWT es opaco — no decodificar.
 * Cada llamada a /bridge incrementa worker_epoch del lado servidor (ES
 * el registro).
 */
export type RemoteCredentials = {
  worker_jwt: string
  api_base_url: string
  expires_in: number
  worker_epoch: number
}

export async function fetchRemoteCredentials(
  sessionId: string,
  baseUrl: string,
  accessToken: string,
  timeoutMs: number,
  trustedDeviceToken?: string,
): Promise<RemoteCredentials | null> {
  const url = `${baseUrl}/v1/code/sessions/${sessionId}/bridge`
  const headers = oauthHeaders(accessToken)
  if (trustedDeviceToken) {
    headers['X-Trusted-Device-Token'] = trustedDeviceToken
  }
  let response
  try {
    response = await axios.post(
      url,
      {},
      {
        headers,
        timeout: timeoutMs,
        validateStatus: s => s < 500,
      },
    )
  } catch (err: unknown) {
    logForDebugging(
      `[code-session] /bridge request failed: ${errorMessage(err)}`,
    )
    return null
  }

  if (response.status !== 200) {
    const detail = extractErrorDetail(response.data)
    logForDebugging(
      `[code-session] /bridge failed ${response.status}${detail ? `: ${detail}` : ''}`,
    )
    return null
  }

  const data: unknown = response.data
  if (
    data === null ||
    typeof data !== 'object' ||
    !('worker_jwt' in data) ||
    typeof data.worker_jwt !== 'string' ||
    !('expires_in' in data) ||
    typeof data.expires_in !== 'number' ||
    !('api_base_url' in data) ||
    typeof data.api_base_url !== 'string' ||
    !('worker_epoch' in data)
  ) {
    logForDebugging(
      `[code-session] /bridge response malformed (need worker_jwt, expires_in, api_base_url, worker_epoch): ${jsonStringify(data).slice(0, 200)}`,
    )
    return null
  }
  // protojson serializa int64 como string para evitar pérdida de
  // precisión en JS; Go también puede devolver un number según la
  // configuración del encoder.
  const rawEpoch = data.worker_epoch
  const epoch = typeof rawEpoch === 'string' ? Number(rawEpoch) : rawEpoch
  if (
    typeof epoch !== 'number' ||
    !Number.isFinite(epoch) ||
    !Number.isSafeInteger(epoch)
  ) {
    logForDebugging(
      `[code-session] /bridge worker_epoch invalid: ${jsonStringify(rawEpoch)}`,
    )
    return null
  }
  return {
    worker_jwt: data.worker_jwt,
    api_base_url: data.api_base_url,
    expires_in: data.expires_in,
    worker_epoch: epoch,
  }
}
