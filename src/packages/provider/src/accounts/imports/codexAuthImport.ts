/**
 * Importar el `auth.json` del CLI de codex como conexión. La cuenta del
 * espacio de trabajo no basta para identificarla: dos miembros del mismo
 * equipo la comparten, así que se deduplica por cuenta Y por usuario. La
 * caducidad se lee del access token antes que del id token, que puede estar
 * vencido con la sesión todavía viva. No se refresca al importar: un archivo
 * exportado suele estar ya rotado, y refrescarlo invalidaría la familia de
 * tokens entera.
 *
 * Porte de `omniroute: src/lib/oauth/utils/codexAuthImport.ts` (MIT).
 */
import type { ConnectionStore } from '../connectionStore.ts'
import { pickCodexConnectionForUser } from '../connectionIdentity.ts'
import { decodeJwtPayload } from '../jwtPayload.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'
import { AuthFileError, toNonEmptyString, toRecord } from './cliAuthFileExport.ts'
import { CODEX_PROVIDER_ID, OPENAI_AUTH_CLAIM } from './codexAuthFile.ts'

const MILLISECONDS_PER_SECOND = 1000
const IMPORTED_NAME = 'Codex (imported)'

export interface ParsedCodexAuth {
  idToken: string
  accessToken: string
  refreshToken: string
  accountId: string
  /** El usuario dentro del espacio de trabajo: `chatgpt_user_id`, `user_id` o el `sub` del JWT. */
  userId: string | null
  email: string | null
  expiresAt: string | null
}

export interface CreateCodexConnectionOptions {
  name?: string
  email?: string
  overwriteExisting?: boolean
}

function expiryOf(token: string): string | null {
  const exp = decodeJwtPayload(token)?.exp
  return typeof exp === 'number' && Number.isFinite(exp) ? new Date(exp * MILLISECONDS_PER_SECOND).toISOString() : null
}

export function parseAndValidateCodexAuth(raw: unknown): ParsedCodexAuth {
  const doc = toRecord(raw)
  // El CLI actual ya no escribe `auth_mode`; si viene, tiene que ser el de ChatGPT.
  if (doc.auth_mode !== undefined && doc.auth_mode !== null && doc.auth_mode !== 'chatgpt') {
    throw new AuthFileError('Not a Codex auth.json — unexpected auth_mode value', 400, 'invalid_auth_file')
  }
  const tokens = toRecord(doc.tokens)
  const idToken = toNonEmptyString(tokens.id_token)
  const accessToken = toNonEmptyString(tokens.access_token)
  const refreshToken = toNonEmptyString(tokens.refresh_token)
  if (!idToken) throw new AuthFileError('id_token is missing or empty in the auth.json', 400, 'missing_id_token')
  if (!accessToken) throw new AuthFileError('access_token is missing or empty in the auth.json', 400, 'missing_access_token')
  if (!refreshToken) throw new AuthFileError('refresh_token is missing or empty in the auth.json', 400, 'missing_refresh_token')

  const claims = decodeJwtPayload(idToken)
  const authInfo = toRecord(claims?.[OPENAI_AUTH_CLAIM])
  const accountId = toNonEmptyString(tokens.account_id) || toNonEmptyString(authInfo.chatgpt_account_id) || toNonEmptyString(authInfo.account_id)
  if (!accountId) throw new AuthFileError('Unable to derive account_id from the auth.json tokens', 400, 'missing_account_id')
  return {
    idToken,
    accessToken,
    refreshToken,
    accountId,
    userId: claims ? toNonEmptyString(authInfo.chatgpt_user_id) || toNonEmptyString(authInfo.user_id) || toNonEmptyString(claims.sub) : null,
    email: toNonEmptyString(claims?.email),
    expiresAt: expiryOf(accessToken) ?? expiryOf(idToken),
  }
}

/** La conexión del mismo usuario en el mismo espacio de trabajo; sin usuario, la primera del espacio. */
function findExistingCodexConnection(store: ConnectionStore, accountId: string, userId: string | null, email: string | null): JsonRecord | null {
  const workspaceMatches = store
    .list({ provider: CODEX_PROVIDER_ID, authType: 'oauth' })
    .filter(connection => toNonEmptyString(toRecord(connection.providerSpecificData).workspaceId) === accountId)
  if (workspaceMatches.length === 0) return null
  if (!userId) return workspaceMatches[0]!
  return pickCodexConnectionForUser(workspaceMatches, userId, email)
}

export function createConnectionFromCodexAuthFile(store: ConnectionStore, parsed: ParsedCodexAuth, options: CreateCodexConnectionOptions, deps: { now?: () => number } = {}): { connection: JsonRecord; created: boolean } {
  const importedAt = new Date((deps.now ?? Date.now)()).toISOString()
  const existing = findExistingCodexConnection(store, parsed.accountId, parsed.userId, options.email || parsed.email || null)
  if (existing) {
    if (!options.overwriteExisting) throw new AuthFileError('A Codex connection for this account already exists. Pass overwriteExisting: true to replace it.', 409, 'duplicate_account')
    const updated = store.update(existing.id as string, {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      idToken: parsed.idToken,
      expiresAt: parsed.expiresAt,
      email: options.email || parsed.email || (existing.email as string | undefined),
      name: options.name || (existing.name as string | undefined) || options.email || parsed.email || IMPORTED_NAME,
      testStatus: 'active',
      providerSpecificData: {
        ...toRecord(existing.providerSpecificData),
        workspaceId: parsed.accountId,
        // Una importación antigua no traía usuario: se conserva el ya guardado.
        chatgptUserId: parsed.userId ?? toNonEmptyString(toRecord(existing.providerSpecificData).chatgptUserId),
        importedAt,
      },
    })
    return { connection: updated || existing, created: false }
  }
  const connection = store.create({
    provider: CODEX_PROVIDER_ID,
    authType: 'oauth',
    name: options.name || options.email || parsed.email || IMPORTED_NAME,
    email: options.email || parsed.email || undefined,
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    idToken: parsed.idToken,
    expiresAt: parsed.expiresAt,
    isActive: true,
    testStatus: 'active',
    providerSpecificData: { workspaceId: parsed.accountId, chatgptUserId: parsed.userId, importedAt },
  })
  if (!connection) throw new AuthFileError('Could not store the imported connection', 500, 'store_failed')
  return { connection, created: true }
}
