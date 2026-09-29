/**
 * Elige el adaptador del estado compartido en caliente (ADR-THYROX-006, 1.1.0).
 *
 * El modo se DECLARA con `THYROX_PROXY_MODE` (`single` por omisión, o
 * `multi`); la URL de `THYROX_REDIS_URL` sólo dice dónde está redis y no
 * infiere el modo. Con `single`, redis es preferido y una caída se atiende
 * en memoria de este proxy con un aviso, reintentando redis en la llamada
 * siguiente — el comportamiento de siempre, igual para las tres clases de
 * consistencia. Con `multi` no hay solo un proxy detrás, así que lo que
 * exige vista GLOBAL (`forConsistency('requiresGlobalConsistency')`) nunca
 * degrada en silencio: sin URL, `openSharedStateStore` rehúsa al abrir; con
 * redis caído, cada llamada lanza `SharedStateUnavailableError` y la
 * siguiente vuelve a intentar redis. `bestEffortShared` sí degrada a memoria
 * con aviso, y `localAllowed` usa memoria siempre, también con redis vivo.
 */
import type { ConsistencyClass } from './consistency.ts'
import { SharedStateUnavailableError } from './consistency.ts'
import { createMemorySharedStateStore } from './memory.ts'
import type { SharedStateStore } from './port.ts'
import { createRedisSharedStateStore } from './redis.ts'

export const REDIS_URL_ENV = 'THYROX_REDIS_URL'
export const PROXY_MODE_ENV = 'THYROX_PROXY_MODE'

export type SharedStateBackend = 'memory' | 'redis'
export type ProxyMode = 'single' | 'multi'

const PROXY_MODES: readonly ProxyMode[] = ['single', 'multi']

/** `THYROX_PROXY_MODE` trae un valor que no es `single` ni `multi`. */
export class InvalidProxyModeError extends Error {
  readonly variable: string
  readonly value: string

  constructor(variable: string, value: string) {
    super(`${variable}: valor inválido "${value}"; los valores válidos son "single" y "multi"`)
    this.name = 'InvalidProxyModeError'
    this.variable = variable
    this.value = value
  }
}

function resolveProxyMode(env: Record<string, string | undefined>): ProxyMode {
  const raw = env[PROXY_MODE_ENV]?.trim()
  if (!raw) {
    return 'single'
  }
  if (!PROXY_MODES.includes(raw as ProxyMode)) {
    throw new InvalidProxyModeError(PROXY_MODE_ENV, raw)
  }
  return raw as ProxyMode
}

export interface OpenSharedStateOptions {
  env?: Record<string, string | undefined>
  createMemory?: () => SharedStateStore
  createRedis?: (url: string) => SharedStateStore
  warn?: (message: string) => void
}

export interface OpenedSharedState {
  /**
   * Equivale a `forConsistency('bestEffortShared')`: redis preferido, y una
   * caída se atiende en memoria de este proxy con aviso. Se conserva para no
   * romper a los consumidores que abrían el estado antes de que existiera
   * `forConsistency`.
   */
  store: SharedStateStore
  backend: SharedStateBackend
  degraded: () => boolean
  /** El modo declarado por `THYROX_PROXY_MODE` (`single` por omisión). */
  mode: ProxyMode
  /** El almacén que corresponde a `consistency`, según la matriz del modo. */
  forConsistency: (consistency: ConsistencyClass) => SharedStateStore
  /** Cierra redis y toda memoria que se llegó a crear. Idempotente. */
  close: () => Promise<void>
}

