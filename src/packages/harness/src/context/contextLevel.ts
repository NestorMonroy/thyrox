/**
 * Cuánto contexto queda y qué hacer con él — los cuatro niveles del binario.
 *
 * Fuente: ejecutable 2.1.258, `bunfs-root/chunk-vw215j9f.js` del corpus
 * versionado en `_references/claude-code-bin/2.1.258/`. Los símbolos minificados que
 * se portan —`MF`, `nxe`, `fZe`, `rxe`, `N9r`, `kZe`, `Qp`, `LZt`— se citan en
 * cada función.
 *
 * **Por qué cuatro y no un booleano.** `autocompact.ts` resolvía la pregunta
 * con `shouldAutoCompact`, que sólo sabe decir «toca compactar». Le faltaban
 * los dos extremos, y el que falta de verdad es `blocked`: sin él el bucle
 * manda al API una petición que el servidor rechaza con
 * `input length and \`max_tokens\` exceed context limit: N + M > W`, y esa
 * respuesta llega cuando ya se pagó el turno. El nivel existe para llegar
 * antes que el servidor, no para sustituirlo.
 *
 * **Y apagar la compactación no mueve el muro.** `let y = r.enabled ? p : n`
 * cambia la referencia contra la que se avisa; la rama de `blocked` no la
 * consulta. Apagarla quita el escalón intermedio y hace que `pctLeft` reporte
 * más margen del que hay — dos pérdidas, ninguna ganancia de ventana.
 */
import { MODELS } from '@kaupamex/agent/models'
import { fourLevels } from '@kaupamex/agent/cost/compaction'
import { AUTOCOMPACT_BUFFER_TOKENS, effectiveContextWindow } from './autocompact.ts'

/** El `k=y-20000` de `fZe`: cuánto antes de la referencia empieza a avisar. */
export const WARN_MARGIN_TOKENS = 20_000

/** El `x=o-3000` de `fZe`: el margen del tope duro sobre la ventana efectiva. */
export const BLOCKED_MARGIN_TOKENS = 3_000

/** El `n>=3` de `rxe` (`var YZt=3`): recargas rápidas seguidas antes de cortar. */
export const RAPID_REFILL_TRIP = 3

/** El `e.turnCounter<3` de `N9r`: qué cuenta como recarga «rápida». */
export const RAPID_REFILL_WINDOW_TURNS = 3

/** `pTe=1e5` — el piso que `CLAUDE_CODE_AUTO_COMPACT_WINDOW` no puede bajar. */
export const AUTO_COMPACT_WINDOW_FLOOR = 100_000

/** `zBe=1e6` — su techo; `Ete` recorta a él y lo reporta como `capped`. */
export const AUTO_COMPACT_WINDOW_CAP = 1_000_000

/** `GO=200000` — la ventana con que `wv` recorta a los modelos de `A9r`. */
export const MODEL_DEFAULT_WINDOW = 200_000

/**
 * `A9r=new Set([...])` — los modelos con recorte por defecto, verbatim.
 *
 * Su rama exige además `d<1e6`, y por eso **hoy no muerde a ninguno**: los dos
 * de 200 k ya valen `min(200000, GO) = 200000`, y los dos de 1 M no entran en
 * la guarda. Se porta igual porque la guarda mira la ventana que `Nf` resuelve
 * —no la declarada del catálogo—, y `Nf` devuelve menos de 1 M cuando la beta
 * de contexto largo no está activa. Omitirlo dejaría el recorte sin implementar
 * justo en el caso en que sí actúa.
 */
export const MODELS_WITH_DEFAULT_WINDOW = new Set([
  'claude-sonnet-4-6', 'claude-opus-4-6', 'claude-opus-4-8', 'claude-opus-5',
])

/**
 * `var wZe` — verbatim, y a propósito.
 *
 * Su valor no es avisar de que se compacta mucho: es **nombrar la causa**, que
 * no es la compactación sino una lectura demasiado grande. Parafrasearlo
 * convierte un diagnóstico en una queja.
 */
