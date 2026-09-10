/**
 * Puerto fiel de `ccnmt: packages/bridge/src/peerSessions.ts`.
 * `logForDebugging`/`errorMessage` son sustitutos — ver
 * `internal/pendingCrossPackageDeps.ts`.
 */
import axios from 'axios'
import {
  errorMessage,
  logForDebugging,
} from './internal/pendingCrossPackageDeps.js'
import { validateBridgeId } from './bridgeApi.js'
import { getBridgeAccessToken } from './bridgeConfig.js'
import { getReplBridgeHandle } from './replBridgeHandle.js'
import { toCompatSessionId } from './sessionIdCompat.js'

/**
 * Envía un mensaje de texto plano a otra sesión de Claude vía la API del
 * bridge.
 *
 * Lo llama SendMessageTool cuando el esquema de la dirección destino es
 * "bridge:". Usa el ReplBridgeHandle actual para derivar la identidad
 * del emisor y la URL de session ingress para el POST.
 *
 * @param target - ID de sesión destino (de la dirección "bridge:<sessionId>")
 * @param message - Contenido de texto plano del mensaje (los mensajes
 *   estructurados se rechazan upstream)
 * @returns { ok: true } en éxito, { ok: false, error } en fallo. Nunca lanza.
 */
export async function postInterClaudeMessage(
  target: string,
  message: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const handle = getReplBridgeHandle()
    if (!handle) {
      return { ok: false, error: 'Bridge not connected' }
    }

    const normalizedTarget = target.trim()
    if (!normalizedTarget) {
      return { ok: false, error: 'No target session specified' }
    }

    const accessToken = getBridgeAccessToken()
    if (!accessToken) {
      return { ok: false, error: 'No access token available' }
    }

    const compatTarget = toCompatSessionId(normalizedTarget)
    // Valida contra path traversal — mismo allowlist que bridgeApi.ts
    validateBridgeId(compatTarget, 'target sessionId')
    const from = toCompatSessionId(handle.bridgeSessionId)
    const baseUrl = handle.sessionIngressUrl

    const url = `${baseUrl}/v1/sessions/${encodeURIComponent(compatTarget)}/messages`

    const response = await axios.post(
      url,
      {
        type: 'peer_message',
        from,
        content: message,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        timeout: 10_000,
        validateStatus: (s: number) => s < 500,
      },
    )

    if (response.status === 200 || response.status === 204) {
      logForDebugging(
        `[bridge:peer] Message sent to ${compatTarget} (${response.status})`,
      )
      return { ok: true }
    }

    const detail =
      typeof response.data === 'object' && response.data?.error?.message
        ? response.data.error.message
        : `HTTP ${response.status}`
    logForDebugging(`[bridge:peer] Send failed: ${detail}`)
    return { ok: false, error: detail }
  } catch (err: unknown) {
    const msg = errorMessage(err)
    logForDebugging(`[bridge:peer] postInterClaudeMessage error: ${msg}`)
    return { ok: false, error: msg }
  }
}
