/**
 * Importar el archivo de credenciales del CLI de Anthropic como conexión: se
 * validan los dos tokens, el bootstrap del servicio nombra la cuenta y su
 * organización (de mejor esfuerzo), y la misma cuenta no se duplica salvo que
 * se pida sobrescribirla — conservando entonces su identidad de dispositivo.
 *
 * Porte de `omniroute: src/lib/oauth/utils/claudeAuthImport.ts` (MIT).
 */
import { randomBytes } from 'node:crypto'

import type { ConnectionStore } from '../connectionStore.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'
import { ANTHROPIC_PROVIDER_ID } from './anthropicAuthFile.ts'
import { AuthFileError, toNonEmptyString, toRecord } from './cliAuthFileExport.ts'

const BOOTSTRAP_URL = 'https://api.anthropic.com/api/claude_cli/bootstrap'
const BOOTSTRAP_TIMEOUT_MS = 8000
const DEVICE_ID_BYTES = 32
const IMPORTED_NAME = 'Anthropic (imported)'

export interface ParsedAnthropicAuth {
  accessToken: string
  refreshToken: string
  expiresAt: string | null
  scopes: string[]
  subscriptionType: string | null
  rateLimitTier: string | null
  email: string | null
}

export interface EnrichedAnthropicAuth extends ParsedAnthropicAuth {
  accountUUID: string | null
  organizationUUID: string | null
  organizationName: string | null
  organizationType: string | null
}

export interface CreateConnectionOptions {
  name?: string
  email?: string
  overwriteExisting?: boolean
}

export function parseAndValidateAnthropicAuth(raw: unknown): ParsedAnthropicAuth {
  const block = toRecord(toRecord(raw).claudeAiOauth)
  const accessToken = toNonEmptyString(block.accessToken)
  const refreshToken = toNonEmptyString(block.refreshToken)
  if (!accessToken) throw new AuthFileError('accessToken is missing or empty in claudeAiOauth', 400, 'missing_access_token')
  if (!refreshToken) throw new AuthFileError('refreshToken is missing or empty in claudeAiOauth', 400, 'missing_refresh_token')
  let expiresAt: string | null = null
  if (typeof block.expiresAt === 'number' && Number.isFinite(block.expiresAt)) expiresAt = new Date(block.expiresAt).toISOString()
  else if (typeof block.expiresAt === 'string' && block.expiresAt.trim()) expiresAt = block.expiresAt.trim()
  return {
    accessToken,
    refreshToken,
    expiresAt,
    scopes: Array.isArray(block.scopes) ? block.scopes.filter((scope): scope is string => typeof scope === 'string') : [],
    subscriptionType: toNonEmptyString(block.subscriptionType),
    rateLimitTier: toNonEmptyString(block.rateLimitTier),
    email: null,
  }
}

