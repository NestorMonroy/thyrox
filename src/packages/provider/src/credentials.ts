/**
 * La credencial con que `thyrox` habla con el modelo, portada de la cadena de
 * El ejecutable 2.1.282: `jc()` y `Qf()` (chunk-wbbthbh9) eligen la fuente,
 * `y()`/`KI()` (chunk-qd0gs1zk) leen el token de un descriptor, y
 * `FNe()`/`Gct()` (chunk-t6d3nxvc) retiran las credenciales del entorno de
 * los hijos cuando el anfitrión administra el proveedor. Extractos y
 * veredicto: `.claude/workbench/binary-host-auth-20260926T223508/`.
 *
 * Las variables propias del cliente se renombran `CLAUDE_CODE_*` →
 * `THYROX_CODE_*`; las del servicio (`ANTHROPIC_*`) se conservan, porque su
 * significado lo fija la API y no el cliente.
 *
 * Divergencias declaradas:
 * - no hay login guardado (claude.ai, apiKeyHelper, WIF): thyrox no tiene
 *   almacén de credenciales; esas ramas de `jc()` no se portan;
 * - el descriptor se lee una vez y no se reescribe a disco (`k()` del binario
 *   lo copia a `~/.claude/.oauth_token`); persistir un secreto no se decide
 *   aquí;
 * - la conexión de `provider_connections` sólo entra a la cadena si quien
 *   llama pasa el store: `resolveCredential` no abre por su cuenta el store
 *   del disco (`accounts/connectionStoreHome.ts`), para no añadir E/S de
 *   archivo a toda llamada sin credencial de entorno. pendiente: cablear ese
 *   store en los puntos de llamada (`anthropicHttp.ts`, `agent/cacheTtl.ts`).
 */
import { readFileSync } from 'node:fs'

import type { ConnectionStore } from './accounts/connectionStore.ts'
import { looksEncrypted, STORAGE_KEY_VARIABLE } from './accounts/fieldCipher.ts'
import { ANTHROPIC_PROVIDER_ID } from './accounts/imports/anthropicAuthFile.ts'

/** Beta que el servicio exige con un token OAuth (`ep` en chunk-d6bkh9x7). */
export const OAUTH_BETA = 'oauth-2025-04-20'

export type CredentialSource =
  | 'proxy'
  | 'ANTHROPIC_AUTH_TOKEN'
  | 'THYROX_CODE_OAUTH_TOKEN'
  | 'THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR'
  | 'ANTHROPIC_API_KEY'
  | 'PROVIDER_CONNECTION'
  | 'none'

export type Credential = {
  source: CredentialSource
  kind?: 'api_key' | 'bearer' | 'oauth'
  secret?: string
  /** `ANTHROPIC_UNIX_SOCKET`: el transporte, no la credencial. */
  unixSocket?: string
  /** Por qué una fuente declarada no sirvió, cuando se cayó a otra o a ninguna. */
  error?: string
}

type Env = Record<string, string | undefined>
export type ReadFd = (fd: number) => string

/** Lee el descriptor por `/proc/self/fd`, como hace `y()` del binario. */
export const readFdFromProc: ReadFd = (fd) => readFileSync(`/proc/self/fd/${fd}`, 'utf8')

const FD_VAR = 'THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR'

function tokenFromDescriptor(env: Env, readFd: ReadFd): { secret?: string; error?: string } {
  const raw = env[FD_VAR]?.trim()
  if (!raw) return {}
  if (!/^\d+$/.test(raw)) return { error: `${FD_VAR} debe ser un número de descriptor, llegó: ${raw}` }
  try {
    const secret = readFd(Number(raw)).trim()
    return secret ? { secret } : { error: `${FD_VAR}=${raw}: el descriptor está vacío` }
  } catch (e) {
    return { error: `${FD_VAR}=${raw}: no se pudo leer (${(e as Error).message})` }
  }
}

/**
 * El marcador que ocupa el lugar de la credencial en un túnel por socket
 * (`nRe` de 2.1.283). Quien lo lleva no tiene la credencial: la pone el proxy
 * que escucha en el socket.
 */
export const SSH_PLACEHOLDER = 'ssh-placeholder'

/**
 * El socket del túnel, o `undefined` si no lo hay (`i1` de 2.1.283): hace
 * falta `ANTHROPIC_UNIX_SOCKET`, ningún `ANTHROPIC_AUTH_TOKEN`, y exactamente
 * una de las dos credenciales igual al marcador. Una credencial real no activa
 * el túnel: viajaría por un socket que no la necesita.
 */
export function tunnelSocket(env: Env = process.env): string | undefined {
  const socket = env.ANTHROPIC_UNIX_SOCKET?.trim()
  if (!socket || env.ANTHROPIC_AUTH_TOKEN) return undefined
  const oauth = env.THYROX_CODE_OAUTH_TOKEN
  const apiKey = env.ANTHROPIC_API_KEY
  const onlyOauthMarker = oauth === SSH_PLACEHOLDER && !apiKey
  const onlyApiKeyMarker = apiKey === SSH_PLACEHOLDER && !oauth
  return onlyOauthMarker || onlyApiKeyMarker ? socket : undefined
}

/**
 * Lo que aporta la conexión de mayor prioridad de `provider_connections`:
 * un secreto listo para usar, o una causa que explica
 * por qué esa conexión no dio ninguno. `{}` es "no hay conexión utilizable
 * para este proveedor" — distinto de un `error`, que es "había una conexión
 * y su credencial no se dejó leer".
 */
