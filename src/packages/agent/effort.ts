/**
 * Nivel de esfuerzo de razonamiento — porte PARCIAL de
 * `ccnmt: packages/agent/effort.ts`.
 *
 * Recorte declarado: la fuente completa importa media docena de módulos de
 * `@claude-code-how-works/*` que no existian en este arbol al portarla, y
 * `modelSupportsEffort`, `resolvePickerEffortPersistence`,
 * `getDisplayedEffortLevel`, `getEffortSuffix`, `getEffortLevelDescription`,
 * `getEffortValueDescription` y `getDefaultEffortForModel` quedaron fuera.
 * Hoy estan al final del archivo, portadas del BINARIO 2.1.275 y no de
 * `ccnmt` — ver la seccion «Contra el binario 2.1.275»; lo unico que sigue
 * fuera es `getInitialEffortSetting` y `getOpusDefaultEffortConfig`, sin
 * consumidor en este arbol.
 *
 * Los seis primeros símbolos son AUTOCONTENIDOS en la fuente — no dependen de
 * ningún import externo, sólo de `process.env.USER_TYPE` — así que se portan
 * completos y con fidelidad byte a byte de comportamiento.
 *
 * AMPLIACIÓN (`__tests__/effortNativeVsProxy.test.ts`): agrega
 * `modelSupportsMaxEffort`, `modelSupportsXhighEffort`,
 * `modelSupportsNoneEffort`, `resolveAppliedEffort`, `getEffortEnvOverride`,
 * `getAPIProvider` e `isFirstPartyAnthropicEndpoint`. En la fuente estas
 * funciones consultan, en ORDEN, tres fuentes que aquí no existen —el
 * registro de conexiones (`getConnectionModelEntry`, alimentado por
 * `provider/connections.js` + `getGlobalConfig()`), el override de
 * capacidad de terceros (`get3PModelCapabilityOverride`) y la resolución de
 * modelos `ant` (`resolveAntModel`, sólo bajo `USER_TYPE=ant`)— y el propio
 * test de origen las neutraliza con `mock.module` fijando
 * `config.connections = []`, nunca mutado por ningún caso. Es decir: en
 * TODOS los casos que este porte ejercita, esas tres fuentes están vacías y
 * la fuente cae siempre al mismo cuarto peldaño — el chequeo de familia de
 * modelo (`m.includes('opus-4-7')`, …) seguido del fallthrough de proxy de
 * protocolo anthropic (`getAPIProvider() === 'firstParty' &&
 * !isFirstPartyAnthropicEndpoint(model)`). Ese cuarto peldaño SÍ se porta
 * completo y fiel — `getAPIProvider` e `isFirstPartyAnthropicEndpoint`
 * (con su `isFirstPartyAnthropicBaseUrl` interno) son, en la fuente real
 * (`provider/providers.ts`), puros lectores de `process.env` una vez que se
 * descarta la rama de conexiones — así que se reproducen tal cual, sin
 * inventar nada; sólo se omite la rama de conexiones que los precede
 * (`hasConnections`) porque nunca hay conexiones que consultar en este
 * árbol. `modelSupportsNoneEffort` sí depende ÍNTEGRAMENTE del registro de
 * conexiones en la fuente (no tiene chequeo de familia de reserva) — sin
 * ese registro, su valor es siempre `false`, y se documenta como tal en su
 * propio comentario. `getDefaultEffortForModel` —el tercer eslabón de la
 * cadena de precedencia de `resolveAppliedEffort`— NO se porta: depende de
 * `isProSubscriber`/`isMaxSubscriber`/`isTeamSubscriber`
 * (`provider/authAlias.js`), `isUltrathinkEnabled` (`provider/thinking.js`)
 * y la resolución `ant`, ninguna disponible aquí, y ningún caso de
 * `effortNativeVsProxy.test.ts` la ejercita: los dos casos que tocan
 * `resolveAppliedEffort` fijan `CLAUDE_CODE_EFFORT_LEVEL`, así que el `??`
 * de la cadena corta antes de llegar a ese eslabón. Se sustituye por
 * `undefined` — el mismo valor que "no hay default para este modelo".
 *
 * NO confundir con `EFFORT_LEVELS` de `./schema.ts`: ése es el enum de 5
 * niveles (sin `none`) que valida el campo `effort:` del frontmatter de un
 * agente — otro dominio, otra fuente de verdad. Éste es el de 6 niveles que
 * gobierna la resolución de esfuerzo de la sesión/modelo.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { isProSubscriber } from '@thyrox/provider/authAlias.js'
import { canonicalModelName, MODELS } from './models.js'

export const EFFORT_LEVELS = [
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const

export type EffortLevel = (typeof EFFORT_LEVELS)[number]
export type EffortValue = EffortLevel | number

export function isEffortLevel(value: string): value is EffortLevel {
  return (EFFORT_LEVELS as readonly string[]).includes(value)
}

export function isValidNumericEffort(value: number): boolean {
  return Number.isInteger(value)
}

export function parseEffortValue(value: unknown): EffortValue | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value === 'number' && isValidNumericEffort(value)) {
    return value
  }
  const str = String(value).toLowerCase()
  if (isEffortLevel(str)) {
    return str
  }
  const numericValue = parseInt(str, 10)
  if (!Number.isNaN(numericValue) && isValidNumericEffort(numericValue)) {
    return numericValue
  }
  return undefined
}

/**
 * Los valores numéricos son sólo default-de-modelo y no se persisten.
 * Los niveles-cadena (none/low/medium/high/xhigh/max) sí son persistibles.
 */
