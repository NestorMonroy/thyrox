/**
 * Lo que comparten las exportaciones de una conexión OAuth al archivo de
 * credenciales de un CLI (Anthropic, codex): el error con su código HTTP, la
 * etiqueta y el nombre de archivo de la cuenta, el refresco cuando la sesión
 * está por caducar —persistido antes de exportar— y la escritura con copia de
 * seguridad al lado y modo de sólo su dueño.
 *
 * Porte de las piezas comunes de `omniroute: src/lib/oauth/utils/claudeAuthFile.ts`
 * y `codexAuthFile.ts` (MIT), que la referencia repite en cada archivo.
 */
import { access, chmod, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, sep } from 'node:path'

import type { ConnectionStore } from '../connectionStore.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'

const REFRESH_MARGIN_MS = 5 * 60 * 1000
const MILLISECONDS_PER_SECOND = 1000
const OWNER_ONLY = 0o600

export class AuthFileError extends Error {
  status: number
  code: string

  constructor(message: string, status = 400, code = 'invalid_request') {
    super(message)
    this.name = 'AuthFileError'
    this.status = status
    this.code = code
  }
}

export const toRecord = (value: unknown): JsonRecord => (value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {})

export function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export interface OAuthConnectionLike {
  id?: string
  provider?: string
  authType?: string
  name?: string
  email?: string
  displayName?: string
  accessToken?: string | null
  refreshToken?: string | null
  idToken?: string | null
  expiresAt?: string | null
  expiresIn?: number | null
  providerSpecificData?: JsonRecord | null
}

/** Sin token hay que refrescar; sin caducidad, no; con ella, dentro del margen de cinco minutos. */
export function shouldRefreshConnection(connection: OAuthConnectionLike, nowMs: number): boolean {
  if (!toNonEmptyString(connection.accessToken)) return true
  const expiresAt = toNonEmptyString(connection.expiresAt)
  if (!expiresAt) return false
  // Una fecha ilegible da NaN, y NaN no está dentro de ningún margen.
  return new Date(expiresAt).getTime() - nowMs <= REFRESH_MARGIN_MS
}

/** Una caducidad en milisegundos está dentro del margen de refresco. */
export function isWithinRefreshMargin(expiresAtMs: number, nowMs: number): boolean {
  return expiresAtMs - nowMs <= REFRESH_MARGIN_MS
}

export function connectionLabel(connection: OAuthConnectionLike, fallback: string): string {
  return toNonEmptyString(connection.name) || toNonEmptyString(connection.email) || toNonEmptyString(connection.displayName) || toNonEmptyString(connection.id) || fallback
}

/** Un fragmento de nombre de archivo que conserva un correo entero (`@`, `.`, `_`, `-`). */
export function sanitizeFileNamePart(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._@-]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized || 'account'
}

/** El resultado de refrescar: tokens nuevos, `unrecoverable` si el refresh token ya no sirve, o `null` si falló. */
export type RefreshOutcome =
  | { accessToken?: string; refreshToken?: string; expiresIn?: number; expiresAt?: string; providerSpecificData?: JsonRecord }
  | { unrecoverable: true }
  | null

export interface ExportDeps {
  store: ConnectionStore
  refresh: (connection: OAuthConnectionLike) => Promise<RefreshOutcome>
  now?: () => number
}

/** Cómo se nombra el proveedor y su archivo en los mensajes. */
export interface ExportSubject {
  providerId: string
  label: string
  /** El archivo que se exporta, tal como lo nombra el CLI (`auth.json`). */
  fileName: string
  /** Cómo se dice ese archivo en una frase (`auth file`). */
  fileNoun: string
}

