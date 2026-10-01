/**
 * Importar las cuentas que CLIProxyAPI guardó en su directorio: un JSON por
 * cuenta, con un `type` que nombra al proveedor. Se leen, se normalizan a
 * conexión y se guardan; la vista previa nunca lleva tokens.
 *
 * Porte de `omniroute: src/lib/oauth/utils/cliProxyAuthImport.ts` y
 * `app/api/oauth/cliproxy-import/route.ts` (MIT).
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { ConnectionStore } from '../connectionStore.ts'
import { type Environment, readVariable } from '../oauth/flows/clientId.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'

/** El `type` de CLIProxyAPI → el proveedor; los que no están no se importan. */
export const CLIPROXY_TYPE_TO_PROVIDER: Record<string, string> = {
  anthropic: 'claude',
  claude: 'claude',
  codex: 'codex',
  antigravity: 'antigravity',
  kimi: 'kimi',
  meta: 'muse-code',
}

const CONFIG_DIR_VARIABLE = 'THYROX_CLIPROXYAPI_CONFIG_DIR'
const DEFAULT_CONFIG_DIR = '.cli-proxy-api'
const IMPORTED_FROM = 'cliproxyapi'
const MUSE_PROVIDER = 'muse-code'
const DCA_PREFIX = 'dca:'
/** Por debajo, un `expired` numérico son segundos unix; por encima, milisegundos. */
const SECONDS_CEILING = 1e12
const MILLISECONDS_PER_SECOND = 1000

export interface ParsedCliProxyAuth {
  provider: string
  type: string
  email: string | null
  accessToken: string
  refreshToken: string | null
  expiresAt: string | null
  projectId: string | null
  providerSpecificData?: JsonRecord
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** `expired` absoluto (RFC 3339, segundos o milisegundos) o `expires_in` relativo a `nowMs`. */
export function resolveCliProxyExpiry(record: JsonRecord, nowMs: number): string | null {
  const expired = record.expired
  if (typeof expired === 'string' && expired.trim()) {
    const ms = Date.parse(expired)
    if (Number.isFinite(ms)) return new Date(ms).toISOString()
  }
  if (typeof expired === 'number' && Number.isFinite(expired) && expired > 0) {
    return new Date(expired < SECONDS_CEILING ? expired * MILLISECONDS_PER_SECOND : expired).toISOString()
  }
  const expiresIn = record.expires_in
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0) return new Date(nowMs + expiresIn * MILLISECONDS_PER_SECOND).toISOString()
  return null
}

/** Muse guarda la clave de inferencia acuñada y el token DCA con que se acuña otra. */
function parseMuseRecord(record: JsonRecord, type: string, accessToken: string | null, nowMs: number): ParsedCliProxyAuth | null {
  const isDca = (value: string | null) => Boolean(value?.startsWith(DCA_PREFIX))
  const dcaToken = asString(record.dca_token) || (isDca(accessToken) ? accessToken : null)
  const apiKey = asString(record.api_key)
  const inferenceKey = apiKey && !isDca(apiKey) ? apiKey : accessToken && !isDca(accessToken) ? accessToken : ''
  if (!inferenceKey && !dcaToken) return null
  const email = asString(record.email)
  return {
    provider: MUSE_PROVIDER,
    type,
    email,
    accessToken: inferenceKey || (dcaToken as string),
    refreshToken: dcaToken,
    // Una clave acuñada no hereda el reloj del token DCA.
    expiresAt: inferenceKey ? null : resolveCliProxyExpiry(record, nowMs),
    projectId: null,
    providerSpecificData: {
      dcaToken: dcaToken ?? undefined,
      baseUrl: asString(record.base_url) ?? undefined,
      email: email ?? undefined,
      name: asString(record.name) ?? undefined,
      authKind: asString(record.auth_kind) || 'oauth',
      importedFrom: IMPORTED_FROM,
    },
  }
}

/** Un archivo de cuenta, o `null` si no es una credencial OAuth soportada. */
export function parseCliProxyAuthRecord(raw: unknown, nowMs: number): ParsedCliProxyAuth | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as JsonRecord
  const type = asString(record.type)?.toLowerCase()
  const provider = type ? CLIPROXY_TYPE_TO_PROVIDER[type] : undefined
  if (!type || !provider) return null
  const accessToken = asString(record.access_token)
  if (provider === MUSE_PROVIDER) return parseMuseRecord(record, type, accessToken, nowMs)
  if (!accessToken) return null
  return {
    provider,
    type,
    email: asString(record.email),
    accessToken,
    refreshToken: asString(record.refresh_token),
    expiresAt: resolveCliProxyExpiry(record, nowMs),
    projectId: asString(record.project_id) ?? asString(record.projectId),
  }
}

export function toConnectionPayload(parsed: ParsedCliProxyAuth, nowMs: number): JsonRecord {
  return {
    provider: parsed.provider,
    authType: 'oauth',
    email: parsed.email ?? undefined,
    name: parsed.email || `${parsed.provider} (CLIProxyAPI import)`,
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken ?? undefined,
    expiresAt: parsed.expiresAt ?? undefined,
    testStatus: 'active',
    providerSpecificData: {
      ...(parsed.projectId ? { projectId: parsed.projectId } : {}),
      ...parsed.providerSpecificData,
      importedFrom: IMPORTED_FROM,
      importedAt: new Date(nowMs).toISOString(),
    },
  }
}

export function cliProxyConfigDir(env: Environment, home: string): string {
  return readVariable(env, CONFIG_DIR_VARIABLE) ?? join(home, DEFAULT_CONFIG_DIR)
}

/** Cada `*.json` del directorio; el que no se lee o no se soporta cuenta como omitido. */
export async function scanCliProxyAuthDir(dir: string, nowMs: number): Promise<{ candidates: ParsedCliProxyAuth[]; skipped: number; scanned: number }> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return { candidates: [], skipped: 0, scanned: 0 }
  }
  const jsonFiles = entries.filter(file => file.toLowerCase().endsWith('.json'))
  const candidates: ParsedCliProxyAuth[] = []
  let skipped = 0
  for (const file of jsonFiles) {
    try {
      const parsed = parseCliProxyAuthRecord(JSON.parse(await readFile(join(dir, file), 'utf8')), nowMs)
      if (parsed) candidates.push(parsed)
      else skipped++
    } catch {
      skipped++
    }
  }
  return { candidates, skipped, scanned: jsonFiles.length }
}

/** Lo que se puede mostrar de cada cuenta: nunca sus tokens. */
export function previewCliProxyAccounts(candidates: ParsedCliProxyAuth[]): { provider: string; type: string; email: string | null }[] {
  return candidates.map(candidate => ({ provider: candidate.provider, type: candidate.type, email: candidate.email }))
}

export interface CliProxyImportResult {
  provider: string
  email: string | null
  ok: boolean
  error?: string
}

/** Guarda cada cuenta; la que el store rechaza se informa y no corta las demás. */
export function importCliProxyAccounts(store: ConnectionStore, candidates: ParsedCliProxyAuth[], nowMs: number): { imported: number; results: CliProxyImportResult[] } {
  let imported = 0
  const results: CliProxyImportResult[] = []
  for (const candidate of candidates) {
    try {
      store.create(toConnectionPayload(candidate, nowMs))
      imported++
      results.push({ provider: candidate.provider, email: candidate.email, ok: true })
    } catch (error) {
      results.push({ provider: candidate.provider, email: candidate.email, ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return { imported, results }
}
