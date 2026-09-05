/**
 * Estrategias de coste que el catálogo permite calcular, no estimar.
 *
 * Tres hechos del ejecutable 2.1.258 las gobiernan (ver
 * `analisis-cambio-de-modelo-cache-por-modelo-y-limites-de-uso`):
 *
 * 1. El precio es USD por millón de tokens, por tipo de token: entrada,
 *    salida, escritura de caché a 5 m, a 1 h, y lectura. El cliente divide por
 *    1e6 (`eke`) y multiplica ×1.1 si `inference_geo == "us"`.
 * 2. El 98 % de lo que un subagente consume es caché LEÍDA (medido en el
 *    store). Lo que decide el coste por turno es `cache_read × contexto`, no
 *    la entrada ni la salida.
 * 3. La caché es por modelo y por esfuerzo: cambiar cualquiera de los dos
 *    reescribe el contexto entero al precio de escritura del destino.
 *
 * Todo lo que sigue se deriva de esos tres con el catálogo vendorizado;
 * ninguna cifra vive aquí escrita a mano.
 */
import { CATALOG, MODELS, effortCostIndex, usageEquivalentTokens } from '../models.ts'
import type { EffortLevel, PricingTier } from '../models.ts'
import type { AgentDefinition, CacheTtl } from '../types.ts'
import { promptCacheKey } from './cacheBreak.ts'

function pricingOf(modelId: string): PricingTier {
  const p = MODELS[modelId]?.pricing
  if (!p) throw new Error(`${modelId}: sin tier de precio en el catálogo`)
  return p
}

// ---------------------------------------------------------------------------
// 1. Cambiar de modelo o de esfuerzo: el contexto se reescribe
// ---------------------------------------------------------------------------

/**
 * Las tres unidades de una ruta, y cuál manda.
 *
 * - **tokens crudos** — CAPACIDAD: `contextTokens`, lo que ocupa la ventana.
 * - **tokens equivalentes** — COSTE COMPARABLE: la unidad **primaria**, en la
 *   que se acumula y desde la que se deriva el USD.
 * - **USD** — FACTURA: depende de una tabla externa por build; se publica
 *   derivado, para hablar con quien paga.
 *
 * Y hay una diferencia con `compactionCost` que se declara en vez de
 * esconderse. Allí hay **un** modelo, así que el equivalente cancela la tarifa
 * y el resultado no depende del catálogo. Aquí se comparan **dos**, y la
 * diferencia de precio entre ellos es justo lo que se mide: no puede
 * cancelarse. Lo que el equivalente aporta entonces es una **vara declarada**,
 * no independencia de la tarifa — y la vara tiene que ser UNA sola, porque con
 * la de cada modelo el orden se invierte (ver `candidates`).
 */
export type SwitchCost = {
  from: string
  to: string
  contextTokens: number
  /** El tier cuyo token de entrada es la vara de los equivalentes. Default: el origen. */
  unitModel: string
  /** Reescribir el contexto en el destino, en equivalentes de `unitModel`. */
  rewriteEquiv5m: number
  rewriteEquiv1h: number
  /** Lo que ese mismo contexto cuesta leído cacheado en el origen, misma vara. */
  readEquivFrom: number
  /** Los mismos tres, derivados a la unidad de factura. */
  rewriteUsd5m: number
  rewriteUsd1h: number
  readUsdFrom: number
  /** Cuántas lecturas cacheadas caben en una reescritura. Invariante entre unidades. */
  ratio5m: number
  ratio1h: number
}

