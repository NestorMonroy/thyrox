/**
 * La decisión de compactar, portada del ejecutable 2.1.258.
 *
 * Fuente: `_references/claude-code-bin/2.1.258/bunfs-root/chunk-vw215j9f.js`, corpus
 * versionado en este repo. Los símbolos minificados que se portan —`MF`,
 * `nxe`, `dZe`, `fZe`, `rxe`, `Qp`, `qZt`, `BZt`— se citan en cada función.
 *
 * **Por qué importa que sean cuatro niveles y no dos.** Apagar la compactación
 * no da contexto infinito: elimina el nivel `compact` y deja el mismo tope
 * duro. El ejecutable lo dice en una línea —`let y = r.enabled ? p : n`—: con
 * la compactación activa la referencia es el UMBRAL, y sin ella la ventana
 * efectiva entera. La rama de `blocked` no cambia en ninguno de los dos casos.
 */
import { MODELS, usageEquivalentTokens } from '../models.ts'

/** `var qZt=20000` — el techo de salida que la ventana efectiva reserva. */
export const MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000

/** El `13000` de `nxe`: el colchón entre el umbral y la ventana efectiva. */
export const AUTOCOMPACT_BUFFER_TOKENS = 13_000

/** El `o-3000` de `fZe`: cuánto antes del final se declara `blocked`. */
export const BLOCKED_MARGIN_TOKENS = 3_000

/** El `20000` de `fZe` (`k=y-20000`): dónde empieza a avisar. */
export const WARN_MARGIN_TOKENS = 20_000

/** El `n>=3` de `rxe`: recargas rápidas seguidas antes de cortar. */
export const RAPID_REFILL_TRIP = 3

export type CompactionLevel = 'ok' | 'warn' | 'compact' | 'blocked'

/**
 * `MF(e,n)` — la ventana con la que de verdad se cuenta.
 *
 * `function MF(e,n){let r=Math.min(xMe(e),qZt), {window:d}=wv(e,o); return d-r}`
 *
 * El modelo reserva su salida, acotada al techo: un modelo de 1 M con 64 k de
 * salida trabaja contra 980 k, no contra 1 M. Nadie recupera esos 20 000
 * apagando la compactación — la reserva es para poder responder, no para
 * resumir.
 */
export function effectiveWindow(window: number, maxOutputTokens: number): number {
  return window - Math.min(maxOutputTokens, MAX_OUTPUT_TOKENS_FOR_SUMMARY)
}

/**
 * `nxe(e,n)` — el umbral en que dispara el autocompact.
 *
 * `function nxe(e,n){let r=e-13000; …; return Math.min(Math.floor(e*(o/100)), r)}`
 *
 * `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` lo baja a un porcentaje, nunca lo sube: el
 * `Math.min` deja `e-13000` como techo. Un override de 100 no desactiva el
 * colchón.
 */
export function autocompactThreshold(effective: number, pctOverride?: number): number {
  const techo = effective - AUTOCOMPACT_BUFFER_TOKENS
  if (pctOverride !== undefined && !Number.isNaN(pctOverride) && pctOverride > 0 && pctOverride <= 100) {
    return Math.min(Math.floor(effective * (pctOverride / 100)), techo)
  }
  return techo
}

export type LevelResult = { level: CompactionLevel; pctLeft: number }

/**
 * `fZe(e,n,r,o,d)` — los cuatro niveles.
 *
 * ```js
 * let p = d ?? nxe(n,r), y = r.enabled ? p : n, k = y-20000,
 *     x = ... o-3000, F = Math.max(0, Math.round((y-e)/y*100))
 * if (e>=x) return {level:"blocked", pctLeft:F}
 * if (r.enabled && e>=p) return {level:"compact", pctLeft:F}
 * if (e>=k) return {level:"warn", pctLeft:F}
 * return {level:"ok"}
 * ```
 *
 * Las dos consecuencias de apagarla, las dos en ese fragmento:
 *
 * 1. `r.enabled && e>=p` deja de poder ser cierto — **no hay nivel `compact`**.
 * 2. `y` pasa de umbral a ventana efectiva, así que `warn` se corre hacia
 *    arriba y el mismo contexto **reporta más margen del que tiene**. El tope
 *    `x` no se mueve: se llega a `blocked` con menos aviso, no más tarde.
 */
/**
 * El resultado COMPLETO de los cuatro niveles — con las dos ventanas y el tope
 * duro que `fZe` distingue y que el porte estrecho de `autocompactLevel`
 * colapsaba. El harness lo consume (`context/contextLevel.ts`); es la fuente
 * ÚNICA del algoritmo (#31).
 */
export type RichLevelResult = {
  level: CompactionLevel
  pctLeft: number
  /** `p`/`F` de `fZe`: el umbral vigente. */
  threshold: number
  /** `n` de `fZe`: la ventana de COMPACTACIÓN. */
  effective: number
  /** `x` de `fZe`: el tope duro, medido contra la ventana de BLOQUEO. */
  blocked: number
  enabled: boolean
}