/** La conexión, refrescada y persistida si está por caducar; rehúsa si no es OAuth del proveedor. */
export async function resolveFreshConnection(deps: ExportDeps, connectionId: string, subject: ExportSubject): Promise<OAuthConnectionLike> {
  const now = deps.now ?? Date.now
  const { label } = subject
  const connection = deps.store.getById(connectionId) as OAuthConnectionLike | null
  if (!connection) throw new AuthFileError('Connection not found', 404, 'not_found')
  if (connection.provider !== subject.providerId) throw new AuthFileError(`Only ${label} provider connections can export ${label} auth files`)
  if (connection.authType !== 'oauth') throw new AuthFileError(`Only OAuth ${label} connections support ${subject.fileName} export`)
  if (!shouldRefreshConnection(connection, now())) return connection

  const refreshToken = toNonEmptyString(connection.refreshToken)
  if (!refreshToken) throw new AuthFileError(`${label} connection requires refresh but no refresh_token is available. Re-authenticate first.`, 409, 'reauth_required')
  const refreshed = await deps.refresh({ ...connection, refreshToken })
  if (refreshed && 'unrecoverable' in refreshed) {
    throw new AuthFileError(`${label} refresh token is no longer valid. Re-authenticate this account before exporting.`, 409, 'reauth_required')
  }
  if (!refreshed?.accessToken) {
    throw new AuthFileError(`Failed to refresh the ${label} session before exporting the ${subject.fileNoun}. Re-authenticate this account if the session is stale.`, 502, 'refresh_failed')
  }

  const expiresAt = refreshed.expiresAt
    || (typeof refreshed.expiresIn === 'number' ? new Date(now() + refreshed.expiresIn * MILLISECONDS_PER_SECOND).toISOString() : connection.expiresAt || null)
  const fresh: OAuthConnectionLike = {
    ...connection,
    accessToken: refreshed.accessToken,
    refreshToken: toNonEmptyString(refreshed.refreshToken) || refreshToken,
    expiresIn: typeof refreshed.expiresIn === 'number' ? refreshed.expiresIn : connection.expiresIn || null,
    expiresAt,
    providerSpecificData: refreshed.providerSpecificData ? { ...toRecord(connection.providerSpecificData), ...toRecord(refreshed.providerSpecificData) } : connection.providerSpecificData,
  }
  deps.store.update(connectionId, { accessToken: fresh.accessToken, refreshToken: fresh.refreshToken, expiresAt: fresh.expiresAt, providerSpecificData: fresh.providerSpecificData })
  return fresh
}

export interface WriteAuthFileOptions {
  /** El archivo de credenciales del CLI; lo resuelve quien llama, nunca una entrada del usuario. */
  authPath: string
  now?: () => number
  /** Una copia al historial central de respaldos, si quien llama lo tiene. */
  backup?: (authPath: string) => Promise<string | null>
}

export interface WrittenFile {
  authPath: string
  savedBakPath: string | null
  centralizedBackupPath: string | null
  /** Lo que el archivo contenía antes de escribirlo. */
  previous: JsonRecord
}

/** Copia el archivo existente al lado (`<prefijo>-<fecha>.bak`) y escribe lo que `render` produce a partir de lo anterior. */
export async function writeWithSideBackup(options: WriteAuthFileOptions & { backupPrefix: string; render: (previous: JsonRecord) => string }): Promise<WrittenFile> {
  const now = options.now ?? Date.now
  const { authPath } = options
  const authDir = dirname(authPath)
  await mkdir(authDir, { recursive: true })

  let savedBakPath: string | null = null
  try {
    await access(authPath)
    const stamp = new Date(now()).toISOString().replace(/[:.]/g, '-')
    savedBakPath = `${authDir}${sep}${options.backupPrefix}-${stamp}.bak`
    await copyFile(authPath, savedBakPath)
  } catch {
    savedBakPath = null
  }
  const centralizedBackupPath = options.backup ? await options.backup(authPath) : null

  let previous: JsonRecord = {}
  try {
    previous = toRecord(JSON.parse(await readFile(authPath, 'utf8')))
  } catch {
    // Sin archivo o con JSON inválido se parte de vacío.
  }
  await writeFile(authPath, options.render(previous), { encoding: 'utf8', mode: OWNER_ONLY })
  await chmod(authPath, OWNER_ONLY)
  return { authPath, savedBakPath, centralizedBackupPath, previous }
}
