/**
 * Exportar una conexión OAuth de codex al `auth.json` de su CLI. La escritura
 * guardada sólo lo hace si el archivo falta o está vencido: una sesión sana
 * del usuario no se pisa salvo que se fuerce.
 *
 * Porte de `omniroute: src/lib/oauth/utils/codexAuthFile.ts` (MIT); lo que
 * comparte con la exportación de Anthropic vive en `cliAuthFileExport.ts`.
 */
import { readFile } from 'node:fs/promises'

import { decodeJwtPayload } from '../jwtPayload.ts'
import {
  AuthFileError, connectionLabel, type ExportDeps, isWithinRefreshMargin, type OAuthConnectionLike, resolveFreshConnection,
  sanitizeFileNamePart, toNonEmptyString, toRecord, type WriteAuthFileOptions, writeWithSideBackup,
} from './cliAuthFileExport.ts'

export const CODEX_PROVIDER_ID = 'codex'
/** La declaración de OpenAI con la cuenta y el usuario de ChatGPT. */
export const OPENAI_AUTH_CLAIM = 'https://api.openai.com/auth'

const SUBJECT = { providerId: CODEX_PROVIDER_ID, label: 'Codex', fileName: 'auth.json', fileNoun: 'auth file' }
const MILLISECONDS_PER_SECOND = 1000
/** Sin `exp` legible, un archivo que no se refresca en seis horas se da por vencido. */
const STALE_WITHOUT_EXP_MS = 6 * 60 * 60 * 1000

export interface CodexAuthFilePayload {
  auth_mode: 'chatgpt'
  OPENAI_API_KEY: null
  tokens: { id_token: string; access_token: string; refresh_token: string; account_id: string }
  last_refresh: string
}

export interface BuiltCodexAuthFile {
  connectionId: string
  connectionLabel: string
  fileName: string
  payload: CodexAuthFilePayload
  content: string
}

function extractAccountId(idToken: string, providerSpecificData: unknown): string | null {
  const authInfo = toRecord(decodeJwtPayload(idToken)?.[OPENAI_AUTH_CLAIM])
  return toNonEmptyString(authInfo.chatgpt_account_id) || toNonEmptyString(authInfo.account_id) || toNonEmptyString(toRecord(providerSpecificData).workspaceId)
}

function extractCodexEmail(connection: OAuthConnectionLike): string | null {
  return toNonEmptyString(decodeJwtPayload(toNonEmptyString(connection.idToken))?.email) || toNonEmptyString(connection.email)
}

export function buildCodexAuthPayload(connection: OAuthConnectionLike, nowMs: number): CodexAuthFilePayload {
  const idToken = toNonEmptyString(connection.idToken)
  const accessToken = toNonEmptyString(connection.accessToken)
  const refreshToken = toNonEmptyString(connection.refreshToken)
  if (!idToken) throw new AuthFileError('Codex connection is missing id_token. Re-authenticate this account before exporting.', 409, 'reauth_required')
  if (!accessToken) throw new AuthFileError('Codex connection is missing access_token. Refresh or re-authenticate this account first.', 409, 'access_token_missing')
  if (!refreshToken) throw new AuthFileError('Codex connection is missing refresh_token. Re-authenticate this account before exporting.', 409, 'reauth_required')
  const accountId = extractAccountId(idToken, connection.providerSpecificData)
  if (!accountId) throw new AuthFileError('Unable to derive Codex account_id from the stored session. Re-authenticate this account.', 409, 'account_id_missing')
  return {
    auth_mode: 'chatgpt',
    OPENAI_API_KEY: null,
    tokens: { id_token: idToken, access_token: accessToken, refresh_token: refreshToken, account_id: accountId },
    last_refresh: new Date(nowMs).toISOString(),
  }
}

export async function buildCodexAuthFile(deps: ExportDeps, connectionId: string): Promise<BuiltCodexAuthFile> {
  const connection = await resolveFreshConnection(deps, connectionId, SUBJECT)
  const payload = buildCodexAuthPayload(connection, (deps.now ?? Date.now)())
  const label = connectionLabel(connection, 'codex-account')
  return {
    connectionId,
    connectionLabel: label,
    fileName: `auth-${sanitizeFileNamePart(extractCodexEmail(connection) || label)}.json`,
    payload,
    content: `${JSON.stringify(payload, null, 2)}\n`,
  }
}

export interface WrittenCodexAuthFile extends BuiltCodexAuthFile {
  authPath: string
  savedBakPath: string | null
  centralizedBackupPath: string | null
}

/** Reemplaza el archivo entero, con copia `auth-<fecha>.bak` al lado del anterior. */
export async function writeCodexAuthFile(built: BuiltCodexAuthFile, options: WriteAuthFileOptions): Promise<WrittenCodexAuthFile> {
  const written = await writeWithSideBackup({ ...options, backupPrefix: 'auth', render: () => built.content })
  return { ...built, authPath: written.authPath, savedBakPath: written.savedBakPath, centralizedBackupPath: written.centralizedBackupPath }
}

/** Vencido por el `exp` del access token; si no lo tiene, por seis horas desde su último refresco; si nada se lee, sano. */
export function isCodexAuthStale(payload: CodexAuthFilePayload, nowMs: number): boolean {
  const exp = decodeJwtPayload(toNonEmptyString(payload?.tokens?.access_token))?.exp
  if (typeof exp === 'number' && exp) return isWithinRefreshMargin(exp * MILLISECONDS_PER_SECOND, nowMs)
  const lastRefresh = toNonEmptyString(payload?.last_refresh)
  if (lastRefresh) {
    const refreshedMs = new Date(lastRefresh).getTime()
    if (!Number.isNaN(refreshedMs)) return nowMs - refreshedMs >= STALE_WITHOUT_EXP_MS
  }
  return false
}

async function readExistingCodexAuth(authPath: string): Promise<CodexAuthFilePayload | null> {
  try {
    const parsed = JSON.parse(await readFile(authPath, 'utf8')) as unknown
    return toNonEmptyString(toRecord(toRecord(parsed).tokens).access_token) ? (parsed as CodexAuthFilePayload) : null
  } catch {
    return null
  }
}

export type CodexAuthWriteDecision = 'written' | 'skipped_present_fresh'

/** Escribe sólo si el archivo falta, está vencido o se fuerza. */
export async function writeCodexAuthFileIfNeeded(
  deps: ExportDeps,
  connectionId: string,
  options: WriteAuthFileOptions & { force?: boolean },
): Promise<{ decision: CodexAuthWriteDecision; authPath: string; result?: WrittenCodexAuthFile }> {
  if (!options.force) {
    const existing = await readExistingCodexAuth(options.authPath)
    if (existing && !isCodexAuthStale(existing, (deps.now ?? Date.now)())) return { decision: 'skipped_present_fresh', authPath: options.authPath }
  }
  const result = await writeCodexAuthFile(await buildCodexAuthFile(deps, connectionId), options)
  return { decision: 'written', authPath: result.authPath, result }
}