export type FourLevelsOptions = {
  enabled: boolean
  /** `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` — sólo baja el umbral. */
  pctOverride?: number
  /** `CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE` (`v`) — sustituye el tope duro entero. */
  blockingOverride?: number
}

/**
 * `fZe(e,n,r,o,d)` — los cuatro niveles, PORTE COMPLETO y única implementación.
 *
 * ```js
 * let p = d ?? nxe(n,r), y = r.enabled ? p : n, k = y-20000,
 *     x = v!==void 0&&!isNaN(v)&&v>0 ? v : o-3000,
 *     F = Math.max(0, Math.round((y-e)/y*100))
 * ```
 *
 * Los cuatro argumentos que no son `tokens` son cuatro decisiones distintas: `n`
 * la ventana de compactación, `o` la de bloqueo, `opts` los ajustes y overrides,
 * `threshold` el umbral impuesto desde fuera (frame remoto). El porte estrecho
 * fundía `n` y `o` y no conocía `blockingOverride`; aquí viven separados. Antes
 * había dos copias de este cuerpo —una aquí y otra en el harness— que divergían
 * sin que ningún gate lo viera (#31).
 */
export function fourLevels(
  tokens: number, compactionWindow: number, blockingWindow: number,
  opts: FourLevelsOptions, threshold?: number,
): RichLevelResult {
  const p = threshold ?? autocompactThreshold(compactionWindow, opts.pctOverride)
  const y = opts.enabled ? p : compactionWindow
  const k = y - WARN_MARGIN_TOKENS
  const v = opts.blockingOverride
  const x = v !== undefined && !Number.isNaN(v) && v > 0 ? v : blockingWindow - BLOCKED_MARGIN_TOKENS
  const pctLeft = Math.max(0, Math.round(((y - tokens) / y) * 100))
  const level: CompactionLevel =
    tokens >= x ? 'blocked'
      : opts.enabled && tokens >= p ? 'compact'
        : tokens >= k ? 'warn'
          : 'ok'
  return { level, pctLeft, threshold: p, effective: compactionWindow, blocked: x, enabled: opts.enabled }
}

/**
 * El nivel para el modelo de coste: una proyección donde la ventana de
 * compactación y la de bloqueo coinciden (el coste nunca configura ventana).
 * Delega en `fourLevels` —el cuerpo único— y devuelve la forma estrecha.
 */
export function autocompactLevel(
  tokens: number,
  window: number,
  maxOutputTokens: number,
  enabled = true,
  pctOverride?: number,
): LevelResult {
  const efectiva = effectiveWindow(window, maxOutputTokens)
  const r = fourLevels(tokens, efectiva, efectiva, { enabled, pctOverride })
  return { level: r.level, pctLeft: r.pctLeft }
}

/**
 * `rxe(e)` — el guard antithrashing.
 *
 * `function rxe(e){let n=N9r(e); return {action: n>=3?"trip":"proceed", …}}`
 *
 * `N9r` cuenta las veces seguidas que el contexto volvió al límite **dentro de
 * los 3 turnos** siguientes a un compact. El mensaje del ejecutable nombra la
 * causa: *"A file being read or a tool output is likely too large for the
 * context window"*. Comprimir más no lo arregla — lo arregla leer en trozos.
 */
export function rapidRefillAction(consecutiveRapidRefills: number): {
  action: 'proceed' | 'trip'
  consecutiveRapidRefills: number
} {
  return {
    action: consecutiveRapidRefills >= RAPID_REFILL_TRIP ? 'trip' : 'proceed',
    consecutiveRapidRefills,
  }
}

// ---------------------------------------------------------------------------
// El coste: qué se paga por no comprimir
// ---------------------------------------------------------------------------

export type CompactionRequest = {
  modelId: string
  contextTokens: number
  /** Turnos que quedan por delante en esta sesión. */
  turnsAhead: number
  /** Cuánto crece el contexto por turno. 0 = horizonte estático. */
  growthPerTurn: number
  cacheTtl?: '5m' | '1h'
  /** Tamaño del resumen. Default: el techo que el propio ejecutable reserva. */
  summaryTokens?: number
}

/**
 * Las tres unidades, y el orden en que se leen.
 *
 * - **tokens crudos** — la unidad de CAPACIDAD: lo que cabe en la ventana. No
 *   se pondera, se cuenta. Es `finalContext` y es la que decide `blocked`.
 * - **tokens equivalentes** — la unidad de COSTE COMPARABLE: pondera los cuatro
 *   componentes por los cocientes de un tier, así que el precio de lista se
 *   cancela. Dos ejecuciones se comparan aunque la tarifa cambie entre builds.
 *   Es la **primaria**: el veredicto se lee aquí.
 * - **USD** — la unidad de FACTURA: depende de una tabla externa por build.
 *   Se publica **derivada**, para hablar con quien paga, no para decidir.
 *
 * `totalUsd` es exactamente `totalEquiv × p.input / 1e6`: un múltiplo escalar
 * positivo. De ahí que `breakEvenTurns` sea **el mismo** en las dos unidades —
 * cambiar de unidad cambia la lectura, no el veredicto. Que sea invariante es
 * un resultado, no una casualidad: si difirieran, una de las dos estaría
 * ponderando algo que la otra no.
 */
