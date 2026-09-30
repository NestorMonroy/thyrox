/**
 * El filtro de la lista del inspector de tráfico, puro: perfil, host, agente,
 * fuente, sesión, mismo contexto, sólo en curso y categoría de estado.
 *
 * Porte de `omniroute: src/lib/inspector/matchesTrafficFilter.ts` (MIT).
 */
import type { InterceptedRequest, ListFilters } from './types.ts'

export type TrafficFilters = ListFilters & {
  /** Sólo peticiones con el mismo prompt de sistema. */
  sameContextKey?: string
  /** Sólo las que siguen abiertas. */
  liveOnly?: boolean
}

export function matchesTrafficFilter(req: InterceptedRequest, f: TrafficFilters): boolean {
  if (f.profile === 'llm' && req.detectedKind !== 'llm') return false
  if (f.profile === 'custom' && req.source !== 'custom-host') return false
  if (f.host && !req.host.includes(f.host)) return false
  if (f.agent && req.agent !== f.agent) return false
  if (f.source && req.source !== f.source) return false
  if (f.sessionId && req.sessionId !== f.sessionId) return false
  if (f.sameContextKey && req.contextKey !== f.sameContextKey) return false
  if (f.liveOnly && req.status !== 'in-flight') return false
  return f.status ? matchesStatusCategory(req.status, f.status) : true
}

/** Un estado numérico cae en su centena (`2xx`…); `error` sólo casa con el estado de error. */
function matchesStatusCategory(status: InterceptedRequest['status'], wanted: string): boolean {
  if (typeof status === 'number') return `${Math.floor(status / 100)}xx` === wanted
  return wanted !== 'error' || status === 'error'
}