type ConnectionAttempt = { secret?: string; kind?: 'api_key' | 'oauth'; error?: string }

/** El campo de la fila que lleva el secreto, según el tipo de autenticación de la conexión. */
function connectionCredentialField(authType: unknown): 'accessToken' | 'apiKey' {
  return authType === 'oauth' ? 'accessToken' : 'apiKey'
}

/**
 * La conexión activa de mayor prioridad para Anthropic (`ANTHROPIC_PROVIDER_ID`)
 * en el store recibido. Una credencial que sigue cifrada porque falta
 * `THYROX_STORAGE_ENCRYPTION_KEY`, o que no descifra con la que hay, se
 * declara como error — nunca como si la conexión no existiera.
 */
function connectionCredential(store: ConnectionStore): ConnectionAttempt {
  const candidate = store
    .listRaw({ provider: ANTHROPIC_PROVIDER_ID, isActive: true })
    .find(row => row.authType === 'apikey' || row.authType === 'oauth')
  if (!candidate) return {}
  const row = store.getById(candidate.id as string)
  if (!row) return {}
  const label = typeof row.name === 'string' && row.name ? row.name : String(row.id)
  if (row.credentialDecryptFailed) {
    return { error: `provider_connections: la conexión "${label}" no se pudo descifrar. Revisa ${STORAGE_KEY_VARIABLE}.` }
  }
  const field = connectionCredentialField(row.authType)
  const value = row[field]
  if (typeof value === 'string' && looksEncrypted(value)) {
    return { error: `provider_connections: la conexión "${label}" está cifrada y ${STORAGE_KEY_VARIABLE} no está definida.` }
  }
  const secret = typeof value === 'string' ? value.trim() : ''
  if (!secret) return {}
  return { secret, kind: field === 'accessToken' ? 'oauth' : 'api_key' }
}

/**
 * El orden de `jc()` para el token, después la llave de `Qf()` y, al final,
 * la conexión de `provider_connections`. En túnel la fuente es `proxy` y no
 * hay secreto: la credencial la pone quien escucha en el socket (`dt`/`at`
 * de 2.1.283). `store` es opcional y sólo se consulta si llega. El error de
 * un descriptor ilegible viaja con la credencial que se resuelva después, y
 * se une al de la conexión cuando ninguna resuelve.
 */
export function resolveCredential(env: Env = process.env, readFd: ReadFd = readFdFromProc, store?: ConnectionStore): Credential {
  const tunnel = tunnelSocket(env)
  if (tunnel) return { source: 'proxy', unixSocket: tunnel }
  const unixSocket = env.ANTHROPIC_UNIX_SOCKET?.trim() || undefined
  const base = unixSocket ? { unixSocket } : {}
  const authToken = env.ANTHROPIC_AUTH_TOKEN?.trim()
  if (authToken) return { ...base, source: 'ANTHROPIC_AUTH_TOKEN', kind: 'bearer', secret: authToken }
  const oauth = env.THYROX_CODE_OAUTH_TOKEN?.trim()
  if (oauth) return { ...base, source: 'THYROX_CODE_OAUTH_TOKEN', kind: 'oauth', secret: oauth }
  const fd = tokenFromDescriptor(env, readFd)
  if (fd.secret) return { ...base, source: FD_VAR, kind: 'oauth', secret: fd.secret }
  const err = fd.error ? { error: fd.error } : {}
  const apiKey = env.ANTHROPIC_API_KEY?.trim()
  if (apiKey) return { ...base, ...err, source: 'ANTHROPIC_API_KEY', kind: 'api_key', secret: apiKey }
  const connection = store ? connectionCredential(store) : {}
  if (connection.secret) return { ...base, ...err, source: 'PROVIDER_CONNECTION', kind: connection.kind, secret: connection.secret }
  const causes = [fd.error, connection.error].filter(Boolean)
  return { ...base, ...(causes.length ? { error: causes.join('; ') } : {}), source: 'none' }
}

/** Las cabeceras de autenticación de una credencial resuelta. */
export function authHeaders(c: Credential): Record<string, string> {
  if (!c.secret) return {}
  if (c.kind === 'api_key') return { 'x-api-key': c.secret }
  if (c.kind === 'oauth') return { authorization: `Bearer ${c.secret}`, 'anthropic-beta': OAUTH_BETA }
  return { authorization: `Bearer ${c.secret}` }
}

/** `vB` de 2.1.282 con los nombres propios renombrados. */
const CREDENTIAL_VARS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'THYROX_CODE_OAUTH_TOKEN',
  FD_VAR,
  'AWS_BEARER_TOKEN_BEDROCK',
  'ANTHROPIC_FOUNDRY_API_KEY',
  'ANTHROPIC_FOUNDRY_AUTH_TOKEN',
  'ANTHROPIC_AWS_API_KEY',
  'ANTHROPIC_CUSTOM_HEADERS',
  'THYROX_CODE_HOST_CREDS_FILE',
]

function flagOn(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase()
  return !!s && !['0', 'false', 'no', 'off'].includes(s)
}

/**
 * El entorno de un hijo. Con `THYROX_CODE_PROVIDER_MANAGED_BY_HOST` el
 * anfitrión administra la credencial y ningún proceso lanzado la hereda
 * (`FNe()` + `Gct()`); sin la bandera se devuelve igual.
 */
export function scrubChildEnv(env: Env): Env {
  if (!flagOn(env.THYROX_CODE_PROVIDER_MANAGED_BY_HOST)) return { ...env }
  const out: Env = { ...env }
  for (const k of CREDENTIAL_VARS) delete out[k]
  return out
}
