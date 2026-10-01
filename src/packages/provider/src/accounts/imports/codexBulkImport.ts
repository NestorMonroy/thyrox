/**
 * La importación masiva de codex: cada registro subido —del exportador de
 * 9router en camelCase, de otros en snake_case o el propio `auth.json` del
 * CLI con los tokens anidados— se normaliza en la carga de una conexión
 * activa y limpia de fallos anteriores. Puro: sin E/S ni red.
 *
 * Porte de `omniroute: src/lib/oauth/services/codexImport.ts` (MIT).
 */
import { decodeJwtPayload } from '../jwtPayload.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'
import { toRecord } from './cliAuthFileExport.ts'
import { OPENAI_AUTH_CLAIM } from './codexAuthFile.ts'

const REQUIRED_FIELDS = ['access_token', 'refresh_token'] as const
/** Sin caducidad declarada ni `exp`, la vida típica de un access token de OpenAI: diez días. */
const DEFAULT_EXPIRY_MS = 10 * 24 * 60 * 60 * 1000
const MILLISECONDS_PER_SECOND = 1000

export interface CodexImportPayload {
  provider: 'codex'
  authType: 'oauth'
  accessToken: string
  refreshToken: string
  idToken?: string
  email: string
  expiresAt: string
  /** Igual que `expiresAt`: la salud del token lo lee de aquí y un valor viejo mostraría «caducado». */
  tokenExpiresAt: string
  testStatus: 'active'
  isActive: true
  errorCode: null
  lastError: null
  lastErrorAt: null
  lastErrorType: null
  lastErrorSource: null
  backoffLevel: 0
  rateLimitedUntil: null
  priority?: number
  providerSpecificData?: { chatgptAccountId?: string; workspaceId?: string; chatgptPlanType?: string; [key: string]: unknown }
}

export type NormalizeResult = { ok: true; payload: CodexImportPayload } | { ok: false; error: string }
export type FlattenResult = { ok: true; records: unknown[] } | { ok: false; error: string }

const text = (value: unknown) => (typeof value === 'string' ? value : undefined)

/** El correo, la cuenta y el plan que declara un JWT de OpenAI (id token o access token de ChatGPT). */
export function extractCodexAccountInfo(token: string): { email?: string; chatgptAccountId?: string; chatgptPlanType?: string } {
  const payload = decodeJwtPayload(token)
  if (!payload) return {}
  const chatgpt = toRecord(payload[OPENAI_AUTH_CLAIM])
  return { email: text(payload.email), chatgptAccountId: text(chatgpt.chatgpt_account_id), chatgptPlanType: text(chatgpt.chatgpt_plan_type) }
}

function pickString(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return undefined
}

function parseExpiry(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined
}

function accessTokenExpiry(accessToken: string, nowMs: number): string {
  const exp = decodeJwtPayload(accessToken)?.exp
  return typeof exp === 'number' && Number.isFinite(exp) && exp ? new Date(exp * MILLISECONDS_PER_SECOND).toISOString() : new Date(nowMs + DEFAULT_EXPIRY_MS).toISOString()
}

/** El `auth.json` del CLI anida los tokens en `tokens`: se aplanan, y los tokens ganan a los hermanos. */
function unwrapCodexAuthJson(record: JsonRecord): JsonRecord {
  const tokens = record.tokens
  if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) return record
  if (typeof (tokens as JsonRecord).access_token !== 'string') return record
  return { ...record, ...(tokens as JsonRecord) }
}

/** Los nombres camelCase del exportador de 9router, sólo donde falta su forma snake_case. */
function applyCamelCaseAliases(record: JsonRecord): JsonRecord {
  const out: JsonRecord = { ...record }
  const fillFrom = (snake: string, value: unknown) => {
    if (out[snake] === undefined && typeof value === 'string' && value) out[snake] = value
  }
  fillFrom('access_token', record.accessToken)
  fillFrom('refresh_token', record.refreshToken)
  fillFrom('id_token', record.idToken)
  fillFrom('expired', record.expiresAt)
  const specific = record.providerSpecificData
  if (specific && typeof specific === 'object' && !Array.isArray(specific)) {
    fillFrom('account_id', (specific as JsonRecord).chatgptAccountId)
    fillFrom('chatgpt_plan_type', (specific as JsonRecord).chatgptPlanType)
  }
  return out
}

