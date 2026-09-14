/**
 * Porte de OmniRoute `src/lib/providers/claudeExtraUsage.ts` (MIT),
 * superficie completa -- los 8 exports (2 constantes + 6 funciones), ninguno
 * omitido. Archivo autocontenido en la fuente (cero imports externos) y se
 * conserva asi aqui.
 *
 * El dominio: una conexion de proveedor "claude" puede reportar uso "extra"
 * (fuera de la suscripcion normal, con cargo aparte) en su snapshot de
 * cuotas. Este modulo decide si esa conexion debe BLOQUEARSE mientras el
 * uso extra esta en cola de facturacion, y produce la actualizacion de
 * estado (`testStatus`/`lastError*`/`rateLimitedUntil`/`backoffLevel`) que
 * corresponde -- o `null` si nada cambia.
 *
 * `ClaudeExtraUsageConnectionState`/`ClaudeExtraUsageUpdate` son locales y
 * NO se exportan (tampoco en la fuente): describen solo los campos que este
 * modulo lee y escribe de una conexion, no la forma completa de una fila de
 * conexion real -- evita acoplar este porte a un tipo `Connection` que este
 * arbol no tiene (ver `connections.ts`, que es un concepto DISTINTO: la
 * conexion OAuth/API-key de una sesion local, no una fila de conexion
 * multi-tenant con cuotas por facturar).
 */

type JsonRecord = Record<string, unknown>

type ClaudeExtraUsageConnectionState = {
  provider?: string | null
  providerSpecificData?: unknown
  testStatus?: string | null
  lastError?: string | null
  lastErrorAt?: string | null
  lastErrorType?: string | null
  lastErrorSource?: string | null
  errorCode?: string | number | null
  rateLimitedUntil?: string | null
  backoffLevel?: number | null
}

type ClaudeExtraUsageUpdate = {
  testStatus: string | null
  lastError: string | null
  lastErrorAt: string | null
  lastErrorType: string | null
  lastErrorSource: string | null
  errorCode: number | null
  rateLimitedUntil: string | null
  backoffLevel: number
}

const EXTRA_USAGE_FALLBACK_BLOCK_MS = 5 * 60 * 1000
const SESSION_RESET_WINDOW_KEYS = ['session (5h)', 'session', 'five_hour']

export const CLAUDE_EXTRA_USAGE_ERROR_SOURCE = 'extra_usage'
export const CLAUDE_EXTRA_USAGE_ERROR_MESSAGE =
  'Claude extra usage was detected and blocked by this connection policy.'

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function toFutureIso(value: unknown): string | null {
  const raw = toStringOrNull(value)
  if (!raw) return null
  const ms = new Date(raw).getTime()
  if (!Number.isFinite(ms) || ms <= Date.now()) return null
  return raw
}

/** ¿Esta conexion "claude" debe bloquear uso extra? Por defecto SI -- el operador tiene que optar por lo contrario. */
export function isClaudeExtraUsageBlockEnabled(
  provider: string | null | undefined,
  providerSpecificData: unknown,
): boolean {
  if (provider !== 'claude') return false
  return asRecord(providerSpecificData).blockExtraUsage !== false
}

/** True solo cuando el operador activo explicitamente el uso extra en esta conexion Claude. */
export function isClaudeExtraUsageAllowed(
  provider: string | null | undefined,
  providerSpecificData: unknown,
): boolean {
  return provider === 'claude' && asRecord(providerSpecificData).blockExtraUsage === false
}

/** ¿El snapshot de uso trae uso extra en cola de facturacion? */
export function isClaudeExtraUsageQueued(usage: unknown): boolean {
  return asRecord(asRecord(usage).extraUsage).queued === true
}

/** ¿El ultimo error registrado en esta conexion vino de este mismo mecanismo? */
export function isClaudeExtraUsageState(connection: ClaudeExtraUsageConnectionState): boolean {
  return toStringOrNull(connection.lastErrorSource) === CLAUDE_EXTRA_USAGE_ERROR_SOURCE
}

