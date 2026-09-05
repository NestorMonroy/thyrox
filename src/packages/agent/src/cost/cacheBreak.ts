/**
 * Qué rompe la caché de prompt, y cuándo dos agentes la comparten.
 *
 * La lista de causas es la que la referencia rastrea para explicar una caída
 * de `cache_read` (`ccb: packages/provider/src/promptCacheBreakDetection.ts`,
 * tipo `PendingChanges`): modelo, esfuerzo, prompt de sistema, esquemas de
 * herramientas, `cache_control` (TTL 5m↔1h, alcance), betas, fast mode y
 * `extra_body`. El ejecutable 2.1.258 confirma las dos primeras con su propio
 * diálogo: «This conversation is cached for the current <model | effort
 * level>» — cambiar el esfuerzo pierde la caché igual que cambiar el modelo.
 *
 * Consecuencia para un despacho: dos subagentes sólo releen lo que el otro
 * escribió si coinciden en TODAS las facetas que el cliente puede fijar por
 * definición. Un agente distinto tiene otro prompt de sistema, así que como
 * mucho comparte el prefijo de herramientas — y dónde cae el punto de corte
 * de caché en ese prefijo no está medido aquí (ver `sharesPromptCache`).
 */
import { resolveModel } from '../models.ts'
import type { AgentDefinition, CacheTtl } from '../types.ts'

/** Las causas de ruptura que la referencia rastrea, con su nombre de origen. */
export const CACHE_BREAK_CAUSES = [
  'modelChanged',
  'effortChanged',
  'systemPromptChanged',
  'toolSchemasChanged',
  'cacheControlChanged',
  'betasChanged',
  'fastModeChanged',
  'extraBodyChanged',
] as const
export type CacheBreakCause = (typeof CACHE_BREAK_CAUSES)[number]

/** Las facetas de la clave de caché que una definición de agente fija. */
export type CacheKeyFacet = 'model' | 'effort' | 'tools' | 'cacheTtl' | 'systemPrompt'

export type PromptCacheKey = {
  /** Identificador resuelto; `inherit` o un alias sin resolver quedan tal cual. */
  model: string
  effort: string
  /** Ordenadas: el orden de declaración no cambia el esquema enviado. */
  tools: string[]
  cacheTtl: CacheTtl | 'default'
  /** El nombre identifica el prompt de sistema: cada agente tiene el suyo. */
  systemPrompt: string
}

export function promptCacheKey(agent: AgentDefinition, provider = 'first_party'): PromptCacheKey {
  const declared = agent.model ?? 'inherit'
  const resolved = declared === 'inherit' ? 'inherit' : (resolveModel(String(declared), provider) ?? String(declared))
  return {
    model: resolved,
    effort: agent.effort === undefined ? 'default' : String(agent.effort),
    tools: [...(agent.tools ?? [])].sort(),
    cacheTtl: agent.experimental?.cacheTtl ?? 'default',
    systemPrompt: agent.name,
  }
}

export type CacheSharing = {
  /** `completo`: mismo agente y mismas facetas. `prefijo-de-herramientas`: distinto
   *  prompt de sistema pero mismo modelo, herramientas y TTL — sólo el tramo de
   *  herramientas puede compartirse, si el cliente pone ahí un punto de corte.
   *  `ninguno`: diverge en modelo, esfuerzo o TTL, que preceden a todo. */
  grado: 'completo' | 'prefijo-de-herramientas' | 'ninguno'
  diverge: CacheKeyFacet[]
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i])
}

/**
 * Si dos definiciones pueden releer la misma caché al correr juntas.
 *
 * Métrica: igualdad de las facetas que la definición fija (modelo resuelto,
 * esfuerzo, herramientas, TTL, nombre). Ciega a: dónde coloca el cliente los
 * puntos de corte (`globalCacheStrategy` tool_based | system_prompt en la
 * referencia) y a las betas y `extra_body`, que la definición no fija.
 */
export function sharesPromptCache(a: AgentDefinition, b: AgentDefinition, provider = 'first_party'): CacheSharing {
  const ka = promptCacheKey(a, provider)
  const kb = promptCacheKey(b, provider)
  const diverge: CacheKeyFacet[] = []
  if (ka.model !== kb.model) diverge.push('model')
  if (ka.effort !== kb.effort) diverge.push('effort')
  if (ka.cacheTtl !== kb.cacheTtl) diverge.push('cacheTtl')
  if (!sameList(ka.tools, kb.tools)) diverge.push('tools')
  if (ka.systemPrompt !== kb.systemPrompt) diverge.push('systemPrompt')
  if (diverge.length === 0) return { grado: 'completo', diverge }
  const soloPrompt = diverge.length === 1 && diverge[0] === 'systemPrompt'
  return { grado: soloPrompt ? 'prefijo-de-herramientas' : 'ninguno', diverge }
}
