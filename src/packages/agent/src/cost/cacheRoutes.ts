/**
 * Usar otro modelo SIN perder la caché del hilo principal.
 *
 * La caché de prompt del API se indexa por sistema + herramientas + modelo +
 * prefijo de mensajes + configuración de pensamiento
 * (`ccb: packages/agent/forkedAgent.ts`, `CacheSafeParams`). Cambiar el
 * modelo del hilo principal no borra la entrada del modelo anterior —vive
 * hasta su TTL— pero la petición siguiente va a OTRA clave y reescribe el
 * contexto entero. El ejecutable 2.1.258 ofrece tres vías para consultar un
 * modelo distinto dejando esa clave intacta:
 *
 * 1. **Advisor** — herramienta del servidor (`advisorModel` en settings,
 *    `--advisor`): el modelo principal la llama y el servidor reenvía la
 *    conversación entera al asesor. El hilo no cambia de modelo ni de clave.
 *    Literales: «the advisor must be at least as capable as the main model»,
 *    «the advisor bills to usage credits», `advisor_fable_consent`,
 *    `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` / `_ENABLE_EXPERIMENTAL_ADVISOR_TOOL`.
 *    Su disponibilidad la decide una bandera remota (`tengu_sage_compass2`):
 *    aquí se valora, no se afirma que exista para la cuenta.
 * 2. **Subagente** con `model:` en su definición: clave propia (su prompt de
 *    sistema es otro), la del hilo principal no se toca. Paga su propio piso.
 * 3. **Cambiar y volver dentro del TTL**: la entrada del modelo original
 *    sobrevive hasta caducar; al volver, el prefijo hasta el punto del cambio
 *    se relee y sólo los turnos nuevos se escriben. Fuera del TTL, se
 *    reescribe todo.
 *
 * Métrica: precios del catálogo sobre los tokens que cada vía reenvía.
 * Ciega a: si la cuenta tiene el advisor habilitado; al ×1.1 geográfico; a
 * que el servidor conserve la entrada exactamente hasta el TTL nominal — el
 * cliente lo trata como «probablemente viva» (`prompt_cache_warm`), y aquí
 * también.
 */
import { CATALOG, MODELS } from '../models.ts'
import type { CacheTtl } from '../types.ts'
import { switchCost } from './policy.ts'
import type { ReadCredit } from './crossModelRead.ts'

export const ROUTE_KINDS = ['advisor', 'subagent', 'switch-and-return'] as const
export type RouteKind = (typeof ROUTE_KINDS)[number]

export type RouteRequest = {
  /** Modelo del hilo principal. */
  from: string
  /** Modelo que se quiere consultar. */
  to: string
  /** Contexto del último turno del hilo principal (lo que un cambio reenvía). */
  contextTokens: number
  /** TTL con que escribe el hilo principal (1 h en el REPL, salvo override). */
  cacheTtl?: CacheTtl
  /** Turnos que se harán en el otro modelo antes de volver. */
  turnsOnTarget?: number
  /** Piso que un subagente relee en cada turno (126 029 en esta sesión, H-DOCS-99). */
  subagentFloorTokens?: number
  /** Tokens que el subagente lee además del piso (los archivos que se le nombran). */
  subagentReadTokens?: number
  /** Salida por turno, para el término de salida. */
  outputTokens?: number
  /** Si se volverá al modelo original dentro del TTL de su entrada. */
  returnWithinTtl?: boolean
}

export type Route = {
  kind: RouteKind
  /** USD de la vía entera: ida, turnos en el destino y vuelta. */
  usd: number
  /** Si la clave de caché del hilo principal se conserva intacta. */
  keepsMainCache: boolean
  /** Lo que la vía exige y el catálogo no puede verificar. */
  requires: string[]
  detail: string
  /**
   * Cada lectura de caché que la vía cobra, atribuida al modelo que la LEE y
   * al que la ESCRIBIÓ. La superficie real cobra la lectura al precio del
   * escritor (su caché); si `reader !== writer` la vía estaría acreditando una
   * lectura cruzada entre modelos — imposible, porque la clave de caché incluye
   * el modelo. El gate de `crossModelRead.ts` lo audita.
   */
  readCredits: ReadCredit[]
}

function pricing(id: string) {
  const p = MODELS[id]?.pricing
  if (!p) throw new Error(`${id}: sin tier de precio en el catálogo`)
  return p
}

/**
 * ¿Puede `advisor` asesorar a `base`? El literal del ejecutable: «the advisor
 * must be at least as capable as the main model» — se lee sobre `advisor_rank`,
 * el orden de capacidad que el propio cliente declara.
 */
export function canAdvise(advisor: string, base: string): { ok: boolean; why: string } {
  const ra = MODELS[advisor]?.advisor_rank
  const rb = MODELS[base]?.advisor_rank
  if (ra === undefined || rb === undefined) {
    return { ok: false, why: `sin advisor_rank en el catálogo (${advisor}: ${ra ?? '—'}, ${base}: ${rb ?? '—'})` }
  }
  if (ra < rb) return { ok: false, why: `${advisor} (rango ${ra}) no es al menos tan capaz como ${base} (rango ${rb})` }
  return { ok: true, why: `${advisor} rango ${ra} ≥ ${base} rango ${rb}` }
}