export function openSharedStateStore(options: OpenSharedStateOptions = {}): OpenedSharedState {
  const env = options.env ?? process.env
  const createMemory = options.createMemory ?? (() => createMemorySharedStateStore())
  const warn = options.warn ?? ((message: string) => console.warn(message))
  const mode = resolveProxyMode(env)
  const url = env[REDIS_URL_ENV]?.trim()

  if (mode === 'multi' && !url) {
    throw new SharedStateUnavailableError(
      'requiresGlobalConsistency',
      `${REDIS_URL_ENV}: requerida bajo ${PROXY_MODE_ENV}=multi; sin ella ningún proxy puede ` +
        'alcanzar una vista global con los demás',
    )
  }

  if (!url) {
    // single sin redis: memoria siempre, como hoy. Sin redis no hay vista de
    // otro proceso de la que divergir, así que las tres clases coinciden.
    const memory = createMemory()
    let closed = false
    const close = async () => {
      if (closed) return
      closed = true
      await memory.close()
    }
    const store: SharedStateStore = { ...memory, close }
    return { store, backend: 'memory', degraded: () => false, mode, forConsistency: () => store, close }
  }

  const createRedis = options.createRedis ?? ((redisUrl: string) => createRedisSharedStateStore(redisUrl))
  const redis = createRedis(url)
  let fallback: SharedStateStore | null = null
  let localOnly: SharedStateStore | null = null
  let degraded = false
  let closed = false

  const close = async () => {
    if (closed) return
    closed = true
    await redis.close().catch(() => {})
    if (fallback) await fallback.close()
    if (localOnly) await localOnly.close()
  }

  // bestEffortShared — y, en modo single, también las otras dos clases:
  // redis primero; si falla, memoria de este proxy con aviso, y la llamada
  // siguiente vuelve a intentar redis.
  async function callWithFallback<T>(operation: (store: SharedStateStore) => Promise<T>): Promise<T> {
    try {
      const result = await operation(redis)
      degraded = false
      return result
    } catch (error) {
      if (!degraded) {
        warn(
          `${REDIS_URL_ENV}: redis falló (${error instanceof Error ? error.message : String(error)}); ` +
            'el estado compartido degrada a memoria local de este proxy hasta que redis responda',
        )
      }
      degraded = true
      fallback ??= createMemory()
      return operation(fallback)
    }
  }

  const sharedStore: SharedStateStore = {
    incrementWindow: (key, windowMs, by) => callWithFallback(s => s.incrementWindow(key, windowMs, by)),
    acquireLease: (key, owner, ttlMs) => callWithFallback(s => s.acquireLease(key, owner, ttlMs)),
    releaseLease: (key, owner) => callWithFallback(s => s.releaseLease(key, owner)),
    getWithTtl: key => callWithFallback(s => s.getWithTtl(key)),
    setWithTtl: (key, value, ttlMs) => callWithFallback(s => s.setWithTtl(key, value, ttlMs)),
    close,
  }

  if (mode === 'single') {
    return {
      store: sharedStore,
      backend: 'redis',
      degraded: () => degraded,
      mode,
      forConsistency: () => sharedStore,
      close,
    }
  }

  // multi, con redis declarado: requiresGlobalConsistency nunca cae a
  // memoria; localAllowed nunca toca redis; bestEffortShared es `sharedStore`.
  async function strictOperation<T>(
    operationName: string,
    operation: (store: SharedStateStore) => Promise<T>,
  ): Promise<T> {
    try {
      return await operation(redis)
    } catch (error) {
      throw new SharedStateUnavailableError(
        'requiresGlobalConsistency',
        `${REDIS_URL_ENV}: redis falló en "${operationName}" bajo ${PROXY_MODE_ENV}=multi; ` +
          'requiresGlobalConsistency nunca degrada a memoria local ' +
          `(causa: ${error instanceof Error ? error.message : String(error)})`,
      )
    }
  }

  const strictStore: SharedStateStore = {
    incrementWindow: (key, windowMs, by) => strictOperation('incrementWindow', s => s.incrementWindow(key, windowMs, by)),
    acquireLease: (key, owner, ttlMs) => strictOperation('acquireLease', s => s.acquireLease(key, owner, ttlMs)),
    releaseLease: (key, owner) => strictOperation('releaseLease', s => s.releaseLease(key, owner)),
    getWithTtl: key => strictOperation('getWithTtl', s => s.getWithTtl(key)),
    setWithTtl: (key, value, ttlMs) => strictOperation('setWithTtl', s => s.setWithTtl(key, value, ttlMs)),
    close,
  }

  function forConsistency(consistency: ConsistencyClass): SharedStateStore {
    if (consistency === 'localAllowed') {
      localOnly ??= createMemory()
      return localOnly
    }
    if (consistency === 'requiresGlobalConsistency') {
      return strictStore
    }
    return sharedStore
  }

  return { store: sharedStore, backend: 'redis', degraded: () => degraded, mode, forConsistency, close }
}
