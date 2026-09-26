/**
 * El enlace entre una definición de agente y la política de TTL de caché.
 *
 * DEC-04 reparte las dos mitades y este archivo es la costura. El MECANISMO
 * —cómo se elige un TTL a partir del modelo y del hueco esperado entre
 * turnos— es del proveedor y vive en `policy.chooseCacheTtl`, con la medición
 * que lo sostiene: la escritura de caché a 1 h cuesta 1.6× la de 5 m en todos
 * los tiers, así que **una sola caducidad** de la de 5 m dentro de la hora ya
 * paga la prima. El PARÁMETRO —cuánto hueco tiene ESTE agente— lo declara
 * quien define el agente, en `expectedGapMinutes`.
 *
 * Por qué existe: el mecanismo llevaba construido, exportado y probado, y
 * **ningún consumidor decidía nada con él** — 0 de 0 agentes emitidos
 * declaraban `experimental.cacheTtl`. Capacidad muerta, la forma que
 * `flow-selection-agile.md` describe: crear la pieza no garantiza que se use.
 *
 * Lo que este módulo NO hace, a propósito:
 *
 * - **No reimplementa el umbral.** Si `policy` mueve los 5 o los 60 minutos,
 *   aquí no hay nada que tocar. Copiarlo sería la segunda fuente de verdad
 *   que `calibration-verified-numbers.md` prohíbe.
 * - **No adivina cuando no puede saber.** Con `model: 'inherit'` el tier de
 *   precio es desconocido —el modelo lo resuelve la sesión, no la
 *   definición— y `pricingOf` lanza ante un id fuera del catálogo. Devolver
 *   un TTL ahí publicaría una decisión que nadie tomó; se rehúsa con la razón
 *   escrita, que es lo que un llamador puede citar.
 * - **No decide por el que ya decidió.** Un `experimental.cacheTtl` explícito
 *   gana sobre el derivado: es una decisión declarada, y la derivación existe
 *   para los que no la tomaron.
 */
import { DEFAULT_TTL_BY_SOURCE } from '@thyrox/provider/cost/cacheRoutes'
import { chooseCacheTtl } from '@thyrox/provider/cost/policy'
import {
  isMainThreadSource,
  resolveExplicitPromptCacheTtl,
  type PromptCacheTtlDecision,
  type PromptCacheTtlEnv,
} from './promptCacheTtl.ts'
import type { AgentDefinition, CacheTtl } from './types.ts'

/** El TTL resuelto y la razón por la que ése — o por la que ninguno. */
export type ResolvedCacheTtl = {
  /** `undefined` cuando no hay con qué decidir; NUNCA un default inventado. */
  readonly ttl?: CacheTtl
  readonly why: string
}

export function resolveCacheTtl(agent: AgentDefinition): ResolvedCacheTtl {
  return decidedTtl(agent.experimental?.cacheTtl, agent.model, agent.expectedGapMinutes)
}

/** El origen de una petición: decide el TTL cuando nadie declaró uno. */
export type RequestSource = keyof typeof DEFAULT_TTL_BY_SOURCE

export type RequestCacheTtlInputs = {
  readonly declared?: CacheTtl
  readonly model?: string
  readonly expectedGapMinutes?: number
  readonly source: RequestSource
  /** Las variables `THYROX_*` del TTL; por defecto, el entorno del proceso. */
  readonly env?: PromptCacheTtlEnv
}

/**
 * El TTL de UNA petición, que siempre lleva uno: el declarado, el que el
 * hueco entre turnos justifica o, sin ninguno de los dos, el del origen —la
 * tabla que el ejecutable aplica (`DEFAULT_TTL_BY_SOURCE`)—. El bucle lo
 * resuelve una vez y lo usan la petición, el costo del turno y el cambio de
 * modelo.
 */
export function resolveRequestCacheTtl(inputs: RequestCacheTtlInputs): { ttl: CacheTtl; why: string } {
  // Primero la cadena del ejecutable (`QCt`): forzar 5m, la variable y el
  // setting van por encima de lo declarado. Lo declarado vuelve a su camino
  // de siempre para conservar su razón y el costeo del hueco que le sigue.
  const explicit = resolveExplicitPromptCacheTtl(inputs.source, inputs.declared, false,
                                                 { env: inputs.env ?? process.env })
  if (explicit !== undefined && explicit.reason !== 'agent_frontmatter') {
    return { ttl: explicit.ttl, why: `${explicit.reason}: ${explicitVariable(inputs.source, explicit)} (${explicit.ttl})` }
  }
  const decided = decidedTtl(inputs.declared, inputs.model, inputs.expectedGapMinutes)
  if (decided.ttl !== undefined) return { ttl: decided.ttl, why: decided.why }
  const ttl = DEFAULT_TTL_BY_SOURCE[inputs.source]
  return { ttl, why: `default del origen ${inputs.source} (${ttl}); ${decided.why}` }
}

/** La variable que decidió, para que la razón la nombre. */
function explicitVariable(source: RequestSource, decision: PromptCacheTtlDecision): string {
  switch (decision.reason) {
    case 'force_5m_env': return 'THYROX_FORCE_PROMPT_CACHING_5M'
    case 'enable_1h_env': return 'THYROX_ENABLE_PROMPT_CACHING_1H'
    case 'env': return isMainThreadSource(source) ? 'THYROX_CODE_PROMPT_CACHE_TTL' : 'THYROX_CODE_SUBAGENT_PROMPT_CACHE_TTL'
    default: return decision.reason
  }
}

/** Los dos primeros pasos, compartidos: lo declarado y lo que el hueco justifica. */
function decidedTtl(declared: CacheTtl | undefined, model: string | undefined, gap: number | undefined): ResolvedCacheTtl {
  if (declared !== undefined) {
    return { ttl: declared, why: `TTL declarado en la definición (${declared})` }
  }
  if (gap === undefined) {
    return { why: 'sin `expectedGapMinutes`: no hay hueco declarado que costear' }
  }
  if (model === undefined || model === 'inherit') {
    // El modelo lo resuelve la sesión, así que el tier —y con él la prima de
    // la escritura a 1 h— no se conoce al emitir. Es una incógnita del
    // consumidor, no un hueco de este módulo.
    return { why: 'el modelo es `inherit`: sin tier no hay prima que costear' }
  }
  try {
    const eleccion = chooseCacheTtl(model, gap)
    return { ttl: eleccion.ttl, why: eleccion.why }
  } catch {
    // `pricingOf` lanza ante un id que el catálogo no declara. Se convierte
    // en una negativa con razón en vez de propagarse: emitir un agente no
    // debe reventar porque su modelo no esté en el catálogo vendorizado.
    return { why: `${model}: sin tier de precio en el catálogo` }
  }
}
