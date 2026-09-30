/**
 * A dónde reenvía el servidor MITM una petición descifrada, y en qué formato
 * espera el agente la respuesta: el sobre cloudcode de Antigravity va al
 * punto antigravity (que traduce ida y vuelta), un cuerpo OpenAI a chat, y
 * los agentes que hablan Anthropic a `/v1/messages`. También resuelve el
 * alias que el usuario fijó para el modelo de origen.
 *
 * Porte de `omniroute: src/mitm/_internal/forwardTarget.cjs` y
 * `_internal/standaloneRouting.cjs` (MIT). Los alias salen de la tabla
 * `mitm_alias` del store del AgentBridge; thyrox no tiene el `db.json`
 * heredado que la referencia leía como respaldo.
 */
import type { Database } from 'bun:sqlite'

import { type MitmAliasEntry, normalizeAliasMappings } from '../aliasConfig.ts'
import { getMitmAlias } from '../state/mitmAlias.ts'

export const CHAT_PATH = '/v1/chat/completions'
export const ANTIGRAVITY_PATH = '/v1/antigravity'

export type ForwardFormat = 'antigravity' | 'openai' | 'anthropic'

export interface ForwardTarget {
  url: string
  format: ForwardFormat
}

/** ¿Es el sobre cloudcode de Antigravity (`request.contents` como arreglo)? */
export function isCloudcodeEnvelope(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false
  const request = (body as { request?: unknown }).request
  return !!request && typeof request === 'object' && Array.isArray((request as { contents?: unknown }).contents)
}

export function resolveForwardTarget(baseUrl: string, body: unknown): ForwardTarget {
  const base = String(baseUrl || '').replace(/\/+$/, '')
  if (isCloudcodeEnvelope(body)) return { url: `${base}${ANTIGRAVITY_PATH}`, format: 'antigravity' }
  return { url: `${base}${CHAT_PATH}`, format: 'openai' }
}

export interface AgentRouteConfig {
  aliasKey: string
  chatUrlPatterns: string[]
  routerPath: string
}

const AGENT_ROUTE_CONFIG: Record<string, AgentRouteConfig> = {
  antigravity: {
    aliasKey: 'antigravity',
    chatUrlPatterns: [':generateContent', ':streamGenerateContent'],
    routerPath: CHAT_PATH,
  },
  'claude-code': { aliasKey: 'claude-code', chatUrlPatterns: ['/v1/messages'], routerPath: '/v1/messages' },
  kiro: { aliasKey: 'kiro', chatUrlPatterns: ['/v1/messages'], routerPath: '/v1/messages' },
}

/** La configuración de ruta del agente; un agente desconocido usa la de antigravity. */
export function getAgentRouteConfig(agentId: string): AgentRouteConfig {
  return AGENT_ROUTE_CONFIG[agentId] ?? AGENT_ROUTE_CONFIG.antigravity!
}

/** El destino lo decide la ruta del agente, no su identificador. */
export function resolveForwardTargetForAgent(options: {
  routerBaseUrl: string
  routerMessagesUrl: string
  body: unknown
  agentId: string
  fallbackResolver: (baseUrl: string, body: unknown) => ForwardTarget
}): ForwardTarget {
  if (getAgentRouteConfig(options.agentId).routerPath === '/v1/messages') {
    return { format: 'anthropic', url: options.routerMessagesUrl }
  }
  return options.fallbackResolver(options.routerBaseUrl, options.body)
}

/**
 * El alias del modelo en el espacio del agente, o su comodín `*`. Un store
 * ilegible no da alias: el servidor sigue reenviando sin remapear.
 */
export function resolveMappedOverride(db: Database, model: string, agentId: string): MitmAliasEntry | null {
  if (!model) return null
  try {
    const mappings = normalizeAliasMappings(getMitmAlias(db, getAgentRouteConfig(agentId).aliasKey))
    return mappings[model] ?? mappings['*'] ?? null
  } catch {
    return null
  }
}