export function toPersistableEffort(
  value: EffortValue | undefined,
): EffortLevel | undefined {
  if (
    value === 'none' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'xhigh' ||
    value === 'max'
  ) {
    return value
  }
  return undefined
}

export function convertEffortValueToLevel(value: EffortValue): EffortLevel {
  if (typeof value === 'string') {
    return isEffortLevel(value) ? value : 'high'
  }
  if (process.env.USER_TYPE === 'ant' && typeof value === 'number') {
    // El rango numérico de ant abarca 5 niveles — se conservan los cortes
    // low/medium/high sin tocar (herramental existente los asume), y xhigh
    // se intercala entre high y max en el extremo superior.
    if (value <= 50) return 'low'
    if (value <= 85) return 'medium'
    if (value <= 95) return 'high'
    if (value <= 100) return 'xhigh'
    return 'max'
  }
  return 'high'
}

// ── Proveedor de API y endpoint nativo — porte fiel del CUARTO peldaño
// (ver "AMPLIACIÓN" en la cabecera; la rama de registro de conexiones que
// lo precede en la fuente se omite: nunca hay conexiones en este árbol).

/** El proveedor de API activo — mismo vocabulario que la fuente. */
export type ApiProvider =
  | 'firstParty'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'openai'
  | 'gemini'

/**
 * Proveedor de API activo, leído sólo de `process.env` — sin el peldaño
 * previo de la fuente (registro de conexiones + `settings.modelType`),
 * ambos ausentes en este árbol y siempre vacíos/indefinidos en los casos
 * que este porte mide. El orden de precedencia entre las variables de
 * entorno se conserva verbatim.
 */
export function getAPIProvider(): ApiProvider {
  if (process.env.CLAUDE_CODE_USE_BEDROCK) return 'bedrock'
  if (process.env.CLAUDE_CODE_USE_FOUNDRY) return 'foundry'
  if (process.env.CLAUDE_CODE_USE_VERTEX) return 'vertex'
  if (process.env.CLAUDE_CODE_USE_OPENAI) return 'openai'
  if (process.env.CLAUDE_CODE_USE_GEMINI) return 'gemini'
  return 'firstParty'
}

/**
 * ¿`ANTHROPIC_BASE_URL` apunta a un host de Anthropic de primera parte?
 * Verdadero si no está fijada (endpoint por defecto) o si apunta a
 * `api.anthropic.com` (o `api-staging.anthropic.com` para `USER_TYPE=ant`).
 * Porte fiel de `provider/providers.ts: isFirstPartyAnthropicBaseUrl` — es
 * un lector puro de `process.env`, sin dependencia externa.
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}

/**
 * ¿Este modelo se sirve, ahora mismo, desde un endpoint nativo de
 * Anthropic? Recorte declarado: la fuente resuelve primero por registro de
 * conexión (`resolveConnectionForModel(modelId)`); aquí ese registro no
 * existe y nunca hay conexión que resolver, así que el porte va directo al
 * peldaño de reserva de la fuente — proveedor global + host de
 * `ANTHROPIC_BASE_URL`.
 */
export function isFirstPartyAnthropicEndpoint(_modelId?: string): boolean {
  return getAPIProvider() === 'firstParty' && isFirstPartyAnthropicBaseUrl()
}