export function switchCost(
  from: string,
  to: string,
  contextTokens: number,
  unitModel: string = from,
): SwitchCost {
  pricingOf(from)
  pricingOf(to)
  const vara = pricingOf(unitModel).input
  const equiv = (modelId: string, ttl: '5m' | '1h', leido: boolean) =>
    usageEquivalentTokens(
      modelId,
      leido ? { cache_read_tokens: contextTokens } : { cache_creation_tokens: contextTokens },
      { unit: unitModel, cacheTtl: ttl },
    )

  const readEquivFrom = equiv(from, '5m', true)   // la lectura no depende del TTL
  const rewriteEquiv5m = equiv(to, '5m', false)
  const rewriteEquiv1h = equiv(to, '1h', false)

  // El puente a la factura: un solo escalar positivo para las tres cifras. De
  // ahí que los ratios de abajo salgan iguales leídos en cualquiera de las dos.
  const aUsd = (e: number) => (e * vara) / 1e6

  return {
    from,
    to,
    contextTokens,
    unitModel,
    rewriteEquiv5m,
    rewriteEquiv1h,
    readEquivFrom,
    rewriteUsd5m: aUsd(rewriteEquiv5m),
    rewriteUsd1h: aUsd(rewriteEquiv1h),
    readUsdFrom: aUsd(readEquivFrom),
    ratio5m: readEquivFrom === 0 ? Number.POSITIVE_INFINITY : rewriteEquiv5m / readEquivFrom,
    ratio1h: readEquivFrom === 0 ? Number.POSITIVE_INFINITY : rewriteEquiv1h / readEquivFrom,
  }
}

/** Cambiar el esfuerzo reescribe igual que cambiar el modelo: mismo origen y destino. */
export function effortSwitchCost(modelId: string, contextTokens: number): SwitchCost {
  return switchCost(modelId, modelId, contextTokens)
}

// ---------------------------------------------------------------------------
// 2. El TTL: 1 h cuesta una prima fija; se paga si la caché de 5 m caducaría
// ---------------------------------------------------------------------------

/**
 * Cuántas caducidades de la caché de 5 m compensan la prima de 1 h, por tier.
 *
 * Prima = (escritura 1 h − escritura 5 m); una caducidad cuesta una escritura
 * a 5 m entera. Si se esperan ≥ este número de huecos > 5 min dentro de la
 * hora, 1 h sale más barato. En todos los tiers del catálogo la escritura a
 * 1 h es 1.6× la de 5 m, así que el umbral es 0.6: con UN hueco esperado,
 * 1 h ya compensa.
 */
export function ttlBreakEvenExpiries(modelId: string): number {
  const p = pricingOf(modelId)
  return (p.cache_write_1h - p.cache_write_5m) / p.cache_write_5m
}

export type TtlChoice = { ttl: CacheTtl; why: string; breakEvenExpiries: number }

/**
 * Qué TTL declarar en `experimental.cacheTtl` para un agente.
 *
 * `expectedGapMinutes` es el hueco mayor que se espera entre dos turnos del
 * agente (una suite larga, una espera de Monitor). Por encima de 5 min la
 * caché de 5 m caduca y el turno siguiente reescribe.
 */
export function chooseCacheTtl(modelId: string, expectedGapMinutes: number): TtlChoice {
  const breakEvenExpiries = ttlBreakEvenExpiries(modelId)
  if (expectedGapMinutes > 60) {
    return { ttl: '5m', why: 'el hueco supera la hora: ninguna caché sobrevive y la prima de 1 h se paga en vano', breakEvenExpiries }
  }
  if (expectedGapMinutes > 5) {
    return { ttl: '1h', why: `un hueco de ${expectedGapMinutes} min caduca la caché de 5 m; una sola caducidad (≥ ${breakEvenExpiries.toFixed(2)}) ya paga la prima`, breakEvenExpiries }
  }
  return { ttl: '5m', why: 'turnos seguidos: la caché de 5 m no caduca y la prima de 1 h no compra nada', breakEvenExpiries }
}

// ---------------------------------------------------------------------------
// 3. Modelo y esfuerzo por tipo de tarea — evaluando TODO el catálogo
// ---------------------------------------------------------------------------

export const TASK_KINDS = ['mecanica', 'analisis', 'adversarial', 'frontera'] as const
export type TaskKind = (typeof TASK_KINDS)[number]