/** El bootstrap del servicio nombra la cuenta; si falla, los campos quedan nulos y la importación sigue. */
export async function enrichWithBootstrap(parsed: ParsedAnthropicAuth, deps: { fetch?: typeof globalThis.fetch; userAgent: string; timeoutMs?: number }): Promise<EnrichedAnthropicAuth> {
  const fetch = deps.fetch ?? globalThis.fetch
  const base: EnrichedAnthropicAuth = { ...parsed, accountUUID: null, organizationUUID: null, organizationName: null, organizationType: null }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? BOOTSTRAP_TIMEOUT_MS)
  try {
    const response = await fetch(BOOTSTRAP_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${parsed.accessToken}`,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'User-Agent': deps.userAgent,
        'anthropic-beta': 'oauth-2025-04-20',
      },
      signal: controller.signal,
    })
    if (!response.ok) return base
    const body = toRecord(await response.json())
    return {
      ...base,
      accountUUID: toNonEmptyString(body.account_uuid),
      organizationUUID: toNonEmptyString(body.organization_uuid),
      organizationName: toNonEmptyString(body.organization_name),
      organizationType: toNonEmptyString(body.organization_type),
      rateLimitTier: toNonEmptyString(body.rate_limit_tier) || parsed.rateLimitTier,
      email: parsed.email || toNonEmptyString(body.account_email),
    }
  } catch {
    return base
  } finally {
    clearTimeout(timer)
  }
}

/** La conexión de Anthropic con la misma cuenta, sin distinguir mayúsculas. */
export function findExistingAnthropicConnection(store: ConnectionStore, accountUUID: string): JsonRecord | null {
  const wanted = accountUUID.toLowerCase()
  return store.list({ provider: ANTHROPIC_PROVIDER_ID }).find(connection => toNonEmptyString(toRecord(connection.providerSpecificData).accountUUID)?.toLowerCase() === wanted) ?? null
}

export interface ImportDeps {
  now?: () => number
  /** La identidad de dispositivo nueva: 32 bytes en hexadecimal. */
  randomHex?: () => string
}

function accountData(enriched: EnrichedAnthropicAuth, importedAt: string): JsonRecord {
  return {
    accountUUID: enriched.accountUUID,
    organizationUUID: enriched.organizationUUID,
    organizationName: enriched.organizationName,
    organizationType: enriched.organizationType,
    rateLimitTier: enriched.rateLimitTier,
    scopes: enriched.scopes,
    subscriptionType: enriched.subscriptionType,
    bootstrapEmail: enriched.email,
    importedAt,
  }
}

export function createConnectionFromAuthFile(store: ConnectionStore, enriched: EnrichedAnthropicAuth, options: CreateConnectionOptions, deps: ImportDeps = {}): { connection: JsonRecord; created: boolean } {
  const importedAt = new Date((deps.now ?? Date.now)()).toISOString()
  const newDeviceId = deps.randomHex ?? (() => randomBytes(DEVICE_ID_BYTES).toString('hex'))

  if (enriched.accountUUID) {
    const existing = findExistingAnthropicConnection(store, enriched.accountUUID)
    if (existing) {
      if (!options.overwriteExisting) {
        throw new AuthFileError('An Anthropic connection for this account already exists. Pass overwriteExisting: true to replace it.', 409, 'duplicate_account')
      }
      const existingData = toRecord(existing.providerSpecificData)
      const updated = store.update(existing.id as string, {
        accessToken: enriched.accessToken,
        refreshToken: enriched.refreshToken,
        expiresAt: enriched.expiresAt,
        email: options.email || enriched.email || (existing.email as string | undefined) || undefined,
        name: options.name || (existing.name as string | undefined) || options.email || enriched.email || IMPORTED_NAME,
        testStatus: 'active',
        // La identidad de dispositivo se conserva: una nueva en cada importación se vería como otro dispositivo.
        providerSpecificData: { ...existingData, ...accountData(enriched, importedAt), cliUserID: toNonEmptyString(existingData.cliUserID) || newDeviceId() },
      })
      return { connection: updated || existing, created: false }
    }
  }

  if (!enriched.email && !enriched.accountUUID && !options.overwriteExisting) {
    throw new AuthFileError('Could not verify the account identity (bootstrap failed and no email/accountUUID available). Pass overwriteExisting: true to import anyway.', 409, 'identity_unverified')
  }
  const connection = store.create({
    provider: ANTHROPIC_PROVIDER_ID,
    authType: 'oauth',
    name: options.name || options.email || enriched.email || IMPORTED_NAME,
    email: options.email || enriched.email || undefined,
    accessToken: enriched.accessToken,
    refreshToken: enriched.refreshToken,
    expiresAt: enriched.expiresAt,
    isActive: true,
    testStatus: 'active',
    providerSpecificData: { ...accountData(enriched, importedAt), cliUserID: newDeviceId() },
  })
  if (!connection) throw new AuthFileError('Could not store the imported connection', 500, 'store_failed')
  return { connection, created: true }
}
