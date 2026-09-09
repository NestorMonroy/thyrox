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
import { chooseCacheTtl } from '@thyrox/provider/cost/policy'
import type { AgentDefinition, CacheTtl } from './types.ts'

/** El TTL resuelto y la razón por la que ése — o por la que ninguno. */
export type ResolvedCacheTtl = {
  /** `undefined` cuando no hay con qué decidir; NUNCA un default inventado. */
  readonly ttl?: CacheTtl
  readonly why: string
}

export function resolveCacheTtl(agent: AgentDefinition): ResolvedCacheTtl {
  const declarado = agent.experimental?.cacheTtl
  if (declarado !== undefined) {
    return { ttl: declarado, why: `TTL declarado en la definición (${declarado})` }
  }
  const gap = agent.expectedGapMinutes
  if (gap === undefined) {
    return { why: 'sin `expectedGapMinutes`: no hay hueco declarado que costear' }
  }
  if (agent.model === undefined || agent.model === 'inherit') {
    // El modelo lo resuelve la sesión, así que el tier —y con él la prima de
    // la escritura a 1 h— no se conoce al emitir. Es una incógnita del
    // consumidor, no un hueco de este módulo.
    return { why: 'el modelo es `inherit`: sin tier no hay prima que costear' }
  }
  try {
    const eleccion = chooseCacheTtl(agent.model, gap)
    return { ttl: eleccion.ttl, why: eleccion.why }
  } catch {
    // `pricingOf` lanza ante un id que el catálogo no declara. Se convierte
    // en una negativa con razón en vez de propagarse: emitir un agente no
    // debe reventar porque su modelo no esté en el catálogo vendorizado.
    return { why: `${agent.model}: sin tier de precio en el catálogo` }
  }
}
