/**
 * El store de cuentas de proveedor: crear (o actualizar la que ya existe),
 * leer con las credenciales descifradas bajo demanda, actualizar, registrar
 * el uso, reiniciar el backoff y borrar.
 *
 * Porte de `omniroute: src/lib/db/providers.ts` (MIT). La base y el cifrado
 * se reciben en vez de salir de singletons globales, y el reloj y el
 * generador de ids se inyectan para que el orden sea reproducible.
 */
import type { Database } from 'bun:sqlite'
import { randomUUID } from 'node:crypto'

import {
  type JsonRecord,
  normalizeBooleanColumn,
  presentConnection,
  rowToCamel,
  sanitizeQuotaWindowThresholds,
  sanitizeRateLimitOverrides,
  serializeJsonField,
  toRecord,
  toStringOrNull,
} from './connectionColumns.ts'
import { deleteConnection, deleteConnections, deleteConnectionsByProvider, reorderConnections } from './connectionDeletion.ts'
import {
  isLocalProvider,
  isMatchingOauthIdentity,
  normalizeBaseUrl,
  parseProviderSpecificData,
  pickCodexConnectionForUser,
  webSessionCredentialKey,
} from './connectionIdentity.ts'
import { ensureProviderConnectionsSchema, PROVIDER_CONNECTIONS_COLUMNS } from './connectionSchema.ts'
import type { FieldCipher } from './fieldCipher.ts'
import { createLazyConnectionRow } from './lazyConnectionRow.ts'

export interface ConnectionFilter {
  provider?: string
  isActive?: boolean
  authType?: string
}

export interface ListOptions {
  limit?: number
  offset?: number
  /** Columnas de la tabla (snake_case); una desconocida se rehúsa. */
  columns?: string[]
}

export interface DisplayMetadata {
  id: string
  name: string | null
  displayName: string | null
  email: string | null
}

export interface ConnectionStore {
  create(data: JsonRecord): JsonRecord | null
  update(id: string, data: JsonRecord): JsonRecord | null
  getById(id: string): JsonRecord | null
  /** Filas cuyas credenciales se descifran al leerlas. */
  list(filter?: ConnectionFilter, options?: ListOptions): JsonRecord[]
  /** Filas con las credenciales todavía cifradas. */
  listRaw(filter?: ConnectionFilter, options?: ListOptions): JsonRecord[]
  count(filter?: ConnectionFilter): number
  displayMetadata(ids: readonly string[]): DisplayMetadata[]
  touchLastUsed(id: string, consecutiveUseCount: number): void
  touchSyncedModelsAt(id: string): void
  resetBackoff(id: string): void
  distinctGroups(): string[]
  delete(id: string): boolean
  deleteMany(ids: readonly string[]): number
  deleteByProvider(providerId: string): number
}

export interface ConnectionStoreDeps {
  db: Database
  cipher: FieldCipher
  now?: () => string
  newId?: () => string
}

const CREDENTIAL_FIELDS = ['apiKey', 'accessToken', 'refreshToken', 'idToken'] as const

/** Los campos que una cuenta nueva copia de lo que llega, si vienen con valor. */
const OPTIONAL_CREATE_FIELDS = [
  'displayName', 'email', 'globalPriority', 'defaultModel', 'accessToken', 'refreshToken', 'expiresAt',
  'tokenExpiresAt', 'tokenType', 'scope', 'idToken', 'projectId', 'apiKey', 'testStatus', 'lastTested',
  'lastError', 'lastErrorAt', 'lastErrorType', 'lastErrorSource', 'rateLimitedUntil', 'expiresIn', 'errorCode',
  'consecutiveUseCount', 'rateLimitProtection', 'group', 'maxConcurrent', 'proxyEnabled', 'perKeyProxyEnabled',
  'quotaVisible', 'quotaWindowThresholds', 'rateLimitOverrides', 'healthCheckInterval',
]

