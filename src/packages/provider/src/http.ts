/**
 * Porte COMPLETO de `ccnmt: packages/provider/src/http.ts` — sus 5
 * exportaciones, ninguna omitida.
 *
 * `getClaudeCodeUserAgent`/`getWorkload` vienen de `userAgent.ts` /
 * `workloadContext.ts` de la fuente — NO asignados a este pase (no están en
 * la lista de 18). Sustitutos locales fieles en
 * `internal/pendingCrossPackageDeps.ts`, con `MACRO.VERSION` resuelto desde
 * el `package.json` propio (no hay build-macro aquí).
 */

import axios from 'axios'
import { readEnv } from '@thyrox/config/env/utils'
import { OAUTH_BETA_HEADER } from './oauthConstants.ts'
import {
  getAnthropicApiKey,
  getClaudeAIOAuthTokens,
  handleOAuth401Error,
  isClaudeAISubscriber,
} from './authAlias.ts'
import { getClaudeCodeUserAgent, getWorkload } from './internal/pendingCrossPackageDeps.ts'

// ADVERTENCIA: se depende de `claude-cli` en el user agent para filtrar
// logs. No cambiar sin actualizar también el filtrado.
export function getUserAgent(): string {
  const agentSdkVersion = readEnv('CLAUDE_AGENT_SDK_VERSION')
    ? `, agent-sdk/${readEnv('CLAUDE_AGENT_SDK_VERSION')}`
    : ''
  const clientApp = readEnv('CLAUDE_AGENT_SDK_CLIENT_APP')
    ? `, client-app/${readEnv('CLAUDE_AGENT_SDK_CLIENT_APP')}`
    : ''
  const workload = getWorkload()
  const workloadSuffix = workload ? `, workload/${workload}` : ''
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const version = (require('../package.json') as { version: string }).version
  return `claude-cli/${version} (${process.env.USER_TYPE}, ${readEnv('CLAUDE_CODE_ENTRYPOINT') ?? 'cli'}${agentSdkVersion}${clientApp}${workloadSuffix})`
}

export function getMCPUserAgent(): string {
  const parts: string[] = []
  const entrypoint = readEnv('CLAUDE_CODE_ENTRYPOINT')
  if (entrypoint) parts.push(entrypoint)
  const sdkVersion = readEnv('CLAUDE_AGENT_SDK_VERSION')
  if (sdkVersion) parts.push(`agent-sdk/${sdkVersion}`)
  const clientApp = readEnv('CLAUDE_AGENT_SDK_CLIENT_APP')
  if (clientApp) parts.push(`client-app/${clientApp}`)
  const suffix = parts.length > 0 ? ` (${parts.join(', ')})` : ''
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const version = (require('../package.json') as { version: string }).version
  return `claude-code-how-works-how-works/${version}${suffix}`
}

// User-Agent para requests de WebFetch a sitios arbitrarios.
export function getWebFetchUserAgent(): string {
  return `Claude-User (${getClaudeCodeUserAgent()}; +https://support.anthropic.com/)`
}

export type AuthHeaders = {
  headers: Record<string, string>
  error?: string
}

/** Cabeceras de autenticación para requests a la API. */
export function getAuthHeaders(): AuthHeaders {
  if (isClaudeAISubscriber()) {
    const oauthTokens = getClaudeAIOAuthTokens()
    if (!oauthTokens?.accessToken) {
      return { headers: {}, error: 'No OAuth token available' }
    }
    return {
      headers: {
        Authorization: `Bearer ${oauthTokens.accessToken}`,
        'anthropic-beta': OAUTH_BETA_HEADER,
      },
    }
  }
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return { headers: {}, error: 'No API key available' }
  return { headers: { 'x-api-key': apiKey } }
}

/**
 * Envuelve una request: si falla por 401 (o 403 con token revocado, cuando
 * `also403Revoked`), fuerza el refresh del token y reintenta una vez.
 */
export async function withOAuth401Retry<T>(
  request: () => Promise<T>,
  opts?: { also403Revoked?: boolean },
): Promise<T> {
  try {
    return await request()
  } catch (err) {
    if (!axios.isAxiosError(err)) throw err
    const status = err.response?.status
    const isAuthError =
      status === 401 ||
      (opts?.also403Revoked &&
        status === 403 &&
        typeof err.response?.data === 'string' &&
        err.response.data.includes('OAuth token has been revoked'))
    if (!isAuthError) throw err
    const failedAccessToken = getClaudeAIOAuthTokens()?.accessToken
    if (!failedAccessToken) throw err
    await handleOAuth401Error(failedAccessToken)
    return await request()
  }
}
