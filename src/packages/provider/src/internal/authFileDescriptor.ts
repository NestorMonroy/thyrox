/**
 * Porte de `ccnmt: packages/provider/src/authFileDescriptor.ts` — sibling
 * NO asignado a este pase, consumido por `authAlias.ts` (uno de los 18).
 * Sus 2 lectores públicos, `getOAuthTokenFromFileDescriptor`/
 * `getApiKeyFromFileDescriptor`, y el escritor best-effort
 * `maybePersistTokenForSubprocesses`.
 *
 * `getOauthTokenFromFd`/`setOauthTokenFromFd`/`getApiKeyFromFd`/
 * `setApiKeyFromFd` (`app-host/bootstrap/state.js`, zona prohibida) se
 * sustituyen por variables de módulo locales: el propósito de esa caché es
 * "ya leí esto en este proceso", que una variable local cumple igual —
 * sólo se pierde la sincronización con el resto del estado de app-host
 * (nadie más en este árbol lee ese slot todavía).
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
function isENOENT(e: unknown): boolean {
  return Boolean(e && typeof e === 'object' && (e as { code?: string }).code === 'ENOENT')
}

const CCR_TOKEN_DIR = '/home/claude/.claude/remote'
const CCR_OAUTH_TOKEN_PATH = `${CCR_TOKEN_DIR}/.oauth_token`
const CCR_API_KEY_PATH = `${CCR_TOKEN_DIR}/.api_key`
export const CCR_SESSION_INGRESS_TOKEN_PATH = `${CCR_TOKEN_DIR}/.session_ingress_token`

export function maybePersistTokenForSubprocesses(path: string, token: string, tokenName: string): void {
  if (!isEnvTruthy(readEnv('CLAUDE_CODE_REMOTE'))) return
  try {
    mkdirSync(CCR_TOKEN_DIR, { recursive: true, mode: 0o700 })
    writeFileSync(path, token, { encoding: 'utf8', mode: 0o600 })
    logForDebugging(`Persisted ${tokenName} to ${path} for subprocess access`)
  } catch (error) {
    logForDebugging(`Failed to persist ${tokenName} to disk (non-fatal): ${errorMessage(error)}`, { level: 'error' })
  }
}

export function readTokenFromWellKnownFile(path: string, tokenName: string): string | null {
  try {
    const fsOps = getFsImplementation()
    const token = fsOps.readFileSync(path, { encoding: 'utf8' }).trim()
    if (!token) return null
    logForDebugging(`Read ${tokenName} from well-known file ${path}`)
    return token
  } catch (error) {
    if (!isENOENT(error)) {
      logForDebugging(`Failed to read ${tokenName} from ${path}: ${errorMessage(error)}`, { level: 'debug' })
    }
    return null
  }
}

let oauthTokenFdCache: string | null | undefined
let apiKeyFdCache: string | null | undefined

function getCredentialFromFd({
  envVar,
  wellKnownPath,
  label,
  getCached,
  setCached,
}: {
  envVar: string
  wellKnownPath: string
  label: string
  getCached: () => string | null | undefined
  setCached: (value: string | null) => void
}): string | null {
  const cached = getCached()
  if (cached !== undefined) return cached

  const fdEnv = readEnv(envVar)
  if (!fdEnv) {
    const fromFile = readTokenFromWellKnownFile(wellKnownPath, label)
    setCached(fromFile)
    return fromFile
  }

  const fd = parseInt(fdEnv, 10)
  if (Number.isNaN(fd)) {
    logForDebugging(`${envVar} must be a valid file descriptor number, got: ${fdEnv}`, { level: 'error' })
    setCached(null)
    return null
  }

  try {
    const fsOps = getFsImplementation()
    const fdPath = process.platform === 'darwin' || process.platform === 'freebsd' ? `/dev/fd/${fd}` : `/proc/self/fd/${fd}`
    const token = fsOps.readFileSync(fdPath, { encoding: 'utf8' }).trim()
    if (!token) {
      logForDebugging(`File descriptor contained empty ${label}`, { level: 'error' })
      setCached(null)
      return null
    }
    logForDebugging(`Successfully read ${label} from file descriptor ${fd}`)
    setCached(token)
    maybePersistTokenForSubprocesses(wellKnownPath, token, label)
    return token
  } catch (error) {
    logForDebugging(`Failed to read ${label} from file descriptor ${fd}: ${errorMessage(error)}`, { level: 'error' })
    const fromFile = readTokenFromWellKnownFile(wellKnownPath, label)
    setCached(fromFile)
    return fromFile
  }
}

export function getOAuthTokenFromFileDescriptor(): string | null {
  return getCredentialFromFd({
    envVar: 'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR',
    wellKnownPath: CCR_OAUTH_TOKEN_PATH,
    label: 'OAuth token',
    getCached: () => oauthTokenFdCache,
    setCached: v => {
      oauthTokenFdCache = v
    },
  })
}

export function setOauthTokenFromFd(value: string | null): void {
  oauthTokenFdCache = value
}

export function getApiKeyFromFileDescriptor(): string | null {
  return getCredentialFromFd({
    envVar: 'CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR',
    wellKnownPath: CCR_API_KEY_PATH,
    label: 'API key',
    getCached: () => apiKeyFdCache,
    setCached: v => {
      apiKeyFdCache = v
    },
  })
}