/** Columna de la tabla → campo del registro, para las que se escriben igual al crear y al actualizar. */
const WRITTEN_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ['provider', 'provider'], ['auth_type', 'authType'], ['name', 'name'], ['email', 'email'],
  ['priority', 'priority'], ['is_active', 'isActive'], ['access_token', 'accessToken'],
  ['refresh_token', 'refreshToken'], ['expires_at', 'expiresAt'], ['token_expires_at', 'tokenExpiresAt'],
  ['scope', 'scope'], ['project_id', 'projectId'], ['test_status', 'testStatus'], ['error_code', 'errorCode'],
  ['last_error', 'lastError'], ['last_error_at', 'lastErrorAt'], ['last_error_type', 'lastErrorType'],
  ['last_error_source', 'lastErrorSource'], ['backoff_level', 'backoffLevel'],
  ['rate_limited_until', 'rateLimitedUntil'], ['health_check_interval', 'healthCheckInterval'],
  ['last_health_check_at', 'lastHealthCheckAt'], ['last_tested', 'lastTested'], ['api_key', 'apiKey'],
  ['id_token', 'idToken'], ['provider_specific_data', 'providerSpecificData'], ['expires_in', 'expiresIn'],
  ['display_name', 'displayName'], ['global_priority', 'globalPriority'], ['default_model', 'defaultModel'],
  ['token_type', 'tokenType'], ['consecutive_use_count', 'consecutiveUseCount'],
  ['rate_limit_protection', 'rateLimitProtection'], ['last_used_at', 'lastUsedAt'], ['"group"', 'group'],
  ['max_concurrent', 'maxConcurrent'], ['proxy_enabled', 'proxyEnabled'],
  ['per_key_proxy_enabled', 'perKeyProxyEnabled'], ['quota_visible', 'quotaVisible'],
  ['quota_window_thresholds_json', 'quotaWindowThresholds'], ['rate_limit_overrides_json', 'rateLimitOverrides'],
  ['last_ping_at', 'lastPingAt'], ['last_pinged_reset_key', 'lastPingedResetKey'], ['updated_at', 'updatedAt'],
]

type SqlValue = string | number | null

/** El valor de cada columna escrita, con los defectos y conversiones de la referencia. */
function columnValues(record: JsonRecord): SqlValue[] {
  const valueOf = (field: string): SqlValue => {
    const value = record[field]
    switch (field) {
      case 'priority':
      case 'backoffLevel':
      case 'consecutiveUseCount':
        return (value as number) || 0
      case 'isActive':
        return value === false ? 0 : 1
      case 'rateLimitProtection':
        return value === true || value === 1 ? 1 : 0
      case 'proxyEnabled':
      case 'quotaVisible':
        return normalizeBooleanColumn(value, true) ? 1 : 0
      case 'perKeyProxyEnabled':
        return normalizeBooleanColumn(value, false) ? 1 : 0
      case 'healthCheckInterval':
      case 'maxConcurrent':
        return (value as number | null | undefined) ?? null
      case 'providerSpecificData':
        return value ? JSON.stringify(value) : null
      case 'quotaWindowThresholds':
      case 'rateLimitOverrides':
        return serializeJsonField(value)
      default:
        return (value as SqlValue) || null
    }
  }
  return WRITTEN_COLUMNS.map(([, field]) => valueOf(field))
}

/**
 * Valida en sitio los dos mapas por conexión: una clave o un valor inválido
 * se rehúsa entero, no se descarta en silencio.
 */
function sanitizeLimitMaps(record: JsonRecord): void {
  const maps = [
    ['quotaWindowThresholds', sanitizeQuotaWindowThresholds],
    ['rateLimitOverrides', sanitizeRateLimitOverrides],
  ] as const
  for (const [field, sanitize] of maps) {
    if (!(field in record)) continue
    const result = sanitize(record[field])
    if (result.rejected.length > 0) {
      throw new Error(`Refusing to persist ${field} with rejected keys: ${result.rejected.join(', ')}`)
    }
    record[field] = result.sanitized
  }
}

function whereClause(filter: ConnectionFilter): { sql: string; params: SqlValue[] } {
  const conditions: string[] = []
  const params: SqlValue[] = []
  if (filter.provider) {
    conditions.push('provider = ?')
    params.push(filter.provider)
  }
  if (filter.isActive !== undefined) {
    conditions.push('is_active = ?')
    params.push(filter.isActive ? 1 : 0)
  }
  if (filter.authType) {
    conditions.push('auth_type = ?')
    params.push(filter.authType)
  }
  return { sql: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '', params }
}