/**
 * Lo que cada tipo de tarea EXIGE, no qué modelo lo hace: el rango de
 * capacidad que el propio cliente declara (`advisor_rank`: 1 haiku-4-5, 2–3
 * sonnet, 3–4 opus, 5 fable/mythos) y el esfuerzo. Quién lo cumple más barato
 * se calcula sobre los 19 registros del catálogo — nombrar aquí un
 * identificador sería volver a decidir a mano lo que el catálogo sabe.
 */
export type TaskRequirement = { minAdvisorRank: number; effort: EffortLevel }

export const TASK_REQUIREMENTS: Record<TaskKind, TaskRequirement> = {
  mecanica: { minAdvisorRank: 1, effort: 'low' },
  analisis: { minAdvisorRank: 3, effort: 'high' },
  adversarial: { minAdvisorRank: 4, effort: 'high' },
  frontera: { minAdvisorRank: 5, effort: 'high' },
}

export type TurnProfile = {
  /** Contexto releído por turno (el piso siempre-cargado más lo leído). */
  contextTokens: number
  /** Caché escrita por turno (lo nuevo que entra al contexto). */
  cacheWriteTokens?: number
  outputTokens?: number
  cacheTtl?: CacheTtl
  /**
   * El tier cuyo token de entrada es la vara de los equivalentes. Sin él se
   * DERIVA del catálogo: el token de entrada más barato entre los candidatos.
   * La elección sólo mueve la escala, nunca el orden — pero tiene que ser UNA
   * para todos, y por eso se declara en el resultado.
   */
  unitModel?: string
}

export type Candidate = {
  model: string
  advisorRank: number
  /** Tokens equivalentes por turno, en la vara del `unitModel` del resultado. */
  equivPerTurn: number
  /** El mismo consumo derivado a la unidad de factura, a precio de lista. */
  usdPerTurn: number
  /** Si el registro declara la capacidad `effort`; sin ella el nivel pedido se ignora. */
  effortApplies: boolean
  /** El índice de esfuerzo del registro para el nivel exigido (`high` = 1), o null si no lo declara. */
  effortIndex: number | null
  /** Un alias del tool `Agent` lo alcanza; si no, sólo por identificador en la definición. */
  reachableByAlias: boolean
  contextWindow: number
}

export type Exclusion = { model: string; why: string }

export type Recommendation = {
  kind: TaskKind
  effort: EffortLevel
  cacheTtl: CacheTtl
  /** La vara en que se leen los equivalentes de `ranked`. */
  unitModel: string
  /** El primero de `ranked`. */
  model: string
  equivPerTurn: number
  usdPerTurn: number
  effortIndex: number | null
  /** Todos los que cumplen, del más barato al más caro por turno. */
  ranked: Candidate[]
  /** Los que no cumplen, con la razón — para que la exclusión sea auditable. */
  excluded: Exclusion[]
}

const aliasTargets = new Set(Object.values(CATALOG.aliases).map((a) => a.default))

/**
 * Todos los modelos del catálogo que cumplen el requisito, valorados con el
 * perfil de turno y ordenados por **tokens equivalentes** por turno (empate:
 * mayor rango, luego el alcanzable por alias). El USD se publica derivado.
 *
 * **La vara es UNA y se declara.** Ponderar a cada candidato con su propio
 * tier —que es lo que `usageEquivalentTokens` hace sin `unit`— invierte el
 * orden: `claude-fable-5-1` lee caché a 0.025 de su entrada y
 * `claude-sonnet-5` a 0.1, así que fable «gana» en su propia vara y pierde en
 * la factura. Es el sub-patrón A de `metrica-decide-la-conclusion.md`: una
 * columna con dos varas. Con la vara única el orden es el del USD, y esa
 * invariancia está bajo control en la suite.
 *
 * Métrica: los cuatro componentes del perfil ponderados con el tier REAL de
 * cada candidato, expresados en el token de entrada de `unitModel`.
 * Ciega a: la disponibilidad del modelo para la cuenta (el cliente la
 * resuelve en vivo: `notOffered`, `fable_unavailable`), al ×1.1 geográfico y al
 * precio bajo plan. El índice de esfuerzo se publica al lado, no multiplica.
 */
