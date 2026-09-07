/**
 * Puerto fiel de `ccnmt: packages/bridge/src/workSecret.ts`.
 * `jsonParse`/`jsonStringify` son sustitutos — ver
 * `internal/pendingCrossPackageDeps.ts`.
 */
import axios from 'axios'
import { jsonParse, jsonStringify } from './internal/pendingCrossPackageDeps.js'
import type { WorkSecret } from './types.js'

/** Decodifica un work secret codificado en base64url y valida su versión. */
export function decodeWorkSecret(secret: string): WorkSecret {
  const json = Buffer.from(secret, 'base64url').toString('utf-8')
  const parsed: unknown = jsonParse(json)
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('version' in parsed) ||
    parsed.version !== 1
  ) {
    throw new Error(
      `Unsupported work secret version: ${parsed && typeof parsed === 'object' && 'version' in parsed ? parsed.version : 'unknown'}`,
    )
  }
  const obj = parsed as Record<string, unknown>
  if (
    typeof obj.session_ingress_token !== 'string' ||
    obj.session_ingress_token.length === 0
  ) {
    throw new Error(
      'Invalid work secret: missing or empty session_ingress_token',
    )
  }
  if (typeof obj.api_base_url !== 'string') {
    throw new Error('Invalid work secret: missing api_base_url')
  }
  return parsed as WorkSecret
}

/**
 * Construye una URL SDK de WebSocket desde la URL base de la API y el
 * ID de sesión. Retira el protocolo HTTP(S) y construye una URL de
 * ingress ws(s)://.
 *
 * Usa /v2/ para localhost (directo a session-ingress, sin rewrite de
 * Envoy) y /v1/ para producción (Envoy reescribe /v1/ → /v2/).
 */
export function buildSdkUrl(apiBaseUrl: string, sessionId: string): string {
  const isLocalhost =
    apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1')
  const protocol = isLocalhost ? 'ws' : 'wss'
  const version = isLocalhost ? 'v2' : 'v1'
  const host = apiBaseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return `${protocol}://${host}/${version}/session_ingress/ws/${sessionId}`
}

/**
 * Compara dos IDs de sesión sin importar su prefijo de ID etiquetado.
 *
 * Los IDs etiquetados tienen la forma {tag}_{body} o
 * {tag}_staging_{body}, donde el body codifica un UUID. La capa de
 * compatibilidad de CCR v2 devuelve `session_*` a los clientes API v1
 * (compat/convert.go:41) pero la capa de infraestructura (cola de
 * trabajo de sandbox-gateway, respuesta de work poll) usa `cse_*`
 * (compat/CLAUDE.md:13). Ambos tienen el mismo UUID subyacente.
 *
 * Sin esto, replBridge rechaza su propia sesión como "ajena" en el
 * chequeo de work-received cuando el gate ccr_v2_compat_enabled está
 * activo.
 */
export function sameSessionId(a: string, b: string): boolean {
  if (a === b) return true
  // El body es todo lo que sigue al último guion bajo — cubre tanto
  // `{tag}_{body}` como `{tag}_staging_{body}`.
  const aBody = a.slice(a.lastIndexOf('_') + 1)
  const bBody = b.slice(b.lastIndexOf('_') + 1)
  // Guard contra IDs sin guion bajo (UUIDs pelados): lastIndexOf
  // devuelve -1, slice(0) devuelve la cadena entera, y ya chequeamos
  // a === b arriba. Se exige una longitud mínima para evitar matches
  // accidentales en sufijos cortos (p. ej. restos de un tag de un solo
  // char de IDs malformados).
  return aBody.length >= 4 && aBody === bBody
}

/**
 * Construye una URL de sesión CCR v2 desde la URL base de la API y el
 * ID de sesión. A diferencia de buildSdkUrl, devuelve una URL HTTP(S)
 * (no ws://) y apunta a /v1/code/sessions/{id} — el CC hijo derivará la
 * ruta del stream SSE y los endpoints worker desde esta base.
 */
export function buildCCRv2SdkUrl(
  apiBaseUrl: string,
  sessionId: string,
): string {
  const base = apiBaseUrl.replace(/\/+$/, '')
  return `${base}/v1/code/sessions/${sessionId}`
}

/**
 * Registra este bridge como el worker de una sesión CCR v2. Devuelve el
 * worker_epoch, que debe pasarse al proceso hijo CC para que su
 * CCRClient lo incluya en cada request de heartbeat/state/event.
 *
 * Refleja lo que environment-manager hace en el camino de contenedor
 * (api-go/environment-manager/cmd/cmd_task_run.go RegisterWorker).
 */
export async function registerWorker(
  sessionUrl: string,
  accessToken: string,
): Promise<number> {
  const response = await axios.post(
    `${sessionUrl}/worker/register`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      timeout: 10_000,
    },
  )
  // protojson serializa int64 como string para evitar pérdida de
  // precisión de number en JS; el lado Go también puede devolver un
  // number según la configuración del encoder.
  const raw = response.data?.worker_epoch
  const epoch = typeof raw === 'string' ? Number(raw) : raw
  if (
    typeof epoch !== 'number' ||
    !Number.isFinite(epoch) ||
    !Number.isSafeInteger(epoch)
  ) {
    throw new Error(
      `registerWorker: invalid worker_epoch in response: ${jsonStringify(response.data)}`,
    )
  }
  return epoch
}
