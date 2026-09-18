/**
 * El medidor de límite de uso: de la cabecera de respuesta al payload de
 * statusline.
 *
 * Procedencia
 * ===========
 *
 * Porte de `ccnmt: packages/provider/src/claudeAiLimits.ts` **corregido contra
 * el binario distribuido**, cuya build vigente es **2.1.274**
 * (`_references/claude-code-bin/2.1.274/bunfs-root/chunk-ayyj05ne.js`). El
 * binario va por delante de aquella fuente en ocho puntos medidos:
 *
 * | eje                   | ccnmt (TS)             | binario 2.1.274                |
 * |-----------------------|------------------------|--------------------------------|
 * | ventanas extraídas    | 2                      | 4                              |
 * | cabeceras por ventana | 2                      | **3** (+ `-surpassed-threshold`)|
 * | condición de inclusión| exige AMBAS            | **cualquiera de las tres**     |
 * | campos de la ventana  | requeridos             | **opcionales**                 |
 * | parseo de la cabecera | `Number(x)`            | vacío / no finito → `undefined`|
 * | filtro de frescura    | ninguno                | presente, **en milisegundos**  |
 * | validador de finitud  | implícito (`!== null`) | sobre `Number.isFinite`        |
 * | redondeo del reset    | `Number(reset)`        | `Math.round(…)`                |
 *
 * Gobierna el binario: es el cliente que efectivamente corre. La divergencia
 * se declara en vez de omitirse (`porte-completo-no-parcial.md`).
 *
 * El ancla es el LITERAL, no el binding
 * =====================================
 *
 * Los identificadores del payload se renombran entre builds: la tabla de
 * ventanas era `E0e` en 2.1.266 y es `x0` en 2.1.274 — mismo mecanismo, otro
 * nombre. Toda la cadena de este módulo se recuperó anclando por el literal
 * `anthropic-ratelimit-unified-`, que vive en el TemplateHead de la función
 * extractora y sobrevive a la minificación porque es dato y no nombre. Los
 * bindings que este docstring cita van entre paréntesis y son EFÍMEROS: sirven
 * para volver a la fuente de esta build, no para buscar en la siguiente.
 *
 * Qué NO se porta, y por qué — declarado, no omitido
 * ==================================================
 *
 * 1. **La clase de estado del limitador** (`_Pn` en esta build): mantiene
 *    `lastSeenWindows` con su `observedAtMs`, el retiro de lecturas
 *    (`isRetiredReading`), la zona de gracia y la derivación del estado de
 *    cuota. Es un mecanismo con ciclo de vida propio, no una función más.
 * 2. **La ventana de retención de observación**, `1800000` ms = 30 min. NO es
 *    código muerto en el binario: su único consumidor es `currentWindows` de
 *    esa clase, que descarta toda lectura observada antes de
 *    `lastAppliedObservationAtMs − 1800000`. Portar la constante sin su
 *    consumidor dejaría un valor que nadie lee, así que se declara aquí y
 *    viaja con la clase cuando ésta se porte.
 * 3. **El aviso temprano, el estado de cuota derivado y los mensajes de
 *    límite** — mecanismos distintos con su propio hogar.
 *
 * Los tres son el desenlace 2 de `porte-completo-no-parcial.md` (bloqueado por
 * algo medido y nombrado), no una omisión silenciosa. Sucesor:
 * **TASK-THYROX-0070**.
 *
 * Por qué importa que esto exista
 * ===============================
 *
 * `H-DOCS-1274` afirmaba que el límite de uso «no expone medidor consultable
 * [...] sin cifra de cuota ni tiempo de reset». La cadena de abajo es la
 * falsificación: la cifra viaja en `utilization` y el momento de reposición en
 * `resets_at`, y el propio cliente publica el recipe `jq` que los lee.
 */

/**
 * Una ventana medida.
 *
 * Los tres campos son OPCIONALES, y esa es la divergencia de fondo con la
 * fuente TypeScript: el binario incluye la ventana en cuanto UNA de sus tres
 * cabeceras llega. Una utilización sin reposición sigue siendo información —y
 * un umbral rebasado sin nada más también—; quien necesite la ventana completa
 * la exige después, con `isFiniteWindow` o `projectCompleteWindows`.
 */