export const THRASHING_MESSAGE =
  'Autocompact is thrashing: the context refilled to the limit within 3 turns ' +
  'of the previous compact, 3 times in a row. A file being read or a tool ' +
  'output is likely too large for the context window. Try reading in smaller chunks.'

export type ContextLevel = 'ok' | 'warn' | 'compact' | 'blocked' | 'unknown'

export type LevelResult = {
  level: ContextLevel
  /** `F` de `fZe`. `null` cuando el modelo no está en el catálogo. */
  pctLeft: number | null
  threshold: number | null
  /** `n` de `fZe`: la ventana con que se decide COMPACTAR. */
  effective: number | null
  /** `x` de `fZe`: el tope duro, medido contra la ventana DECLARADA. */
  blocked: number | null
  enabled: boolean
}

export type CompactionSettings = { autoCompactEnabled?: boolean }

/**
 * El frame que el servidor envía y la sesión adopta.
 *
 * `fRt(setState, frame, via)` lo normaliza a `{enabled, effectiveWindow:
 * e.effective_window, threshold, enforced, source}` y emite
 * `tengu_remote_autocompact_state_adopted`; un frame malformado se descarta con
 * `"[sdkMessageAdapter] Dropping malformed autocompact_state frame"` y
 * `remote_autocompact_sync = invalid_frame`. Se limpia a `undefined` al
 * desconectar, al resetear y en `onCatchUpTruncated`.
 */
export type RemoteAutocompactState = {
  enabled: boolean
  effectiveWindow: number
  threshold: number
  enforced?: boolean
  source?: string
}

export type ContextLevelOptions = CompactionSettings & {
  /** `n` de `MF`: la ventana de compactación fijada por ajuste. */
  autoCompactWindow?: number
  /** `o` de `Fte`: el frame remoto, cuando la sesión lo ha adoptado. */
  remote?: RemoteAutocompactState
}

/**
 * `Qp()` — si la compactación automática está activa.
 *
 * ```js
 * function LZt(){return Boolean($e(process.env.DISABLE_COMPACT)||a.DISABLE_AUTO_COMPACT)}
 * function Qp(){if(LZt())return!1; return ko("autoCompactEnabled",!0).value}
 * ```
 *
 * El orden es parte del porte: la variable de entorno se consulta **antes**
 * que el ajuste, así que `DISABLE_COMPACT` gana sobre un
 * `autoCompactEnabled: true` explícito. Al revés, un ajuste no puede reactivar
 * lo que el entorno apagó.
 */
export function autoCompactEnabled(settings?: CompactionSettings): boolean {
  if (process.env.DISABLE_COMPACT || process.env.DISABLE_AUTO_COMPACT) return false
  return settings?.autoCompactEnabled ?? true
}

/**
 * `Ete(e,n,r,o)` — parsea una variable de entorno con piso y techo.
 *
 * `if(!n)return{effective:r,status:"valid"}; let d=nl(n); if(isNaN(d)||d<=0)
 *  {…status:"invalid"…}; if(d>o){…effective:o,status:"capped"…}`
 *
 * El `status` importa tanto como el valor: quien la consume distingue
 * `invalid` —y entonces **no aplica la rama**— de `capped`, que sí la aplica
 * con el techo. Colapsarlos haría que un valor basura cayera al piso en vez de
 * dejar paso al siguiente origen.
 */
function parseBoundedEnv(
  raw: string | undefined, fallback: number, cap: number,
): { effective: number; status: 'valid' | 'invalid' | 'capped' } {
  if (!raw) return { effective: fallback, status: 'valid' }
  // `nl(e){let n=String(e).trim();return N(n)??parseInt(n,10)}` — el `trim` es
  // parte del contrato. `N` es un parser previo que vive en otro chunk y puede
  // aceptar formas más ricas; aquí se porta su respaldo, que es el que decide
  // en todos los casos numéricos simples.
  const d = Number.parseInt(String(raw).trim(), 10)
  if (Number.isNaN(d) || d <= 0) return { effective: fallback, status: 'invalid' }
  if (d > cap) return { effective: cap, status: 'capped' }
  return { effective: d, status: 'valid' }
}

