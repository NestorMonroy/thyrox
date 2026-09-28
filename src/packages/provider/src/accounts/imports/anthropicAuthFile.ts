/**
 * Exportar una conexión OAuth de Anthropic al archivo de credenciales de su
 * CLI, conservando todo lo que el CLI guardó junto a los tokens (sus OAuth de
 * MCP).
 *
 * Porte de `omniroute: src/lib/oauth/utils/claudeAuthFile.ts` (MIT); lo que
 * comparte con la exportación de codex vive en `cliAuthFileExport.ts`.
 */
import {
  AuthFileError, connectionLabel, type ExportDeps, type OAuthConnectionLike, resolveFreshConnection,
  sanitizeFileNamePart, toNonEmptyString, toRecord, type WriteAuthFileOptions, writeWithSideBackup,
} from './cliAuthFileExport.ts'

/** El identificador del proveedor en el store, el de la referencia. */
export const ANTHROPIC_PROVIDER_ID = 'claude'

const SUBJECT = { providerId: ANTHROPIC_PROVIDER_ID, label: 'Anthropic', fileName: 'credentials.json', fileNoun: 'credentials file' }

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

export function anthropicConnectionLabel(connection: OAuthConnectionLike): string {
  return connectionLabel(connection, 'anthropic-account')
}

export function extractAnthropicEmail(connection: OAuthConnectionLike): string | null {
  return toNonEmptyString(toRecord(connection.providerSpecificData).bootstrapEmail) || toNonEmptyString(connection.email) || toNonEmptyString(connection.displayName)
}

export function buildAnthropicAuthPayload(connection: OAuthConnectionLike): AnthropicAuthFilePayload {
  const accessToken = toNonEmptyString(connection.accessToken)
  const refreshToken = toNonEmptyString(connection.refreshToken)
  if (!accessToken) throw new AuthFileError('Anthropic connection is missing access_token. Refresh or re-authenticate this account first.', 409, 'access_token_missing')
  if (!refreshToken) throw new AuthFileError('Anthropic connection is missing refresh_token. Re-authenticate this account before exporting.', 409, 'reauth_required')
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

export async function buildAnthropicAuthFile(deps: ExportDeps, connectionId: string): Promise<BuiltAnthropicAuthFile> {
  const connection = await resolveFreshConnection(deps, connectionId, SUBJECT)
  const payload = buildAnthropicAuthPayload(connection)
  const label = anthropicConnectionLabel(connection)
  const email = extractAnthropicEmail(connection)
  return {
    connectionId,
    connectionLabel: label,
    email,
    fileName: `anthropic-auth-${sanitizeFileNamePart(email || label)}.json`,
    payload,
    content: `${JSON.stringify(payload, null, 2)}\n`,
  }
}

export interface WrittenAnthropicAuthFile extends BuiltAnthropicAuthFile {
  authPath: string
  savedBakPath: string | null
  centralizedBackupPath: string | null
  mcpOAuthPreserved: boolean
}

/** Escribe los tokens sin tocar lo demás que el archivo guarda. */
export async function writeAnthropicAuthFile(built: BuiltAnthropicAuthFile, options: WriteAuthFileOptions): Promise<WrittenAnthropicAuthFile> {
  const written = await writeWithSideBackup({
    ...options,
    backupPrefix: 'credentials',
    render: previous => `${JSON.stringify({ ...previous, claudeAiOauth: built.payload.claudeAiOauth }, null, 2)}\n`,
  })
  return { ...built, authPath: written.authPath, savedBakPath: written.savedBakPath, centralizedBackupPath: written.centralizedBackupPath, mcpOAuthPreserved: !!written.previous.mcpOAuth }
}
