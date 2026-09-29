/**
 * Elige el adaptador del estado compartido en caliente (ADR-THYROX-006, 1.1.0).
 *
 * Con `THYROX_REDIS_URL` abre el adaptador Redis; sin ella, el de memoria, que
 * sólo vale para un proxy. Si Redis falla a mitad de operación, el almacén
 * degrada a memoria con un aviso y no vuelve a intentarlo: la vista global se
 * pierde, pero el proxy sigue atendiendo. Lo que exige vista global en modo
 * multi-proxy rehúsa en su propio consumidor, no aquí.
 */
import { createMemorySharedStateStore } from './memory.ts'
import type { SharedStateStore } from './port.ts'
import { createRedisSharedStateStore } from './redis.ts'

export const REDIS_URL_ENV = 'THYROX_REDIS_URL'

export type SharedStateBackend = 'memory' | 'redis'

export interface OpenSharedStateOptions {
  env?: Record<string, string | undefined>
  createMemory?: () => SharedStateStore
  createRedis?: (url: string) => SharedStateStore
  warn?: (message: string) => void
}

export interface OpenedSharedState {
  store: SharedStateStore
  backend: SharedStateBackend
  degraded: () => boolean
}

export function openSharedStateStore(options: OpenSharedStateOptions = {}): OpenedSharedState {
  const env = options.env ?? process.env
  const createMemory = options.createMemory ?? (() => createMemorySharedStateStore())
  const url = env[REDIS_URL_ENV]?.trim()
  if (!url) {
    return { store: createMemory(), backend: 'memory', degraded: () => false }
  }
  const createRedis = options.createRedis ?? ((redisUrl: string) => createRedisSharedStateStore(redisUrl))
  const warn = options.warn ?? ((message: string) => console.warn(message))
  const redis = createRedis(url)
  let fallback: SharedStateStore | null = null

  // Cada operación va a redis hasta el primer fallo; desde ahí, a memoria.
  async function call<T>(operation: (store: SharedStateStore) => Promise<T>): Promise<T> {
    if (fallback) return operation(fallback)
    try {
      return await operation(redis)
    } catch (error) {
      fallback = createMemory()
      warn(
        `${REDIS_URL_ENV}: redis falló (${error instanceof Error ? error.message : String(error)}); ` +
          'el estado compartido degrada a memoria local de este proxy',
      )
      return operation(fallback)
    }
  }

  const store: SharedStateStore = {
    incrementWindow: (key, windowMs, by) => call(s => s.incrementWindow(key, windowMs, by)),
    acquireLease: (key, owner, ttlMs) => call(s => s.acquireLease(key, owner, ttlMs)),
    releaseLease: (key, owner) => call(s => s.releaseLease(key, owner)),
    getWithTtl: key => call(s => s.getWithTtl(key)),
    setWithTtl: (key, value, ttlMs) => call(s => s.setWithTtl(key, value, ttlMs)),
    close: async () => {
      await redis.close().catch(() => {})
      if (fallback) await fallback.close()
    },
  }
  return { store, backend: 'redis', degraded: () => fallback !== null }
}
