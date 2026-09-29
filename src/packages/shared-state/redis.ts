/**
 * Adaptador `redis` de `SharedStateStore` (`./port.ts`) sobre
 * `Bun.RedisClient`, el cliente nativo de Bun 1.3 — no `ioredis`.
 *
 * `acquireLease` y la renovación por el mismo dueño necesitan ser atómicas
 * frente a otro proceso compitiendo por la misma clave, así que van por un
 * script Lua (`EVAL`, vía `client.send`): comprueban el dueño actual y sólo
 * entonces escriben, sin que otro cliente pueda intercalarse entre las dos
 * órdenes. `releaseLease` es el mismo patrón, en sentido contrario.
 */
import type { SharedStateStore } from './port.ts'

/**
 * Renueva el lease si `ARGV[1]` ya es su dueño; si no, lo toma con `NX`
 * (falla si otro dueño lo tiene vivo). Devuelve 1 si `ARGV[1]` queda como
 * dueño, 0 si no.
 */
const ACQUIRE_OR_RENEW_LEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
  return 1
end
if redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2], "NX") then
  return 1
end
return 0
`

/** Borra la clave sólo si su valor es `ARGV[1]`. Devuelve 1 si borró, 0 si no. */
const RELEASE_LEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`

export interface RedisSharedStateStoreOptions {
  /** Se antepone a toda clave, para que varios consumidores compartan un servidor sin chocar. */
  keyPrefix?: string
}

export function createRedisSharedStateStore(
  url: string,
  options: RedisSharedStateStoreOptions = {},
): SharedStateStore {
  const keyPrefix = options.keyPrefix ?? ''
  const client = new Bun.RedisClient(url)

  function prefixedKey(key: string): string {
    return `${keyPrefix}${key}`
  }

  return {
    async incrementWindow(key, windowMs, by = 1) {
      const windowFloor = Math.floor(Date.now() / windowMs)
      const windowKey = `${prefixedKey(key)}:${windowFloor}`
      const total = await client.incrby(windowKey, by)
      // La ventana sólo puede volver a leerse dentro de `windowMs`: pasado
      // ese plazo la clave de ventana cambia sola por el `floor` de arriba.
      await client.pexpire(windowKey, windowMs)
      return total
    },

    async acquireLease(key, owner, ttlMs) {
      const acquired = await client.send('EVAL', [
        ACQUIRE_OR_RENEW_LEASE_SCRIPT,
        '1',
        prefixedKey(key),
        owner,
        String(ttlMs),
      ])
      return acquired === 1
    },

    async releaseLease(key, owner) {
      const released = await client.send('EVAL', [RELEASE_LEASE_SCRIPT, '1', prefixedKey(key), owner])
      return released === 1
    },

    async getWithTtl(key) {
      return client.get(prefixedKey(key))
    },

    async setWithTtl(key, value, ttlMs) {
      await client.set(prefixedKey(key), value, 'PX', String(ttlMs))
    },

    async close() {
      client.close()
    },
  }
}
