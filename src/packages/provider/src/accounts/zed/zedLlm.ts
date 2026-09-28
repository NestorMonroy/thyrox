/**
 * El token LLM de Zed y el catálogo de modelos que abre. La credencial de
 * usuario (`<userId> <token>`) se cambia en `/client/llm_tokens` por un
 * token de modelo de vida corta, que se guarda cincuenta minutos y se pide de
 * nuevo cuando el servidor responde 401 o lo marca caducado. Con él se lee el
 * catálogo vivo de `/models`, que se guarda una hora; nunca hay una lista fija.
 *
 * Porte de la mitad LLM de `omniroute: open-sse/shared/zedAuth.ts` (MIT).
 */
import type { JsonRecord } from '../oauth/oauthFlows.ts'
import { buildZedUserAuthHeader, fetchZedAuthenticatedUser, resolveZedOrganizationId, ZED_CLOUD_BASE_URL, ZED_SYSTEM_ID_HEADER, type ZedCredentials, type ZedRequestConfig } from './zedNativeAuth.ts'

export const ZED_LLM_BASE_URL = 'https://cloud.zed.dev'

export const ZED_HEADERS = {
  expiredToken: 'x-zed-expired-token',
  outdatedToken: 'x-zed-outdated-token',
  clientSupportsStatus: 'x-zed-client-supports-status-messages',
  clientSupportsStreamEnded: 'x-zed-client-supports-stream-ended-request-completion-status',
  serverSupportsStatus: 'x-zed-server-supports-status-messages',
  clientSupportsXai: 'x-zed-client-supports-x-ai',
  systemId: ZED_SYSTEM_ID_HEADER,
} as const

const LLM_TOKEN_TTL_MS = 50 * 60 * 1000
const MODEL_CACHE_TTL_MS = 60 * 60 * 1000
const UNAUTHORIZED = 401
/** La cola del token de usuario basta para separar cuentas en la clave de caché sin guardarlo entero. */
const TOKEN_TAIL = 16

export type ZedLlmConfig = ZedRequestConfig & { llmBaseUrl?: string }
export type ZedRawModel = Record<string, unknown>

export interface ZedModel {
  id: string
  name: string
  provider: unknown
  isLatest: boolean
  contextLength: unknown
  contextLengthInMaxMode: unknown
  maxOutputTokens: unknown
  supportsTools: boolean
  supportsImages: boolean
  supportsThinking: boolean
  supportsDisablingThinking: boolean
  supportsFastMode: boolean
  supportsServerSideCompaction: boolean
  supportedEffortLevels: unknown
  supportsStreamingTools: boolean
  supportsParallelToolCalls: boolean
  isDisabled: boolean
  disabledReason: unknown
}

export interface ZedModelCatalog {
  expiresAt: number
  models: ZedModel[]
  rawModels: ZedRawModel[]
  rawById: Map<string, ZedRawModel>
  defaultModel: string
  defaultFastModel: string
  recommendedModels: string[]
}

const baseUrl = (value: unknown, fallback: string) => String(value || fallback).replace(/\/+$/, '')
const systemIdOf = (credentials: ZedCredentials) => String(credentials.providerSpecificData?.systemId || credentials.systemId || '')
const tokenTail = (credentials: ZedCredentials) => (credentials.accessToken || credentials.apiKey || '').slice(-TOKEN_TAIL)

export function shouldRefreshZedLlmToken(response: Response | null | undefined): boolean {
  return response?.status === UNAUTHORIZED || !!response?.headers?.has?.(ZED_HEADERS.expiredToken) || !!response?.headers?.has?.(ZED_HEADERS.outdatedToken)
}

/** Zed escribe un id como cadena, como arreglo de uno o como objeto con `id`. */
export function normalizeZedModelId(id: unknown): string {
  if (!id) return ''
  if (typeof id === 'string') return id
  if (typeof id === 'object') {
    const record = id as Record<string | number, unknown>
    if (typeof record[0] === 'string') return record[0]
    if (typeof record.id === 'string') return record.id
  }
  return String(id)
}

export function mapZedModel(model: ZedRawModel): ZedModel | null {
  const id = normalizeZedModelId(model?.id)
  if (!id) return null
  return {
    id,
    name: (model.display_name as string) || (model.displayName as string) || id,
    provider: model.provider,
    isLatest: !!model.is_latest,
    contextLength: model.max_token_count ?? model.maxTokenCount,
    contextLengthInMaxMode: model.max_token_count_in_max_mode ?? model.maxTokenCountInMaxMode,
    maxOutputTokens: model.max_output_tokens ?? model.maxOutputTokens,
    supportsTools: !!model.supports_tools,
    supportsImages: !!model.supports_images,
    supportsThinking: !!model.supports_thinking,
    supportsDisablingThinking: !!model.supports_disabling_thinking,
    supportsFastMode: !!model.supports_fast_mode,
    supportsServerSideCompaction: !!model.supports_server_side_compaction,
    supportedEffortLevels: model.supported_effort_levels ?? model.supportedEffortLevels ?? [],
    supportsStreamingTools: !!model.supports_streaming_tools,
    supportsParallelToolCalls: !!model.supports_parallel_tool_calls,
    isDisabled: !!model.is_disabled,
    disabledReason: model.disabled_reason ?? null,
  }
}

export interface ZedLlmOptions {
  config?: ZedLlmConfig
  organizationId?: string
  forceRefresh?: boolean
  signal?: AbortSignal | null
}

