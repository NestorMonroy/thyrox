/**
 * Exportar una conexión OAuth de Anthropic al archivo de credenciales de su
 * CLI: si está por caducar se refresca y se persiste antes, y al escribir se
 * conserva todo lo que el CLI guardó junto a los tokens (sus OAuth de MCP),
 * con una copia de seguridad al lado y el archivo sólo legible por su dueño.
 *
 * Porte de `omniroute: src/lib/oauth/utils/claudeAuthFile.ts` (MIT).
 */
import { access, chmod, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, sep } from 'node:path'

import type { ConnectionStore } from '../connectionStore.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'

/** El identificador del proveedor en el store, el de la referencia. */
export const ANTHROPIC_PROVIDER_ID = 'claude'
const REFRESH_MARGIN_MS = 5 * 60 * 1000
const MILLISECONDS_PER_SECOND = 1000
const OWNER_ONLY = 0o600

export interface AnthropicConnectionLike {
  id?: string
  provider?: string
  authType?: string
  name?: string
  email?: string
  displayName?: string
  accessToken?: string | null
  refreshToken?: string | null
  expiresAt?: string | null
  expiresIn?: number | null
  providerSpecificData?: JsonRecord | null
}

export interface AnthropicAuthFilePayload {
  claudeAiOauth: {
    accessToken: string
    refreshToken: string
    /** Milisegundos desde la época, la forma del archivo del CLI. */
    expiresAt: number
    scopes: string[]
    subscriptionType?: string
    rateLimitTier?: string
  }
}

export interface BuiltAnthropicAuthFile {
  connectionId: string
  connectionLabel: string
  email: string | null
  fileName: string
  payload: AnthropicAuthFilePayload
  content: string
}

/** El resultado de refrescar: tokens nuevos, `unrecoverable` si el refresh token ya no sirve, o `null` si falló. */
export type RefreshOutcome = { accessToken?: string; refreshToken?: string; expiresIn?: number; providerSpecificData?: JsonRecord } | { unrecoverable: true } | null

export interface AnthropicExportDeps {
  store: ConnectionStore
  refresh: (connection: AnthropicConnectionLike) => Promise<RefreshOutcome>
  now?: () => number
}

export class AnthropicAuthFileError extends Error {
  status: number
  code: string

  constructor(message: string, status = 400, code = 'invalid_request') {
    super(message)
    this.name = 'AnthropicAuthFileError'
    this.status = status
    this.code = code
  }
}

const toRecord = (value: unknown): JsonRecord => (value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {})

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

/** Sin token hay que refrescar; sin caducidad legible, no; con ella, dentro del margen de cinco minutos. */
export function shouldRefreshAnthropicConnection(connection: AnthropicConnectionLike, nowMs: number): boolean {
  if (!toNonEmptyString(connection.accessToken)) return true
  const expiresAt = toNonEmptyString(connection.expiresAt)
  if (!expiresAt) return false
  // Una fecha ilegible da NaN, y NaN no está dentro de ningún margen.
  return new Date(expiresAt).getTime() - nowMs <= REFRESH_MARGIN_MS
}

export function anthropicConnectionLabel(connection: AnthropicConnectionLike): string {
  return toNonEmptyString(connection.name) || toNonEmptyString(connection.email) || toNonEmptyString(connection.displayName) || toNonEmptyString(connection.id) || 'anthropic-account'
}

/** Un fragmento de nombre de archivo que conserva un correo entero (`@`, `.`, `_`, `-`). */
export function sanitizeFileNamePart(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._@-]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized || 'account'
}

export function extractAnthropicEmail(connection: AnthropicConnectionLike): string | null {
  return toNonEmptyString(toRecord(connection.providerSpecificData).bootstrapEmail) || toNonEmptyString(connection.email) || toNonEmptyString(connection.displayName)
}

export function buildAnthropicAuthPayload(connection: AnthropicConnectionLike): AnthropicAuthFilePayload {
  const accessToken = toNonEmptyString(connection.accessToken)
  const refreshToken = toNonEmptyString(connection.refreshToken)
  if (!accessToken) throw new AnthropicAuthFileError('Anthropic connection is missing access_token. Refresh or re-authenticate this account first.', 409, 'access_token_missing')
  if (!refreshToken) throw new AnthropicAuthFileError('Anthropic connection is missing refresh_token. Re-authenticate this account before exporting.', 409, 'reauth_required')
  const specific = toRecord(connection.providerSpecificData)
  const scopes = Array.isArray(specific.scopes) ? specific.scopes.filter((scope): scope is string => typeof scope === 'string') : []
  const payload: AnthropicAuthFilePayload = {
    claudeAiOauth: { accessToken, refreshToken, expiresAt: connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0, scopes },
  }
  const subscriptionType = toNonEmptyString(specific.subscriptionType)
  if (subscriptionType) payload.claudeAiOauth.subscriptionType = subscriptionType
  const rateLimitTier = toNonEmptyString(specific.rateLimitTier)
  if (rateLimitTier) payload.claudeAiOauth.rateLimitTier = rateLimitTier
  return payload
}