/**
 * La fecha de reinicio de cuota mas relevante para el enfriamiento: primero
 * las ventanas de sesion (5h), y si ninguna aplica, la mas proxima de
 * cualquier cuota -- siempre que sea una fecha futura (`toFutureIso`
 * descarta una ya vencida).
 */
export function resolveClaudeExtraUsageResetAt(usage: unknown): string | null {
  const quotas = asRecord(asRecord(usage).quotas)

  for (const key of SESSION_RESET_WINDOW_KEYS) {
    const resetAt = toFutureIso(asRecord(quotas[key]).resetAt)
    if (resetAt) return resetAt
  }

  let earliest: string | null = null
  let earliestMs = Number.POSITIVE_INFINITY

  for (const quota of Object.values(quotas)) {
    const resetAt = toFutureIso(asRecord(quota).resetAt)
    if (!resetAt) continue
    const ms = new Date(resetAt).getTime()
    if (ms < earliestMs) {
      earliest = resetAt
      earliestMs = ms
    }
  }

  return earliest
}

function hasClaudeUsageSnapshot(usage: unknown): boolean {
  const record = asRecord(usage)
  return Object.prototype.hasOwnProperty.call(record, 'extraUsage') || !!record.quotas
}

function buildClearUpdate(): ClaudeExtraUsageUpdate {
  return {
    testStatus: 'active',
    lastError: null,
    lastErrorAt: null,
    lastErrorType: null,
    lastErrorSource: null,
    errorCode: null,
    rateLimitedUntil: null,
    backoffLevel: 0,
  }
}

/** La actualizacion que retira el estado de extra-usage, o `null` si la conexion no estaba en ese estado. */
export function buildClaudeExtraUsageStateClearUpdate(
  connection: ClaudeExtraUsageConnectionState,
): ClaudeExtraUsageUpdate | null {
  return isClaudeExtraUsageState(connection) ? buildClearUpdate() : null
}

/**
 * La actualizacion de conexion que corresponde al snapshot de uso dado, o
 * `null` si nada tiene que cambiar. Cuatro salidas posibles, en este orden:
 *
 * 1. proveedor distinto de "claude", o snapshot sin forma reconocible -> `null`
 * 2. bloqueo desactivado por el operador -> limpia el estado si estaba activo
 * 3. sin uso extra en cola -> limpia el estado si estaba activo
 * 4. uso extra en cola -> construye (o repite sin cambio) el estado "unavailable"
 */
export function buildClaudeExtraUsageConnectionUpdate(
  connection: ClaudeExtraUsageConnectionState,
  usage: unknown,
): ClaudeExtraUsageUpdate | null {
  if (connection.provider !== 'claude' || !hasClaudeUsageSnapshot(usage)) {
    return null
  }

  const snapshot = asRecord(usage)
  const blockingEnabled = isClaudeExtraUsageBlockEnabled(
    connection.provider,
    connection.providerSpecificData,
  )
  const currentIsExtraUsageState = isClaudeExtraUsageState(connection)

  if (!blockingEnabled) {
    return buildClaudeExtraUsageStateClearUpdate(connection)
  }

  if (!isClaudeExtraUsageQueued(snapshot)) {
    return buildClaudeExtraUsageStateClearUpdate(connection)
  }

  const rateLimitedUntil =
    resolveClaudeExtraUsageResetAt(snapshot) ||
    new Date(Date.now() + EXTRA_USAGE_FALLBACK_BLOCK_MS).toISOString()

  if (
    currentIsExtraUsageState &&
    toStringOrNull(connection.rateLimitedUntil) === rateLimitedUntil &&
    toStringOrNull(connection.testStatus) === 'unavailable' &&
    toStringOrNull(connection.lastErrorType) === 'quota_exhausted'
  ) {
    return null
  }

  return {
    testStatus: 'unavailable',
    lastError: CLAUDE_EXTRA_USAGE_ERROR_MESSAGE,
    lastErrorAt: new Date().toISOString(),
    lastErrorType: 'quota_exhausted',
    lastErrorSource: CLAUDE_EXTRA_USAGE_ERROR_SOURCE,
    errorCode: 429,
    rateLimitedUntil,
    backoffLevel: Math.max(1, Number(connection.backoffLevel) || 0),
  }
}