export function createZedLlmClient(deps: { fetch?: typeof globalThis.fetch; now?: () => number } = {}) {
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now
  const llmTokens = new Map<string, { token: string; expiresAt: number }>()
  const models = new Map<string, ZedModelCatalog>()
  const inFlight = new Map<string, Promise<ZedModelCatalog>>()

  async function fetchJson(url: string, init: RequestInit): Promise<JsonRecord | null> {
    const response = await fetch(url, init)
    const text = await response.text()
    let data: JsonRecord | null = null
    if (text) {
      try {
        data = JSON.parse(text) as JsonRecord
      } catch {
        data = { raw: text }
      }
    }
    if (!response.ok) {
      const nested = data?.error as JsonRecord | string | undefined
      const message = data?.message || (typeof nested === 'object' ? nested?.message : undefined) || nested || text || `HTTP ${response.status}`
      throw Object.assign(new Error(String(message)), { status: response.status, body: data })
    }
    return data
  }

  async function fetchLlmToken(credentials: ZedCredentials, options: ZedLlmOptions = {}): Promise<string> {
    const config = options.config ?? {}
    let organizationId = options.organizationId || resolveZedOrganizationId(credentials)
    if (!organizationId) organizationId = resolveZedOrganizationId(credentials, await fetchZedAuthenticatedUser(fetch, credentials, config))
    if (!organizationId) throw new Error('No Zed organization selected')
    const userId = credentials.providerSpecificData?.userId || credentials.userId || 'unknown'
    const cacheKey = `${userId}:${organizationId}:${tokenTail(credentials)}`
    const cached = llmTokens.get(cacheKey)
    if (!options.forceRefresh && cached && cached.expiresAt > now()) return cached.token
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: buildZedUserAuthHeader(credentials) }
    const systemId = systemIdOf(credentials)
    if (systemId) headers[ZED_HEADERS.systemId] = systemId
    const data = await fetchJson(`${baseUrl(config.cloudBaseUrl, ZED_CLOUD_BASE_URL)}/client/llm_tokens`, { method: 'POST', headers, body: JSON.stringify({ organization_id: organizationId }), signal: options.signal ?? undefined })
    const raw = data?.token as unknown
    const token = typeof raw === 'string' ? raw : (raw as Record<string | number, unknown> | undefined)?.[0] || (raw as JsonRecord | undefined)?.value
    if (!token || typeof token !== 'string') throw new Error('Zed did not return an LLM token')
    llmTokens.set(cacheKey, { token, expiresAt: now() + LLM_TOKEN_TTL_MS })
    return token
  }

  /** Una petición al servicio LLM con el token de modelo; si lo rechaza, una sola vez más con uno nuevo. */
  async function llmFetch(credentials: ZedCredentials, path: string, options: ZedLlmOptions & { fetchOptions?: RequestInit } = {}): Promise<Response> {
    const url = `${baseUrl(options.config?.llmBaseUrl, ZED_LLM_BASE_URL)}${path}`
    const send = async (forceRefresh: boolean) => {
      const token = await fetchLlmToken(credentials, { ...options, forceRefresh })
      return fetch(url, { ...options.fetchOptions, headers: { ...((options.fetchOptions?.headers as Record<string, string>) ?? {}), Authorization: `Bearer ${token}` }, signal: options.signal ?? undefined })
    }
    const response = await send(false)
    return shouldRefreshZedLlmToken(response) ? send(true) : response
  }

  async function loadModels(credentials: ZedCredentials, key: string, options: ZedLlmOptions): Promise<ZedModelCatalog> {
    const response = await llmFetch(credentials, '/models', { ...options, fetchOptions: { method: 'GET', headers: { Accept: 'application/json', [ZED_HEADERS.clientSupportsXai]: 'true' } } })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Zed models failed: ${response.status} ${text}`)
    }
    const data = (await response.json()) as JsonRecord | null
    const rawModels: ZedRawModel[] = Array.isArray(data?.models) ? (data.models as ZedRawModel[]) : []
    const rawById = new Map<string, ZedRawModel>()
    for (const raw of rawModels) {
      const id = normalizeZedModelId(raw?.id)
      if (id) rawById.set(id, raw)
    }
    const recommended = (data?.recommended_models || data?.recommendedModels || []) as unknown[]
    const entry: ZedModelCatalog = {
      expiresAt: now() + MODEL_CACHE_TTL_MS,
      models: rawModels.map(mapZedModel).filter((model): model is ZedModel => !!model && !model.isDisabled),
      rawModels,
      rawById,
      defaultModel: normalizeZedModelId(data?.default_model ?? data?.defaultModel),
      defaultFastModel: normalizeZedModelId(data?.default_fast_model ?? data?.defaultFastModel),
      recommendedModels: recommended.map(normalizeZedModelId).filter(Boolean),
    }
    models.set(key, entry)
    return entry
  }

  /** El catálogo vivo; lecturas concurrentes de la misma cuenta comparten una petición. */
  async function resolveModels(credentials: ZedCredentials, options: ZedLlmOptions = {}): Promise<ZedModelCatalog | null> {
    if (!credentials?.accessToken) return null
    const declared = credentials.providerSpecificData
    const key = `${declared?.userId || 'unknown'}:${declared?.organizationId || declared?.defaultOrganizationId || 'default'}:${tokenTail(credentials)}`
    const cached = models.get(key)
    if (!options.forceRefresh && cached && cached.expiresAt > now()) return cached
    const existing = inFlight.get(key)
    if (existing && !options.forceRefresh) return existing
    const promise = loadModels(credentials, key, options)
    inFlight.set(key, promise)
    try {
      return await promise
    } finally {
      if (inFlight.get(key) === promise) inFlight.delete(key)
    }
  }

  function clearCaches(): void {
    llmTokens.clear()
    models.clear()
    inFlight.clear()
  }

  return { fetchLlmToken, llmFetch, resolveModels, clearCaches }
}
