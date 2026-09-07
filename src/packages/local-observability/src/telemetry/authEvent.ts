/**
 * Puerto de `ccnmt: packages/local-observability/src/telemetry/authEvent.ts`
 * (77 líneas fuente, 100 % portado). Helper tipado para el evento
 * estructurado OTel `claude_code.auth`. Sin dependencias de paquete
 * hermano fuera de `./events.js` (mismo paquete).
 */

import { logOTelEvent } from './events.js'

export type AuthAction =
  | 'login'
  | 'logout'
  | 'refresh'
  | 'token_exchange'
  | 'api_key_create'

export type AuthMethod = 'oauth' | 'api_key' | 'env_var'

export type AuthEvent = {
  action: AuthAction
  success: boolean
  authMethod: AuthMethod
  error?: unknown
}

function classifyError(error: unknown): {
  kind: 'auth' | 'timeout' | 'network' | 'http' | 'other'
  status?: number
} {
  if (
    !error ||
    typeof error !== 'object' ||
    !('isAxiosError' in error) ||
    !(error as { isAxiosError?: boolean }).isAxiosError
  ) {
    return { kind: 'other' }
  }
  const e = error as {
    response?: { status?: number }
    code?: string
  }
  const status = e.response?.status
  if (status === 401 || status === 403) return { kind: 'auth', status }
  if (e.code === 'ECONNABORTED') return { kind: 'timeout', status }
  if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND')
    return { kind: 'network', status }
  return { kind: 'http', status }
}

export async function logAuthEvent(event: AuthEvent): Promise<void> {
  const metadata: { [key: string]: string | undefined } = {
    action: event.action,
    success: String(event.success),
    auth_method: event.authMethod,
  }
  if (event.error !== undefined) {
    const cls = classifyError(event.error)
    metadata.error_category = cls.kind
    if (cls.status !== undefined) {
      metadata.status_code = String(cls.status)
    }
  }
  await logOTelEvent('auth', metadata)
}