export function candidates(
  kind: TaskKind,
  profile: TurnProfile,
): { unitModel: string; ranked: Candidate[]; excluded: Exclusion[] } {
  const req = TASK_REQUIREMENTS[kind]
  const cacheTtl = profile.cacheTtl ?? '5m'
  const usage = {
    cache_read_tokens: profile.contextTokens,
    cache_creation_tokens: profile.cacheWriteTokens ?? 0,
    output_tokens: profile.outputTokens ?? 0,
  }
  const needed = profile.contextTokens + (profile.outputTokens ?? 0)
  const admitidos: { id: string; rank: number; window: number; effortApplies: boolean }[] = []
  const excluded: Exclusion[] = []
  for (const m of CATALOG.models) {
    if (!m.pricing) { excluded.push({ model: m.id, why: 'sin tier de precio' }); continue }
    if (m.advisor_rank === undefined) { excluded.push({ model: m.id, why: 'el cliente no lo rankea (advisor_rank ausente)' }); continue }
    if (m.advisor_rank < req.minAdvisorRank) { excluded.push({ model: m.id, why: `rango ${m.advisor_rank} < ${req.minAdvisorRank} exigido` }); continue }
    const window = m.context?.window ?? 0
    if (window < needed) { excluded.push({ model: m.id, why: `ventana ${window} < ${needed} del perfil` }); continue }
    // Un registro sin la capacidad `effort` no rechaza el nivel: lo ignora
    // (model-selection-subagents.md: «pasarle un nivel no tiene receptor»).
    // Sigue siendo candidato; se publica que el esfuerzo no aplica.
    admitidos.push({ id: m.id, rank: m.advisor_rank, window, effortApplies: (m.capabilities ?? []).includes('effort') })
  }

  const unitModel = profile.unitModel ?? cheapestInput(admitidos.map((a) => a.id))
  const vara = unitModel === '' ? 0 : pricingOf(unitModel).input
  const ranked: Candidate[] = admitidos.map((a) => {
    const equivPerTurn = usageEquivalentTokens(a.id, usage, { unit: unitModel, cacheTtl })
    return {
      model: a.id,
      advisorRank: a.rank,
      equivPerTurn,
      usdPerTurn: (equivPerTurn * vara) / 1e6,
      effortApplies: a.effortApplies,
      effortIndex: a.effortApplies ? effortCostIndex(a.id, req.effort) : null,
      reachableByAlias: aliasTargets.has(a.id),
      contextWindow: a.window,
    }
  })
  ranked.sort(
    (a, b) =>
      a.equivPerTurn - b.equivPerTurn ||
      b.advisorRank - a.advisorRank ||
      Number(b.reachableByAlias) - Number(a.reachableByAlias) ||
      a.model.localeCompare(b.model),
  )
  return { unitModel, ranked, excluded }
}

/**
 * La vara: el token de entrada más barato del conjunto, con el id como
 * desempate. Se DERIVA del catálogo — nombrar aquí un identificador sería
 * decidir a mano lo que el catálogo sabe. Cualquier otra elección daría los
 * mismos veredictos con otra escala.
 */
function cheapestInput(ids: string[]): string {
  let elegido = ''
  let mejor = Number.POSITIVE_INFINITY
  for (const id of ids) {
    const input = MODELS[id]?.pricing?.input
    if (input === undefined) continue
    if (input < mejor || (input === mejor && id.localeCompare(elegido) < 0)) {
      mejor = input
      elegido = id
    }
  }
  return elegido
}

/** El más barato por turno entre los que cumplen el tipo de tarea. */
export function recommend(kind: TaskKind, profile: TurnProfile): Recommendation {
  const { unitModel, ranked, excluded } = candidates(kind, profile)
  const pick = ranked[0]
  if (!pick) throw new Error(`${kind}: ningún modelo del catálogo cumple el perfil (${excluded.length} excluidos)`)
  return {
    kind,
    effort: TASK_REQUIREMENTS[kind].effort,
    cacheTtl: profile.cacheTtl ?? '5m',
    unitModel,
    model: pick.model,
    equivPerTurn: pick.equivPerTurn,
    usdPerTurn: pick.usdPerTurn,
    effortIndex: pick.effortIndex,
    ranked,
    excluded,
  }
}

