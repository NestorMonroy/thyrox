/**
 * Porte COMPLETO de `ccnmt: packages/provider/src/providers.ts` — sus 8
 * exportaciones, ninguna omitida.
 *
 * `getGlobalConfig`/`getInitialSettings` (`@thyrox/config`) no resuelven
 * hoy → `require()` diferido, mismo criterio que `connections.ts`.
 * `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS` sí resuelve
 * en `@thyrox/local-observability/compat`.
 */

import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '@thyrox/local-observability/compat'
import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'
import { isFirstPartyAnthropicConnection, type ConnectionRecord } from './connections.ts'

export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry' | 'openai' | 'gemini' | 'codex'

function requireGlobalConfig(): {
  connections?: ConnectionRecord[]
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@thyrox/config') as { getGlobalConfig: () => { connections?: ConnectionRecord[] } }).getGlobalConfig()
}

function requireInitialSettings(): { modelType?: string } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@thyrox/config/settings') as { getInitialSettings: () => { modelType?: string } }).getInitialSettings()
}

export function getAPIProvider(): APIProvider {
  // V7 §11.6 — cuando HAY alguna conexión configurada, el registro de
  // conexiones es la fuente de verdad; esta función sólo es el fallback
  // global para rutas de código sin un modelo en la mano.
  const hasConnections = (() => {
    try {
      return (requireGlobalConfig().connections ?? []).some(c => c.enabled)
    } catch {
      return false
    }
  })()

  if (hasConnections) {
    if (isEnvTruthy(readEnv('CLAUDE_CODE_USE_BEDROCK'))) return 'bedrock'
    if (isEnvTruthy(readEnv('CLAUDE_CODE_USE_FOUNDRY'))) return 'foundry'
    if (isEnvTruthy(readEnv('CLAUDE_CODE_USE_VERTEX'))) return 'vertex'
    return 'firstParty'
  }

  const modelType = (() => {
    try {
      return requireInitialSettings().modelType
    } catch {
      return undefined
    }
  })()
  if (modelType === 'openai') return 'openai'
  if (modelType === 'gemini') return 'gemini'
  if (modelType === 'codex') return 'codex'

  if (isEnvTruthy(readEnv('CLAUDE_CODE_USE_BEDROCK'))) return 'bedrock'
  if (isEnvTruthy(readEnv('CLAUDE_CODE_USE_FOUNDRY'))) return 'foundry'
  if (isEnvTruthy(readEnv('CLAUDE_CODE_USE_VERTEX'))) return 'vertex'

  if (isEnvTruthy(readEnv('CLAUDE_CODE_USE_OPENAI'))) return 'openai'
  if (isEnvTruthy(readEnv('CLAUDE_CODE_USE_GEMINI'))) return 'gemini'

  return 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/** Todas las conexiones habilitadas desde config. */
export function getEnabledConnections(): ConnectionRecord[] {
  try {
    return (requireGlobalConfig().connections ?? []).filter(c => c.enabled)
  } catch {
    return []
  }
}

/**
 * Resuelve qué conexión usar para un modelo dado. Prefijo exacto
 * `<connId>:<modelo>` → id desnudo contra `models[].id` → familia
 * anthropic (alias legacy `opus`/`sonnet`/`haiku`).
 */
export function resolveConnectionForModel(modelId: string): ConnectionRecord | undefined {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { unpackModelId } = require('./connections.ts') as typeof import('./connections.ts')
  const { connectionId, modelId: bareModelId } = unpackModelId(modelId)

  if (connectionId) {
    const exact = getEnabledConnections().find(c => c.id === connectionId)
    if (exact) return exact
  }

  const normalizeForMatch = (id: string) => id.trim().toLowerCase().replace(/\[(1|2)m\]$/i, '')
  const normalized = normalizeForMatch(bareModelId)
  for (const conn of getEnabledConnections()) {
    for (const m of conn.models) {
      if (normalizeForMatch(m.id) === normalized) {
        return conn
      }
    }
    if (conn.protocol === 'anthropic') {
      if (
        (normalized.includes('opus') && conn.models.some(m => m.id.toLowerCase().includes('opus'))) ||
        (normalized.includes('sonnet') && conn.models.some(m => m.id.toLowerCase().includes('sonnet'))) ||
        (normalized.includes('haiku') && conn.models.some(m => m.id.toLowerCase().includes('haiku')))
      ) {
        return conn
      }
    }
  }
  return undefined
}

/** APIProvider a usar para un modelo específico; prefiere el ruteo por conexión. */
export function getProviderForModel(modelId: string): APIProvider {
  const conn = resolveConnectionForModel(modelId)
  if (!conn) return getAPIProvider()
  switch (conn.protocol) {
    case 'anthropic':
      return 'firstParty'
    case 'openai':
      return 'openai'
    case 'gemini':
      return 'gemini'
    case 'codex':
      return 'codex'
  }
}

/**
 * ¿La request para `modelId` va a llegar a un endpoint api.anthropic.com
 * ahora mismo? Gatea campos nativos como `eager_input_streaming` (FGTS) —
 * los proxies hablan el protocolo Anthropic pero rechazan esos campos.
 */
export function isFirstPartyAnthropicEndpoint(modelId?: string): boolean {
  if (modelId) {
    const conn = resolveConnectionForModel(modelId)
    if (conn) return isFirstPartyAnthropicConnection(conn)
  }
  return getAPIProvider() === 'firstParty' && isFirstPartyAnthropicBaseUrl()
}

/**
 * Predicado puro: ¿(provider, model) soporta la herramienta server-side
 * `web_search_20250305` de Anthropic? firstParty/Bedrock/Foundry siempre;
 * Vertex sólo en modelos Claude serie 4.
 */
export function isAnthropicServerWebSearchCapable(provider: APIProvider, modelId?: string): boolean {
  switch (provider) {
    case 'firstParty':
    case 'bedrock':
    case 'foundry':
      return true
    case 'vertex':
      if (!modelId) return false
      return /claude-(opus|sonnet|haiku)-4/i.test(modelId)
    default:
      return false
  }
}

/** ¿El provider activo soporta la web search server-side de Anthropic? */
export function supportsAnthropicServerWebSearch(modelId?: string): boolean {
  const provider = modelId ? getProviderForModel(modelId) : getAPIProvider()
  return isAnthropicServerWebSearchCapable(provider, modelId)
}

/**
 * ¿ANTHROPIC_BASE_URL es una URL first-party de Anthropic? true si no está
 * fijada (API por defecto) o apunta a api.anthropic.com (o
 * api-staging.anthropic.com para usuarios `ant`).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = readEnv('ANTHROPIC_BASE_URL')
  if (!baseUrl) return true
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