export type RawWindowUtilization = {
  /** Fracción 0-1, tal como la cabecera la declara. */
  utilization?: number
  /** Época unix en SEGUNDOS. */
  resets_at?: number
  /** El umbral de aviso que la respuesta declara rebasado, cuando lo hay. */
  surpassedThreshold?: number
}

/** Las ventanas medidas, por nombre. */
export type RawUtilization = Partial<Record<RateLimitWindowName, RawWindowUtilization>>

export type RateLimitWindowName =
  | 'five_hour'
  | 'seven_day'
  | 'seven_day_overage_included'
  | 'overage'

/**
 * El catálogo de ventanas (`x0` en esta build).
 *
 * El segundo elemento es la abreviatura que viaja en el NOMBRE de la cabecera,
 * no un alias de presentación: `anthropic-ratelimit-unified-<abbrev>-<campo>`.
 * Son cuatro, no dos: la fuente TypeScript se quedó en `five_hour`/`seven_day`.
 */
export const RATE_LIMIT_WINDOWS = [
  ['five_hour', '5h'],
  ['seven_day', '7d'],
  ['seven_day_overage_included', '7d_oi'],
  ['overage', 'overage'],
] as const satisfies ReadonlyArray<readonly [RateLimitWindowName, string]>

/**
 * El horizonte del filtro de frescura: un año en SEGUNDOS.
 *
 * El binario lo escribe como literal (`31536000`). Aquí se nombra porque un
 * literal desnudo en dos sitios es una segunda fuente de verdad.
 */
export const WINDOW_HORIZON_SECONDS = 31536000

/**
 * El parseo de una cabecera numérica (`vot`).
 *
 * Tres entradas dan `undefined` —ausente, cadena vacía, y todo lo que no
 * resuelva a un número finito— y sólo el número finito pasa.
 *
 * La cadena VACÍA es la que carga el peso, y es la única divergencia dentro
 * del rango finito: `Number('')` es **0**, un valor que pasa el validador,
 * sobrevive al filtro de frescura y se publica como «0 % consumido». Un cero
 * fabricado no es una medición baja — es una medición que no existió, y
 * publicarla como cifra de cuota es peor que callar.
 */
