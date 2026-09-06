/**
 * El gate de lecturas cruzadas entre modelos, contra la superficie real.
 *
 * La superficie real de la caché de prompt es su CLAVE, y la clave incluye el
 * modelo (`cacheBreak.ts` / `promptCacheKey`): sistema + herramientas + modelo
 * + prefijo + pensamiento. Consecuencia dura: **un modelo no puede releer la
 * caché que escribió otro.** Cualquier cálculo de coste o plan de despacho que
 * acredite una lectura de caché a través de un cambio de modelo está midiendo
 * contra una superficie que no existe.
 *
 * Este módulo hace esa cuenta auditable. Cada lectura que una vía o un despacho
 * cobra se declara como un `ReadCredit` con dos modelos: el que LEE (`reader`) y
 * el que ESCRIBIÓ esa caché (`writer`). En la superficie real esos dos son
 * SIEMPRE el mismo; `crossModelReads` devuelve los que no lo son.
 *
 * El gate no arregla un defecto —hoy el árbol acredita 0 lecturas cruzadas—:
 * es una guarda contra la regresión. Su control positivo se obtiene anulando la
 * guarda y midiendo (sub-patrón D de `metrica-decide-la-conclusion.md`), no con
 * un caso fabricado; la suite trae además el discriminador puro.
 */
import type { AgentDefinition } from '../types.ts'
import type { Route } from './cacheRoutes.ts'
import type { DispatchPlan } from './policy.ts'
import { promptCacheKey } from './cacheBreak.ts'

/** Una lectura de caché cobrada, atribuida a quien lee y a quien la escribió. */
export type ReadCredit = {
  /** Modelo que hace la lectura. */
  reader: string
  /** Modelo que escribió la caché que se lee (a cuyo precio se cobra). */
  writer: string
  tokens: number
  label: string
}

/**
 * Las lecturas que cruzan modelos: `reader !== writer`.
 *
 * Métrica: igualdad de los dos modelos de cada `ReadCredit`.
 * Ciega a: un crédito que la fuente omita del todo (no puede auditar lo que no
 * se declara); a las betas y `extra_body`, que no fijan la clave por definición.
 */
export function crossModelReads(credits: ReadCredit[]): ReadCredit[] {
  return credits.filter((c) => c.reader !== c.writer)
}

/** Aplana las lecturas que cada vía de `routesForOtherModel` declara. */
export function routeReadCredits(routes: Route[]): ReadCredit[] {
  return routes.flatMap((r) => r.readCredits)
}

/**
 * Las lecturas que un `DispatchPlan` acredita, medidas contra el modelo REAL de
 * cada agente (`promptCacheKey`), no contra la etiqueta del grupo.
 *
 * El ahorro de un grupo asume que el 2.º agente y siguientes releen la caché
 * que escribió el 1.º. Escritor = modelo real del primer agente del grupo;
 * lector = modelo real de cada agente siguiente. Si el plan agrupó bien, los dos
 * coinciden. Si metió dos modelos en un grupo, el lector diverge y sale cruzada
 * — que es justo lo que la superficie real prohíbe.
 */
export function dispatchReadCredits(
  agents: AgentDefinition[],
  plan: DispatchPlan,
  sharedPrefixTokens: number,
  provider = 'first_party',
): ReadCredit[] {
  const byName = new Map(agents.map((a) => [a.name, a]))
  const credits: ReadCredit[] = []
  for (const g of plan.groups) {
    if (g.agents.length < 2) continue // sin relectura: el 1.º sólo escribe
    const first = byName.get(g.agents[0] as string)
    if (!first) continue
    const writer = promptCacheKey(first, provider).model
    for (const name of g.agents.slice(1)) {
      const a = byName.get(name)
      if (!a) continue
      const reader = promptCacheKey(a, provider).model
      credits.push({ reader, writer, tokens: sharedPrefixTokens, label: `despacho grupo ${g.key} · ${name}` })
    }
  }
  return credits
}
