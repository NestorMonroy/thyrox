/**
 * Adaptador `memory` de `SharedStateStore`: coordina dentro de un solo
 * proceso, con el reloj de pared por defecto (`options.now` lo sustituye
 * para pruebas deterministas). No abre sockets ni temporizadores: la
 * caducidad de un lease o un valor se resuelve al leerlo (perezosa), así
 * que nada mantiene el proceso vivo.
 */
import type { SharedStateStore } from './port.ts'

interface WindowEntry {
  windowIndex: number
  count: number
}

interface LeaseEntry {
  owner: string
  expiresAt: number
}

interface ValueEntry {
  value: string
  expiresAt: number
}

export interface MemorySharedStateStoreOptions {
  now?: () => number
}

/**
 * Un lease o un valor caduca en el instante `expiresAt`: en ese instante ya
 * está libre, no un tick después. `>=` (no `>`) es la frontera que hace que
 * el borde exacto cuente como caducado.
 */
function hasExpired(expiresAt: number, now: number): boolean {
  return now >= expiresAt
}

export function createMemorySharedStateStore(options: MemorySharedStateStoreOptions = {}): SharedStateStore {
  const now = options.now ?? Date.now
  const windows = new Map<string, WindowEntry>()
  const leases = new Map<string, LeaseEntry>()
  const values = new Map<string, ValueEntry>()

  return {
    async incrementWindow(key, windowMs, by = 1) {
      if (by <= 0) {
        throw new Error(`incrementWindow: "by" tiene que ser positivo, llegó ${by}`)
      }
      const windowIndex = Math.floor(now() / windowMs)
      const existing = windows.get(key)
      const count = existing !== undefined && existing.windowIndex === windowIndex ? existing.count + by : by
      windows.set(key, { windowIndex, count })
      return count
    },

    async acquireLease(key, owner, ttlMs) {
      const current = now()
      const existing = leases.get(key)
      if (existing !== undefined && !hasExpired(existing.expiresAt, current) && existing.owner !== owner) {
        return false
      }
      leases.set(key, { owner, expiresAt: current + ttlMs })
      return true
    },

    async releaseLease(key, owner) {
      const current = now()
      const existing = leases.get(key)
      if (existing === undefined || hasExpired(existing.expiresAt, current)) {
        return false
      }
      if (existing.owner !== owner) {
        return false
      }
      leases.delete(key)
      return true
    },

    async getWithTtl(key) {
      const current = now()
      const existing = values.get(key)
      if (existing === undefined) {
        return null
      }
      if (hasExpired(existing.expiresAt, current)) {
        values.delete(key)
        return null
      }
      return existing.value
    },

    async setWithTtl(key, value, ttlMs) {
      values.set(key, { value, expiresAt: now() + ttlMs })
    },

    async close() {
      windows.clear()
      leases.clear()
      values.clear()
    },
  }
}