// ---------------------------------------------------------------------------
// 4. Despacho: los que comparten clave de caché van juntos y seguidos
// ---------------------------------------------------------------------------

export type DispatchGroup = {
  /** Modelo · esfuerzo · TTL — lo que precede al prompt de sistema en la clave. */
  key: string
  agents: string[]
  /** Lo que la caché del primero ahorra a los demás, en equivalentes de `unitModel`. */
  savingEquiv: number
  /** El mismo ahorro derivado a la unidad de factura. */
  savingUsd: number
}

export type DispatchPlan = {
  /** La vara de los equivalentes: el token de entrada más barato del plan. */
  unitModel: string
  groups: DispatchGroup[]
  totalSavingEquiv: number
  totalSavingUsd: number
  /** Definiciones sin modelo resuelto (inherit o alias sin catálogo): no se pueden valorar. */
  unpriced: string[]
}

/**
 * Agrupa definiciones por la parte de la clave de caché que precede al prompt
 * de sistema (modelo, esfuerzo, TTL) y valora el ahorro de lanzarlas juntas.
 *
 * `sharedPrefixTokens` es el tramo que de verdad comparten (el piso de reglas
 * y las herramientas, que en esta sesión mide 126 029 tokens según
 * H-DOCS-99). Ahorro por agente adicional = tramo × (escritura − lectura).
 * Ciega a: si el cliente coloca un punto de corte antes del prompt de sistema
 * — sin él, agentes de distinto nombre no comparten nada y el ahorro real es
 * cero. Por eso el plan separa los grupos de un solo nombre (ahorro seguro) de
 * los mixtos (ahorro condicionado).
 */
export function dispatchPlan(
  agents: AgentDefinition[],
  sharedPrefixTokens: number,
  ttl: CacheTtl = '5m',
  provider = 'first_party',
  unitModel?: string,
): DispatchPlan {
  const groups = new Map<string, DispatchGroup>()
  const unpriced: string[] = []
  for (const agent of agents) {
    const k = promptCacheKey(agent, provider)
    if (!MODELS[k.model]?.pricing) {
      unpriced.push(agent.name)
      continue
    }
    const key = `${k.model} · ${k.effort} · ${k.cacheTtl === 'default' ? ttl : k.cacheTtl}`
    const g = groups.get(key) ?? { key, agents: [], savingEquiv: 0, savingUsd: 0 }
    g.agents.push(agent.name)
    groups.set(key, g)
  }
  // Los grupos son de modelos distintos, así que el total exige una vara común:
  // sumar equivalentes de varas distintas sería el sub-patrón A otra vez.
  const vara = unitModel ?? cheapestInput([...groups.keys()].map((k) => k.split(' · ')[0] as string))
  const escalar = vara === '' ? 0 : pricingOf(vara).input
  let totalSavingEquiv = 0
  for (const g of groups.values()) {
    const model = g.key.split(' · ')[0] as string
    const p = pricingOf(model)
    const effTtl = g.key.split(' · ')[2] as CacheTtl
    const write = effTtl === '1h' ? p.cache_write_1h : p.cache_write_5m
    // Ahorro = lo que el segundo y siguientes NO reescriben, menos lo que sí
    // leen. En equivalentes: la diferencia de precio dividida por la vara.
    g.savingEquiv = escalar === 0 ? 0 : ((g.agents.length - 1) * sharedPrefixTokens * (write - p.cache_read)) / escalar
    g.savingUsd = (g.savingEquiv * escalar) / 1e6
    totalSavingEquiv += g.savingEquiv
  }
  return {
    unitModel: vara,
    groups: [...groups.values()].sort((a, b) => b.savingEquiv - a.savingEquiv),
    totalSavingEquiv,
    totalSavingUsd: (totalSavingEquiv * escalar) / 1e6,
    unpriced,
  }
}
