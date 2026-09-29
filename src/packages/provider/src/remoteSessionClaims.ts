/**
 * Claims del token de una sesión de trabajo remota — la mitad que
 * `isRemoteCoworkSession()` (`fastMode.ts`, `uc() && Iz()`) no cubre: un
 * token de acceso de sesión puede identificar un agente de servicio o un
 * worker de sesión sin pasar por el flujo de cowork. Porte de
 * `chunk-t6pwageh.js` (2.1.283): `eo` (`hasRemoteSessionWorkerClaims`),
 * con `Ndt` (`hasServiceAgentClaims`), `dqn` (`hasByocSessionWorkerClaims`),
 * `Vi` (`readRemoteSessionClaims`), `Nl` (`readSessionAccessToken`) y `Zr`
 * (`isNonEmptyString`) como internos; más `U6e`
 * (`isByocRemoteEnvironment`, `chunk-1ay853f5.js`).
 *
 * Composición con `isRemoteCoworkSession()`: la referencia las junta con un
 * OR, `function rn(){return uc()&&Iz()||eo()}` — quien integre este módulo
 * hace lo mismo: `remoteManaged: isRemoteCoworkSession() || hasRemoteSessionWorkerClaims()`.
 *
 * Divergencias declaradas:
 * - `Nl` cae a `B()` (`chunk-3cvbcwb5.js`) cuando la variable de entorno
 *   falta: token leído de un descriptor de archivo de autenticación
 *   websocket (`D`, `ane`, `xxe`, `Ixe`), un subsistema propio fuera del
 *   alcance de este ítem. Aquí llega como dependencia inyectada
 *   (`SessionAccessTokenSource`), `undefined` por defecto.
 * - `oF` decodifica con `J` (`chunk-zkn0228z.js`), un `JSON.parse`
 *   instrumentado para telemetría; aquí es `JSON.parse` liso.
 */
import { isTruthyFlag } from '@thyrox/config/entrypoint'
import { readEnv } from '@thyrox/config/env/utils'

/** Las claims decodificadas del cuerpo del JWT del token de sesión. */
export type SessionTokenClaims = Record<string, unknown>

/** El sustituto de `B()`: de dónde sale el token cuando la variable de
 * entorno no está. `undefined` por defecto — sin archivo de sesión, la
 * sesión no está gestionada de forma remota. */
export type SessionAccessTokenSource = () => string | undefined

/** `Zr`: no vacío y de tipo string. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

/**
 * `oF`: decodifica el segmento central de un JWT (`header.payload.firma`),
 * tolerando el prefijo `sk-ant-si-` que el token de sesión puede llevar.
 * `null` si el token no tiene tres segmentos, el segmento central está
 * vacío, o no decodifica a JSON.
 */
export function parseSessionTokenClaims(token: string): unknown {
  const withoutPrefix = token.startsWith('sk-ant-si-') ? token.slice('sk-ant-si-'.length) : token
  const segments = withoutPrefix.split('.')
  if (segments.length !== 3 || !segments[1]) return null
  try {
    return JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

/** `Nl`: la variable de entorno gana; vacía o ausente, cae al `fallback`. */
export function readSessionAccessToken(fallback: SessionAccessTokenSource = () => undefined): string | undefined {
  const fromEnv = readEnv('THYROX_CODE_SESSION_ACCESS_TOKEN')
  if (fromEnv) return fromEnv
  return fallback()
}

/**
 * `Vi`: las claims del token de sesión actual, o `null` si no hay token,
 * el token no decodifica, o el cuerpo decodificado no es un objeto plano
 * (ni arreglo, ni primitivo).
 */
export function readRemoteSessionClaims(
  fallback: SessionAccessTokenSource = () => undefined,
): SessionTokenClaims | null {
  const token = readSessionAccessToken(fallback)
  if (token === undefined) return null
  const claims = parseSessionTokenClaims(token)
  return claims !== null && typeof claims === 'object' && !Array.isArray(claims) ? (claims as SessionTokenClaims) : null
}

/** `U6e`: sesión remota gestionada en modo BYOC (traer tu propia nube). */
export function isByocRemoteEnvironment(): boolean {
  return isTruthyFlag(readEnv('THYROX_CODE_REMOTE')) && readEnv('THYROX_CODE_ENVIRONMENT_KIND') === 'byoc'
}

/**
 * `Ndt`: claims de un agente de servicio — sin `account_uuid` ni `sub`,
 * con `org_service_name` y `code_agent_id` no vacíos.
 */
export function hasServiceAgentClaims(fallback?: SessionAccessTokenSource): boolean {
  const claims = readRemoteSessionClaims(fallback)
  if (claims === null) return false
  if ('account_uuid' in claims || 'sub' in claims) return false
  return (
    'org_service_name' in claims &&
    isNonEmptyString(claims.org_service_name) &&
    'code_agent_id' in claims &&
    isNonEmptyString(claims.code_agent_id)
  )
}

/**
 * `dqn`: claims de un worker de sesión BYOC — sólo bajo
 * `isByocRemoteEnvironment()`, con `ccr:role` en `"session_worker"`, sin
 * `account_uuid` ni `ccr:account_id`, y `code_agent_id` no vacío.
 */
export function hasByocSessionWorkerClaims(fallback?: SessionAccessTokenSource): boolean {
  if (!isByocRemoteEnvironment()) return false
  const claims = readRemoteSessionClaims(fallback)
  if (claims === null) return false
  const role = 'ccr:role' in claims ? claims['ccr:role'] : undefined
  const hasAccountId = 'account_uuid' in claims || 'ccr:account_id' in claims
  return role === 'session_worker' && !hasAccountId && 'code_agent_id' in claims && isNonEmptyString(claims.code_agent_id)
}

/**
 * `eo`: verdadero si el token de sesión trae claims de agente de servicio
 * o de worker de sesión BYOC.
 */
export function hasRemoteSessionWorkerClaims(fallback?: SessionAccessTokenSource): boolean {
  return hasServiceAgentClaims(fallback) || hasByocSessionWorkerClaims(fallback)
}