/** Las vías, de la más barata a la más cara, para consultar `to` desde `from`. */
export function routesForOtherModel(req: RouteRequest): Route[] {
  const ttl = req.cacheTtl ?? '1h'
  const turns = Math.max(1, req.turnsOnTarget ?? 1)
  const out = req.outputTokens ?? 0
  const pf = pricing(req.from)
  const pt = pricing(req.to)
  const write = (p: typeof pt) => (ttl === '1h' ? p.cache_write_1h : p.cache_write_5m)
  const routes: Route[] = []

  // 1. Advisor: el servidor reenvía la conversación entera al asesor. Se
  //    valora como una escritura del contexto en el destino (la primera
  //    consulta) y lecturas en las siguientes, más la salida del asesor.
  const adv = canAdvise(req.to, req.from)
  const advisorUsd =
    (req.contextTokens * write(pt) + (turns - 1) * req.contextTokens * pt.cache_read + turns * out * pt.output) / 1e6
  routes.push({
    kind: 'advisor',
    usd: advisorUsd,
    keepsMainCache: true,
    requires: [
      'advisor habilitado para la cuenta (bandera remota tengu_sage_compass2; se factura a créditos de uso)',
      `advisorModel: ${req.to} en settings o --advisor`,
      adv.ok ? `capacidad: ${adv.why}` : `NO cumple: ${adv.why}`,
    ],
    detail: `el hilo sigue en ${req.from}; ${req.to} lee la conversación como asesor`,
    // El asesor escribe el contexto en su propia caché (1er turno) y lo relee
    // en los siguientes: lectura y escritura son del mismo modelo, `to`.
    readCredits: [{ reader: req.to, writer: req.to, tokens: (turns - 1) * req.contextTokens, label: `advisor ${req.to}` }],
  })

  // 2. Subagente: clave propia. Paga su piso una vez (escritura) y lo relee
  //    en cada turno; lo que se le nombre además, igual.
  const floor = req.subagentFloorTokens ?? 0
  const extra = req.subagentReadTokens ?? 0
  const subUsd =
    ((floor + extra) * write(pt) + (turns - 1) * (floor + extra) * pt.cache_read + turns * out * pt.output) / 1e6
  routes.push({
    kind: 'subagent',
    usd: subUsd,
    keepsMainCache: true,
    requires: [`una definición con model: ${req.to}`, 'el prompt nombra archivos y condición de cierre: el subagente no ve el hilo principal'],
    detail: `${req.to} en su propia clave de caché (${floor + extra} tokens releídos por turno)`,
    // Clave propia: el subagente relee SU caché en cada turno. reader=writer=to.
    readCredits: [{ reader: req.to, writer: req.to, tokens: (turns - 1) * (floor + extra), label: `subagente ${req.to}` }],
  })

  // 3. Cambiar y volver: escribir el contexto en el destino, leerlo en los
  //    turnos siguientes, y al volver reescribir lo nuevo (dentro del TTL) o
  //    todo (fuera).
  const sw = switchCost(req.from, req.to, req.contextTokens)
  const ida = ttl === '1h' ? sw.rewriteUsd1h : sw.rewriteUsd5m
  const enDestino = ((turns - 1) * req.contextTokens * pt.cache_read + turns * out * pt.output) / 1e6
  const nuevo = turns * out
  const vuelta = req.returnWithinTtl === false ? ((req.contextTokens + nuevo) * write(pf)) / 1e6 : (nuevo * write(pf)) / 1e6
  routes.push({
    kind: 'switch-and-return',
    usd: ida + enDestino + vuelta,
    keepsMainCache: req.returnWithinTtl !== false,
    requires: [
      req.returnWithinTtl === false
        ? `volver fuera del TTL (${ttl}): la entrada de ${req.from} caducó y se reescribe entera`
        : `volver dentro del TTL (${ttl}) de la entrada de ${req.from}`,
    ],
    detail: `ida ${ida.toFixed(4)} + destino ${enDestino.toFixed(4)} + vuelta ${vuelta.toFixed(4)} USD`,
    // En el destino se relee la caché escrita en la ida: reader=writer=to. La
    // vuelta es una ESCRITURA en el origen (nuevo, o todo fuera de TTL): no es
    // una lectura, no cruza.
    readCredits: [{ reader: req.to, writer: req.to, tokens: (turns - 1) * req.contextTokens, label: `switch destino ${req.to}` }],
  })

  return routes.sort((a, b) => a.usd - b.usd)
}

/** El TTL que el ejecutable asigna por defecto a cada origen de petición. */
export const DEFAULT_TTL_BY_SOURCE = {
  /** Lista de 1 h de `should1hCacheTTL` (reference): repl_main_thread*, sdk, auto_mode, memdir_relevance. */
  repl_main_thread: '1h',
  sdk: '1h',
  /** Los subagentes NO están en la lista: 5 m salvo subagentPromptCacheTtl, la variable de entorno o `experimental.cacheTtl`. */
  'agent:custom': '5m',
  'agent:builtin': '5m',
} as const satisfies Record<string, CacheTtl>

/** Los alias del tool `Agent` que alcanzan a `to`, si alguno. */
export function aliasesReaching(to: string): string[] {
  return Object.entries(CATALOG.aliases)
    .filter(([, a]) => a.default === to)
    .map(([alias]) => alias)
}
