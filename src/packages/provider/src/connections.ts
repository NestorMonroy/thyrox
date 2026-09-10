/**
 * Porte de `ccnmt: packages/provider/src/connections.ts` — arquitectura
 * multi-proveedor por conexión. Superficie completa: los 3 tipos
 * re-exportados, `AuthProtocol`, `OAuthSource`, y las 15 funciones
 * exportadas, ninguna omitida.
 *
 * `ConnectionRecord`/`ConnectionModelRecord` viven en
 * `ccnmt: packages/config/global/config.ts`, que no está asignado a este
 * pase y `@thyrox/config` no los declara todavía. Se reconstruyen aquí
 * localmente — fieles a la forma que el propio archivo usa (id, name,
 * protocol, endpoint, auth discriminado por `type`, enabled, models,
 * createdAt) — y se re-exportan, igual que la fuente. `getGlobalConfig`/
 * `saveGlobalConfig` (mismo módulo) se acceden vía `require()` diferido: un
 * `import` estático de un miembro que `@thyrox/config` no exporta rompe la
 * carga del módulo entero.
 *
 * `./commands/logout/logout.js` (`performLogout`) no está asignado a este
 * pase → `require()` diferido, igual que `./oauth/codex-auth.js` y
 * `@thyrox/config/settings`/`@thyrox/config/env/utils` (éstos ya eran
 * `require()` diferido en la propia fuente).
 */

export type ConnectionModelRecord = {
  id: string
  label: string
  description?: string
  supportedEfforts?: string[]
  defaultEffort?: string
}

export type ConnectionAuth =
  | { type: 'oauth'; source: 'claude-ai' | 'codex' }
  | { type: 'api_key'; key: string }

export type ConnectionRecord = {
  id: string
  name: string
  protocol: 'anthropic' | 'openai' | 'gemini' | 'codex'
  endpoint: string
  auth: ConnectionAuth
  enabled: boolean
  models: ConnectionModelRecord[]
  createdAt: number
}

export type AuthProtocol = ConnectionRecord['protocol']
export type OAuthSource = 'claude-ai' | 'console' | 'codex'

type GlobalConfigWithConnections = {
  connections?: ConnectionRecord[]
  oauthAccount?: unknown
  primaryApiKey?: unknown
  codexOAuth?: unknown
  env?: Record<string, string>
}

function requireConfig(): {
  getGlobalConfig: () => GlobalConfigWithConnections
  saveGlobalConfig: (
    updater: (current: GlobalConfigWithConnections) => GlobalConfigWithConnections,
  ) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config')
}

function requireLogout(): {
  performLogout: (opts: { clearOnboarding: boolean }) => Promise<void>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./commands/logout/logout.ts')
}

// ── Discriminación de endpoint ──────────────────────────────────────────

/**
 * ¿Esta conexión habla activamente con el endpoint first-party de
 * Anthropic? `protocol: 'anthropic'` cubre tres formas de despliegue que
 * lucen iguales a nivel de wire-protocol pero difieren en capacidad: OAuth
 * Pro/Max en api.anthropic.com, API key de Console en el mismo host, o un
 * proxy compatible auto-hospedado en cualquier otro host — este último
 * habla el protocolo Anthropic pero no necesariamente reenvía server tools
 * / FGTS / etc.
 */
export function isFirstPartyAnthropicConnection(conn: ConnectionRecord | undefined): boolean {
  if (!conn || conn.protocol !== 'anthropic') return false
  try {
    const host = new URL(conn.endpoint).host
    return host === 'api.anthropic.com' || host === 'api-staging.anthropic.com'
  } catch {
    return false
  }
}