async function resolveFreshConnection(deps: AnthropicExportDeps, connectionId: string): Promise<AnthropicConnectionLike> {
  const now = deps.now ?? Date.now
  const connection = deps.store.getById(connectionId) as AnthropicConnectionLike | null
  if (!connection) throw new AnthropicAuthFileError('Connection not found', 404, 'not_found')
  if (connection.provider !== ANTHROPIC_PROVIDER_ID) throw new AnthropicAuthFileError('Only Anthropic provider connections can export Anthropic auth files')
  if (connection.authType !== 'oauth') throw new AnthropicAuthFileError('Only OAuth Anthropic connections support credentials.json export')
  if (!shouldRefreshAnthropicConnection(connection, now())) return connection

  const refreshToken = toNonEmptyString(connection.refreshToken)
  if (!refreshToken) throw new AnthropicAuthFileError('Anthropic connection requires refresh but no refresh_token is available. Re-authenticate first.', 409, 'reauth_required')
  const refreshed = await deps.refresh({ ...connection, refreshToken })
  if (refreshed && 'unrecoverable' in refreshed) {
    throw new AnthropicAuthFileError('Anthropic refresh token is no longer valid. Re-authenticate this account before exporting.', 409, 'reauth_required')
  }
  if (!refreshed?.accessToken) {
    throw new AnthropicAuthFileError('Failed to refresh the Anthropic session before exporting the credentials file. Re-authenticate this account if the session is stale.', 502, 'refresh_failed')
  }

  const fresh: AnthropicConnectionLike = {
    ...connection,
    accessToken: refreshed.accessToken,
    refreshToken: toNonEmptyString(refreshed.refreshToken) || refreshToken,
    expiresIn: typeof refreshed.expiresIn === 'number' ? refreshed.expiresIn : connection.expiresIn || null,
    expiresAt: typeof refreshed.expiresIn === 'number' ? new Date(now() + refreshed.expiresIn * MILLISECONDS_PER_SECOND).toISOString() : connection.expiresAt || null,
    providerSpecificData: refreshed.providerSpecificData ? { ...toRecord(connection.providerSpecificData), ...toRecord(refreshed.providerSpecificData) } : connection.providerSpecificData,
  }
  deps.store.update(connectionId, {
    accessToken: fresh.accessToken,
    refreshToken: fresh.refreshToken,
    expiresAt: fresh.expiresAt,
    providerSpecificData: fresh.providerSpecificData,
  })
  return fresh
}

export async function buildAnthropicAuthFile(deps: AnthropicExportDeps, connectionId: string): Promise<BuiltAnthropicAuthFile> {
  const connection = await resolveFreshConnection(deps, connectionId)
  const payload = buildAnthropicAuthPayload(connection)
  const connectionLabel = anthropicConnectionLabel(connection)
  const email = extractAnthropicEmail(connection)
  return {
    connectionId,
    connectionLabel,
    email,
    fileName: `anthropic-auth-${sanitizeFileNamePart(email || connectionLabel)}.json`,
    payload,
    content: `${JSON.stringify(payload, null, 2)}\n`,
  }
}

export interface WriteAuthFileOptions {
  /** El archivo de credenciales del CLI; lo resuelve quien llama, nunca una entrada del usuario. */
  authPath: string
  now?: () => number
  /** Una copia al historial central de respaldos, si quien llama lo tiene. */
  backup?: (authPath: string) => Promise<string | null>
}

export interface WrittenAuthFile extends BuiltAnthropicAuthFile {
  authPath: string
  savedBakPath: string | null
  centralizedBackupPath: string | null
  mcpOAuthPreserved: boolean
}

/** Escribe los tokens sin tocar lo demás que el archivo guarda, con copia `.bak` al lado del original. */
export async function writeAnthropicAuthFile(built: BuiltAnthropicAuthFile, options: WriteAuthFileOptions): Promise<WrittenAuthFile> {
  const now = options.now ?? Date.now
  const { authPath } = options
  const authDir = dirname(authPath)
  await mkdir(authDir, { recursive: true })

  let savedBakPath: string | null = null
  try {
    await access(authPath)
    const stamp = new Date(now()).toISOString().replace(/[:.]/g, '-')
    savedBakPath = `${authDir}${sep}credentials-${stamp}.bak`
    await copyFile(authPath, savedBakPath)
  } catch {
    savedBakPath = null
  }
  const centralizedBackupPath = options.backup ? await options.backup(authPath) : null

  let existingDoc: JsonRecord = {}
  try {
    existingDoc = toRecord(JSON.parse(await readFile(authPath, 'utf8')))
  } catch {
    // Sin archivo o con JSON inválido se empieza de cero.
  }
  await writeFile(authPath, `${JSON.stringify({ ...existingDoc, claudeAiOauth: built.payload.claudeAiOauth }, null, 2)}\n`, { encoding: 'utf8', mode: OWNER_ONLY })
  await chmod(authPath, OWNER_ONLY)
  return { ...built, authPath, savedBakPath, centralizedBackupPath, mcpOAuthPreserved: !!existingDoc.mcpOAuth }
}