/**
 * ¿El modelo declara explícitamente soporte para apagar el razonamiento
 * ('none')? En la fuente esto viene ÍNTEGRAMENTE del registro de
 * conexiones (`getConnectionModelEntry(model)?.supportedEfforts?.includes
 * ('none')`) — no hay chequeo de familia de reserva. Sin ese registro en
 * este árbol, el valor es siempre `false`; ningún caso de
 * `effortNativeVsProxy.test.ts` distingue otro valor.
 */
export function modelSupportsNoneEffort(_model: string): boolean {
  return false
}

/**
 * ¿El modelo admite 'max'? — `Dj` del binario 2.1.275: exclusiones, capacidad
 * `max_effort` del catalogo, `claude-mythos-5` por nombre, y si nada de eso
 * decide, confianza en un proveedor firstParty/foundry (un proxy de protocolo
 * anthropic incluido). Ver `supportsLevel` al final del archivo.
 */
export function modelSupportsMaxEffort(model: string): boolean {
  return supportsLevel(model, 'max_effort', MAX_EFFORT_EXCLUDED)
}

/**
 * ¿El modelo admite 'xhigh'? — `s3`: la MISMA forma que `Dj` con otra
 * capacidad (`xhigh_effort`) y una lista de exclusiones mas larga (Opus 4.5,
 * Opus 4.6 y Sonnet 4.6 no lo admiten). La asimetria de `ccnmt` —xhigh sin
 * confianza en proxies— no esta en la build medida.
 */
export function modelSupportsXhighEffort(model: string): boolean {
  return supportsLevel(model, 'xhigh_effort', XHIGH_EFFORT_EXCLUDED)
}

/**
 * Lee el override de `CLAUDE_CODE_EFFORT_LEVEL`. `'unset'`/`'auto'` (sin
 * distinguir mayúsculas) significa "no hay override" (`null`, distinto de
 * `undefined`: `resolveAppliedEffort` corta ahí en vez de seguir la
 * cadena). Cualquier otro valor se parsea con `parseEffortValue`.
 */
export function getEffortEnvOverride(): EffortValue | null | undefined {
  const envOverride = process.env.CLAUDE_CODE_EFFORT_LEVEL
  return envOverride?.toLowerCase() === 'unset' ||
    envOverride?.toLowerCase() === 'auto'
    ? null
    : parseEffortValue(envOverride)
}

/**
 * Resuelve el valor de esfuerzo que en verdad se envía a la API para un
 * modelo dado, siguiendo la cadena de precedencia:
 *   env CLAUDE_CODE_EFFORT_LEVEL → appState.effortValue → default del modelo
 *
 * El tercer eslabón (default por modelo) se sustituye por `undefined` —
 * ver "AMPLIACIÓN" en la cabecera: ningún caso de este porte lo alcanza,
 * porque los dos que ejercitan esta función fijan
 * `CLAUDE_CODE_EFFORT_LEVEL` explícitamente.
 */
export function resolveAppliedEffort(
  model: string,
  appStateEffortValue: EffortValue | undefined,
): EffortValue | undefined {
  const envOverride = getEffortEnvOverride()
  if (envOverride === null) {
    return undefined
  }
  const defaultForModel: EffortValue | undefined = undefined
  const resolved = envOverride ?? appStateEffortValue ?? defaultForModel
  // Recorta niveles no soportados hacia abajo. xhigh exige Opus 4.8/4.7;
  // max exige Opus 4.8/4.7/4.6/Sonnet 4.6 (o el fallthrough de proxy
  // anthropic). Por debajo del nivel, cae a 'high' — el mismo valor que
  // usa la API cuando no se envía el parámetro de esfuerzo.
  if (resolved === 'max' && !modelSupportsMaxEffort(model)) {
    return 'high'
  }
  if (resolved === 'xhigh' && !modelSupportsXhighEffort(model)) {
    return 'high'
  }
  if (resolved === 'none' && !modelSupportsNoneEffort(model)) {
    return 'low'
  }
  return resolved
}