export type CompactionCost = {
  withoutCompaction: { readEquiv: number; totalEquiv: number; totalUsd: number; finalContext: number }
  withCompaction: { writeEquiv: number; readEquiv: number; totalEquiv: number; totalUsd: number }
  /** Turnos tras los que comprimir sale más barato. `null` si nunca. */
  breakEvenTurns: number | null
  /** Turno en que el nivel llega a `blocked` sin comprimir. `null` si no llega. */
  blocksAtTurn: number | null
  recommendation: 'comprimir' | 'no-comprimir' | 'comprimir-o-bloquea'
}

/**
 * Compara los dos caminos con el catálogo, no con una estimación.
 *
 * El 98 % de lo que se consume por turno es **caché leída** (medido en el
 * store, `model-selection-subagents.md`), así que el coste de no comprimir es
 * `cache_read × contexto × turnos` y crece con el contexto. Comprimir cambia
 * esas relecturas por **una** escritura del tamaño del resumen.
 *
 * El veredicto no siempre es de coste: si el horizonte alcanza `blocked`, sin
 * comprimir el turno **no ocurre**, y entonces la comparación de precios es
 * irrelevante.
 */
export function compactionCost(req: CompactionRequest): CompactionCost {
  const model = MODELS[req.modelId]
  if (!model?.pricing) throw new Error(`${req.modelId}: sin tier de precio en el catálogo`)
  const ttl = req.cacheTtl ?? '5m'
  const resumen = req.summaryTokens ?? MAX_OUTPUT_TOKENS_FOR_SUMMARY
  const ventana = model.context?.window ?? 0
  // `max_output_tokens` es `{default, upper}` en el catálogo, no un número:
  // pasarlo entero a `Math.min` da NaN y **ninguna** comparación de nivel
  // dispara — el horizonte nunca alcanzaba `blocked`. Lo atrapó la suite, no
  // la lectura. Se toma `default`, que es la salida con que se pide un turno
  // salvo override, y es lo que `xMe(e)` resuelve en el ejecutable.
  const salida = model.max_output_tokens?.default ?? MAX_OUTPUT_TOKENS_FOR_SUMMARY

  let sinComprimir = 0
  let conComprimir = 0
  let contexto = req.contextTokens
  let contextoResumido = resumen
  let bloqueaEn: number | null = null
  let breakEven: number | null = null

  // Se acumula en TOKENS EQUIVALENTES, que es la unidad primaria: no depende
  // de la tarifa, así que dos ejecuciones se comparan aunque el catálogo de la
  // build cambie. Los USD salen al final, de un escalar.
  const equiv = (u: Parameters<typeof usageEquivalentTokens>[1]) =>
    usageEquivalentTokens(req.modelId, u, { cacheTtl: ttl })

  const escritura = equiv({ cache_creation_tokens: resumen })
  conComprimir += escritura

  for (let turno = 1; turno <= req.turnsAhead; turno++) {
    sinComprimir += equiv({ cache_read_tokens: contexto })
    conComprimir += equiv({ cache_read_tokens: contextoResumido })
    if (bloqueaEn === null && ventana > 0) {
      const nivel = autocompactLevel(contexto, ventana, salida, false)
      if (nivel.level === 'blocked') bloqueaEn = turno
    }
    if (breakEven === null && conComprimir < sinComprimir) breakEven = turno
    contexto += req.growthPerTurn
    contextoResumido += req.growthPerTurn
  }

  const recommendation: CompactionCost['recommendation'] =
    bloqueaEn !== null ? 'comprimir-o-bloquea'
      : conComprimir < sinComprimir ? 'comprimir'
        : 'no-comprimir'

  // El puente a la factura: `equivalente × precio del token de entrada`. Un
  // solo escalar, y por eso el veredicto no cambia al cruzarlo.
  const aUsd = (e: number) => (e * model.pricing!.input) / 1e6

  return {
    withoutCompaction: {
      readEquiv: sinComprimir, totalEquiv: sinComprimir, totalUsd: aUsd(sinComprimir),
      finalContext: contexto,
    },
    withCompaction: {
      writeEquiv: escritura, readEquiv: conComprimir - escritura,
      totalEquiv: conComprimir, totalUsd: aUsd(conComprimir),
    },
    breakEvenTurns: breakEven,
    blocksAtTurn: bloqueaEn,
    recommendation,
  }
}
