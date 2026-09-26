/**
 * El TTL de la caché de prompt de una petición, resuelto como lo resuelve el
 * ejecutable.
 *
 * Porte de la cadena de 2.1.282 (`chunk-c9jscxk0.js`), extraída con
 * `bin/binary symbol chunk-c9jscxk0.js EPt QCt pxe yyo fxe`:
 *
 * | ejecutable | aquí |
 * |---|---|
 * | `fxe` | `MAIN_THREAD_SOURCES` |
 * | `pxe` | `matchesSource` |
 * | `yyo` | `isMainThreadSource` |
 * | `QCt` + `EPt` | `resolvePromptCacheTtl` |
 *
 * Gana la primera regla que aplica: forzar 5m → la variable del origen → el
 * setting del origen → el frontmatter del agente (salvo 1h en excedente) →
 * activar 1h por entorno → sin suscripción o en excedente, 5m → suscriptor
 * con el origen en la lista permitida, 1h → 5m.
 *
 * Divergencias, declaradas:
 * - las variables llevan el prefijo `THYROX_` (`THYROX_CODE_PROMPT_CACHE_TTL`
 *   por `CLAUDE_CODE_PROMPT_CACHE_TTL`, etc.): son del harness, no del cliente;
 * - la lista permitida del paso 7 la trae en el ejecutable una bandera remota
 *   (`tengu_prompt_cache_1h_config`); aquí la inyecta quien llama, con la del
 *   ejecutable por defecto;
 * - un valor que no es `5m` ni `1h` lanza, nombrando la variable, en vez de
 *   ignorarse: un TTL ilegible que cae en silencio al defecto se lee como
 *   decidido y no lo está.
 */
import type { CacheTtl } from './types.ts'

/** `fxe`: los orígenes de la conversación principal y del `-p`/SDK. */
export const MAIN_THREAD_SOURCES = ['repl_main_thread*', 'sdk', 'auto_mode', 'memdir_relevance'] as const

/** `pxe`: un patrón con `*` final casa por prefijo; sin él, exacto. */
export function matchesSource(source: string | undefined, patterns: readonly string[]): boolean {
  return source !== undefined
    && patterns.some(p => (p.endsWith('*') ? source.startsWith(p.slice(0, -1)) : source === p))
}

/** `yyo`: ¿el origen es de la conversación principal? */
export function isMainThreadSource(source: string | undefined): boolean {
  return matchesSource(source, MAIN_THREAD_SOURCES)
}

export type PromptCacheTtlReason =
  | 'force_5m_env' | 'env' | 'setting' | 'agent_frontmatter' | 'enable_1h_env' | 'subscriber' | 'default'

export type PromptCacheTtlDecision = { ttl: CacheTtl; reason: PromptCacheTtlReason }

/** Las variables que la cadena lee. */
export type PromptCacheTtlVariable =
  | 'THYROX_FORCE_PROMPT_CACHING_5M'
  | 'THYROX_CODE_PROMPT_CACHE_TTL'
  | 'THYROX_CODE_SUBAGENT_PROMPT_CACHE_TTL'
  | 'THYROX_ENABLE_PROMPT_CACHING_1H'
  | 'THYROX_ENABLE_PROMPT_CACHING_1H_BEDROCK'

/**
 * El entorno, como el del proceso: un diccionario de cadenas. Un tipo con
 * sólo las cinco claves opcionales rechaza `process.env` —no comparten
 * ninguna propiedad declarada (la comprobación de tipo débil de tsc)—.
 */
export type PromptCacheTtlEnv = Readonly<Record<string, string | undefined>>

export type PromptCacheTtlContext = {
  env: PromptCacheTtlEnv
  settings?: { promptCacheTtl?: CacheTtl; subagentPromptCacheTtl?: CacheTtl }
  /** `gt()`: suscripción de Claude, no clave de API ni nube. */
  isSubscriber: boolean
  /** `wa().isUsingOverage`: la suscripción está en excedente. */
  isUsingOverage: boolean
  /** `De()`: el proveedor; sólo `bedrock` cambia la regla 5. */
  provider?: string
  /** La lista permitida del paso 7; por defecto, la del ejecutable. */
  allowlist?: readonly string[]
}

export type PromptCacheTtlOptions = { agentCacheTtlOverride?: CacheTtl; ignoreOverage?: boolean }

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

function flag(value: string | undefined): boolean {
  return value !== undefined && TRUTHY.has(value.trim().toLowerCase())
}

function ttlFromEnv(name: PromptCacheTtlVariable, value: string | undefined): CacheTtl | undefined {
  if (value === undefined || value === '') return undefined
  if (value === '5m' || value === '1h') return value
  throw new Error(`${name}=${value}: el TTL de la caché es "5m" o "1h"`)
}

/** `EPt`: el TTL de una petición del origen `source`. */
export function resolvePromptCacheTtl(
  source: string | undefined,
  { agentCacheTtlOverride, ignoreOverage = false }: PromptCacheTtlOptions,
  ctx: PromptCacheTtlContext,
): PromptCacheTtlDecision {
  const overage = ctx.isSubscriber && !ignoreOverage && ctx.isUsingOverage
  const explicit = resolveExplicitPromptCacheTtl(source, agentCacheTtlOverride, overage, ctx)
  if (explicit !== undefined) return explicit
  if (!ctx.isSubscriber || overage) return { ttl: '5m', reason: 'default' }
  return matchesSource(source, ctx.allowlist ?? MAIN_THREAD_SOURCES)
    ? { ttl: '1h', reason: 'subscriber' }
    : { ttl: '5m', reason: 'default' }
}

/**
 * `QCt`: las reglas que deciden por declaración —forzar 5m, variable,
 * setting, frontmatter, activar 1h— o `undefined` si ninguna aplica y el TTL
 * queda a la suscripción.
 */
export function resolveExplicitPromptCacheTtl(
  source: string | undefined,
  agentCacheTtlOverride: CacheTtl | undefined,
  overage: boolean,
  ctx: Pick<PromptCacheTtlContext, 'env' | 'settings' | 'provider'>,
): PromptCacheTtlDecision | undefined {
  if (flag(ctx.env.THYROX_FORCE_PROMPT_CACHING_5M)) return { ttl: '5m', reason: 'force_5m_env' }
  const main = isMainThreadSource(source)
  const variable = main ? 'THYROX_CODE_PROMPT_CACHE_TTL' : 'THYROX_CODE_SUBAGENT_PROMPT_CACHE_TTL'
  const fromEnv = ttlFromEnv(variable, ctx.env[variable])
  if (fromEnv !== undefined) return { ttl: fromEnv, reason: 'env' }
  const fromSetting = main ? ctx.settings?.promptCacheTtl : ctx.settings?.subagentPromptCacheTtl
  if (fromSetting !== undefined) return { ttl: fromSetting, reason: 'setting' }
  if (agentCacheTtlOverride !== undefined && !(agentCacheTtlOverride === '1h' && overage)) {
    return { ttl: agentCacheTtlOverride, reason: 'agent_frontmatter' }
  }
  if (flag(ctx.env.THYROX_ENABLE_PROMPT_CACHING_1H)
      || (ctx.provider === 'bedrock' && flag(ctx.env.THYROX_ENABLE_PROMPT_CACHING_1H_BEDROCK))) {
    return { ttl: '1h', reason: 'enable_1h_env' }
  }
  return undefined
}