/**
 * `zZt(e)` — la ventana contra la que se mide el TOPE DURO.
 *
 * `function zZt(e){let n=Math.min(xMe(e),qZt); return Nf(e,Jf())-n}`
 *
 * Sale de la ventana **declarada** del modelo, sin pasar por `wv`: ninguna
 * configuración de compactación la mueve. Es la mitad que el porte anterior no
 * distinguía de la de compactación.
 */
export function blockingWindow(model: string): number | null {
  return effectiveContextWindow(model)
}

/**
 * `MF(e,n)` sobre `wv(e,n,r)` — la ventana contra la que se decide COMPACTAR.
 *
 * ```js
 * function MF(e,n){let r=Math.min(xMe(e),qZt), o=Qp()?n:void 0,
 *                  {window:d}=wv(e,o); return d-r}
 * ```
 *
 * `wv` devuelve `Math.min(declarada, configurada)` en cada rama con origen, así
 * que **sólo puede bajar**. Sus orígenes, en el orden en que el ejecutable los
 * consulta: `env` → `settings` → `clientdata` → `experiment` → `model-default`
 * → `unknown-model`/`auto`.
 *
 * **Cobertura del porte**, declarada en vez de omitida
 * (`porte-completo-no-parcial.md`):
 *
 * | Origen | Aquí |
 * |---|---|
 * | `env` (`CLAUDE_CODE_AUTO_COMPACT_WINDOW`) | portado |
 * | `settings` (`n`) | portado |
 * | `model-default` (`A9r`/`GO`) | portado |
 * | `clientdata` (`I9r`) | **no** — lee `rowan_thicket` de la config remota, que este harness no recibe |
 * | `experiment` (`gZe`) | **no** — bandera remota, mismo motivo |
 * | `model-default` por tabla (`x9r`/`WZt`) | **no** — tabla remota, mismo motivo |
 *
 * Los tres ausentes comparten causa: su valor lo emite el servidor. Cuando el
 * harness reciba esa configuración, entran aquí en el mismo orden.
 */
export function compactionWindow(
  model: string, configured?: number, settings?: CompactionSettings,
): number | null {
  const declarada = MODELS[model]?.context?.window
  const conReserva = effectiveContextWindow(model)
  if (typeof declarada !== 'number' || conReserva === null) return null
  // `MF` resta `min(xMe(e),qZt)` a la ventana que `wv` resuelve. Esa reserva ya
  // está calculada en `effectiveContextWindow` sobre la declarada, así que se
  // recupera por diferencia en vez de duplicar su lógica.
  const reserva = declarada - conReserva
  // `wv` devuelve `Math.min(d, configurada)` en toda rama con origen: nunca sube.
  const resuelta = (configurada: number) => Math.min(declarada, configurada) - reserva

  // `let o=Qp()?n:void 0` — con la compactación apagada el ajuste no viaja.
  const ajuste = autoCompactEnabled(settings) ? configured : undefined

  const env = process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW
  if (env) {
    const b = parseBoundedEnv(env, AUTO_COMPACT_WINDOW_FLOOR, AUTO_COMPACT_WINDOW_CAP)
    // `if(B.status!=="invalid")` — un valor basura NO aplica la rama: la
    // resolución sigue al siguiente origen en vez de caer al piso.
    if (b.status !== 'invalid') {
      return resuelta(Math.max(AUTO_COMPACT_WINDOW_FLOOR, b.effective))
    }
  }
  if (ajuste !== undefined) return resuelta(ajuste)
  // `if(d<1e6&&(A9r.has(o)||…))return{window:Math.min(d,GO),…}`
  if (declarada < AUTO_COMPACT_WINDOW_CAP && MODELS_WITH_DEFAULT_WINDOW.has(model)) {
    return resuelta(MODEL_DEFAULT_WINDOW)
  }
  // `source:"unknown-model"` y `source:"auto"` devuelven `d` sin recortar.
  return conReserva
}

