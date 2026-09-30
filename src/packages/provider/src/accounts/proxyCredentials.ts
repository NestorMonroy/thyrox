/**
 * Presenta una conexión guardada al proxy local como `ProxyCredential`: la
 * vista de disponibilidad de la selección de cuentas traducida a los campos
 * que los selectores del proxy ya leen.
 *
 * - Una conexión inactiva o en estado terminal (créditos agotados, baneada,
 *   caducada) queda deshabilitada: no se recupera sola.
 * - Un enfriamiento futuro (`rateLimitedUntil`) la deja no disponible hasta
 *   esa hora; uno vencido no cuenta.
 * - La clave va en `attributes.api_key` y el token en
 *   `metadata.access_token`, que es donde el reenvío las busca.
 * - La prioridad se invierte: en el store la menor gana, en el proxy la mayor.
 *
 * Porte de `isTerminalConnectionStatus` y `materializeConnection` en
 * `omniroute: src/sse/services/auth.ts` (MIT).
 */
import type { ProxyCredential } from '../proxy/credentialSelectors.ts'

type JsonRecord = Record<string, unknown>

const TERMINAL_CONNECTION_STATUSES = new Set(['credits_exhausted', 'banned', 'expired'])

export function isTerminalConnectionStatus(testStatus: unknown): boolean {
  return typeof testStatus === 'string' && TERMINAL_CONNECTION_STATUSES.has(testStatus.trim().toLowerCase())
}

const nonBlank = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

function parseDate(value: unknown): Date | undefined {
  if (!nonBlank(value)) return undefined
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? undefined : new Date(ms)
}

export function connectionProxyCredential(row: JsonRecord, nowMs: number): ProxyCredential {
  const priority = typeof row.priority === 'number' ? row.priority : 0
  const attributes: Record<string, string> = { priority: String(0 - priority), provider: String(row.provider), auth_type: String(row.authType) }
  if (nonBlank(row.apiKey)) attributes.api_key = row.apiKey
  const metadata: Record<string, unknown> = {}
  if (nonBlank(row.accessToken)) metadata.access_token = row.accessToken
  if (nonBlank(row.projectId)) metadata.project_id = row.projectId
  const credential: ProxyCredential = { id: String(row.id), disabled: row.isActive === false || isTerminalConnectionStatus(row.testStatus), attributes, metadata }
  const expiresAt = parseDate(row.tokenExpiresAt) ?? parseDate(row.expiresAt)
  if (expiresAt) credential.accessTokenExpiresAt = expiresAt
  const cooldownUntil = parseDate(row.rateLimitedUntil)
  if (cooldownUntil && cooldownUntil.getTime() > nowMs) {
    credential.unavailable = true
    credential.nextRetryAfter = cooldownUntil
  }
  return credential
}

/** Las credenciales del proxy agrupadas por proveedor, en el orden dado; se omiten las filas sin id o sin proveedor. */
export function connectionProxyCredentials(rows: readonly JsonRecord[], nowMs: number): Record<string, ProxyCredential[]> {
  const grouped: Record<string, ProxyCredential[]> = {}
  for (const row of rows) {
    if (!nonBlank(row.id) || !nonBlank(row.provider)) continue
    ;(grouped[row.provider] ??= []).push(connectionProxyCredential(row, nowMs))
  }
  return grouped
}