// ─── Contra el binario 2.1.275 (`chunk-87qahtf8.js`) ─────────────────────
//
// Lo que sigue se porta de la build medida, no de `ccnmt`: `I_` (admite
// esfuerzo), `Dj`/`s3` (admite max/xhigh, arriba), `C` (default del modelo),
// `Sw` (el nivel que rige), `TT` (el que se muestra), `Uyt` (el sufijo),
// `ne` y `nQn` (las descripciones). Tres fuentes que el binario consulta
// antes de la matriz de capacidades NO existen en este arbol y se declaran
// vacias, que es su estado en cada sesion que este arbol arranca:
//
// - los overrides de capacidad por conexion y de terceros (`$8t`, `jae`,
//   `w3t`/`N`, `Iwn`) — sin conexiones registradas;
// - el tope de esfuerzo por settings u organizacion (`j`, `Fyt`/`Lj`) — sin
//   `maxEffortLevel` declarado, el tope es `null` y no recorta nada;
// - el pin de esfuerzo de arranque (`$j`) y el default de organizacion
//   (`qTe`) — sin perfil de organizacion cargado.

/** Los modelos a los que `ne` nombra por nivel. */
const XHIGH_MODELS = 'Fable 5, Opus 4.7+, Sonnet 5'
const MAX_WARNING =
  'May use excessive tokens resulting in long response times or overthinking. Use sparingly for the hardest tasks.'

/** Las familias que cada nivel excluye ANTES de mirar el catalogo (`I_`, `Dj`, `s3`). */
const OLD_FAMILIES = ['claude-opus-4-0', 'claude-opus-4-1', 'claude-sonnet-4-0', 'claude-sonnet-4-5', 'claude-haiku-4-5']
const EFFORT_EXCLUDED = OLD_FAMILIES
const MAX_EFFORT_EXCLUDED = [...OLD_FAMILIES, 'claude-opus-4-5']
const XHIGH_EFFORT_EXCLUDED = [...OLD_FAMILIES, 'claude-opus-4-5', 'claude-opus-4-6', 'claude-sonnet-4-6']

/**
 * `M0(cc(model))`: el proveedor del modelo habla el protocolo de Anthropic y
 * se le confia la capacidad. `mantle` y el predicado `qM` no tienen proveedor
 * en `getAPIProvider` aqui; quedan firstParty y foundry.
 */
function providerTrustsEffort(): boolean {
  const provider = getAPIProvider()
  return provider === 'firstParty' || provider === 'foundry'
}

/** La forma comun de `Dj` y `s3`: exclusion, catalogo, mythos-5, proveedor. */
function supportsLevel(model: string, capability: string, excluded: readonly string[]): boolean {
  const m = canonicalModelName(model)
  if (m.includes('claude-3-') || excluded.includes(m)) return false
  if (MODELS[m]?.capabilities?.includes(capability) || m === 'claude-mythos-5') return true
  return providerTrustsEffort()
}

/** ¿El modelo admite el parametro de esfuerzo? — `I_`. */
export function modelSupportsEffort(model: string): boolean {
  const m = canonicalModelName(model)
  if (m.includes('claude-3-') || EFFORT_EXCLUDED.includes(m)) return false
  if (process.env.CLAUDE_CODE_ALWAYS_ENABLE_EFFORT) return true
  if (MODELS[m]?.capabilities?.includes('effort') || m === 'claude-mythos-5') return true
  return providerTrustsEffort()
}

/** El esfuerzo por defecto del modelo — `C`, sin el default de organizacion. */
export function getDefaultEffortForModel(model: string): EffortLevel {
  return MODELS[canonicalModelName(model)]?.default_effort ?? 'high'
}

/** Un valor ya resuelto, a nivel: un numero se muestra `high` — `tN`. */
function toLevel(value: EffortValue | undefined): EffortLevel {
  return typeof value === 'string' && isEffortLevel(value) ? value : 'high'
}

/** El recorte del nivel a lo que el modelo admite — `_`, sin el tope de settings. */
function clampToModel(value: EffortValue, model: string): EffortValue {
  if (value === 'max' && !modelSupportsMaxEffort(model)) return 'high'
  if (value === 'xhigh' && !modelSupportsXhighEffort(model)) return 'high'
  return value
}

/**
 * El nivel que rige para un modelo — `Sw`. Precedencia: el valor de un hook,
 * luego `CLAUDE_CODE_EFFORT_LEVEL`, el esfuerzo del turno, el de la sesion y
 * el default del modelo. `auto`/`unset` en la variable devuelve `undefined`:
 * no se envia esfuerzo.
 */