/**
 * `nxe(e,n)` — el umbral, con su override por porcentaje.
 *
 * `let r=e-13000; …; return Math.min(Math.floor(e*(o/100)), r)`
 *
 * El `Math.min` es lo que hay que leer con cuidado: el override **sólo puede
 * bajar** el umbral. Un `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=100` no desactiva el
 * colchón de 13 000 — el otro brazo sigue ganando.
 *
 * Su argumento es la ventana de **compactación**, no la declarada: es `nxe(n,r)`
 * dentro de `fZe`, y ese `n` viene de `MF`.
 */
export function thresholdFor(effective: number, pctOverride?: number): number {
  const techo = effective - AUTOCOMPACT_BUFFER_TOKENS
  if (pctOverride !== undefined && !Number.isNaN(pctOverride) && pctOverride > 0 && pctOverride <= 100) {
    return Math.min(Math.floor(effective * (pctOverride / 100)), techo)
  }
  return techo
}

/** El umbral de un modelo, resolviendo antes su ventana de compactación. */
export function resolveThreshold(model: string, opts?: ContextLevelOptions): number | null {
  const ventana = compactionWindow(model, opts?.autoCompactWindow, opts)
  if (ventana === null) return null
  return thresholdFor(ventana, pctOverride())
}

/** `testPctOverride:o?parseFloat(o):void 0` de `SZe`. */
function pctOverride(): number | undefined {
  const crudo = process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
  return crudo ? Number.parseFloat(crudo) : undefined
}

/**
 * `testBlockingOverride:d?nl(d):void 0` de `SZe`.
 *
 * Es la **tercera** variable de entorno de este mecanismo, y la única que mueve
 * el tope duro. `DISABLE_COMPACT` quita el escalón intermedio y
 * `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` sólo baja el umbral; ninguna de las dos
 * toca `x`. Ésta lo **sustituye entero**.
 */
export function blockingLimitOverride(): number | undefined {
  const crudo = process.env.CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE
  if (!crudo) return undefined
  return Number.parseInt(String(crudo).trim(), 10)
}

type Ajustes = { enabled: boolean; testPctOverride?: number; testBlockingOverride?: number }

/**
 * `fZe(e,n,r,o,d)` — el nivel del contexto.
 *
 * ```js
 * let p = d ?? nxe(n,r), y = r.enabled ? p : n, k = y-20000,
 *     v = r.testBlockingOverride,
 *     x = v!==void 0&&!isNaN(v)&&v>0 ? v : o-3000,
 *     F = Math.max(0, Math.round((y-e)/y*100))
 * if (e>=x)              return {level:"blocked", pctLeft:F}
 * if (r.enabled && e>=p) return {level:"compact", pctLeft:F}
 * if (e>=k)              return {level:"warn",    pctLeft:F}
 * return {level:"ok"}
 * ```
 *
 * Los cuatro argumentos que no son `e` son cuatro decisiones distintas, y el
 * porte anterior colapsaba dos: `n` es la ventana de compactación, `o` la de
 * bloqueo, `r` los ajustes y `d` el umbral impuesto desde fuera.
 */
function levelFrom(
  tokens: number, n: number, r: Ajustes, o: number, d?: number,
): LevelResult {
  // #31: el algoritmo de los cuatro niveles vive UNA sola vez, en
  // `agent/cost/compaction.ts` (`fourLevels`). Antes había una segunda copia
  // aquí que divergía sin gate. La forma rica que `fourLevels` devuelve
  // —`{level, pctLeft, threshold, effective, blocked, enabled}`— es la de
  // `LevelResult`, así que se devuelve tal cual.
  return fourLevels(
    tokens, n, o,
    { enabled: r.enabled, pctOverride: r.testPctOverride, blockingOverride: r.testBlockingOverride },
    d,
  )
}

