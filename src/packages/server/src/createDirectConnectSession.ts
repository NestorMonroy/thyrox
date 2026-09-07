/**
 * Puerto de `ccnmt: packages/server/src/createDirectConnectSession.ts`.
 * `errorMessage`/`jsonStringify` — ver `internal/pendingCrossPackageDeps.ts`.
 */
import {
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilitySlowOperations,
} from './internal/pendingCrossPackageDeps.js'
import type { DirectConnectConfig } from './directConnectManager.js'
import { connectResponseSchema } from './types.js'

/**
 * Errores que lanza createDirectConnectSession cuando la conexión falla.
 */
export class DirectConnectError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DirectConnectError'
  }
}

/**
 * Crea una sesión en un servidor de conexión directa.
 *
 * Hace POST a `${serverUrl}/sessions`, valida la respuesta, y devuelve un
 * DirectConnectConfig listo para que lo use el REPL o el runner headless.
 *
 * Lanza DirectConnectError ante fallos de red, HTTP, o de parseo de la
 * respuesta.
 */
export async function createDirectConnectSession({
  serverUrl,
  authToken,
  cwd,
  dangerouslySkipPermissions,
}: {
  serverUrl: string
  authToken?: string
  cwd: string
  dangerouslySkipPermissions?: boolean
}): Promise<{
  config: DirectConnectConfig
  workDir?: string
}> {
  const { errorMessage } = requireLocalObservabilityErrorHelpers()
  const { jsonStringify } = requireLocalObservabilitySlowOperations()

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (authToken) {
    headers['authorization'] = `Bearer ${authToken}`
  }

  let resp: Response
  try {
    resp = await fetch(`${serverUrl}/sessions`, {
      method: 'POST',
      headers,
      body: jsonStringify({
        cwd,
        ...(dangerouslySkipPermissions && {
          dangerously_skip_permissions: true,
        }),
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    throw new DirectConnectError(
      `Failed to connect to server at ${serverUrl}: ${errorMessage(err)}`,
    )
  }

  if (!resp.ok) {
    throw new DirectConnectError(
      `Failed to create session: ${resp.status} ${resp.statusText}`,
    )
  }

  const result = connectResponseSchema().safeParse(await resp.json())
  if (!result.success) {
    throw new DirectConnectError(
      `Invalid session response: ${result.error.message}`,
    )
  }

  const data = result.data
  return {
    config: {
      serverUrl,
      sessionId: data.session_id,
      wsUrl: data.ws_url,
      authToken,
    },
    workDir: data.work_dir,
  }
}