export function resolveModelEffort(
  model: string,
  sessionValue: EffortValue | undefined,
  { turnEffort, hookEffortValue }: { turnEffort?: EffortValue; hookEffortValue?: EffortValue } = {},
): EffortValue | undefined {
  if (!modelSupportsEffort(model)) return undefined
  if (hookEffortValue !== undefined) return clampToModel(hookEffortValue, model)
  const fallback = getDefaultEffortForModel(model)
  const env = getEffortEnvOverride()
  if (env === null) return undefined
  return clampToModel(env ?? turnEffort ?? sessionValue ?? fallback, model)
}

/** El nivel que se muestra — `TT`: `high` si no rige ninguno. */
export function getDisplayedEffortLevel(
  model: string,
  sessionValue: EffortValue | undefined,
  turnEffort?: EffortValue,
): EffortLevel {
  return toLevel(resolveModelEffort(model, sessionValue, { turnEffort }) ?? 'high')
}

/** « with <nivel> effort», o vacio si no hay valor que nombrar — `Uyt`. */
export function getEffortSuffix(
  model: string,
  sessionValue: EffortValue | undefined,
  turnEffort?: EffortValue,
): string {
  if (sessionValue === undefined && turnEffort === undefined) return ''
  const resolved = resolveModelEffort(model, sessionValue, { turnEffort })
  if (resolved === undefined) return ''
  return ` with ${toLevel(resolved)} effort`
}

/** La descripcion de un nivel — `ne`. */
export function getEffortLevelDescription(level: EffortLevel): string | undefined {
  switch (level) {
    case 'low':
      return 'Quick, straightforward implementation with minimal overhead'
    case 'medium':
      return 'Balanced approach with standard implementation and testing'
    case 'high':
      return 'Comprehensive implementation with extensive testing and documentation'
    case 'xhigh':
      return `Deeper reasoning than high, just below maximum (${XHIGH_MODELS})`
    case 'max':
      return `Maximum capability with deepest reasoning. ${MAX_WARNING}`
    default:
      return undefined
  }
}

/**
 * La descripcion de un valor — `nQn`. Un numero no tiene nivel que nombrar.
 * En `high`, un suscriptor Pro con `tengu_slate_finch` activo lee ademas que
 * ese nivel es el que mas consume.
 */
export function getEffortValueDescription(value: EffortValue): string | undefined {
  if (typeof value !== 'string') return 'Balanced approach with standard implementation and testing'
  const description = getEffortLevelDescription(value)
  if (value === 'high' && isProSubscriber() && getFeatureValue_CACHED_MAY_BE_STALE('tengu_slate_finch', false)) {
    return `${description} · burns fastest — medium handles most tasks`
  }
  return description
}

/**
 * ¿Se persiste el nivel que el selector de modelo eligio?
 *
 * NO esta en 2.1.275: esa build guarda el esfuerzo por modelo
 * (`modelSettings[<id>].effortLevel`) y ya no decide en el selector. Es la API
 * anterior, que `repl/src/components/ModelPicker.tsx` (portado de `ccnmt`)
 * sigue consumiendo; su contrato es el de su suite. Se persiste si el nivel
 * difiere del default, si ya habia uno persistido, o si se cambio en el
 * selector; si no, `undefined` deja que rija el default.
 */
export function resolvePickerEffortPersistence(
  picked: EffortValue | undefined,
  modelDefault: EffortValue | undefined,
  priorPersisted: EffortValue | undefined,
  toggledInPicker: boolean,
): EffortValue | undefined {
  if (picked === undefined) return undefined
  const explicit = priorPersisted !== undefined || toggledInPicker
  return explicit || picked !== modelDefault ? picked : undefined
}

export type OpusDefaultEffortConfig = {
  enabled: boolean
  dialogTitle: string
  dialogDescription: string
}
const OPUS_DEFAULT_EFFORT_CONFIG_DEFAULT: OpusDefaultEffortConfig = {
  enabled: true,
  dialogTitle: 'We recommend medium effort for Opus',
  dialogDescription:
    'Effort determines how long Claude thinks for when completing your task. We recommend medium effort for most tasks to balance speed and intelligence and maximize rate limits. Use ultrathink to trigger high effort when needed.',
}
export function getOpusDefaultEffortConfig(): OpusDefaultEffortConfig {
  const config = getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_grey_step2',
    OPUS_DEFAULT_EFFORT_CONFIG_DEFAULT,
  )
  return {
    ...OPUS_DEFAULT_EFFORT_CONFIG_DEFAULT,
    ...config,
  }
}