export function parseHeaderNumber(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * El validador de finitud (`W7`): ambos campos presentes y finitos.
 *
 * No es redundante con la comprobación de presencia de la cabecera:
 * `Number('n/a')` sería `NaN`, que es un `number` y pasaría cualquier prueba
 * de tipo. `Number.isFinite` es lo único que separa una medición de un hueco —
 * y ahora que los campos son opcionales, también separa la ventana completa de
 * la que llegó a medias.
 */
export function isFiniteWindow(
  window: RawWindowUtilization | undefined,
): window is RawWindowUtilization & { utilization: number; resets_at: number } {
  return (
    window !== undefined &&
    Number.isFinite(window.utilization) &&
    Number.isFinite(window.resets_at)
  )
}

/**
 * El predicado de usabilidad (`izo`).
 *
 * NO es `isFiniteWindow` con otro nombre: su universo es más ancho a
 * propósito. El binario lo consume al decidir si una lectura entra al estado
 * de cuota, y ahí un umbral rebasado SIN reposición sigue siendo usable — es
 * justo la señal que dispara el aviso temprano. `isFiniteWindow` lo
 * rechazaría, porque su pregunta es otra: si la ventana se puede PUBLICAR.
 */
export function isUsableWindow(window: RawWindowUtilization): boolean {
  return (
    window.surpassedThreshold !== undefined ||
    (window.utilization !== undefined && window.resets_at !== undefined)
  )
}

/**
 * La extracción desde las cabeceras de respuesta (`szo`).
 *
 * Tres cabeceras por ventana, y la ventana entra si llega CUALQUIERA de las
 * tres; sólo cuando faltan las tres se salta. Cada campo se copia sólo si su
 * cabecera resolvió, así que la ventana lleva exactamente lo que se midió.
 *
 * El reset se REDONDEA, porque el servidor puede declararlo fraccionario y la
 * época unix del payload es entera.
 */
export function extractRawUtilization(headers: Headers): RawUtilization {
  const result: RawUtilization = {}
  for (const [name, abbrev] of RATE_LIMIT_WINDOWS) {
    const prefix = `anthropic-ratelimit-unified-${abbrev}`
    const utilization = parseHeaderNumber(headers.get(`${prefix}-utilization`))
    const reset = parseHeaderNumber(headers.get(`${prefix}-reset`))
    const surpassed = parseHeaderNumber(headers.get(`${prefix}-surpassed-threshold`))
    if (utilization === undefined && reset === undefined && surpassed === undefined) continue
    result[name] = {
      ...(utilization !== undefined && { utilization }),
      ...(reset !== undefined && { resets_at: Math.round(reset) }),
      ...(surpassed !== undefined && { surpassedThreshold: surpassed }),
    }
  }
  return result
}

/**
 * La proyección a ventanas completas (`dPn`).
 *
 * Conserva sólo las ventanas con utilización Y reposición, y de ellas sólo
 * esos dos campos: `surpassedThreshold` gobierna el estado de cuota y no
 * viaja en la serie de medición.
 */
export function projectCompleteWindows(windows: RawUtilization): RawUtilization {
  const complete: RawUtilization = {}
  for (const [name] of RATE_LIMIT_WINDOWS) {
    const window = windows[name]
    if (window?.utilization !== undefined && window.resets_at !== undefined) {
      complete[name] = { utilization: window.utilization, resets_at: window.resets_at }
    }
  }
  return complete
}

/**
 * La clave de firma de una ventana (`V8`).
 *
 * El binario la usa para no reemitir una lectura que no cambió. El redondeo al
 * entero es parte del contrato, no una comodidad de formato: dos utilizaciones
 * que difieren por debajo del punto porcentual son la MISMA lectura a efectos
 * de emisión, y firmar la fracción cruda haría que cada respuesta pareciera un
 * cambio.
 */
export function windowSignature(
  window: RawWindowUtilization & { utilization: number; resets_at: number },
): string {
  return `${Math.round(window.utilization * 100)}@${window.resets_at}`
}

/**
 * El filtro de frescura de UNA ventana (`bPn`) — el ahora va en MILISEGUNDOS.
 *
 * Descarta toda ventana cuyo `resets_at` no caiga estrictamente entre ahora y
 * ahora más el horizonte. Una ventana vencida describe un pasado que ya no
 * gobierna; una más allá del horizonte es una cabecera corrupta o un reloj
 * desfasado, y publicarla daría una cuota que nadie puede interpretar.
 *
 * **La unidad no es un detalle de firma.** El parámetro llega en milisegundos
 * y la función divide por mil; `resets_at` está en segundos. Pasarle segundos
 * NO revienta: divide otra vez, el «ahora» cae en 1970 y toda reposición real
 * queda más allá del horizonte de un año, así que el payload sale **vacío**.
 * Ese vacío se lee como «no hay medidor» — el sub-patrón D con el propio
 * filtro como sujeto, que es la conclusión exacta que `H-DOCS-1274` publicó.
 */
export function isFreshWindow(
  window: RawWindowUtilization | undefined,
  nowMs: number,
): boolean {
  const nowSeconds = nowMs / 1000
  const horizon = nowSeconds + WINDOW_HORIZON_SECONDS
  return (
    isFiniteWindow(window) && window.resets_at > nowSeconds && window.resets_at < horizon
  )
}

/**
 * El filtro de frescura sobre las cuatro ventanas.
 *
 * Compuesto propio: el binario recorre la tabla dentro del método de estado
 * que este porte no trae, así que el bucle se expone aquí como función pura
 * para que los consumidores portados tengan a qué llamar. El predicado por
 * ventana es el del binario, sin cambio.
 */
export function filterFreshWindows(
  windows: RawUtilization,
  nowMs: number,
): RawUtilization {
  const fresh: RawUtilization = {}
  for (const [name] of RATE_LIMIT_WINDOWS) {
    const window = windows[name]
    if (isFreshWindow(window, nowMs)) fresh[name] = window as RawWindowUtilization
  }
  return fresh
}

/** Lo que el payload de statusline publica por ventana. */
export type RateLimitPayloadWindow = {
  /** Porcentaje 0-100 — por encima de 100 una vez excedido. */
  used_percentage: number
  resets_at: number
}

/** De dónde viene la credencial; decide si `overage` se publica. */
export type LimitSource = 'firstParty' | 'gateway'

export type RateLimitsPayload = {
  five_hour?: RateLimitPayloadWindow
  seven_day?: RateLimitPayloadWindow
  spend_limit?: RateLimitPayloadWindow
}

/** El estado del proceso: la última medición vista, sin filtrar. */
let rawUtilization: RawUtilization = {}

/**
 * La medición fresca, como la ve un consumidor.
 *
 * Devuelve el estado FILTRADO, no el crudo: es la diferencia con la fuente
 * TypeScript, que retorna `rawUtilization` tal cual. El default va en
 * milisegundos, que es la unidad del filtro.
 */
export function getRawUtilization(nowMs: number = Date.now()): RawUtilization {
  return filterFreshWindows(rawUtilization, nowMs)
}

/** El camino de escritura: cada respuesta del API actualiza la medición. */
export function recordRateLimitHeaders(headers: Headers): RawUtilization {
  rawUtilization = extractRawUtilization(headers)
  return rawUtilization
}

/** Expuesto para la suite: devuelve el estado a su valor inicial. */
export function resetRawUtilization(): void {
  rawUtilization = {}
}

/**
 * La composición del payload de statusline.
 *
 * Dos transformaciones, y ninguna es cosmética:
 *
 * 1. **La escala.** La cabecera declara una fracción 0-1 y el payload publica
 *    un porcentaje 0-100. El recipe que el cliente documenta lo formatea con
 *    `printf '%.0f%%'`, así que sin la escala imprimiría `0%` para cualquier
 *    consumo por debajo del 50 %.
 * 2. **El renombre.** `overage` se publica como `spend_limit`, y SOLO cuando la
 *    credencial viene de un gateway. Con credencial de primera parte esa
 *    ventana no tiene sentido y se omite.
 *
 * Dos cotas, las dos medidas en el composer del binario:
 *
 * - Se extraen CUATRO ventanas y se publican TRES.
 *   `seven_day_overage_included` se mide y no llega al payload.
 * - **`surpassedThreshold` NO se propaga.** El composer publica
 *   `used_percentage` y `resets_at`, y nada más: el umbral rebasado gobierna
 *   el estado de cuota, que es otro camino.
 */
export function composeRateLimitsPayload(
  windows: RawUtilization,
  options: { nowMs: number; source: LimitSource },
): RateLimitsPayload {
  const fresh = filterFreshWindows(windows, options.nowMs)
  const payload: RateLimitsPayload = {}
  const publish = (window: RawWindowUtilization): RateLimitPayloadWindow => ({
    used_percentage: (window.utilization as number) * 100,
    resets_at: window.resets_at as number,
  })
  if (fresh.five_hour) payload.five_hour = publish(fresh.five_hour)
  if (fresh.seven_day) payload.seven_day = publish(fresh.seven_day)
  if (options.source === 'gateway' && fresh.overage) {
    payload.spend_limit = publish(fresh.overage)
  }
  return payload
}

/* ------------------------------------------------------------------------- *
 * El estado de cuota
 *
 * Por qué entra en este pase, si el medidor es lo que la tarea pedía
 * ------------------------------------------------------------------
 *
 * Dos consumidores YA declaraban depender de este módulo:
 * `command-runtime/src/internal/pendingCrossPackageDeps.ts` lo resuelve con
 * `require('@thyrox/provider/claudeAiLimits.js')` y tipa su retorno como
 * `{ currentLimits: { isUsingOverage: boolean } }`, y `commands/cost/cost.ts`
 * lo consume. Con el módulo ausente ese `require` fallaba AL LLAMARSE — un
 * fallo ruidoso, que es el que el envoltorio documenta.
 *
 * Portar SOLO el medidor habría hecho resolver el `require` y dejado
 * `currentLimits` en `undefined`: el fallo pasa de ruidoso a silencioso, y un
 * `.isUsingOverage` sobre `undefined` revienta lejos de su causa. Cerrar esa
 * mitad no es alcance que se ensancha por gusto: es la condición para que este
 * porte no empeore lo que encontró.
 * ------------------------------------------------------------------------- */

export type QuotaStatus = 'allowed' | 'allowed_warning' | 'rejected'

export type RateLimitType =
  | 'five_hour'
  | 'seven_day'
  | 'seven_day_opus'
  | 'seven_day_sonnet'
  | 'overage'

/**
 * La razón por la que el consumo extra está deshabilitado o rechazado.
 *
 * Los valores vienen del limitador unificado del API, no de este cliente.
 */
export type OverageDisabledReason =
  | 'overage_not_provisioned'
  | 'org_level_disabled'
  | 'org_level_disabled_until'
  | 'out_of_credits'
  | 'seat_tier_level_disabled'
  | 'member_level_disabled'
  | 'seat_tier_zero_credit_limit'
  | 'group_zero_credit_limit'
  | 'member_zero_credit_limit'
  | 'org_service_level_disabled'
  | 'org_service_zero_credit_limit'
  | 'no_limits_configured'
  | 'unknown'

export type ClaudeAILimits = {
  status: QuotaStatus
  unifiedRateLimitFallbackAvailable: boolean
  resetsAt?: number
  rateLimitType?: RateLimitType
  /**
   * Fracción 0-1, y sólo presente cuando un umbral de aviso se disparó.
   *
   * NO es el medidor: para la utilización de CADA respuesta está
   * `getRawUtilization()`, que es lo que alimenta al payload de statusline.
   * Confundirlas es leer un aviso puntual como si fuera la serie.
   */
  utilization?: number
  overageStatus?: QuotaStatus
  overageResetsAt?: number
  overageDisabledReason?: OverageDisabledReason
  isUsingOverage?: boolean
  surpassedThreshold?: number
}

const INITIAL_LIMITS: ClaudeAILimits = {
  status: 'allowed',
  unifiedRateLimitFallbackAvailable: false,
  isUsingOverage: false,
}

/**
 * El estado vigente de cuota.
 *
 * Se exporta como `let`, igual que la fuente, para que un consumidor que lo
 * importe siga viendo el valor actual y no una copia congelada al importar.
 */
export let currentLimits: ClaudeAILimits = { ...INITIAL_LIMITS }

export type StatusChangeListener = (limits: ClaudeAILimits) => void

export const statusListeners: Set<StatusChangeListener> = new Set()

/**
 * Publica un cambio de estado: fija el vigente y avisa a cada oyente.
 *
 * DIVERGENCIA declarada: la fuente emite además un evento de telemetría
 * (`logEvent('tengu_claudeai_limits_status_changed', …)`) con las horas hasta
 * la reposición. Aquí no se emite, porque el cableado de observabilidad de
 * este paquete es otro mecanismo con su propia tarea; el resto —el estado y
 * la notificación— se porta entero. Sucesor: TASK-THYROX-0070.
 */
export function emitStatusChange(limits: ClaudeAILimits): void {
  currentLimits = limits
  statusListeners.forEach(listener => listener(limits))
}

/** El estado vigente, para quien prefiera una llamada al binding exportado. */
export function readCurrentLimits(): ClaudeAILimits {
  return currentLimits
}

/** Devuelve el estado a su valor inicial. */
export function resetCurrentLimits(): void {
  currentLimits = { ...INITIAL_LIMITS }
}