function projection(columns: string[] | undefined): string {
  if (!columns?.length) return '*'
  const invalid = columns.filter(column => !PROVIDER_CONNECTIONS_COLUMNS.has(column))
  if (invalid.length > 0) throw new Error(`invalid column(s) requested: ${invalid.join(', ')}`)
  return columns.map(column => (column === 'group' ? '"group"' : column)).join(', ')
}

export function createConnectionStore(deps: ConnectionStoreDeps): ConnectionStore {
  const { db, cipher } = deps
  const now = deps.now ?? (() => new Date().toISOString())
  const newId = deps.newId ?? randomUUID
  ensureProviderConnectionsSchema(db)

  const selectOne = (sql: string, ...params: SqlValue[]) => (db.query(sql).get(...params) as JsonRecord | null) ?? null
  const selectAll = (sql: string, ...params: SqlValue[]) => db.query(sql).all(...params) as JsonRecord[]

  const insertRow = (record: JsonRecord) => {
    const columns = ['id', ...WRITTEN_COLUMNS.map(([column]) => column), 'created_at']
    db.query(`INSERT INTO provider_connections (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`).run(
      record.id as string,
      ...columnValues(record),
      record.createdAt as string,
    )
  }

  const updateRow = (id: string, record: JsonRecord) => {
    const assignments = WRITTEN_COLUMNS.map(([column]) => `${column} = ?`).join(', ')
    db.query(`UPDATE provider_connections SET ${assignments} WHERE id = ?`).run(...columnValues(record), id)
  }

  /** La fila guardada que es la misma cuenta que llega, según su tipo de autenticación. */
  const findExisting = (data: JsonRecord): JsonRecord | null => {
    const provider = toStringOrNull(data.provider)
    const specific = toRecord(data.providerSpecificData)
    if (provider === null) return null

    if (data.authType === 'oauth') {
      const workspaceId = toStringOrNull(specific.workspaceId)
      const chatgptUserId = toStringOrNull(specific.chatgptUserId)
      if (provider === 'codex' && chatgptUserId) return findCodexByUser(provider, workspaceId, chatgptUserId, toStringOrNull(data.email))
      if (!data.email) return null
      if (provider === 'codex') {
        if (!workspaceId) return null
        return selectOne(
            `SELECT * FROM provider_connections WHERE provider = ? AND auth_type = 'oauth'
               AND json_extract(provider_specific_data, '$.workspaceId') = ? AND email = ? LIMIT 1`,
            provider, workspaceId, data.email as string,
          )
      }
      const incoming = {
        username: toStringOrNull(specific.username),
        profileArn: toStringOrNull(specific.profileArn),
        organizationUuid: toStringOrNull(specific.organizationUUID),
      }
      const sameEmail = selectAll(
        "SELECT * FROM provider_connections WHERE provider = ? AND auth_type = 'oauth' AND email = ?",
        provider, data.email as string,
      )
      return sameEmail.find(row => isMatchingOauthIdentity(row, incoming)) ?? null
    }

    if (data.authType === 'apikey') return findApiKeyAccount(provider, data, specific)
    if (data.authType === 'cookie') return findWebSession(provider, data)
    // Un token de acceso suelto no tiene identidad estable contra la que comparar: siempre es nuevo.
    return null
  }

  const findCodexByUser = (provider: string, workspaceId: string | null, userId: string, email: string | null) => {
    const strong = workspaceId
      ? selectOne(
          `SELECT * FROM provider_connections WHERE provider = ? AND auth_type = 'oauth'
             AND json_extract(provider_specific_data, '$.workspaceId') = ?
             AND json_extract(provider_specific_data, '$.chatgptUserId') = ?`,
          provider, workspaceId, userId,
        )
      : selectOne(
          `SELECT * FROM provider_connections WHERE provider = ? AND auth_type = 'oauth'
             AND (json_extract(provider_specific_data, '$.workspaceId') IS NULL
                  OR json_extract(provider_specific_data, '$.workspaceId') = '')
             AND json_extract(provider_specific_data, '$.chatgptUserId') = ?`,
          provider, userId,
        )
    if (strong || !workspaceId) return strong
    const workspaceRows = selectAll(
      `SELECT * FROM provider_connections WHERE provider = ? AND auth_type = 'oauth'
         AND json_extract(provider_specific_data, '$.workspaceId') = ? ORDER BY created_at`,
      provider, workspaceId,
    )
    return pickCodexConnectionForUser(workspaceRows, userId, email)
  }

  /**
   * El mismo nombre, o el mismo valor de clave. Las claves se guardan con IV
   * aleatorio, así que se compara el texto descifrado. En un proveedor local
   * la misma clave con otra URL base es otro servidor.
   */
  const findApiKeyAccount = (provider: string, data: JsonRecord, specific: JsonRecord): JsonRecord | null => {
    if (data.name) {
      const byName = selectOne(
        "SELECT * FROM provider_connections WHERE provider = ? AND auth_type = 'apikey' AND name = ?",
        provider, data.name as string,
      )
      if (byName) return byName
    }
    const apiKey = typeof data.apiKey === 'string' ? data.apiKey.trim() : ''
    if (!apiKey) return null
    const baseUrl = normalizeBaseUrl(specific.baseUrl)
    const local = isLocalProvider(provider)
    return (
      selectAll("SELECT * FROM provider_connections WHERE provider = ? AND auth_type = 'apikey'", provider).find(row => {
        const stored = toStringOrNull(cipher.decryptConnectionFields(rowToCamel(row)).apiKey)
        if (stored?.trim() !== apiKey) return false
        return !local || normalizeBaseUrl(parseProviderSpecificData(row.provider_specific_data)?.baseUrl) === baseUrl
      }) ?? null
    )
  }

  const findWebSession = (provider: string, data: JsonRecord): JsonRecord | null => {
    if (data.name) {
      const byName = selectOne(
        "SELECT * FROM provider_connections WHERE provider = ? AND auth_type = 'cookie' AND name = ?",
        provider, data.name as string,
      )
      if (byName) return byName
    }
    const credential = webSessionCredentialKey(data.providerSpecificData)
    if (!credential) return null
    return (
      selectAll("SELECT * FROM provider_connections WHERE provider = ? AND auth_type = 'cookie'", provider).find(
        row => webSessionCredentialKey(parseProviderSpecificData(row.provider_specific_data)) === credential,
      ) ?? null
    )
  }

  /** Funde lo que llega sobre la fila; las credenciales que no llegan se conservan cifradas como estaban. */
  const mergeIntoExisting = (existing: JsonRecord, data: JsonRecord): JsonRecord => {
    const id = existing.id as string
    const stored = rowToCamel(existing)
    const merged: JsonRecord = { ...cipher.decryptConnectionFields({ ...stored }), ...data, updatedAt: now() }
    const persisted: JsonRecord = { ...merged }
    for (const field of CREDENTIAL_FIELDS) if (!Object.hasOwn(data, field)) persisted[field] = stored[field]
    updateRow(id, cipher.encryptConnectionFields(persisted))
    return presentConnection(merged)
  }

  const nextPriority = (provider: unknown): number => {
    const row = selectOne('SELECT MAX(priority) AS maxPriority FROM provider_connections WHERE provider = ?', provider as string)
    return ((row?.maxPriority as number | null) ?? 0) + 1
  }

  /** Nombre explícito; si no, el email o el nombre visible de una cuenta OAuth. */
  const defaultName = (data: JsonRecord): unknown => {
    if (data.name) return data.name
    if (data.authType !== 'oauth' && data.authType !== 'access_token') return null
    return data.email || data.displayName || null
  }

  const newConnection = (data: JsonRecord): JsonRecord => {
    const createdAt = now()
    const connection: JsonRecord = {
      id: newId(),
      provider: data.provider,
      authType: data.authType || 'oauth',
      name: defaultName(data),
      priority: data.priority || nextPriority(data.provider),
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt,
      updatedAt: createdAt,
      proxyEnabled: normalizeBooleanColumn(data.proxyEnabled, true),
      perKeyProxyEnabled: normalizeBooleanColumn(data.perKeyProxyEnabled, false),
      quotaVisible: normalizeBooleanColumn(data.quotaVisible, true),
    }
    for (const field of OPTIONAL_CREATE_FIELDS) {
      if (data[field] !== undefined && data[field] !== null) connection[field] = data[field]
    }
    const specific = toRecord(data.providerSpecificData)
    if (Object.keys(specific).length > 0) connection.providerSpecificData = specific
    sanitizeLimitMaps(connection)
    return connection
  }

  const listRaw = (filter: ConnectionFilter = {}, options: ListOptions = {}): JsonRecord[] => {
    const where = whereClause(filter)
    let sql = `SELECT ${projection(options.columns)} FROM provider_connections${where.sql} ORDER BY priority ASC, updated_at DESC`
    const params = [...where.params]
    if (options.limit !== undefined) {
      sql += ' LIMIT ? OFFSET ?'
      params.push(options.limit, options.offset ?? 0)
    }
    return selectAll(sql, ...params).map(row => presentConnection(rowToCamel(row)))
  }

  return {
    create(data) {
      const existing = findExisting(data)
      if (existing) return db.transaction(() => mergeIntoExisting(existing, data))()
      const connection = newConnection(data)
      insertRow(cipher.encryptConnectionFields({ ...connection }))
      reorderConnections(db, connection.provider as string)
      return presentConnection(connection)
    },

    update(id, data) {
      const existing = selectOne('SELECT * FROM provider_connections WHERE id = ?', id)
      if (!existing) return null
      const merged: JsonRecord = { ...rowToCamel(existing), ...data, updatedAt: now() }
      sanitizeLimitMaps(merged)
      updateRow(id, cipher.encryptConnectionFields({ ...merged }))
      if (data.priority !== undefined) reorderConnections(db, existing.provider as string)
      return presentConnection(cipher.decryptConnectionFields({ ...merged }))
    },

    getById(id) {
      const row = selectOne('SELECT * FROM provider_connections WHERE id = ?', id)
      return row ? cipher.decryptConnectionFields(presentConnection(rowToCamel(row))) : null
    },

    list(filter, options) {
      return listRaw(filter, options).map(row => createLazyConnectionRow(row, cipher))
    },

    listRaw,

    count(filter = {}) {
      const where = whereClause(filter)
      return (selectOne(`SELECT count(*) AS total FROM provider_connections${where.sql}`, ...where.params)!.total as number)
    },

    displayMetadata(ids) {
      const unique = [...new Set(ids.filter(id => id.length > 0))]
      if (unique.length === 0) return []
      return selectAll(
        `SELECT id, name, display_name, email FROM provider_connections WHERE id IN (${unique.map(() => '?').join(', ')})`,
        ...unique,
      ).map(row => ({
        id: toStringOrNull(row.id) ?? '',
        name: toStringOrNull(row.name),
        displayName: toStringOrNull(row.display_name),
        email: toStringOrNull(row.email),
      }))
    },

    touchLastUsed(id, consecutiveUseCount) {
      if (!id) return
      const at = now()
      db.query('UPDATE provider_connections SET last_used_at = ?, consecutive_use_count = ?, updated_at = ? WHERE id = ?').run(
        at, consecutiveUseCount, at, id,
      )
    },

    touchSyncedModelsAt(id) {
      if (!id) return
      const at = now()
      db.query('UPDATE provider_connections SET synced_models_at = ?, updated_at = ? WHERE id = ?').run(at, at, id)
    },

    resetBackoff(id) {
      if (!id) return
      db.query(
        `UPDATE provider_connections SET backoff_level = 0, test_status = 'active', last_error = NULL,
           last_error_at = NULL, last_error_type = NULL, last_error_source = NULL, error_code = NULL,
           updated_at = ? WHERE id = ?`,
      ).run(now(), id)
    },

    distinctGroups() {
      return selectAll('SELECT DISTINCT "group" AS name FROM provider_connections WHERE "group" IS NOT NULL ORDER BY "group"')
        .map(row => String(row.name ?? ''))
        .filter(Boolean)
    },

    delete: id => deleteConnection(db, id),
    deleteMany: ids => deleteConnections(db, ids),
    deleteByProvider: providerId => deleteConnectionsByProvider(db, providerId),
  }
}
