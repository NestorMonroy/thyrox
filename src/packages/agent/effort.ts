/**
 * Nivel de esfuerzo de razonamiento — porte PARCIAL de
 * `ccnmt: packages/agent/effort.ts`.
 *
 * Recorte declarado: la fuente completa importa media docena de módulos de
 * `@claude-code-how-works/*` (config/env, config/settings, config/feature-flags,
 * provider/thinking, provider/authAlias, provider/providers, provider/connections,
 * provider/model/modelSupportOverrides, provider/antModels,
 * headless-sdk/runtimeTypes) que NO existen en este árbol. Esas dependencias
 * sólo alimentan funciones que resuelven el efecto de red (qué modelo soporta
 * qué nivel, el precedente de settings, las llamadas de red de feature-flags):
 * `modelSupportsEffort`, `getInitialEffortSetting`,
 * `resolvePickerEffortPersistence`, `getDisplayedEffortLevel`, `getEffortSuffix`,
 * `getEffortLevelDescription`, `getEffortValueDescription`,
 * `getDefaultEffortForModel`, `getOpusDefaultEffortConfig` — ninguna la
 * ejercita ningún porte de test de este archivo.
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
 * ¿El modelo soporta el nivel 'max'? Ver la nota "AMPLIACIÓN" de la
 * cabecera para el recorte de las tres fuentes que preceden a este chequeo
 * en la fuente (registro de conexión, override de terceros, resolución
 * `ant`) — ninguna disponible aquí, y las tres están vacías en cada caso
 * que este porte mide.
 */
export function modelSupportsMaxEffort(model: string): boolean {
  const m = model.toLowerCase()
  if (
    m.includes('opus-4-8') ||
    m.includes('opus-4-7') ||
    m.includes('opus-4-6') ||
    m.includes('sonnet-4-6') ||
    m.includes('mythos')
  ) {
    return true
  }
  // Fallthrough de proxy de protocolo anthropic: confiar en el endpoint
  // del usuario cuando el proveedor global es firstParty y el endpoint NO
  // es el nativo de Anthropic (DeepSeek, LiteLLM, gateways self-hosted que
  // hablan el protocolo anthropic).
  return getAPIProvider() === 'firstParty' && !isFirstPartyAnthropicEndpoint(model)
}

/**
 * ¿El modelo soporta el nivel 'xhigh'? Más angosto que `max`: a diferencia
 * de ése, NO hay fallthrough de confianza por defecto para proxies de
 * protocolo anthropic — 'xhigh' es un nivel interno de Anthropic sin
 * soporte de proxy documentado (ver el comentario del caso DeepSeek en el
 * test).
 */
export function modelSupportsXhighEffort(model: string): boolean {
  const m = model.toLowerCase()
  return m.includes('opus-4-8') || m.includes('opus-4-7') || m.includes('mythos')
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
