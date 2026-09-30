/**
 * Importar el archivo de tokens del CLI de Antigravity (`agy`) como conexión:
 * se validan los dos tokens, la cuenta y su proyecto de Cloud Code se
 * identifican contra Google (de mejor esfuerzo y con plazo), y la misma
 * cuenta no se duplica salvo que se pida sobrescribirla.
 *
 * Porte de `omniroute: src/lib/oauth/utils/agyAuthImport.ts` (MIT).
 */
import { codeAssistHeaders, type ClientVersionsView, LOAD_CODE_ASSIST_ENDPOINTS, loadCodeAssistMetadata } from '../antigravity/clientIdentity.ts'
import { createClientVersions } from '../antigravity/clientVersion.ts'
import { codeAssistOnboardTierId } from '../antigravity/codeAssistTier.ts'
import type { ConnectionStore } from '../connectionStore.ts'
import { degradedProjectState, persistStatus } from '../oauth/antigravityProjectGate.ts'
import { antigravityOAuthConfig } from '../oauth/flows/antigravityFlow.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'
import { AuthFileError, toNonEmptyString, toRecord } from './cliAuthFileExport.ts'

export const AGY_PROVIDER_ID = 'agy'
const BACKEND_TIMEOUT_MS = 8000
const IMPORTED_NAME = 'Antigravity CLI (imported)'
/** El cliente público del CLI emitió el token: el refresco tiene que usar ése, no uno propio. */
const BUILTIN_OAUTH_CLIENT = 'builtin'
const CLI_PROFILE = 'cli'

export interface ParsedAgyAuth {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresAt: string | null
  authMethod: string | null
}

export interface EnrichedAgyAuth extends ParsedAgyAuth {
  email: string | null
  projectId: string | null
  tier: string | null
}

export interface CreateAgyConnectionOptions {
  name?: string
  email?: string
  overwriteExisting?: boolean
}

/** `agy` anida el token bajo `.token`, con `expiry` ISO y sin id token; la forma plana también vale. */
export function parseAndValidateAgyToken(raw: unknown): ParsedAgyAuth {
  const doc = toRecord(raw)
  const token = doc.token && typeof doc.token === 'object' ? toRecord(doc.token) : doc
  const accessToken = toNonEmptyString(token.access_token)
  const refreshToken = toNonEmptyString(token.refresh_token)
  if (!accessToken) throw new AuthFileError('access_token is missing or empty in the agy token file', 400, 'missing_access_token')
  if (!refreshToken) throw new AuthFileError('refresh_token is missing or empty in the agy token file', 400, 'missing_refresh_token')

  let expiresAt: string | null = null
  const isoExpiry = toNonEmptyString(token.expiry) ?? toNonEmptyString(token.expires_at)
  if (isoExpiry) {
    const ms = new Date(isoExpiry).getTime()
    expiresAt = Number.isNaN(ms) ? null : new Date(ms).toISOString()
  } else if (typeof token.expiry_date === 'number' && Number.isFinite(token.expiry_date)) {
    expiresAt = new Date(token.expiry_date).toISOString()
  }
  return {
    accessToken,
    refreshToken,
    tokenType: toNonEmptyString(token.token_type) ?? 'Bearer',
    expiresAt,
    authMethod: toNonEmptyString(doc.auth_method) ?? toNonEmptyString(token.auth_method),
  }
}

export interface AntigravityBackendDeps {
  fetch?: typeof globalThis.fetch
  versions?: ClientVersionsView
  platform?: string
  arch?: string
  timeoutMs?: number
}

async function withTimeBox<T>(timeoutMs: number, work: (signal: AbortSignal) => Promise<T>, fallback: T): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await work(controller.signal)
  } catch {
    return fallback
  } finally {
    clearTimeout(timer)
  }
}

/**
 * El correo (userinfo) y el proyecto con su nivel (loadCodeAssist). El CLI ya
 * onboardó la cuenta, así que aquí no se corre el onboarding.
 */