/** Listas de modelos por defecto cuando una conexión no especifica los suyos. */
export function getDefaultModelsForProtocol(protocol: AuthProtocol): ConnectionModelRecord[] {
  switch (protocol) {
    case 'anthropic':
      return [
        { id: 'claude-opus-4-8', label: 'Opus 4.8', description: 'Most capable for complex work' },
        { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', description: 'Best for everyday tasks' },
        { id: 'claude-haiku-4-5', label: 'Haiku 4.5', description: 'Fastest for quick answers' },
      ]
    case 'codex':
      return [
        {
          id: 'gpt-5.6-sol',
          label: 'GPT-5.6 Sol',
          description: 'Flagship GPT-5.6 model for the most demanding coding work.',
          supportedEfforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
          defaultEffort: 'medium',
        },
        {
          id: 'gpt-5.6-terra',
          label: 'GPT-5.6 Terra',
          description: 'Strong GPT-5.6 performance with a better cost balance.',
          supportedEfforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
          defaultEffort: 'medium',
        },
        {
          id: 'gpt-5.6-luna',
          label: 'GPT-5.6 Luna',
          description: 'Efficient GPT-5.6 model for high-volume coding work.',
          supportedEfforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
          defaultEffort: 'medium',
        },
        {
          id: 'gpt-5.5',
          label: 'GPT-5.5',
          description: 'Frontier model for complex coding, research, and real-world work.',
          supportedEfforts: ['low', 'medium', 'high', 'xhigh'],
          defaultEffort: 'medium',
        },
        {
          id: 'gpt-5.4',
          label: 'GPT-5.4',
          description: 'Strong model for everyday coding.',
          supportedEfforts: ['low', 'medium', 'high', 'xhigh'],
          defaultEffort: 'medium',
        },
        {
          id: 'gpt-5.4-mini',
          label: 'GPT-5.4 Mini',
          description: 'Small, fast, and cost-efficient model for simpler coding tasks.',
          supportedEfforts: ['low', 'medium', 'high', 'xhigh'],
          defaultEffort: 'medium',
        },
        {
          id: 'gpt-5.3-codex',
          label: 'GPT-5.3 Codex',
          description: 'Coding-optimized model.',
          supportedEfforts: ['low', 'medium', 'high', 'xhigh'],
          defaultEffort: 'medium',
        },
        {
          id: 'gpt-5.2',
          label: 'GPT-5.2',
          description: 'Optimized for professional work and long-running agents.',
          supportedEfforts: ['low', 'medium', 'high', 'xhigh'],
          defaultEffort: 'medium',
        },
      ]
    case 'openai':
      return [
        { id: 'gpt-4o', label: 'GPT-4o', description: 'Versatile, high intelligence' },
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and affordable' },
      ]
    case 'gemini':
      return [
        { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Most capable Gemini model' },
        { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast and versatile' },
      ]
  }
}

const STALE_CODEX_MODEL_IDS = new Set(['gpt-5.2-codex', 'gpt-5.1-codex-max', 'gpt-5.1-codex-mini'])

/** Refresca metadata canónica de modelos Codex preservando modelos desconocidos. */
export function refreshCodexModelCatalog(
  models: ConnectionModelRecord[],
): { models: ConnectionModelRecord[]; changed: boolean } {
  const defaults = getDefaultModelsForProtocol('codex')
  const currentById = new Map(models.map(model => [model.id, model]))
  const canonicalChanged = defaults.some(
    model => JSON.stringify(currentById.get(model.id)) !== JSON.stringify(model),
  )
  const hasStaleModel = models.some(model => STALE_CODEX_MODEL_IDS.has(model.id))
  if (!canonicalChanged && !hasStaleModel) {
    return { models, changed: false }
  }
  const defaultIds = new Set(defaults.map(model => model.id))
  const customModels = models.filter(
    model => !defaultIds.has(model.id) && !STALE_CODEX_MODEL_IDS.has(model.id),
  )
  return { models: [...defaults, ...customModels], changed: true }
}

export const CLAUDE_AI_CONNECTION_ID = 'claude-account'
export const CONSOLE_CONNECTION_ID = 'anthropic-console'
export const CODEX_CONNECTION_ID = 'chatgpt-codex'

const MODEL_ID_SEPARATOR = ':'

/** Compone un id compuesto conexión+modelo. Sin conexión, devuelve el id tal cual. */
export function composeModelId(connectionId: string | undefined, modelId: string): string {
  if (!connectionId) return modelId
  return `${connectionId}${MODEL_ID_SEPARATOR}${modelId}`
}

/** Separa un id compuesto en sus partes; sin separador devuelve el id sin cambios. */
export function unpackModelId(value: string): {
  connectionId: string | undefined
  modelId: string
} {
  const idx = value.indexOf(MODEL_ID_SEPARATOR)
  if (idx <= 0) return { connectionId: undefined, modelId: value }
  const head = value.slice(0, idx)
  if (/[/.]/.test(head)) return { connectionId: undefined, modelId: value }
  return { connectionId: head, modelId: value.slice(idx + 1) }
}

/**
 * Infla un valor con forma de settings.json (id de wire desnudo) a la forma
 * interna empaquetada `<connId>:<modelId>`. Ver resolución en 6 pasos en el
 * docstring original de la fuente: prefijo ya empaquetado con conexión
 * habilitada; prefijo obsoleto → cae a búsqueda por id desnudo; id desnudo
 * que matchea el modelo de alguna conexión habilitada → empaqueta contra la
 * primera; sufijo `[1m]`/`[2m]` → matchea por forma recortada; alias → sin
 * cambios; sin match → sin cambios.
 */
export function inflateModelSetting(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined || value === '') return value

  const enabled = getEnabledConnections()
  if (enabled.length === 0) return value

  const { connectionId, modelId } = unpackModelId(value)

  if (connectionId !== undefined) {
    if (enabled.some(c => c.id === connectionId)) return value
  }

  if (
    modelId === 'opus' ||
    modelId === 'sonnet' ||
    modelId === 'haiku' ||
    modelId === 'opusplan' ||
    modelId === 'sonnet[1m]' ||
    modelId === 'opus[1m]'
  ) {
    return value
  }

  const stripContextSuffix = (id: string) => id.trim().toLowerCase().replace(/\[(1|2)m\]$/i, '')
  const target = stripContextSuffix(modelId)

  for (const conn of enabled) {
    for (const m of conn.models) {
      if (stripContextSuffix(m.id) === target) {
        return composeModelId(conn.id, modelId)
      }
    }
  }

  return value
}

/**
 * Etiqueta de display para un modelo de conexión. Migraciones antiguas
 * guardaban labels como `Alias (wire-id)`; se recorta ese prefijo cuando el
 * paréntesis coincide con el id.
 */
export function prettyModelLabel(model: ConnectionModelRecord): string {
  const m = /^(.*?)\s*\((.+)\)\s*$/.exec(model.label.trim())
  if (m && m[2]!.trim() === model.id) return model.id
  return model.label
}

/** Genera un id corto único para conexiones nuevas. */
export function generateConnectionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'conn_'
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/** ¿Es uno de los ids de conexión OAuth bien conocidos? */
export function isWellKnownConnection(id: string): boolean {
  return [CLAUDE_AI_CONNECTION_ID, CONSOLE_CONNECTION_ID, CODEX_CONNECTION_ID].includes(id)
}

// ── CRUD ────────────────────────────────────────────────────────────────

export function getConnections(): ConnectionRecord[] {
  return requireConfig().getGlobalConfig().connections ?? []
}

export function getConnection(id: string): ConnectionRecord | undefined {
  return getConnections().find(c => c.id === id)
}

export function saveConnection(connection: ConnectionRecord): void {
  requireConfig().saveGlobalConfig(current => {
    const existing = current.connections ?? []
    const idx = existing.findIndex(c => c.id === connection.id)
    const updated =
      idx >= 0
        ? [...existing.slice(0, idx), connection, ...existing.slice(idx + 1)]
        : [...existing, connection]
    return { ...current, connections: updated }
  })
}

export function removeConnection(id: string): void {
  requireConfig().saveGlobalConfig(current => ({
    ...current,
    connections: (current.connections ?? []).filter(c => c.id !== id),
  }))
}

export function toggleConnection(id: string): void {
  requireConfig().saveGlobalConfig(current => ({
    ...current,
    connections: (current.connections ?? []).map(c => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
  }))
}

export function getEnabledConnections(): ConnectionRecord[] {
  return getConnections().filter(c => c.enabled)
}

/**
 * Upsert de una conexión "compatible" (api_key) por (protocol, name). Si
 * existe un registro que coincide, lo reemplaza; si no, crea uno nuevo.
 */
export function upsertCompatibleConnection(input: {
  protocol: AuthProtocol
  name: string
  endpoint: string
  apiKey: string
  models?: ConnectionModelRecord[]
}): ConnectionRecord {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    throw new Error('Connection name is required for compatible providers.')
  }
  const existing = getConnections().find(
    c => c.protocol === input.protocol && c.auth.type === 'api_key' && c.name.toLowerCase() === trimmedName.toLowerCase(),
  )
  const record: ConnectionRecord = {
    id: existing?.id ?? generateConnectionId(),
    name: trimmedName,
    protocol: input.protocol,
    endpoint: input.endpoint,
    auth: { type: 'api_key', key: input.apiKey },
    enabled: true,
    models:
      input.models && input.models.length > 0
        ? input.models
        : existing?.models ?? getDefaultModelsForProtocol(input.protocol),
    createdAt: existing?.createdAt ?? Date.now(),
  }
  saveConnection(record)
  return record
}

/**
 * Desconecta una conexión: borra el registro y limpia el slot de token
 * OAuth si aplica. Si con esto quedan cero conexiones, delega en
 * `performLogout()` para la limpieza global completa.
 */
export async function disconnectConnection(id: string): Promise<void> {
  const conn = getConnection(id)
  if (!conn) return

  if (conn.auth.type === 'oauth') {
    if (conn.auth.source === 'codex') {
      requireConfig().saveGlobalConfig(c => ({ ...c, codexOAuth: undefined }))
    } else if (conn.auth.source === 'claude-ai') {
      requireConfig().saveGlobalConfig(c => ({
        ...c,
        oauthAccount: undefined,
        primaryApiKey: undefined,
      }))
    }
  }

  removeConnection(id)

  if (getConnections().length === 0) {
    await requireLogout().performLogout({ clearOnboarding: false })
  }
}

// ── Migración de config legada ──────────────────────────────────────────

function migrateLegacyAnthropicCompat(env: Record<string, string>): boolean {
  const baseUrl = env.ANTHROPIC_BASE_URL
  const apiKey = env.ANTHROPIC_AUTH_TOKEN
  if (!baseUrl) return false
  try {
    const host = new URL(baseUrl).host
    if (host === 'api.anthropic.com') return false
  } catch {
    return false
  }
  const existing = getConnections().find(
    c => c.protocol === 'anthropic' && c.auth.type === 'api_key' && c.endpoint === baseUrl,
  )
  if (existing) return false
  const url = (() => {
    try {
      return new URL(baseUrl)
    } catch {
      return null
    }
  })()
  upsertCompatibleConnection({
    protocol: 'anthropic',
    name: url ? url.host : 'Anthropic Compatible (migrated)',
    endpoint: baseUrl,
    apiKey: apiKey ?? '',
    models: [
      env.ANTHROPIC_DEFAULT_OPUS_MODEL && {
        id: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
        label: `Opus (${env.ANTHROPIC_DEFAULT_OPUS_MODEL})`,
      },
      env.ANTHROPIC_DEFAULT_SONNET_MODEL && {
        id: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
        label: `Sonnet (${env.ANTHROPIC_DEFAULT_SONNET_MODEL})`,
      },
      env.ANTHROPIC_DEFAULT_HAIKU_MODEL && {
        id: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
        label: `Haiku (${env.ANTHROPIC_DEFAULT_HAIKU_MODEL})`,
      },
    ].filter((m): m is ConnectionModelRecord => Boolean(m)),
  })
  return true
}

function migrateLegacyOpenAICompat(env: Record<string, string>): boolean {
  const baseUrl = env.OPENAI_BASE_URL
  const apiKey = env.OPENAI_API_KEY
  if (!baseUrl && !apiKey) return false
  const existing = getConnections().find(
    c => c.protocol === 'openai' && c.auth.type === 'api_key' && c.endpoint === (baseUrl ?? ''),
  )
  if (existing) return false
  const endpoint = baseUrl ?? 'https://api.openai.com/v1'
  const url = (() => {
    try {
      return new URL(endpoint)
    } catch {
      return null
    }
  })()
  const models: ConnectionModelRecord[] = []
  if (env.OPENAI_DEFAULT_OPUS_MODEL) {
    models.push({ id: env.OPENAI_DEFAULT_OPUS_MODEL, label: env.OPENAI_DEFAULT_OPUS_MODEL })
  }
  if (env.OPENAI_DEFAULT_SONNET_MODEL) {
    models.push({ id: env.OPENAI_DEFAULT_SONNET_MODEL, label: env.OPENAI_DEFAULT_SONNET_MODEL })
  }
  if (env.OPENAI_DEFAULT_HAIKU_MODEL) {
    models.push({ id: env.OPENAI_DEFAULT_HAIKU_MODEL, label: env.OPENAI_DEFAULT_HAIKU_MODEL })
  }
  upsertCompatibleConnection({
    protocol: 'openai',
    name: url ? url.host : 'OpenAI Compatible (migrated)',
    endpoint,
    apiKey: apiKey ?? '',
    models: models.length > 0 ? models : undefined,
  })
  return true
}

function migrateLegacyGemini(env: Record<string, string>): boolean {
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) return false
  const baseUrl = env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta'
  const existing = getConnections().find(c => c.protocol === 'gemini' && c.auth.type === 'api_key')
  if (existing) return false
  const url = (() => {
    try {
      return new URL(baseUrl)
    } catch {
      return null
    }
  })()
  const models: ConnectionModelRecord[] = []
  if (env.GEMINI_DEFAULT_OPUS_MODEL) {
    models.push({ id: env.GEMINI_DEFAULT_OPUS_MODEL, label: env.GEMINI_DEFAULT_OPUS_MODEL })
  }
  if (env.GEMINI_DEFAULT_SONNET_MODEL) {
    models.push({ id: env.GEMINI_DEFAULT_SONNET_MODEL, label: env.GEMINI_DEFAULT_SONNET_MODEL })
  }
  if (env.GEMINI_DEFAULT_HAIKU_MODEL) {
    models.push({ id: env.GEMINI_DEFAULT_HAIKU_MODEL, label: env.GEMINI_DEFAULT_HAIKU_MODEL })
  }
  upsertCompatibleConnection({
    protocol: 'gemini',
    name: url ? url.host : 'Gemini API (migrated)',
    endpoint: baseUrl,
    apiKey,
    models: models.length > 0 ? models : undefined,
  })
  return true
}

/**
 * Migra config legada basada en env a registros de conexión, la primera vez
 * tras el upgrade. Idempotente. No borra el env — scripts externos pueden
 * seguir dependiendo de él.
 */
export function migrateLegacyEnvToConnections(
  envSource: Record<string, string>,
): { migrated: string[]; clearedModelType: boolean } {
  const migrated: string[] = []
  if (migrateLegacyAnthropicCompat(envSource)) migrated.push('anthropic')
  if (migrateLegacyOpenAICompat(envSource)) migrated.push('openai')
  if (migrateLegacyGemini(envSource)) migrated.push('gemini')

  let clearedModelType = false
  if (getConnections().length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getSettings, updateSettingsForSource } = require('@thyrox/config/settings') as {
        getSettings: () => { modelType?: unknown; mainLoopModel?: unknown } | undefined
        updateSettingsForSource: (source: string, payload: Record<string, undefined>) => void
      }
      const userSettings = getSettings()
      const clearPayload: Record<string, undefined> = {}
      if (userSettings?.modelType) clearPayload.modelType = undefined
      const mlm = userSettings?.mainLoopModel
      if (typeof mlm === 'string' && !mlm.includes(':')) {
        const allModelIds = getConnections().flatMap(c => c.models.map(m => m.id))
        if (!allModelIds.includes(mlm)) {
          clearPayload.mainLoopModel = undefined
        }
      }
      if (Object.keys(clearPayload).length > 0) {
        updateSettingsForSource('userSettings', clearPayload)
        clearedModelType = 'modelType' in clearPayload
      }
    } catch {
      // Migración best-effort; nunca bloquea el arranque.
    }

    const hasCodex = getConnections().some(c => c.protocol === 'codex')
    if (hasCodex) {
      try {
        requireConfig().saveGlobalConfig(current => {
          const env = current.env ?? {}
          if (env.CLAUDE_CODE_USE_OPENAI !== '1') return current
          const { CLAUDE_CODE_USE_OPENAI: _drop, ...rest } = env
          void _drop
          return { ...current, env: rest }
        })
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { readEnv, deleteEnv } = require('@thyrox/config/env/utils') as {
          readEnv: (name: string) => string | undefined
          deleteEnv: (name: string) => void
        }
        if (readEnv('CLAUDE_CODE_USE_OPENAI') === '1') {
          deleteEnv('CLAUDE_CODE_USE_OPENAI')
        }
      } catch {
        // Best-effort; nunca bloquea el arranque.
      }
    }
  }

  return { migrated, clearedModelType }
}