/**
 * `Fte(e,n,r,o)` — la puerta de entrada, con su rama remota.
 *
 * ```js
 * function Fte(e,n,r,o){
 *   if(o!==void 0) return fZe(e, o.effectiveWindow,
 *     {enabled:o.enabled, precomputeBufferFraction:txe,
 *      testPctOverride:void 0, testBlockingOverride:void 0},
 *     zZt(n), o.threshold);
 *   let d=SZe(n,r), p=d.enabled?r:void 0;
 *   return fZe(e, MF(n,p), d, zZt(n))}
 * ```
 *
 * La rama remota es **asimétrica a propósito**: adopta del servidor la ventana,
 * el umbral y `enabled`, **descarta los dos overrides de entorno**, y deriva el
 * tope duro localmente con `zZt(n)`. Un frame con ventana de 400 k no adelanta
 * el muro: el muro sigue siendo el del modelo.
 *
 * `unknown` no está en el ejecutable y aquí sí: un modelo fuera del catálogo no
 * tiene ventana, y devolver `ok` sería leer el silencio del instrumento como
 * permiso — el sub-patrón D de `metrica-decide-la-conclusion.md`.
 */
export function contextLevel(
  tokens: number, model: string, opts?: ContextLevelOptions,
): LevelResult {
  const bloqueoBase = blockingWindow(model)
  if (opts?.remote !== undefined) {
    if (bloqueoBase === null) {
      return {
        level: 'unknown', pctLeft: null, threshold: null,
        effective: null, blocked: null, enabled: opts.remote.enabled,
      }
    }
    return levelFrom(
      tokens, opts.remote.effectiveWindow,
      { enabled: opts.remote.enabled, testPctOverride: undefined, testBlockingOverride: undefined },
      bloqueoBase, opts.remote.threshold,
    )
  }
  const enabled = autoCompactEnabled(opts)
  const ventana = compactionWindow(model, opts?.autoCompactWindow, opts)
  if (bloqueoBase === null || ventana === null) {
    return { level: 'unknown', pctLeft: null, threshold: null, effective: null, blocked: null, enabled }
  }
  const ajustes: Ajustes = {
    enabled,
    testPctOverride: pctOverride(),
    testBlockingOverride: blockingLimitOverride(),
  }
  return levelFrom(tokens, ventana, ajustes, bloqueoBase)
}

export type CompactionState = {
  compacted: boolean
  turnId?: string
  /** Turnos transcurridos desde el último compact. */
  turnCounter: number
  consecutiveRapidRefills: number
}

/**
 * `rxe(e)` sobre `N9r(e)` — el guard antithrashing.
 *
 * ```js
 * function N9r(e){return e?.compacted===!0 && e.turnCounter<3
 *   ? (e?.consecutiveRapidRefills??0)+1 : 0}
 * function rxe(e){let n=N9r(e); return {action:n>=3?"trip":"proceed", consecutiveRapidRefills:n}}
 * ```
 *
 * La condición `turnCounter<3` es la que le da sentido: una recarga a los diez
 * turnos es trabajo normal y **reinicia** el contador; una a los dos turnos es
 * la señal. Sin ese reinicio el guard cortaría cualquier sesión larga.
 */
export function rapidRefill(state: CompactionState | undefined): {
  action: 'proceed' | 'trip'
  consecutiveRapidRefills: number
} {
  const n = state?.compacted === true && state.turnCounter < RAPID_REFILL_WINDOW_TURNS
    ? (state.consecutiveRapidRefills ?? 0) + 1
    : 0
  return { action: n >= RAPID_REFILL_TRIP ? 'trip' : 'proceed', consecutiveRapidRefills: n }
}

/**
 * `kZe(e,n)` — el estado tras compactar.
 *
 * `return {compacted:!0, turnId:e, turnCounter:0, consecutiveFailures:0,
 *   consecutiveRapidRefills:n}`
 *
 * El contador de recargas **se arrastra**, no se reinicia: es lo que permite
 * que tres compactaciones seguidas sumen hasta el `trip`.
 */
export function markCompacted(turnId: string, consecutiveRapidRefills = 0): CompactionState {
  return { compacted: true, turnId, turnCounter: 0, consecutiveRapidRefills }
}

/** Un turno más desde la última compactación. */
export function advanceTurn(state: CompactionState | undefined): CompactionState | undefined {
  if (!state) return state
  return { ...state, turnCounter: state.turnCounter + 1 }
}