export async function enrichWithAntigravityBackend(parsed: ParsedAgyAuth, deps: AntigravityBackendDeps = {}): Promise<EnrichedAgyAuth> {
  const fetch = deps.fetch ?? globalThis.fetch
  const timeoutMs = deps.timeoutMs ?? BACKEND_TIMEOUT_MS
  const versions = deps.versions ?? createClientVersions()

  const email = await withTimeBox(
    timeoutMs,
    async signal => {
      const response = await fetch(`${antigravityOAuthConfig({}).userInfoUrl}?alt=json`, { headers: { Authorization: `Bearer ${parsed.accessToken}` }, signal })
      return response.ok ? toNonEmptyString(toRecord(await response.json()).email) : null
    },
    null,
  )

  const project = await withTimeBox(
    timeoutMs,
    async signal => {
      const headers = codeAssistHeaders(CLI_PROFILE, versions, parsed.accessToken)
      const metadata = loadCodeAssistMetadata(deps.platform, deps.arch)
      for (const endpoint of LOAD_CODE_ASSIST_ENDPOINTS) {
        try {
          const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ metadata }), signal })
          if (!response.ok) continue
          const data = toRecord(await response.json())
          const declared = data.cloudaicompanionProject
          const projectId = (typeof declared === 'string' ? toNonEmptyString(declared) : null) ?? toNonEmptyString(toRecord(declared).id)
          return { projectId, tier: codeAssistOnboardTierId(data) }
        } catch {
          // el siguiente extremo
        }
      }
      return { projectId: null, tier: null }
    },
    { projectId: null, tier: null } as { projectId: string | null; tier: string | null },
  )

  return { ...parsed, email, ...project }
}

/** La conexión `agy` de la misma cuenta, sin distinguir mayúsculas. */
export function findExistingAgyConnection(store: ConnectionStore, email: string): JsonRecord | null {
  const wanted = email.toLowerCase()
  return store.list({ provider: AGY_PROVIDER_ID }).find(connection => toNonEmptyString(connection.email)?.toLowerCase() === wanted) ?? null
}

function projectStatus(enriched: EnrichedAgyAuth): JsonRecord {
  const projectId = enriched.projectId ?? ''
  return persistStatus(degradedProjectState(AGY_PROVIDER_ID, { projectId, providerSpecificData: { projectId, clientProfile: CLI_PROFILE } }))
}

function tokenData(enriched: EnrichedAgyAuth, importedAt: string): JsonRecord {
  return { clientProfile: CLI_PROFILE, tokenType: enriched.tokenType, authMethod: enriched.authMethod, oauthClient: BUILTIN_OAUTH_CLIENT, importedAt }
}

export function createConnectionFromAgyToken(store: ConnectionStore, enriched: EnrichedAgyAuth, options: CreateAgyConnectionOptions, deps: { now?: () => number } = {}): { connection: JsonRecord; created: boolean } {
  const importedAt = new Date((deps.now ?? Date.now)()).toISOString()
  const email = options.email || enriched.email

  if (email) {
    const existing = findExistingAgyConnection(store, email)
    if (existing) {
      if (!options.overwriteExisting) {
        throw new AuthFileError('An Antigravity CLI connection for this account already exists. Pass overwriteExisting: true to replace it.', 409, 'duplicate_account')
      }
      const existingData = toRecord(existing.providerSpecificData)
      const updated = store.update(existing.id as string, {
        accessToken: enriched.accessToken,
        refreshToken: enriched.refreshToken,
        expiresAt: enriched.expiresAt,
        email,
        name: options.name || (existing.name as string | undefined) || email,
        ...projectStatus(enriched),
        isActive: true,
        // `autoSync` va antes de lo guardado: la elección previa del operador gana.
        providerSpecificData: {
          autoSync: true,
          ...existingData,
          ...tokenData(enriched, importedAt),
          projectId: enriched.projectId ?? existingData.projectId,
          tier: enriched.tier ?? existingData.tier,
        },
      })
      return { connection: updated || existing, created: false }
    }
  } else if (!options.overwriteExisting) {
    throw new AuthFileError('Could not verify the account email from the agy token (no userinfo). Pass overwriteExisting: true to import without email verification.', 409, 'identity_unverified')
  }

  const connection = store.create({
    provider: AGY_PROVIDER_ID,
    authType: 'oauth',
    name: options.name || email || IMPORTED_NAME,
    email: email || undefined,
    accessToken: enriched.accessToken,
    refreshToken: enriched.refreshToken,
    expiresAt: enriched.expiresAt,
    isActive: true,
    ...projectStatus(enriched),
    providerSpecificData: { autoSync: true, ...tokenData(enriched, importedAt), projectId: enriched.projectId, tier: enriched.tier },
  })
  if (!connection) throw new AuthFileError('Could not store the imported connection', 500, 'store_failed')
  return { connection, created: true }
}
