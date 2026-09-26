/**
 * La credencial con que `thyrox` habla con el modelo, portada de la cadena de
 * Claude Code 2.1.282: `jc()` y `Qf()` (chunk-wbbthbh9) eligen la fuente,
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
 *   aquí.
 */
import { readFileSync } from 'node:fs'

/** Beta que el servicio exige con un token OAuth (`ep` en chunk-d6bkh9x7). */
export const OAUTH_BETA = 'oauth-2025-04-20'

export type CredentialSource =
  | 'ANTHROPIC_AUTH_TOKEN'
  | 'THYROX_CODE_OAUTH_TOKEN'
  | 'THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR'
  | 'ANTHROPIC_API_KEY'
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

/** El orden de `jc()` para el token y, al final, la llave de `Qf()`. */
export function resolveCredential(env: Env = process.env, readFd: ReadFd = readFdFromProc): Credential {
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
  return { ...base, ...err, source: 'none' }
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