export function normalizeCodexImportRecord(input: unknown, nowMs: number = Date.now()): NormalizeResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Record is not an object' }
  const record = applyCamelCaseAliases(unwrapCodexAuthJson(input as JsonRecord))
  // Sin tipo o `codex`; cualquier otro se rehúsa para no importar por aquí la exportación de otro proveedor.
  if (record.type !== undefined && record.type !== null && record.type !== 'codex') return { ok: false, error: `Unsupported type: ${String(record.type)}` }
  for (const field of REQUIRED_FIELDS) {
    if (typeof record[field] !== 'string' || !record[field]) return { ok: false, error: `Missing required field: ${field}` }
  }

  const accessToken = String(record.access_token)
  const idToken = text(record.id_token)
  const fromJwt = idToken ? extractCodexAccountInfo(idToken) : {}
  const email = pickString(fromJwt.email, text(record.email))
  if (!email) return { ok: false, error: 'Missing email (and id_token does not contain one)' }
  const chatgptAccountId = pickString(fromJwt.chatgptAccountId, text(record.account_id))
  const chatgptPlanType = pickString(fromJwt.chatgptPlanType, text(record.chatgpt_plan_type))
  const expiresAt = parseExpiry(record.expired) ?? accessTokenExpiry(accessToken, nowMs)

  const providerSpecificData: NonNullable<CodexImportPayload['providerSpecificData']> = {}
  if (chatgptAccountId) {
    providerSpecificData.chatgptAccountId = chatgptAccountId
    // La cuenta es también el espacio de trabajo con que el store deduplica.
    providerSpecificData.workspaceId = chatgptAccountId
  }
  if (chatgptPlanType) providerSpecificData.chatgptPlanType = chatgptPlanType

  const payload: CodexImportPayload = {
    provider: 'codex',
    authType: 'oauth',
    accessToken,
    refreshToken: String(record.refresh_token),
    email,
    expiresAt,
    tokenExpiresAt: expiresAt,
    testStatus: 'active',
    // Credenciales recién importadas dejan atrás un fallo de refresco anterior.
    isActive: true,
    errorCode: null,
    lastError: null,
    lastErrorAt: null,
    lastErrorType: null,
    lastErrorSource: null,
    backoffLevel: 0,
    rateLimitedUntil: null,
  }
  if (idToken) payload.idToken = idToken
  if (typeof record.priority === 'number' && Number.isInteger(record.priority) && record.priority > 0) payload.priority = record.priority
  if (Object.keys(providerSpecificData).length > 0) payload.providerSpecificData = providerSpecificData
  return { ok: true, payload }
}

/**
 * Una reimportación de la misma cuenta (correo y espacio de trabajo) refresca
 * las credenciales sin pisar lo que la importación no conoce: los datos del
 * proveedor se mezclan sobre los guardados, y la prioridad importada se
 * descarta para no duplicar el orden de otra conexión.
 */
export function preserveExistingCodexConnectionState(payload: CodexImportPayload, existingConnections: JsonRecord[]): CodexImportPayload {
  const workspaceId = payload.providerSpecificData?.workspaceId
  if (!workspaceId) return payload
  const match = existingConnections.find(connection =>
    connection.provider === 'codex' && connection.authType === 'oauth' && connection.email === payload.email && toRecord(connection.providerSpecificData).workspaceId === workspaceId)
  if (!match) return payload
  const adjusted: CodexImportPayload = { ...payload, providerSpecificData: { ...toRecord(match.providerSpecificData), ...payload.providerSpecificData } }
  delete adjusted.priority
  return adjusted
}

/** Lo subido es un registro o una lista de ellos. */
export function flattenCodexImportPayload(parsed: unknown): FlattenResult {
  if (Array.isArray(parsed)) return { ok: true, records: parsed }
  if (parsed && typeof parsed === 'object') return { ok: true, records: [parsed] }
  return { ok: false, error: 'JSON must be an object or an array of objects' }
}
