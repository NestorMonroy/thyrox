#!/usr/bin/env bun
/**
 * Gate: ningún cálculo de coste ni plan de despacho acredita una lectura de
 * caché a través de un cambio de modelo.
 *
 * La superficie real es la clave de caché, que incluye el modelo: un modelo no
 * relee la caché que escribió otro. El gate recorre la superficie real —todos
 * los pares del catálogo por `routesForOtherModel`, y las definiciones reales
 * por `dispatchPlan`— y marca todo `ReadCredit` con `reader !== writer`.
 *
 * Exit 0 si no hay ninguna; exit 1 con la lista si la hay. Imprime el
 * denominador: un conteo sin universo no es un resultado.
 */
import { CATALOG } from '../src/models.ts'
import { routesForOtherModel } from '../src/cost/cacheRoutes.ts'
import { dispatchPlan } from '../src/cost/policy.ts'
import { AGENTS } from '../src/index.ts'
import { crossModelReads, dispatchReadCredits, routeReadCredits, type ReadCredit } from '../src/cost/crossModelRead.ts'

const FLOOR = 126_029 // piso siempre-cargado de esta sesión (H-DOCS-99)
const violations: ReadCredit[] = []

// 1. Rutas: todos los pares ordenados del catálogo con precio.
const priced = CATALOG.models.filter((m) => m.pricing).map((m) => m.id)
let pares = 0
let creditosRuta = 0
for (const from of priced) {
  for (const to of priced) {
    if (from === to) continue
    pares++
    const routes = routesForOtherModel({
      from, to, contextTokens: 50_000, turnsOnTarget: 3, outputTokens: 500,
      subagentFloorTokens: FLOOR, subagentReadTokens: 20_000,
    })
    const credits = routeReadCredits(routes)
    creditosRuta += credits.length
    violations.push(...crossModelReads(credits))
  }
}

// 2. Despacho: las definiciones reales agrupadas por clave de caché.
const plan = dispatchPlan(AGENTS, FLOOR)
const dispatchCredits = dispatchReadCredits(AGENTS, plan, FLOOR)
violations.push(...crossModelReads(dispatchCredits))

const grupos = plan.groups.length
console.log(
  `rutas: ${pares} pares de modelo, ${creditosRuta} lecturas acreditadas | ` +
    `despacho: ${AGENTS.length} definiciones en ${grupos} grupos, ${dispatchCredits.length} lecturas acreditadas`,
)

if (violations.length === 0) {
  console.log(`cross-model-read: 0 lecturas cruzadas (superficie real auditada)`)
  process.exit(0)
}

console.error(`cross-model-read: ${violations.length} lectura(s) cruzada(s) — la caché no cruza modelos:`)
for (const v of violations) {
  console.error(`  ${v.label}: lee ${v.reader} pero la escribió ${v.writer} (${v.tokens} tokens)`)
}
process.exit(1)
